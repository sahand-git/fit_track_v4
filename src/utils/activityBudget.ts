import { UserProfile, WorkoutEntry } from '../types';
import { calculateNetWorkoutBurn, deduplicateWorkoutSteps } from './calculator';
import { estimateStepCalories } from '../services/stepTrackingCore';

export { estimateStepCalories };

export interface ActivityBudget {
  model: 'fixed' | 'adaptive_net';
  baseTarget: number;
  effectiveTarget: number;
  grossWorkoutCalories: number;
  workoutCalories: number;
  grossStepCalories: number;
  stepCalories: number;
  eligibleActivityCalories: number;
  steps: number;
  workoutSteps: number;
  nonWorkoutSteps: number;
}

/**
 * Net Step Calorie Calculation Formula:
 * 1. Deduplication:
 *    deduplicated = deduplicateWorkoutSteps(dailySteps, workouts)
 *    nonWorkoutSteps = Math.max(0, dailySteps - workoutSteps)
 *    Ambulatory steps taken during logged workouts (running, walking, etc.)
 *    are subtracted from daily steps to avoid double-counting.
 * 2. Net Step Expenditure:
 *    stepCalories = estimateStepCalories(nonWorkoutSteps, weightKg)
 *    = Math.round(nonWorkoutSteps * KCAL_PER_STEP_BASE * (weightKg / 70))
 *    where KCAL_PER_STEP_BASE = 0.042 kcal/step at 70kg baseline (~42 kcal per 1,000 steps).
 * 3. Activity Budget Integration:
 *    When profile.includeWorkoutsInCalorieBudget = true,
 *    eligibleActivityCalories = workoutCalories + stepCalories.
 *    These calories are labeled as estimates in the UI ("Est. active burn").
 */
export function calculateActivityBudget(input: {
  profile: UserProfile;
  workouts: WorkoutEntry[];
  steps: number;
}): ActivityBudget {
  const { profile } = input;
  const steps = Math.max(0, Math.round(Number.isFinite(input.steps) ? input.steps : 0));
  const workouts = Array.isArray(input.workouts) ? input.workouts : [];
  const deduplicated = deduplicateWorkoutSteps(steps, workouts);
  const grossWorkoutCalories = workouts.reduce((sum, w) => sum + Math.max(0, Number(w.caloriesBurned) || 0), 0);
  const workoutCalories = workouts.reduce((sum, w) => sum + calculateNetWorkoutBurn(
    Math.max(0, Number(w.caloriesBurned) || 0),
    Math.max(0, Number(w.durationMinutes) || 0),
    profile.bmr,
  ), 0);
  const grossStepCalories = estimateStepCalories(deduplicated.nonWorkoutSteps, profile.weightKg);
  const stepCalories = grossStepCalories;
  const customCal = profile.customNutrientGoals?.calories;
  const baseTarget = Math.max(0, Math.round(customCal ?? profile.targetCalories ?? 0));
  const model = profile.includeWorkoutsInCalorieBudget ? 'adaptive_net' : 'fixed';
  const eligibleActivityCalories = model === 'adaptive_net' ? workoutCalories + stepCalories : 0;
  const effectiveTarget = baseTarget + eligibleActivityCalories;

  return {
    model,
    baseTarget,
    effectiveTarget,
    grossWorkoutCalories,
    workoutCalories,
    grossStepCalories,
    stepCalories,
    eligibleActivityCalories,
    steps,
    workoutSteps: deduplicated.workoutSteps,
    nonWorkoutSteps: deduplicated.nonWorkoutSteps,
  };
}

/**
 * Single source of truth for resolving the effective daily calorie target.
 * Resolves the exact target for any given day based on that day's workouts, steps,
 * and user profile budgeting model.
 */
export function getDailyEffectiveCalorieTarget(
  profile?: UserProfile | null,
  log?: { workouts?: WorkoutEntry[]; steps?: number } | null
): number {
  if (!profile) return 2000;
  return calculateActivityBudget({
    profile,
    workouts: log?.workouts || [],
    steps: log?.steps || 0,
  }).effectiveTarget;
}
