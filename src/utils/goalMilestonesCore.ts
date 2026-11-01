/**
 * Pure state machine and evaluation logic for daily goal milestones.
 *
 * Requirements:
 * - Calories: reached when |consumed - target| <= max(25 kcal, 0.02 * target).
 *   Status only: neutral statement; never "congratulations" or praise, no confetti.
 * - Steps: reached when steps >= goal. Congratulate ("Goal reached! {steps} / {goal} steps"),
 *   subtle haptic, green checkmark on the Steps card.
 * - Water: reached when water >= target. "Hydration goal reached!".
 * - Milestones are celebrated once per date and persisted in local storage so they do not
 *   repeat when browsing back and forth between days.
 */

export type GoalMilestoneType = 'calories' | 'steps' | 'water';
export type MilestoneStatus = 'under' | 'reached' | 'over';

export interface DayCelebratedMilestones {
  calories?: boolean;
  steps?: boolean;
  water?: boolean;
}

export function getGoalMilestonesStorageKey(date: string): string {
  return `@fittrack_milestones_${date}`;
}

/**
 * Calculates calorie milestone status and allowable tolerance window.
 * Tolerance is max(25 kcal, 2% of calorie target).
 */
export function getCalorieMilestoneStatus(
  consumedCalories: number,
  calorieTarget: number
): { status: MilestoneStatus; tolerance: number; diff: number } {
  if (calorieTarget <= 0) {
    return { status: 'under', tolerance: 25, diff: 0 };
  }
  const tolerance = Math.max(25, Math.round(calorieTarget * 0.02));
  const diff = consumedCalories - calorieTarget;

  if (Math.abs(diff) <= tolerance) {
    return { status: 'reached', tolerance, diff };
  }
  if (diff > tolerance) {
    return { status: 'over', tolerance, diff };
  }
  return { status: 'under', tolerance, diff };
}

/**
 * Evaluates step milestone status.
 */
export function getStepsMilestoneStatus(
  steps: number,
  stepGoal: number
): MilestoneStatus {
  if (stepGoal <= 0 || steps < stepGoal) {
    return 'under';
  }
  return 'reached';
}

/**
 * Evaluates water milestone status.
 */
export function getWaterMilestoneStatus(
  waterGlasses: number,
  waterTargetGlasses: number
): MilestoneStatus {
  if (waterTargetGlasses <= 0 || waterGlasses < waterTargetGlasses) {
    return 'under';
  }
  return 'reached';
}

export interface EvaluateMilestonesParams {
  date: string;
  consumedCalories: number;
  calorieTarget: number;
  steps: number;
  stepGoal: number;
  waterGlasses: number;
  waterTargetGlasses: number;
  celebrated: DayCelebratedMilestones;
}

export interface EvaluateMilestonesResult {
  newlyReached: GoalMilestoneType[];
  updatedCelebrated: DayCelebratedMilestones;
  calorieStatus: MilestoneStatus;
  calorieTolerance: number;
  stepsStatus: MilestoneStatus;
  waterStatus: MilestoneStatus;
}

/**
 * Evaluates all daily milestones against current values and prior celebration history for that date.
 * Returns newly reached milestones that haven't been celebrated yet.
 */
export function evaluateDailyMilestones(
  params: EvaluateMilestonesParams
): EvaluateMilestonesResult {
  const {
    consumedCalories,
    calorieTarget,
    steps,
    stepGoal,
    waterGlasses,
    waterTargetGlasses,
    celebrated,
  } = params;

  const newlyReached: GoalMilestoneType[] = [];
  const updatedCelebrated: DayCelebratedMilestones = { ...celebrated };

  // 1. Calories: strictly neutral, tolerance = max(25, 0.02 * target)
  const { status: calorieStatus, tolerance: calorieTolerance } =
    getCalorieMilestoneStatus(consumedCalories, calorieTarget);
  if (calorieStatus === 'reached' && !celebrated.calories) {
    newlyReached.push('calories');
    updatedCelebrated.calories = true;
  }

  // 2. Steps: steps >= goal
  const stepsStatus = getStepsMilestoneStatus(steps, stepGoal);
  if (stepsStatus === 'reached' && !celebrated.steps) {
    newlyReached.push('steps');
    updatedCelebrated.steps = true;
  }

  // 3. Water: waterGlasses >= waterTargetGlasses
  const waterStatus = getWaterMilestoneStatus(waterGlasses, waterTargetGlasses);
  if (waterStatus === 'reached' && !celebrated.water) {
    newlyReached.push('water');
    updatedCelebrated.water = true;
  }

  return {
    newlyReached,
    updatedCelebrated,
    calorieStatus,
    calorieTolerance,
    stepsStatus,
    waterStatus,
  };
}

export interface MilestoneMessageMeta {
  type: GoalMilestoneType;
  title: string;
  message: string;
  isNeutralStatusOnly: boolean;
}

/**
 * Returns user-facing copy for each milestone.
 */
export function getMilestoneDisplayMessage(
  type: GoalMilestoneType,
  data: {
    steps?: number;
    stepGoal?: number;
    calorieTolerance?: number;
  },
  t: (key: string) => string
): MilestoneMessageMeta {
  switch (type) {
    case 'calories':
      return {
        type: 'calories',
        title: t('Calorie Target Reached'),
        message: t('Your intake is within target tolerance for today.'),
        isNeutralStatusOnly: true,
      };
    case 'steps':
      return {
        type: 'steps',
        title: t('Goal reached!'),
        message: `${t('Goal reached!')} ${(data.steps || 0).toLocaleString()} / ${(data.stepGoal || 0).toLocaleString()} ${t('steps')}`,
        isNeutralStatusOnly: false,
      };
    case 'water':
      return {
        type: 'water',
        title: t('Hydration goal reached!'),
        message: t('Hydration goal reached!'),
        isNeutralStatusOnly: false,
      };
  }
}
