import { AllNutrientKey } from './nutrientRegistry';
import { VERIFIED_FOOD_DATABASE } from './foodDatabase';
import { FoodItem } from '../types';
import { FOOD_NUTRIENT_PROFILES_DATA } from './nutrientProfilesData';

export type FoodState =
  | 'raw'
  | 'boiled'
  | 'baked'
  | 'roasted'
  | 'grilled'
  | 'fried'
  | 'steamed'
  | 'canned'
  | 'dried'
  | 'prepared';

export interface FoodNutrientProfile {
  foodId: string;
  foodState: FoodState;
  portionBasis: number; // 100 (standard per 100g/ml)
  sourceId?: string;
  citation?: string;
  isVerified: boolean;
  nutrients: Partial<Record<AllNutrientKey, number>>;
}

function detectFoodState(name: string): FoodState {
  const lower = name.toLowerCase();
  if (/\b(boiled|poached|simmered)\b/.test(lower)) return 'boiled';
  if (/\b(grilled|charbroiled)\b/.test(lower)) return 'grilled';
  if (/\b(fried|deep-fried|pan-fried|crispy)\b/.test(lower)) return 'fried';
  if (/\b(steamed)\b/.test(lower)) return 'steamed';
  if (/\b(roasted)\b/.test(lower)) return 'roasted';
  if (/\b(baked|broiled|toasted)\b/.test(lower)) return 'baked';
  if (/\b(raw|fresh)\b/.test(lower)) return 'raw';
  if (/\b(canned|drained)\b/.test(lower)) return 'canned';
  if (/\b(dried|powder|dry)\b/.test(lower)) return 'dried';
  return 'prepared';
}

function buildProfileFromFoodItem(food: FoodItem): FoodNutrientProfile {
  const grams = food.servingGrams > 0 ? food.servingGrams : 100;
  const factor = 100 / grams;

  const nutrients: Partial<Record<AllNutrientKey, number>> = {
    calories: Math.round(food.calories * factor),
    protein: Math.round(food.protein * factor * 10) / 10,
    carbs: Math.round(food.carbs * factor * 10) / 10,
    fat: Math.round(food.fat * factor * 10) / 10,
  };

  if (food.fiber !== undefined && food.fiber !== null) {
    nutrients.fiber = Math.round(food.fiber * factor * 10) / 10;
  }
  if (food.sugar !== undefined && food.sugar !== null) {
    nutrients.sugar = Math.round(food.sugar * factor * 10) / 10;
  } else if (food.sugars !== undefined && food.sugars !== null) {
    nutrients.sugar = Math.round(food.sugars * factor * 10) / 10;
  }
  if (food.sodium !== undefined && food.sodium !== null) {
    nutrients.sodium = Math.round(food.sodium * factor);
  }
  if (food.calcium !== undefined && food.calcium !== null) {
    nutrients.calcium = Math.round(food.calcium * factor);
  }
  if (food.iron !== undefined && food.iron !== null) {
    nutrients.iron = Math.round(food.iron * factor * 10) / 10;
  }
  if (food.potassium !== undefined && food.potassium !== null) {
    nutrients.potassium = Math.round(food.potassium * factor);
  }
  if (food.vitaminA !== undefined && food.vitaminA !== null) {
    nutrients.vitaminA = Math.round(food.vitaminA * factor);
  }
  if (food.vitaminC !== undefined && food.vitaminC !== null) {
    nutrients.vitaminC = Math.round(food.vitaminC * factor * 10) / 10;
  }
  if (food.vitaminD !== undefined && food.vitaminD !== null) {
    nutrients.vitaminD = Math.round(food.vitaminD * factor * 10) / 10;
  }
  if (food.vitaminB12 !== undefined && food.vitaminB12 !== null) {
    nutrients.vitaminB12 = Math.round(food.vitaminB12 * factor * 10) / 10;
  }
  if (food.magnesium !== undefined && food.magnesium !== null) {
    nutrients.magnesium = Math.round(food.magnesium * factor);
  }
  if (food.zinc !== undefined && food.zinc !== null) {
    nutrients.zinc = Math.round(food.zinc * factor * 10) / 10;
  }

  const isVerified = food.source === 'verified_database' || food.source === 'usda_sr28';
  const citation = food.sourceRef
    ? food.sourceRef.startsWith('USDA')
      ? `${food.sourceRef} (USDA FoodData Central / Standard Reference)`
      : food.sourceRef
    : isVerified
      ? 'Verified Nutritional Database standard profile'
      : undefined;

  return {
    foodId: food.id,
    foodState: detectFoodState(food.name),
    portionBasis: 100,
    sourceId: food.sourceRef,
    citation,
    isVerified,
    nutrients,
  };
}

