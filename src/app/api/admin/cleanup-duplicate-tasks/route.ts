import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/admin/cleanup-duplicate-tasks
 * Removes duplicate tasks (same patientId + title)
 * Keeps completed tasks over incomplete, oldest over newest
 */
export async function POST() {
  try {
    console.log('[Cleanup] Finding duplicate tasks...');

    // Find all tasks grouped by patientId and title
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
      const key = `${task.patientId}::${task.title}`;
      if (!taskGroups.has(key)) {
        taskGroups.set(key, []);
      }
      taskGroups.get(key)!.push(task);
    }

    // Find duplicates
    const duplicateGroups = Array.from(taskGroups.entries())
      .filter(([_, tasks]) => tasks.length > 1);

    if (duplicateGroups.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No duplicate tasks found',
        duplicateGroups: 0,
        deleted: 0,
      });
    }

    const tasksToDelete: string[] = [];
    const details: Array<{ title: string; patientId: number; copies: number; deleted: number }> = [];

    for (const [key, tasks] of duplicateGroups) {
      const [patientIdStr, title] = key.split('::');
      const patientId = parseInt(patientIdStr);

      // Keep the first one (completed + oldest due to sorting)
      const [_keep, ...duplicates] = tasks;

      for (const dup of duplicates) {
        tasksToDelete.push(dup.id);
      }

      details.push({
        title,
        patientId,
        copies: tasks.length,
        deleted: duplicates.length,
      });
    }

    // Delete duplicates
    let deletedCount = 0;
    if (tasksToDelete.length > 0) {
      const result = await prisma.task.deleteMany({
        where: {
          id: { in: tasksToDelete },
        },
      });
      deletedCount = result.count;
    }

    console.log(`[Cleanup] Deleted ${deletedCount} duplicate tasks`);

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${deletedCount} duplicate tasks`,
      duplicateGroups: duplicateGroups.length,
      deleted: deletedCount,
      details,
    });
  } catch (error) {
    console.error('[Cleanup] Error:', error);
    return NextResponse.json(
      { error: 'Failed to cleanup duplicate tasks', details: String(error) },
      { status: 500 }
    );
  }
}
