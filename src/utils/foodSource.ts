import { FoodItem } from '../types';

/**
 * Returns a human-readable, localized label for a food source.
 * Parity with v2 foodSource.ts.
 */
export function getFoodSourceLabel(
  source?: FoodItem['source'] | string,
  t?: (key: string) => string
): string | null {
  const tr = t || ((s: string) => s);
  switch (source) {
    case 'verified_database':
    case 'usda_sr28':
      return tr('Built-in food reference');
    case 'open_food_facts':
      return tr('Open Food Facts');
    case 'custom':
      return tr('Custom food');
    case 'ai_estimated':
    case 'gemini':
      return tr('AI estimate');
    case 'barcode_cache':
      return tr('Barcode Cache');
    case 'regional_culinary_estimate':
      return tr('Regional Culinary');
    default:
      return null;
  }
}
