import {
  getDefaultWeekStartDay,
  resolveWeekStartDay,
  getDaysSinceWeekStart,
  getWeekDaysForDate,
  orderWeekDaysForDisplay,
  shiftWeek,
  canShiftWeekForward,
  getRelativeDayTitle,
  formatFullDateHeader,
  getShortWeekdayName,
} from './weekStripCore';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertDeepEqual<T>(actual: T, expected: T, message: string) {
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  if (actualStr !== expectedStr) {
    throw new Error(`${message}: Expected ${expectedStr}, got ${actualStr}`);
  }
}

console.log('--- Starting weekStripCore Unit Tests ---');

// 1. First Day Defaults & Preference Resolution
console.log('Testing First Day Defaults & Preference Resolution...');
assert(getDefaultWeekStartDay('ar') === 'saturday', 'Default for Arabic must be Saturday');
assert(getDefaultWeekStartDay('ckb') === 'saturday', 'Default for Kurdish must be Saturday');
assert(getDefaultWeekStartDay('en') === 'monday', 'Default for English must be Monday');

assert(resolveWeekStartDay('sunday', 'ar') === 'sunday', 'Explicit preference overrides default');
assert(resolveWeekStartDay('monday', 'ckb') === 'monday', 'Explicit preference overrides default');
assert(resolveWeekStartDay(null, 'ar') === 'saturday', 'Null preference falls back to language');
assert(resolveWeekStartDay(undefined, 'en') === 'monday', 'Undefined preference falls back to language');

// 2. getDaysSinceWeekStart for all three settings
console.log('Testing getDaysSinceWeekStart across all settings...');
// Sunday = 0, Monday = 1, Tuesday = 2, Wednesday = 3, Thursday = 4, Friday = 5, Saturday = 6
// When startDay = 'sunday'
assert(getDaysSinceWeekStart(0, 'sunday') === 0, 'Sunday is 0 days from Sunday');
assert(getDaysSinceWeekStart(1, 'sunday') === 1, 'Monday is 1 day from Sunday');
assert(getDaysSinceWeekStart(6, 'sunday') === 6, 'Saturday is 6 days from Sunday');

// When startDay = 'monday'
assert(getDaysSinceWeekStart(1, 'monday') === 0, 'Monday is 0 days from Monday');
assert(getDaysSinceWeekStart(0, 'monday') === 6, 'Sunday is 6 days from Monday');
assert(getDaysSinceWeekStart(6, 'monday') === 5, 'Saturday is 5 days from Monday');

// When startDay = 'saturday'
assert(getDaysSinceWeekStart(6, 'saturday') === 0, 'Saturday is 0 days from Saturday');
assert(getDaysSinceWeekStart(0, 'saturday') === 1, 'Sunday is 1 day from Saturday');
assert(getDaysSinceWeekStart(5, 'saturday') === 6, 'Friday is 6 days from Saturday');

// 3. Week Generation - Normal week (Nov 9, 2026 is Monday)
console.log('Testing Week Generation across Monday, Sunday, and Saturday starts...');
// Target: 2026-11-09 (Monday)
const weekMon = getWeekDaysForDate('2026-11-09', 'monday');
assertDeepEqual(
  weekMon,
  [
    '2026-11-09',
    '2026-11-10',
    '2026-11-11',
    '2026-11-12',
    '2026-11-13',
    '2026-11-14',
    '2026-11-15',
  ],
  'Monday start week for 2026-11-09'
);

const weekSun = getWeekDaysForDate('2026-11-09', 'sunday');
assertDeepEqual(
  weekSun,
  [
    '2026-11-08',
    '2026-11-09',
    '2026-11-10',
    '2026-11-11',
    '2026-11-12',
    '2026-11-13',
    '2026-11-14',
  ],
  'Sunday start week for 2026-11-09'
);

const weekSat = getWeekDaysForDate('2026-11-09', 'saturday');
assertDeepEqual(
  weekSat,
  [
    '2026-11-07',
    '2026-11-08',
    '2026-11-09',
    '2026-11-10',
    '2026-11-11',
    '2026-11-12',
    '2026-11-13',
  ],
  'Saturday start week for 2026-11-09'
);

