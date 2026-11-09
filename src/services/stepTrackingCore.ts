export const KCAL_PER_STEP_BASE = 0.042; // Standard walking burn: ~0.04 - 0.045 kcal per step at 70kg (~42 kcal per 1,000 steps; ~4 kcal per 100 steps)

/**
 * Estimates calories burned from walking steps based on user body weight.
 * Net Step Formula:
 *   stepCalories = Math.round(safeSteps * KCAL_PER_STEP_BASE * (safeWeight / 70))
 * Standard walking burns ~0.04 to 0.045 kcal per step at 70kg baseline (~42 kcal per 1,000 steps).
 * Scaled linearly with body mass (mechanical work W = m * g * d).
 * In activity budgeting, safeSteps represents non-workout steps (deduplicated
 * against ambulatory workout entries).
 */
export function estimateStepCalories(steps: number, weightKg: number = 70): number {
  const safeSteps = Math.max(0, Number.isFinite(steps) ? steps : 0);
  const safeWeight = Math.max(30, Math.min(300, Number.isFinite(weightKg) ? weightKg : 70));
  return Math.round(safeSteps * KCAL_PER_STEP_BASE * (safeWeight / 70));
}

export interface StepStatisticsProvider {
  readSteps(start: Date, end: Date): Promise<unknown>;
}

export function getLocalDateBounds(date: string, now = new Date()): { start: Date; end: Date } {
  const [year, month, day] = date.split('-').map(Number);
  const start = new Date(year, month - 1, day, 0, 0, 0, 0);
  const end = new Date(year, month - 1, day, 23, 59, 59, 999);
  if (date === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}` && end > now) {
    return { start, end: now };
  }
  return { start, end };
}

export function normalizeStepTotal(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) return Math.round(value);
  if (value && typeof value === 'object' && 'sum' in value) {
    const sum = (value as { sum?: unknown }).sum;
    return typeof sum === 'number' && Number.isFinite(sum) && sum >= 0 ? Math.round(sum) : null;
  }
  return null;
}

/** A provider read replaces the day total; it never increments it, so repeat sync is idempotent. */
export async function syncStepsForDate(
  date: string,
  provider: StepStatisticsProvider,
  saveTotal: (date: string, total: number) => Promise<unknown>,
  now = new Date(),
): Promise<number | null> {
  const { start, end } = getLocalDateBounds(date, now);
  const total = normalizeStepTotal(await provider.readSteps(start, end));
  if (total === null) return null;
  await saveTotal(date, total);
  return total;
}

export interface StepCaloriePillData {
  steps: number;
  burnedKcal: number;
  stepGoal: number;
  isGoalMet: boolean;
  formattedText: string;
  isOfflineOrUnavailable: boolean;
}

/**
 * Pure calculation logic for the Dashboard step-calorie deduction pill.
 * Formats active steps and net calorie burn deduction against the daily calorie budget.
 */
export function formatStepCaloriePill(
  steps: number | null | undefined,
  weightKg: number = 70,
  stepGoal: number = 8000,
  t: (key: string) => string = (k) => k,
  isOffline: boolean = false
): StepCaloriePillData {
  const isOfflineOrUnavailable = isOffline || steps === null || steps === undefined;
  const safeSteps = Math.max(0, Number.isFinite(steps) ? (steps as number) : 0);
  const safeGoal = Math.max(1, Number.isFinite(stepGoal) ? stepGoal : 8000);
  const burnedKcal = estimateStepCalories(safeSteps, weightKg);
  const isGoalMet = safeSteps >= safeGoal;

  let formattedText: string;
  if (isOfflineOrUnavailable && safeSteps === 0) {
    formattedText = t('Steps unavailable offline');
  } else if (safeSteps === 0) {
    formattedText = `0 ${t('steps')} · 0 ${t('kcal')}`;
  } else {
    formattedText = `-${burnedKcal} ${t('kcal from steps')}`;
  }

  return {
    steps: safeSteps,
    burnedKcal,
    stepGoal: safeGoal,
    isGoalMet,
    formattedText,
    isOfflineOrUnavailable,
  };
}
