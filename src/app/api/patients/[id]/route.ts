import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTodayET } from '@/lib/timezone';
import { getStatusTriggeredTasks } from '@/lib/task-config';

/**
 * GET /api/patients/[id]
 * Fetch a single patient by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const patientId = parseInt(resolvedParams.id);

    if (isNaN(patientId)) {
      return NextResponse.json(
        { error: 'Invalid patient ID' },
        { status: 400 }
      );
    }

    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      include: {
        soapNotes: {
          orderBy: { createdAt: 'desc' },
        },
        tasks: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!patient) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }

    // Transform to UnifiedPatient format
    const transformedPatient = {
      id: patient.id,
      status: patient.status,
      type: patient.type || 'Medical', // Patient type: Medical/MRI/Surgery (default if null)
      demographics: patient.demographics,
      medicalHistory: patient.medicalHistory,
      currentStay: patient.currentStay ? {
        ...patient.currentStay as any,
        admitDate: (patient.currentStay as any).admitDate ? new Date((patient.currentStay as any).admitDate) : undefined,
      } : undefined,
      soapNotes: patient.soapNotes.map((note) => ({
        id: note.id,
        createdAt: note.createdAt,
        createdBy: note.createdBy || undefined,
        visitType: note.visitType as 'recheck' | 'initial',
        ...(note.subjective as any),
        physicalExam: note.physicalExam,
        neuroExam: note.neuroExam,
        ...(note.assessment as any),
        ...(note.plan as any),
      })),
      roundingData: patient.roundingData,
      mriData: patient.mriData,
      tasks: patient.tasks.map((task) => ({
        id: task.id,
        title: task.title,
        description: task.description || undefined,
        category: task.category || undefined,
        timeOfDay: task.timeOfDay,
        priority: task.priority,
        assignedTo: task.assignedTo || undefined,
        completed: task.completed,
        completedAt: task.completedAt || undefined,
        createdAt: task.createdAt,
        dueDate: task.dueDate || undefined,
      })),
      stickerData: patient.stickerData,
      appointmentInfo: patient.appointmentInfo,
      createdAt: patient.createdAt,
      updatedAt: patient.updatedAt,
      lastAccessedBy: patient.lastAccessedBy || undefined,
    };

    return NextResponse.json(transformedPatient);
  } catch (error) {
    console.error('[API] Error fetching patient:', error);
    console.error('[API] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      {
        error: 'Failed to fetch patient',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/patients/[id]
 * Update a patient
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Declare updateData outside try block so it's accessible in catch
  let updateData: any = {};

  try {
    const resolvedParams = await params;
    const patientId = parseInt(resolvedParams.id);

    if (isNaN(patientId)) {
      return NextResponse.json(
        { error: 'Invalid patient ID' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Get existing patient data to merge JSON fields properly AND track status changes
    const existingPatient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: { status: true, type: true, roundingData: true, mriData: true },
    });

    // Prepare update data
    updateData = {};

    if (body.status !== undefined) updateData.status = body.status;
    if (body.type !== undefined) updateData.type = body.type; // Support patient type updates (Medical/MRI/Surgery)
    if (body.demographics !== undefined) updateData.demographics = body.demographics;
    if (body.medicalHistory !== undefined) updateData.medicalHistory = body.medicalHistory;
    if (body.currentStay !== undefined) updateData.currentStay = body.currentStay;

    // Deep merge roundingData to preserve existing fields
    if (body.roundingData !== undefined) {
      const existingRounding = (existingPatient?.roundingData as any) || {};
      updateData.roundingData = {
        ...existingRounding,
        ...body.roundingData,
      };
    }

    // Deep merge mriData to preserve existing fields
    if (body.mriData !== undefined) {
      const existingMri = (existingPatient?.mriData as any) || {};
      updateData.mriData = {
        ...existingMri,
        ...body.mriData,
      };
    }

    if (body.stickerData !== undefined) updateData.stickerData = body.stickerData;
    if (body.appointmentInfo !== undefined) updateData.appointmentInfo = body.appointmentInfo;
    if (body.lastAccessedBy !== undefined) updateData.lastAccessedBy = body.lastAccessedBy;

    const patient = await prisma.patient.update({
      where: { id: patientId },
      data: updateData,
      include: {
        soapNotes: {
          orderBy: { createdAt: 'desc' },
        },
        tasks: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    // ========================================
    // STATUS CHANGE HOOK: Auto-create tasks when status changes
    // ========================================
    const oldStatus = existingPatient?.status;
    const newStatus = body.status;

    if (newStatus && oldStatus !== newStatus) {
      console.log(`[Patient ${patientId}] Status changed: ${oldStatus} -> ${newStatus}`);

      // Get tasks for the new status
      const statusTasks = getStatusTriggeredTasks(newStatus);
      const today = getTodayET();

      // Get existing incomplete task titles for this patient
      const existingIncompleteTasks = patient.tasks.filter((t: any) => !t.completed);
      const existingTaskTitles = new Set(existingIncompleteTasks.map((t: any) => t.title));

      let tasksCreated = 0;
      for (const taskDef of statusTasks) {
        // Don't create duplicate tasks
        if (!existingTaskTitles.has(taskDef.name)) {
          await prisma.task.create({
            data: {
              patientId: patientId,
              title: taskDef.name,
              category: taskDef.category,
              timeOfDay: taskDef.timeOfDay || null,
              completed: false,
            },
          });
          tasksCreated++;
        }
      }

      if (tasksCreated > 0) {
        console.log(`[Patient ${patientId}] Created ${tasksCreated} tasks for status: ${newStatus}`);
      }

      // If patient is Discharged, auto-complete all incomplete tasks
      if (newStatus === 'Discharged') {
        const autoCompleteResult = await prisma.task.updateMany({
          where: {
            patientId: patientId,
            completed: false,
          },
          data: {
            completed: true,
            completedAt: new Date(),
            completedDate: today,
          },
        });
        console.log(`[Patient ${patientId}] Auto-completed ${autoCompleteResult.count} tasks on discharge`);
      }
    }

    // Transform to UnifiedPatient format
    const transformedPatient = {
      id: patient.id,
      status: patient.status,
      type: patient.type || 'Medical', // Patient type: Medical/MRI/Surgery (default if null)
      demographics: patient.demographics,
      medicalHistory: patient.medicalHistory,
      currentStay: patient.currentStay ? {
        ...patient.currentStay as any,
        admitDate: (patient.currentStay as any).admitDate ? new Date((patient.currentStay as any).admitDate) : undefined,
      } : undefined,
      soapNotes: patient.soapNotes.map((note) => ({
        id: note.id,
        createdAt: note.createdAt,
        createdBy: note.createdBy || undefined,
        visitType: note.visitType as 'recheck' | 'initial',
        ...(note.subjective as any),
        physicalExam: note.physicalExam,
        neuroExam: note.neuroExam,
        ...(note.assessment as any),
        ...(note.plan as any),
      })),
      roundingData: patient.roundingData,
      mriData: patient.mriData,
      tasks: patient.tasks.map((task) => ({
        id: task.id,
        title: task.title,
        description: task.description || undefined,
        category: task.category || undefined,
        timeOfDay: task.timeOfDay,
        priority: task.priority,
        assignedTo: task.assignedTo || undefined,
        completed: task.completed,
        completedAt: task.completedAt || undefined,
        createdAt: task.createdAt,
        dueDate: task.dueDate || undefined,
      })),
      stickerData: patient.stickerData,
      appointmentInfo: patient.appointmentInfo,
      createdAt: patient.createdAt,
      updatedAt: patient.updatedAt,
      lastAccessedBy: patient.lastAccessedBy || undefined,
    };

    return NextResponse.json(transformedPatient);
  } catch (error) {
    console.error('[API] Error updating patient:', error);
    console.error('[API] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('[API] Update data:', updateData);
    return NextResponse.json(
      {
        error: 'Failed to update patient',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/patients/[id]
 * Delete a patient
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const patientId = parseInt(resolvedParams.id);

    if (isNaN(patientId)) {
      return NextResponse.json(
        { error: 'Invalid patient ID' },
        { status: 400 }
      );
    }

    await prisma.patient.delete({
      where: { id: patientId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Error deleting patient:', error);
    return NextResponse.json(
      { error: 'Failed to delete patient' },
      { status: 500 }
    );
  }
}
