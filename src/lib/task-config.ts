/**
 * UNIFIED TASK CONFIGURATION
 * Single source of truth for all task definitions
 *
 * This replaces the split between task-definitions.ts and task-engine.ts
 */

export type TaskTimeOfDay = 'morning' | 'evening' | 'anytime';
export type TaskPriority = 'high' | 'medium' | 'low';

export interface TaskDefinition {
  name: string;
  category: string;
  timeOfDay?: TaskTimeOfDay;
  priority: TaskPriority;
}

/**
 * All task configuration in one place
 */
export const TASK_CONFIG = {
  /**
   * Daily recurring tasks - created every day at reset
   */
  dailyRecurring: {
    // Tasks created for each active patient every day
    // Morning tasks: Daily SOAP, Check Overnight Notes, Call Owner (per user request)
    patient: [
      { name: 'Daily SOAP', category: 'Daily', timeOfDay: 'morning' as TaskTimeOfDay, priority: 'high' as TaskPriority },
      { name: 'Check Overnight Notes', category: 'Daily', timeOfDay: 'morning' as TaskTimeOfDay, priority: 'medium' as TaskPriority },
      { name: 'Call Owner', category: 'Daily', timeOfDay: 'morning' as TaskTimeOfDay, priority: 'high' as TaskPriority },
      { name: 'Vet Radar Done', category: 'Daily', timeOfDay: 'evening' as TaskTimeOfDay, priority: 'high' as TaskPriority },
      { name: 'Rounding Sheet Done', category: 'Daily', timeOfDay: 'evening' as TaskTimeOfDay, priority: 'high' as TaskPriority },
      { name: 'Sticker on Daily Sheet', category: 'Daily', timeOfDay: 'evening' as TaskTimeOfDay, priority: 'medium' as TaskPriority },
    ],

    // General team tasks (not tied to any patient)
    general: [
      { name: 'Do All Rounding Summaries', category: 'General', timeOfDay: 'evening' as TaskTimeOfDay, priority: 'high' as TaskPriority },
    ],

    // Patient statuses that should NOT get daily recurring tasks
    // These patients are leaving or have left - no need for daily tasks
    excludeStatuses: ['Discharged', 'Discharging'] as string[],
  },

  /**
   * Status-triggered tasks - created ONCE when patient status changes
   * These are workflow tasks, not daily recurring
   */
  statusTriggered: {
    'New Admit': [
      { name: 'Finalize Record', category: 'Admission', timeOfDay: 'evening' as TaskTimeOfDay, priority: 'high' as TaskPriority },
      { name: 'Treatment Sheet Created', category: 'Admission', timeOfDay: 'morning' as TaskTimeOfDay, priority: 'high' as TaskPriority },
    ],
    'Pre-procedure': [
      { name: 'Blood Work', category: 'Pre-procedure', timeOfDay: 'evening' as TaskTimeOfDay, priority: 'high' as TaskPriority },
      { name: 'Chest X-rays', category: 'Pre-procedure', timeOfDay: 'evening' as TaskTimeOfDay, priority: 'high' as TaskPriority },
      { name: 'NPO Confirmed', category: 'Pre-procedure', timeOfDay: 'evening' as TaskTimeOfDay, priority: 'high' as TaskPriority },
    ],
    'Recovery': [
      { name: 'Post-Op Vitals', category: 'Recovery', timeOfDay: 'anytime' as TaskTimeOfDay, priority: 'high' as TaskPriority },
      { name: 'Owner Update Call', category: 'Recovery', timeOfDay: 'anytime' as TaskTimeOfDay, priority: 'high' as TaskPriority },
    ],
    'Ready for Discharge': [
      { name: 'Discharge Instructions', category: 'Discharge', timeOfDay: 'morning' as TaskTimeOfDay, priority: 'high' as TaskPriority },
      { name: 'Discharge Meds Ready', category: 'Discharge', timeOfDay: 'morning' as TaskTimeOfDay, priority: 'high' as TaskPriority },
      { name: 'Owner Pickup Call', category: 'Discharge', timeOfDay: 'morning' as TaskTimeOfDay, priority: 'high' as TaskPriority },
    ],
    'Discharging': [
      // Discharge Instructions removed - already created in 'Ready for Discharge'
    ],
  } as Record<string, TaskDefinition[]>,

  /**
   * Patient type specific tasks - created on admission based on patient type
   * These are one-time setup tasks
   */
  typeSpecific: {
    'MRI': [
      { name: 'MRI Anesthesia Sheet', category: 'Pre-procedure', timeOfDay: 'evening' as TaskTimeOfDay, priority: 'high' as TaskPriority },
      { name: 'Black Book', category: 'Admin', timeOfDay: 'evening' as TaskTimeOfDay, priority: 'medium' as TaskPriority },
      { name: 'Print 5 Stickers', category: 'Admin', timeOfDay: 'evening' as TaskTimeOfDay, priority: 'medium' as TaskPriority },
      { name: 'Print 1 Sheet Small Stickers', category: 'Admin', timeOfDay: 'evening' as TaskTimeOfDay, priority: 'low' as TaskPriority },
    ],
    'Surgery': [
      { name: 'Surgery Slip', category: 'Surgery Prep', timeOfDay: 'morning' as TaskTimeOfDay, priority: 'high' as TaskPriority },
      { name: 'Written on Board', category: 'Surgery Prep', timeOfDay: 'morning' as TaskTimeOfDay, priority: 'high' as TaskPriority },
      { name: 'Print Surgery Sheet', category: 'Surgery Prep', timeOfDay: 'morning' as TaskTimeOfDay, priority: 'high' as TaskPriority },
      { name: 'Print 4 Large Stickers', category: 'Admin', timeOfDay: 'morning' as TaskTimeOfDay, priority: 'medium' as TaskPriority },
      { name: 'Print 2 Sheets Small Stickers', category: 'Admin', timeOfDay: 'morning' as TaskTimeOfDay, priority: 'medium' as TaskPriority },
    ],
    'Medical': [
      // Owner Admission Call removed per user request
    ],
  } as Record<string, TaskDefinition[]>,
};

