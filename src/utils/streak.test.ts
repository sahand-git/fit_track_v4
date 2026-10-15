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

// -------------------------------------------------------------
// CHUNKED STREAK REGRESSION TESTS (Issue 1)
// -------------------------------------------------------------
import { calculateStreakWithChunking } from './streak';

async function runChunkedTests() {
  // Test A: A streak longer than 90 days (120 consecutive days of food logs)
  const full120Logs: Record<string, DailyLog> = {};
  let iterDate = '2026-10-13';
  for (let i = 0; i < 120; i++) {
    full120Logs[iterDate] = {
      date: iterDate,
      waterGlasses: 2,
      steps: 3000,
      meals: [dummyMeal],
    };
    iterDate = getPreviousDayString(iterDate);
  }

  let chunkCalls = 0;
  const mockFetchChunk = async (endDate: string, days: number): Promise<Record<string, DailyLog>> => {
    chunkCalls++;
    const chunk: Record<string, DailyLog> = {};
    let cur = endDate;
    for (let i = 0; i < days; i++) {
      if (full120Logs[cur]) {
        chunk[cur] = full120Logs[cur];
      }
      cur = getPreviousDayString(cur);
    }
    return chunk;
  };

  const res120 = await calculateStreakWithChunking(mockFetchChunk, [], '2026-10-13', 90);
  assert(res120.currentStreak === 120, `Streak longer than 90 days should be 120, got ${res120.currentStreak}`);
  assert(res120.loggedToday === true, 'Logged today is true for 120 days test');
  assert(chunkCalls === 2, `Should fetch exactly 2 chunks for 120 days with chunkSize=90, got ${chunkCalls}`);

  // Test B: Today inactive with an ongoing streak from yesterday (>90 days streak)
  // 95 days active ending on yesterday
  const fullYesterdayLogs: Record<string, DailyLog> = {};
  let curDate = '2026-10-12'; // yesterday
  for (let i = 0; i < 95; i++) {
    fullYesterdayLogs[curDate] = {
      date: curDate,
      waterGlasses: 1,
      steps: 2000,
      meals: [dummyMeal],
    };
    curDate = getPreviousDayString(curDate);
  }

  const mockFetchYesterday = async (endDate: string, days: number): Promise<Record<string, DailyLog>> => {
    const chunk: Record<string, DailyLog> = {};
    let cur = endDate;
    for (let i = 0; i < days; i++) {
      if (fullYesterdayLogs[cur]) {
        chunk[cur] = fullYesterdayLogs[cur];
      }
      cur = getPreviousDayString(cur);
    }
    return chunk;
  };

  const resMorning95 = await calculateStreakWithChunking(mockFetchYesterday, [], '2026-10-13', 90);
  assert(resMorning95.currentStreak === 95, `Yesterday fallback should preserve 95 days streak, got ${resMorning95.currentStreak}`);
  assert(resMorning95.loggedToday === false, 'Logged today should be false for morning test');

  // Test C: An inactive gap correctly stops the streak without over-fetching
  // 15 days active, then 2 days gap, then 100 days active in the past
  const gappedLogs: Record<string, DailyLog> = {};
  let gapIter = '2026-10-13';
  for (let i = 0; i < 15; i++) {
    gappedLogs[gapIter] = { date: gapIter, waterGlasses: 1, steps: 1000, meals: [dummyMeal] };
    gapIter = getPreviousDayString(gapIter);
  }
  // 2 days inactive gap
  gapIter = getPreviousDayString(gapIter);
  gapIter = getPreviousDayString(gapIter);
  // 100 days active in the older past
  for (let i = 0; i < 100; i++) {
    gappedLogs[gapIter] = { date: gapIter, waterGlasses: 1, steps: 1000, meals: [dummyMeal] };
    gapIter = getPreviousDayString(gapIter);
  }

  let gapChunkCount = 0;
  const mockFetchGapped = async (endDate: string, days: number): Promise<Record<string, DailyLog>> => {
    gapChunkCount++;
    const chunk: Record<string, DailyLog> = {};
    let cur = endDate;
    for (let i = 0; i < days; i++) {
      if (gappedLogs[cur]) {
        chunk[cur] = gappedLogs[cur];
      }
      cur = getPreviousDayString(cur);
    }
    return chunk;
  };

  const resGapped = await calculateStreakWithChunking(mockFetchGapped, [], '2026-10-13', 90);
  assert(resGapped.currentStreak === 15, `Streak with gap should stop at 15, got ${resGapped.currentStreak}`);
  assert(gapChunkCount === 1, `Gap within first chunk should never load subsequent chunk, got ${gapChunkCount}`);

  // Test D: Weight entries contributing to streaks (alternating food and weights over 100 days)
  const alternatingLogs: Record<string, DailyLog> = {};
  const alternatingWeights: WeightEntry[] = [];
  let altDate = '2026-10-13';
  for (let i = 0; i < 100; i++) {
    if (i % 2 === 0) {
      alternatingLogs[altDate] = { date: altDate, waterGlasses: 1, steps: 1000, meals: [dummyMeal] };
    } else {
      alternatingWeights.push({ id: `w_${i}`, date: altDate, weightKg: 75.0, timestamp: `${altDate}T08:00:00Z` });
    }
    altDate = getPreviousDayString(altDate);
  }

  const mockFetchAlternating = async (endDate: string, days: number): Promise<Record<string, DailyLog>> => {
    const chunk: Record<string, DailyLog> = {};
    let cur = endDate;
    for (let i = 0; i < days; i++) {
      if (alternatingLogs[cur]) {
        chunk[cur] = alternatingLogs[cur];
      }
      cur = getPreviousDayString(cur);
    }
    return chunk;
  };

  const resAlt = await calculateStreakWithChunking(mockFetchAlternating, alternatingWeights, '2026-10-13', 90);
  assert(resAlt.currentStreak === 100, `Alternating food and weights should maintain streak of 100, got ${resAlt.currentStreak}`);
}

