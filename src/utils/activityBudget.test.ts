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

console.log('All activity budget tests passed.');
