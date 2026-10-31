import { calculateActivityBudget, getDailyEffectiveCalorieTarget } from './activityBudget';
import { getDefaultProfile } from './calculator';
import { DailyLog, UserProfile, WorkoutEntry } from '../types';
import { calculateCalorieRingMetrics } from './calorieRingCalculations';
import { getStreakDayUnit, getStreakAccessibilityLabel } from './streak';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

// 1. Setup profile with adaptive net budgeting
const profile: UserProfile = {
  ...getDefaultProfile(),
  targetCalories: 2394,
  includeWorkoutsInCalorieBudget: true,
  bmr: 1750,
  weightKg: 75,
};

// 2. Setup past day log with workouts and steps
const pastWorkout: WorkoutEntry = {
  id: 'w_past',
  name: 'Morning Run',
  category: 'cardio',
  durationMinutes: 30,
  caloriesBurned: 295,
  calorieSource: 'user_entered',
  loggedAt: '2026-10-25T08:00:00Z',
};
const pastLog: DailyLog = {
  date: '2026-10-25',
  meals: [],
  waterGlasses: 6,
  steps: 8200,
  workouts: [pastWorkout],
};

// 3. Setup today's log with different activity
const todayWorkout: WorkoutEntry = {
  id: 'w_today',
  name: 'Evening Walk',
  category: 'cardio',
  durationMinutes: 60,
  caloriesBurned: 450,
  calorieSource: 'user_entered',
  loggedAt: '2026-10-29T18:00:00Z',
};
const todayLog: DailyLog = {
  date: '2026-10-29',
  meals: [],
  waterGlasses: 8,
  steps: 12500,
  workouts: [todayWorkout],
};

// Compute targets across all screens for the past day
const targetOnTodayScreen = calculateActivityBudget({
  profile,
  workouts: pastLog.workouts || [],
  steps: pastLog.steps || 0,
}).effectiveTarget;

const targetOnInsightsScreen = getDailyEffectiveCalorieTarget(profile, pastLog);
const targetOnDiarySummary = getDailyEffectiveCalorieTarget(profile, pastLog);
const targetOnCoachScreen = getDailyEffectiveCalorieTarget(profile, pastLog);

assert(
  targetOnTodayScreen === targetOnInsightsScreen &&
  targetOnInsightsScreen === targetOnDiarySummary &&
  targetOnDiarySummary === targetOnCoachScreen,
  `Calorie targets mismatch for same day: Today=${targetOnTodayScreen}, Insights=${targetOnInsightsScreen}, Diary=${targetOnDiarySummary}, Coach=${targetOnCoachScreen}`
);

// Verify per-day history uses that day's target, NOT today's target
const todayTarget = getDailyEffectiveCalorieTarget(profile, todayLog);
assert(
  targetOnInsightsScreen !== todayTarget,
  `Historical day target (${targetOnInsightsScreen}) must not equal today's target (${todayTarget}) when activity differs`
);

// Verify fixed model keeps consistent targets across all screens
const fixedProfile: UserProfile = {
  ...profile,
  includeWorkoutsInCalorieBudget: false,
};
assert(
  getDailyEffectiveCalorieTarget(fixedProfile, pastLog) === fixedProfile.targetCalories,
  'Fixed model returns profile targetCalories across all screens'
);

// Verify customNutrientGoals calories override propagates consistently
const customProfile: UserProfile = {
  ...profile,
  includeWorkoutsInCalorieBudget: false,
  customNutrientGoals: { calories: 2500 },
};
assert(
  getDailyEffectiveCalorieTarget(customProfile, pastLog) === 2500,
  'customNutrientGoals.calories overrides target across all screens'
);

// 4. Calorie Ring Remaining vs Over Calculation Tests
// Under budget: eaten 2,000 vs 2,394 target
const underBudget = calculateCalorieRingMetrics(2000, 2394);
assert(underBudget.isOver === false, '2000 vs 2394 is not over budget');
assert(underBudget.remaining === 394, `Expected remaining 394, got ${underBudget.remaining}`);
assert(underBudget.overBy === 0, `Expected overBy 0, got ${underBudget.overBy}`);
assert(underBudget.displayedValue === 394, 'Displayed value should be remaining (394)');
assert(underBudget.displayedLabelKey === 'kcal remaining', 'Label must be kcal remaining');
assert(underBudget.ledgerLabelKey === 'Remaining', 'Ledger label must be Remaining');