// 4. Month Boundary Crossing (Oct 31 / Nov 1)
console.log('Testing Month Boundary Crossing...');
// 2026-11-01 is a Sunday
const octNovWeek = getWeekDaysForDate('2026-11-01', 'monday');
assertDeepEqual(
  octNovWeek,
  [
    '2026-10-26',
    '2026-10-27',
    '2026-10-28',
    '2026-10-29',
    '2026-10-30',
    '2026-10-31',
    '2026-11-01',
  ],
  'Month boundary crossing Oct -> Nov'
);

// 5. Year Boundary Crossing (Dec 31, 2025 / Jan 1, 2026)
console.log('Testing Year Boundary Crossing...');
// 2026-01-01 was a Thursday
const newYearWeek = getWeekDaysForDate('2026-01-01', 'monday');
assertDeepEqual(
  newYearWeek,
  [
    '2025-12-29',
    '2025-12-30',
    '2025-12-31',
    '2026-01-01',
    '2026-01-02',
    '2026-01-03',
    '2026-01-04',
  ],
  'Year boundary crossing 2025 -> 2026'
);

// 6. Leap Year Handling (Feb 29, 2024 was a Thursday)
console.log('Testing Leap Year Handling...');
const leapWeek = getWeekDaysForDate('2024-02-29', 'monday');
assertDeepEqual(
  leapWeek,
  [
    '2024-02-26',
    '2024-02-27',
    '2024-02-28',
    '2024-02-29',
    '2024-03-01',
    '2024-03-02',
    '2024-03-03',
  ],
  'Leap year week properly includes Feb 29 and rolls into March'
);

// 7. Daylight Saving Transitions (March and November DST dates)
console.log('Testing Daylight Saving Transitions...');
// US DST spring forward was March 10, 2024 (Sunday)
const dstSpringWeek = getWeekDaysForDate('2024-03-10', 'sunday');
assert(dstSpringWeek.length === 7, 'DST week must contain exactly 7 calendar dates');
assert(dstSpringWeek[0] === '2024-03-10', 'DST spring week start correct');
assert(dstSpringWeek[6] === '2024-03-16', 'DST spring week end correct');

// 8. RTL Display Order Mirroring
console.log('Testing RTL Display Order Mirroring...');
const baseWeek = ['2026-11-07', '2026-11-08', '2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13'];
const ltrOrder = orderWeekDaysForDisplay(baseWeek, false);
assertDeepEqual(ltrOrder, baseWeek, 'LTR order is unchanged');

const rtlOrder = orderWeekDaysForDisplay(baseWeek, true);
assertDeepEqual(
  rtlOrder,
  ['2026-11-13', '2026-11-12', '2026-11-11', '2026-11-10', '2026-11-09', '2026-11-08', '2026-11-07'],
  'RTL order is mirrored so older day (2026-11-07) is at the right and newer day (2026-11-13) is at the left'
);

// 9. Week Navigation & Weekday Retention
console.log('Testing Week Navigation & Weekday Retention...');
const selectedTuesday = '2026-11-10';
const prevWeekTuesday = shiftWeek(selectedTuesday, -1, '2026-11-09', false);
assert(prevWeekTuesday === '2026-11-03', `Previous week Tuesday should be 2026-11-03, got ${prevWeekTuesday}`);

const twoWeeksBackTuesday = shiftWeek(selectedTuesday, -2, '2026-11-09', false);
assert(twoWeeksBackTuesday === '2026-10-27', `2 weeks back Tuesday should be 2026-10-27, got ${twoWeeksBackTuesday}`);

// Forward shifting ceiling when future logging disabled
const futureAttempt = shiftWeek('2026-11-08', 1, '2026-11-09', false);
assert(futureAttempt === '2026-11-09', `Shift into future clamped to today (2026-11-09), got ${futureAttempt}`);

const pastWeekDays = ['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01'];
assert(canShiftWeekForward(pastWeekDays, '2026-11-09', false) === true, 'Can shift forward from past week');

const currentWeekDays = ['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15'];
assert(canShiftWeekForward(currentWeekDays, '2026-11-09', false) === false, 'Cannot shift forward past current week when today is in it');

