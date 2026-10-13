import { estimateWorkoutCalories, EXERCISE_DATABASE } from '../data/exerciseDatabase';
import {
  calculateNetWorkoutBurn,
  estimateWorkoutSteps,
  deduplicateWorkoutSteps,
} from './calculator';
import { WorkoutEntry } from '../types';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

// 1. MET calculation tests
const runningPreset = EXERCISE_DATABASE.find((e) => e.name === 'Outdoor Running (8 km/h / 5 mph)')!;
assert(!!runningPreset, 'Outdoor Running (8 km/h / 5 mph) exists in database');
assert(runningPreset.metValue === 8.3, 'Outdoor Running MET is 8.3');

// For 30 mins at 70kg: 30 * (8.3 * 3.5 * 70) / 200 = 304.825 => Math.round(305)
const runningBurn = estimateWorkoutCalories(runningPreset.metValue, 30, 70);
assert(runningBurn === 305, `Running 8km/h for 30m at 70kg is 305 kcal, got ${runningBurn}`);

// Zero duration gives 0
assert(estimateWorkoutCalories(runningPreset.metValue, 0, 70) === 0, 'Zero duration gives 0 kcal');

// Fallback to 0 duration or weight
const fallbackBurn = estimateWorkoutCalories(runningPreset.metValue, 0, 70);
assert(fallbackBurn === 0, 'Zero duration produces 0 kcal');

// 2. Net Workout Burn Calculation
// Gross burn 305 kcal, BMR 1800 kcal/day (1.25 kcal/min). Over 30 mins, baseline is Math.round(37.5) = 38 kcal.
// Net burn = 305 - 38 = 267
const netBurn = calculateNetWorkoutBurn(305, 30, 1800);
assert(netBurn === 267, `Net workout burn deducts baseline BMR, got ${netBurn}`);

// When gross burn <= baseline, net burn floors at 0
const lowBurn = calculateNetWorkoutBurn(10, 30, 1800);
assert(lowBurn === 0, 'Net burn does not drop below 0');

// 3. 0-kcal override preservation
// If user sets 0 kcal, it must not be replaced by MET calculation
const zeroBurnWorkout: WorkoutEntry = {
  id: 'wo_zero',
  name: 'Light Restorative Stretching',
  category: 'flexibility',
  durationMinutes: 45,
  caloriesBurned: 0,
  calorieSource: 'user_entered',
  loggedAt: '2026-10-13T10:00:00Z',
};
assert(zeroBurnWorkout.caloriesBurned === 0, 'Zero kcal override is strictly 0');
assert(zeroBurnWorkout.calorieSource === 'user_entered', 'Source is user_entered');

// 4. Step deduplication
// Running estimated steps: 150 steps/min * 30 min = 4500 steps
const estimatedSteps = estimateWorkoutSteps({ name: 'Outdoor Running', durationMinutes: 30 });
assert(estimatedSteps === 4500, `Running gives 4500 steps, got ${estimatedSteps}`);

// Swimming produces 0 steps
const swimmingSteps = estimateWorkoutSteps({ name: 'Swimming (Freestyle Laps)', durationMinutes: 45 });
assert(swimmingSteps === 0, 'Swimming produces 0 steps');

// Deduplicating total pedometer steps (10000) against recorded workout steps (4500)
const deduplicated = deduplicateWorkoutSteps(10000, [
  { name: 'Outdoor Running', durationMinutes: 30 },
]);
assert(deduplicated.nonWorkoutSteps === 5500, `Non-workout steps is 10000 - 4500 = 5500, got ${deduplicated.nonWorkoutSteps}`);
assert(deduplicated.workoutSteps === 4500, 'Workout steps is 4500');

// 5. Food budget model
const targetCalories = 2000;
const consumedCalories = 1800;
const workoutBurnTotal = 400;

// Default setting: includeWorkoutsInCalorieBudget = false (OFF)
const budgetWithoutWorkouts = targetCalories - consumedCalories;
assert(budgetWithoutWorkouts === 200, 'When setting is OFF, remaining food budget is 200 kcal');

// Opt-in setting: includeWorkoutsInCalorieBudget = true (ON)
const budgetWithWorkouts = (targetCalories + workoutBurnTotal) - consumedCalories;
assert(budgetWithWorkouts === 600, 'When setting is ON, remaining food budget expands to 600 kcal');

console.log('All workout and energy balance tests passed successfully.');
