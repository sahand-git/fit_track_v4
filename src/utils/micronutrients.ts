import { LoggedMeal, LoggedDailySupplement } from '../types';
import {
  COMMON_SUPPLEMENT_CATALOG,
  MicronutrientKey,
  CatalogSupplementItem,
} from '../data/supplementCatalog';

export interface RDAMetadata {
  key: MicronutrientKey;
  label: string;
  target: number;
  unit: 'mg' | 'mcg';
  color: string;
  foodSources: string;
}

export const RDA_TARGETS: Record<MicronutrientKey, RDAMetadata> = {
  vitaminA: {
    key: 'vitaminA',
    label: 'Vitamin A',
    target: 900,
    unit: 'mcg',
    color: '#F59E0B',
    foodSources: 'Carrots, sweet potatoes, spinach, liver, eggs',
  },
  vitaminC: {
    key: 'vitaminC',
    label: 'Vitamin C',
    target: 90,
    unit: 'mg',
    color: '#F97316',
    foodSources: 'Citrus, strawberries, bell peppers, broccoli',
  },
  vitaminD: {
    key: 'vitaminD',
    label: 'Vitamin D',
    target: 20,
    unit: 'mcg',
    color: '#EAB308',
    foodSources: 'Sunlight, fatty fish, fortified dairy, eggs',
  },
  vitaminB12: {
    key: 'vitaminB12',
    label: 'Vitamin B12',
    target: 2.4,
    unit: 'mcg',
    color: '#F43F5E',
    foodSources: 'Meat, fish, poultry, eggs, dairy, fortified yeast',
  },
  calcium: {
    key: 'calcium',
    label: 'Calcium',
    target: 1000,
    unit: 'mg',
    color: '#0EA5E9',
    foodSources: 'Dairy, fortified plant milk, tofu, chia seeds, leafy greens',
  },
  iron: {
    key: 'iron',
    label: 'Iron',
    target: 18,
    unit: 'mg',
    color: '#EF4444',
    foodSources: 'Red meat, lentils, beans, spinach, pumpkin seeds',
  },
  potassium: {
    key: 'potassium',
    label: 'Potassium',
    target: 3400,
    unit: 'mg',
    color: '#10B981',
    foodSources: 'Bananas, potatoes, spinach, avocados, yogurt',
  },
  magnesium: {
    key: 'magnesium',
    label: 'Magnesium',
    target: 400,
    unit: 'mg',
    color: '#6366F1',
    foodSources: 'Pumpkin seeds, almonds, spinach, black beans, dark chocolate',
  },
  zinc: {
    key: 'zinc',
    label: 'Zinc',
    target: 11,
    unit: 'mg',
    color: '#14B8A6',
    foodSources: 'Oysters, beef, pumpkin seeds, lentils, chickpeas',
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
  color: string;
  foodSources: string;
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

/**
 * Calculates canonical nutrient intake contribution from a taken supplement.
 */
export function resolveSupplementNutrientContribution(supplement: {
  name: string;
  amount?: number;
  dose?: string;
  unit?: string;
}): { nutrientKey: MicronutrientKey; amountInCanonicalUnit: number } | null {
  const catItem = findMatchingCatalogItem(supplement.name);
  if (!catItem || !catItem.nutrientKey) return null;

  let rawAmount = supplement.amount;
  const unit = (supplement.unit || catItem.suggestedUnit || '').trim().toLowerCase();

  // If no numeric amount, parse from free-text dose string (e.g. "2000 IU", "500 mg")
  if ((rawAmount === undefined || isNaN(rawAmount) || rawAmount <= 0) && supplement.dose) {
    const parsed = supplement.dose.match(/(\d+(?:\.\d+)?)/);
    if (parsed) {
      rawAmount = parseFloat(parsed[1]);
    }
  }

  // Fallback to catalog defaultAmount
  if (rawAmount === undefined || isNaN(rawAmount) || rawAmount <= 0) {
    rawAmount = catItem.defaultAmount ?? 0;
  }

  if (rawAmount <= 0) return null;

  // Apply unit conversion factor
  let factor = catItem.nutrientConversionFactor ?? 1;

  // Handle unit mismatch (e.g., entered in IU vs mcg, or mg vs mcg)
  if (catItem.nutrientKey === 'vitaminD') {
    if (unit === 'iu') {
      factor = 0.025; // 1 IU = 0.025 mcg
    } else if (unit === 'mcg') {
      factor = 1;
    }
  } else if (catItem.nutrientKey === 'vitaminA') {
    if (unit === 'iu') {
      factor = 0.3; // 1 IU = 0.3 mcg RAE
    } else if (unit === 'mcg') {
      factor = 1;
    }
  }

  const canonicalAmount = Math.round(rawAmount * factor * 10) / 10;
  return {
    nutrientKey: catItem.nutrientKey,
    amountInCanonicalUnit: canonicalAmount,
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

  // 1. Aggregate meals
  for (const meal of meals) {
    if (meal.vitaminA && meal.vitaminA > 0) foodTotals.vitaminA += meal.vitaminA;
    if (meal.vitaminC && meal.vitaminC > 0) foodTotals.vitaminC += meal.vitaminC;
    if (meal.vitaminD && meal.vitaminD > 0) foodTotals.vitaminD += meal.vitaminD;
    if (meal.vitaminB12 && meal.vitaminB12 > 0) foodTotals.vitaminB12 += meal.vitaminB12;
    if (meal.calcium && meal.calcium > 0) foodTotals.calcium += meal.calcium;
    if (meal.iron && meal.iron > 0) foodTotals.iron += meal.iron;
    if (meal.potassium && meal.potassium > 0) foodTotals.potassium += meal.potassium;
    if (meal.magnesium && meal.magnesium > 0) foodTotals.magnesium += meal.magnesium;
    if (meal.zinc && meal.zinc > 0) foodTotals.zinc += meal.zinc;
  }

  // 2. Aggregate supplements (only taken supplements count)
  for (const s of supplements) {
    if (s.taken) {
      const contrib = resolveSupplementNutrientContribution(s);
      if (contrib) {
        supplementTotals[contrib.nutrientKey] += contrib.amountInCanonicalUnit;
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
      color: meta.color,
      foodSources: meta.foodSources,
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
