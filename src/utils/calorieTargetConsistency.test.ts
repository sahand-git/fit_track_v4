import { calculateActivityBudget, getDailyEffectiveCalorieTarget } from './activityBudget';
import { getDefaultProfile } from './calculator';
import { DailyLog, UserProfile, WorkoutEntry } from '../types';
import {
  calculateCalorieRingMetrics,
  interpolateHexColor,
  MAX_OVERFLOW_SWEEP,
  getBaseRingRatioFromSignedDelta,
  getVisualOverflowSweep,
} from './calorieRingCalculations';
import { darkTheme } from '../theme';
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

// 6. Over-budget reduction from burned steps and workouts
// User Base Target = 1800, Consumed = 2100 -> initially 300 Over
const obProfile: UserProfile = {
  ...getDefaultProfile(),
  targetCalories: 1800,
  includeWorkoutsInCalorieBudget: true,
  bmr: 1600,
  weightKg: 70,
};
const consumedCalories = 2100;

// State A: 0 steps, 0 workouts -> Target: 1800, Over: 300
const budgetA = calculateActivityBudget({ profile: obProfile, workouts: [], steps: 0 });
const ringA = calculateCalorieRingMetrics(consumedCalories, budgetA.effectiveTarget);
assert(budgetA.effectiveTarget === 1800, 'State A Daily Target is 1800');
assert(ringA.isOver === true && ringA.overBy === 300, 'State A is 300 kcal over budget');

// State B: Burn 100 kcal from steps (2381 steps * 0.042) -> Target: 1900, Over: 200
const budgetB = calculateActivityBudget({ profile: obProfile, workouts: [], steps: 2381 });
const ringB = calculateCalorieRingMetrics(consumedCalories, budgetB.effectiveTarget);
assert(budgetB.stepCalories === 100, 'State B step calories is 100');
assert(budgetB.effectiveTarget === 1900, 'State B Daily Target increases to 1900');
assert(ringB.isOver === true && ringB.overBy === 200, 'State B reduces Over from 300 -> 200');

// State C: Burn additional 200 kcal from workout -> Target: 2100, Over: 0
const cycling200: WorkoutEntry = {
  id: 'c200', name: 'Cycling', category: 'cardio', durationMinutes: 30,
  caloriesBurned: 233, calorieSource: 'user_entered', loggedAt: '2026-10-31T10:00:00Z',
};
const budgetC = calculateActivityBudget({ profile: obProfile, workouts: [cycling200], steps: 2381 });
const ringC = calculateCalorieRingMetrics(consumedCalories, budgetC.effectiveTarget);
assert(budgetC.workoutCalories === 200, 'State C workout calories is 200');
assert(budgetC.effectiveTarget === 2100, 'State C Daily Target increases to 2100');
assert(ringC.isOver === false && ringC.overBy === 0 && ringC.remaining === 0, 'State C reduces Over from 200 -> 0');

// 7. Progressive Calorie Ring Arc Ratios at 0%, 50%, 100%, 104.2%, 105%, 150%, 250%
const arc0 = calculateCalorieRingMetrics(0, 2000);
assert(arc0.baseRatio === 0 && arc0.overflowRatio === 0 && arc0.surplusSeverity === 'none', '0% intake ratios verified');

const arc50 = calculateCalorieRingMetrics(1000, 2000);
assert(arc50.baseRatio === 0.5 && arc50.overflowRatio === 0 && arc50.surplusSeverity === 'none', '50% intake ratios verified');

const arc100 = calculateCalorieRingMetrics(2000, 2000);
assert(arc100.baseRatio === 1 && arc100.overflowRatio === 0 && arc100.surplusSeverity === 'none', '100% intake keeps base at 1 and overflow at 0');

