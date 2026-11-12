import assert from 'node:assert';
import { calculateStepTelemetry, summarizeWorkoutsTelemetry } from './activeBurnCore';
import { WorkoutEntry } from '../types';

console.log('Starting Active Burn Core Unit Tests...');

// 1. Step telemetry: zero steps
const zeroSteps = calculateStepTelemetry(0, 0, 70, 8000);
assert.strictEqual(zeroSteps.steps, 0);
assert.strictEqual(zeroSteps.completionPercent, 0);
assert.strictEqual(zeroSteps.progressRatio, 0);
assert.strictEqual(zeroSteps.isGoalMet, false);
assert.strictEqual(zeroSteps.burnedKcal, 0);

// 2. Step telemetry: partial progress with workout step deduplication
const midSteps = calculateStepTelemetry(4000, 3000, 70, 8000);
assert.strictEqual(midSteps.steps, 4000);
assert.strictEqual(midSteps.completionPercent, 50);
assert.strictEqual(midSteps.progressRatio, 0.5);
assert.strictEqual(midSteps.isGoalMet, false);
assert.strictEqual(midSteps.burnedKcal, 126, '3000 * 0.042 = 126 kcal');

// 3. Step telemetry: goal exceeded clamps bar ratio at 1 while preserving % > 100
const overSteps = calculateStepTelemetry(10000, 10000, 70, 8000);
assert.strictEqual(overSteps.isGoalMet, true);
assert.strictEqual(overSteps.progressRatio, 1, 'Linear bar ratio clamps at 1');
assert.strictEqual(overSteps.completionPercent, 125, 'Completion percent shows 125%');

// 4. Workouts telemetry: empty
const emptyWorkouts = summarizeWorkoutsTelemetry([], 0);
assert.strictEqual(emptyWorkouts.count, 0);
assert.strictEqual(emptyWorkouts.totalCalories, 0);
assert.strictEqual(emptyWorkouts.totalMinutes, 0);
assert.strictEqual(emptyWorkouts.primaryCategoryKey, null);

// 5. Workouts telemetry: multiple workouts selects dominant category
const workouts: WorkoutEntry[] = [
  { id: 'w1', name: 'Push Day', category: 'strength', durationMinutes: 45, caloriesBurned: 260, loggedAt: '' },
  { id: 'w2', name: 'Cooldown', category: 'cardio', durationMinutes: 15, caloriesBurned: 90, loggedAt: '' },
  { id: 'w3', name: 'Sprints', category: 'hiit', durationMinutes: 10, caloriesBurned: 120, loggedAt: '' },
];
const summary = summarizeWorkoutsTelemetry(workouts, 395);
assert.strictEqual(summary.count, 3);
assert.strictEqual(summary.totalCalories, 395);
assert.strictEqual(summary.totalMinutes, 70);
assert.strictEqual(summary.primaryCategoryKey, 'Strength', 'Longest duration category becomes primary');

assert.strictEqual(
  calculateStepTelemetry(8500, 8500, 75, 10000, undefined, 0).burnedKcal,
  383
);
assert.strictEqual(
  calculateStepTelemetry(8500, 8500, 75, 10000, undefined, undefined).burnedKcal,
  383
);

console.log('✓ All Active Burn Core unit tests passed cleanly!');
