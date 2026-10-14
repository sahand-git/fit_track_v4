const MIN_CALORIE_RING_SIZE = 172;
const MAX_CALORIE_RING_SIZE = 280;
const DEFAULT_CALORIE_RING_SIZE = 200;

export function getCalorieRingSize(availableWidth: number): number {
  if (!Number.isFinite(availableWidth) || availableWidth <= 0) {
    return DEFAULT_CALORIE_RING_SIZE;
  }

  return Math.round(
    Math.min(MAX_CALORIE_RING_SIZE, Math.max(MIN_CALORIE_RING_SIZE, availableWidth * 0.72))
  );
}
