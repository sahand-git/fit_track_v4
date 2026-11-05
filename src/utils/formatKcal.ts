/**
 * Shared formatter for calorie values across the app.
 * Formats rounded calorie numbers with localized 'kcal' unit.
 */
export function formatKcal(
  calories: number | undefined | null,
  t: (key: string) => string = (k) => k
): string {
  if (calories === undefined || calories === null || isNaN(calories)) {
    return `0 ${t('kcal')}`;
  }
  return `${Math.round(calories).toLocaleString('en-US')} ${t('kcal')}`;
}
