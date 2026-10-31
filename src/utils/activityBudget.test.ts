import { calculateActivityBudget } from './activityBudget';
import { getDefaultProfile } from './calculator';
import { WorkoutEntry } from '../types';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

const profile = { ...getDefaultProfile(), targetCalories: 2000, bmr: 1800, weightKg: 70 };
const running: WorkoutEntry = {
  id: 'run1', name: 'Outdoor Running', category: 'cardio', durationMinutes: 30,
  caloriesBurned: 305, calorieSource: 'met_estimate', loggedAt: '2026-10-13T10:00:00Z',
};

const fixed = calculateActivityBudget({ profile, workouts: [running], steps: 10000 });
assert(fixed.effectiveTarget === 2000, 'fixed model keeps the food target unchanged');
assert(fixed.eligibleActivityCalories === 0, 'fixed model does not add activity calories');

const adaptive = calculateActivityBudget({
  profile: { ...profile, includeWorkoutsInCalorieBudget: true }, workouts: [running], steps: 10000,
});
assert(adaptive.effectiveTarget > 2000, 'adaptive model adds eligible activity');
assert(adaptive.workoutSteps <= 10000, 'workout steps are capped at the daily step total');
assert(adaptive.nonWorkoutSteps === 5500, 'workout steps are subtracted before estimating step calories');
assert(adaptive.workoutCalories < 305, 'workout budget uses net rather than gross calories');

const zero = calculateActivityBudget({
  profile: { ...profile, includeWorkoutsInCalorieBudget: true }, workouts: [], steps: -500,
});
assert(zero.steps === 0 && zero.eligibleActivityCalories === 0, 'negative steps are clamped and do not add activity calories');

const noStepWorkout: WorkoutEntry = {
  ...running, id: 'strength', name: 'Strength Training', category: 'strength',
};
const strength = calculateActivityBudget({
  profile: { ...profile, includeWorkoutsInCalorieBudget: true }, workouts: [noStepWorkout], steps: 5000,
});
assert(strength.workoutSteps === 0, 'non-ambulatory workout steps are not inferred');

// Over budget step and workout reduction test (Base = 1800, Consumed = 2100)
const overBudgetProfile = {
  ...getDefaultProfile(),
  targetCalories: 1800,
  includeWorkoutsInCalorieBudget: true,
  bmr: 1600,
  weightKg: 70,
};
const consumed = 2100;

// Initial state (no activity): base target = 1800, consumed = 2100 -> over by 300
const initialBudget = calculateActivityBudget({
  profile: overBudgetProfile,
  workouts: [],
  steps: 0,
});
assert(initialBudget.baseTarget === 1800, 'Base target is 1800');
assert(initialBudget.effectiveTarget === 1800, 'Initial effective target is 1800');
const initialOver = consumed - initialBudget.effectiveTarget;
assert(initialOver === 300, `Initial over budget must be 300, got ${initialOver}`);

// Burning 100 kcal from steps: 2381 steps * 0.042 = 100 kcal
const stepsBudget = calculateActivityBudget({
  profile: overBudgetProfile,
  workouts: [],
  steps: 2381,
});
assert(stepsBudget.stepCalories === 100, `Step calories must be 100, got ${stepsBudget.stepCalories}`);
assert(stepsBudget.effectiveTarget === 1900, `Effective target must increase to 1900, got ${stepsBudget.effectiveTarget}`);
const stepsOver = consumed - stepsBudget.effectiveTarget;
assert(stepsOver === 200, `Over budget must reduce from 300 to 200, got ${stepsOver}`);

// Burning 200 kcal from workouts + 100 kcal from steps -> Daily Target = 2100, Over = 0
// Workout duration 30m with bmr 1600 -> basal burn = (1600/1440)*30 = 33.3 kcal. Gross 233 kcal -> net 200 kcal
const workout200: WorkoutEntry = {
  id: 'w200', name: 'Cycling', category: 'cardio', durationMinutes: 30,
  caloriesBurned: 233, calorieSource: 'user_entered', loggedAt: '2026-10-31T10:00:00Z',
};
const fullBudget = calculateActivityBudget({
  profile: overBudgetProfile,
  workouts: [workout200],
  steps: 2381,
});
assert(fullBudget.workoutCalories === 200, `Workout calories must be 200, got ${fullBudget.workoutCalories}`);
assert(fullBudget.stepCalories === 100, `Step calories must be 100, got ${fullBudget.stepCalories}`);
assert(fullBudget.effectiveTarget === 2100, `Effective target must increase to 2100, got ${fullBudget.effectiveTarget}`);
const fullOver = Math.max(0, consumed - fullBudget.effectiveTarget);
assert(fullOver === 0, `Over budget must reduce to 0, got ${fullOver}`);

console.log('All activity budget tests passed.');
