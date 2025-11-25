import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/tasks/reset-daily
 * Reset all completed tasks from previous days to incomplete status
 * This ensures tasks refresh each day for ongoing patient care
 *
 * Only resets tasks for patients who are NOT discharged (active patients)
 */
export async function POST(request: NextRequest) {
  try {
    // Get start of today (midnight)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find all completed tasks that were completed before today
    // Only for patients who are NOT discharged (still in active care)
    const tasksToReset = await prisma.task.findMany({
      where: {
        completed: true,
        completedAt: {
          lt: today, // completed before today
        },
        patient: {
          status: {
            notIn: ['Discharged'], // Only reset tasks for active patients
          },
        },
      },
      select: {
        id: true,
        title: true,
        patientId: true,
      },
    });

    if (tasksToReset.length === 0) {
      return NextResponse.json({
        message: 'No tasks needed resetting',
        resetCount: 0,
      });
    }

    // Reset all these tasks to incomplete
    const result = await prisma.task.updateMany({
      where: {
        id: {
          in: tasksToReset.map((t: { id: string }) => t.id),
        },
      },
      data: {
        completed: false,
        completedAt: null,
      },
    });

    console.log(`[API] Daily task reset: ${result.count} tasks reset to incomplete`);

    return NextResponse.json({
      message: `Reset ${result.count} tasks for the new day`,
      resetCount: result.count,
      tasks: tasksToReset.map((t: { id: string; title: string; patientId: number | null }) => ({ id: t.id, title: t.title, patientId: t.patientId })),
    });
  } catch (error) {
    console.error('[API] Error resetting daily tasks:', error);
    return NextResponse.json(
      { error: 'Failed to reset daily tasks' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/tasks/reset-daily
 * Check if there are tasks that need resetting (preview mode)
 */
export async function GET(request: NextRequest) {
  try {
    // Get start of today (midnight)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Count tasks that would be reset
    const count = await prisma.task.count({
      where: {
        completed: true,
        completedAt: {
          lt: today,
        },
        patient: {
          status: {
            notIn: ['Discharged'],
          },
        },
      },
    });

    return NextResponse.json({
      tasksToReset: count,
      message: count > 0
        ? `${count} task(s) from previous days will be reset`
        : 'All tasks are current',
    });
  } catch (error) {
    console.error('[API] Error checking daily tasks:', error);
    return NextResponse.json(
      { error: 'Failed to check daily tasks' },
      { status: 500 }
    );
  }
}