// -------------------------------------------------------------
// WALKBACK STREAK TESTS (Walk back date-by-date and stop at first inactive day)
// -------------------------------------------------------------
import { calculateStreakByWalkback } from './streak';

async function runWalkbackTests() {
  const mockDailyStore: Record<string, DailyLog> = {};
  const fetchedDates: string[] = [];

  // Setup: 5 consecutive days of logs up to today (2026-10-15)
  // 2026-10-15 (active)
  // 2026-10-14 (active)
  // 2026-10-13 (active)
  // 2026-10-12 (active)
  // 2026-10-11 (active)
  // 2026-10-10 (inactive)
  // 2026-10-09 .. 2025-01-01 (100 days of active logs in the past)
  const activeDates = ['2026-10-15', '2026-10-14', '2026-10-13', '2026-10-12', '2026-10-11'];
  for (const d of activeDates) {
    mockDailyStore[d] = { date: d, waterGlasses: 2, steps: 5000, meals: [dummyMeal] };
  }
  // Past logs beyond the gap
  let older = '2026-10-09';
  for (let i = 0; i < 50; i++) {
    mockDailyStore[older] = { date: older, waterGlasses: 2, steps: 5000, meals: [dummyMeal] };
    older = getPreviousDayString(older);
  }

  const mockFetchDayLog = async (date: string): Promise<DailyLog | null> => {
    fetchedDates.push(date);
    return mockDailyStore[date] || null;
  };

  // Test 1: Today active -> streak is 5, stops at 2026-10-10 (first inactive day)
  fetchedDates.length = 0;
  const resActive = await calculateStreakByWalkback(mockFetchDayLog, [], '2026-10-15');
  assert(resActive.currentStreak === 5, `Expected streak 5, got ${resActive.currentStreak}`);
  assert(resActive.loggedToday === true, 'loggedToday should be true');
  // Should have fetched 2026-10-15 down to 2026-10-10 (inactive), exactly 6 dates, and NEVER touched 2026-10-09 or older
  assert(fetchedDates.length === 6, `Expected exactly 6 day fetches, got ${fetchedDates.length}: ${fetchedDates.join(', ')}`);
  assert(fetchedDates.includes('2026-10-10'), 'Should have fetched the inactive boundary day');
  assert(!fetchedDates.includes('2026-10-09'), 'Should NEVER fetch past the first inactive day');

  // Test 2: Today inactive, yesterday active -> streak is 4 (yesterday fallback), stops at 2026-10-10
  fetchedDates.length = 0;
  // Make 2026-10-16 today (inactive)
  const resMorning = await calculateStreakByWalkback(mockFetchDayLog, [], '2026-10-16');
  assert(resMorning.currentStreak === 5, `Expected streak 5 preserved from yesterday, got ${resMorning.currentStreak}`);
  assert(resMorning.loggedToday === false, 'loggedToday should be false');
  // Fetched 2026-10-16 (inactive today), 2026-10-15..11 (active), 2026-10-10 (inactive) -> stops
  assert(!fetchedDates.includes('2026-10-09'), 'Should not fetch past inactive day on morning fallback');

  // Test 3: Today inactive, yesterday inactive -> streak is 0, stops immediately after 2 fetches
  fetchedDates.length = 0;
  // Today is 2026-10-18 (both 18 and 17 have no activity)
  const resZero = await calculateStreakByWalkback(mockFetchDayLog, [], '2026-10-18');
  assert(resZero.currentStreak === 0, `Expected streak 0, got ${resZero.currentStreak}`);
  assert(resZero.loggedToday === false, 'loggedToday is false');
  // Must only fetch 2026-10-18 and 2026-10-17, then STOP!
  assert(fetchedDates.length === 2, `Expected exactly 2 fetches for 0-streak, got ${fetchedDates.length}: ${fetchedDates.join(', ')}`);

  // Test 4: Weight entry counts as activity without needing food meals
  fetchedDates.length = 0;
  const weights: WeightEntry[] = [
    { id: 'w1', date: '2026-10-10', weightKg: 70, timestamp: '2026-10-10T08:00:00Z' },
  ];
  // With weight on 2026-10-10, the streak bridges to 2026-10-09!
  const resWithWeight = await calculateStreakByWalkback(mockFetchDayLog, weights, '2026-10-15');
  assert(resWithWeight.currentStreak > 5, `Streak bridged across weight day: ${resWithWeight.currentStreak}`);
  // Weight day did not even need fetchDayLog because weight dates are checked first
  assert(!fetchedDates.includes('2026-10-10'), 'Weight date should be recognized without querying daily log');
}

Promise.all([runChunkedTests(), runWalkbackTests()]).then(() => {
  console.log('All streak calculation tests passed successfully.');
}).catch((err) => {
  console.error('Streak tests failed:', err);
  process.exit(1);
});

