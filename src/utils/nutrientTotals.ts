import { LoggedMeal, LoggedDailySupplement, UserProfile } from '../types';
import { resolveMealNutrient } from './mealNutrients';
import {
  RDA_TARGETS,
  ORDERED_MICRONUTRIENT_KEYS,
  resolveSupplementNutrientContribution,
} from './micronutrients';
import {
  getDriTarget,
  evaluateUpperLimit,
  UpperLimitScope,
  DriTargetType,
} from '../data/driTargets';
import type { ThemeColorKey } from '../theme';

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
  colorToken: ThemeColorKey;
  defaultTarget: number;
  targetType?: DriTargetType | 'CDRR' | 'Limit' | string;
  description: string;
  foodSources?: string;
  upperLimit?: number;
  upperLimitScope?: UpperLimitScope;
  upperLimitDescription?: string;
  citation?: string;
  disclaimer?: string;
  isMinor?: boolean;
  minorNotice?: string;
  hasTarget?: boolean;
  noTargetReason?: string;
  isLimitNutrient?: boolean;
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
  colorToken: ThemeColorKey;
  target: number;
  hasTarget: boolean;
  noTargetReason?: string;
  isLimitNutrient?: boolean;
  targetType?: DriTargetType | 'CDRR' | 'Limit' | string;
  isCustomTarget: boolean;
  current: number;
  remaining: number;
  foodAmount: number;
  supplementAmount: number;
  percent: number;
  hasData: boolean;
  isIncomplete: boolean;
  missingCount: number;
  foodsWithDataCount: number;
  totalMealsCount: number;
  dataCompletenessText: string;
  contributors: NutrientContributor[];
  missingItems: NutrientContributor[];
  status: 'optimal' | 'good' | 'low' | 'under' | 'exceeded';
  foodSources?: string;
  upperLimit?: number;
  upperLimitScope?: UpperLimitScope;
  upperLimitDescription?: string;
  upperLimitWarning?: string;
  citation?: string;
  disclaimer?: string;
  isMinor?: boolean;
  minorNotice?: string;
}

/**
 * Returns formatted data completeness string: 'based on N of M logged foods with data'.
 */
