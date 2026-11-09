import {
  calculateNutrientDayProgress,
  formattedNutrientValue,
  getNutrientMetadata,
} from './nutrientTotals';
import { resolveMealNutrient } from './mealNutrients';
import { LoggedMeal, LoggedDailySupplement, UserProfile } from '../types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ Assertion failed: ${message}`);
    process.exit(1);
  }
}

console.log('Starting Nutrient Totals, Missing Data & Contributor Tests...');

const mockProfile: UserProfile = {
  name: 'Test Athlete',
  age: 28,
  gender: 'male',
  weightKg: 78,
  heightCm: 180,
  activityLevel: 'moderate',
  goal: 'maintenance',
  bmr: 1750,
  tdee: 2400,
  targetCalories: 2400,
  targetProtein: 160,
  targetCarbs: 260,
  targetFat: 80,
  waterTargetGlasses: 8,
};

// 1. Formatted value tests: Never return '0' or '0g' for missing/undefined/null
console.log('Testing formattedNutrientValue behavior...');
assert(
  formattedNutrientValue(undefined, 'g') === 'Not available',
  'undefined must return "Not available"'
);
assert(
  formattedNutrientValue(null, 'mg') === 'Not available',
  'null must return "Not available"'
);
assert(
  formattedNutrientValue(NaN, 'mcg') === 'Not available',
  'NaN must return "Not available"'
);
assert(
  formattedNutrientValue(0, 'g') === '0 g',
  'Explicit 0 must return "0 g"'
);
assert(
  formattedNutrientValue(15.42, 'mg') === '15.4 mg',
  'Numeric amount formatted with unit'
);
const metaVitC = getNutrientMetadata('vitaminC', mockProfile);
assert(metaVitC.unit === 'mg' && metaVitC.defaultTarget === 90, 'Metadata for vitaminC verified');
console.log('✓ formattedNutrientValue and getNutrientMetadata verified.');

// 2. Complete data set (no missing values)
console.log('Testing complete dataset aggregation...');
const completeMeals: LoggedMeal[] = [
  {
    id: 'm1',
    foodId: 'f1',
    name: 'Oatmeal',
    mealType: 'breakfast',
    servings: 1,
    servingSize: '1 bowl',
    servingGrams: 80,
    calories: 300,
    protein: 10,
    carbs: 50,
    fat: 5,
    fiber: 8,
    sugar: 2,
    timestamp: new Date().toISOString(),
  },
  {
    id: 'm2',
    foodId: 'f2',
    name: 'Lentil Soup',
    mealType: 'lunch',
    servings: 1,
    servingSize: '1 bowl',
    servingGrams: 250,
    calories: 280,
    protein: 18,
    carbs: 40,
    fat: 4,
    fiber: 14,
    sugar: 3,
    timestamp: new Date().toISOString(),
  },
];

const completeFiber = calculateNutrientDayProgress('fiber', completeMeals, [], mockProfile);
assert(completeFiber.current === 22, `Total fiber should be 22, got ${completeFiber.current}`);
assert(completeFiber.isIncomplete === false, 'Complete meals must have isIncomplete = false');
assert(completeFiber.missingCount === 0, 'missingCount must be 0');
assert(completeFiber.contributors.length === 2, 'Should have 2 contributors');
assert(
  completeFiber.contributors[0].name === 'Lentil Soup',
  'Contributors must be sorted descending (Lentil Soup 14g > Oatmeal 8g)'
);
assert(completeFiber.contributors[0].amount === 14, 'Top contributor amount is 14');
console.log('✓ Complete dataset passes with isIncomplete = false and correct descending order.');

// 3. Partial data set (some foods missing nutrient data)
console.log('Testing partial dataset and incomplete data marker...');
const partialMeals: LoggedMeal[] = [
  ...completeMeals,
  {
    id: 'm3',
    foodId: 'f3',
    name: 'Mystery Custom Snack',
    mealType: 'snack',
    servings: 1,
    servingSize: '1 bar',
    servingGrams: 50,
    calories: 180,
    protein: 6,
    carbs: 22,
    fat: 6,
    // fiber is deliberately missing (undefined)
    timestamp: new Date().toISOString(),
  },
];

const partialFiber = calculateNutrientDayProgress('fiber', partialMeals, [], mockProfile);
assert(partialFiber.current === 22, 'Total still sums available numbers');
assert(partialFiber.isIncomplete === true, 'isIncomplete must be true when any food lacks the nutrient');
assert(partialFiber.missingCount === 1, `missingCount must be 1, got ${partialFiber.missingCount}`);
assert(partialFiber.missingItems.length === 1, 'missingItems must contain the incomplete meal');
assert(partialFiber.missingItems[0].name === 'Mystery Custom Snack', 'missingItems lists the missing food');
console.log('✓ Partial dataset properly flags isIncomplete = true with missing item metadata.');

// 4. Empty meals dataset
console.log('Testing empty dataset...');
const emptyProgress = calculateNutrientDayProgress('iron', [], [], mockProfile);
assert(emptyProgress.current === 0, 'Empty meals total is 0');
assert(emptyProgress.isIncomplete === false, 'Empty meals list is not incomplete');
assert(emptyProgress.missingCount === 0, 'missingCount is 0 for empty meals');
assert(emptyProgress.contributors.length === 0, 'No contributors');
console.log('✓ Empty dataset handled safely.');

// 5. Custom Goal Override and Persistence Verification
console.log('Testing custom nutrient goals override...');
const profileWithCustomGoal: UserProfile = {
  ...mockProfile,
  customNutrientGoals: {
    fiber: 38,
    protein: 190,
  },
};

const customFiber = calculateNutrientDayProgress('fiber', completeMeals, [], profileWithCustomGoal);
assert(customFiber.target === 38, `Expected target 38, got ${customFiber.target}`);
assert(customFiber.isCustomTarget === true, 'isCustomTarget must be true when override exists');

