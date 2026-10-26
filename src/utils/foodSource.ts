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
    case 'generic_estimate':
      return tr('Generic estimate');
    default:
      return null;
  }
}

export type FoodSourceBadgeType = 'verified' | 'estimate' | 'custom' | 'off';

export interface FoodSourceBadgeInfo {
  label: string;
  type: FoodSourceBadgeType;
  isEstimate: boolean;
}

/**
 * Returns concise badge metadata for display in food rows and details.
 * Flags estimates clearly with distinct badge typing.
 */
export function getFoodSourceBadgeInfo(
  source?: FoodItem['source'] | string,
  sourceRefOrT?: string | ((key: string) => string),
  maybeT?: (key: string) => string
): FoodSourceBadgeInfo | null {
  const sourceRef = typeof sourceRefOrT === 'string' ? sourceRefOrT : undefined;
  const t = typeof sourceRefOrT === 'function' ? sourceRefOrT : maybeT;
  const tr = t || ((s: string) => s);

  switch (source) {
    case 'verified_database':
    case 'usda_sr28':
      // Only show the Verified badge when sourceRef exists
      if (sourceRef !== undefined && (!sourceRef || sourceRef.trim() === '')) {
        return null;
      }
      return { label: tr('Verified'), type: 'verified', isEstimate: false };
    case 'generic_estimate':
      return { label: tr('Estimate'), type: 'estimate', isEstimate: true };
    case 'regional_culinary_estimate':
      return { label: tr('Recipe Estimate'), type: 'estimate', isEstimate: true };
    case 'ai_estimated':
    case 'gemini':
      return { label: tr('AI Estimate'), type: 'estimate', isEstimate: true };
    case 'open_food_facts':
      return { label: tr('Open Food Facts'), type: 'off', isEstimate: false };
    case 'custom':
      return { label: tr('Custom'), type: 'custom', isEstimate: false };
    default:
      return null;
  }
}