export function formatDataCompleteness(
  foodsWithDataCount: number,
  totalFoodsCount: number,
  t: (key: string) => string = (k) => k
): string {
  if (totalFoodsCount === 0) {
    return t('No foods logged today');
  }
  const template = t('based on {n} of {m} logged foods with data');
  if (template && template.includes('{n}') && template.includes('{m}')) {
    return template.replace('{n}', String(foodsWithDataCount)).replace('{m}', String(totalFoodsCount));
  }
  return `based on ${foodsWithDataCount} of ${totalFoodsCount} logged foods with data`;
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
        colorToken: 'amber',
        defaultTarget: profile?.targetCalories ?? 2000,
        description: 'Daily energy intake budget for your body and activity level.',
        foodSources: 'All foods and beverages provide dietary energy.',
      };
    case 'protein':
      return {
        key: 'protein',
        label: 'Protein',
        unit: 'g',
        colorToken: 'blue',
        defaultTarget: profile?.targetProtein ?? 150,
        description: 'Crucial for muscle synthesis, recovery, and immune defenses.',
        foodSources: 'Chicken, meat, fish, eggs, lentils, tofu, Greek yogurt.',
      };
    case 'carbs':
      return {
        key: 'carbs',
        label: 'Carbs',
        unit: 'g',
        colorToken: 'nutrientVitaminA',
        defaultTarget: profile?.targetCarbs ?? 200,
        description: 'Primary energy source for brain function and muscle glycogen.',
        foodSources: 'Rice, oats, potatoes, whole grains, fruits, vegetables.',
      };
    case 'fat':
      return {
        key: 'fat',
        label: 'Fat',
        unit: 'g',
        colorToken: 'crimson',
        defaultTarget: profile?.targetFat ?? 65,
        description: 'Essential for hormone production and fat-soluble vitamin absorption.',
        foodSources: 'Olive oil, avocados, nuts, seeds, fatty fish, eggs.',
      };
    case 'fiber': {
      const dri = getDriTarget('fiber', profile?.age, profile?.gender);
      return {
        key: 'fiber',
        label: 'Fiber',
        unit: 'g',
        colorToken: 'emerald',
        defaultTarget: 28, // Standard FDA / Dietary Guidelines reference for 2,000 kcal
        targetType: 'AI',
        description: 'Promotes gut microbiome health, satiety, and digestive regularity.',
        foodSources: 'Oats, chia seeds, lentils, beans, berries, apples, broccoli.',
        citation: dri.citation,
        disclaimer: dri.disclaimer,
        isMinor: !dri.isAdult,
        minorNotice: !dri.isAdult ? dri.disclaimer : undefined,
      };
    }
    case 'sugar': {
      const isMinor = typeof profile?.age === 'number' && !isNaN(profile.age) && profile.age < 19;
      return {
        key: 'sugar',
        label: 'Sugar',
        unit: 'g',
        colorToken: 'nutrientSugar',
        defaultTarget: 50, // Dietary reference upper limit
        targetType: 'Limit',
        isLimitNutrient: true,
        description: 'Simple carbohydrates. Monitoring aids insulin sensitivity and steady energy.',
        foodSources: 'Fruits, dairy, honey, dried fruit, natural sweeteners.',
        upperLimit: 50,
        upperLimitScope: 'all_sources',
        isMinor,
        minorNotice: isMinor ? 'Dietary reference guidance for minors (<19) not displayed.' : undefined,
      };
    }
    case 'sodium': {
      const dri = getDriTarget('sodium', profile?.age, profile?.gender);
      return {
        key: 'sodium',
        label: 'Sodium',
        unit: 'mg',
        colorToken: 'nutrientSodium',
        defaultTarget: dri.upperLimit ?? 2300,
        targetType: 'CDRR',
        isLimitNutrient: true,
        description: 'Electrolyte regulating fluid balance, nerve signals, and muscle contraction.',
        foodSources: 'Table salt, olives, cured meats, cheeses, savory broths.',
        upperLimit: dri.upperLimit ?? 2300,
        upperLimitScope: dri.upperLimitScope ?? 'all_sources',
        upperLimitDescription: dri.upperLimitDescription,
        citation: dri.citation,
        disclaimer: dri.disclaimer,
        isMinor: !dri.isAdult,
        minorNotice: !dri.isAdult ? dri.disclaimer : undefined,
      };
    }
    default: {
      // 9 Micronutrients from RDA_TARGETS & National Academies DRIs
      const dri = getDriTarget(key, profile?.age, profile?.gender);
      const rda = RDA_TARGETS[key as keyof typeof RDA_TARGETS];
      if (rda) {
        return {
          key,
          label: rda.label,
          unit: rda.unit,
          colorToken: rda.colorToken,
          defaultTarget: dri.target ?? rda.target,
          targetType: dri.targetType ?? rda.targetType,
          description: `Recommended Dietary Allowance (RDA) established by the National Academies (IOM/NASEM).`,
          foodSources: rda.foodSources,
          upperLimit: dri.upperLimit ?? rda.upperLimit,
          upperLimitScope: dri.upperLimitScope ?? rda.upperLimitScope,
          upperLimitDescription: dri.upperLimitDescription,
          citation: dri.citation,
          disclaimer: dri.disclaimer,
          isMinor: !dri.isAdult,
          minorNotice: !dri.isAdult ? dri.disclaimer : undefined,
        };
      }
      return {
        key,
        label: key,
        unit: 'g',
        colorToken: 'emerald',
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
  const isMinor = meta.isMinor ?? false;
  const isCustomTarget = typeof customTarget === 'number' && customTarget > 0;
  const isLimitNutrient = Boolean(meta.isLimitNutrient || nutrientKey === 'sodium' || nutrientKey === 'sugar');

  // Determine hasTarget:
  // For minors (<19), no adult targets exist unless user sets a custom goal.
  const hasTarget = isCustomTarget
    ? true
    : isMinor
    ? false
    : meta.defaultTarget > 0;

  const noTargetReason = hasTarget
    ? undefined
    : isMinor
    ? 'No daily target for under 19'
    : 'No daily target';

  const target = hasTarget
    ? (isCustomTarget ? customTarget : meta.defaultTarget)
    : 0;

  const validMeals = meals || [];
  let foodTotal = 0;
  let missingCount = 0;
  const contributingItems: NutrientContributor[] = [];
  const missingItems: NutrientContributor[] = [];

  for (const meal of validMeals) {
    const rawVal = resolveMealNutrient(meal, nutrientKey);
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

  // Aggregate supplements if nutrient is a micronutrient (ensure each taken supplement counted once)
  let supplementTotal = 0;
  const seenSupplementIds = new Set<string>();
  if (ORDERED_MICRONUTRIENT_KEYS.includes(nutrientKey as unknown as typeof ORDERED_MICRONUTRIENT_KEYS[number])) {
    for (const supp of supplements || []) {
      if (supp.taken) {
        if (supp.id) {
          if (seenSupplementIds.has(supp.id)) continue;
          seenSupplementIds.add(supp.id);
        }
        const contrib = resolveSupplementNutrientContribution(supp);
        if (contrib && contrib.nutrientKey === nutrientKey) {
          if (contrib.isCompatibleUnit && contrib.amountInCanonicalUnit > 0) {
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
          } else if (!contrib.isCompatibleUnit) {
            missingItems.push({
              id: supp.id,
              name: `${supp.name} (${supp.amount ?? ''} ${supp.unit ?? ''})`,
              mealType: 'supplement',
              amount: null,
              unit: meta.unit,
              percentage: 0,
              isMissing: true,
              isSupplement: true,
            });
          }
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

  const percent = hasTarget && target > 0 ? Math.min(999, Math.round((currentTotal / target) * 100)) : 0;
  const foodsWithDataCount = Math.max(0, validMeals.length - missingCount);
  const isIncomplete = validMeals.length > 0 && missingCount > 0;
  const hasData = foodsWithDataCount > 0 || supplementTotal > 0;
  const remaining = hasTarget && target > 0 && !isLimitNutrient
    ? Math.max(0, Math.round((target - currentTotal) * 10) / 10)
    : 0;
  const dataCompletenessText = formatDataCompleteness(foodsWithDataCount, validMeals.length);

  let status: 'optimal' | 'good' | 'low' | 'under' | 'exceeded' = 'under';
  if (nutrientKey === 'calories' || nutrientKey === 'sugar' || nutrientKey === 'sodium') {
    if (percent > 115) status = 'exceeded';
    else if (percent >= 80) status = 'optimal';
    else if (percent >= 50) status = 'good';
    else status = 'under';
  } else {
    if (percent >= 100) status = 'optimal';
    else if (percent >= 75) status = 'good';
    else if (percent >= 50) status = 'low';
    else status = 'under';
  }

  const ulEval = evaluateUpperLimit(
    nutrientKey,
    foodTotal,
    supplementTotal,
    profile?.age,
    profile?.gender
  );

  return {
    key: nutrientKey,
    label: meta.label,
    unit: meta.unit,
    colorToken: meta.colorToken,
    target,
    hasTarget,
    noTargetReason,
    isLimitNutrient,
    targetType: meta.targetType,
    isCustomTarget,
    current: currentTotal,
    remaining,
    foodAmount: foodTotal,
    supplementAmount: supplementTotal,
    percent,
    hasData,
    isIncomplete,
    missingCount,
    foodsWithDataCount,
    totalMealsCount: validMeals.length,
    dataCompletenessText,
    contributors,
    missingItems,
    status,
    foodSources: meta.foodSources,
    upperLimit: meta.upperLimit,
    upperLimitScope: meta.upperLimitScope,
    upperLimitDescription: meta.upperLimitDescription,
    upperLimitWarning: ulEval.warning,
    citation: meta.citation,
    disclaimer: meta.disclaimer,
    isMinor,
    minorNotice: isMinor ? meta.minorNotice : undefined,
  };
}

export const calculateNutrientProgress = calculateNutrientDayProgress;

/**
 * Formats intake breakdown into clear wording without nested brackets:
 * e.g. "870.3 mg from foods · no data for 2 foods" or
 *      "870.3 mg from foods · 20 mg from supplements · no data for 2 foods"
 */
export function formatIntakeBreakdown(
  progress: Pick<NutrientDayProgress, 'foodAmount' | 'supplementAmount' | 'missingCount' | 'unit' | 'totalMealsCount'>,
  t: (key: string) => string = (k) => k
): string {
  const parts: string[] = [];

  // Food amount part
  if (progress.foodAmount > 0 || (progress.totalMealsCount > 0 && progress.missingCount < progress.totalMealsCount)) {
    parts.push(`${progress.foodAmount} ${progress.unit} ${t('from foods')}`);
  }

  // Supplement amount part
  if (progress.supplementAmount > 0) {
    parts.push(`${progress.supplementAmount} ${progress.unit} ${t('from supplements')}`);
  }

  // Missing data part
  if (progress.missingCount > 0) {
    const foodWord = progress.missingCount === 1 ? t('food') : t('foods');
    parts.push(`${t('no data for')} ${progress.missingCount} ${foodWord}`);
  }

  return parts.join(' · ');
}
