import { WorkoutEntry } from '../types';
import {
  formatStepCaloriePill,
  resolveStepCalories,
  StepCaloriePillData,
} from '../services/stepTrackingCore';

export interface StepTelemetrySummary {
  steps: number;
  stepGoal: number;
  completionPercent: number;
  progressRatio: number;
  isGoalMet: boolean;
  burnedKcal: number;
  pillData: StepCaloriePillData;
}

export interface WorkoutTelemetrySummary {
  count: number;
  totalCalories: number;
  totalMinutes: number;
  primaryCategoryKey: string | null;
}

/**
 * Pure telemetry calculation for the Active Burn Steps sub-card.
 * Uses total steps for daily step goal progress and net non-workout steps
 * for calorie burn reconciliation with activityBudget.
 * Always computes step calories via resolveStepCalories when stored calories are missing or 0.
 */
export function calculateStepTelemetry(
  totalSteps: number | null | undefined,
  nonWorkoutSteps?: number | null,
  weightKg: number = 70,
  stepGoal: number = 8000,
  t: (key: string) => string = (k) => k,
  storedCaloriesBurned?: number | null,
): StepTelemetrySummary {
  const safeSteps = Math.max(0, Math.round(Number.isFinite(totalSteps) ? (totalSteps as number) : 0));
  const safeGoal = Math.max(1, Math.round(Number.isFinite(stepGoal) && stepGoal > 0 ? stepGoal : 8000));
  const progressRatio = Math.min(1, safeSteps / safeGoal);
  const completionPercent = Math.round((safeSteps / safeGoal) * 100);
  const isGoalMet = safeSteps >= safeGoal;
  const effectiveSteps =
    typeof nonWorkoutSteps === 'number' && Number.isFinite(nonWorkoutSteps)
      ? Math.max(0, Math.round(nonWorkoutSteps))
      : safeSteps;
  const burnedKcal = resolveStepCalories({
    steps: safeSteps,
    nonWorkoutSteps: effectiveSteps,
    weightKg,
    storedCaloriesBurned,
  });
  const basePill = formatStepCaloriePill(effectiveSteps, weightKg, safeGoal, t);
  const pillData: StepCaloriePillData = {
    ...basePill,
    burnedKcal,
    formattedText:
      effectiveSteps === 0
        ? basePill.formattedText
        : `-${burnedKcal} ${t('kcal from steps')}`,
  };

  return {
    steps: safeSteps,
    stepGoal: safeGoal,
    completionPercent,
    progressRatio,
    isGoalMet,
    burnedKcal,
    pillData,
  };
}

/**
 * Pure summary calculation for logged workouts telemetry (count, net kcal, total duration,
 * and dominant category key matching strings.ts capitalization).
 */
export function summarizeWorkoutsTelemetry(
  workouts: WorkoutEntry[] | null | undefined,
  netWorkoutCalories: number
): WorkoutTelemetrySummary {
  const list = Array.isArray(workouts) ? workouts : [];
  if (list.length === 0) {
    return {
      count: 0,
      totalCalories: Math.max(0, Math.round(Number.isFinite(netWorkoutCalories) ? netWorkoutCalories : 0)),
      totalMinutes: 0,
      primaryCategoryKey: null,
    };
  }

  let totalMinutes = 0;
  const categoryDurations: Record<string, number> = {};

  for (const w of list) {
    const mins = Math.max(0, Math.round(Number.isFinite(w.durationMinutes) ? w.durationMinutes : 0));
    totalMinutes += mins;
    if (w.category) {
      const catKey = w.category[0].toUpperCase() + w.category.slice(1);
      categoryDurations[catKey] = (categoryDurations[catKey] || 0) + Math.max(1, mins);
    }
  }

  let primaryCategoryKey: string | null = null;
  let maxScore = -1;
  for (const [cat, score] of Object.entries(categoryDurations)) {
    if (score > maxScore) {
      maxScore = score;
      primaryCategoryKey = cat;
    }
  }

  return {
    count: list.length,
    totalCalories: Math.max(0, Math.round(Number.isFinite(netWorkoutCalories) ? netWorkoutCalories : 0)),
    totalMinutes,
    primaryCategoryKey,
  };
}
