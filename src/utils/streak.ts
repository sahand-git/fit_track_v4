import { DailyLog, WeightEntry } from '../types';
import { getTodayDateString } from './dateUtils';

export function getPreviousDayString(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  dt.setDate(dt.getDate() - 1);
  const year = dt.getFullYear();
  const month = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Checks if a specific calendar date (YYYY-MM-DD) contains at least one food or weight entry.
 */
export function hasActivityOnDate(
  date: string,
  dailyLogs: Record<string, DailyLog>,
  weightHistory: WeightEntry[]
): boolean {
  // 1. Check food log entries
  const dayLog = dailyLogs[date];
  if (dayLog && Array.isArray(dayLog.meals) && dayLog.meals.length > 0) {
    return true;
  }

  // 2. Check weight history entries
  if (Array.isArray(weightHistory)) {
    const hasWeight = weightHistory.some((w) => w.date === date);
    if (hasWeight) return true;
  }

  return false;
}

/**
 * Calculates current consecutive active logging streak (in days).
 * A day is active if it has at least one food item or weight entry logged.
 * If today has not been logged yet, yesterday's streak is preserved so the user
 * doesn't lose their streak early in the morning before logging breakfast.
 */
export function calculateLoggingStreak(
  dailyLogs: Record<string, DailyLog>,
  weightHistory: WeightEntry[],
  referenceDate: string = getTodayDateString()
): { currentStreak: number; loggedToday: boolean } {
  const loggedToday = hasActivityOnDate(referenceDate, dailyLogs, weightHistory);

  let streak = 0;
  let checkDate = loggedToday ? referenceDate : getPreviousDayString(referenceDate);

  // Traverse backward day by day to count consecutive active days
  while (hasActivityOnDate(checkDate, dailyLogs, weightHistory)) {
    streak++;
    checkDate = getPreviousDayString(checkDate);
  }

  return {
    currentStreak: streak,
    loggedToday,
  };
}
