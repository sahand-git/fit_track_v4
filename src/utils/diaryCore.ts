import { DailyLog, FoodItem, LoggedMeal, MealType, UserProfile } from '../types';
import { ThemeColorKey } from '../theme';
import { getDailyEffectiveCalorieTarget } from './activityBudget';

export const DIARY_MEAL_ORDER: readonly MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'] as const;

export type DiaryMealFilter = 'all' | MealType;

export interface DiaryMealStats {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  count: number;
}

export interface DiaryBudgetSummary {
  consumedCalories: number;
  targetCalories: number;
  remainingCalories: number;
  overCalories: number;
  isOverBudget: boolean;
  progressRatio: number;
  protein: number;
  carbs: number;
  fat: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
  totalCount: number;
  mealStats: Record<MealType, DiaryMealStats>;
}

const createEmptyMealStats = (): DiaryMealStats => ({
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  count: 0,
});

const safePositive = (val: unknown): number => {
  const num = Number(val);
  return Number.isFinite(num) && num > 0 ? num : 0;
};

/**
 * Pure aggregation for the Diary sticky daily budget strip and per-meal pill counters.
 * Uses `getDailyEffectiveCalorieTarget` so active-burn budget rules match TodayScreen.
 */
export function calculateDiaryBudgetSummary(
  profile?: UserProfile | null,
  dayLog?: DailyLog | null,
): DiaryBudgetSummary {
  const meals = Array.isArray(dayLog?.meals) ? dayLog!.meals : [];
  const mealStats: Record<MealType, DiaryMealStats> = {
    breakfast: createEmptyMealStats(),
    lunch: createEmptyMealStats(),
    dinner: createEmptyMealStats(),
    snack: createEmptyMealStats(),
  };

  let rawCalories = 0;
  let rawProtein = 0;
  let rawCarbs = 0;
  let rawFat = 0;

  for (const meal of meals) {
    if (!meal) continue;
    const cal = safePositive(meal.calories);
    const p = safePositive(meal.protein);
    const c = safePositive(meal.carbs);
    const f = safePositive(meal.fat);

    rawCalories += cal;
    rawProtein += p;
    rawCarbs += c;
    rawFat += f;

    const bucket = mealStats[meal.mealType] ? meal.mealType : 'snack';
    mealStats[bucket].calories += cal;
    mealStats[bucket].protein += p;
    mealStats[bucket].carbs += c;
    mealStats[bucket].fat += f;
    mealStats[bucket].count += 1;
  }

  for (const key of DIARY_MEAL_ORDER) {
    mealStats[key].calories = Math.round(mealStats[key].calories);
    mealStats[key].protein = Math.round(mealStats[key].protein);
    mealStats[key].carbs = Math.round(mealStats[key].carbs);
    mealStats[key].fat = Math.round(mealStats[key].fat);
  }

  const consumedCalories = Math.round(rawCalories);
  const targetCalories = Math.max(0, Math.round(getDailyEffectiveCalorieTarget(profile, dayLog)));
  const remainingCalories = Math.max(0, targetCalories - consumedCalories);
  const overCalories = Math.max(0, consumedCalories - targetCalories);
  const isOverBudget = consumedCalories > targetCalories;
  const progressRatio = targetCalories > 0 ? Math.min(1, consumedCalories / targetCalories) : 0;

  return {
    consumedCalories,
    targetCalories,
    remainingCalories,
    overCalories,
    isOverBudget,
    progressRatio,
    protein: Math.round(rawProtein),
    carbs: Math.round(rawCarbs),
    fat: Math.round(rawFat),
    targetProtein: Math.max(0, Math.round(profile?.customNutrientGoals?.protein ?? profile?.targetProtein ?? 0)),
    targetCarbs: Math.max(0, Math.round(profile?.customNutrientGoals?.carbs ?? profile?.targetCarbs ?? 0)),
    targetFat: Math.max(0, Math.round(profile?.customNutrientGoals?.fat ?? profile?.targetFat ?? 0)),
    totalCount: meals.length,
    mealStats,
  };
}

/**
 * Groups logged meals cleanly into per-meal arrays preserving insertion order.
 */
export function groupMealsByType(meals?: LoggedMeal[] | null): Record<MealType, LoggedMeal[]> {
  const grouped: Record<MealType, LoggedMeal[]> = {
    breakfast: [],
    lunch: [],
    dinner: [],
    snack: [],
  };
  if (!Array.isArray(meals)) return grouped;

  for (const meal of meals) {
    if (!meal) continue;
    const bucket = grouped[meal.mealType] ? meal.mealType : 'snack';
    grouped[bucket].push(meal);
  }
  return grouped;
}

/**
 * Calculates scroll target Y so scrolling to a meal section clears the floating sticky header cleanly.
 */
