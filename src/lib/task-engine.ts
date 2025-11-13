/**
 * SMART TASK ENGINE
 * Handles task dependencies, auto-completion, templates, and time estimates
 */

export interface TaskTemplate {
  id: string;
  name: string;
  category: string;
  estimatedMinutes: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  timeOfDay?: 'morning' | 'evening' | 'overnight' | 'anytime';
  dependencies?: string[]; // Task IDs that must be completed first
  autoCompleteOn?: TaskAutoCompleteCondition;
}

export interface TaskAutoCompleteCondition {
  type: 'soap_saved' | 'rounding_updated' | 'mri_completed' | 'medication_given';
  patientId?: number;
}

export interface TaskWithMetadata extends TaskTemplate {
  taskId: string;
  patientId: number;
  patientName: string;
  completed: boolean;
  completedAt?: Date;
  createdAt: Date;
  blockedBy?: string[]; // Task IDs blocking this task
  canComplete: boolean; // Whether all dependencies are met
}

// ============================================================================
// TASK TEMPLATES BY PATIENT TYPE
// ============================================================================

export const TASK_TEMPLATES_BY_PATIENT_TYPE: Record<string, TaskTemplate[]> = {
  // MRI patients (already partially implemented in app)
  'MRI': [
    {
      id: 'mri-anesthesia-sheet',
      name: 'Complete MRI Anesthesia Sheet',
      category: 'Pre-procedure',
      estimatedMinutes: 5,
      priority: 'high',
      timeOfDay: 'morning',
    },
    {
      id: 'mri-premed',
      name: 'Administer Pre-medications',
      category: 'Pre-procedure',
      estimatedMinutes: 3,
      priority: 'high',
      timeOfDay: 'morning',
      dependencies: ['mri-anesthesia-sheet'],
    },
    {
      id: 'mri-scan',
      name: 'MRI Scan',
      category: 'Procedure',
      estimatedMinutes: 90,
      priority: 'urgent',
      timeOfDay: 'morning',
      dependencies: ['mri-premed'],
    },
    {
      id: 'mri-recovery',
      name: 'Monitor Post-MRI Recovery',
      category: 'Post-procedure',
      estimatedMinutes: 60,
      priority: 'high',
      timeOfDay: 'morning',
      dependencies: ['mri-scan'],
    },
    {
      id: 'mri-results-review',
      name: 'Review MRI Results with Owner',
      category: 'Communication',
      estimatedMinutes: 15,
      priority: 'high',
      timeOfDay: 'anytime',
      dependencies: ['mri-scan'],
    },
  ],

  // Surgery patients
  'Surgery': [
    {
      id: 'surgery-consent',
      name: 'Obtain Surgical Consent',
      category: 'Pre-procedure',
      estimatedMinutes: 10,
      priority: 'urgent',
      timeOfDay: 'morning',
    },
    {
      id: 'surgery-bloodwork',
      name: 'Pre-surgical Bloodwork',
      category: 'Pre-procedure',
      estimatedMinutes: 5,
      priority: 'high',
      timeOfDay: 'morning',
    },
    {
      id: 'surgery-prep',
      name: 'Surgical Prep (clip, scrub)',
      category: 'Pre-procedure',
      estimatedMinutes: 15,
      priority: 'high',
      timeOfDay: 'morning',
      dependencies: ['surgery-consent', 'surgery-bloodwork'],
    },
    {
      id: 'surgery-procedure',
      name: 'Surgical Procedure',
      category: 'Procedure',
      estimatedMinutes: 120,
      priority: 'urgent',
      timeOfDay: 'morning',
      dependencies: ['surgery-prep'],
    },
    {
      id: 'surgery-recovery',
      name: 'Post-op Recovery Monitoring',
      category: 'Post-procedure',
      estimatedMinutes: 120,
      priority: 'urgent',
      timeOfDay: 'anytime',
      dependencies: ['surgery-procedure'],
    },
    {
      id: 'surgery-owner-update',
      name: 'Call Owner - Surgery Update',
      category: 'Communication',
      estimatedMinutes: 10,
      priority: 'high',
      timeOfDay: 'anytime',
      dependencies: ['surgery-procedure'],
    },
  ],

  // Medical patients (general hospitalization)
  'Medical': [
    {
      id: 'morning-exam',
      name: 'Morning Physical/Neuro Exam',
      category: 'Daily Care',
      estimatedMinutes: 10,
      priority: 'high',
      timeOfDay: 'morning',
    },
    {
      id: 'morning-meds',
      name: 'Administer Morning Medications',
      category: 'Daily Care',
      estimatedMinutes: 5,
      priority: 'high',
      timeOfDay: 'morning',
    },
    {
      id: 'soap-note',
      name: 'Complete Daily SOAP Note',
      category: 'Documentation',
      estimatedMinutes: 10,
      priority: 'high',
      timeOfDay: 'morning',
      autoCompleteOn: { type: 'soap_saved' },
    },
    {
      id: 'rounding-sheet',
      name: 'Update Rounding Sheet',
      category: 'Documentation',
      estimatedMinutes: 5,
      priority: 'high',
      timeOfDay: 'morning',
      dependencies: ['morning-exam'],
      autoCompleteOn: { type: 'rounding_updated' },
    },
    {
      id: 'owner-update',
      name: 'Call Owner - Daily Update',
      category: 'Communication',
      estimatedMinutes: 10,
      priority: 'medium',
      timeOfDay: 'anytime',
      dependencies: ['soap-note'],
    },
    {
      id: 'evening-exam',
      name: 'Evening Check / Vitals',
      category: 'Daily Care',
      estimatedMinutes: 5,
      priority: 'medium',
      timeOfDay: 'evening',
    },
    {
      id: 'evening-meds',
      name: 'Administer Evening Medications',
      category: 'Daily Care',
      estimatedMinutes: 5,
      priority: 'high',
      timeOfDay: 'evening',
    },
  ],

  // Discharge patients
  'Discharge': [
    {
      id: 'discharge-exam',
      name: 'Final Discharge Exam',
      category: 'Discharge',
      estimatedMinutes: 15,
      priority: 'high',
      timeOfDay: 'anytime',
    },
    {
      id: 'discharge-meds',
      name: 'Prepare Discharge Medications',
      category: 'Discharge',
      estimatedMinutes: 10,
      priority: 'high',
      timeOfDay: 'anytime',
    },
    {
      id: 'discharge-instructions',
      name: 'Review Home Care Instructions with Owner',
      category: 'Discharge',
      estimatedMinutes: 20,
      priority: 'high',
      timeOfDay: 'anytime',
      dependencies: ['discharge-exam', 'discharge-meds'],
    },
    {
      id: 'discharge-followup',
      name: 'Schedule Follow-up Appointment',
      category: 'Discharge',
      estimatedMinutes: 5,
      priority: 'medium',
      timeOfDay: 'anytime',
      dependencies: ['discharge-instructions'],
    },
  ],
};

