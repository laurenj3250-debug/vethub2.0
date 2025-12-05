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
    const body = await request.json().catch(() => ({}));
    const forceReset = body.force === true; // Allow manual force reset for testing
    const today = getTodayET(); // Use Eastern Time

    let stickersReset = 0;
    let tasksDeleted = 0;
    let tasksCreated = 0;
    let generalTasksCreated = 0;

    // ========================================
    // 1. DELETE COMPLETED TASKS (clean slate for new day)
    // ========================================
    const deletedTasks = await prisma.task.deleteMany({
      where: {
        completed: true,
      },
    });
    tasksDeleted = deletedTasks.count;

    // ========================================
    // 2. RESET/CREATE GENERAL TASKS (team-wide, not patient-specific)
    // ========================================
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
            priority: taskTemplate.priority,
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

      // 3b. Create daily patient tasks (only if not already exists as incomplete)
      const existingTasks = patient.tasks || [];
      const existingIncompleteTaskTitles = new Set(
        existingTasks.filter((t: any) => !t.completed).map((t: any) => t.title)
      );

      for (const taskTemplate of TASK_CONFIG.dailyRecurring.patient) {
        if (!existingIncompleteTaskTitles.has(taskTemplate.name)) {
          await prisma.task.create({
            data: {
              patientId: patient.id,
              title: taskTemplate.name,
              category: taskTemplate.category,
              timeOfDay: taskTemplate.timeOfDay,
              priority: taskTemplate.priority,
              completed: false,
            },
          });
          tasksCreated++;
        }
      }
    }

    console.log(`[Daily Reset] Updated ${activePatients.length} patients: ${stickersReset} stickers reset, ${tasksDeleted} completed tasks deleted, ${tasksCreated} patient tasks created, ${generalTasksCreated} general tasks created`);

    return NextResponse.json({
      success: true,
      message: `Daily reset complete for ${activePatients.length} patients`,
      resetDate: today,
      stats: {
        patientsUpdated: activePatients.length,
        stickersReset,
        tasksDeleted,
        tasksCreated,
        generalTasksCreated,
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

// GET endpoint to check reset status (for debugging)
export async function GET() {
  try {
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
