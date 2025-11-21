/**
 * Task Migration Utility
 *
 * Migrates existing tasks to include kanban status fields.
 * This should be run once to add the 'status' field to all existing tasks.
 */

import { Task, GeneralTask, TaskStatus } from './types';

/**
 * Migrates a task to include status field based on completed state
 */
export function migrateTask(task: Task): Task {
  // If task already has a status, return as-is
  if (task.status) {
    return task;
  }

  // Set status based on completed flag
  const status: TaskStatus = task.completed ? 'done' : 'todo';

  return {
    ...task,
    status,
    priority: task.priority || 'low',
    title: task.title || task.name,
  };
}

/**
 * Migrates a general task to include status field
 */
export function migrateGeneralTask(task: GeneralTask): GeneralTask {
  // If task already has a status, return as-is
  if (task.status) {
    return task;
  }

  // Set status based on completed flag
  const status: TaskStatus = task.completed ? 'done' : 'todo';

  return {
    ...task,
    status,
    priority: task.priority || 'low',
    title: task.title || task.name,
  };
}

/**
 * Batch migrate all tasks for a patient
 */
export function migratePatientTasks(tasks: Task[]): Task[] {
  return tasks.map(migrateTask);
}

/**
 * Batch migrate all general tasks
 */
export function migrateGeneralTasks(tasks: GeneralTask[]): GeneralTask[] {
  return tasks.map(migrateGeneralTask);
}

/**
 * Migration instructions for manual database updates:
 *
 * If you need to migrate tasks in the database, run these SQL commands:
 *
 * -- Add status column to Task table (if using Prisma/PostgreSQL)
 * ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'todo';
 * ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "priority" TEXT DEFAULT 'low';
 * ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "dueDate" TEXT;
 *
 * -- Update existing tasks based on completed state
 * UPDATE "Task" SET "status" = 'done' WHERE "completed" = true AND "status" IS NULL;
 * UPDATE "Task" SET "status" = 'todo' WHERE "completed" = false AND "status" IS NULL;
 *
 * -- For GeneralTask table
 * ALTER TABLE "GeneralTask" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'todo';
 * ALTER TABLE "GeneralTask" ADD COLUMN IF NOT EXISTS "priority" TEXT DEFAULT 'low';
 * ALTER TABLE "GeneralTask" ADD COLUMN IF NOT EXISTS "dueDate" TEXT;
 *
 * UPDATE "GeneralTask" SET "status" = 'done' WHERE "completed" = true AND "status" IS NULL;
 * UPDATE "GeneralTask" SET "status" = 'todo' WHERE "completed" = false AND "status" IS NULL;
 */

/**
 * Client-side migration hook
 * Run this once on app load to ensure all tasks have status fields
 */
export async function migrateAllTasksOnLoad(
  patients: any[],
  generalTasks: any[],
  updateTaskFn: (patientId: string, taskId: string, data: any) => Promise<void>,
  updateGeneralTaskFn: (taskId: string, data: any) => Promise<void>
): Promise<{ patientTasksMigrated: number; generalTasksMigrated: number }> {
  let patientTasksMigrated = 0;
  let generalTasksMigrated = 0;

  // Migrate patient tasks
  for (const patient of patients) {
    if (patient.tasks && patient.tasks.length > 0) {
      for (const task of patient.tasks) {
        if (!task.status) {
          const migratedTask = migrateTask(task);
          try {
            await updateTaskFn(String(patient.id), String(task.id), {
              status: migratedTask.status,
              priority: migratedTask.priority,
              title: migratedTask.title,
            });
            patientTasksMigrated++;
          } catch (error) {
            console.error(`Failed to migrate task ${task.id} for patient ${patient.id}:`, error);
          }
        }
      }
    }
  }

  // Migrate general tasks
  for (const task of generalTasks) {
    if (!task.status) {
      const migratedTask = migrateGeneralTask(task);
      try {
        await updateGeneralTaskFn(String(task.id), {
          status: migratedTask.status,
          priority: migratedTask.priority,
          title: migratedTask.title,
        });
        generalTasksMigrated++;
      } catch (error) {
        console.error(`Failed to migrate general task ${task.id}:`, error);
      }
    }
  }

  return { patientTasksMigrated, generalTasksMigrated };
}
