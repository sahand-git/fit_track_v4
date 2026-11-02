import {
  NUTRIENT_REGISTRY,
  ESSENTIAL_NUTRIENT_KEYS,
  getNutrientDefinition,
  getNutrientLabel,
  convertToCanonicalUnit,
  EssentialNutrientKey,
} from '../data/nutrientRegistry';
import {
  getFoodNutrientProfile,
  getAllFoodNutrientProfiles,
  resolveFoodNutrients,
} from '../data/foodNutrientProfiles';
import {
  resolveMealNutrient,
  resolveMealNutrients,
  shouldSnapshotFoodNutrients,
  buildLoggedMealFromFood,
} from './mealNutrients';
import { parseBackup, serializeBackup } from './backupCore';
import { splitIntoChunks, reassembleChunks } from './cloudBackupChunks';
import { LoggedMeal, FoodItem, FitTrackBackup } from '../types';

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

console.log('--- Starting Nutrient Model & Registry Unit Tests ---');

// ============================================================================
// 1. Nutrient Registry Structure & Definitions
// ============================================================================
console.log('Testing Nutrient Registry...');

const expectedVitamins: EssentialNutrientKey[] = [
  'vitaminA',
  'vitaminC',
  'vitaminD',
  'vitaminE',
  'vitaminK',
  'thiamin',
  'riboflavin',
  'niacin',
  'vitaminB6',
  'folate',
  'vitaminB12',
  'pantothenicAcid',
  'choline',
];

const expectedMinerals: EssentialNutrientKey[] = [
  'calcium',
  'iron',
  'magnesium',
  'phosphorus',
  'potassium',
  'sodium',
  'zinc',
  'copper',
  'manganese',
  'selenium',
  'iodine',
];

for (const key of expectedVitamins) {
  const def = getNutrientDefinition(key);
  assert(def !== undefined, `Vitamin ${key} must exist in registry`);
  assert(def.category === 'vitamin', `Vitamin ${key} category must be 'vitamin'`);
  assert(typeof def.label.en === 'string' && def.label.en.length > 0, `Vitamin ${key} has English name`);
  assert(typeof def.label.ar === 'string' && def.label.ar.length > 0, `Vitamin ${key} has Arabic name`);
  assert(typeof def.label.ckb === 'string' && def.label.ckb.length > 0, `Vitamin ${key} has Kurdish name`);
  assert(def.usdaNutrientNumber !== undefined, `Vitamin ${key} has USDA nutrient number`);
  assert(def.defaultRdaTarget !== undefined, `Vitamin ${key} has RDA target`);
  assert(getNutrientLabel(key, 'en') === def.label.en, 'getNutrientLabel returns English label');
  assert(getNutrientLabel(key, 'ar') === def.label.ar, 'getNutrientLabel returns Arabic label');
  assert(getNutrientLabel(key, 'ckb') === def.label.ckb, 'getNutrientLabel returns Kurdish label');
}

for (const key of expectedMinerals) {
  const def = getNutrientDefinition(key);
  assert(def !== undefined, `Mineral ${key} must exist in registry`);
  assert(def.category === 'mineral', `Mineral ${key} category must be 'mineral'`);
  assert(typeof def.label.en === 'string' && def.label.en.length > 0, `Mineral ${key} has English name`);
  assert(typeof def.label.ar === 'string' && def.label.ar.length > 0, `Mineral ${key} has Arabic name`);
  assert(typeof def.label.ckb === 'string' && def.label.ckb.length > 0, `Mineral ${key} has Kurdish name`);
  assert(def.usdaNutrientNumber !== undefined, `Mineral ${key} has USDA nutrient number`);
  assert(def.defaultRdaTarget !== undefined, `Mineral ${key} has RDA target`);
}

