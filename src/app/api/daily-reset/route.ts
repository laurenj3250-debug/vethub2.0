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

// Daily tasks that should reset each day
const DAILY_TASKS = {
  morning: [
    { name: 'Owner Called', category: 'Daily', timeOfDay: 'morning', priority: 'high' },
    { name: 'Daily SOAP Done', category: 'Daily', timeOfDay: 'morning', priority: 'high' },
    { name: 'Overnight Notes Checked', category: 'Daily', timeOfDay: 'morning', priority: 'medium' },
  ],
  evening: [
    { name: 'Vet Radar Done', category: 'Daily', timeOfDay: 'evening', priority: 'high' },
    { name: 'Rounding Sheet Done', category: 'Daily', timeOfDay: 'evening', priority: 'high' },
    { name: 'Sticker on Daily Sheet', category: 'Daily', timeOfDay: 'evening', priority: 'medium' },
  ],
};

const ALL_DAILY_TASK_NAMES = [
  ...DAILY_TASKS.morning.map(t => t.name),
  ...DAILY_TASKS.evening.map(t => t.name),
];

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

    // Get all active (non-discharged) patients
    const activePatients = await prisma.patient.findMany({
      where: {
        status: {
          not: 'Discharged',
        },
      },
      include: {
        tasks: true,
      },
    });

    if (activePatients.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active patients to reset',
        stats: { patientsUpdated: 0, stickersReset: 0, tasksReset: 0, tasksCreated: 0 },
      });
    }

    let stickersReset = 0;
    let tasksReset = 0;
    let tasksCreated = 0;

    // Process each patient
    for (const patient of activePatients) {
      // 1. Reset sticker data
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

      // 2. Reset/create daily tasks
      const existingTasks = patient.tasks || [];
      const existingTaskTitles = new Set(existingTasks.map((t: any) => t.title));

      for (const taskTemplate of [...DAILY_TASKS.morning, ...DAILY_TASKS.evening]) {
        const existingTask = existingTasks.find((t: any) => t.title === taskTemplate.name);

        if (existingTask) {
          // Task exists - reset to uncompleted if it was completed
          if (existingTask.completed) {
            await prisma.task.update({
              where: { id: existingTask.id },
              data: {
                completed: false,
                completedAt: null,
              },
            });
            tasksReset++;
          }
        } else {
          // Task doesn't exist - create it
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

    console.log(`[Daily Reset] Updated ${activePatients.length} patients: ${stickersReset} stickers reset, ${tasksReset} tasks reset, ${tasksCreated} tasks created`);

    return NextResponse.json({
      success: true,
      message: `Daily reset complete for ${activePatients.length} patients`,
      stats: {
        patientsUpdated: activePatients.length,
        stickersReset,
        tasksReset,
        tasksCreated,
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
    const activePatients = await prisma.patient.findMany({
      where: {
        status: { not: 'Discharged' },
      },
      select: {
        id: true,
        demographics: true,
        stickerData: true,
        tasks: {
          where: {
            title: { in: ALL_DAILY_TASK_NAMES },
          },
          select: {
            title: true,
            completed: true,
          },
        },
      },
    });

    const summary = activePatients.map(p => {
      const stickerData = (p.stickerData as any) || {};
      const demographics = (p.demographics as any) || {};
      return {
        id: p.id,
        name: demographics.name || 'Unknown',
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
      activePatientCount: activePatients.length,
      patients: summary,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get reset status', details: String(error) },
      { status: 500 }
    );
  }
}
