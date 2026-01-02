// src/lib/residency-milestones.ts
// Single source of truth for milestone thresholds, labels, and styling

export const MILESTONE_THRESHOLDS = {
  mri: [50, 100, 150, 200, 250, 300, 350, 400, 450, 500],
  appointment: [25, 50, 75, 100, 150, 200, 250, 300, 400, 500],
  surgery: [10, 25, 50, 75, 100, 150, 200],
  case: [100, 250, 500, 750, 1000, 1500, 2000],
} as const;

export type MilestoneType = keyof typeof MILESTONE_THRESHOLDS;

export const MILESTONE_CONFIG: Record<MilestoneType, {
  label: string;
  emoji: string;
  color: string;
  bgColor: string;
}> = {
  mri: { label: 'MRIs', emoji: '🧠', color: 'text-purple-500', bgColor: 'bg-purple-500' },
  appointment: { label: 'Appointments', emoji: '👥', color: 'text-blue-500', bgColor: 'bg-blue-500' },
  surgery: { label: 'Surgeries', emoji: '✂️', color: 'text-red-500', bgColor: 'bg-red-500' },
  case: { label: 'Total Cases', emoji: '🎯', color: 'text-green-500', bgColor: 'bg-green-500' },
};

export const PARTICIPATION_LEVELS = {
  S: { label: 'Surgeon', description: 'Primary surgeon', color: 'bg-green-500', textColor: 'text-green-700 dark:text-green-400' },
  O: { label: 'Observer', description: 'Observing only', color: 'bg-gray-400', textColor: 'text-gray-600 dark:text-gray-400' },
  C: { label: 'Circulator', description: 'Circulating/assisting', color: 'bg-blue-400', textColor: 'text-blue-700 dark:text-blue-400' },
  D: { label: 'Dissector', description: 'Dissecting/exposing', color: 'bg-yellow-500', textColor: 'text-yellow-700 dark:text-yellow-400' },
  K: { label: 'Knife', description: 'Cutting/suturing assistant', color: 'bg-orange-500', textColor: 'text-orange-700 dark:text-orange-400' },
} as const;

export type ParticipationLevel = keyof typeof PARTICIPATION_LEVELS;

export const COMMON_PROCEDURES = [
  'Hemilaminectomy',
  'Ventral Slot',
  'Craniotomy',
  'Foramen Magnum Decompression',
  'Atlantoaxial Stabilization',
  'Lumbosacral Dorsal Laminectomy',
  'Lateral Corpectomy',
  'VP Shunt',
  'Peripheral Nerve Biopsy',
  'Muscle Biopsy',
] as const;

export const CELEBRATION_MESSAGES = [
  "You're crushing it!",
  "Look at you go!",
  "Neuro superstar!",
  "Keep that momentum!",
  "One step closer to freedom!",
  "The spinal cord would be proud!",
  "Your neurons are firing!",
  "Myelin would be jealous!",
  "Axons of steel!",
  "Textbook localization!",
] as const;

// Utility functions
export function getNextMilestone(current: number, type: MilestoneType): number {
  const thresholds = MILESTONE_THRESHOLDS[type];
  return thresholds.find((t) => t > current) || thresholds[thresholds.length - 1];
}

export function getMilestoneProgress(current: number, type: MilestoneType): number {
  const thresholds = MILESTONE_THRESHOLDS[type];
  const next = getNextMilestone(current, type);
  const prev = [...thresholds].filter((t) => t < next).pop() || 0;
  const range = next - prev;
  const progress = current - prev;
  return range > 0 ? Math.min(100, Math.round((progress / range) * 100)) : 100;
}

export function getRandomCelebrationMessage(): string {
  return CELEBRATION_MESSAGES[Math.floor(Math.random() * CELEBRATION_MESSAGES.length)];
}
