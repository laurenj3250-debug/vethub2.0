import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/patients/[id]
 * Fetch a single patient by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const patientId = parseInt(params.id);

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
      type: patient.type, // Patient type: Medical/MRI/Surgery
      demographics: patient.demographics,
      medicalHistory: patient.medicalHistory,
      currentStay: patient.currentStay ? {
        ...patient.currentStay as any,
        admitDate: new Date((patient.currentStay as any).admitDate),
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
    return NextResponse.json(
      { error: 'Failed to fetch patient' },
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
  { params }: { params: { id: string } }
) {
  try {
    const patientId = parseInt(params.id);

    if (isNaN(patientId)) {
      return NextResponse.json(
        { error: 'Invalid patient ID' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Prepare update data
    const updateData: any = {};

    if (body.status !== undefined) updateData.status = body.status;
    if (body.type !== undefined) updateData.type = body.type; // Support patient type updates (Medical/MRI/Surgery)
    if (body.demographics !== undefined) updateData.demographics = body.demographics;
    if (body.medicalHistory !== undefined) updateData.medicalHistory = body.medicalHistory;
    if (body.currentStay !== undefined) updateData.currentStay = body.currentStay;
    if (body.roundingData !== undefined) updateData.roundingData = body.roundingData;
    if (body.mriData !== undefined) updateData.mriData = body.mriData;
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

    // Transform to UnifiedPatient format
    const transformedPatient = {
      id: patient.id,
      status: patient.status,
      type: patient.type, // Patient type: Medical/MRI/Surgery
      demographics: patient.demographics,
      medicalHistory: patient.medicalHistory,
      currentStay: patient.currentStay ? {
        ...patient.currentStay as any,
        admitDate: new Date((patient.currentStay as any).admitDate),
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
    return NextResponse.json(
      { error: 'Failed to update patient' },
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
  { params }: { params: { id: string } }
) {
  try {
    const patientId = parseInt(params.id);

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
