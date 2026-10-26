import assert from 'node:assert';
import { calculatePortionMacros } from './portionCalculation';
import { FoodItem, FoodVariant } from '../../types';

console.log('Starting AddFoodPortionPicker Unit Tests...');

const baseFood: FoodItem = {
  id: 'food_chicken',
  name: 'Chicken Breast',
  category: 'Meat & Poultry',
  calories: 165,
  protein: 31,
  carbs: 0,
  fat: 3.6,
  servingSize: '100g',
  servingGrams: 100,
  source: 'verified_database',
};

// Test 1: Standard 1 serving (100g)
const res1 = calculatePortionMacros(baseFood, 1);
assert.strictEqual(res1.activeCalories, 165);
assert.strictEqual(res1.totalGrams, 100);
assert.strictEqual(res1.scaleRatio, 1);
console.log('✓ Test 1 passed: Standard 1 serving yields 1:1 scale ratio.');

// Test 2: 2.5 servings calculation
const res2 = calculatePortionMacros(baseFood, 2.5);
assert.strictEqual(res2.totalGrams, 250);
assert.strictEqual(res2.scaleRatio, 2.5);
assert.strictEqual(res2.activeCalories * res2.scaleRatio, 412.5);
console.log('✓ Test 2 passed: 2.5 servings scaled accurately.');

// Test 3: Food with variants (e.g. Cooked vs Raw)
const variant: FoodVariant = {
  id: 'var_cooked',
  name: 'Pan Roasted (Cooked)',
  calories: 190,
  protein: 35,
  carbs: 0,
  fat: 4.5,
  servingSize: '150g',
  servingGrams: 150,
};

const res3 = calculatePortionMacros(baseFood, 2, variant);
assert.strictEqual(res3.activeCalories, 190);
assert.strictEqual(res3.activeProtein, 35);
assert.strictEqual(res3.totalGrams, 300); // 150g * 2
assert.strictEqual(res3.scaleRatio, 2); // 300g / 150g
assert.strictEqual(res3.activeCalories * res3.scaleRatio, 380);
console.log('✓ Test 3 passed: FoodVariant macros and scaling overrides take effect.');

// Test 4: PortionUnit and gramsPerUnit
const portionUnitFood: FoodItem = {
  ...baseFood,
  portionUnit: 'piece',
  gramsPerUnit: 120,
};
const res4 = calculatePortionMacros(portionUnitFood, 1.5);
assert.strictEqual(res4.totalGrams, 180); // 120 * 1.5
console.log('✓ Test 4 passed: portionUnit gramsPerUnit respected.');

console.log('All AddFoodPortionPicker Unit Tests PASSED Cleanly!');
