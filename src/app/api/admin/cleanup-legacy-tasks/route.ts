import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  TASK_CONFIG,
  DAILY_PATIENT_TASK_NAMES,
  DAILY_GENERAL_TASK_NAMES,
} from '@/lib/task-config';

/**
 * GET /api/admin/cleanup-legacy-tasks
 * Analyze tasks to find orphaned/legacy tasks not in current config
 */
export async function GET() {
  try {
    // Get all valid task names from current config
    const validPatientTaskNames = new Set([
      ...DAILY_PATIENT_TASK_NAMES,
      ...Object.values(TASK_CONFIG.statusTriggered).flat().map(t => t.name),
      ...Object.values(TASK_CONFIG.typeSpecific).flat().map(t => t.name),
    ]);

    const validGeneralTaskNames = new Set(DAILY_GENERAL_TASK_NAMES);

    // Get all tasks grouped by title
    const tasksByTitle = await prisma.task.groupBy({
      by: ['title'],
      _count: { id: true },
    });

    const analysis: {
      validPatientTasks: Array<{ title: string; count: number }>;
      validGeneralTasks: Array<{ title: string; count: number }>;
      legacyTasks: Array<{ title: string; count: number; isPatient: boolean }>;
      duplicates: Array<{ title: string; patientId: number | null; count: number }>;
    } = {
      validPatientTasks: [],
      validGeneralTasks: [],
      legacyTasks: [],
      duplicates: [],
    };

    for (const task of tasksByTitle) {
      if (validPatientTaskNames.has(task.title)) {
        analysis.validPatientTasks.push({ title: task.title, count: task._count.id });
      } else if (validGeneralTaskNames.has(task.title)) {
        analysis.validGeneralTasks.push({ title: task.title, count: task._count.id });
      } else {
        // Check if it's patient-specific or general
        const patientCount = await prisma.task.count({
          where: { title: task.title, patientId: { not: null } },
        });
        analysis.legacyTasks.push({
          title: task.title,
          count: task._count.id,
          isPatient: patientCount > 0,
        });
      }
    }

    // Find actual duplicates (same title + patientId appearing multiple times)
    const allTasks = await prisma.task.findMany({
      select: { title: true, patientId: true },
    });

    const taskCounts = new Map<string, number>();
    for (const task of allTasks) {
      const key = `${task.patientId}::${task.title}`;
      taskCounts.set(key, (taskCounts.get(key) || 0) + 1);
    }

    for (const [key, count] of taskCounts) {
      if (count > 1) {
        const [patientIdStr, title] = key.split('::');
        analysis.duplicates.push({
          title,
          patientId: patientIdStr === 'null' ? null : parseInt(patientIdStr),
          count,
        });
      }
    }

    return NextResponse.json({
      success: true,
      validTaskNames: {
        patient: Array.from(validPatientTaskNames),
        general: Array.from(validGeneralTaskNames),
      },
      analysis,
      totalTasks: allTasks.length,
      legacyTaskCount: analysis.legacyTasks.reduce((sum, t) => sum + t.count, 0),
      duplicateCount: analysis.duplicates.reduce((sum, d) => sum + (d.count - 1), 0),
    });
  } catch (error) {
    console.error('[Cleanup Analysis] Error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze tasks', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/cleanup-legacy-tasks
 * Remove legacy tasks and duplicates
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const dryRun = body.dryRun === true;

    // Get all valid task names from current config
    const validPatientTaskNames = new Set([
      ...DAILY_PATIENT_TASK_NAMES,
      ...Object.values(TASK_CONFIG.statusTriggered).flat().map(t => t.name),
      ...Object.values(TASK_CONFIG.typeSpecific).flat().map(t => t.name),
    ]);

    const validGeneralTaskNames = new Set(DAILY_GENERAL_TASK_NAMES);
    const allValidTaskNames = new Set([...validPatientTaskNames, ...validGeneralTaskNames]);

    // Find legacy task names (not in current config)
    const tasksByTitle = await prisma.task.groupBy({
      by: ['title'],
      _count: { id: true },
    });

    const legacyTaskNames = tasksByTitle
      .filter(t => !allValidTaskNames.has(t.title))
      .map(t => t.title);

    console.log('[Cleanup] Legacy task names to remove:', legacyTaskNames);

    let legacyDeleted = 0;
    let duplicatesDeleted = 0;
    const details: Array<{ action: string; title: string; count: number }> = [];

    // 1. Delete legacy tasks
    if (legacyTaskNames.length > 0) {
      if (!dryRun) {
        const result = await prisma.task.deleteMany({
          where: {
            title: { in: legacyTaskNames },
          },
        });
        legacyDeleted = result.count;
      } else {
        legacyDeleted = await prisma.task.count({
          where: { title: { in: legacyTaskNames } },
        });
      }

      for (const name of legacyTaskNames) {
        const count = tasksByTitle.find(t => t.title === name)?._count.id || 0;
        details.push({ action: 'delete_legacy', title: name, count });
      }
    }

    // 2. Remove duplicates (keep one copy of each valid task per patient)
    const allTasks = await prisma.task.findMany({
      orderBy: [
        { patientId: 'asc' },
        { title: 'asc' },
        { completed: 'desc' }, // Keep completed over incomplete
        { createdAt: 'asc' },  // Then oldest
      ],
    });

    const seenKeys = new Set<string>();
    const duplicateIds: string[] = [];

    for (const task of allTasks) {
      const key = `${task.patientId}::${task.title}`;
      if (seenKeys.has(key)) {
        duplicateIds.push(task.id);
      } else {
        seenKeys.add(key);
      }
    }

    if (duplicateIds.length > 0) {
      if (!dryRun) {
        const result = await prisma.task.deleteMany({
          where: { id: { in: duplicateIds } },
        });
        duplicatesDeleted = result.count;
      } else {
        duplicatesDeleted = duplicateIds.length;
      }
      details.push({ action: 'delete_duplicates', title: 'various', count: duplicateIds.length });
    }

    const totalDeleted = legacyDeleted + duplicatesDeleted;

    console.log(`[Cleanup] ${dryRun ? '[DRY RUN] Would delete' : 'Deleted'} ${totalDeleted} tasks (${legacyDeleted} legacy, ${duplicatesDeleted} duplicates)`);

    return NextResponse.json({
      success: true,
      dryRun,
      message: dryRun
        ? `Would delete ${totalDeleted} tasks (${legacyDeleted} legacy, ${duplicatesDeleted} duplicates)`
        : `Deleted ${totalDeleted} tasks (${legacyDeleted} legacy, ${duplicatesDeleted} duplicates)`,
      legacyDeleted,
      duplicatesDeleted,
      totalDeleted,
      details,
    });
  } catch (error) {
    console.error('[Cleanup] Error:', error);
    return NextResponse.json(
      { error: 'Failed to cleanup tasks', details: String(error) },
      { status: 500 }
    );
  }
}