// Over budget: eaten 2,695 vs 2,394 target
const overBudget = calculateCalorieRingMetrics(2695, 2394);
assert(overBudget.isOver === true, '2695 vs 2394 is over budget');
assert(overBudget.remaining === 0, 'Remaining calories must be clamped to 0 when over budget');
assert(overBudget.overBy === 301, `Expected overBy 301, got ${overBudget.overBy}`);
assert(overBudget.displayedValue === 301, 'Displayed value must show actual overage (301), NOT 0');
assert(overBudget.displayedLabelKey === 'kcal over budget', 'Label must be kcal over budget');
assert(overBudget.ledgerLabelKey === 'Over', 'Ledger label must be Over');

// Exact budget: eaten 2,394 vs 2,394 target
const exactBudget = calculateCalorieRingMetrics(2394, 2394);
assert(exactBudget.isOver === false, 'Exact budget is not over');
assert(exactBudget.remaining === 0, 'Exact budget remaining is 0');
assert(exactBudget.overBy === 0, 'Exact budget overBy is 0');
assert(exactBudget.displayedValue === 0, 'Exact budget displays 0');

// 5. Streak Pluralization & Multilingual Units Tests
// English
assert(getStreakDayUnit(1, 'en') === 'day', 'en: 1 -> day');
assert(getStreakDayUnit(2, 'en') === 'days', 'en: 2 -> days');
assert(getStreakDayUnit(5, 'en') === 'days', 'en: 5 -> days');
assert(getStreakDayUnit(0, 'en') === 'days', 'en: 0 -> days');
assert(getStreakAccessibilityLabel(1, 'en') === '1 day streak', 'en a11y: 1 day streak');
assert(getStreakAccessibilityLabel(5, 'en') === '5 days streak', 'en a11y: 5 days streak');

// Arabic (singular 'يوم' for 1, 2, 11+; plural 'أيام' for 3-10)
assert(getStreakDayUnit(1, 'ar') === 'يوم', 'ar: 1 -> يوم');
assert(getStreakDayUnit(2, 'ar') === 'يوم', 'ar: 2 -> يوم');
assert(getStreakDayUnit(3, 'ar') === 'أيام', 'ar: 3 -> أيام');
assert(getStreakDayUnit(7, 'ar') === 'أيام', 'ar: 7 -> أيام');
assert(getStreakDayUnit(10, 'ar') === 'أيام', 'ar: 10 -> أيام');
assert(getStreakDayUnit(11, 'ar') === 'يوم', 'ar: 11 -> يوم');
assert(getStreakDayUnit(30, 'ar') === 'يوم', 'ar: 30 -> يوم');
assert(getStreakAccessibilityLabel(1, 'ar') === '1 يوم متتالي', 'ar a11y: 1 يوم متتالي');
assert(getStreakAccessibilityLabel(5, 'ar') === '5 أيام متتالية', 'ar a11y: 5 أيام متتالية');

// Kurdish Sorani (singular 'ڕۆژ' after cardinal numbers)
assert(getStreakDayUnit(1, 'ckb') === 'ڕۆژ', 'ckb: 1 -> ڕۆژ');
assert(getStreakDayUnit(2, 'ckb') === 'ڕۆژ', 'ckb: 2 -> ڕۆژ');
assert(getStreakDayUnit(5, 'ckb') === 'ڕۆژ', 'ckb: 5 -> ڕۆژ');
assert(getStreakDayUnit(20, 'ckb') === 'ڕۆژ', 'ckb: 20 -> ڕۆژ');
assert(getStreakAccessibilityLabel(1, 'ckb') === '1 ڕۆژ لەسەریەک', 'ckb a11y: 1 ڕۆژ لەسەریەک');
assert(getStreakAccessibilityLabel(5, 'ckb') === '5 ڕۆژ لەسەریەک', 'ckb a11y: 5 ڕۆژ لەسەریەک');

console.log('✓ All Calorie Target Consistency & Ring Balance Unit Tests PASSED Cleanly!');
