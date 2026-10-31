import { getLocalDateBounds, normalizeStepTotal, syncStepsForDate, estimateStepCalories, KCAL_PER_STEP_BASE } from './stepTrackingCore';

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

  console.log('Step tracking service core tests passed.');
}

run().catch((error) => { console.error(error); process.exit(1); });
