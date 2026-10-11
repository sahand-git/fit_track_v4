/**
 * Local date handling utilities to avoid UTC day-shift bugs.
 * Standard format is YYYY-MM-DD representing local device calendar date.
 */

export function getTodayDateString(): string {
  const now = new Date();
  return formatDateToLocalString(now);
}

export function formatDateToLocalString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseLocalDateString(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  // Constructs local date using local year, monthIndex, day
  return new Date(year, (month || 1) - 1, day || 1);
}

export function addDaysToDateString(dateStr: string, days: number): string {
  const date = parseLocalDateString(dateStr);
  date.setDate(date.getDate() + days);
  return formatDateToLocalString(date);
}

export function formatDisplayDate(dateStr: string): string {
  const today = getTodayDateString();
  const yesterday = addDaysToDateString(today, -1);
  const tomorrow = addDaysToDateString(today, 1);

  if (dateStr === today) return 'Today';
  if (dateStr === yesterday) return 'Yesterday';
  if (dateStr === tomorrow) return 'Tomorrow';

  const date = parseLocalDateString(dateStr);
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function getPastDates(daysCount: number, fromDateStr?: string): string[] {
  const baseStr = fromDateStr || getTodayDateString();
  const dates: string[] = [];
  for (let i = daysCount - 1; i >= 0; i--) {
    dates.push(addDaysToDateString(baseStr, -i));
  }
  return dates;
}
