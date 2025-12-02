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
// TASK TEMPLATES BY PATIENT STATUS (not type!)
// Status determines what tasks a patient needs TODAY
// ============================================================================

export const TASK_TEMPLATES_BY_STATUS: Record<string, TaskTemplate[]> = {
  // NEW ADMIT - just arrived, needs admission tasks
  'New Admit': [
    {
      id: 'admit-finalize-record',
      name: 'Finalize Record',
      category: 'Admission',
      estimatedMinutes: 10,
      priority: 'high',
      timeOfDay: 'morning',
    },
    {
      id: 'admit-admission-soap',
      name: 'Admission SOAP',
      category: 'Admission',
      estimatedMinutes: 15,
      priority: 'high',
      timeOfDay: 'morning',
    },
    {
      id: 'admit-treatment-sheet',
      name: 'Treatment Sheet Created',
      category: 'Admission',
      estimatedMinutes: 10,
      priority: 'high',
      timeOfDay: 'morning',
    },
  ],

  // HOSPITALIZED - ongoing care, daily tasks only
  'Hospitalized': [
    {
      id: 'daily-soap',
      name: 'Daily SOAP',
      category: 'Daily',
      estimatedMinutes: 10,
      priority: 'high',
      timeOfDay: 'morning',
    },
    {
      id: 'daily-owner-call',
      name: 'Owner Called',
      category: 'Daily',
      estimatedMinutes: 5,
      priority: 'high',
      timeOfDay: 'morning',
    },
  ],

  // PRE-PROCEDURE - needs prep tasks (MRI/Surgery specific)
  'Pre-procedure': [
    {
      id: 'prep-blood-work',
      name: 'Blood Work',
      category: 'Pre-procedure',
      estimatedMinutes: 10,
      priority: 'high',
      timeOfDay: 'morning',
    },
    {
      id: 'prep-chest-xrays',
      name: 'Chest X-rays',
      category: 'Pre-procedure',
      estimatedMinutes: 15,
      priority: 'high',
      timeOfDay: 'morning',
    },
    {
      id: 'prep-npo',
      name: 'NPO Confirmed',
      category: 'Pre-procedure',
      estimatedMinutes: 1,
      priority: 'high',
      timeOfDay: 'morning',
    },
  ],

  // IN PROCEDURE - minimal tasks
  'In Procedure': [],

  // RECOVERY - post-procedure monitoring
  'Recovery': [
    {
      id: 'recovery-vitals',
      name: 'Post-Op Vitals',
      category: 'Recovery',
      estimatedMinutes: 5,
      priority: 'high',
      timeOfDay: 'morning',
    },
    {
      id: 'recovery-owner-update',
      name: 'Owner Update Call',
      category: 'Recovery',
      estimatedMinutes: 5,
      priority: 'high',
      timeOfDay: 'morning',
    },
  ],

  // MONITORING - stable patients
  'Monitoring': [
    {
      id: 'monitor-daily-soap',
      name: 'Daily SOAP',
      category: 'Daily',
      estimatedMinutes: 10,
      priority: 'medium',
      timeOfDay: 'morning',
    },
    {
      id: 'monitor-owner-call',
      name: 'Owner Called',
      category: 'Daily',
      estimatedMinutes: 5,
      priority: 'medium',
      timeOfDay: 'morning',
    },
  ],

  // READY FOR DISCHARGE - prep for going home
  'Ready for Discharge': [
    {
      id: 'discharge-instructions',
      name: 'Discharge Instructions',
      category: 'Discharge',
      estimatedMinutes: 15,
      priority: 'high',
      timeOfDay: 'anytime',
    },
    {
      id: 'discharge-meds',
      name: 'Discharge Meds Ready',
      category: 'Discharge',
      estimatedMinutes: 10,
      priority: 'high',
      timeOfDay: 'anytime',
    },
    {
      id: 'discharge-owner-call',
      name: 'Owner Pickup Call',
      category: 'Discharge',
      estimatedMinutes: 5,
      priority: 'high',
      timeOfDay: 'anytime',
    },
  ],

  // DISCHARGING - actively leaving
  'Discharging': [
    {
      id: 'discharge-final-check',
      name: 'Final Checkout',
      category: 'Discharge',
      estimatedMinutes: 10,
      priority: 'high',
      timeOfDay: 'anytime',
    },
  ],

  // DISCHARGED - no tasks
  'Discharged': [],
};

// ============================================================================
// TYPE-SPECIFIC TASK TEMPLATES
// These are the ACTUAL tasks created when a patient is admitted
// ============================================================================

