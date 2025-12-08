import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTodayET } from '@/lib/timezone';
import {
  TASK_CONFIG,
  getStatusTriggeredTasks,
  shouldGetDailyTasks,
} from '@/lib/task-config';

/**
 * POST /api/tasks/refresh
 * On-demand task refresh for all active patients.
 * Creates missing daily recurring tasks and status-triggered tasks.
 */
export async function POST() {
  try {
    const today = getTodayET();

    // Get all active patients (those that should get daily tasks)
    const patients = await prisma.patient.findMany({
      where: {
        status: {
          notIn: TASK_CONFIG.dailyRecurring.excludeStatuses,
        },
      },
      include: {
        tasks: true,
      },
    });

    const results: { patientId: number; action: string; tasksCreated: number }[] = [];

    for (const patient of patients) {
      const patientStatus = patient.status;

      // Get ALL existing tasks for this patient (including completed) to prevent duplicates
      const existingTaskTitles = new Set(patient.tasks.map(t => t.title));

      let tasksCreated = 0;

      // 1. Create missing daily recurring tasks (if patient should get them)
      if (shouldGetDailyTasks(patientStatus)) {
        for (const taskDef of TASK_CONFIG.dailyRecurring.patient) {
          if (!existingTaskTitles.has(taskDef.name)) {
            await prisma.task.create({
              data: {
                patientId: patient.id,
                title: taskDef.name,
                category: taskDef.category,
                timeOfDay: taskDef.timeOfDay,
                priority: taskDef.priority,
                completed: false,
              },
            });
            tasksCreated++;
          }
        }
      }

      // 2. Create missing status-triggered tasks
      const statusTasks = getStatusTriggeredTasks(patientStatus);
      for (const taskDef of statusTasks) {
        if (!existingTaskTitles.has(taskDef.name)) {
          await prisma.task.create({
            data: {
              patientId: patient.id,
              title: taskDef.name,
              category: taskDef.category,
              timeOfDay: taskDef.timeOfDay || null,
              priority: taskDef.priority,
              completed: false,
            },
          });
          tasksCreated++;
        }
      }

      results.push({
        patientId: patient.id,
        action: tasksCreated > 0 ? 'created' : 'no_change',
        tasksCreated,
      });
    }

    // Handle discharged patients - mark all their incomplete tasks as complete
    const dischargedPatients = await prisma.patient.findMany({
      where: {
        status: 'Discharged',
      },
      include: {
        tasks: {
          where: {
            completed: false,
          },
        },
      },
    });

    for (const patient of dischargedPatients) {
      if (patient.tasks.length > 0) {
        await prisma.task.updateMany({
          where: {
            patientId: patient.id,
            completed: false,
          },
          data: {
            completed: true,
            completedAt: new Date(),
            completedDate: today,
          },
        });

        results.push({
          patientId: patient.id,
          action: 'discharged_cleanup',
          tasksCreated: 0,
        });
      }
    }

    const totalCreated = results.reduce((sum, r) => sum + r.tasksCreated, 0);
    const patientsUpdated = results.filter(r => r.tasksCreated > 0 || r.action === 'discharged_cleanup').length;

    return NextResponse.json({
      success: true,
      message: `Refreshed tasks for ${patientsUpdated} patients, created ${totalCreated} new tasks`,
      details: results,
      today,
    });
  } catch (error) {
    console.error('[API] Error refreshing tasks:', error);
    return NextResponse.json(
      { error: 'Failed to refresh tasks' },
      { status: 500 }
    );
  }
}
