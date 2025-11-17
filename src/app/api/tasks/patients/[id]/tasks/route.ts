import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/tasks/patients/[id]/tasks
 * Fetch all tasks for a specific patient
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

    const tasks = await prisma.task.findMany({
      where: {
        patientId: patientId,
      },
      orderBy: [
        { completed: 'asc' },
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error('[API] Error fetching patient tasks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch patient tasks' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tasks/patients/[id]/tasks
 * Create a new task for a specific patient
 */
export async function POST(
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

    // Support both 'title' and 'name' fields for compatibility
    const taskTitle = body.title || body.name;

    if (!taskTitle || typeof taskTitle !== 'string') {
      return NextResponse.json(
        { error: 'Task title or name is required' },
        { status: 400 }
      );
    }

    // Verify patient exists
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true },
    });

    if (!patient) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }

    const task = await prisma.task.create({
      data: {
        title: taskTitle.trim(),
        description: body.description || undefined,
        category: body.category || undefined,
        timeOfDay: body.timeOfDay || undefined,
        priority: body.priority || undefined,
        assignedTo: body.assignedTo || undefined,
        dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
        completed: body.completed || false,
        completedAt: body.completed ? new Date() : undefined,
        patientId: patientId,
      },
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error('[API] Error creating patient task:', error);
    return NextResponse.json(
      { error: 'Failed to create patient task' },
      { status: 500 }
    );
  }
}

// PATCH and DELETE handlers have been moved to /api/tasks/patients/[id]/tasks/[taskId]/route.ts
// to follow proper Next.js dynamic routing conventions and avoid route conflicts