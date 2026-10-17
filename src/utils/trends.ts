export interface CalorieTrendPoint {
  date: string; // YYYY-MM-DD
  calories: number;
  target: number;
  label?: string; // Weekday abbreviation or date
}

export interface WeightTrendPoint {
  date: string; // YYYY-MM-DD
  value: number; // weight in kg
  note?: string;
}

export interface CalorieTrendMetrics {
  coveredDaysCount: number;
  partialDaysCount: number;
  avgCalories: number;
  adherenceRate: number; // Percentage 0 - 100
  daysOnTarget: number;
}

export interface WeightTrendMetrics {
  firstVal: number;
  lastVal: number;
  delta: number;
  minVal: number;
  maxVal: number;
}

export const MIN_LOGGING_COVERAGE_CALORIES = 500;

/**
 * Generates an array of date strings (YYYY-MM-DD) for a given range ending at anchorDate.
 * Sorted chronologically from oldest to newest.
 */
export function generateDateWindow(anchorDate: string, days: number): string[] {
  const list: string[] = [];
  const parts = anchorDate.split('-').map(Number);
  const year = parts[0];
  const month = parts[1] - 1;
  const day = parts[2];
  const anchor = new Date(year, month, day);

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(anchor);
    d.setDate(anchor.getDate() - i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    list.push(`${y}-${m}-${da}`);
  }
  return list;
}

/**
 * Calculates calorie metrics across covered days (>= 500 kcal).
 * Adherence guidance range: 85% to 105% of target budget.
 */
export function calculateCalorieTrendMetrics(points: CalorieTrendPoint[]): CalorieTrendMetrics {
  const covered = points.filter((p) => p.calories >= MIN_LOGGING_COVERAGE_CALORIES);
  const partial = points.filter((p) => p.calories > 0 && p.calories < MIN_LOGGING_COVERAGE_CALORIES);

  const avgCalories = covered.length > 0
    ? Math.round(covered.reduce((sum, p) => sum + p.calories, 0) / covered.length)
    : 0;

  const isAdherent = (cal: number, target: number) => {
    return cal >= Math.max(MIN_LOGGING_COVERAGE_CALORIES, target * 0.85) && cal <= target * 1.05;
  };

  const daysOnTarget = covered.filter((p) => isAdherent(p.calories, p.target)).length;
  const adherenceRate = covered.length > 0
    ? Math.round((daysOnTarget / covered.length) * 100)
    : 0;

  return {
    coveredDaysCount: covered.length,
    partialDaysCount: partial.length,
    avgCalories,
    adherenceRate,
    daysOnTarget,
  };
}

/**
 * Calculates weight progression metrics from the first to the last entry.
 */
export function calculateWeightTrendMetrics(points: WeightTrendPoint[]): WeightTrendMetrics | null {
  if (points.length === 0) return null;

  const values = points.map((p) => p.value);
  const firstVal = values[0];
  const lastVal = values[values.length - 1];
  const delta = Math.round((lastVal - firstVal) * 10) / 10;
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);

  return {
    firstVal,
    lastVal,
    delta,
    minVal,
    maxVal,
  };
}

/**
 * Calculates X coordinate for line chart point, supporting RTL mirroring.
 */
export function getChartXCoordinate(
  index: number,
  totalCount: number,
  width: number,
  paddingX: number,
  isRTL: boolean
): number {
  if (totalCount <= 1) return width / 2;
  const normalX = paddingX + (index / (totalCount - 1)) * (width - paddingX * 2);
  return isRTL ? width - normalX : normalX;
}

/**
 * Calculates X coordinate for bar chart slot, supporting RTL mirroring.
 */
export function getBarXCoordinate(
  index: number,
  totalCount: number,
  width: number,
  paddingX: number,
  barWidth: number,
  isRTL: boolean
): number {
  if (totalCount <= 0) return 0;
  const slotWidth = (width - paddingX * 2) / totalCount;
  const normalX = paddingX + index * slotWidth + (slotWidth - barWidth) / 2;
  return isRTL ? width - normalX - barWidth : normalX;
}

/**
 * Generates a smooth cubic bezier SVG path from a sequence of (x, y) coordinates.
 */
export function buildSmoothSvgPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let pathD = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const cx = (p0.x + p1.x) / 2;
    pathD += ` C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`;
  }
  return pathD;
}