// ============================================================================
// TASK ENGINE FUNCTIONS
// ============================================================================

/**
 * Check if a task's dependencies are met
 */
export function checkTaskDependencies(
  task: TaskWithMetadata,
  allTasks: TaskWithMetadata[]
): { canComplete: boolean; blockedBy: string[] } {
  if (!task.dependencies || task.dependencies.length === 0) {
    return { canComplete: true, blockedBy: [] };
  }

  const blockedBy: string[] = [];

  for (const depId of task.dependencies) {
    const depTask = allTasks.find(
      t => t.id === depId && t.patientId === task.patientId
    );

    if (depTask && !depTask.completed) {
      blockedBy.push(depTask.name);
    }
  }

  return {
    canComplete: blockedBy.length === 0,
    blockedBy,
  };
}

/**
 * Auto-complete tasks based on actions
 */
export function autoCompleteTasks(
  condition: TaskAutoCompleteCondition,
  allTasks: TaskWithMetadata[]
): TaskWithMetadata[] {
  const tasksToComplete: TaskWithMetadata[] = [];

  for (const task of allTasks) {
    if (task.completed) continue;
    if (!task.autoCompleteOn) continue;

    // Check if this task's auto-complete condition matches
    if (task.autoCompleteOn.type === condition.type) {
      // If patient-specific, check patient ID
      if (
        !condition.patientId ||
        condition.patientId === task.patientId
      ) {
        tasksToComplete.push(task);
      }
    }
  }

  return tasksToComplete;
}

/**
 * Create tasks for a patient based on their type
 */
export function createTasksForPatient(
  patientId: number,
  patientName: string,
  patientType: 'MRI' | 'Surgery' | 'Medical' | 'Discharge'
): TaskWithMetadata[] {
  const templates = TASK_TEMPLATES_BY_PATIENT_TYPE[patientType] || [];

  return templates.map(template => ({
    ...template,
    taskId: `${patientId}-${template.id}-${Date.now()}`,
    patientId,
    patientName,
    completed: false,
    createdAt: new Date(),
    canComplete: !template.dependencies || template.dependencies.length === 0,
    blockedBy: template.dependencies || [],
  }));
}

/**
 * Calculate total estimated time for incomplete tasks
 */
export function calculateTotalTime(tasks: TaskWithMetadata[]): {
  totalMinutes: number;
  byPriority: Record<string, number>;
  byTimeOfDay: Record<string, number>;
} {
  const incompleteTasks = tasks.filter(t => !t.completed);

  const totalMinutes = incompleteTasks.reduce(
    (sum, task) => sum + task.estimatedMinutes,
    0
  );

  const byPriority: Record<string, number> = {
    urgent: 0,
    high: 0,
    medium: 0,
    low: 0,
  };

  const byTimeOfDay: Record<string, number> = {
    morning: 0,
    evening: 0,
    overnight: 0,
    anytime: 0,
  };

  for (const task of incompleteTasks) {
    byPriority[task.priority] += task.estimatedMinutes;
    if (task.timeOfDay) {
      byTimeOfDay[task.timeOfDay] += task.estimatedMinutes;
    }
  }

  return { totalMinutes, byPriority, byTimeOfDay };
}

/**
 * Get next actionable task (highest priority, no blockers)
 */
export function getNextTask(
  tasks: TaskWithMetadata[],
  timeOfDay?: 'morning' | 'evening' | 'overnight'
): TaskWithMetadata | null {
  const incompleteTasks = tasks.filter(t => !t.completed && t.canComplete);

  // Filter by time of day if specified
  let filteredTasks = incompleteTasks;
  if (timeOfDay) {
    filteredTasks = incompleteTasks.filter(
      t => t.timeOfDay === timeOfDay || t.timeOfDay === 'anytime'
    );
  }

  if (filteredTasks.length === 0) return null;

  // Sort by priority
  const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
  filteredTasks.sort(
    (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
  );

  return filteredTasks[0];
}

/**
 * Batch complete multiple tasks
 */
export function batchCompleteTasks(
  taskIds: string[],
  allTasks: TaskWithMetadata[]
): TaskWithMetadata[] {
  const now = new Date();
  return allTasks.map(task => {
    if (taskIds.includes(task.taskId)) {
      return {
        ...task,
        completed: true,
        completedAt: now,
      };
    }
    return task;
  });
}