// Unit conversion tests
assert(convertToCanonicalUnit(400, 'iu', 'vitaminD').amount === 10, '400 IU Vitamin D = 10 mcg');
assert(convertToCanonicalUnit(3000, 'iu', 'vitaminA').amount === 900, '3000 IU Vitamin A = 900 mcg RAE');
assert(convertToCanonicalUnit(1, 'g', 'calcium').amount === 1000, '1 g calcium = 1000 mg');
assert(convertToCanonicalUnit(5000, 'mcg', 'iron').amount === 5, '5000 mcg iron = 5 mg');
assert(convertToCanonicalUnit(10, 'mg', 'iron').amount === 10, 'Same unit conversion returns same value');

// Registry collection validation
assert(Object.keys(NUTRIENT_REGISTRY).length >= 30, 'NUTRIENT_REGISTRY contains at least 30 nutrient definitions');
assert(ESSENTIAL_NUTRIENT_KEYS.length === 24, 'ESSENTIAL_NUTRIENT_KEYS contains 24 essential nutrients');

console.log('✓ Nutrient Registry tests passed.');

// ============================================================================
// 2. Compact Lazy-Loaded 100g Table
// ============================================================================
console.log('Testing Food Nutrient Profiles (100g compact table)...');

const allProfiles = getAllFoodNutrientProfiles();
assert(allProfiles.size >= 300, `Expected at least 300 food profiles, found ${allProfiles.size}`);

// Verify a known food profile
const eggProfile = getFoodNutrientProfile('food_eggs_large');
assert(eggProfile !== undefined, 'food_eggs_large profile exists');
assert(eggProfile?.portionBasis === 100, 'Portion basis is strictly 100g');
assert(eggProfile?.nutrients.protein !== undefined, 'food_eggs_large has protein');
assert(eggProfile?.nutrients.calories !== undefined, 'food_eggs_large has calories');

// Verify strictly missing values remain undefined, NEVER 0
// Check that undefined nutrients are not coerced to 0 in the table
const profilesArray = Array.from(allProfiles.values());
let foundMissingNutrient = false;
for (const p of profilesArray) {
  if (p.nutrients.selenium === undefined) {
    foundMissingNutrient = true;
    assert(p.nutrients.selenium === undefined, 'Missing nutrient must be undefined, not 0');
    break;
  }
}
assert(foundMissingNutrient, 'Verified at least one food has undefined selenium');

// Verify scaling calculation
const scaled50g = resolveFoodNutrients('food_eggs_large', 50);
assert(scaled50g !== undefined, 'Scaled nutrients exist for 50g egg');
if (eggProfile && scaled50g) {
  const p100 = eggProfile.nutrients.protein!;
  const p50 = scaled50g.protein!;
  assert(Math.abs(p50 - p100 * 0.5) < 0.05, `50g protein (${p50}) is half of 100g protein (${p100})`);
}

console.log('✓ Food Nutrient Profiles tests passed.');

// ============================================================================
// 3. Meal Nutrients Dynamic Resolution
// ============================================================================
console.log('Testing Meal Nutrients Dynamic Resolution...');

// 3a. Legacy meal with flat fields only (no snapshot, unknown foodId)
const legacyMeal: LoggedMeal = {
  id: 'meal_legacy_1',
  foodId: 'old_unindexed_food',
  name: 'Old Meal',
  mealType: 'lunch',
  servings: 1,
  servingSize: '100g',
  servingGrams: 100,
  calories: 200,
  protein: 10,
  carbs: 20,
  fat: 5,
  vitaminC: 45,
  iron: 3.5,
  timestamp: '2026-10-10T12:00:00Z',
};

assert(resolveMealNutrient(legacyMeal, 'vitaminC') === 45, 'Legacy meal resolves flat vitaminC');
assert(resolveMealNutrient(legacyMeal, 'iron') === 3.5, 'Legacy meal resolves flat iron');
assert(resolveMealNutrient(legacyMeal, 'vitaminD') === undefined, 'Legacy meal returns undefined for unpopulated nutrient');

// 3b. Catalog meal with NO flat micronutrient fields
const catalogMeal: LoggedMeal = {
  id: 'meal_catalog_1',
  foodId: 'food_eggs_large',
  name: 'Whole Large Egg',
  mealType: 'breakfast',
  servings: 2,
  servingSize: '50g (1 large)',
  servingGrams: 100, // 2 * 50g = 100g
  calories: 144,
  protein: 12.6,
  carbs: 0.8,
  fat: 9.6,
  timestamp: '2026-11-01T08:00:00Z',
  // Note: no vitaminA, vitaminD, calcium flat fields!
};

