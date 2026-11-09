import { AppLanguage } from '../types';
import { translate } from '../i18n/strings';

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

const KURDISH_DAYS_FULL = [
  'یەکشەممە',
  'دووشەممە',
  'سێشەممە',
  'چوارشەممە',
  'پێنجشەممە',
  'هەینی',
  'شەممە',
];

const KURDISH_MONTHS = [
  'کانوونی دووەم',
  'شوبات',
  'ئازار',
  'نیسان',
  'ئایار',
  'حوزەیران',
  'تەممووز',
  'ئاب',
  'ئەیلوول',
  'تشرینی یەکەم',
  'تشرینی دووەم',
  'کانوونی یەکەم',
];

const ARABIC_DAYS_SHORT = [
  'الأحد',
  'الإثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
  'السبت',
];

const ARABIC_MONTHS = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
];

export function formatFullCalendarDate(dateStr: string, language: AppLanguage = 'en'): string {
  const date = parseLocalDateString(dateStr);
  if (language === 'ckb') {
    const dayOfWeek = KURDISH_DAYS_FULL[date.getDay()] || '';
    const monthName = KURDISH_MONTHS[date.getMonth()] || '';
    return `${dayOfWeek}، ${date.getDate()}ی ${monthName}`;
  }
  if (language === 'ar') {
    const dayOfWeek = ARABIC_DAYS_SHORT[date.getDay()] || '';
    const monthName = ARABIC_MONTHS[date.getMonth()] || '';
    return `${dayOfWeek}، ${date.getDate()} ${monthName}`;
  }
  try {
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  } catch {
    return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  }
}

export function formatDisplayDate(dateStr: string, language: AppLanguage = 'en'): string {
  const today = getTodayDateString();
  const yesterday = addDaysToDateString(today, -1);
  const tomorrow = addDaysToDateString(today, 1);

  if (dateStr === today) return translate(language, 'Today');
  if (dateStr === yesterday) return translate(language, 'Yesterday');
  if (dateStr === tomorrow) return translate(language, 'Tomorrow');

  const date = parseLocalDateString(dateStr);
  if (language === 'ckb') {
    const dayOfWeek = KURDISH_DAYS_FULL[date.getDay()] || '';
    const monthName = KURDISH_MONTHS[date.getMonth()] || '';
    return `${dayOfWeek}، ${date.getDate()}ی ${monthName}`;
  }
  if (language === 'ar') {
    const dayOfWeek = ARABIC_DAYS_SHORT[date.getDay()] || '';
    const monthName = ARABIC_MONTHS[date.getMonth()] || '';
    return `${dayOfWeek}، ${date.getDate()} ${monthName}`;
  }
  try {
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  } catch {
    return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  }
}

export function getPastDates(daysCount: number, fromDateStr?: string): string[] {
  const baseStr = fromDateStr || getTodayDateString();
  const dates: string[] = [];
  for (let i = daysCount - 1; i >= 0; i--) {
    dates.push(addDaysToDateString(baseStr, -i));
  }
  return dates;
}
