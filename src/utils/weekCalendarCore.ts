import { AppLanguage, DailyLog, UserProfile } from '../types';
import { getDailyEffectiveCalorieTarget } from './activityBudget';
import { formatDateToLocalString, parseLocalDateString } from './dateUtils';

export type WeekDayStatus = 'none' | 'on_target' | 'partial' | 'over_limit';

export const WEEK_FULL_DAY_KEYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

export const WEEK_SHORT_DAY_NAMES: Record<AppLanguage, string[]> = {
  en: ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
  ar: ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
  ckb: ['یەک', 'دوو', 'سێ', 'چوار', 'پێنج', 'هەینی', 'شەممە'],
};

const MONTH_NAMES_LONG: Record<AppLanguage, string[]> = {
  en: [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ],
  ar: [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
  ],
  ckb: [
    'کانوونی دووەم', 'شوبات', 'ئازار', 'نیسان', 'ئایار', 'حوزەیران',
    'تەممووز', 'ئاب', 'ئەیلوول', 'تشرینی یەکەم', 'تشرینی دووەم', 'کانوونی یەکەم',
  ],
};

const MONTH_NAMES_SHORT: Record<AppLanguage, string[]> = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  ar: MONTH_NAMES_LONG.ar,
  ckb: MONTH_NAMES_LONG.ckb,
};

/** Returns 6 (Saturday) for Arabic/Kurdish and 0 (Sunday) for English. */
export function getWeekStartDay(language: AppLanguage = 'en'): number {
  return language === 'ar' || language === 'ckb' ? 6 : 0;
}

/**
 * Generates the 7 consecutive YYYY-MM-DD local dates containing `activeDateStr`
 * in chronological order (day 0 -> day 6). RTL UIs mirror layout via flexDirection.
 */
export function getWeekDatesForDate(activeDateStr: string, language: AppLanguage = 'en'): string[] {
  const target = parseLocalDateString(activeDateStr);
  const weekStartDay = getWeekStartDay(language);
  const diff = (target.getDay() - weekStartDay + 7) % 7;
  const start = new Date(target);
  start.setDate(target.getDate() - diff);

  const list: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    list.push(formatDateToLocalString(d));
  }
  return list;
}

/**
 * Formats localized Month & Year + compact Week Range labels without relying on Intl
 * (Hermes on Android lacks reliable Sorani Kurdish Intl support).
 */
export function formatWeekHeaderTitle(
  activeDateStr: string,
  weekDates: string[],
  language: AppLanguage = 'en'
): { monthYearLabel: string; weekRangeLabel: string } {
  const activeDate = parseLocalDateString(activeDateStr);
  const longMonths = MONTH_NAMES_LONG[language] || MONTH_NAMES_LONG.en;
  const shortMonths = MONTH_NAMES_SHORT[language] || MONTH_NAMES_SHORT.en;

  const monthYearLabel = `${longMonths[activeDate.getMonth()]} ${activeDate.getFullYear()}`;

  if (!weekDates || weekDates.length === 0) {
    return { monthYearLabel, weekRangeLabel: '' };
  }

  const startDate = parseLocalDateString(weekDates[0]);
  const endDate = parseLocalDateString(weekDates[weekDates.length - 1]);
  const startMonth = shortMonths[startDate.getMonth()];
  const endMonth = shortMonths[endDate.getMonth()];
  const startDay = startDate.getDate();
  const endDay = endDate.getDate();

  let weekRangeLabel: string;
  if (language === 'en') {
    weekRangeLabel =
      startDate.getMonth() === endDate.getMonth()
        ? `${startMonth} ${startDay} – ${endDay}`
        : `${startMonth} ${startDay} – ${endMonth} ${endDay}`;
  } else {
    // Natural Arabic/Kurdish day-range expression (digits + month name)
    weekRangeLabel =
      startDate.getMonth() === endDate.getMonth()
        ? `${startDay} – ${endDay} ${startMonth}`
        : `${startDay} ${startMonth} – ${endDay} ${endMonth}`;
  }

  return { monthYearLabel, weekRangeLabel };
}

/**
 * Evaluates a day's calorie/activity status for the week strip mini indicator dot:
 * - 'none': no food or activity logged
 * - 'on_target': logged calories within [80% * target, target + tolerance]
 * - 'over_limit': logged calories exceed target + tolerance (max(25, 2% of target))
 * - 'partial': partial meals (<80% of target) or non-meal activity only
 */
export function evaluateWeekDayStatus(
  dayLog?: DailyLog | null,
  profile?: UserProfile | null
): WeekDayStatus {
  if (!dayLog) return 'none';

  const meals = Array.isArray(dayLog.meals) ? dayLog.meals : [];
  const consumed = meals.reduce((sum, m) => sum + Math.max(0, Number(m.calories) || 0), 0);
  const hasSupplements =
    Boolean(dayLog.supplements?.some((s) => s.taken)) ||
    Boolean(dayLog.dailySupplements?.some((s) => s.taken));
  const hasOtherActivity =
    (dayLog.waterGlasses || 0) > 0 ||
    (dayLog.steps || 0) > 0 ||
    (dayLog.workouts?.length || 0) > 0 ||
    hasSupplements;

  if (meals.length === 0 && consumed <= 0 && !hasOtherActivity) {
    return 'none';
  }

  const effectiveTarget = getDailyEffectiveCalorieTarget(profile, dayLog);
  if (effectiveTarget <= 0) {
    return consumed > 0 || hasOtherActivity ? 'partial' : 'none';
  }

  const tolerance = Math.max(25, Math.round(effectiveTarget * 0.02));
  if (consumed > effectiveTarget + tolerance) {
    return 'over_limit';
  }
  if (consumed >= effectiveTarget * 0.8) {
    return 'on_target';
  }
  return 'partial';
}
