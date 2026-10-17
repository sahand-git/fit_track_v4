import { LoggedMeal, LoggedDailySupplement, UserProfile } from '../types';
import {
  RDA_TARGETS,
  ORDERED_MICRONUTRIENT_KEYS,
  resolveSupplementNutrientContribution,
} from './micronutrients';

export type SupportedNutrientKey =
  | 'calories'
  | 'protein'
  | 'carbs'
  | 'fat'
  | 'fiber'
  | 'sugar'
  | 'sodium'
  | 'vitaminA'
  | 'vitaminC'
  | 'vitaminD'
  | 'vitaminB12'
  | 'calcium'
  | 'iron'
  | 'potassium'
  | 'magnesium'
  | 'zinc';

export const ORDERED_NUTRIENT_KEYS: SupportedNutrientKey[] = [
  'calories',
  'protein',
  'carbs',
  'fat',
  'fiber',
  'sugar',
  'vitaminA',
  'vitaminC',
  'vitaminD',
  'vitaminB12',
  'calcium',
  'iron',
  'potassium',
  'magnesium',
  'zinc',
  'sodium',
];

export interface NutrientMetadata {
  key: SupportedNutrientKey;
  label: string;
  unit: 'kcal' | 'g' | 'mg' | 'mcg';
  color: string;
  defaultTarget: number;
  description: string;
  foodSources?: string;
}

export interface NutrientContributor {
  id: string;
  name: string;
  mealType?: string;
  amount: number | null;
  unit: string;
  percentage: number;
  isMissing: boolean;
  isSupplement?: boolean;
}

export interface NutrientDayProgress {
  key: SupportedNutrientKey;
  label: string;
  unit: string;
  color: string;
  target: number;
  isCustomTarget: boolean;
  current: number;
  foodAmount: number;
  supplementAmount: number;
  percent: number;
  isIncomplete: boolean;
  missingCount: number;
  totalMealsCount: number;
  contributors: NutrientContributor[];
  missingItems: NutrientContributor[];
  status: 'optimal' | 'good' | 'low' | 'deficient' | 'exceeded';
  foodSources?: string;
}

/**
 * Returns metadata and default target for a nutrient, considering the user's profile.
 */
export function getNutrientMetadata(
  key: SupportedNutrientKey,
  profile?: UserProfile
): NutrientMetadata {
  switch (key) {
    case 'calories':
      return {
        key: 'calories',
        label: 'Calories',
        unit: 'kcal',
        color: '#D97706',
        defaultTarget: profile?.targetCalories ?? 2000,
        description: 'Daily energy intake budget for your body and activity level.',
        foodSources: 'All foods and beverages provide dietary energy.',
      };
    case 'protein':
      return {
        key: 'protein',
        label: 'Protein',
        unit: 'g',
        color: '#2563EB',
        defaultTarget: profile?.targetProtein ?? 150,
        description: 'Crucial for muscle synthesis, recovery, and immune defenses.',
        foodSources: 'Chicken, meat, fish, eggs, lentils, tofu, Greek yogurt.',
      };
    case 'carbs':
      return {
        key: 'carbs',
        label: 'Carbs',
        unit: 'g',
        color: '#F59E0B',
        defaultTarget: profile?.targetCarbs ?? 200,
        description: 'Primary energy source for brain function and muscle glycogen.',
        foodSources: 'Rice, oats, potatoes, whole grains, fruits, vegetables.',
      };
    case 'fat':
      return {
        key: 'fat',
        label: 'Fat',
        unit: 'g',
        color: '#EF4444',
        defaultTarget: profile?.targetFat ?? 65,
        description: 'Essential for hormone production and fat-soluble vitamin absorption.',
        foodSources: 'Olive oil, avocados, nuts, seeds, fatty fish, eggs.',
      };
    case 'fiber':
      return {
        key: 'fiber',
        label: 'Fiber',
        unit: 'g',
        color: '#10B981',
        defaultTarget: 28, // Standard FDA / Dietary Guidelines for 2,000 kcal
        description: 'Promotes gut microbiome health, satiety, and digestive regularity.',
        foodSources: 'Oats, chia seeds, lentils, beans, berries, apples, broccoli.',
      };
    case 'sugar':
      return {
        key: 'sugar',
        label: 'Sugar',
        unit: 'g',
        color: '#EC4899',
        defaultTarget: 50, // Dietary reference upper limit
        description: 'Simple carbohydrates. Monitoring aids insulin sensitivity and steady energy.',
        foodSources: 'Fruits, dairy, honey, dried fruit, natural sweeteners.',
      };
    case 'sodium':
      return {
        key: 'sodium',
        label: 'Sodium',
        unit: 'mg',
        color: '#6B7280',
        defaultTarget: 2300, // Dietary Guidelines recommendation
        description: 'Electrolyte regulating fluid balance, nerve signals, and muscle contraction.',
        foodSources: 'Table salt, olives, cured meats, cheeses, savory broths.',
      };
    default: {
      // 9 Micronutrients from RDA_TARGETS
      const rda = RDA_TARGETS[key as keyof typeof RDA_TARGETS];
      if (rda) {
        return {
          key,
          label: rda.label,
          unit: rda.unit,
          color: rda.color,
          defaultTarget: rda.target,
          description: `Recommended Dietary Allowance (RDA) established by dietary health authorities.`,
          foodSources: rda.foodSources,
        };
      }
      return {
        key,
        label: key,
        unit: 'g',
        color: '#10B981',
        defaultTarget: 100,
        description: '',
      };
    }
  }
}

