import {
  calculateMicronutrientIntake,
  resolveSupplementNutrientContribution,
  findMatchingCatalogItem,
} from './micronutrients';
import { LoggedMeal, LoggedDailySupplement } from '../types';

function assert(condition: boolean, message?: string): void {
  if (!condition) throw new Error(message || 'Assertion failed');
}

function assertEqual<T>(actual: T, expected: T, message?: string): void {
  if (actual !== expected) {
    throw new Error(
      `${message ? message + ': ' : ''}Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
    );
  }
}

console.log('Testing micronutrients and RDA calculation...');

// 1. Empty state
{
  const result = calculateMicronutrientIntake([], []);
  assertEqual(result.targetsMetCount, 0);
  assertEqual(result.overallScore, 0);
  assertEqual(result.deficiencies.length, 9);
  assertEqual(result.nutrients.vitaminD.current, 0);
  assertEqual(result.nutrients.vitaminD.percent, 0);
  assertEqual(result.nutrients.vitaminD.status, 'deficient');
}

// 2. Meals aggregation
{
  const meals: LoggedMeal[] = [
    {
      id: 'm1',
      foodId: 'f1',
      name: 'Salmon & Broccoli',
      mealType: 'lunch',
      servings: 1,
      servingSize: '1 plate',
      servingGrams: 300,
      calories: 500,
      protein: 40,
      carbs: 10,
      fat: 20,
      vitaminD: 15, // 15 mcg
      vitaminC: 60, // 60 mg
      potassium: 800, // 800 mg
      timestamp: '2026-10-15T12:00:00Z',
    },
    {
      id: 'm2',
      foodId: 'f2',
      name: 'Orange & Spinach Salad',
      mealType: 'dinner',
      servings: 1,
      servingSize: '1 bowl',
      servingGrams: 200,
      calories: 200,
      protein: 5,
      carbs: 30,
      fat: 2,
      vitaminC: 50, // 50 mg (total 110 mg, target 90)
      iron: 4, // 4 mg
      timestamp: '2026-10-15T14:00:00Z',
    },
  ];

  const result = calculateMicronutrientIntake(meals, []);
  assertEqual(result.nutrients.vitaminC.foodAmount, 110);
  assertEqual(result.nutrients.vitaminC.current, 110);
  assertEqual(result.nutrients.vitaminC.percent, 122); // 110/90 = 122%
  assertEqual(result.nutrients.vitaminC.status, 'optimal');
  assertEqual(result.nutrients.vitaminC.isDeficient, false);

  assertEqual(result.nutrients.vitaminD.foodAmount, 15);
  assertEqual(result.nutrients.vitaminD.current, 15);
  assertEqual(result.nutrients.vitaminD.percent, 75); // 15/20 = 75%
  assertEqual(result.nutrients.vitaminD.status, 'low');
  assertEqual(result.nutrients.vitaminD.isDeficient, false);
}

// 3. Supplement resolution & conversion factor (Vitamin D3 IU -> mcg)
{
  const suppD3: LoggedDailySupplement = {
    id: 's1',
    name: 'Vitamin D3',
    amount: 2000,
    unit: 'IU',
    time: 'morning',
    taken: true,
  };
  const contrib = resolveSupplementNutrientContribution(suppD3);
  assert(contrib !== null, 'Contribution must not be null');
  if (contrib) {
    assertEqual(contrib.nutrientKey, 'vitaminD');
    assertEqual(contrib.amountInCanonicalUnit, 50); // 2000 * 0.025 = 50 mcg
  }

  const result = calculateMicronutrientIntake([], [suppD3]);
  assertEqual(result.nutrients.vitaminD.supplementAmount, 50);
  assertEqual(result.nutrients.vitaminD.current, 50);
  assertEqual(result.nutrients.vitaminD.percent, 250); // 50 / 20 = 250%
  assertEqual(result.nutrients.vitaminD.status, 'optimal');
}

// 4. Untaken supplements must NOT contribute to intake
{
  const untakenSupp: LoggedDailySupplement = {
    id: 's2',
    name: 'Zinc Picolinate',
    amount: 15,
    unit: 'mg',
    time: 'morning',
    taken: false,
  };
  const result = calculateMicronutrientIntake([], [untakenSupp]);
  assertEqual(result.nutrients.zinc.current, 0);
  assertEqual(result.nutrients.zinc.supplementAmount, 0);
  assertEqual(result.nutrients.zinc.isDeficient, true);
}

// 5. Combined meals and taken supplements
{
  const meals: LoggedMeal[] = [
    {
      id: 'm1',
      foodId: 'f1',
      name: 'Oatmeal & Milk',
      mealType: 'breakfast',
      servings: 1,
      servingSize: '1 bowl',
      servingGrams: 250,
      calories: 350,
      protein: 15,
      carbs: 50,
      fat: 8,
      calcium: 300,
      magnesium: 60,
      timestamp: '2026-10-15T08:00:00Z',
    },
  ];
  const supplements: LoggedDailySupplement[] = [
    {
      id: 's1',
      name: 'Magnesium Glycinate',
      amount: 200,
      unit: 'mg',
      time: 'evening',
      taken: true,
    },
  ];
  const result = calculateMicronutrientIntake(meals, supplements);
  assertEqual(result.nutrients.magnesium.foodAmount, 60);
  assertEqual(result.nutrients.magnesium.supplementAmount, 200);
  assertEqual(result.nutrients.magnesium.current, 260);
  assertEqual(result.nutrients.magnesium.percent, 65); // 260 / 400 = 65%
  assertEqual(result.nutrients.magnesium.status, 'low');
  assertEqual(result.nutrients.magnesium.isDeficient, false);
}

// 6. Free-text dose string fallback
{
  const suppWithDose: LoggedDailySupplement = {
    id: 's3',
    name: 'Vitamin C',
    dose: '500 mg chewable',
    time: 'morning',
    taken: true,
  };
  const contrib = resolveSupplementNutrientContribution(suppWithDose);
  assert(contrib !== null, 'Contribution must not be null');
  if (contrib) {
    assertEqual(contrib.nutrientKey, 'vitaminC');
    assertEqual(contrib.amountInCanonicalUnit, 500);
  }
}

// 7. Deficiency sorting
{
  const result = calculateMicronutrientIntake(
    [
      {
        id: 'm1',
        foodId: 'f1',
        name: 'Snack',
        mealType: 'snack',
        servings: 1,
        servingSize: '1 piece',
        servingGrams: 50,
        calories: 100,
        protein: 2,
        carbs: 20,
        fat: 1,
        iron: 6, // 6/18 = 33%
        zinc: 2, // 2/11 = 18%
        timestamp: '2026-10-15T15:00:00Z',
      },
    ],
    []
  );
  // Zinc (18%) should appear before Iron (33%) in deficiencies list
  const zincIdx = result.deficiencies.findIndex((d) => d.key === 'zinc');
  const ironIdx = result.deficiencies.findIndex((d) => d.key === 'iron');
  assert(zincIdx >= 0 && ironIdx >= 0, 'Both zinc and iron must be deficient');
  assert(zincIdx < ironIdx, 'Lower percent deficiency must be ranked first');
}

// 8. Catalog match heuristic
{
  assertEqual(findMatchingCatalogItem('Vitamin D3 5000IU')?.nutrientKey, 'vitaminD');
  assertEqual(findMatchingCatalogItem('High Absorption Magnesium')?.nutrientKey, 'magnesium');
  assertEqual(findMatchingCatalogItem('Methyl B12 Sublingual')?.nutrientKey, 'vitaminB12');
  assertEqual(findMatchingCatalogItem('Iron Bisglycinate Gentle')?.nutrientKey, 'iron');
}

console.log('All micronutrients and RDA calculation tests passed successfully.');
