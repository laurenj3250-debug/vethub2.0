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

    // Set default rounding data with location=IP, icuCriteria=N, code=Yellow
    // All patients get defaults: ivc=Yes, fluids=n/a, cri=n/a
    const defaultRoundingData = {
      location: 'IP',
      icuCriteria: 'N',
      code: 'Yellow',
      ivc: 'Yes',
      fluids: 'n/a',
      cri: 'n/a',
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
        // Dynamically import task config to avoid build issues
        const { getTypeSpecificTasks } = await import('@/lib/task-config');
        const templates = getTypeSpecificTasks(patientType);

        // Fetch all existing tasks for this patient in a single query
        const existingTasks = await prisma.task.findMany({
          where: { patientId: patient.id },
          select: { id: true, title: true, description: true, category: true, timeOfDay: true, priority: true, completed: true, createdAt: true }
        });

        // Create a Set of existing task titles for O(1) lookup
        const existingTaskTitles = new Set(existingTasks.map(t => t.title));

        // Add existing tasks to the response
        createdTasks.push(...existingTasks.map(task => ({
          id: task.id,
          title: task.title,
          description: task.description,
          category: task.category,
          timeOfDay: task.timeOfDay,
          priority: task.priority,
          completed: task.completed,
          createdAt: task.createdAt,
        })));

        // Filter templates to only new ones (not already existing)
        const newTemplates = templates.filter(t => !existingTaskTitles.has(t.name));

        // Bulk create only the new tasks
        if (newTemplates.length > 0) {
          const newTasks = await prisma.task.createManyAndReturn({
            data: newTemplates.map(template => ({
              patientId: patient.id,
              title: template.name,
              description: template.category,
              category: template.category,
              timeOfDay: template.timeOfDay || null,
              completed: false,
            })),
          });

          // Add newly created tasks to the response
          createdTasks.push(...newTasks.map(task => ({
            id: task.id,
            title: task.title,
            description: task.description,
            category: task.category,
            timeOfDay: task.timeOfDay,
            priority: task.priority,
            completed: task.completed,
            createdAt: task.createdAt,
          })));

          console.log(`[API] Created ${newTasks.length} new tasks for ${patientType} patient ${patient.id}`);
        } else {
          console.log(`[API] All tasks already exist for ${patientType} patient ${patient.id}`);
        }
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
