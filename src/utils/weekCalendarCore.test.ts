import assert from 'node:assert';
import {
  WEEK_SHORT_DAY_NAMES,
  getWeekStartDay,
  getWeekDatesForDate,
  formatWeekHeaderTitle,
  evaluateWeekDayStatus,
} from './weekCalendarCore';
import { getDefaultProfile } from './calculator';
import { DailyLog, UserProfile } from '../types';

console.log('Starting Week Calendar Core Unit Tests...');

// 1. Short day labels completeness across en, ar, ckb
for (const lang of ['en', 'ar', 'ckb'] as const) {
  const names = WEEK_SHORT_DAY_NAMES[lang];
  assert.strictEqual(names.length, 7, `${lang} must have exactly 7 weekday labels`);
  for (const label of names) {
    assert(label.trim().length > 0 && !label.includes('...'), `${lang} label "${label}" must be non-empty and un-truncated`);
  }
}
assert.deepStrictEqual(WEEK_SHORT_DAY_NAMES.ckb, ['یەک', 'دوو', 'سێ', 'چوار', 'پێنج', 'هەینی', 'شەممە']);
assert.deepStrictEqual(WEEK_SHORT_DAY_NAMES.ar, ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']);
console.log('✓ Test 1 passed: Weekday labels verified across en, ar, ckb.');

// 2. Week start day & week generation across month/year boundaries
assert.strictEqual(getWeekStartDay('en'), 0, 'English week starts Sunday (0)');
assert.strictEqual(getWeekStartDay('ar'), 6, 'Arabic week starts Saturday (6)');
assert.strictEqual(getWeekStartDay('ckb'), 6, 'Sorani Kurdish week starts Saturday (6)');

// Nov 10, 2026 is Tuesday (day 2)
const enWeek = getWeekDatesForDate('2026-11-10', 'en');
assert.deepStrictEqual(enWeek, [
  '2026-11-08', '2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14',
]);

const ckbWeek = getWeekDatesForDate('2026-11-10', 'ckb');
assert.deepStrictEqual(ckbWeek, [
  '2026-11-07', '2026-11-08', '2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13',
]);

// Cross-month / leap year / year boundary
const leapWeek = getWeekDatesForDate('2024-02-29', 'en'); // Thu Feb 29, 2024
assert.strictEqual(leapWeek[0], '2024-02-25');
assert.strictEqual(leapWeek[6], '2024-03-02');

const yearEndWeek = getWeekDatesForDate('2026-12-31', 'ar'); // Thu Dec 31, 2026 -> Sat Dec 26..Fri Jan 1
assert.strictEqual(yearEndWeek[0], '2026-12-26');
assert.strictEqual(yearEndWeek[6], '2027-01-01');
console.log('✓ Test 2 passed: Week boundaries (same month, leap day, year boundary) verified.');

// 3. Header Month & Year + Week Range formatting (pure, no Intl dependency)
const enHdr = formatWeekHeaderTitle('2026-11-10', enWeek, 'en');
assert.strictEqual(enHdr.monthYearLabel, 'November 2026');
assert.strictEqual(enHdr.weekRangeLabel, 'Nov 8 – 14');

const ckbHdr = formatWeekHeaderTitle('2026-11-10', ckbWeek, 'ckb');
assert.strictEqual(ckbHdr.monthYearLabel, 'تشرینی دووەم 2026');
assert.strictEqual(ckbHdr.weekRangeLabel, '7 – 13 تشرینی دووەم');

const crossMonthHdr = formatWeekHeaderTitle('2024-02-29', leapWeek, 'ar');
assert.strictEqual(crossMonthHdr.monthYearLabel, 'فبراير 2024');
assert.strictEqual(crossMonthHdr.weekRangeLabel, '25 فبراير – 2 مارس');
console.log('✓ Test 3 passed: Localized Month/Year & week range formatters verified.');

// 4. Day status dot evaluation (none, partial, on_target, over_limit)
const baseProfile: UserProfile = {
  ...getDefaultProfile(),
  targetCalories: 2000,
  includeWorkoutsInCalorieBudget: false,
};

const emptyLog: DailyLog = { date: '2026-11-10', meals: [], waterGlasses: 0, steps: 0, workouts: [] };
assert.strictEqual(evaluateWeekDayStatus(emptyLog, baseProfile), 'none', 'Empty day has status none');
assert.strictEqual(evaluateWeekDayStatus(null, baseProfile), 'none', 'Null log has status none');

const partialWaterOnly: DailyLog = { ...emptyLog, waterGlasses: 3 };
assert.strictEqual(evaluateWeekDayStatus(partialWaterOnly, baseProfile), 'partial', 'Water only is partial');

const partialMeal: DailyLog = {
  ...emptyLog,
  meals: [{ id: 'm1', foodId: 'f1', name: 'Egg', mealType: 'breakfast', servings: 1, servingSize: '100g', servingGrams: 100, calories: 500, protein: 20, carbs: 10, fat: 15, timestamp: '' }],
};
assert.strictEqual(evaluateWeekDayStatus(partialMeal, baseProfile), 'partial', '500/2000 kcal is partial');

const onTargetMeal: DailyLog = {
  ...emptyLog,
  meals: [{ id: 'm2', foodId: 'f2', name: 'Bowl', mealType: 'dinner', servings: 1, servingSize: '500g', servingGrams: 500, calories: 1950, protein: 100, carbs: 200, fat: 60, timestamp: '' }],
};
assert.strictEqual(evaluateWeekDayStatus(onTargetMeal, baseProfile), 'on_target', '1950/2000 kcal is on_target');

const withinToleranceMeal: DailyLog = {
  ...emptyLog,
  meals: [{ id: 'm3', foodId: 'f3', name: 'Dinner', mealType: 'dinner', servings: 1, servingSize: '500g', servingGrams: 500, calories: 2030, protein: 100, carbs: 200, fat: 60, timestamp: '' }],
};
assert.strictEqual(evaluateWeekDayStatus(withinToleranceMeal, baseProfile), 'on_target', '2030/2000 (+30 within 2% tol=40) is on_target');

const overLimitMeal: DailyLog = {
  ...emptyLog,
  meals: [{ id: 'm4', foodId: 'f4', name: 'Feast', mealType: 'dinner', servings: 1, servingSize: '700g', servingGrams: 700, calories: 2150, protein: 100, carbs: 220, fat: 80, timestamp: '' }],
};
assert.strictEqual(evaluateWeekDayStatus(overLimitMeal, baseProfile), 'over_limit', '2150/2000 (>2040) is over_limit');
console.log('✓ Test 4 passed: Week day status indicator thresholds verified.');

console.log('All Week Calendar Core unit tests passed cleanly!');
