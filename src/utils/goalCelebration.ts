import { FitnessGoal } from '../types';

export interface GoalCelebrationCriteria {
  goal: FitnessGoal;
  consumedCalories: number;
  consumedProtein: number;
  effectiveCalorieTarget: number;
  targetProtein: number;
}

/**
 * Evaluates whether daily nutrition achieves the goal.
 * Explicitly guards against celebrating exceeding the calorie ceiling for fat-loss or maintenance goals.
 */
export function evaluateGoalAchievement(criteria: GoalCelebrationCriteria): boolean {
  const { goal, consumedCalories, consumedProtein, effectiveCalorieTarget, targetProtein } = criteria;

  if (effectiveCalorieTarget <= 0 || consumedCalories <= 0) {
    return false;
  }

  const isSurplusGoal = goal === 'muscle_gain' || goal === 'lean_bulk';

  if (isSurplusGoal) {
    // Muscle gain and lean bulk require reaching the surplus calorie target
    return consumedCalories >= effectiveCalorieTarget;
  }

  // For fat_loss_aggressive, fat_loss_moderate, and maintenance:
  // Must NOT exceed the calorie ceiling
  if (consumedCalories > effectiveCalorieTarget) {
    return false;
  }

  // Celebrated if within 90%-100% of the calorie budget, OR hit protein target while within budget
  const inCalorieWindow = consumedCalories >= effectiveCalorieTarget * 0.9;
  const metProteinTarget = targetProtein > 0 && consumedProtein >= targetProtein;

  return inCalorieWindow || metProteinTarget;
}