// MRI Patient Tasks - Pre-procedure prep + MRI-specific
const MRI_TASKS: TaskTemplate[] = [
  // Pre-procedure prep
  {
    id: 'mri-blood-work',
    name: 'Blood Work',
    category: 'Pre-procedure',
    estimatedMinutes: 10,
    priority: 'high',
    timeOfDay: 'morning',
  },
  {
    id: 'mri-chest-xrays',
    name: 'Chest X-rays',
    category: 'Pre-procedure',
    estimatedMinutes: 15,
    priority: 'high',
    timeOfDay: 'morning',
  },
  {
    id: 'mri-anesthesia-sheet',
    name: 'MRI Anesthesia Sheet',
    category: 'Pre-procedure',
    estimatedMinutes: 10,
    priority: 'high',
    timeOfDay: 'morning',
  },
  {
    id: 'mri-npo',
    name: 'NPO',
    category: 'Pre-procedure',
    estimatedMinutes: 1,
    priority: 'high',
    timeOfDay: 'morning',
  },
  {
    id: 'mri-black-book',
    name: 'Black Book',
    category: 'Admin',
    estimatedMinutes: 5,
    priority: 'medium',
    timeOfDay: 'morning',
  },
  {
    id: 'mri-print-stickers',
    name: 'Print 5 Stickers',
    category: 'Admin',
    estimatedMinutes: 3,
    priority: 'medium',
    timeOfDay: 'morning',
  },
  {
    id: 'mri-print-small-stickers',
    name: 'Print 1 Sheet Small Stickers',
    category: 'Admin',
    estimatedMinutes: 2,
    priority: 'low',
    timeOfDay: 'morning',
  },
];

// Surgery Patient Tasks - Pre-procedure prep + Surgery-specific
const SURGERY_TASKS: TaskTemplate[] = [
  // Pre-procedure prep
  {
    id: 'surgery-blood-work',
    name: 'Blood Work',
    category: 'Pre-procedure',
    estimatedMinutes: 10,
    priority: 'high',
    timeOfDay: 'morning',
  },
  {
    id: 'surgery-chest-xrays',
    name: 'Chest X-rays',
    category: 'Pre-procedure',
    estimatedMinutes: 15,
    priority: 'high',
    timeOfDay: 'morning',
  },
  {
    id: 'surgery-npo',
    name: 'NPO',
    category: 'Pre-procedure',
    estimatedMinutes: 1,
    priority: 'high',
    timeOfDay: 'morning',
  },
  // Surgery-specific
  {
    id: 'surgery-slip',
    name: 'Surgery Slip',
    category: 'Surgery Prep',
    estimatedMinutes: 5,
    priority: 'high',
    timeOfDay: 'morning',
  },
  {
    id: 'surgery-written-on-board',
    name: 'Written on Board',
    category: 'Surgery Prep',
    estimatedMinutes: 2,
    priority: 'high',
    timeOfDay: 'morning',
  },
  {
    id: 'surgery-print-large-stickers',
    name: 'Print 4 Large Stickers',
    category: 'Admin',
    estimatedMinutes: 3,
    priority: 'medium',
    timeOfDay: 'morning',
  },
  {
    id: 'surgery-print-small-stickers',
    name: 'Print 2 Sheets Small Stickers',
    category: 'Admin',
    estimatedMinutes: 3,
    priority: 'medium',
    timeOfDay: 'morning',
  },
  {
    id: 'surgery-print-sheet',
    name: 'Print Surgery Sheet',
    category: 'Surgery Prep',
    estimatedMinutes: 3,
    priority: 'high',
    timeOfDay: 'morning',
  },
];

// Medical Patient Tasks - Admission tasks
const MEDICAL_TASKS: TaskTemplate[] = [
  {
    id: 'medical-admission-soap',
    name: 'Admission SOAP',
    category: 'Admission',
    estimatedMinutes: 15,
    priority: 'high',
    timeOfDay: 'morning',
  },
  {
    id: 'medical-treatment-sheet',
    name: 'Treatment Sheet Created',
    category: 'Admission',
    estimatedMinutes: 10,
    priority: 'high',
    timeOfDay: 'morning',
  },
  {
    id: 'medical-owner-call',
    name: 'Owner Admission Call',
    category: 'Admission',
    estimatedMinutes: 10,
    priority: 'high',
    timeOfDay: 'morning',
  },
];

// Discharge Tasks
const DISCHARGE_TASKS: TaskTemplate[] = [
  {
    id: 'discharge-final-check',
    name: 'Final Checkout',
    category: 'Discharge',
    estimatedMinutes: 10,
    priority: 'high',
    timeOfDay: 'anytime',
  },
];

