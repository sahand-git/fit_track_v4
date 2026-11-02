import { LoggedMeal, LoggedDailySupplement } from '../types';
import { resolveMealNutrient } from './mealNutrients';
import {
  COMMON_SUPPLEMENT_CATALOG,
  MicronutrientKey,
  CatalogSupplementItem,
} from '../data/supplementCatalog';
import type { ThemeColorKey } from '../theme';

export interface RDAMetadata {
  key: MicronutrientKey;
  label: string;
  target: number;
  unit: 'mg' | 'mcg';
  colorToken: ThemeColorKey;
  foodSources: string;
  upperLimit?: number;
}

export const RDA_TARGETS: Record<MicronutrientKey, RDAMetadata> = {
  vitaminA: {
    key: 'vitaminA',
    label: 'Vitamin A',
    target: 900,
    unit: 'mcg',
    colorToken: 'nutrientVitaminA',
    foodSources: 'Carrots, sweet potatoes, spinach, liver, eggs',
    upperLimit: 3000,
  },
  vitaminC: {
    key: 'vitaminC',
    label: 'Vitamin C',
    target: 90,
    unit: 'mg',
    colorToken: 'nutrientVitaminC',
    foodSources: 'Citrus, strawberries, bell peppers, broccoli',
    upperLimit: 2000,
  },
  vitaminD: {
    key: 'vitaminD',
    label: 'Vitamin D',
    target: 20,
    unit: 'mcg',
    colorToken: 'nutrientVitaminD',
    foodSources: 'Sunlight, fatty fish, fortified dairy, eggs',
    upperLimit: 100,
  },
  vitaminB12: {
    key: 'vitaminB12',
    label: 'Vitamin B12',
    target: 2.4,
    unit: 'mcg',
    colorToken: 'nutrientVitaminB12',
    foodSources: 'Meat, fish, poultry, eggs, dairy, fortified yeast',
  },
  calcium: {
    key: 'calcium',
    label: 'Calcium',
    target: 1000,
    unit: 'mg',
    colorToken: 'nutrientCalcium',
    foodSources: 'Dairy, fortified plant milk, tofu, chia seeds, leafy greens',
    upperLimit: 2500,
  },
  iron: {
    key: 'iron',
    label: 'Iron',
    target: 18,
    unit: 'mg',
    colorToken: 'nutrientIron',
    foodSources: 'Red meat, lentils, beans, spinach, pumpkin seeds',
    upperLimit: 45,
  },
  potassium: {
    key: 'potassium',
    label: 'Potassium',
    target: 3400,
    unit: 'mg',
    colorToken: 'nutrientPotassium',
    foodSources: 'Bananas, potatoes, spinach, avocados, yogurt',
  },
  magnesium: {
    key: 'magnesium',
    label: 'Magnesium',
    target: 400,
    unit: 'mg',
    colorToken: 'nutrientMagnesium',
    foodSources: 'Pumpkin seeds, almonds, spinach, black beans, dark chocolate',
    upperLimit: 350,
  },
  zinc: {
    key: 'zinc',
    label: 'Zinc',
    target: 11,
    unit: 'mg',
    colorToken: 'nutrientZinc',
    foodSources: 'Oysters, beef, pumpkin seeds, lentils, chickpeas',
    upperLimit: 40,
  },
};

export const ORDERED_MICRONUTRIENT_KEYS: MicronutrientKey[] = [
  'vitaminA',
  'vitaminC',
  'vitaminD',
  'vitaminB12',
  'calcium',
  'iron',
  'potassium',
  'magnesium',
  'zinc',
];

export interface MicronutrientIntake {
  key: MicronutrientKey;
  label: string;
  target: number;
  unit: 'mg' | 'mcg';
  current: number;
  foodAmount: number;
  supplementAmount: number;
  percent: number;
  status: 'optimal' | 'low' | 'deficient';
  isDeficient: boolean;
  coverage: number;
  colorToken: ThemeColorKey;
  foodSources: string;
  hasData: boolean;
  isIncomplete: boolean;
  missingCount: number;
}

