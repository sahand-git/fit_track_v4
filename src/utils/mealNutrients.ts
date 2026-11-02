import { LoggedMeal, FoodItem, MealType } from '../types';
import { AllNutrientKey, ESSENTIAL_NUTRIENT_KEYS } from '../data/nutrientRegistry';
import { getFoodNutrientProfile } from '../data/foodNutrientProfiles';

/**
 * Resolves a specific nutrient amount for a logged meal.
 * Priority order:
 * 1. Direct flat field on the meal (preserves legacy logs and custom flat fields)
 * 2. Explicit snapshot field on meal (custom, AI, and barcode foods)
 * 3. Dynamic resolution from food ID + grams using the compact per-100g nutrient table
 * 4. undefined (never assumes or defaults to 0)
 */
export function resolveMealNutrient(meal: LoggedMeal, key: string): number | undefined {
  if (!meal) return undefined;

  // 1. Direct field on meal (legacy logs or direct macro/micronutrient properties)
  const directVal = (meal as unknown as Record<string, unknown>)[key];
  if (typeof directVal === 'number' && !isNaN(directVal)) {
    return directVal;
  }

  // 2. Snapshot on meal (used for custom, AI photo, and barcode foods)
  if (meal.nutrientsSnapshot) {
    const snapVal = meal.nutrientsSnapshot[key as AllNutrientKey];
    if (typeof snapVal === 'number' && !isNaN(snapVal)) {
      return snapVal;
    }
  }

  // 3. Dynamic resolution from food ID + total consumed grams
  if (meal.foodId) {
    const profile = getFoodNutrientProfile(meal.foodId);
    if (profile?.nutrients) {
      const per100 = profile.nutrients[key as AllNutrientKey];
      if (typeof per100 === 'number' && !isNaN(per100)) {
        const totalGrams =
          meal.servingGrams > 0
            ? meal.servingGrams
            : (meal.servings > 0 ? meal.servings * 100 : 100);
        const calculated = (per100 * totalGrams) / (profile.portionBasis || 100);
        return Math.round(calculated * 10) / 10;
      }
    }
  }

  return undefined;
}

/**
 * Resolves all available nutrients for a meal into a single mapped object.
 */
export function resolveMealNutrients(meal: LoggedMeal): Partial<Record<AllNutrientKey, number>> {
  const result: Partial<Record<AllNutrientKey, number>> = {};
  const allKeys: AllNutrientKey[] = [
    'calories',
    'protein',
    'carbs',
    'fat',
    'fiber',
    'sugar',
    'sodium',
    ...ESSENTIAL_NUTRIENT_KEYS,
  ];

  for (const k of allKeys) {
    const val = resolveMealNutrient(meal, k);
    if (typeof val === 'number') {
      result[k] = val;
    }
  }
  return result;
}

/**
 * Determines whether a food item requires an explicit nutrient snapshot when logged,
 * or whether its micronutrients can be dynamically computed from foodId + grams.
 * Custom foods, AI photo estimations, and barcode foods must snapshot their nutrients.
 */
export function shouldSnapshotFoodNutrients(food: FoodItem): boolean {
  if (!food) return false;
  if (food.source === 'custom') return true;
  if (food.source === 'gemini' || food.source === 'ai_estimated') return true;
  if (food.source === 'open_food_facts' || !!food.barcode) return true;
  // If the food does not have an ID in the verified catalog profiles, it must snapshot
  if (food.id && !getFoodNutrientProfile(food.id)) return true;
  return false;
}

/**
 * Creates a compact LoggedMeal for a food item and selected serving.
 * - For verified catalog foods: avoids copying 30 flat fields; computes from foodId + grams.
 * - For custom, AI, and barcode foods: snapshots all known nutrients.
 */
