/**
 * SINGLE SOURCE OF TRUTH FOR ALL TASK DEFINITIONS
 *
 * This file centralizes task names, categories, colors, and helpers.
 * When adding/removing tasks, edit ONLY this file.
 */

// ============================================================================
// TYPES
// ============================================================================

export type TaskTimeOfDay = 'morning' | 'evening' | 'anytime';
export type TaskPriority = 'high' | 'medium' | 'low';

export interface TaskDefinition {
  name: string;
  category: string;
  timeOfDay: TaskTimeOfDay;
  priority: TaskPriority;
}

// ============================================================================
// DAILY RECURRING TASKS (reset each day by daily-reset API)
// ============================================================================

export const DAILY_TASKS = {
  // Patient-specific tasks (created for each active patient)
  patient: {
    morning: [
      { name: 'Daily SOAP Done', category: 'Daily', timeOfDay: 'morning', priority: 'high' },
      { name: 'Overnight Notes Checked', category: 'Daily', timeOfDay: 'morning', priority: 'medium' },
      { name: 'Call Owner', category: 'Daily', timeOfDay: 'morning', priority: 'high' },
    ],
    evening: [
      { name: 'Vet Radar Done', category: 'Daily', timeOfDay: 'evening', priority: 'high' },
      { name: 'Rounding Sheet Done', category: 'Daily', timeOfDay: 'evening', priority: 'high' },
      { name: 'Sticker on Daily Sheet', category: 'Daily', timeOfDay: 'evening', priority: 'medium' },
    ],
  },
  // General team tasks (not tied to any patient)
  general: {
    morning: [] as TaskDefinition[],
    evening: [
      { name: 'Do All Rounding Summaries', category: 'General', timeOfDay: 'evening', priority: 'high' },
    ],
  },
} as const;

// ============================================================================
// DERIVED ARRAYS (computed from DAILY_TASKS)
// ============================================================================

export const MORNING_TASK_NAMES: string[] = [
  ...DAILY_TASKS.patient.morning.map(t => t.name),
];

export const EVENING_TASK_NAMES: string[] = [
  ...DAILY_TASKS.patient.evening.map(t => t.name),
];

export const ALL_DAILY_PATIENT_TASK_NAMES: string[] = [
  ...MORNING_TASK_NAMES,
  ...EVENING_TASK_NAMES,
];

export const ALL_DAILY_GENERAL_TASK_NAMES: string[] = [
  ...DAILY_TASKS.general.morning.map(t => t.name),
  ...DAILY_TASKS.general.evening.map(t => t.name),
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Determine if a task is morning, evening, or anytime based on its name
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
 * Get the icon for a task based on its time of day
 */
export function getTaskIcon(timeOfDay: TaskTimeOfDay): string {
  switch (timeOfDay) {
    case 'morning': return '🌅';
    case 'evening': return '🌙';
    default: return '📋';
  }
}

// ============================================================================
// TIME-BASED COLORS (Tailwind classes)
// ============================================================================

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

// ============================================================================
// GENERAL TASKS (non-recurring, for quick-add dropdown)
// ============================================================================

export const COMMON_GENERAL_TASKS: string[] = [
  'Draw Up Contrast',
  'Rounding',
];
