import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/admin/clear-all-tasks
 * Clear all tasks from the database
 *
 * Query params:
 * - completed=true: Only clear completed tasks
 * - patient=123: Only clear tasks for a specific patient
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const onlyCompleted = searchParams.get('completed') === 'true';
    const patientId = searchParams.get('patient');

    // Build where clause
    const where: any = {};

    if (onlyCompleted) {
      where.completed = true;
    }

    if (patientId) {
      where.patientId = parseInt(patientId);
    }

    // Count tasks to be deleted
    const countBefore = await prisma.task.count({ where });

    if (countBefore === 0) {
      return NextResponse.json({
        success: true,
        message: 'No tasks to clear',
        deleted: 0,
      });
    }

    // Delete tasks
    const result = await prisma.task.deleteMany({ where });

    const scope = onlyCompleted ? 'completed' : 'all';
    const target = patientId ? `patient ${patientId}` : 'all patients';

    console.log(`[Admin] Cleared ${result.count} ${scope} tasks for ${target}`);

    return NextResponse.json({
      success: true,
      message: `Cleared ${result.count} ${scope} tasks for ${target}`,
      deleted: result.count,
    });
  } catch (error) {
    console.error('[Admin] Error clearing tasks:', error);
    return NextResponse.json(
      { error: 'Failed to clear tasks', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/clear-all-tasks
 * Alternative method - same as POST
 */
export async function DELETE(request: NextRequest) {
  return POST(request);
}