// Map patient types to their task templates
export const TASK_TEMPLATES_BY_PATIENT_TYPE: Record<string, TaskTemplate[]> = {
  'MRI': MRI_TASKS,
  'Surgery': SURGERY_TASKS,
  'Medical': MEDICAL_TASKS,
  'Discharge': DISCHARGE_TASKS,
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

// ============================================================================
// DAILY TASK GENERATION & REFRESH
// ============================================================================

/**
 * Get today's date in YYYY-MM-DD format
 */
export function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Interface for database task
 */
export interface DatabaseTask {
  id: string;
  patientId: number | null;
  title: string;
  description?: string | null;
  category?: string | null;
  timeOfDay?: string | null;
  priority?: string | null;
  completed: boolean;
  completedAt?: Date | null;
  completedDate?: string | null;
  createdAt: Date;
}

/**
 * Interface for patient data needed for task generation
 */
export interface PatientForTasks {
  id: number;
  status: string;
  type?: string | null;
  demographics?: { name?: string } | null;
}

/**
 * Generate daily tasks for a patient based on their current STATUS
 * STATUS determines what tasks a patient needs - not their type!
 *
 * Status → Tasks:
 * - New Admit → Admission tasks (Finalize Record, Admission SOAP, Treatment Sheet)
 * - Hospitalized → Daily tasks (Daily SOAP, Owner Called)
 * - Pre-procedure → Prep tasks (Blood Work, X-rays, NPO)
 * - Recovery → Recovery tasks (Post-Op Vitals, Owner Update)
 * - Ready for Discharge → Discharge prep tasks
 * - Discharging → Final checkout only
 * - Discharged → No tasks
 */
export function generateDailyTasksForPatient(
  patient: PatientForTasks
): { title: string; category: string; timeOfDay: string; priority: string }[] {
  const patientStatus = patient.status;

  // Get tasks based on STATUS (not type!)
  const templates = TASK_TEMPLATES_BY_STATUS[patientStatus] || [];

  // If no templates for this status, return empty (no auto-generated tasks)
  if (templates.length === 0) {
    return [];
  }

  return templates.map(template => ({
    title: template.name,
    category: template.category,
    timeOfDay: template.timeOfDay || 'morning',
    priority: template.priority,
  }));
}

/**
 * Check if a patient's tasks should be refreshed
 * Returns true if:
 * - Patient has no tasks for today
 * - Patient's status has changed and tasks don't match
 * - Tasks are from a previous day and not completed today
 */
export function shouldRefreshTasks(
  patient: PatientForTasks,
  existingTasks: DatabaseTask[]
): { shouldRefresh: boolean; reason: string } {
  const today = getTodayDateString();
  const patientTasks = existingTasks.filter(t => t.patientId === patient.id);

  // No tasks at all - definitely need to generate
  if (patientTasks.length === 0) {
    return { shouldRefresh: true, reason: 'No tasks exist for this patient' };
  }

  // Check if patient is discharged - should have no incomplete tasks
  if (patient.status === 'Discharged') {
    const incompleteTasks = patientTasks.filter(t => !t.completed);
    if (incompleteTasks.length > 0) {
      return { shouldRefresh: true, reason: 'Discharged patient should have no tasks' };
    }
    return { shouldRefresh: false, reason: 'Discharged patient correctly has no incomplete tasks' };
  }

  // Check if tasks are from today (look at incomplete or completed-today)
  const todayTasks = patientTasks.filter(
    t => !t.completed || t.completedDate === today
  );

  if (todayTasks.length === 0) {
    return { shouldRefresh: true, reason: 'No tasks for today' };
  }

  // Check if patient type changed (tasks don't match expected template)
  const expectedTasks = generateDailyTasksForPatient(patient);
  const expectedTitles = new Set(expectedTasks.map(t => t.title));
  const currentTitles = new Set(patientTasks.filter(t => !t.completed).map(t => t.title));

  // If discharging but no discharge tasks
  if (patient.status === 'Discharging') {
    const hasDischargeTask = patientTasks.some(t =>
      t.category === 'Discharge' && !t.completed
    );
    if (!hasDischargeTask) {
      return { shouldRefresh: true, reason: 'Discharging patient needs discharge tasks' };
    }
  }

  return { shouldRefresh: false, reason: 'Tasks are up to date' };
}

/**
 * Filter tasks to show only today's relevant tasks
 * - Incomplete tasks (always show)
 * - Tasks completed TODAY (show as done)
 * - Tasks completed on previous days (hide)
 */
export function filterTodayTasks(tasks: DatabaseTask[]): DatabaseTask[] {
  const today = getTodayDateString();

  return tasks.filter(task => {
    // Always show incomplete tasks
    if (!task.completed) {
      return true;
    }

    // Show tasks completed today
    if (task.completedDate === today) {
      return true;
    }

    // Hide tasks completed on previous days
    return false;
  });
}

/**
 * Get task completion stats for a patient
 */
export function getPatientTaskStats(
  patientId: number,
  tasks: DatabaseTask[]
): { total: number; completed: number; percentage: number; allDone: boolean } {
  const today = getTodayDateString();
  const patientTasks = tasks.filter(t => t.patientId === patientId);

  // Only count today's tasks (incomplete + completed today)
  const todayTasks = filterTodayTasks(patientTasks);
  const total = todayTasks.length;
  const completed = todayTasks.filter(t => t.completed).length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return {
    total,
    completed,
    percentage,
    allDone: total > 0 && completed === total,
  };
}
