/**
 * Daily Reset API Endpoint
 *
 * Called on first app load of each day to:
 * 1. Reset sticker counts to base (2 big, 0 tiny) for all active patients
 * 2. Reset daily recurring tasks (or create them if missing)
 * 3. Leave one-time tasks (MRI, Surgery admission tasks) unchanged
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTodayET } from '@/lib/timezone';
import {
  TASK_CONFIG,
  DAILY_PATIENT_TASK_NAMES,
  DAILY_GENERAL_TASK_NAMES,
  shouldGetDailyTasks,
} from '@/lib/task-config';

// Base sticker data for daily reset
const BASE_STICKER_DATA = {
  bigLabelCount: 2,
  tinySheetCount: 0,
  isNewAdmit: false,
  isSurgery: false,
  bigLabelsPrinted: false,
  tinyLabelsPrinted: false,
};

export async function POST(request: Request) {
  try {
    // Check for cron secret (optional - allows external cron services)
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get('x-cron-secret') || request.headers.get('authorization');
    const isCronRequest = cronSecret && authHeader && (
      authHeader === cronSecret ||
      authHeader === `Bearer ${cronSecret}`
    );

    // Log the source of the request
    if (isCronRequest) {
      console.log('[Daily Reset] Triggered by external cron service');
    }

    const body = await request.json().catch(() => ({}));
    const forceReset = body.force === true; // Allow manual force reset for testing
    const today = getTodayET(); // Use Eastern Time

    // ========================================
    // CHECK IF RESET ALREADY RAN TODAY (database-backed, not localStorage)
    // This prevents the bug where opening from different browsers triggers multiple resets
    // ========================================
    if (!forceReset) {
      try {
        const lastResetSetting = await prisma.appSetting.findUnique({
          where: { key: 'lastDailyReset' },
        });

        if (lastResetSetting?.value === today) {
          console.log(`[Daily Reset] Already ran today (${today}), skipping`);
          return NextResponse.json({
            success: true,
            message: 'Daily reset already completed today',
            resetDate: today,
            skipped: true,
            stats: { patientsUpdated: 0, stickersReset: 0, tasksDeleted: 0, tasksCreated: 0, generalTasksCreated: 0 },
          });
        }
      } catch (dbCheckError) {
        // FAIL SAFE: If we can't check the database, skip the reset to prevent duplicates
        // Better to miss a reset than to accidentally run it twice and delete tasks
        console.error('[Daily Reset] Failed to check last reset date, skipping to prevent duplicate:', dbCheckError);
        return NextResponse.json({
          success: false,
          error: 'Cannot verify reset status, skipping to prevent duplicate reset',
          skipped: true,
        }, { status: 503 });
      }
    }

    let stickersReset = 0;
    let tasksDeleted = 0;
    let tasksCreated = 0;
    let generalTasksCreated = 0;

    // ========================================
    // 1. DELETE COMPLETED DAILY TASKS (clean slate for new day)
    // Only delete daily recurring tasks, NOT type-specific ones like Surgery Slip
    // so they can't be recreated on type change
    // ========================================
    const allDailyTaskNames = [...DAILY_PATIENT_TASK_NAMES, ...DAILY_GENERAL_TASK_NAMES];
    const deletedTasks = await prisma.task.deleteMany({
      where: {
        completed: true,
        title: { in: allDailyTaskNames },
      },
    });
    tasksDeleted = deletedTasks.count;

    // ========================================
    // 1b. DELETE OLD INCOMPLETE DAILY TASKS (prevent accumulation)
    // Only delete recurring daily tasks from previous days, not one-time tasks
    // ========================================
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const deletedOldTasks = await prisma.task.deleteMany({
      where: {
        createdAt: { lt: todayStart },
        completed: false,
        title: { in: allDailyTaskNames },
      },
    });
    if (deletedOldTasks.count > 0) {
      console.log(`[Daily Reset] Cleaned up ${deletedOldTasks.count} old incomplete daily tasks`);
    }
    tasksDeleted += deletedOldTasks.count;

    // ========================================
    // 2. RESET/CREATE GENERAL TASKS (team-wide, not patient-specific)
    // Each general task should exist exactly ONCE
    // ========================================

    // First, clean up any duplicate general tasks (keep newest incomplete, or newest if all complete)
    for (const taskTemplate of TASK_CONFIG.dailyRecurring.general) {
      const duplicates = await prisma.task.findMany({
        where: {
          patientId: null,
          title: taskTemplate.name,
        },
        orderBy: [
          { completed: 'asc' }, // Incomplete first
          { createdAt: 'desc' }, // Then newest
        ],
      });

      // Keep only the first one (incomplete & newest, or just newest if all complete)
      if (duplicates.length > 1) {
        const idsToDelete = duplicates.slice(1).map(t => t.id);
        await prisma.task.deleteMany({
          where: { id: { in: idsToDelete } },
        });
        console.log(`[Daily Reset] Cleaned up ${idsToDelete.length} duplicate "${taskTemplate.name}" tasks`);
      }
    }

    // Now check what exists and create if missing
    const existingGeneralTasks = await prisma.task.findMany({
      where: {
        patientId: null,
        title: { in: DAILY_GENERAL_TASK_NAMES },
        completed: false, // Only check incomplete tasks
      },
    });
    const existingGeneralTaskTitles = new Set(existingGeneralTasks.map(t => t.title));

    for (const taskTemplate of TASK_CONFIG.dailyRecurring.general) {
      if (!existingGeneralTaskTitles.has(taskTemplate.name)) {
        await prisma.task.create({
          data: {
            patientId: null, // General task - not tied to any patient
            title: taskTemplate.name,
            category: taskTemplate.category,
            timeOfDay: taskTemplate.timeOfDay,
            completed: false,
          },
        });
        generalTasksCreated++;
      }
    }

    // ========================================
    // 3. PROCESS ACTIVE PATIENTS
    // Only patients NOT in excludeStatuses get daily tasks
    // ========================================
    const activePatients = await prisma.patient.findMany({
      where: {
        status: {
          notIn: TASK_CONFIG.dailyRecurring.excludeStatuses,
        },
      },
      include: {
        tasks: true,
      },
    });

    if (activePatients.length === 0) {
      console.log(`[Daily Reset] No active patients. Created ${generalTasksCreated} general tasks.`);
      return NextResponse.json({
        success: true,
        message: 'Daily reset complete (no active patients)',
        resetDate: today,
        stats: { patientsUpdated: 0, stickersReset: 0, tasksDeleted, tasksCreated: 0, generalTasksCreated },
      });
    }

    // Process each patient
    for (const patient of activePatients) {
      // 3a. Reset sticker data
      const currentStickerData = (patient.stickerData as any) || {};
      const needsStickerReset =
        currentStickerData.bigLabelCount !== BASE_STICKER_DATA.bigLabelCount ||
        currentStickerData.tinySheetCount !== BASE_STICKER_DATA.tinySheetCount ||
        currentStickerData.isNewAdmit !== BASE_STICKER_DATA.isNewAdmit ||
        currentStickerData.bigLabelsPrinted !== BASE_STICKER_DATA.bigLabelsPrinted;

      if (needsStickerReset || forceReset) {
        await prisma.patient.update({
          where: { id: patient.id },
          data: {
            stickerData: {
              ...currentStickerData,
              ...BASE_STICKER_DATA,
              // Preserve sticker content fields
              patientId: currentStickerData.patientId,
              clientId: currentStickerData.clientId,
              ownerName: currentStickerData.ownerName,
              phone: currentStickerData.phone,
            },
          },
        });
        stickersReset++;
      }

      // 3b. Create daily patient tasks (only if not already exists - check ALL tasks to prevent duplicates)
      const existingTasks = patient.tasks || [];
      const existingTaskTitles = new Set(existingTasks.map((t: any) => t.title));

      for (const taskTemplate of TASK_CONFIG.dailyRecurring.patient) {
        if (!existingTaskTitles.has(taskTemplate.name)) {
          await prisma.task.create({
            data: {
              patientId: patient.id,
              title: taskTemplate.name,
              category: taskTemplate.category,
              timeOfDay: taskTemplate.timeOfDay,
              completed: false,
            },
          });
          tasksCreated++;
        }
      }
    }

    const triggeredBy = isCronRequest ? 'cron' : (forceReset ? 'manual' : 'app');

    // ========================================
    // SAVE LAST RESET DATE TO DATABASE
    // This prevents the bug where opening from different browsers triggers multiple resets
    // ========================================
    await prisma.appSetting.upsert({
      where: { key: 'lastDailyReset' },
      update: { value: today },
      create: { key: 'lastDailyReset', value: today },
    });
    console.log(`[Daily Reset] Saved lastDailyReset=${today} to database`);

    // Log task counts for monitoring
    const totalTasks = await prisma.task.count();
    const incompleteTasks = await prisma.task.count({ where: { completed: false } });
    console.log(`[Daily Reset] [${triggeredBy}] Updated ${activePatients.length} patients: ${stickersReset} stickers reset, ${tasksDeleted} tasks deleted, ${tasksCreated} patient tasks created, ${generalTasksCreated} general tasks created`);
    console.log(`[Daily Reset] Task counts - Total: ${totalTasks}, Incomplete: ${incompleteTasks}`);

    return NextResponse.json({
      success: true,
      message: `Daily reset complete for ${activePatients.length} patients`,
      resetDate: today,
      triggeredBy,
      stats: {
        patientsUpdated: activePatients.length,
        stickersReset,
        tasksDeleted,
        tasksCreated,
        generalTasksCreated,
        totalTasksRemaining: totalTasks,
        incompleteTasksRemaining: incompleteTasks,
      },
    });
  } catch (error) {
    console.error('[Daily Reset] Error:', error);
    return NextResponse.json(
      { error: 'Failed to perform daily reset', details: String(error) },
      { status: 500 }
    );
  }
}

// GET endpoint - triggers reset when called by cron, or returns status for debugging
export async function GET(request: Request) {
  try {
    // Check if this is a cron request (has cron header or trigger=true query param)
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get('x-cron-secret') || request.headers.get('authorization');
    const url = new URL(request.url);
    const triggerParam = url.searchParams.get('trigger');

    const isCronRequest = (cronSecret && authHeader && (
      authHeader === cronSecret ||
      authHeader === `Bearer ${cronSecret}`
    )) || triggerParam === 'true';

    // If cron request, trigger the reset
    if (isCronRequest) {
      console.log('[Daily Reset] GET request triggering reset (cron or trigger param)');

      const today = getTodayET();

      // Check if already ran today
      const lastResetSetting = await prisma.appSetting.findUnique({
        where: { key: 'lastDailyReset' },
      });

      if (lastResetSetting?.value === today) {
        return NextResponse.json({
          success: true,
          message: 'Daily reset already completed today',
          resetDate: today,
          skipped: true,
        });
      }

      // Run the reset - simplified version for cron
      let stickersReset = 0;
      let tasksDeleted = 0;
      let tasksCreated = 0;
      let generalTasksCreated = 0;

      // Delete completed DAILY tasks only (preserve completed type-specific tasks)
      const allDailyTaskNames = [...DAILY_PATIENT_TASK_NAMES, ...DAILY_GENERAL_TASK_NAMES];
      const deletedTasks = await prisma.task.deleteMany({
        where: { completed: true, title: { in: allDailyTaskNames } },
      });
      tasksDeleted = deletedTasks.count;

      // Delete old incomplete daily tasks
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const deletedOldTasks = await prisma.task.deleteMany({
        where: {
          createdAt: { lt: todayStart },
          completed: false,
          title: { in: allDailyTaskNames },
        },
      });
      tasksDeleted += deletedOldTasks.count;

      // Create general tasks
      const existingGeneralTasks = await prisma.task.findMany({
        where: {
          patientId: null,
          title: { in: DAILY_GENERAL_TASK_NAMES },
          completed: false,
        },
      });
      const existingGeneralTaskTitles = new Set(existingGeneralTasks.map(t => t.title));

      for (const taskTemplate of TASK_CONFIG.dailyRecurring.general) {
        if (!existingGeneralTaskTitles.has(taskTemplate.name)) {
          await prisma.task.create({
            data: {
              patientId: null,
              title: taskTemplate.name,
              category: taskTemplate.category,
              timeOfDay: taskTemplate.timeOfDay,
              completed: false,
            },
          });
          generalTasksCreated++;
        }
      }

      // Process active patients
      const activePatients = await prisma.patient.findMany({
        where: {
          status: { notIn: TASK_CONFIG.dailyRecurring.excludeStatuses },
        },
        include: { tasks: true },
      });

      for (const patient of activePatients) {
        // Reset sticker data
        const currentStickerData = (patient.stickerData as any) || {};
        await prisma.patient.update({
          where: { id: patient.id },
          data: {
            stickerData: {
              ...currentStickerData,
              ...BASE_STICKER_DATA,
              patientId: currentStickerData.patientId,
              clientId: currentStickerData.clientId,
              ownerName: currentStickerData.ownerName,
              phone: currentStickerData.phone,
            },
          },
        });
        stickersReset++;

        // Create daily patient tasks
        const existingTaskTitles = new Set((patient.tasks || []).map((t: any) => t.title));
        for (const taskTemplate of TASK_CONFIG.dailyRecurring.patient) {
          if (!existingTaskTitles.has(taskTemplate.name)) {
            await prisma.task.create({
              data: {
                patientId: patient.id,
                title: taskTemplate.name,
                category: taskTemplate.category,
                timeOfDay: taskTemplate.timeOfDay,
                completed: false,
              },
            });
            tasksCreated++;
          }
        }
      }

      // Save last reset date
      await prisma.appSetting.upsert({
        where: { key: 'lastDailyReset' },
        update: { value: today },
        create: { key: 'lastDailyReset', value: today },
      });

      console.log(`[Daily Reset] [cron-GET] Updated ${activePatients.length} patients: ${stickersReset} stickers, ${tasksDeleted} deleted, ${tasksCreated} patient tasks, ${generalTasksCreated} general tasks`);

      return NextResponse.json({
        success: true,
        message: `Daily reset complete for ${activePatients.length} patients`,
        resetDate: today,
        triggeredBy: 'cron-GET',
        stats: {
          patientsUpdated: activePatients.length,
          stickersReset,
          tasksDeleted,
          tasksCreated,
          generalTasksCreated,
        },
      });
    }

    // Otherwise, return status info (existing behavior)
    // Get general tasks
    const generalTasks = await prisma.task.findMany({
      where: {
        patientId: null,
        title: { in: DAILY_GENERAL_TASK_NAMES },
      },
      select: {
        title: true,
        completed: true,
        timeOfDay: true,
      },
    });

    // Get patient tasks - only patients eligible for daily tasks
    const activePatients = await prisma.patient.findMany({
      where: {
        status: { notIn: TASK_CONFIG.dailyRecurring.excludeStatuses },
      },
      select: {
        id: true,
        status: true,
        demographics: true,
        stickerData: true,
        tasks: {
          where: {
            title: { in: DAILY_PATIENT_TASK_NAMES },
          },
          select: {
            title: true,
            completed: true,
          },
        },
      },
    });

    const patientSummary = activePatients.map(p => {
      const stickerData = (p.stickerData as any) || {};
      const demographics = (p.demographics as any) || {};
      return {
        id: p.id,
        name: demographics.name || 'Unknown',
        status: p.status,
        stickers: {
          bigLabelCount: stickerData.bigLabelCount ?? 'not set',
          tinySheetCount: stickerData.tinySheetCount ?? 'not set',
          isNewAdmit: stickerData.isNewAdmit ?? false,
        },
        dailyTasks: p.tasks.map(t => ({
          name: t.title,
          completed: t.completed,
        })),
      };
    });

    return NextResponse.json({
      generalTasks: generalTasks.map(t => ({
        name: t.title,
        completed: t.completed,
        timeOfDay: t.timeOfDay,
      })),
      activePatientCount: activePatients.length,
      patients: patientSummary,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get reset status', details: String(error) },
      { status: 500 }
    );
  }
}
