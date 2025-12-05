import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTodayET } from '@/lib/timezone';

/**
 * PATCH /api/tasks/patients/[id]/tasks/[taskId]
 * Update a specific task for a patient
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  try {
    const resolvedParams = await params;
    const patientId = parseInt(resolvedParams.id);
    const taskId = resolvedParams.taskId;

    if (isNaN(patientId)) {
      return NextResponse.json(
        { error: 'Invalid patient ID' },
        { status: 400 }
      );
    }

    if (!taskId) {
      return NextResponse.json(
        { error: 'Task ID is required' },
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

    // Get today's date in YYYY-MM-DD format in Eastern Time
    const today = getTodayET();

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
        completedDate: body.completed !== undefined ? (body.completed ? today : null) : undefined,
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
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  try {
    const resolvedParams = await params;
    const patientId = parseInt(resolvedParams.id);
    const taskId = resolvedParams.taskId;

    if (isNaN(patientId)) {
      return NextResponse.json(
        { error: 'Invalid patient ID' },
        { status: 400 }
      );
    }

    if (!taskId) {
      return NextResponse.json(
        { error: 'Task ID is required' },
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