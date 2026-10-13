import * as HealthKit from '@appeeky/expo-healthkit';
import { getLocalDateBounds, normalizeStepTotal, syncStepsForDate } from './stepTrackingCore';

export function isHealthStepServiceAvailable(): boolean {
  try { return HealthKit.isAvailable(); } catch { return false; }
}

export async function readHealthStepsForDate(date: string): Promise<number | null> {
  if (!isHealthStepServiceAvailable()) return null;
  const { start, end } = getLocalDateBounds(date);
  await HealthKit.requestAuthorization({ toRead: [HealthKit.QuantityType.stepCount] });
  const result = await HealthKit.queryStatistics({
    type: HealthKit.QuantityType.stepCount,
    unit: HealthKit.Unit.count,
    from: start,
    to: end,
    options: HealthKit.StatisticsOption.cumulativeSum,
  });
  return normalizeStepTotal(result);
}

export async function syncHealthStepsForDate(
  date: string,
  saveTotal: (date: string, total: number) => Promise<unknown>,
): Promise<number | null> {
  if (!isHealthStepServiceAvailable()) return null;
  return syncStepsForDate(date, {
    readSteps: async (start, end) => {
      await HealthKit.requestAuthorization({ toRead: [HealthKit.QuantityType.stepCount] });
      return HealthKit.queryStatistics({
        type: HealthKit.QuantityType.stepCount,
        unit: HealthKit.Unit.count,
        from: start,
        to: end,
        options: HealthKit.StatisticsOption.cumulativeSum,
      });
    },
  }, saveTotal);
}