const defaultFiber = calculateNutrientDayProgress('fiber', completeMeals, [], mockProfile);
assert(defaultFiber.target === 28, `Expected default RDA target 28, got ${defaultFiber.target}`);
assert(defaultFiber.isCustomTarget === false, 'isCustomTarget must be false for defaults');
console.log('✓ Custom nutrient goals override RDA defaults accurately.');

// 6. Supplement Contribution Integration
console.log('Testing supplement contribution ranking...');
const supplements: LoggedDailySupplement[] = [
  {
    id: 's1',
    name: 'Vitamin D3 2000 IU',
    amount: 2000,
    unit: 'IU',
    category: 'vitamin',
    time: 'morning',
    taken: true,
    takenAt: new Date().toISOString(),
  },
];

const vitDProgress = calculateNutrientDayProgress('vitaminD', [], supplements, mockProfile);
assert(vitDProgress.current === 50, `2000 IU Vitamin D3 = 50 mcg, got ${vitDProgress.current}`);
assert(vitDProgress.contributors.length === 1, 'Supplement should be listed as contributor');
assert(vitDProgress.contributors[0].isSupplement === true, 'Contributor marked as supplement');
console.log('✓ Supplement contribution resolved and added to contributors ranking.');

// 7. Supplement Deduplication (No Double Counting)
console.log('Testing supplement deduplication (no double counting)...');
const duplicateSupplements: LoggedDailySupplement[] = [
  supplements[0],
  { ...supplements[0] }, // exact duplicate taken entry
];
const dedupVitD = calculateNutrientDayProgress('vitaminD', [], duplicateSupplements, mockProfile);
assert(dedupVitD.current === 50, `Duplicate taken supplements must only be counted once (expected 50, got ${dedupVitD.current})`);
assert(dedupVitD.contributors.length === 1, 'Deduplicated contributors list should have length 1');
console.log('✓ Supplement deduplication verified: duplicate taken supplements are counted exactly once.');

// 8. Data Completeness & Remaining Calculation
console.log('Testing data completeness and remaining targets...');
const multiMeals: LoggedMeal[] = [
  ...completeMeals, // 2 meals with fiber
  {
    id: 'm4',
    foodId: 'f4',
    name: 'Mystery Food Without Fiber',
    mealType: 'dinner',
    servings: 1,
    servingSize: '100g',
    servingGrams: 100,
    calories: 150,
    protein: 5,
    carbs: 10,
    fat: 2,
    timestamp: new Date().toISOString(),
  },
];
const progressMulti = calculateNutrientDayProgress('fiber', multiMeals, [], mockProfile);
assert(progressMulti.foodsWithDataCount === 2, `Expected 2 foods with data, got ${progressMulti.foodsWithDataCount}`);
assert(progressMulti.totalMealsCount === 3, `Expected 3 total meals, got ${progressMulti.totalMealsCount}`);
assert(progressMulti.hasData === true, 'hasData must be true when 2 of 3 foods have data');
assert(progressMulti.dataCompletenessText === 'based on 2 of 3 logged foods with data', `Got text: "${progressMulti.dataCompletenessText}"`);
assert(progressMulti.remaining === 6, `Expected remaining 6g (target 28 - current 22), got ${progressMulti.remaining}`);
console.log('✓ Data completeness formatting and remaining target calculations verified.');

// 9. Food Details Agreement with Daily Totals
console.log('Testing Food Details Agreement with Daily Totals...');
const testEggMeal: LoggedMeal = {
  id: 'egg_logged_1',
  foodId: 'food_egg_boiled_whole',
  name: 'Boiled Egg (Whole)',
  mealType: 'breakfast',
  servings: 2,
  servingSize: '1 large egg (50g)',
  servingGrams: 100, // 2 large eggs = 100g
  calories: 156,
  protein: 12.6,
  carbs: 1.2,
  fat: 10.6,
  timestamp: new Date().toISOString(),
};
const dayEggProgress = calculateNutrientDayProgress('vitaminA', [testEggMeal], [], mockProfile);
const directResolvedVitA = resolveMealNutrient(testEggMeal, 'vitaminA');
assert(directResolvedVitA !== undefined && directResolvedVitA > 0, 'Direct resolve should return valid vitaminA');
assert(dayEggProgress.current === directResolvedVitA, `Food detail direct resolution (${directResolvedVitA}) must match daily totals (${dayEggProgress.current})`);
console.log('✓ Food detail resolution and daily totals agree 100%.');

// 10. Water Progress Calculation Tests
console.log('Testing Water Progress Calculation...');
const metaWater = getNutrientMetadata('water', mockProfile);
assert(metaWater.unit === 'L' && metaWater.defaultTarget === 2, 'Default water target for 8 glasses is 2.0 L');
const waterProgress = calculateNutrientDayProgress('water', [], [], mockProfile, 4);
assert(waterProgress.current === 1, '4 glasses yields 1.0 L');
assert(waterProgress.target === 2, 'Target is 2.0 L');
assert(waterProgress.percent === 50, '4 of 8 glasses is 50%');
assert(waterProgress.remaining === 1, '1.0 L remaining');
assert(waterProgress.contributors.length === 1, 'Water intake contributor added');
const waterCompleteProgress = calculateNutrientDayProgress('water', [], [], mockProfile, 8);
assert(waterCompleteProgress.percent === 100, '8 of 8 glasses is 100%');
assert(waterCompleteProgress.status === 'optimal', '100% water is optimal');
console.log('✓ Water progress calculations verified.');

console.log('======================================================');
console.log('All Nutrient Totals & Missing Data Unit Tests Passed Cleanly!');
console.log('======================================================');