export interface MicronutrientAnalysis {
  nutrients: Record<MicronutrientKey, MicronutrientIntake>;
  deficiencies: MicronutrientIntake[];
  targetsMetCount: number;
  overallScore: number;
}

/**
 * Matches a supplement name/record to a catalog item with nutrient metadata.
 */
export function findMatchingCatalogItem(
  supplementName: string
): CatalogSupplementItem | undefined {
  const norm = supplementName.trim().toLowerCase();
  if (!norm) return undefined;

  // 1. Direct match
  const direct = COMMON_SUPPLEMENT_CATALOG.find(
    (c) => c.name.toLowerCase() === norm
  );
  if (direct) return direct;

  // 2. Keyword heuristic
  if (norm.includes('d3') || (norm.includes('vitamin d') && !norm.includes('multi'))) {
    return COMMON_SUPPLEMENT_CATALOG.find((c) => c.id === 'cat_d3');
  }
  if (norm.includes('vitamin c') || norm.includes('ascorbic')) {
    return COMMON_SUPPLEMENT_CATALOG.find((c) => c.id === 'cat_c');
  }
  if (norm.includes('b12') || norm.includes('cobalamin')) {
    return COMMON_SUPPLEMENT_CATALOG.find((c) => c.id === 'cat_b12');
  }
  if (norm.includes('vitamin a') || norm.includes('retinol')) {
    return COMMON_SUPPLEMENT_CATALOG.find((c) => c.id === 'cat_a');
  }
  if (norm.includes('zinc')) {
    return COMMON_SUPPLEMENT_CATALOG.find((c) => c.id === 'cat_zn_pico');
  }
  if (norm.includes('iron')) {
    return COMMON_SUPPLEMENT_CATALOG.find((c) => c.id === 'cat_fe_bisg');
  }
  if (norm.includes('calcium')) {
    return COMMON_SUPPLEMENT_CATALOG.find((c) => c.id === 'cat_calcium');
  }
  if (norm.includes('potassium')) {
    return COMMON_SUPPLEMENT_CATALOG.find((c) => c.id === 'cat_potassium');
  }
  if (norm.includes('magnesium')) {
    return COMMON_SUPPLEMENT_CATALOG.find((c) => c.id === 'cat_mg_glyc');
  }

  return undefined;
}

export interface SupplementNutrientContribution {
  nutrientKey: MicronutrientKey;
  amountInCanonicalUnit: number;
  isCompatibleUnit: boolean;
  unitStatus: 'valid' | 'incompatible' | 'unknown';
  doseWarning?: string;
  unitWarning?: string;
}

/**
 * Calculates canonical nutrient intake contribution from a taken supplement,
 * performing explicit unit conversion and plausible dose validation.
 */