// 10. Relative Day Titles & No Duplicate "Today"
console.log('Testing Relative Day Titles...');
const todayStr = '2026-11-09';
assert(getRelativeDayTitle('2026-11-09', todayStr, 'en') === 'Today', 'English Today');
assert(getRelativeDayTitle('2026-11-09', todayStr, 'ckb') === 'ئەمڕۆ', 'Kurdish Today');
assert(getRelativeDayTitle('2026-11-09', todayStr, 'ar') === 'اليوم', 'Arabic Today');

assert(getRelativeDayTitle('2026-11-08', todayStr, 'en') === 'Yesterday', 'English Yesterday');
assert(getRelativeDayTitle('2026-11-08', todayStr, 'ckb') === 'دوێنێ', 'Kurdish Yesterday');
assert(getRelativeDayTitle('2026-11-08', todayStr, 'ar') === 'أمس', 'Arabic Yesterday');

const pastShortDateEn = getRelativeDayTitle('2026-11-03', todayStr, 'en');
assert(pastShortDateEn === 'Nov 3', `Past short date en should be 'Nov 3', got '${pastShortDateEn}'`);

const pastShortDateAr = getRelativeDayTitle('2026-11-03', todayStr, 'ar');
assert(pastShortDateAr === '3 نوفمبر', `Past short date ar should be '3 نوفمبر', got '${pastShortDateAr}'`);

const pastShortDateCkb = getRelativeDayTitle('2026-11-03', todayStr, 'ckb');
assert(pastShortDateCkb === '3ی تشرینی دووەم', `Past short date ckb should be '3ی تشرینی دووەم', got '${pastShortDateCkb}'`);

// 11. Full Date Header Formatting (without Intl)
console.log('Testing Full Date Header Formatting...');
const headerEn = formatFullDateHeader('2026-11-09', 'en');
assert(headerEn === 'Monday, Nov 9, 2026', `English header: expected 'Monday, Nov 9, 2026', got '${headerEn}'`);

const headerAr = formatFullDateHeader('2026-11-09', 'ar');
assert(headerAr === 'الإثنين، 9 نوفمبر 2026', `Arabic header: expected 'الإثنين، 9 نوفمبر 2026', got '${headerAr}'`);

const headerCkb = formatFullDateHeader('2026-11-09', 'ckb');
assert(headerCkb === 'دووشەممە، 9ی تشرینی دووەم 2026', `Kurdish header: expected 'دووشەممە، 9ی تشرینی دووەم 2026', got '${headerCkb}'`);

// 12. Short Weekday Names (abbr3 and abbr1)
console.log('Testing Short Weekday Names...');
// Day 1 = Monday
assertDeepEqual(getShortWeekdayName(1, 'en'), { abbr3: 'Mon', abbr1: 'M' }, 'Mon en');
assertDeepEqual(getShortWeekdayName(1, 'ar'), { abbr3: 'إثن', abbr1: 'ن' }, 'Mon ar');
assertDeepEqual(getShortWeekdayName(1, 'ckb'), { abbr3: 'دوو', abbr1: 'د' }, 'Mon ckb');

// Day 5 = Friday
assertDeepEqual(getShortWeekdayName(5, 'en'), { abbr3: 'Fri', abbr1: 'F' }, 'Fri en');
assertDeepEqual(getShortWeekdayName(5, 'ar'), { abbr3: 'جمع', abbr1: 'ج' }, 'Fri ar');
assertDeepEqual(getShortWeekdayName(5, 'ckb'), { abbr3: 'هەی', abbr1: 'ه' }, 'Fri ckb');

// Day 6 = Saturday
assertDeepEqual(getShortWeekdayName(6, 'en'), { abbr3: 'Sat', abbr1: 'S' }, 'Sat en');
assertDeepEqual(getShortWeekdayName(6, 'ar'), { abbr3: 'سبت', abbr1: 'س' }, 'Sat ar');
assertDeepEqual(getShortWeekdayName(6, 'ckb'), { abbr3: 'شەم', abbr1: 'ش' }, 'Sat ckb');

console.log('All weekStripCore unit tests passed successfully!');
