import { calculateLoggingStreak, hasActivityOnDate, getPreviousDayString } from './streak';
import { DailyLog, WeightEntry, LoggedMeal } from '../types';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

// 1. Activity detection on date
const dummyMeal: LoggedMeal = {
  id: 'm1',
  foodId: 'f1',
  name: 'Egg',
  mealType: 'breakfast',
  servings: 1,
  servingSize: '1 egg',
  servingGrams: 50,
  calories: 72,
  protein: 6,
  carbs: 0.4,
  fat: 5,
  timestamp: '2026-10-13T08:00:00Z',
};

const activeLog: DailyLog = {
  date: '2026-10-13',
  waterGlasses: 2,
  steps: 5000,
  meals: [dummyMeal],
};

const emptyLog: DailyLog = {
  date: '2026-10-13',
  waterGlasses: 0,
  steps: 0,
  meals: [],
};

const dummyWeight: WeightEntry = {
  id: 'w1',
  date: '2026-10-12',
  weightKg: 75.5,
  timestamp: '2026-10-12T08:00:00Z',
};

assert(hasActivityOnDate('2026-10-13', { '2026-10-13': activeLog }, []), 'Log with meals has activity');
assert(!hasActivityOnDate('2026-10-13', { '2026-10-13': emptyLog }, []), 'Log with no meals and no weights has no activity');
assert(hasActivityOnDate('2026-10-12', {}, [dummyWeight]), 'Weight entry on date has activity');

// 2. Previous day helper
assert(getPreviousDayString('2026-10-13') === '2026-10-12', 'Yesterday calculation is correct');
assert(getPreviousDayString('2026-03-01') === '2026-02-28', 'Leap/month boundary transition is correct');
assert(getPreviousDayString('2026-01-01') === '2025-12-31', 'Year boundary transition is correct');

// 3. Consecutive logging streak with today active
const today = '2026-10-13';
const yesterday = '2026-10-12';
const twoDaysAgo = '2026-10-11';
const threeDaysAgo = '2026-10-10';

const logsMapActiveToday: Record<string, DailyLog> = {
  [today]: { date: today, waterGlasses: 4, steps: 5000, meals: [dummyMeal] },
  [yesterday]: { date: yesterday, waterGlasses: 5, steps: 5000, meals: [dummyMeal] },
  [twoDaysAgo]: { date: twoDaysAgo, waterGlasses: 6, steps: 5000, meals: [dummyMeal] },
};

const streakToday = calculateLoggingStreak(logsMapActiveToday, [], today);
assert(streakToday.currentStreak === 3, `Expected streak 3, got ${streakToday.currentStreak}`);
assert(streakToday.loggedToday === true, 'loggedToday is true');

// 4. Yesterday fallback: today has no activity yet (e.g. morning), yesterday was active
const logsMapMorningToday: Record<string, DailyLog> = {
  [today]: { date: today, waterGlasses: 0, steps: 0, meals: [] },
  [yesterday]: { date: yesterday, waterGlasses: 5, steps: 5000, meals: [dummyMeal] },
  [twoDaysAgo]: { date: twoDaysAgo, waterGlasses: 6, steps: 5000, meals: [dummyMeal] },
};

const streakMorning = calculateLoggingStreak(logsMapMorningToday, [], today);
assert(streakMorning.currentStreak === 2, `Yesterday fallback preserves streak 2, got ${streakMorning.currentStreak}`);
assert(streakMorning.loggedToday === false, 'loggedToday is false');

// 5. Broken streak: missed yesterday
const logsMapBroken: Record<string, DailyLog> = {
  [today]: { date: today, waterGlasses: 0, steps: 0, meals: [] },
  [yesterday]: { date: yesterday, waterGlasses: 0, steps: 0, meals: [] }, // skipped!
  [twoDaysAgo]: { date: twoDaysAgo, waterGlasses: 6, steps: 5000, meals: [dummyMeal] },
};

const streakBroken = calculateLoggingStreak(logsMapBroken, [], today);
assert(streakBroken.currentStreak === 0, `Missed yesterday resets streak to 0, got ${streakBroken.currentStreak}`);

// 6. Weight logging alone maintains streak
const logsEmpty: Record<string, DailyLog> = {};
const weightsSeries: WeightEntry[] = [
  { id: 'w1', date: today, weightKg: 75.0, timestamp: '2026-10-13T08:00:00Z' },
  { id: 'w2', date: yesterday, weightKg: 75.2, timestamp: '2026-10-12T08:00:00Z' },
];
const streakWeights = calculateLoggingStreak(logsEmpty, weightsSeries, today);
assert(streakWeights.currentStreak === 2, `Weight logs maintain streak of 2, got ${streakWeights.currentStreak}`);

console.log('All streak calculation tests passed successfully.');