export function resolveSupplementNutrientContribution(supplement: {
  name: string;
  amount?: number;
  dose?: string;
  unit?: string;
}): SupplementNutrientContribution | null {
  const catItem = findMatchingCatalogItem(supplement.name);
  if (!catItem || !catItem.nutrientKey) return null;

  const nutrientKey = catItem.nutrientKey;
  const meta = RDA_TARGETS[nutrientKey];
  const canonicalUnit = meta.unit; // 'mg' or 'mcg'

  let rawAmount = supplement.amount;
  let rawUnit = (supplement.unit || '').trim();

  // If no numeric amount, parse from free-text dose string (e.g. "2000 IU", "500 mg")
  if ((rawAmount === undefined || isNaN(rawAmount) || rawAmount <= 0) && supplement.dose) {
    const parsed = supplement.dose.match(/(\d+(?:\.\d+)?)/);
    if (parsed) {
      rawAmount = parseFloat(parsed[1]);
    }
    if (!rawUnit) {
      const unitMatch = supplement.dose.match(/(?:mg|mcg|µg|ug|g|iu)\b/i);
      if (unitMatch) {
        rawUnit = unitMatch[0];
      }
    }
  }

  // Fallback to catalog defaultAmount
  if (rawAmount === undefined || isNaN(rawAmount) || rawAmount <= 0) {
    rawAmount = catItem.defaultAmount ?? 0;
  }

  // Fallback to catalog suggestedUnit
  if (!rawUnit && catItem.suggestedUnit) {
    rawUnit = catItem.suggestedUnit;
  }

  if (rawAmount <= 0) return null;

  const norm = rawUnit.toLowerCase().replace(/[\s.]+/g, '');
  let isCompatibleUnit = true;
  let unitStatus: 'valid' | 'incompatible' | 'unknown' = 'valid';
  let factor = 1;
  let unitWarning: string | undefined = undefined;

  // Explicit unit conversions
  if (norm === 'iu' || norm === 'internationalunits') {
    if (nutrientKey === 'vitaminD') {
      factor = 0.025; // 1 IU = 0.025 mcg
    } else if (nutrientKey === 'vitaminA') {
      factor = 0.3; // 1 IU = 0.3 mcg RAE
    } else {
      isCompatibleUnit = false;
      unitStatus = 'incompatible';
      unitWarning = 'Check unit';
      factor = 0;
    }
  } else if (norm === 'mcg' || norm === 'µg' || norm === 'ug' || norm === 'microgram' || norm === 'micrograms') {
    if (canonicalUnit === 'mcg') {
      factor = 1;
    } else {
      // canonical is mg
      factor = 0.001;
    }
  } else if (norm === 'mg' || norm === 'milligram' || norm === 'milligrams') {
    if (canonicalUnit === 'mg') {
      factor = 1;
    } else {
      // canonical is mcg
      factor = 1000;
    }
  } else if (norm === 'g' || norm === 'gram' || norm === 'grams') {
    if (canonicalUnit === 'mg') {
      factor = 1000;
    } else {
      // canonical is mcg
      factor = 1000000;
    }
  } else {
    isCompatibleUnit = false;
    unitStatus = 'unknown';
    unitWarning = 'Check unit';
    factor = 0;
  }

  const canonicalAmount = isCompatibleUnit
    ? Math.round(rawAmount * factor * 10) / 10
    : 0;

  // Plausible dose warnings (neutral wording, no medical advice)
  let doseWarning: string | undefined = undefined;
  if (isCompatibleUnit && canonicalAmount > 0) {
    if (meta.upperLimit && canonicalAmount > meta.upperLimit) {
      doseWarning = 'Higher than typical daily guidance. Verify label.';
    } else if (nutrientKey === 'vitaminB12' && canonicalAmount > 3000) {
      doseWarning = 'Higher than typical daily guidance. Verify label.';
    } else if (nutrientKey === 'potassium' && canonicalAmount > 1000) {
      doseWarning = 'Higher than typical daily guidance. Verify label.';
    }
  }

  return {
    nutrientKey,
    amountInCanonicalUnit: canonicalAmount,
    isCompatibleUnit,
    unitStatus,
    doseWarning,
    unitWarning,
  };
}

/**
 * Calculates aggregated daily micronutrient intake from logged meals and taken supplements,
 * comparing against NIH/IOM Recommended Dietary Allowances (RDA).
 */
