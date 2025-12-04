import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  generateDailyTasksForPatient,
  getTodayDateString,
  TASK_TEMPLATES_BY_PATIENT_TYPE,
} from '@/lib/task-engine';
import { DAILY_TASKS } from '@/lib/task-definitions';

/**
 * POST /api/tasks/refresh
 * Regenerate tasks for all active patients based on their current status
 * This handles:
 * - New day = fresh tasks
 * - Status change = correct task templates
 * - Discharged = no tasks
 */
export async function POST() {
  try {
    const today = getTodayDateString();

    // Get all active patients (not discharged)
    const patients = await prisma.patient.findMany({
      where: {
        status: {
          not: 'Discharged',
        },
      },
      include: {
        tasks: true,
      },
    });

    const results: { patientId: number; action: string; tasksCreated: number }[] = [];

    for (const patient of patients) {
      const patientType = patient.type || 'Medical';
      const patientStatus = patient.status;

      // Get existing incomplete tasks for this patient
      const existingIncompleteTasks = patient.tasks.filter(t => !t.completed);
      const existingTaskTitles = new Set(existingIncompleteTasks.map(t => t.title));

      // Generate expected tasks based on current status
      const statusBasedTasks = generateDailyTasksForPatient({
        id: patient.id,
        status: patientStatus,
        type: patientType,
        demographics: patient.demographics as { name?: string } | null,
      });

      // Also include daily recurring tasks (Call Owner, Daily SOAP Done, etc.)
      const dailyRecurringTasks = [
        ...DAILY_TASKS.patient.morning,
        ...DAILY_TASKS.patient.evening,
      ].map(t => ({
        title: t.name,
        category: t.category,
        timeOfDay: t.timeOfDay,
        priority: t.priority,
      }));

      // Combine both task sources (deduplicate by title)
      const allExpectedTitles = new Set<string>();
      const expectedTasks: { title: string; category: string; timeOfDay: string; priority: string }[] = [];

      for (const task of [...statusBasedTasks, ...dailyRecurringTasks]) {
        if (!allExpectedTitles.has(task.title)) {
          allExpectedTitles.add(task.title);
          expectedTasks.push(task);
        }
      }

      // Check for status change - if discharging, clear non-discharge tasks
      if (patientStatus === 'Discharging') {
        // Delete non-discharge incomplete tasks
        const tasksToDelete = existingIncompleteTasks.filter(
          t => t.category !== 'Discharge'
        );
        if (tasksToDelete.length > 0) {
          await prisma.task.deleteMany({
            where: {
              id: { in: tasksToDelete.map(t => t.id) },
            },
          });
        }
      }

      // Create missing tasks (tasks in expected but not in existing)
      const tasksToCreate = expectedTasks.filter(
        expected => !existingTaskTitles.has(expected.title)
      );

      if (tasksToCreate.length > 0) {
        await prisma.task.createMany({
          data: tasksToCreate.map(task => ({
            patientId: patient.id,
            title: task.title,
            category: task.category,
            timeOfDay: task.timeOfDay,
            priority: task.priority,
            completed: false,
          })),
        });

        results.push({
          patientId: patient.id,
          action: 'created',
          tasksCreated: tasksToCreate.length,
        });
      } else {
        results.push({
          patientId: patient.id,
          action: 'no_change',
          tasksCreated: 0,
        });
      }
    }

    // Also handle discharged patients - mark all their incomplete tasks as complete
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