let _profilesCache: Map<string, FoodNutrientProfile> | null = null;

function initProfilesCache(): Map<string, FoodNutrientProfile> {
  const map = new Map<string, FoodNutrientProfile>();
  if (FOOD_NUTRIENT_PROFILES_DATA) {
    for (const [id, profile] of Object.entries(FOOD_NUTRIENT_PROFILES_DATA)) {
      map.set(id, profile);
    }
  }
  for (const food of VERIFIED_FOOD_DATABASE) {
    if (!map.has(food.id)) {
      map.set(food.id, buildProfileFromFoodItem(food));
    }
  }
  return map;
}

/**
 * Lazily loads and returns the compact per-100g nutrient profile for a given food ID.
 * Returns undefined if the food is not part of the verified catalog.
 */
export function getFoodNutrientProfile(foodId: string): FoodNutrientProfile | undefined {
  if (!_profilesCache) {
    _profilesCache = initProfilesCache();
  }
  return _profilesCache.get(foodId);
}

/**
 * Returns all food nutrient profiles in the lazy table.
 */
export function getAllFoodNutrientProfiles(): Map<string, FoodNutrientProfile> {
  if (!_profilesCache) {
    _profilesCache = initProfilesCache();
  }
  return _profilesCache;
}

/**
 * Computes nutrients for a food item (or foodId) and given gram weight from the compact 100g profile.
 * If gram weight is omitted, uses the food's default serving grams (or 100g).
 */
export function resolveFoodNutrients(
  foodOrId: FoodItem | string,
  grams?: number
): Partial<Record<AllNutrientKey, number>> {
  const foodId = typeof foodOrId === 'string' ? foodOrId : foodOrId.id;
  const profile = getFoodNutrientProfile(foodId);
  const targetGrams =
    typeof grams === 'number' && grams > 0
      ? grams
      : typeof foodOrId !== 'string' && foodOrId.servingGrams > 0
        ? foodOrId.servingGrams
        : 100;

  if (!profile) {
    if (typeof foodOrId === 'string') return {};
    const food = foodOrId;
    // Fall back to flat fields if profile is absent (e.g. ad-hoc custom food)
    const factor = targetGrams / (food.servingGrams || 100);
    const result: Partial<Record<AllNutrientKey, number>> = {
      calories: Math.round(food.calories * factor),
      protein: Math.round(food.protein * factor * 10) / 10,
      carbs: Math.round(food.carbs * factor * 10) / 10,
      fat: Math.round(food.fat * factor * 10) / 10,
    };
    if (food.fiber !== undefined) result.fiber = Math.round(food.fiber * factor * 10) / 10;
    if (food.sugar !== undefined) result.sugar = Math.round(food.sugar * factor * 10) / 10;
    if (food.sodium !== undefined) result.sodium = Math.round(food.sodium * factor);
    if (food.calcium !== undefined) result.calcium = Math.round(food.calcium * factor);
    if (food.iron !== undefined) result.iron = Math.round(food.iron * factor * 10) / 10;
    if (food.potassium !== undefined) result.potassium = Math.round(food.potassium * factor);
    if (food.vitaminA !== undefined) result.vitaminA = Math.round(food.vitaminA * factor);
    if (food.vitaminC !== undefined) result.vitaminC = Math.round(food.vitaminC * factor * 10) / 10;
    if (food.vitaminD !== undefined) result.vitaminD = Math.round(food.vitaminD * factor * 10) / 10;
    if (food.vitaminB12 !== undefined) result.vitaminB12 = Math.round(food.vitaminB12 * factor * 10) / 10;
    if (food.magnesium !== undefined) result.magnesium = Math.round(food.magnesium * factor);
    if (food.zinc !== undefined) result.zinc = Math.round(food.zinc * factor * 10) / 10;
    return result;
  }

  const factor = targetGrams / profile.portionBasis;
  const result: Partial<Record<AllNutrientKey, number>> = {};
  for (const [key, val] of Object.entries(profile.nutrients)) {
    if (typeof val === 'number') {
      result[key as AllNutrientKey] = Math.round(val * factor * 10) / 10;
    }
  }
  return result;
}
