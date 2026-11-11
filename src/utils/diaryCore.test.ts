import assert from 'node:assert';
import {
  calculateDiaryBudgetSummary,
  computeHeaderClearanceOffset,
  getMealAccentThemeKey,
  getQuickLogFoodsForMeal,
  groupMealsByType,
  resolveTargetMealForQuickAction,
} from './diaryCore';
import { DailyLog, FoodItem, LoggedMeal, UserProfile } from '../types';

const baseProfile: UserProfile = {
  name: 'Sara',
  age: 28,
  gender: 'female',
  weightKg: 62,
  heightCm: 165,
  activityLevel: 'moderate',
  goal: 'maintenance',
  bmr: 1380,
  tdee: 2140,
  targetCalories: 2000,
  targetProtein: 130,
  targetCarbs: 220,
  targetFat: 65,
  waterTargetGlasses: 8,
  includeWorkoutsInCalorieBudget: false,
};

const makeMeal = (overrides: Partial<LoggedMeal>): LoggedMeal => ({
  id: 'm1',
  foodId: 'f1',
  name: 'Whole Egg',
  mealType: 'breakfast',
  servings: 2,
  servingSize: '1 large egg',
  servingGrams: 100,
  calories: 144,
  protein: 12.6,
  carbs: 0.8,
  fat: 9.6,
  timestamp: '2026-11-11T08:00:00.000Z',
  ...overrides,
});

// 1. Empty day summary
{
  const emptyLog: DailyLog = { date: '2026-11-11', meals: [], waterGlasses: 0, steps: 0 };
  const summary = calculateDiaryBudgetSummary(baseProfile, emptyLog);
  assert.strictEqual(summary.consumedCalories, 0);
  assert.strictEqual(summary.targetCalories, 2000);
  assert.strictEqual(summary.remainingCalories, 2000);
  assert.strictEqual(summary.overCalories, 0);
  assert.strictEqual(summary.isOverBudget, false);
  assert.strictEqual(summary.progressRatio, 0);
  assert.strictEqual(summary.totalCount, 0);
}

// 2. Normal day aggregation + per-meal breakdown + progress clamped at 1
{
  const dayLog: DailyLog = {
    date: '2026-11-11',
    meals: [
      makeMeal({ id: 'b1', mealType: 'breakfast', calories: 420, protein: 28, carbs: 40, fat: 15 }),
      makeMeal({ id: 'b2', mealType: 'breakfast', calories: 180, protein: 6, carbs: 24, fat: 6 }),
      makeMeal({ id: 'l1', mealType: 'lunch', calories: 716, protein: 52, carbs: 64, fat: 22 }),
      makeMeal({ id: 's1', mealType: 'snack', calories: 210, protein: 8, carbs: 25, fat: 9 }),
    ],
    waterGlasses: 4,
    steps: 6000,
  };
  const summary = calculateDiaryBudgetSummary(baseProfile, dayLog);
  assert.strictEqual(summary.consumedCalories, 1526);
  assert.strictEqual(summary.remainingCalories, 474);
  assert.strictEqual(summary.isOverBudget, false);
  assert.strictEqual(summary.mealStats.breakfast.count, 2);
  assert.strictEqual(summary.mealStats.breakfast.calories, 600);
  assert.strictEqual(summary.mealStats.lunch.count, 1);
  assert.strictEqual(summary.mealStats.dinner.count, 0);
  assert.strictEqual(summary.mealStats.snack.count, 1);
  assert.strictEqual(summary.protein, 94);
  assert.strictEqual(summary.carbs, 153);
  assert.strictEqual(summary.fat, 52);
  assert.strictEqual(summary.totalCount, 4);
}

// 3. Over-budget + adaptive activity budget sync
{
  const adaptiveProfile: UserProfile = {
    ...baseProfile,
    includeWorkoutsInCalorieBudget: true,
  };
  const dayLog: DailyLog = {
    date: '2026-11-11',
    meals: [makeMeal({ id: 'd1', mealType: 'dinner', calories: 2500, protein: 140, carbs: 280, fat: 80 })],
    waterGlasses: 6,
    steps: 5000,
    workouts: [
      { id: 'w1', name: 'Run', category: 'cardio', durationMinutes: 30, caloriesBurned: 300, loggedAt: '2026-11-11T17:00:00.000Z' },
    ],
  };
  const summary = calculateDiaryBudgetSummary(adaptiveProfile, dayLog);
  assert.ok(summary.targetCalories > 2000, 'Expected adaptive target to add active burn');
  assert.strictEqual(summary.remainingCalories, 0);
  assert.strictEqual(summary.overCalories, summary.consumedCalories - summary.targetCalories);
  assert.strictEqual(summary.isOverBudget, true);
  assert.strictEqual(summary.progressRatio, 1);
}

// 4. Header scroll clearance offset never goes negative
{
  assert.strictEqual(computeHeaderClearanceOffset(40, 180), 0);
  assert.strictEqual(computeHeaderClearanceOffset(500, 180, 12), 308);
  assert.strictEqual(computeHeaderClearanceOffset(Number.NaN, 150), 0);
}

// 5. Group meals & theme key mapping
{
  const grouped = groupMealsByType([
    makeMeal({ id: '1', mealType: 'dinner' }),
    makeMeal({ id: '2', mealType: 'breakfast' }),
    makeMeal({ id: '3', mealType: 'breakfast' }),
  ]);
  assert.strictEqual(grouped.breakfast.length, 2);
  assert.strictEqual(grouped.dinner.length, 1);
  assert.strictEqual(grouped.lunch.length, 0);
  assert.strictEqual(getMealAccentThemeKey('breakfast').accentKey, 'amber');
  assert.strictEqual(getMealAccentThemeKey('lunch').accentKey, 'emerald');
}

// 6. Quick Log curation deduplicates favorites/recents and orders meal matches
{
  const catalog: FoodItem[] = [
    { id: 'f_salmon', name: 'Grilled Salmon', servingSize: '150g', servingGrams: 150, calories: 310, protein: 34, carbs: 0, fat: 18 },
    { id: 'f_egg', name: 'Boiled Egg', servingSize: '1 egg', servingGrams: 50, calories: 72, protein: 6, carbs: 0.4, fat: 4.8 },
    { id: 'f_apple', name: 'Crisp Apple', servingSize: '1 medium', servingGrams: 180, calories: 95, protein: 0.5, carbs: 25, fat: 0.3 },
  ];
  const favs: FoodItem[] = [
    { id: 'f_egg', name: 'Boiled Egg', servingSize: '1 egg', servingGrams: 50, calories: 72, protein: 6, carbs: 0.4, fat: 4.8 },
  ];
  const list = getQuickLogFoodsForMeal('breakfast', { favorites: favs, catalog, limit: 5 });
  assert.strictEqual(list.length, 3);
  assert.strictEqual(list[0].id, 'f_egg');
}

// 7. Target meal resolution for Quick-Action triggers
{
  assert.strictEqual(resolveTargetMealForQuickAction('dinner', 8), 'dinner');
  assert.strictEqual(resolveTargetMealForQuickAction('all', 8), 'breakfast');
  assert.strictEqual(resolveTargetMealForQuickAction('all', 13), 'lunch');
  assert.strictEqual(resolveTargetMealForQuickAction('all', 19), 'dinner');
  assert.strictEqual(resolveTargetMealForQuickAction('all', 23), 'snack');
}

console.log('diaryCore tests passed!');