/**
 * Helper: Get all daily patient task names (for filtering)
 */
export const DAILY_PATIENT_TASK_NAMES = TASK_CONFIG.dailyRecurring.patient.map(t => t.name);

/**
 * Helper: Get all daily general task names
 */
export const DAILY_GENERAL_TASK_NAMES = TASK_CONFIG.dailyRecurring.general.map(t => t.name);

/**
 * Helper: Get ONLY daily recurring morning tasks (for "Add Morning Tasks" button)
 * This is the subset users actually want - NOT all morning tasks from every source
 */
export const DAILY_MORNING_TASK_NAMES = TASK_CONFIG.dailyRecurring.patient
  .filter(t => t.timeOfDay === 'morning')
  .map(t => t.name);

/**
 * Helper: Get ONLY daily recurring evening tasks (for "Add Evening Tasks" button)
 */
export const DAILY_EVENING_TASK_NAMES = TASK_CONFIG.dailyRecurring.patient
  .filter(t => t.timeOfDay === 'evening')
  .map(t => t.name);

/**
 * Helper: Get all task names with a specific timeOfDay from ALL sources
 */
function getAllTaskNamesWithTime(time: TaskTimeOfDay): string[] {
  const names: string[] = [];

  // Daily patient tasks
  TASK_CONFIG.dailyRecurring.patient
    .filter(t => t.timeOfDay === time)
    .forEach(t => names.push(t.name));

  // Daily general tasks
  TASK_CONFIG.dailyRecurring.general
    .filter(t => t.timeOfDay === time)
    .forEach(t => names.push(t.name));

  // Status-triggered tasks (Pre-procedure, Recovery, etc.)
  Object.values(TASK_CONFIG.statusTriggered)
    .flat()
    .filter(t => t.timeOfDay === time)
    .forEach(t => names.push(t.name));

  // Type-specific tasks (MRI, Surgery, Medical)
  Object.values(TASK_CONFIG.typeSpecific)
    .flat()
    .filter(t => t.timeOfDay === time)
    .forEach(t => names.push(t.name));

  return names;
}

/**
 * Helper: Get morning task names (from all sources)
 */
export const MORNING_TASK_NAMES = getAllTaskNamesWithTime('morning');

/**
 * Helper: Get evening task names (from all sources)
 */
export const EVENING_TASK_NAMES = getAllTaskNamesWithTime('evening');

/**
 * Check if a patient status should receive daily recurring tasks
 */
export function shouldGetDailyTasks(status: string): boolean {
  return !TASK_CONFIG.dailyRecurring.excludeStatuses.includes(status);
}

/**
 * Get tasks to create when patient status changes
 */
export function getStatusTriggeredTasks(status: string): TaskDefinition[] {
  return TASK_CONFIG.statusTriggered[status] || [];
}

/**
 * Get tasks to create based on patient type (on admission)
 */
export function getTypeSpecificTasks(type: string): TaskDefinition[] {
  return TASK_CONFIG.typeSpecific[type] || [];
}

/**
 * Determine task time of day from task name
 */
export function getTaskTimeOfDay(taskName: string): TaskTimeOfDay {
  if (MORNING_TASK_NAMES.some(t => taskName.includes(t) || t.includes(taskName))) {
    return 'morning';
  }
  if (EVENING_TASK_NAMES.some(t => taskName.includes(t) || t.includes(taskName))) {
    return 'evening';
  }
  return 'anytime';
}

/**
 * Get icon for a task based on its time of day
 */
export function getTaskIcon(timeOfDay: TaskTimeOfDay): string {
  switch (timeOfDay) {
    case 'morning': return '🌅';
    case 'evening': return '🌙';
    default: return '📋';
  }
}

/**
 * Time-based colors (Tailwind classes)
 */
export const TIME_COLORS = {
  morning: {
    cardBg: 'bg-amber-900/30',
    cardBorder: 'border-amber-500/50',
    rowBorder: 'border-l-amber-500/70',
    rowBg: 'bg-amber-900/10',
    text: 'text-amber-300',
    gradient: 'from-yellow-500 to-orange-500',
  },
  evening: {
    cardBg: 'bg-indigo-900/30',
    cardBorder: 'border-indigo-500/50',
    rowBorder: 'border-l-indigo-500/70',
    rowBg: 'bg-indigo-900/10',
    text: 'text-indigo-300',
    gradient: 'from-indigo-500 to-purple-500',
  },
  anytime: {
    cardBg: 'bg-slate-900/50',
    cardBorder: 'border-slate-700/50',
    rowBorder: 'border-l-transparent',
    rowBg: '',
    text: 'text-slate-300',
    gradient: 'from-slate-500 to-slate-600',
  },
} as const;

/**
 * Get color classes for a task based on its time of day
 */
export function getTimeColors(timeOfDay: TaskTimeOfDay) {
  return TIME_COLORS[timeOfDay];
}
