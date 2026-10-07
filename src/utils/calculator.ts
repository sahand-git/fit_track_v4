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
  const targetCalories = Math.max(minSafe, tdee + goalConfig.calorieDelta);

  const targetProtein = Math.round(weightKg * goalConfig.proteinMultiplier);
  const proteinCalories = targetProtein * 4;

  const fatCalories = targetCalories * 0.28;
  const targetFat = Math.round(fatCalories / 9);

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
  };
}