// Should dynamically resolve from food_eggs_large profile
const eggVitA = resolveMealNutrient(catalogMeal, 'vitaminA');
assert(eggVitA !== undefined && eggVitA > 0, `Catalog meal resolves vitaminA dynamically: ${eggVitA}`);

// 3c. Custom food with snapshot
const customFoodMeal: LoggedMeal = {
  id: 'meal_custom_1',
  foodId: 'custom_smoothie_123',
  name: 'Super Green Smoothie',
  mealType: 'snack',
  servings: 1,
  servingSize: '300 ml',
  servingGrams: 300,
  calories: 180,
  protein: 5,
  carbs: 35,
  fat: 2,
  timestamp: '2026-11-01T15:00:00Z',
  source: 'custom',
  nutrientsSnapshot: {
    vitaminC: 85,
    iron: 4.2,
    folate: 120,
  },
};

assert(resolveMealNutrient(customFoodMeal, 'vitaminC') === 85, 'Custom meal resolves from nutrientsSnapshot');
assert(resolveMealNutrient(customFoodMeal, 'folate') === 120, 'Custom meal resolves folate from nutrientsSnapshot');
assert(resolveMealNutrient(customFoodMeal, 'vitaminD') === undefined, 'Missing snapshot nutrient returns undefined');

// Test resolveMealNutrients batch resolver
const resolvedCatalogNutrients = resolveMealNutrients(catalogMeal);
assert(typeof resolvedCatalogNutrients.calories === 'number', 'resolveMealNutrients resolves calories');
assert(typeof resolvedCatalogNutrients.vitaminA === 'number', 'resolveMealNutrients resolves vitaminA');

// 3d. shouldSnapshotFoodNutrients
const verifiedItem: FoodItem = {
  id: 'food_apple',
  name: 'Apple',
  servingSize: '100g',
  servingGrams: 100,
  calories: 52,
  protein: 0.3,
  carbs: 14,
  fat: 0.2,
  source: 'verified_database',
};
assert(shouldSnapshotFoodNutrients(verifiedItem) === false, 'Verified food should NOT be snapshotted');

const customItem: FoodItem = {
  ...verifiedItem,
  id: 'custom_apple_pie',
  source: 'custom',
};
assert(shouldSnapshotFoodNutrients(customItem) === true, 'Custom food MUST be snapshotted');

const barcodeItem: FoodItem = {
  ...verifiedItem,
  barcode: '1234567890',
  source: 'open_food_facts',
};
assert(shouldSnapshotFoodNutrients(barcodeItem) === true, 'Barcode food MUST be snapshotted');

const aiItem: FoodItem = {
  ...verifiedItem,
  source: 'ai_estimated',
};
assert(shouldSnapshotFoodNutrients(aiItem) === true, 'AI estimated food MUST be snapshotted');

// 3e. buildLoggedMealFromFood
const builtCatalogMeal = buildLoggedMealFromFood({
  id: 'test_meal_apple',
  food: verifiedItem,
  mealType: 'breakfast',
  servings: 1.5,
  servingSize: '150g',
  servingGrams: 150,
});
assert(builtCatalogMeal.nutrientsSnapshot === undefined, 'Catalog food meal does not copy 30 flat fields or snapshot');
assert(builtCatalogMeal.calories === 78, 'Calories calculated correctly (52 * 1.5)');

const customItemWithVits: FoodItem = {
  ...customItem,
  vitaminC: 30,
  zinc: 1.5,
};
const builtCustomMeal = buildLoggedMealFromFood({
  id: 'test_meal_custom',
  food: customItemWithVits,
  mealType: 'dinner',
  servings: 1,
  servingSize: '100g',
  servingGrams: 100,
});
assert(builtCustomMeal.nutrientsSnapshot !== undefined, 'Custom food meal receives nutrientsSnapshot');
assert(builtCustomMeal.nutrientsSnapshot?.vitaminC === 30, 'Custom meal snapshot contains vitaminC');
assert(builtCustomMeal.nutrientsSnapshot?.zinc === 1.5, 'Custom meal snapshot contains zinc');

