const MIN_CALORIE_RING_SIZE = 172;
const MAX_CALORIE_RING_SIZE = 280;
const DEFAULT_CALORIE_RING_SIZE = 200;

export const WEB_APP_MAX_WIDTH = 480;

export function getResponsiveAppWidth(windowWidth: number, isWebPlatform: boolean): number {
  if (!isWebPlatform || !Number.isFinite(windowWidth) || windowWidth <= 0) {
    return windowWidth;
  }
  return Math.min(windowWidth, WEB_APP_MAX_WIDTH);
}

export function getCalorieRingSize(availableWidth: number): number {
  if (!Number.isFinite(availableWidth) || availableWidth <= 0) {
    return DEFAULT_CALORIE_RING_SIZE;
  }

  return Math.round(
    Math.min(MAX_CALORIE_RING_SIZE, Math.max(MIN_CALORIE_RING_SIZE, availableWidth * 0.72))
  );
}