/**
 * Returns formatted string for a nutrient amount or localized 'Not available' when missing.
 * Rule: NEVER return '0' or '0g' if the food actually lacks data (is undefined/null).
 */
export function formattedNutrientValue(
  value: number | undefined | null,
  unit: string,
  t: (key: string) => string = (k) => k
): string {
  if (value === undefined || value === null || (typeof value === 'number' && isNaN(value))) {
    return t('Not available');
  }
  const rounded = Math.round(value * 10) / 10;
  return `${rounded} ${unit}`;
}

/**
 * Calculates daily progress for a specified nutrient, aggregating logged meals and supplements,
 * checking data completeness across foods, and returning a ranked list of contributors.
 */
export function calculateNutrientDayProgress(
  nutrientKey: SupportedNutrientKey,
  meals: LoggedMeal[] = [],
  supplements: LoggedDailySupplement[] = [],
  profile?: UserProfile
): NutrientDayProgress {
  const meta = getNutrientMetadata(nutrientKey, profile);
  const customTarget = profile?.customNutrientGoals?.[nutrientKey];
  const target =
    typeof customTarget === 'number' && customTarget > 0 ? customTarget : meta.defaultTarget;
  const isCustomTarget = typeof customTarget === 'number' && customTarget > 0;

  const validMeals = meals || [];
  let foodTotal = 0;
  let missingCount = 0;
  const contributingItems: NutrientContributor[] = [];
  const missingItems: NutrientContributor[] = [];

  for (const meal of validMeals) {
    const rawVal = (meal as unknown as Record<string, unknown>)[nutrientKey];
    const isMissing = rawVal === undefined || rawVal === null || (typeof rawVal === 'number' && isNaN(rawVal));

    if (isMissing) {
      missingCount += 1;
      missingItems.push({
        id: meal.id,
        name: meal.name,
        mealType: meal.mealType,
        amount: null,
        unit: meta.unit,
        percentage: 0,
        isMissing: true,
      });
    } else {
      const numVal = Math.round(Number(rawVal) * 10) / 10;
      foodTotal += numVal;
      if (numVal > 0) {
        contributingItems.push({
          id: meal.id,
          name: meal.name,
          mealType: meal.mealType,
          amount: numVal,
          unit: meta.unit,
          percentage: 0, // filled after total
          isMissing: false,
        });
      }
    }
  }

  // Aggregate supplements if nutrient is a micronutrient
  let supplementTotal = 0;
  if (ORDERED_MICRONUTRIENT_KEYS.includes(nutrientKey as unknown as typeof ORDERED_MICRONUTRIENT_KEYS[number])) {
    for (const supp of supplements || []) {
      if (supp.taken) {
        const contrib = resolveSupplementNutrientContribution(supp);
        if (contrib && contrib.nutrientKey === nutrientKey && contrib.amountInCanonicalUnit > 0) {
          supplementTotal += contrib.amountInCanonicalUnit;
          contributingItems.push({
            id: supp.id,
            name: supp.name,
            mealType: 'supplement',
            amount: contrib.amountInCanonicalUnit,
            unit: meta.unit,
            percentage: 0,
            isMissing: false,
            isSupplement: true,
          });
        }
      }
    }
  }

  foodTotal = Math.round(foodTotal * 10) / 10;
  supplementTotal = Math.round(supplementTotal * 10) / 10;
  const currentTotal = Math.round((foodTotal + supplementTotal) * 10) / 10;

  // Calculate percentages and sort contributors descending
  const contributors = contributingItems
    .map((item) => ({
      ...item,
      percentage:
        currentTotal > 0 && item.amount !== null
          ? Math.round((item.amount / currentTotal) * 100)
          : 0,
    }))
    .sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0));

  const percent = target > 0 ? Math.min(999, Math.round((currentTotal / target) * 100)) : 0;
  const isIncomplete = validMeals.length > 0 && missingCount > 0;

  let status: 'optimal' | 'good' | 'low' | 'deficient' | 'exceeded' = 'deficient';
  if (nutrientKey === 'calories' || nutrientKey === 'sugar' || nutrientKey === 'sodium') {
    if (percent > 115) status = 'exceeded';
    else if (percent >= 80) status = 'optimal';
    else if (percent >= 50) status = 'good';
    else status = 'low';
  } else {
    if (percent >= 100) status = 'optimal';
    else if (percent >= 75) status = 'good';
    else if (percent >= 50) status = 'low';
    else status = 'deficient';
  }

  return {
    key: nutrientKey,
    label: meta.label,
    unit: meta.unit,
    color: meta.color,
    target,
    isCustomTarget,
    current: currentTotal,
    foodAmount: foodTotal,
    supplementAmount: supplementTotal,
    percent,
    isIncomplete,
    missingCount,
    totalMealsCount: validMeals.length,
    contributors,
    missingItems,
    status,
    foodSources: meta.foodSources,
  };
}
