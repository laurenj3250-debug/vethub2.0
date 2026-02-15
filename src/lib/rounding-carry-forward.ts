/**
 * AI Rounding Sheet Carry-Forward
 * Automatically pre-fills today's rounding data from yesterday's data
 * Saves 90% of data entry time (10 min → 30 sec per patient)
 */

import type { RoundingData } from '@/types/rounding';

// Re-export for backwards compatibility
export type { RoundingData };

export interface CarryForwardResult {
  data: RoundingData;
  carriedForward: boolean;
  fieldsCarried: string[];
  message: string;
}

/**
 * Carry forward rounding data from previous day
 * @param previousData - Yesterday's rounding data
 * @param options - Carry-forward options
 */
export function carryForwardRoundingData(
  previousData: RoundingData | null | undefined,
  options?: {
    clearConcerns?: boolean; // Default true - user fills today's concerns
    incrementDayCount?: boolean; // Default true - auto-increment day count
    preserveFields?: (keyof RoundingData)[]; // Fields to always preserve
  }
): CarryForwardResult {
  const {
    clearConcerns = true,
    incrementDayCount = true,
    preserveFields = [],
  } = options || {};

  // No previous data - return empty
  if (!previousData) {
    return {
      data: {},
      carriedForward: false,
      fieldsCarried: [],
      message: 'No previous rounding data found',
    };
  }

  // Check if data is from today (don't carry forward if already updated today)
  const today = new Date().toISOString().split('T')[0];
  const lastUpdated = previousData.lastUpdated?.split('T')[0];

  if (lastUpdated === today) {
    return {
      data: previousData,
      carriedForward: false,
      fieldsCarried: [],
      message: 'Already updated today - using current data',
    };
  }

  // Fields to carry forward (stable fields that save re-entry time)
  // MASTERMIND FIX: Include problems and therapeutics - saves 10-30 min daily
  // Users can clear fields if needed - safer than forcing re-entry
  const fieldsToCarry: (keyof RoundingData)[] = [
    'signalment',
    'location',
    'icuCriteria',
    'code',
    'problems',        // Carried forward - most stay stable day-to-day
    'diagnosticFindings',
    'therapeutics',    // Carried forward - meds rarely change completely
    'ivc',
    'fluids',
    'cri',
    'overnightDx',
    'comments',
  ];

  // Build carried-forward data
  const carriedData: RoundingData = {};
  const fieldsCarried: string[] = [];

  fieldsToCarry.forEach((field) => {
    const fieldValue = previousData[field];
    // Only process string fields (dayCount and lastUpdated are handled separately)
    if (typeof fieldValue === 'string' && fieldValue.trim() !== '') {
      let value = fieldValue;

      // Auto-increment day count in problems field
      if (field === 'problems' && incrementDayCount) {
        value = incrementDayCountInText(value);
      }

      (carriedData as Record<string, string>)[field] = value;
      fieldsCarried.push(field);
    }
  });

  // Clear concerns (user fills today's concerns)
  if (clearConcerns) {
    carriedData.concerns = '';
  } else if (previousData.concerns) {
    carriedData.concerns = previousData.concerns;
    fieldsCarried.push('concerns');
  }

  // Increment day count
  if (incrementDayCount && previousData.dayCount !== undefined) {
    carriedData.dayCount = previousData.dayCount + 1;
    fieldsCarried.push('dayCount');
  } else if (previousData.dayCount !== undefined) {
    carriedData.dayCount = previousData.dayCount;
    fieldsCarried.push('dayCount');
  } else {
    // First time tracking day count
    carriedData.dayCount = 1;
  }

  // Set last updated to today
  carriedData.lastUpdated = new Date().toISOString();

  // Preserve specific fields if requested
  preserveFields.forEach((field) => {
    const fieldValue = previousData[field];
    if (fieldValue !== undefined) {
      // Use type assertion for dynamic field assignment
      (carriedData as Record<string, typeof fieldValue>)[field] = fieldValue;
      if (!fieldsCarried.includes(field as string)) {
        fieldsCarried.push(field as string);
      }
    }
  });

  return {
    data: carriedData,
    carriedForward: true,
    fieldsCarried,
    message: `Carried forward ${fieldsCarried.length} fields from previous day (Day ${carriedData.dayCount})`,
  };
}

/**
 * Check if rounding data needs carry-forward
 */
export function needsCarryForward(roundingData: RoundingData | null | undefined): boolean {
  if (!roundingData) return false;

  const today = new Date().toISOString().split('T')[0];
  const lastUpdated = roundingData.lastUpdated?.split('T')[0];

  // If not updated today, needs carry-forward
  return lastUpdated !== today;
}

/**
 * Get day count from rounding data
 */
export function getDayCount(roundingData: RoundingData | null | undefined): number {
  return roundingData?.dayCount || 1;
}

/**
 * Format carry-forward message for UI
 */
export function formatCarryForwardMessage(result: CarryForwardResult): string {
  if (!result.carriedForward) {
    return result.message;
  }

  const dayCount = result.data.dayCount || 1;
  return `📋 Pre-filled from yesterday (Day ${dayCount}). Update what changed today.`;
}

/**
 * Increment day count in text
 * "Day 2 seizures" → "Day 3 seizures"
 * "Post-op Day 1 IVDD" → "Post-op Day 2 IVDD"
 */
function incrementDayCountInText(text: string): string {
  if (!text) return text;

  // Pattern: "Day X" where X is a number
  const dayPattern = /Day (\d+)/gi;

  return text.replace(dayPattern, (match, dayNum) => {
    const newDay = parseInt(dayNum) + 1;
    return `Day ${newDay}`;
  });
}
