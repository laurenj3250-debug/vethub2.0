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
      type: patient.type, // Patient type: Medical/MRI/Surgery
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

    const patient = await prisma.patient.create({
      data: {
        status: body.status || 'Active',
        type: body.type || 'Medical', // Default to Medical if not specified
        demographics: body.demographics || { name: 'Unnamed Patient' },
        medicalHistory: body.medicalHistory || {},
        currentStay: body.currentStay || undefined,
        roundingData: body.roundingData || undefined,
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

    return NextResponse.json(
      {
        id: patient.id,
        status: patient.status,
        type: patient.type, // Patient type: Medical/MRI/Surgery
        demographics: patient.demographics,
        medicalHistory: patient.medicalHistory,
        currentStay: patient.currentStay,
        soapNotes: [],
        roundingData: patient.roundingData,
        mriData: patient.mriData,
        tasks: [],
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
