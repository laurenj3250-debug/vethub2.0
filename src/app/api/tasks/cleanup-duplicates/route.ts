import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/tasks/cleanup-duplicates
 * Removes duplicate tasks (same title for same patient), keeping the oldest one.
 * For tasks with same title, prefers keeping the completed one if any.
 */
export async function POST() {
  try {
    // Get all tasks grouped by patientId and title
    const allTasks = await prisma.task.findMany({
      orderBy: [
        { patientId: 'asc' },
        { title: 'asc' },
        { completed: 'desc' }, // Completed tasks first (true > false)
        { createdAt: 'asc' },  // Then oldest first
      ],
    });

    // Group tasks by patientId + title
    const taskGroups = new Map<string, typeof allTasks>();

    for (const task of allTasks) {
      const key = `${task.patientId}:${task.title}`;
      if (!taskGroups.has(key)) {
        taskGroups.set(key, []);
      }
      taskGroups.get(key)!.push(task);
    }

    // Find duplicates and delete them (keep the first one in each group)
    const tasksToDelete: string[] = [];
    const duplicateInfo: { patientId: number | null; title: string; kept: string; deleted: string[] }[] = [];

    for (const [key, tasks] of taskGroups) {
      if (tasks.length > 1) {
        // Keep the first one (completed if any, otherwise oldest)
        const [keep, ...duplicates] = tasks;

        for (const dup of duplicates) {
          tasksToDelete.push(dup.id);
        }

        duplicateInfo.push({
          patientId: keep.patientId,
          title: keep.title,
          kept: keep.id,
          deleted: duplicates.map(d => d.id),
        });
      }
    }

    // Delete all duplicates
    if (tasksToDelete.length > 0) {
      await prisma.task.deleteMany({
        where: {
          id: { in: tasksToDelete },
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${tasksToDelete.length} duplicate tasks`,
      duplicatesRemoved: tasksToDelete.length,
      groupsCleaned: duplicateInfo.length,
      details: duplicateInfo,
    });
  } catch (error) {
    console.error('[API] Error cleaning up duplicate tasks:', error);
    return NextResponse.json(
      { error: 'Failed to cleanup duplicate tasks' },
      { status: 500 }
    );
  }
}
