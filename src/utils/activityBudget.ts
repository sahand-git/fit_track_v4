import { UserProfile, WorkoutEntry } from '../types';
import { calculateNetWorkoutBurn, calculateTargets, deduplicateWorkoutSteps } from './calculator';

const BASELINE_NON_WORKOUT_STEPS = 2500;

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

export function estimateStepCalories(steps: number, weightKg: number): number {
  const safeSteps = Math.max(0, Number.isFinite(steps) ? steps : 0);
  const safeWeight = Math.max(30, Math.min(300, Number.isFinite(weightKg) ? weightKg : 70));
  // Approximation: 0.04 kcal per step at 70 kg. This is an estimate, not a measurement.
  return Math.round(safeSteps * 0.04 * (safeWeight / 70));
}

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
  const stepCalories = estimateStepCalories(
    Math.max(0, deduplicated.nonWorkoutSteps - BASELINE_NON_WORKOUT_STEPS),
    profile.weightKg,
  );
  const fixedTarget = Math.max(0, Math.round(profile.targetCalories || 0));
  const model = profile.includeWorkoutsInCalorieBudget ? 'adaptive_net' : 'fixed';
  // Adaptive target starts from a sedentary baseline, then adds only net logged activity.
  // This prevents activityLevel's multiplier from counting the same activity a second time.
  const baseTarget = model === 'adaptive_net'
    ? calculateTargets(profile.gender, profile.weightKg, profile.heightCm, profile.age, 'sedentary', profile.goal).targetCalories
    : fixedTarget;
  const eligibleActivityCalories = model === 'adaptive_net' ? workoutCalories + stepCalories : 0;
  const effectiveTarget = model === 'adaptive_net'
    ? baseTarget + eligibleActivityCalories
    : fixedTarget;

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