export function computeHeaderClearanceOffset(
  sectionY: number,
  stickyHeaderHeight: number,
  topPadding = 10,
): number {
  const safeSectionY = Number.isFinite(sectionY) ? sectionY : 0;
  const safeHeaderH = Number.isFinite(stickyHeaderHeight) ? Math.max(0, stickyHeaderHeight) : 0;
  const safePadding = Number.isFinite(topPadding) ? Math.max(0, topPadding) : 0;
  return Math.max(0, Math.round(safeSectionY - safeHeaderH - safePadding));
}

/**
 * Picks a sensible meal target for floating Quick-Action triggers when filter is 'all'.
 */
export function resolveTargetMealForQuickAction(
  filter: DiaryMealFilter,
  hourOfDay: number = new Date().getHours(),
): MealType {
  if (filter !== 'all') return filter;
  if (hourOfDay < 11) return 'breakfast';
  if (hourOfDay < 16) return 'lunch';
  if (hourOfDay < 21) return 'dinner';
  return 'snack';
}

const MEAL_ACCENT_MAP: Record<MealType, { accentKey: ThemeColorKey; tintKey: ThemeColorKey }> = {
  breakfast: { accentKey: 'amber', tintKey: 'diaryMealBreakfastTint' },
  lunch: { accentKey: 'emerald', tintKey: 'diaryMealLunchTint' },
  dinner: { accentKey: 'nutrientMagnesium', tintKey: 'diaryMealDinnerTint' },
  snack: { accentKey: 'macroPillFatText', tintKey: 'diaryMealSnacksTint' },
};

export function getMealAccentThemeKey(mealType: MealType): {
  accentKey: ThemeColorKey;
  tintKey: ThemeColorKey;
} {
  return MEAL_ACCENT_MAP[mealType] || MEAL_ACCENT_MAP.snack;
}

const MEAL_MATCH_KEYWORDS: Record<MealType, readonly string[]> = {
  breakfast: [
    'egg',
    'oat',
    'milk',
    'cheese',
    'labneh',
    'kaymak',
    'bread',
    'samoon',
    'toast',
    'tea',
    'coffee',
    'honey',
    'tahini',
    'makhlama',
    'butter',
  ],
  lunch: [
    'chicken',
    'kebab',
    'dolma',
    'biryani',
    'rice',
    'lentil',
    'soup',
    'falafel',
    'shawarma',
    'tepsi',
    'beef',
    'lamb',
    'fish',
    'salad',
    'quinoa',
    'stew',
  ],
  dinner: [
    'salmon',
    'chicken',
    'kebab',
    'steak',
    'fish',
    'masgouf',
    'soup',
    'salad',
    'tuna',
    'lentil',
    'tikka',
    'lamb',
    'yogurt',
    'rice',
  ],
  snack: [
    'apple',
    'banana',
    'date',
    'almond',
    'walnut',
    'pistachio',
    'yogurt',
    'whey',
    'protein',
    'bar',
    'berry',
    'berries',
    'hummus',
    'orange',
    'chocolate',
  ],
};

function matchesMealKeywords(food: FoodItem, mealType: MealType): boolean {
  const haystack = `${food.name || ''} ${food.category || ''} ${(food.aliases || []).join(' ')}`.toLowerCase();
  const keywords = MEAL_MATCH_KEYWORDS[mealType];
  return keywords.some((kw) => haystack.includes(kw));
}

/**
 * Curates unique quick-log suggestions for a specific meal slot:
 * Favorites -> Recents -> Meal-relevant verified foods -> Remaining catalog fallback.
 */
export function getQuickLogFoodsForMeal(
  mealType: MealType,
  options: {
    favorites?: FoodItem[];
    recent?: FoodItem[];
    catalog?: FoodItem[];
    limit?: number;
  },
): FoodItem[] {
  const limit = Math.max(1, options.limit ?? 10);
  const seenIds = new Set<string>();
  const seenNames = new Set<string>();
  const result: FoodItem[] = [];

  const tryPush = (item?: FoodItem | null) => {
    if (!item || result.length >= limit) return;
    const normName = (item.name || '').trim().toLowerCase();
    if (!item.id && !normName) return;
    if (item.id && seenIds.has(item.id)) return;
    if (normName && seenNames.has(normName)) return;
    if (item.id) seenIds.add(item.id);
    if (normName) seenNames.add(normName);
    result.push(item);
  };

  for (const fav of options.favorites || []) {
    tryPush(fav);
  }
  for (const rec of options.recent || []) {
    tryPush(rec);
  }

  const catalog = options.catalog || [];
  for (const item of catalog) {
    if (result.length >= limit) break;
    if (matchesMealKeywords(item, mealType)) {
      tryPush(item);
    }
  }
  for (const item of catalog) {
    if (result.length >= limit) break;
    tryPush(item);
  }

  return result;
}
