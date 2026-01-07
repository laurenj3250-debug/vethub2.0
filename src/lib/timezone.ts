/**
 * Timezone utilities for VetHub
 * All dates in the app should use Eastern Time (ET)
 */

export const APP_TIMEZONE = 'America/New_York';

/**
 * Get today's date in YYYY-MM-DD format in Eastern Time
 * Use this instead of new Date().toISOString().split('T')[0]
 */
export function getTodayET(): string {
  return new Date().toLocaleDateString('en-CA', {
    timeZone: APP_TIMEZONE,
  });
}

/**
 * Get current time in Eastern Time as a Date object
 * Note: The Date object itself is still in UTC internally,
 * but this returns a Date representing "now" in ET context
 */
export function getNowET(): Date {
  return new Date();
}

/**
 * Format a date to YYYY-MM-DD in Eastern Time
 */
export function formatDateET(date: Date): string {
  return date.toLocaleDateString('en-CA', {
    timeZone: APP_TIMEZONE,
  });
}

/**
 * Check if a given date string (YYYY-MM-DD) is today in Eastern Time
 */
export function isTodayET(dateStr: string): boolean {
  return dateStr === getTodayET();
}

/**
 * Get the current hour in Eastern Time (0-23)
 * Useful for determining morning vs evening
 */
export function getCurrentHourET(): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TIMEZONE,
    hour: 'numeric',
    hour12: false,
  });
  return parseInt(formatter.format(new Date()), 10);
}

/**
 * Check if it's currently morning (before noon) in Eastern Time
 */
export function isMorningET(): boolean {
  return getCurrentHourET() < 12;
}

/**
 * Check if we've crossed midnight ET since the last reset
 * @param lastResetDate - The date string (YYYY-MM-DD) of the last reset
 * @returns true if today (in ET) is different from lastResetDate
 */
export function isNewDayET(lastResetDate: string | null): boolean {
  if (!lastResetDate) return true;
  return getTodayET() !== lastResetDate;
}

/**
 * Get current time in HH:MM format in Eastern Time
 * Use this for clock in/out times instead of UTC
 */
export function getCurrentTimeET(): string {
  return new Date().toLocaleTimeString('en-US', {
    timeZone: APP_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * Format a time string for display with AM/PM
 * Converts HH:MM to h:MM AM/PM format
 */
export function formatTimeForDisplay(time: string | null | undefined): string {
  if (!time) return '';
  // Parse HH:MM format
  const match = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return time;

  const hours = parseInt(match[1], 10);
  const minutes = match[2];
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;

  return `${displayHours}:${minutes} ${period}`;
}
