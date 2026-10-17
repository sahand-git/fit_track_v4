// Setup mock window.localStorage for AsyncStorage in Node
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  addRecentFood,
  loadRecentFoods,
  toggleFavoriteFood,
  loadFavoriteFoods,
  addCustomFood,
  loadCustomFoods,
  deleteCustomFood,
  copyYesterdayMeals,
  loadDailyLog,
  saveDailyLog,
  restoreAllData,
  loadUserProfile,
} from './storage';
import { FoodItem, LoggedMeal, FitTrackBackup } from '../types';

const mockStore: Record<string, string> = {};
(globalThis as any).window = {
  localStorage: {
    getItem: (k: string) => mockStore[k] ?? null,
    setItem: (k: string, v: string) => { mockStore[k] = String(v); },
    removeItem: (k: string) => { delete mockStore[k]; },
    clear: () => { Object.keys(mockStore).forEach((k) => delete mockStore[k]); },
    key: (i: number) => Object.keys(mockStore)[i] ?? null,
    get length() { return Object.keys(mockStore).length; },
  },
};

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

async function runFoodCollectionsTests() {
  console.log('Starting Food Collections & Copy Yesterday Storage Tests...');
  await AsyncStorage.clear();

  // Test 1: Recent foods - add, deduplicate, limit to 30
  {
    const foodA: FoodItem = {
      id: 'f_1',
      name: 'Chicken Breast',
      servingSize: '100g',
      servingGrams: 100,
      calories: 165,
      protein: 31,
      carbs: 0,
      fat: 3.6,
    };
    const foodB: FoodItem = {
      id: 'f_2',
      name: 'White Rice',
      servingSize: '1 cup',
      servingGrams: 150,
      calories: 200,
      protein: 4,
      carbs: 45,
      fat: 0.5,
    };

    await addRecentFood(foodA);
    await addRecentFood(foodB);

    let recent = await loadRecentFoods();
    assert(recent.length === 2, 'Two recent foods saved');
    assert(recent[0].id === 'f_2', 'Latest added food is at the front');

    // Adding duplicate by name or id moves it to front
    const foodADup: FoodItem = { ...foodA, id: 'f_different_id', name: 'chicken breast ' };
    await addRecentFood(foodADup);

    recent = await loadRecentFoods();
    assert(recent.length === 2, 'Deduplicates recent foods by case-insensitive name');
    assert(recent[0].name.trim().toLowerCase() === 'chicken breast', 'Deduplicated food moved to front');

    // Limit to 30 items
    for (let i = 1; i <= 35; i++) {
      await addRecentFood({
        id: `f_bulk_${i}`,
        name: `Food Item ${i}`,
        servingSize: '1 portion',
        servingGrams: 100,
        calories: 100 + i,
        protein: 10,
        carbs: 10,
        fat: 1,
      });
    }

    recent = await loadRecentFoods();
    assert(recent.length === 30, 'Recent foods list is capped at 30 items');
    assert(recent[0].id === 'f_bulk_35', 'Most recent item is at front');
    console.log('✓ Test 1 passed: Recent foods addition, deduplication, and 30-item limit verified.');
  }

  // Test 2: Favorite foods toggle
  {
    const favItem: FoodItem = {
      id: 'fav_apple',
      name: 'Honeycrisp Apple',
      servingSize: '1 medium',
      servingGrams: 182,
      calories: 95,
      protein: 0.5,
      carbs: 25,
      fat: 0.3,
    };

    const res1 = await toggleFavoriteFood(favItem);
    assert(res1.isFavorite === true, 'Toggling new food sets isFavorite true');
    assert(res1.favorites.length === 1, 'Favorite list has 1 item');

    let loadedFavs = await loadFavoriteFoods();
    assert(loadedFavs.length === 1 && loadedFavs[0].id === 'fav_apple', 'Loaded favorite foods matches');

    // Toggle again to remove
    const res2 = await toggleFavoriteFood(favItem);
    assert(res2.isFavorite === false, 'Toggling existing food sets isFavorite false');
    assert(res2.favorites.length === 0, 'Favorite list becomes empty');

    loadedFavs = await loadFavoriteFoods();
    assert(loadedFavs.length === 0, 'Loaded favorite foods is empty after untoggle');
    console.log('✓ Test 2 passed: Favorite foods toggle add and remove verified.');
  }

  // Test 3: Custom foods add and delete
  {
    const custom1: FoodItem = {
      id: 'custom_shake',
      name: 'Saif Homemade Protein Shake',
      servingSize: '500ml',
      servingGrams: 500,
      calories: 450,
      protein: 50,
      carbs: 30,
      fat: 12,
      source: 'custom',
    };
    const custom2: FoodItem = {
      id: 'custom_snack',
      name: 'Kurdish Walnut Date Roll',
      servingSize: '2 rolls',
      servingGrams: 80,
      calories: 220,
      protein: 4,
      carbs: 35,
      fat: 9,
      source: 'custom',
    };

    await addCustomFood(custom1);
    await addCustomFood(custom2);

    let customs = await loadCustomFoods();
    assert(customs.length === 2, 'Two custom foods saved');
    assert(customs[0].id === 'custom_snack', 'Last added custom food is first');

    await deleteCustomFood('custom_shake');
    customs = await loadCustomFoods();
    assert(customs.length === 1 && customs[0].id === 'custom_snack', 'deleteCustomFood removes correct item');
    console.log('✓ Test 3 passed: Custom foods add and delete verified.');
  }

  // Test 4: copyYesterdayMeals
  {
    const yesterdayDate = '2026-10-14';
    const todayDate = '2026-10-15';

    const meal1: LoggedMeal = {
      id: 'meal_yesterday_1',
      foodId: 'food_eggs',
      name: 'Scrambled Eggs with Feta',
      mealType: 'breakfast',
      servings: 1,
      servingSize: '2 eggs',
      servingGrams: 140,
      calories: 210,
      protein: 16,
      carbs: 2,
      fat: 15,
      timestamp: '2026-10-14T08:30:00Z',
    };
    const meal2: LoggedMeal = {
      id: 'meal_yesterday_2',
      foodId: 'food_bowl',
      name: 'Chicken Rice Bowl',
      mealType: 'lunch',
      servings: 1,
      servingSize: '1 bowl',
      servingGrams: 350,
      calories: 520,
      protein: 42,
      carbs: 60,
      fat: 12,
      timestamp: '2026-10-14T13:00:00Z',
    };

    // Save yesterday's log with 2 meals
    await saveDailyLog({
      date: yesterdayDate,
      waterGlasses: 6,
      steps: 8000,
      meals: [meal1, meal2],
    });

    // Today initially has 1 snack
    const existingTodayMeal: LoggedMeal = {
      id: 'meal_today_snack',
      foodId: 'food_almonds',
      name: 'Almonds',
      mealType: 'snack',
      servings: 1,
      servingSize: '30g',
      servingGrams: 30,
      calories: 170,
      protein: 6,
      carbs: 6,
      fat: 15,
      timestamp: '2026-10-15T10:00:00Z',
    };
    await saveDailyLog({
      date: todayDate,
      waterGlasses: 2,
      steps: 1200,
      meals: [existingTodayMeal],
    });

    // Copy yesterday's meals to today
    const updatedToday = await copyYesterdayMeals(todayDate);
    assert(updatedToday.meals.length === 3, 'Today now has 3 meals (1 existing + 2 copied)');
    assert(updatedToday.meals[0].id === 'meal_today_snack', 'Existing meal was preserved');
    assert(updatedToday.meals[1].name === 'Scrambled Eggs with Feta', 'Copied meal 1 name matches');
    assert(updatedToday.meals[1].id !== 'meal_yesterday_1', 'Copied meal 1 was given a new unique id');
    assert(updatedToday.meals[2].name === 'Chicken Rice Bowl', 'Copied meal 2 name matches');
    assert(updatedToday.meals[2].id !== 'meal_yesterday_2', 'Copied meal 2 was given a new unique id');

    // Verify yesterday's log is completely unaltered
    const yesterdayCheck = await loadDailyLog(yesterdayDate);
    assert(yesterdayCheck.meals.length === 2, 'Yesterday still has 2 meals');
    assert(yesterdayCheck.meals[0].id === 'meal_yesterday_1', 'Yesterday meal 1 id unaltered');

    // If yesterday has no meals, copying leaves target unchanged
    const emptyDay = '2026-10-13';
    await saveDailyLog({ date: emptyDay, waterGlasses: 0, steps: 0, meals: [] });
    const targetDayAfter = '2026-10-14';
    const beforeLog = await loadDailyLog(targetDayAfter);
    const afterCopy = await copyYesterdayMeals(targetDayAfter);
    assert(afterCopy.meals.length === beforeLog.meals.length, 'Empty yesterday preserves target meals');
    console.log('✓ Test 4 passed: copyYesterdayMeals clones meals with new IDs and preserves both days.');
  }

  // Test 5: Backup restore roundtrip with replace and merge
  {
    const profile = await loadUserProfile();
    const backup: FitTrackBackup = {
      version: '4.0',
      exportedAt: '2026-10-15T12:00:00Z',
      profile,
      dailyLogs: {},
      supplementRoutine: [],
      weightHistory: [],
      recentFoods: [
        {
          id: 'b_recent_1',
          name: 'Backup Oatmeal',
          servingSize: '1 bowl',
          servingGrams: 80,
          calories: 300,
          protein: 10,
          carbs: 54,
          fat: 5,
        },
      ],
      favoriteFoods: [
        {
          id: 'b_fav_1',
          name: 'Backup Greek Yogurt',
          servingSize: '1 cup',
          servingGrams: 170,
          calories: 130,
          protein: 22,
          carbs: 6,
          fat: 0,
        },
      ],
      customFoods: [
        {
          id: 'b_custom_1',
          name: 'Backup High Protein Bar',
          servingSize: '1 bar',
          servingGrams: 60,
          calories: 200,
          protein: 20,
          carbs: 15,
          fat: 6,
          source: 'custom',
        },
      ],
    };

    // Replace restore
    await restoreAllData(backup, 'replace');
    let rec = await loadRecentFoods();
    let fav = await loadFavoriteFoods();
    let cus = await loadCustomFoods();
    assert(rec.length === 1 && rec[0].name === 'Backup Oatmeal', 'Replace restore restored recent foods');
    assert(fav.length === 1 && fav[0].name === 'Backup Greek Yogurt', 'Replace restore restored favorite foods');
    assert(cus.length === 1 && cus[0].name === 'Backup High Protein Bar', 'Replace restore restored custom foods');

    // Merge restore with incoming new food
    const mergeBackup: FitTrackBackup = {
      ...backup,
      recentFoods: [
        ...backup.recentFoods!,
        {
          id: 'b_recent_2',
          name: 'Merged Banana',
          servingSize: '1 banana',
          servingGrams: 120,
          calories: 105,
          protein: 1.3,
          carbs: 27,
          fat: 0.3,
        },
      ],
      favoriteFoods: [
        ...backup.favoriteFoods!,
        {
          id: 'b_fav_2',
          name: 'Merged Peanut Butter',
          servingSize: '2 tbsp',
          servingGrams: 32,
          calories: 190,
          protein: 8,
          carbs: 7,
          fat: 16,
        },
      ],
      customFoods: [
        ...backup.customFoods!,
        {
          id: 'b_custom_2',
          name: 'Merged Smoothie',
          servingSize: '1 glass',
          servingGrams: 300,
          calories: 250,
          protein: 15,
          carbs: 40,
          fat: 3,
          source: 'custom',
        },
      ],
    };

    await restoreAllData(mergeBackup, 'merge');
    rec = await loadRecentFoods();
    fav = await loadFavoriteFoods();
    cus = await loadCustomFoods();
    assert(rec.length === 2, 'Merge restore merged recent foods without duplicates');
    assert(fav.length === 2, 'Merge restore merged favorite foods without duplicates');
    assert(cus.length === 2, 'Merge restore merged custom foods without duplicates');
    console.log('✓ Test 5 passed: Replace and merge restore for food collections verified.');
  }

  console.log('All food collections and copy yesterday tests passed successfully!');
}

runFoodCollectionsTests().catch((err) => {
  console.error('Food collections tests failed:', err);
  process.exit(1);
});
