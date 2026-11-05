import {
  createInitialSessionState,
  addMealToSession,
  undoLastSessionMeal,
  calculatePortionNutrition,
  filterAndRankFoods,
  getMealTypeLabel,
} from './AddFoodScreenCore';
import { FoodItem, LoggedMeal } from '../types';

console.log('Starting AddFoodScreenCore Unit Tests...');

// Mock foods
const apple: FoodItem = {
  id: 'apple_1',
  name: 'Fresh Red Apple',
  servingSize: '1 medium (182g)',
  servingGrams: 182,
  calories: 95,
  protein: 0.5,
  carbs: 25.1,
  fat: 0.3,
  variants: [
    { id: 'apple_sm', name: 'Small', servingSize: '1 small (150g)', servingGrams: 150, calories: 77, protein: 0.4, carbs: 20.6, fat: 0.2 },
    { id: 'apple_100', name: '100g', servingSize: '100g', servingGrams: 100, calories: 52, protein: 0.3, carbs: 13.8, fat: 0.2 },
  ],
};

const chicken: FoodItem = {
  id: 'chicken_breast',
  name: 'Grilled Chicken Breast',
  servingSize: '100g cooked',
  servingGrams: 100,
  calories: 165,
  protein: 31,
  carbs: 0,
  fat: 3.6,
};

const biryani: FoodItem = {
  id: 'iraqi_biryani',
  name: 'Iraqi Chicken Biryani (برياني دجاج عراقي)',
  servingSize: '1 plate (350g)',
  servingGrams: 350,
  calories: 520,
  protein: 28,
  carbs: 62,
  fat: 16,
  source: 'regional_culinary_estimate',
  recipeEstimate: true,
  ingredients: [
    { name: 'Rice', grams: 150, source: 'USDA' },
    { name: 'Chicken', grams: 120, source: 'USDA' },
    { name: 'Cardamom', grams: 5, source: 'USDA' },
    { name: 'Potatoes', grams: 75, source: 'USDA' },
  ],
};

// Test 1: createInitialSessionState
const initial = createInitialSessionState();
if (initial.addedItems.length !== 0 || initial.totalCalories !== 0) {
  throw new Error('Test 1 Failed: initial session state should be empty');
}
console.log('✓ Test 1: Initial session state is empty');

// Test 2: addMealToSession
const meal1: LoggedMeal = {
  id: 'meal_1',
  foodId: apple.id,
  name: 'Fresh Red Apple',
  calories: 95,
  protein: 0.5,
  carbs: 25.1,
  fat: 0.3,
  mealType: 'breakfast',
  servings: 1,
  servingSize: '1 medium (182g)',
  servingGrams: 182,
  timestamp: new Date().toISOString(),
};

const state1 = addMealToSession(initial, meal1, apple);
if (state1.addedItems.length !== 1 || state1.totalCalories !== 95 || state1.totalProtein !== 0.5) {
  throw new Error(`Test 2 Failed: expected 1 item and 95 kcal, got ${state1.totalCalories}`);
}
console.log('✓ Test 2: Adding 1st meal updates total calories and macros');

// Test 3: add second meal
const meal2: LoggedMeal = {
  id: 'meal_2',
  foodId: chicken.id,
  name: 'Grilled Chicken Breast',
  calories: 165,
  protein: 31,
  carbs: 0,
  fat: 3.6,
  mealType: 'breakfast',
  servings: 1,
  servingSize: '100g cooked',
  servingGrams: 100,
  timestamp: new Date().toISOString(),
};

const state2 = addMealToSession(state1, meal2, chicken);
if (state2.addedItems.length !== 2 || state2.totalCalories !== 260 || state2.totalProtein !== 31.5) {
  throw new Error(`Test 3 Failed: expected 2 items, 260 kcal, got ${state2.totalCalories} kcal, ${state2.totalProtein}g P`);
}
console.log('✓ Test 3: Adding 2nd meal accumulates correctly');

// Test 4: undoLastSessionMeal
const undoRes1 = undoLastSessionMeal(state2);
if (undoRes1.removedMealId !== 'meal_2' || undoRes1.updatedState.addedItems.length !== 1 || undoRes1.updatedState.totalCalories !== 95) {
  throw new Error(`Test 4 Failed: undo should revert to 1 item and 95 kcal, got ${undoRes1.updatedState.totalCalories}`);
}
console.log('✓ Test 4: Undo removes last meal and recalculates totals');

// Test 5: undo on empty state
const undoEmpty = undoLastSessionMeal(initial);
if (undoEmpty.removedMealId !== null || undoEmpty.updatedState.addedItems.length !== 0) {
  throw new Error('Test 5 Failed: undo on empty state should be no-op');
}
console.log('✓ Test 5: Undo on empty state safely returns null and preserves state');

// Test 6: calculatePortionNutrition with default variant and 1 serving
const portion1 = calculatePortionNutrition(apple, null, 1);
if (portion1.calories !== 95 || portion1.protein !== 0.5 || portion1.displayServing !== '1 medium (182g)') {
  throw new Error(`Test 6 Failed: standard portion calculation mismatch`);
}
console.log('✓ Test 6: Standard portion nutrition matches base item');

// Test 7: calculatePortionNutrition with variant and 2.5 servings
const portion2 = calculatePortionNutrition(apple, apple.variants![0], 2.5);
// variant 77 kcal * 2.5 = 192.5 -> 193 kcal
if (portion2.calories !== 193 || portion2.displayServing !== '2.5 × 1 small (150g)') {
  throw new Error(`Test 7 Failed: variant multiplier mismatch: got ${portion2.calories}`);
}
console.log('✓ Test 7: Variant nutrition with 2.5 multiplier calculated correctly');

// Test 8: filterAndRankFoods with search query
const filtered = filterAndRankFoods({
  allFoods: [apple, chicken, biryani],
  recentFoods: [apple],
  frequentFoods: [],
  favoriteFoods: [],
  customFoods: [],
  barcodeCache: [],
  searchQuery: 'برياني',
  activeFilter: 'all',
  activeCategory: 'All',
});

if (filtered.length !== 1 || filtered[0].id !== 'iraqi_biryani') {
  throw new Error('Test 8 Failed: Arabic search query should rank Iraqi Chicken Biryani first');
}
console.log('✓ Test 8: Multilingual search query ranking matches regional food correctly');

// Test 9: filter by regional filter
const regionalOnly = filterAndRankFoods({
  allFoods: [apple, chicken, biryani],
  recentFoods: [],
  frequentFoods: [],
  favoriteFoods: [],
  customFoods: [],
  barcodeCache: [],
  searchQuery: '',
  activeFilter: 'regional',
  activeCategory: 'All',
});

if (regionalOnly.length !== 1 || regionalOnly[0].id !== 'iraqi_biryani') {
  throw new Error('Test 9 Failed: regional filter should return only regional foods');
}
console.log('✓ Test 9: Regional filter returns verified regional items');

// Test 10: getMealTypeLabel
if (getMealTypeLabel('breakfast') !== 'Breakfast' || getMealTypeLabel('lunch') !== 'Lunch') {
  throw new Error('Test 10 Failed: meal type label mapping failed');
}
console.log('✓ Test 10: Meal type labels format cleanly');

console.log('====================================================');
console.log('All AddFoodScreenCore Unit Tests Passed Cleanly!');
console.log('====================================================');
