import { getLocalDateBounds, normalizeStepTotal, syncStepsForDate } from './stepTrackingCore';

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
  console.log('Step tracking service core tests passed.');
}

run().catch((error) => { console.error(error); process.exit(1); });