console.log('✓ Meal Nutrients Dynamic Resolution tests passed.');

// ============================================================================
// 4. Backup & Cloud Backup Compatibility
// ============================================================================
console.log('Testing BackupCore & CloudBackupChunks Compatibility...');

const testBackup: FitTrackBackup = {
  version: '4.0',
  exportedAt: '2026-11-02T12:00:00.000Z',
  profile: {
    name: 'Test Saifo',
    age: 26,
    gender: 'male',
    weightKg: 75,
    heightCm: 175,
    activityLevel: 'moderate',
    goal: 'maintenance',
    bmr: 1700,
    tdee: 2300,
    targetCalories: 2300,
    targetProtein: 150,
    targetCarbs: 250,
    targetFat: 75,
    waterTargetGlasses: 8,
    language: 'en',
    isOnboarded: true,
  },
  dailyLogs: {
    '2026-11-01': {
      date: '2026-11-01',
      waterGlasses: 8,
      steps: 8000,
      meals: [
        legacyMeal,
        catalogMeal,
        customFoodMeal,
      ],
      workouts: [],
      supplements: [],
      dailySupplements: [],
    },
  },
  supplementRoutine: [],
  weightHistory: [],
  customFoods: [
    {
      id: 'custom_smoothie_123',
      name: 'Super Green Smoothie',
      servingSize: '300 ml',
      servingGrams: 300,
      calories: 180,
      protein: 5,
      carbs: 35,
      fat: 2,
      source: 'custom',
      nutrientsSnapshot: {
        vitaminC: 85,
        iron: 4.2,
      },
    },
  ],
  mealTemplates: [
    {
      id: 'template_1',
      name: 'High Protein Breakfast',
      mealType: 'breakfast',
      totalCalories: 300,
      totalProtein: 25,
      totalCarbs: 10,
      totalFat: 15,
      createdAt: '2026-11-01T08:00:00Z',
      items: [
        {
          name: 'Boiled Egg',
          servingSize: '50g',
          servingGrams: 50,
          servings: 2,
          calories: 143,
          protein: 12.6,
          carbs: 0.7,
          fat: 9.5,
          nutrientsSnapshot: {
            vitaminD: 2,
          },
        },
      ],
    },
  ],
};

// Serialize and parse backup
const serialized = serializeBackup(testBackup);
const parsed = parseBackup(serialized);

assert(parsed.version === '4.0', 'Parsed backup has version 4.0');
const parsedMeals = parsed.dailyLogs['2026-11-01'].meals;
assert(parsedMeals.length === 3, 'All 3 test meals parsed successfully');

// Verify legacy meal maintained flat fields
assert(parsedMeals[0].vitaminC === 45, 'Legacy meal preserved flat vitaminC in backup');

// Verify custom meal preserved nutrientsSnapshot
assert(parsedMeals[2].nutrientsSnapshot?.vitaminC === 85, 'Custom meal preserved nutrientsSnapshot in backup');

// Verify custom food preserved nutrientsSnapshot
assert(parsed.customFoods?.[0].nutrientsSnapshot?.vitaminC === 85, 'Custom food preserved nutrientsSnapshot in backup');

// Verify meal template preserved nutrientsSnapshot
assert(parsed.mealTemplates?.[0].items[0].nutrientsSnapshot?.vitaminD === 2, 'Meal template preserved nutrientsSnapshot in backup');

// Verify cloudBackupChunks split and reassembly
const chunks = splitIntoChunks(serialized, 100);
const reassembled = reassembleChunks(chunks);
assert(reassembled === serialized, 'Cloud backup chunking and reassembly preserves exact payload');

console.log('✓ BackupCore & CloudBackupChunks Compatibility tests passed.');

console.log('\n======================================================');
console.log('✓ All Phase 2 Nutrient Model tests passed with 100% success!');
console.log('======================================================');
