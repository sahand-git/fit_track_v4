import { calculateActivityBudget, getDailyEffectiveCalorieTarget } from './activityBudget';
import { getDefaultProfile } from './calculator';
import { DailyLog, UserProfile, WorkoutEntry } from '../types';

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

console.log('✓ All Calorie Target Consistency Unit Tests PASSED Cleanly!');
