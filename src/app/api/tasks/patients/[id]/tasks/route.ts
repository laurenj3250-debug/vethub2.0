import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/tasks/patients/[id]/tasks
 * Fetch all tasks for a specific patient
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

    // Check for duplicate task (same title for same patient)
    const existingTask = await prisma.task.findFirst({
      where: {
        patientId: patientId,
        title: taskTitle.trim(),
      },
    });

    if (existingTask) {
      // Return existing task instead of creating duplicate
      console.log(`[API] Task "${taskTitle}" already exists for patient ${patientId}, returning existing`);
      return NextResponse.json(existingTask, { status: 200 });
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

/**
 * PATCH /api/tasks/patients/[id]/tasks/[taskId]
 * Update a specific task for a patient
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;

    // Extract taskId from the URL path
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/');
    const taskIdIndex = pathSegments.indexOf('tasks') + 1;
    const taskId = pathSegments[taskIdIndex];

    if (!taskId) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      );
    }

    const patientId = parseInt(resolvedParams.id);

    if (isNaN(patientId)) {
      return NextResponse.json(
        { error: 'Invalid patient ID' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Verify task exists and belongs to patient
    const existingTask = await prisma.task.findFirst({
      where: {
        id: taskId,
        patientId: patientId,
      },
    });

    if (!existingTask) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        title: body.title !== undefined ? body.title.trim() : undefined,
        description: body.description !== undefined ? body.description : undefined,
        category: body.category !== undefined ? body.category : undefined,
        timeOfDay: body.timeOfDay !== undefined ? body.timeOfDay : undefined,
        priority: body.priority !== undefined ? body.priority : undefined,
        assignedTo: body.assignedTo !== undefined ? body.assignedTo : undefined,
        dueDate: body.dueDate !== undefined ? (body.dueDate ? new Date(body.dueDate) : null) : undefined,
        completed: body.completed !== undefined ? body.completed : undefined,
        completedAt: body.completed !== undefined ? (body.completed ? new Date() : null) : undefined,
      },
    });

    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error('[API] Error updating patient task:', error);
    return NextResponse.json(
      { error: 'Failed to update patient task' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/tasks/patients/[id]/tasks/[taskId]
 * Delete a specific task for a patient
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;

    // Extract taskId from the URL path
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/');
    const taskIdIndex = pathSegments.indexOf('tasks') + 1;
    const taskId = pathSegments[taskIdIndex];

    if (!taskId) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      );
    }

    const patientId = parseInt(resolvedParams.id);

    if (isNaN(patientId)) {
      return NextResponse.json(
        { error: 'Invalid patient ID' },
        { status: 400 }
      );
    }

    // Verify task exists and belongs to patient
    const existingTask = await prisma.task.findFirst({
      where: {
        id: taskId,
        patientId: patientId,
      },
    });

    if (!existingTask) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    await prisma.task.delete({
      where: { id: taskId },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('[API] Error deleting patient task:', error);
    return NextResponse.json(
      { error: 'Failed to delete patient task' },
      { status: 500 }
    );
  }
}