export function buildLoggedMealFromFood({
  id,
  food,
  mealType,
  servings,
  servingSize,
  servingGrams,
  selectedVariantId,
  variantName,
  timestamp,
}: {
  id: string;
  food: FoodItem;
  mealType: MealType;
  servings: number;
  servingSize: string;
  servingGrams: number;
  selectedVariantId?: string;
  variantName?: string;
  timestamp?: string;
}): LoggedMeal {
  const needsSnapshot = shouldSnapshotFoodNutrients(food);
  const scaleRatio = food.servingGrams > 0 ? servingGrams / food.servingGrams : 1;

  const baseMeal: LoggedMeal = {
    id,
    foodId: food.id,
    name: food.name,
    nameAr: food.nameAr,
    nameCkb: food.nameCkb,
    brand: food.brand,
    category: food.category,
    imageUrl: food.imageUrl,
    mealType,
    servings,
    servingSize,
    servingGrams,
    unit: food.unit,
    calories: Math.round(food.calories * scaleRatio),
    protein: Math.round(food.protein * scaleRatio * 10) / 10,
    carbs: Math.round(food.carbs * scaleRatio * 10) / 10,
    fat: Math.round(food.fat * scaleRatio * 10) / 10,
    barcode: food.barcode,
    source: food.source,
    sourceRef: food.sourceRef,
    isEstimate: food.isEstimate,
    portionUnit: food.portionUnit,
    gramsPerUnit: food.gramsPerUnit,
    ingredients: food.ingredients,
    variants: food.variants,
    selectedVariantId,
    variantName,
    recipeEstimate: food.recipeEstimate,
    timestamp: timestamp || new Date().toISOString(),
  };

  if (needsSnapshot) {
    const snapshot: Partial<Record<AllNutrientKey, number>> = {};
    if (food.fiber !== undefined) snapshot.fiber = Math.round(food.fiber * scaleRatio * 10) / 10;
    if (food.sugar !== undefined) snapshot.sugar = Math.round(food.sugar * scaleRatio * 10) / 10;
    if (food.sodium !== undefined) snapshot.sodium = Math.round(food.sodium * scaleRatio);
    if (food.calcium !== undefined) snapshot.calcium = Math.round(food.calcium * scaleRatio);
    if (food.iron !== undefined) snapshot.iron = Math.round(food.iron * scaleRatio * 10) / 10;
    if (food.potassium !== undefined) snapshot.potassium = Math.round(food.potassium * scaleRatio);
    if (food.vitaminA !== undefined) snapshot.vitaminA = Math.round(food.vitaminA * scaleRatio);
    if (food.vitaminC !== undefined) snapshot.vitaminC = Math.round(food.vitaminC * scaleRatio * 10) / 10;
    if (food.vitaminD !== undefined) snapshot.vitaminD = Math.round(food.vitaminD * scaleRatio * 10) / 10;
    if (food.vitaminB12 !== undefined) snapshot.vitaminB12 = Math.round(food.vitaminB12 * scaleRatio * 10) / 10;
    if (food.magnesium !== undefined) snapshot.magnesium = Math.round(food.magnesium * scaleRatio);
    if (food.zinc !== undefined) snapshot.zinc = Math.round(food.zinc * scaleRatio * 10) / 10;

    baseMeal.nutrientsSnapshot = snapshot;

    // Also populate flat fields for backward compatibility with external integrations
    baseMeal.fiber = snapshot.fiber;
    baseMeal.sugar = snapshot.sugar;
    baseMeal.sodium = snapshot.sodium;
    baseMeal.calcium = snapshot.calcium;
    baseMeal.iron = snapshot.iron;
    baseMeal.potassium = snapshot.potassium;
    baseMeal.vitaminA = snapshot.vitaminA;
    baseMeal.vitaminC = snapshot.vitaminC;
    baseMeal.vitaminD = snapshot.vitaminD;
    baseMeal.vitaminB12 = snapshot.vitaminB12;
    baseMeal.magnesium = snapshot.magnesium;
    baseMeal.zinc = snapshot.zinc;
  }

  return baseMeal;
}
