export interface CalorieRingMetrics {
  remaining: number;
  overBy: number;
  isOver: boolean;
  displayedValue: number;
  displayedLabelKey: 'kcal over budget' | 'kcal remaining';
  ledgerLabelKey: 'Over' | 'Remaining';
}

/**
 * Calculates remaining or over-budget calorie values for the central ring and ledger.
 * - When consumed <= target: isOver is false, remaining = target - consumed, overBy = 0, displayedValue = remaining.
 * - When consumed > target: isOver is true, remaining = 0, overBy = consumed - target, displayedValue = overBy.
 */
export function calculateCalorieRingMetrics(consumed: number, target: number): CalorieRingMetrics {
  const isOver = consumed > target;
  const remaining = Math.max(0, target - consumed);
  const overBy = Math.max(0, consumed - target);
  return {
    remaining,
    overBy,
    isOver,
    displayedValue: isOver ? overBy : remaining,
    displayedLabelKey: isOver ? 'kcal over budget' : 'kcal remaining',
    ledgerLabelKey: isOver ? 'Over' : 'Remaining',
  };
}
