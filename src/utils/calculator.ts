import { Gender, ActivityLevel, FitnessGoal, UserProfile } from '../types';

export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, { label: string; multiplier: number; desc: string }> = {
  sedentary: { label: 'Sedentary', multiplier: 1.2, desc: 'Little to no exercise, desk job' },
  light: { label: 'Lightly Active', multiplier: 1.375, desc: 'Light exercise 1-3 days/week' },
  moderate: { label: 'Moderately Active', multiplier: 1.55, desc: 'Moderate exercise 3-5 days/week' },
  very_active: { label: 'Very Active', multiplier: 1.725, desc: 'Hard exercise 6-7 days/week' },
  athlete: { label: 'Athlete', multiplier: 1.9, desc: 'Very heavy training or physical job' },
};

export const GOAL_ADJUSTMENTS: Record<FitnessGoal, { label: string; calorieDelta: number; desc: string; proteinMultiplier: number }> = {
  fat_loss_aggressive: { label: 'Aggressive Fat Loss', calorieDelta: -500, desc: 'Lose ~0.5kg per week', proteinMultiplier: 2.2 },
  fat_loss_moderate: { label: 'Steady Fat Loss', calorieDelta: -300, desc: 'Lose ~0.3kg per week sustainably', proteinMultiplier: 2.0 },
  maintenance: { label: 'Maintain Weight', calorieDelta: 0, desc: 'Keep weight, recomposition', proteinMultiplier: 1.8 },
  lean_bulk: { label: 'Lean Muscle Bulk', calorieDelta: 250, desc: 'Gain ~0.25kg per week lean', proteinMultiplier: 2.0 },
  muscle_gain: { label: 'Maximum Muscle Growth', calorieDelta: 450, desc: 'Gain strength and mass', proteinMultiplier: 2.2 },
};

export function calculateBMR(gender: Gender, weightKg: number, heightCm: number, age: number): number {
  if (weightKg <= 0 || heightCm <= 0 || age <= 0) return 1700;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  if (gender === 'male') {
    return Math.round(base + 5);
  } else if (gender === 'female') {
    return Math.round(base - 161);
  } else {
    return Math.round(base - 78);
  }
}

export function calculateTDEE(bmr: number, activityLevel: ActivityLevel): number {
  const mult = ACTIVITY_MULTIPLIERS[activityLevel]?.multiplier || 1.375;
  return Math.round(bmr * mult);
}

export function calculateTargets(
  gender: Gender,
  weightKg: number,
  heightCm: number,
  age: number,
  activityLevel: ActivityLevel,
  goal: FitnessGoal
): {
  bmr: number;
  tdee: number;
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
} {
  const bmr = calculateBMR(gender, weightKg, heightCm, age);
  const tdee = calculateTDEE(bmr, activityLevel);
  const goalConfig = GOAL_ADJUSTMENTS[goal] || GOAL_ADJUSTMENTS.maintenance;

  const minSafe = gender === 'female' ? 1200 : 1500;
  let targetCalories = Math.max(minSafe, tdee + goalConfig.calorieDelta);

  const targetProtein = Math.round(weightKg * goalConfig.proteinMultiplier);
  const proteinCalories = targetProtein * 4;

  // Essential dietary fat: at least 0.6g/kg or 28% of target calories
  const minEssentialFat = Math.round(Math.max(30, weightKg * 0.6));
  const fatCalories = Math.max(minEssentialFat * 9, targetCalories * 0.28);
  const targetFat = Math.round(fatCalories / 9);

  // Ensure targetCalories accommodates protein + fat + minimal carbs
  targetCalories = Math.max(targetCalories, proteinCalories + targetFat * 9 + 40);

  const remainingCalories = Math.max(0, targetCalories - proteinCalories - targetFat * 9);
  const targetCarbs = Math.round(remainingCalories / 4);

  return {
    bmr,
    tdee,
    targetCalories,
    targetProtein,
    targetCarbs,
    targetFat,
  };
}

export function getDefaultProfile(): UserProfile {
  const defaults = {
    name: 'Athlete',
    age: 26,
    gender: 'male' as Gender,
    weightKg: 75,
    heightCm: 178,
    activityLevel: 'moderate' as ActivityLevel,
    goal: 'fat_loss_moderate' as FitnessGoal,
    waterTargetGlasses: 8,
  };

  const targets = calculateTargets(
    defaults.gender,
    defaults.weightKg,
    defaults.heightCm,
    defaults.age,
    defaults.activityLevel,
    defaults.goal
  );

  return {
    ...defaults,
    ...targets,
    includeWorkoutsInCalorieBudget: false,
    stepGoal: 8000,
    hasAcceptedMedicalDisclaimer: false,
  };
}

/**
 * Calculates net workout calorie burn above resting metabolic rate.
 * Subtracts the resting calories that would have been burned during the workout duration.
 */
export function calculateNetWorkoutBurn(grossBurn: number, durationMinutes: number, bmr: number): number {
  if (grossBurn <= 0) return 0;
  if (durationMinutes <= 0) return grossBurn;
  const safeBmr = bmr > 0 ? bmr : 1700;
  const restingBurn = Math.round((durationMinutes / 1440) * safeBmr);
  return Math.max(0, grossBurn - restingBurn);
}

/**
 * Estimates steps taken during a workout to prevent double-counting when step tracking is also active.
 * Only step-based ambulatory activities (running, walking, aerobics) accumulate steps.
 */
export function estimateWorkoutSteps(workout: { category?: string; durationMinutes?: number; name?: string }): number {
  const duration = Math.max(0, workout.durationMinutes || 0);
  if (duration === 0) return 0;
  const name = (workout.name || '').toLowerCase();
  const category = (workout.category || '').toLowerCase();

  const nonStepKeywords = [
    'cycl', 'bike', 'spin',
    'swim',
    'row',
    'elliptical',
    'strength', 'weight', 'lifting', 'bench', 'squat', 'deadlift',
    'yoga', 'pilates', 'stretch', 'flexib', 'mobility'
  ];
  if (
    category === 'strength' ||
    category === 'flexibility' ||
    nonStepKeywords.some(k => name.includes(k) || category.includes(k))
  ) {
    return 0;
  }

  if (name.includes('run') || name.includes('jog') || name.includes('sprint')) {
    return Math.round(duration * 150); // ~150 steps/min running cadence
  }
  if (name.includes('walk') || name.includes('hike') || name.includes('treadmill')) {
    return Math.round(duration * 110); // ~110 steps/min walking cadence
  }
  if (name.includes('jump rope') || name.includes('skipping') || name.includes('step aerob') || name.includes('aerobic')) {
    return Math.round(duration * 120);
  }
  if (name.includes('soccer') || name.includes('basketball') || name.includes('tennis')) {
    return Math.round(duration * 100);
  }

  return 0;
}

/**
 * Deduplicates workout steps from total pedometer steps to prevent counting exercise twice.
 */
export function deduplicateWorkoutSteps(
  totalSteps: number,
  workouts: { category?: string; durationMinutes?: number; name?: string }[]
): { workoutSteps: number; nonWorkoutSteps: number } {
  const safeTotal = Math.max(0, totalSteps);
  const workoutSteps = workouts.reduce((sum, w) => sum + estimateWorkoutSteps(w), 0);
  const nonWorkoutSteps = Math.max(0, safeTotal - workoutSteps);
  return {
    workoutSteps: Math.min(safeTotal, workoutSteps),
    nonWorkoutSteps
  };
}