// +100 kcal over 2394 target -> ~4.18% overflow ratio, minor amber severity
const arcMinorPlus100 = calculateCalorieRingMetrics(2494, 2394);
assert(arcMinorPlus100.baseRatio === 1, 'Over-limit keeps base green ring at 100% (1.0)');
assert(Math.abs(arcMinorPlus100.overflowRatio - 100 / 2394) < 0.0001, 'Overflow ratio scales proportionally (+100/2394 ~ 0.0418)');
assert(arcMinorPlus100.surplusSeverity === 'minor', '+100 over 2394 (<10%) has minor surplus severity');

const arc105 = calculateCalorieRingMetrics(2100, 2000);
assert(arc105.baseRatio === 1 && Math.abs(arc105.overflowRatio - 0.05) < 0.0001 && arc105.surplusSeverity === 'minor', '105% intake ratios verified');
assert(Math.abs(arc105.surplusColorMix - 0.5) < 0.0001, '105% intake color mix is halfway between amber and red');

const arc150 = calculateCalorieRingMetrics(3000, 2000);
assert(arc150.baseRatio === 1 && arc150.overflowRatio === 0.5 && arc150.surplusSeverity === 'major' && arc150.surplusColorMix === 1, '150% intake gives 50% red overflow and major severity');

const arc250 = calculateCalorieRingMetrics(5000, 2000);
assert(arc250.baseRatio === 1 && arc250.overflowRatio === 1 && arc250.surplusSeverity === 'major', '250% intake caps overflow arc at 1.0');

const startHex = interpolateHexColor(darkTheme.colors.calorieOverflowAmber, darkTheme.colors.calorieOverflowRed, 0);
const endHex = interpolateHexColor(darkTheme.colors.calorieOverflowAmber, darkTheme.colors.calorieOverflowRed, 1);
const midHex = interpolateHexColor(darkTheme.colors.calorieOverflowAmber, darkTheme.colors.calorieOverflowRed, 0.5);
assert(startHex.toUpperCase() === darkTheme.colors.calorieOverflowAmber.toUpperCase(), 't=0 returns amber hex');
assert(endHex.toUpperCase() === darkTheme.colors.calorieOverflowRed.toUpperCase(), 't=1 returns red hex');
assert(midHex !== startHex && midHex !== endHex, 't=0.5 interpolates between amber and red');

// 8. Continuous signedDelta transitions & capped MAX_OVERFLOW_SWEEP (0.82)
assert(arc50.signedDelta === -1000, '50% intake signedDelta is -1000');
assert(arc50.visualOverflowRatio === 0, 'Under-budget visualOverflowRatio is 0');
assert(arc250.signedDelta === 3000, '250% intake signedDelta is +3000');
assert(
  arc250.visualOverflowRatio === MAX_OVERFLOW_SWEEP,
  `250% intake caps visualOverflowRatio at MAX_OVERFLOW_SWEEP (${MAX_OVERFLOW_SWEEP})`
);
assert(getBaseRingRatioFromSignedDelta(-500, 2000) === 0.75, 'Signed delta -500 / 2000 -> baseRatio 0.75');
assert(getBaseRingRatioFromSignedDelta(0, 2000) === 1, 'Signed delta 0 -> baseRatio 1.0');
assert(getBaseRingRatioFromSignedDelta(2670, 2000) === 1, 'Signed delta +2670 -> baseRatio 1.0');
assert(getVisualOverflowSweep(-212, 2000) === 0, 'Negative signedDelta -> 0 overflow sweep');
assert(getVisualOverflowSweep(0, 2000) === 0, 'Zero signedDelta -> 0 overflow sweep');
assert(getVisualOverflowSweep(500, 2000) === 0.25, '+500 / 2000 -> 0.25 overflow sweep');
assert(getVisualOverflowSweep(3000, 2000) === MAX_OVERFLOW_SWEEP, '+3000 / 2000 -> capped at 0.82');

console.log('✓ All Calorie Target Consistency & Ring Balance Unit Tests PASSED Cleanly!');
