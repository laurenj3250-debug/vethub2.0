import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/patients
 * Fetch all patients with optional status filter
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');

    const patients = await prisma.patient.findMany({
      where: status ? { status } : undefined,
      include: {
        soapNotes: {
          orderBy: { createdAt: 'desc' },
        },
        tasks: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Transform Prisma result to UnifiedPatient format
    const transformedPatients = patients.map((patient) => ({
      id: patient.id,
      status: patient.status,
      type: patient.type || 'Medical', // Patient type: Medical/MRI/Surgery (default if null)
      demographics: patient.demographics as any,
      medicalHistory: patient.medicalHistory as any,
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
        physicalExam: note.physicalExam as any,
        neuroExam: note.neuroExam as any,
        ...(note.assessment as any),
        ...(note.plan as any),
      })),
      roundingData: patient.roundingData as any,
      mriData: patient.mriData as any,
      tasks: patient.tasks.map((task) => ({
        id: task.id,
        title: task.title,
        description: task.description || undefined,
        category: task.category || undefined,
        timeOfDay: task.timeOfDay as any,
        priority: task.priority as any,
        assignedTo: task.assignedTo || undefined,
        completed: task.completed,
        completedAt: task.completedAt || undefined,
        createdAt: task.createdAt,
        dueDate: task.dueDate || undefined,
      })),
      stickerData: patient.stickerData as any,
      appointmentInfo: patient.appointmentInfo as any,
      createdAt: patient.createdAt,
      updatedAt: patient.updatedAt,
      lastAccessedBy: patient.lastAccessedBy || undefined,
    }));

    return NextResponse.json(transformedPatients);
  } catch (error) {
    console.error('[API] Error fetching patients:', error);
    return NextResponse.json(
      { error: 'Failed to fetch patients' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/patients
 * Create a new patient
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const patientType = body.type || 'Medical';

    // Set default rounding data with location=IP and icuCriteria=N/A
    const defaultRoundingData = {
      location: 'IP',
      icuCriteria: 'N/A',
      ...(body.roundingData || {}),
    };

    const patient = await prisma.patient.create({
      data: {
        status: body.status || 'Active',
        type: patientType, // Default to Medical if not specified
        demographics: body.demographics || { name: 'Unnamed Patient' },
        medicalHistory: body.medicalHistory || {},
        currentStay: body.currentStay || undefined,
        roundingData: defaultRoundingData,
        mriData: body.mriData || undefined,
        stickerData: body.stickerData || undefined,
        appointmentInfo: body.appointmentInfo || undefined,
        lastAccessedBy: body.lastAccessedBy || undefined,
      },
      include: {
        soapNotes: true,
        tasks: true,
      },
    });

    // Auto-create tasks based on patient type
    const createdTasks: any[] = [];
    if (['MRI', 'Surgery', 'Medical', 'Discharge'].includes(patientType)) {
      try {
        // Dynamically import task engine to avoid build issues
        const { TASK_TEMPLATES_BY_PATIENT_TYPE } = await import('@/lib/task-engine');
        const templates = TASK_TEMPLATES_BY_PATIENT_TYPE[patientType as 'MRI' | 'Surgery' | 'Medical' | 'Discharge'] || [];

        for (const template of templates) {
          // Check if this task already exists for the patient
          const existingTask = await prisma.task.findFirst({
            where: {
              patientId: patient.id,
              title: template.name,
            },
          });

          if (existingTask) {
            // Task already exists, add to list but don't create duplicate
            createdTasks.push({
              id: existingTask.id,
              title: existingTask.title,
              description: existingTask.description,
              category: existingTask.category,
              timeOfDay: existingTask.timeOfDay,
              priority: existingTask.priority,
              completed: existingTask.completed,
              createdAt: existingTask.createdAt,
            });
          } else {
            // Create new task
            const task = await prisma.task.create({
              data: {
                patientId: patient.id,
                title: template.name,
                description: template.category,
                category: template.category,
                timeOfDay: template.timeOfDay || null,
                priority: template.priority || null,
                completed: false,
              },
            });
            createdTasks.push({
              id: task.id,
              title: task.title,
              description: task.description,
              category: task.category,
              timeOfDay: task.timeOfDay,
              priority: task.priority,
              completed: task.completed,
              createdAt: task.createdAt,
            });
          }
        }

        console.log(`[API] Auto-created ${createdTasks.length} tasks for ${patientType} patient ${patient.id}`);
      } catch (taskError) {
        console.error('[API] Error auto-creating tasks:', taskError);
        // Don't fail patient creation if task creation fails
      }
    }

    return NextResponse.json(
      {
        id: patient.id,
        status: patient.status,
        type: patient.type || 'Medical', // Patient type: Medical/MRI/Surgery (default if null)
        demographics: patient.demographics,
        medicalHistory: patient.medicalHistory,
        currentStay: patient.currentStay,
        soapNotes: [],
        roundingData: patient.roundingData,
        mriData: patient.mriData,
        tasks: createdTasks,
        stickerData: patient.stickerData,
        appointmentInfo: patient.appointmentInfo,
        createdAt: patient.createdAt,
        updatedAt: patient.updatedAt,
        lastAccessedBy: patient.lastAccessedBy,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[API] Error creating patient:', error);
    return NextResponse.json(
      { error: 'Failed to create patient' },
      { status: 500 }
    );
  }
}
