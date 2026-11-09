import { AppLanguage } from '../types';
import { translate } from '../i18n/strings';
import { parseLocalDateString, addDaysToDateString } from './dateUtils';

export type WeekStartDay = 'saturday' | 'sunday' | 'monday';

const KURDISH_DAYS_FULL = [
  'یەکشەممە',
  'دووشەممە',
  'سێشەممە',
  'چوارشەممە',
  'پێنجشەممە',
  'هەینی',
  'شەممە',
];

const KURDISH_DAYS_ABBR3 = [
  'یەک',
  'دوو',
  'سێ',
  'چوا',
  'پێن',
  'هەی',
  'شەم',
];

const KURDISH_DAYS_ABBR1 = [
  'ی',
  'د',
  'س',
  'چ',
  'پ',
  'ه',
  'ش',
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

const ARABIC_DAYS_FULL = [
  'الأحد',
  'الإثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
  'السبت',
];

const ARABIC_DAYS_ABBR3 = [
  'أحد',
  'إثن',
  'ثلا',
  'أرب',
  'خمي',
  'جمع',
  'سبت',
];

const ARABIC_DAYS_ABBR1 = [
  'ح',
  'ن',
  'ث',
  'ر',
  'خ',
  'ج',
  'س',
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

const ENGLISH_DAYS_FULL = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const ENGLISH_DAYS_ABBR3 = [
  'Sun',
  'Mon',
  'Tue',
  'Wed',
  'Thu',
  'Fri',
  'Sat',
];

const ENGLISH_DAYS_ABBR1 = [
  'S',
  'M',
  'T',
  'W',
  'T',
  'F',
  'S',
];

const ENGLISH_MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/**
 * Returns the default first day of the week based on language:
 * - Saturday for Arabic ('ar') and Kurdish Sorani ('ckb')
 * - Monday for English ('en')
 */
export function getDefaultWeekStartDay(language: AppLanguage = 'en'): WeekStartDay {
  if (language === 'ar' || language === 'ckb') {
    return 'saturday';
  }
  return 'monday';
}

/**
 * Resolves the active week start day honoring user preference, falling back to language default.
 */
export function resolveWeekStartDay(
  profileSetting?: WeekStartDay | null,
  language: AppLanguage = 'en'
): WeekStartDay {
  if (
    profileSetting === 'saturday' ||
    profileSetting === 'sunday' ||
    profileSetting === 'monday'
  ) {
    return profileSetting;
  }
  return getDefaultWeekStartDay(language);
}

/**
 * Maps WeekStartDay string to JavaScript Date.getDay() index:
 * Sunday = 0, Monday = 1, Saturday = 6
 */
export function getDayOfWeekIndex(startDay: WeekStartDay): number {
  switch (startDay) {
    case 'sunday':
      return 0;
    case 'monday':
      return 1;
    case 'saturday':
      return 6;
  }
}

/**
 * Calculates how many days elapsed between the week start day and a given day of the week.
 * Result is in the range [0..6].
 */
export function getDaysSinceWeekStart(dayOfWeek: number, startDay: WeekStartDay): number {
  const startIndex = getDayOfWeekIndex(startDay);
  return (dayOfWeek - startIndex + 7) % 7;
}

/**
 * Generates the 7 consecutive YYYY-MM-DD date strings for the calendar week containing targetDateStr,
 * starting on startDay and ending 6 days later.
 */
export function getWeekDaysForDate(targetDateStr: string, startDay: WeekStartDay): string[] {
  const targetDate = parseLocalDateString(targetDateStr);
  const daysBack = getDaysSinceWeekStart(targetDate.getDay(), startDay);
  const weekStartStr = addDaysToDateString(targetDateStr, -daysBack);

  const days: string[] = [];
  for (let i = 0; i < 7; i++) {
    days.push(addDaysToDateString(weekStartStr, i));
  }
  return days;
}

/**
 * Orders week days for rendering:
 * - In LTR (English): chronological (index 0 is week start = older, index 6 is week end = newer).
 * - In RTL (Arabic/Sorani): mirrored so older days appear on the right and newer days on the left.
 */
export function orderWeekDaysForDisplay(weekDays: string[], isRTL: boolean): string[] {
  if (!isRTL) {
    return [...weekDays];
  }
  return [...weekDays].reverse();
}

/**
 * Shifts the current selected date by deltaWeeks (e.g. -1 for previous week, +1 for next week).
 * Preserves the exact selected weekday (e.g., Tuesday -> Tuesday).
 * When allowFuture is false, dates beyond todayStr are clamped to todayStr.
 */
export function shiftWeek(
  currentSelectedDateStr: string,
  deltaWeeks: number,
  todayStr: string,
  allowFuture: boolean = false
): string {
  const shifted = addDaysToDateString(currentSelectedDateStr, deltaWeeks * 7);
  if (!allowFuture && shifted > todayStr) {
    return todayStr;
  }
  return shifted;
}

/**
 * Determines whether forward week navigation is permissible.
 * Forward navigation is allowed if allowFuture is true, or if next week contains at least one day <= todayStr.
 */
export function canShiftWeekForward(
  weekDays: string[],
  todayStr: string,
  allowFuture: boolean = false
): boolean {
  if (allowFuture) return true;
  if (!weekDays || weekDays.length === 0) return false;
  const nextWeekFirstDay = addDaysToDateString(weekDays[weekDays.length - 1], 1);
  return nextWeekFirstDay <= todayStr;
}

/**
 * Formats full header date strictly without using Intl (Hermes-safe).
 * Format:
 * - en: "Monday, Nov 9, 2026"
 * - ar: "الإثنين، 9 نوفمبر 2026"
 * - ckb: "دووشەممە، 9ی تشرینی دووەم 2026"
 */
export function formatFullDateHeader(dateStr: string, language: AppLanguage = 'en'): string {
  const date = parseLocalDateString(dateStr);
  const dayOfWeek = date.getDay();
  const month = date.getMonth();
  const dayNum = date.getDate();
  const year = date.getFullYear();

  if (language === 'ckb') {
    const dayName = KURDISH_DAYS_FULL[dayOfWeek] || '';
    const monthName = KURDISH_MONTHS[month] || '';
    return `${dayName}، ${dayNum}ی ${monthName} ${year}`;
  }

  if (language === 'ar') {
    const dayName = ARABIC_DAYS_FULL[dayOfWeek] || '';
    const monthName = ARABIC_MONTHS[month] || '';
    return `${dayName}، ${dayNum} ${monthName} ${year}`;
  }

  const dayName = ENGLISH_DAYS_FULL[dayOfWeek] || '';
  const monthName = ENGLISH_MONTHS_SHORT[month] || '';
  return `${dayName}, ${monthName} ${dayNum}, ${year}`;
}

/**
 * Formats a short month + day string without Intl.
 * - en: "Nov 9"
 * - ar: "9 نوفمبر"
 * - ckb: "9ی تشرینی دووەم"
 */
export function formatShortDate(dateStr: string, language: AppLanguage = 'en'): string {
  const date = parseLocalDateString(dateStr);
  const month = date.getMonth();
  const dayNum = date.getDate();

  if (language === 'ckb') {
    const monthName = KURDISH_MONTHS[month] || '';
    return `${dayNum}ی ${monthName}`;
  }

  if (language === 'ar') {
    const monthName = ARABIC_MONTHS[month] || '';
    return `${dayNum} ${monthName}`;
  }

  const monthName = ENGLISH_MONTHS_SHORT[month] || '';
  return `${monthName} ${dayNum}`;
}

/**
 * Returns relative day title ("Today", "Yesterday", "Tomorrow"), falling back to short date.
 * Guarantees zero duplicate "Today" strings in the header.
 */
export function getRelativeDayTitle(
  dateStr: string,
  todayStr: string,
  language: AppLanguage = 'en',
  allowFuture: boolean = false
): string {
  const yesterdayStr = addDaysToDateString(todayStr, -1);
  const tomorrowStr = addDaysToDateString(todayStr, 1);

  if (dateStr === todayStr) {
    return translate(language, 'Today');
  }
  if (dateStr === yesterdayStr) {
    return translate(language, 'Yesterday');
  }
  if (allowFuture && dateStr === tomorrowStr) {
    return translate(language, 'Tomorrow');
  }

  return formatShortDate(dateStr, language);
}

/**
 * Returns short weekday abbreviations (3-letter and 1-letter) without using Intl.
 */
export function getShortWeekdayName(
  dayOfWeek: number,
  language: AppLanguage = 'en'
): { abbr3: string; abbr1: string } {
  const safeIdx = ((dayOfWeek % 7) + 7) % 7;

  if (language === 'ckb') {
    return {
      abbr3: KURDISH_DAYS_ABBR3[safeIdx],
      abbr1: KURDISH_DAYS_ABBR1[safeIdx],
    };
  }

  if (language === 'ar') {
    return {
      abbr3: ARABIC_DAYS_ABBR3[safeIdx],
      abbr1: ARABIC_DAYS_ABBR1[safeIdx],
    };
  }

  return {
    abbr3: ENGLISH_DAYS_ABBR3[safeIdx],
    abbr1: ENGLISH_DAYS_ABBR1[safeIdx],
  };
}
