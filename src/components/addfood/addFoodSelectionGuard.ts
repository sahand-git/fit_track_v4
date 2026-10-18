import { FoodItem } from '../../types';

/**
 * Pure guard function to determine if the selected food has changed
 * and requires resetting the variant selection and ingredient view.
 *
 * CRITICAL FIX for infinite re-render loop:
 * When no food is selected (selectedFood is null), selectedFood?.id evaluates to undefined.
 * If compared directly against prevFoodId (which starts as null),
 * `undefined !== null` is ALWAYS true, triggering an infinite render loop in React.
 * Normalizing both values to `string | null` prevents this loop.
 */
export function shouldResetFoodSelection(
  prevFoodId: string | null,
  selectedFood: Pick<FoodItem, 'id'> | null | undefined
): boolean {
  const currentFoodId = selectedFood?.id ?? null;
  return currentFoodId !== prevFoodId;
}

/**
 * Resolves the default variant ID for a food item or null if none exist.
 */
export function resolveSelectedVariantId(
  selectedFood: { variants?: { id: string }[] } | null | undefined
): string | null {
  return selectedFood?.variants?.[0]?.id ?? null;
}
