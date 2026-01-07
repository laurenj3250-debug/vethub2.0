/**
 * Timezone utilities for VetHub
 * All dates in the app should use Eastern Time (ET)
 *
 * Note: We use manual offset calculation because Node.js on some cloud
 * providers (like Railway) doesn't fully support Intl timezone options.
 */

export const APP_TIMEZONE = 'America/New_York';

/**
 * Check if a date is in US Daylight Saving Time
 * DST starts: 2nd Sunday in March at 2am
 * DST ends: 1st Sunday in November at 2am
 */
function isDST(date: Date): boolean {
  const year = date.getUTCFullYear();

  // Find 2nd Sunday in March (DST starts)
  const march = new Date(Date.UTC(year, 2, 1)); // March 1
  let secondSunday = 1;
  while (march.getUTCDay() !== 0) {
    march.setUTCDate(march.getUTCDate() + 1);
  }
  secondSunday = march.getUTCDate() + 7; // 2nd Sunday
  const dstStart = new Date(Date.UTC(year, 2, secondSunday, 7)); // 2am ET = 7am UTC

  // Find 1st Sunday in November (DST ends)
  const november = new Date(Date.UTC(year, 10, 1)); // November 1
  while (november.getUTCDay() !== 0) {
    november.setUTCDate(november.getUTCDate() + 1);
  }
  const dstEnd = new Date(Date.UTC(year, 10, november.getUTCDate(), 6)); // 2am ET = 6am UTC (still in DST)

  return date >= dstStart && date < dstEnd;
}

/**
 * Get the UTC offset for Eastern Time (returns -4 for EDT, -5 for EST)
 */
function getETOffset(date: Date = new Date()): number {
  return isDST(date) ? -4 : -5;
}

/**
 * Convert a UTC date to Eastern Time
 */
function toEasternTime(date: Date): Date {
  const offset = getETOffset(date);
  return new Date(date.getTime() + offset * 60 * 60 * 1000);
}

/**
 * Get today's date in YYYY-MM-DD format in Eastern Time
 * Use this instead of new Date().toISOString().split('T')[0]
 */
export function getTodayET(): string {
  const et = toEasternTime(new Date());
  return et.toISOString().split('T')[0];
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
  const et = toEasternTime(date);
  return et.toISOString().split('T')[0];
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
  const et = toEasternTime(new Date());
  return et.getUTCHours();
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
  const et = toEasternTime(new Date());
  const hours = et.getUTCHours().toString().padStart(2, '0');
  const minutes = et.getUTCMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
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
