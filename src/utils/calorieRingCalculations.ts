export type CalorieSurplusSeverity = 'none' | 'minor' | 'major';

export const MAX_OVERFLOW_SWEEP = 0.82;

export interface CalorieRingMetrics {
  remaining: number;
  overBy: number;
  signedDelta: number;
  isOver: boolean;
  displayedValue: number;
  displayedLabelKey: 'kcal over budget' | 'kcal remaining';
  ledgerLabelKey: 'Over' | 'Remaining';
  baseRatio: number;
  overflowRatio: number;
  visualOverflowRatio: number;
  surplusRatio: number;
  surplusSeverity: CalorieSurplusSeverity;
  surplusColorMix: number;
}

/**
 * Worklet-safe helper deriving the base emerald ring fill ratio [0, 1] from a
 * continuous signed delta (consumed - target).
 */
export function getBaseRingRatioFromSignedDelta(signedDelta: number, target: number): number {
  'worklet';
  if (target <= 0) {
    return signedDelta > 0 ? 1 : 0;
  }
  const consumed = target + signedDelta;
  if (consumed <= 0) return 0;
  if (consumed >= target) return 1;
  return consumed / target;
}

/**
 * Worklet-safe helper deriving the capped visual overflow arc sweep [0, MAX_OVERFLOW_SWEEP]
 * from a continuous signed delta (consumed - target).
 */
export function getVisualOverflowSweep(signedDelta: number, target: number): number {
  'worklet';
  if (signedDelta <= 0) return 0;
  if (target <= 0) return MAX_OVERFLOW_SWEEP;
  const raw = signedDelta / target;
  return raw >= MAX_OVERFLOW_SWEEP ? MAX_OVERFLOW_SWEEP : raw;
}

/**
 * Pure hex color interpolation helper (t in [0, 1]) used to smoothly shift
 * over-limit label colors from minor amber to major crimson.
 */
export function interpolateHexColor(hexA: string, hexB: string, t: number): string {
  const clamped = Math.max(0, Math.min(1, Number.isFinite(t) ? t : 0));
  const parse = (hex: string): [number, number, number] => {
    const clean = hex.trim().replace(/^#/, '');
    const full = clean.length === 3
      ? clean.split('').map((c) => c + c).join('')
      : clean.padEnd(6, '0').slice(0, 6);
    const num = parseInt(full, 16);
    if (Number.isNaN(num)) return [0, 0, 0];
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
  };
  const [r1, g1, b1] = parse(hexA);
  const [r2, g2, b2] = parse(hexB);
  const r = Math.round(r1 + (r2 - r1) * clamped);
  const g = Math.round(g1 + (g2 - g1) * clamped);
  const b = Math.round(b1 + (b2 - b1) * clamped);
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Calculates remaining/over-budget values and progressive arc ratios for CalorieRing.
 * - When consumed <= target: baseRatio in [0, 1], overflowRatio = 0.
 * - When consumed > target: baseRatio = 1 (green ring stays 100% completed),
 *   overflowRatio = min((consumed - target) / target, 1) (clockwise crimson overlay arc),
 *   and surplusSeverity shifts from 'minor' (<10% over) to 'major' (>=10% over).
 */
export function calculateCalorieRingMetrics(consumed: number, target: number): CalorieRingMetrics {
  const safeConsumed = Math.max(0, Number.isFinite(consumed) ? consumed : 0);
  const safeTarget = Math.max(0, Number.isFinite(target) ? target : 0);

  if (safeTarget <= 0) {
    const isOver = safeConsumed > 0;
    return {
      remaining: 0,
      overBy: isOver ? safeConsumed : 0,
      signedDelta: safeConsumed,
      isOver,
      displayedValue: isOver ? safeConsumed : 0,
      displayedLabelKey: isOver ? 'kcal over budget' : 'kcal remaining',
      ledgerLabelKey: isOver ? 'Over' : 'Remaining',
      baseRatio: isOver ? 1 : 0,
      overflowRatio: isOver ? 1 : 0,
      visualOverflowRatio: isOver ? MAX_OVERFLOW_SWEEP : 0,
      surplusRatio: isOver ? 1 : 0,
      surplusSeverity: isOver ? 'major' : 'none',
      surplusColorMix: isOver ? 1 : 0,
    };
  }

  const isOver = safeConsumed > safeTarget;
  const signedDelta = safeConsumed - safeTarget;
  const remaining = Math.max(0, safeTarget - safeConsumed);
  const overBy = Math.max(0, signedDelta);
  const baseRatio = Math.min(safeConsumed / safeTarget, 1);
  const surplusRatio = isOver ? overBy / safeTarget : 0;
  const overflowRatio = isOver ? Math.min(surplusRatio, 1) : 0;
  const visualOverflowRatio = isOver ? Math.min(surplusRatio, MAX_OVERFLOW_SWEEP) : 0;
  const surplusSeverity: CalorieSurplusSeverity = !isOver
    ? 'none'
    : surplusRatio < 0.1
    ? 'minor'
    : 'major';
  const surplusColorMix = !isOver ? 0 : Math.min(surplusRatio / 0.1, 1);

  return {
    remaining,
    overBy,
    signedDelta,
    isOver,
    displayedValue: isOver ? overBy : remaining,
    displayedLabelKey: isOver ? 'kcal over budget' : 'kcal remaining',
    ledgerLabelKey: isOver ? 'Over' : 'Remaining',
    baseRatio,
    overflowRatio,
    visualOverflowRatio,
    surplusRatio,
    surplusSeverity,
    surplusColorMix,
  };
}
