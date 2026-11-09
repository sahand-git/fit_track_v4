import {
  getLocalDateBounds,
  normalizeStepTotal,
  syncStepsForDate,
  estimateStepCalories,
  KCAL_PER_STEP_BASE,
  formatStepCaloriePill,
} from './stepTrackingCore';

function assert(value: boolean, message: string): void { if (!value) throw new Error(message); }

async function run() {
  const now = new Date(2026, 9, 13, 12, 30);
  const today = getLocalDateBounds('2026-10-13', now);
  assert(today.start.getHours() === 0 && today.end.getHours() === 12, 'today query ends at current local time');
  const past = getLocalDateBounds('2026-10-12', now);
  assert(past.end.getHours() === 23, 'past date query covers the full local day');
  assert(normalizeStepTotal({ sum: 1234.4 }) === 1234, 'provider aggregate normalized');
  assert(normalizeStepTotal({ sum: -1 }) === null, 'invalid provider result retained as unavailable');

  let saved = 0;
  let reads = 0;
  const provider = { readSteps: async () => { reads++; return { sum: 3456 }; } };
  await syncStepsForDate('2026-10-13', provider, async (_date, total) => { saved = total; }, now);
  await syncStepsForDate('2026-10-13', provider, async (_date, total) => { saved = total; }, now);
  assert(reads === 2 && saved === 3456, 'repeated provider sync replaces with same total rather than adding');

  const unavailable = await syncStepsForDate('2026-10-13', { readSteps: async () => null }, async () => { throw new Error('must not save'); }, now);
  assert(unavailable === null, 'empty provider result does not mutate saved count');

  // Step-to-calorie conversion tests
  assert(KCAL_PER_STEP_BASE >= 0.04 && KCAL_PER_STEP_BASE <= 0.045, 'KCAL_PER_STEP_BASE must be ~0.04-0.045');
  assert(estimateStepCalories(100, 70) === 4, '100 steps at 70kg burns ~4 kcal (not 100 kcal!)');
  assert(estimateStepCalories(1000, 70) === 42, '1000 steps at 70kg burns ~42 kcal');
  assert(estimateStepCalories(10000, 70) === 420, '10000 steps at 70kg burns ~420 kcal');
  assert(estimateStepCalories(100, 105) === 6, '100 steps for heavier user scales proportionally');
  assert(estimateStepCalories(0, 70) === 0, '0 steps burns 0 kcal');
  assert(estimateStepCalories(-50, 70) === 0, 'Negative steps clamped to 0');

  // Step-Calorie Deduction Pill Pure Logic Tests
  // 1. Zero-step state
  const zeroState = formatStepCaloriePill(0, 70, 8000);
  assert(zeroState.steps === 0, 'Zero steps gives 0 count');
  assert(zeroState.burnedKcal === 0, 'Zero steps gives 0 burned kcal');
  assert(zeroState.isGoalMet === false, 'Zero steps means goal is not met');
  assert(zeroState.isOfflineOrUnavailable === false, 'Explicit 0 is not marked offline');
  assert(zeroState.formattedText.includes('0'), 'Zero state text formatted correctly');

  // 2. Goal-met state
  const goalMetState = formatStepCaloriePill(10000, 70, 8000);
  assert(goalMetState.steps === 10000, 'Goal-met state retains step count');
  assert(goalMetState.burnedKcal === 420, '10,000 steps burned kcal is 420');
  assert(goalMetState.isGoalMet === true, 'Goal is met when steps >= goal');
  assert(goalMetState.formattedText.includes('-420'), 'Formatted deduction shows -420 kcal');

  // Exactly at goal
  const exactGoalState = formatStepCaloriePill(8000, 70, 8000);
  assert(exactGoalState.isGoalMet === true, 'Goal met when steps exactly equals goal');

  // 3. Offline / unavailable state
  const offlineState = formatStepCaloriePill(null, 70, 8000, undefined, true);
  assert(offlineState.isOfflineOrUnavailable === true, 'Offline flag set correctly');
  assert(offlineState.steps === 0, 'Null steps safe fallback to 0');
  assert(offlineState.burnedKcal === 0, 'Null steps burned kcal fallback to 0');
  assert(offlineState.isGoalMet === false, 'Offline fallback isGoalMet is false');
  assert(offlineState.formattedText === 'Steps unavailable offline', 'Offline state shows offline message');

  // Cached steps in offline mode
  const cachedOfflineState = formatStepCaloriePill(5000, 70, 8000, undefined, true);
  assert(cachedOfflineState.isOfflineOrUnavailable === true, 'Cached offline state flagged');
  assert(cachedOfflineState.steps === 5000, 'Cached offline preserves steps');
  assert(cachedOfflineState.burnedKcal === 210, 'Cached offline computes calories');
  assert(cachedOfflineState.isGoalMet === false, '5,000 is below 8,000 goal');

  // 4. Boundary and negative steps clamping
  const negativeState = formatStepCaloriePill(-500, 70, 8000);
  assert(negativeState.steps === 0, 'Negative steps clamped to 0');
  assert(negativeState.burnedKcal === 0, 'Negative steps yields 0 kcal');

  console.log('Step tracking service core tests passed.');
}

run().catch((error) => { console.error(error); process.exit(1); });
