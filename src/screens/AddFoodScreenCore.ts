import { FoodItem, FoodVariant, LoggedMeal, MealType } from '../types';
import { normalizeSearch } from '../utils/localeUtils';
import { foodCategory, FoodCategory } from '../utils/foodCategories';

export interface SessionMealItem {
  meal: LoggedMeal;
  foodItem: FoodItem;
}

export interface SessionState {
  addedItems: SessionMealItem[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
}

/**
 * Initializes an empty session state.
 */
export function createInitialSessionState(): SessionState {
  return {
    addedItems: [],
    totalCalories: 0,
    totalProtein: 0,
    totalCarbs: 0,
    totalFat: 0,
  };
}

/**
 * Adds a meal item to the session, accumulating total calories and macros.
 */
export function addMealToSession(
  currentState: SessionState,
  meal: LoggedMeal,
  foodItem: FoodItem
): SessionState {
  const newItems = [...currentState.addedItems, { meal, foodItem }];
  return {
    addedItems: newItems,
    totalCalories: Math.round(currentState.totalCalories + (meal.calories || 0)),
    totalProtein: Math.round((currentState.totalProtein + (meal.protein || 0)) * 10) / 10,
    totalCarbs: Math.round((currentState.totalCarbs + (meal.carbs || 0)) * 10) / 10,
    totalFat: Math.round((currentState.totalFat + (meal.fat || 0)) * 10) / 10,
  };
}

/**
 * Undoes the last added meal item from the session.
 * Returns the removed meal ID and the updated session state.
 */
export function undoLastSessionMeal(currentState: SessionState): {
  removedMealId: string | null;
  updatedState: SessionState;
} {
  if (currentState.addedItems.length === 0) {
    return { removedMealId: null, updatedState: currentState };
  }

  const lastIndex = currentState.addedItems.length - 1;
  const removedItem = currentState.addedItems[lastIndex];
  const newItems = currentState.addedItems.slice(0, lastIndex);

  const updatedState: SessionState = {
    addedItems: newItems,
    totalCalories: Math.max(0, Math.round(currentState.totalCalories - (removedItem.meal.calories || 0))),
    totalProtein: Math.max(0, Math.round((currentState.totalProtein - (removedItem.meal.protein || 0)) * 10) / 10),
    totalCarbs: Math.max(0, Math.round((currentState.totalCarbs - (removedItem.meal.carbs || 0)) * 10) / 10),
    totalFat: Math.max(0, Math.round((currentState.totalFat - (removedItem.meal.fat || 0)) * 10) / 10),
  };

  return {
    removedMealId: removedItem.meal.id,
    updatedState,
  };
}

/**
 * Calculates nutritional values for a selected food, optional variant, and servings multiplier.
 */
export function calculatePortionNutrition(
  food: FoodItem,
  variant: FoodVariant | null | undefined,
  servingsCount: number
): {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  displayServing: string;
} {
  const count = Math.max(0.1, Number.isFinite(servingsCount) ? servingsCount : 1);
  const baseCalories = variant ? variant.calories : food.calories;
  const baseProtein = variant ? variant.protein : food.protein;
  const baseCarbs = variant ? variant.carbs : food.carbs;
  const baseFat = variant ? variant.fat : food.fat;

  const rawServing = variant?.servingSize || food.servingSize || '1 serving';
  const displayServing = count === 1 ? rawServing : `${count} × ${rawServing}`;

  return {
    calories: Math.round(baseCalories * count),
    protein: Math.round(baseProtein * count * 10) / 10,
    carbs: Math.round(baseCarbs * count * 10) / 10,
    fat: Math.round(baseFat * count * 10) / 10,
    displayServing,
  };
}

export type FoodFilterType = 'all' | 'recent' | 'frequent' | 'favorites' | 'regional' | 'custom' | 'scanned';

export interface FilterFoodsParams {
  allFoods: FoodItem[];
  recentFoods: FoodItem[];
  frequentFoods: FoodItem[];
  favoriteFoods: FoodItem[];
  customFoods: FoodItem[];
  barcodeCache: FoodItem[];
  searchQuery: string;
  activeFilter: FoodFilterType;
  activeCategory: FoodCategory | 'All';
}

/**
 * Pure filter and ranking function for the food catalog.
 */
export function filterAndRankFoods({
  allFoods,
  recentFoods,
  frequentFoods,
  favoriteFoods,
  customFoods,
  barcodeCache,
  searchQuery,
  activeFilter,
  activeCategory,
}: FilterFoodsParams): FoodItem[] {
  let sourcePool: FoodItem[] = [];

  switch (activeFilter) {
    case 'recent':
      sourcePool = recentFoods;
      break;
    case 'frequent':
      sourcePool = frequentFoods;
      break;
    case 'favorites':
      sourcePool = favoriteFoods;
      break;
    case 'custom':
      sourcePool = customFoods;
      break;
    case 'scanned':
      sourcePool = barcodeCache;
      break;
    case 'regional':
      sourcePool = allFoods.filter((f) => f.source === 'regional_culinary_estimate' || Boolean(f.recipeEstimate));
      break;
    case 'all':
    default:
      sourcePool = allFoods;
      break;
  }

  // Deduplicate by food id
  const seenIds = new Set<string>();
  let deduped = sourcePool.filter((item) => {
    if (!item || !item.id || seenIds.has(item.id)) return false;
    seenIds.add(item.id);
    return true;
  });

  // Filter by category if selected
  if (activeCategory !== 'All') {
    deduped = deduped.filter((item) => {
      const cat = foodCategory(item);
      return cat === activeCategory;
    });
  }

  // Filter and rank by search query
  const trimmed = searchQuery.trim();
  if (!trimmed) {
    return deduped;
  }

  const normalizedQuery = normalizeSearch(trimmed);
  return deduped
    .map((item) => {
      const normalizedName = normalizeSearch(item.name || '');
      const normalizedIngredients = (item.ingredients || []).map((i) => normalizeSearch(i.name)).join(' ');

      let score = 0;
      if (normalizedName === normalizedQuery) score += 100;
      else if (normalizedName.startsWith(normalizedQuery)) score += 60;
      else if (normalizedName.includes(normalizedQuery)) score += 30;

      if (normalizedIngredients.includes(normalizedQuery)) score += 15;

      return { item, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.item);
}

/**
 * Formats meal type label for display.
 */
export function getMealTypeLabel(mealType: MealType): string {
  switch (mealType) {
    case 'breakfast':
      return 'Breakfast';
    case 'lunch':
      return 'Lunch';
    case 'dinner':
      return 'Dinner';
    case 'snack':
      return 'Snack';
    default:
      return 'Meal';
  }
}
