import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTodayET } from '@/lib/timezone';

/**
 * GET /api/tasks/general
 * Fetch all general tasks (tasks not associated with a specific patient)
 */
export async function GET() {
  try {
    const tasks = await prisma.task.findMany({
      where: {
        patientId: null,
      },
      orderBy: [
        { completed: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error('[API] Error fetching general tasks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch general tasks' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tasks/general
 * Create a new general task (not associated with a patient)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.title || typeof body.title !== 'string') {
      return NextResponse.json(
        { error: 'Task title is required' },
        { status: 400 }
      );
    }

    // Check for duplicate general task (same title, no patientId)
    const existingTask = await prisma.task.findFirst({
      where: {
        patientId: null,
        title: body.title.trim(),
      },
    });

    if (existingTask) {
      // Return existing task instead of creating duplicate
      console.log(`[API] General task "${body.title}" already exists, returning existing`);
      return NextResponse.json(existingTask, { status: 200 });
    }

    const task = await prisma.task.create({
      data: {
        title: body.title.trim(),
        description: body.description || undefined,
        category: body.category || undefined,
        timeOfDay: body.timeOfDay || undefined,
        priority: body.priority || undefined,
        assignedTo: body.assignedTo || undefined,
        dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
        completed: body.completed || false,
        patientId: null, // Explicitly set to null for general tasks
      },
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error('[API] Error creating general task:', error);
    return NextResponse.json(
      { error: 'Failed to create general task' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/tasks/general
 * Update a general task by ID (passed in request body)
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      );
    }

    // Verify task exists and is a general task (no patient association)
    const existingTask = await prisma.task.findFirst({
      where: {
        id: body.id,
        patientId: null,
      },
    });

    if (!existingTask) {
      return NextResponse.json(
        { error: 'General task not found' },
        { status: 404 }
      );
    }

    // Get today's date in YYYY-MM-DD format in Eastern Time
    const today = getTodayET();

    const updatedTask = await prisma.task.update({
      where: { id: body.id },
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
        completedDate: body.completed !== undefined ? (body.completed ? today : null) : undefined,
      },
    });

    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error('[API] Error updating general task:', error);
    return NextResponse.json(
      { error: 'Failed to update general task' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/tasks/general
 * Delete a general task by ID (passed in request body)
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      );
    }

    // Verify task exists and is a general task (no patient association)
    const existingTask = await prisma.task.findFirst({
      where: {
        id: body.id,
        patientId: null,
      },
    });

    if (!existingTask) {
      return NextResponse.json(
        { error: 'General task not found' },
        { status: 404 }
      );
    }

    await prisma.task.delete({
      where: { id: body.id },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('[API] Error deleting general task:', error);
    return NextResponse.json(
      { error: 'Failed to delete general task' },
      { status: 500 }
    );
  }
}
