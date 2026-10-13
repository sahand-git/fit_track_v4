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