export function calculateMicronutrientIntake(
  meals: LoggedMeal[] = [],
  supplements: LoggedDailySupplement[] = []
): MicronutrientAnalysis {
  const foodTotals: Record<MicronutrientKey, number> = {
    vitaminA: 0,
    vitaminC: 0,
    vitaminD: 0,
    vitaminB12: 0,
    calcium: 0,
    iron: 0,
    potassium: 0,
    magnesium: 0,
    zinc: 0,
  };

  const hasFoodData: Record<MicronutrientKey, boolean> = {
    vitaminA: false,
    vitaminC: false,
    vitaminD: false,
    vitaminB12: false,
    calcium: false,
    iron: false,
    potassium: false,
    magnesium: false,
    zinc: false,
  };

  const missingCounts: Record<MicronutrientKey, number> = {
    vitaminA: 0,
    vitaminC: 0,
    vitaminD: 0,
    vitaminB12: 0,
    calcium: 0,
    iron: 0,
    potassium: 0,
    magnesium: 0,
    zinc: 0,
  };

  const supplementTotals: Record<MicronutrientKey, number> = {
    vitaminA: 0,
    vitaminC: 0,
    vitaminD: 0,
    vitaminB12: 0,
    calcium: 0,
    iron: 0,
    potassium: 0,
    magnesium: 0,
    zinc: 0,
  };

  const hasSuppData: Record<MicronutrientKey, boolean> = {
    vitaminA: false,
    vitaminC: false,
    vitaminD: false,
    vitaminB12: false,
    calcium: false,
    iron: false,
    potassium: false,
    magnesium: false,
    zinc: false,
  };

  // 1. Aggregate meals
  for (const meal of meals) {
    for (const key of ORDERED_MICRONUTRIENT_KEYS) {
      const val = resolveMealNutrient(meal, key);
      if (val !== undefined && val !== null && !isNaN(val)) {
        hasFoodData[key] = true;
        if (val > 0) foodTotals[key] += val;
      } else {
        missingCounts[key] += 1;
      }
    }
  }

  // 2. Aggregate supplements (only taken supplements count)
  for (const s of supplements) {
    if (s.taken) {
      const contrib = resolveSupplementNutrientContribution(s);
      if (contrib && contrib.isCompatibleUnit && contrib.amountInCanonicalUnit > 0) {
        supplementTotals[contrib.nutrientKey] += contrib.amountInCanonicalUnit;
        hasSuppData[contrib.nutrientKey] = true;
      }
    }
  }

  // 3. Assemble analysis
  const nutrients: Partial<Record<MicronutrientKey, MicronutrientIntake>> = {};
  const deficiencies: MicronutrientIntake[] = [];
  let targetsMetCount = 0;
  let totalPctSum = 0;

  for (const key of ORDERED_MICRONUTRIENT_KEYS) {
    const meta = RDA_TARGETS[key];
    const food = Math.round(foodTotals[key] * 10) / 10;
    const supp = Math.round(supplementTotals[key] * 10) / 10;
    const total = Math.round((food + supp) * 10) / 10;
    const percent = Math.min(999, Math.round((total / meta.target) * 100));
    const isDeficient = percent < 50;

    let status: 'optimal' | 'low' | 'deficient' = 'deficient';
    if (percent >= 80) {
      status = 'optimal';
    } else if (percent >= 50) {
      status = 'low';
    }

    if (percent >= 100) {
      targetsMetCount += 1;
    }
    totalPctSum += Math.min(100, percent);

    const hasData = hasFoodData[key] || hasSuppData[key];
    const isIncomplete = meals.length > 0 && missingCounts[key] > 0;
    const missingCount = missingCounts[key];
    const coverage = meals.length > 0
      ? (meals.length - missingCounts[key]) / meals.length
      : (hasSuppData[key] ? 1 : 0);

    const intake: MicronutrientIntake = {
      key,
      label: meta.label,
      target: meta.target,
      unit: meta.unit,
      current: total,
      foodAmount: food,
      supplementAmount: supp,
      percent,
      status,
      isDeficient,
      coverage: Math.round(coverage * 100) / 100,
      colorToken: meta.colorToken,
      foodSources: meta.foodSources,
      hasData,
      isIncomplete,
      missingCount,
    };

    nutrients[key] = intake;
    if (isDeficient) {
      deficiencies.push(intake);
    }
  }

  // Sort deficiencies from lowest percentage upwards
  deficiencies.sort((a, b) => a.percent - b.percent);

  const overallScore = Math.round(totalPctSum / ORDERED_MICRONUTRIENT_KEYS.length);

  return {
    nutrients: nutrients as Record<MicronutrientKey, MicronutrientIntake>,
    deficiencies,
    targetsMetCount,
    overallScore,
  };
}
