// Setup mock window.localStorage for AsyncStorage in Node
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  copyYesterdayMeals,
  copyYesterdayMealType,
  getYesterdayMealsPreview,
  loadDailyLog,
  saveDailyLog,
} from './storage';
import { LoggedMeal } from '../types';

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

async function runCopyYesterdayIdempotencyTests() {
  console.log('Starting Copy Yesterday Idempotency & Concurrency Tests...');
  await AsyncStorage.clear();

  // Test 1: Empty yesterday
  {
    console.log('Testing Scenario 1: Empty yesterday...');
    const emptyPreview = await getYesterdayMealsPreview('2026-05-10');
    assert(emptyPreview.count === 0, 'Empty preview count must be 0');
    assert(emptyPreview.calories === 0, 'Empty preview calories must be 0');

    const emptyMealTypePreview = await getYesterdayMealsPreview('2026-05-10', 'breakfast');
    assert(emptyMealTypePreview.count === 0, 'Empty meal type preview count must be 0');

    const resAll = await copyYesterdayMeals('2026-05-10');
    assert(resAll.addedCount === 0, 'Added count must be 0 for empty yesterday');
    assert(resAll.alreadyCopiedCount === 0, 'Already copied count must be 0');
    assert(resAll.totalYesterdayCount === 0, 'Total yesterday count must be 0');
    assert(resAll.meals.length === 0, 'No meals in target day');

    const resType = await copyYesterdayMealType('2026-05-10', 'breakfast');
    assert(resType.addedCount === 0, 'Added count must be 0 for empty yesterday meal type');
    assert(resType.meals.length === 0, 'No meals in target day for meal type');
    console.log('✓ Scenario 1 passed: Empty yesterday safely handled with 0 added meals.');
  }

  // Test 2: Double call idempotency
  {
    console.log('Testing Scenario 2: Double call idempotency...');
    const yesterdayDate = '2026-05-11';
    const targetDate = '2026-05-12';

    const meal1: LoggedMeal = {
      id: 'm_yesterday_1',
      foodId: 'f_1',
      name: 'Oatmeal',
      mealType: 'breakfast',
      servings: 1,
      servingSize: '1 bowl',
      servingGrams: 200,
      calories: 350,
      protein: 12,
      carbs: 55,
      fat: 6,
      timestamp: '2026-05-11T08:00:00.000Z',
    };
    const meal2: LoggedMeal = {
      id: 'm_yesterday_2',
      foodId: 'f_2',
      name: 'Grilled Salmon',
      mealType: 'lunch',
      servings: 1,
      servingSize: '1 fillet',
      servingGrams: 180,
      calories: 420,
      protein: 40,
      carbs: 0,
      fat: 25,
      timestamp: '2026-05-11T13:00:00.000Z',
    };

    const yesterdayLog = await loadDailyLog(yesterdayDate);
    await saveDailyLog({
      ...yesterdayLog,
      meals: [meal1, meal2],
    });

    // Verify preview
    const preview = await getYesterdayMealsPreview(targetDate);
    assert(preview.count === 2, `Preview count must be 2, got ${preview.count}`);
    assert(preview.calories === 770, `Preview calories must be 770, got ${preview.calories}`);

    // Call 1
    const res1 = await copyYesterdayMeals(targetDate);
    assert(res1.addedCount === 2, `Expected 2 added meals on call 1, got ${res1.addedCount}`);
    assert(res1.alreadyCopiedCount === 0, 'Already copied count must be 0 on call 1');
    assert(res1.meals.length === 2, `Expected 2 meals in target log, got ${res1.meals.length}`);
    assert(res1.meals[0].copiedFromId === 'm_yesterday_1', 'Cloned meal 1 tracks source id');
    assert(res1.meals[0].copiedFromDate === yesterdayDate, 'Cloned meal 1 tracks source date');
    assert(res1.meals[1].copiedFromId === 'm_yesterday_2', 'Cloned meal 2 tracks source id');
    assert(res1.meals[0].id !== 'm_yesterday_1', 'Cloned meal 1 receives unique new id');

    // Call 2 (double call)
    const res2 = await copyYesterdayMeals(targetDate);
    assert(res2.addedCount === 0, `Expected 0 added meals on call 2, got ${res2.addedCount}`);
    assert(res2.alreadyCopiedCount === 2, `Expected 2 already copied on call 2, got ${res2.alreadyCopiedCount}`);
    assert(res2.meals.length === 2, `Target day meals must remain 2, got ${res2.meals.length}`);

    // Re-verify from persistence
    const reloadedTarget = await loadDailyLog(targetDate);
    assert(reloadedTarget.meals.length === 2, 'Reloaded target must contain exactly 2 meals without duplicates');
    console.log('✓ Scenario 2 passed: Double call is strictly idempotent.');
  }

  // Test 3: Concurrent calls
  {
    console.log('Testing Scenario 3: Concurrent calls under lock queue...');
    const yesterdayDate = '2026-05-13';
    const targetDate = '2026-05-14';

    const meals: LoggedMeal[] = [
      {
        id: 'c_m1',
        foodId: 'f1',
        name: 'Eggs & Toast',
        mealType: 'breakfast',
        servings: 1,
        servingSize: '1 plate',
        servingGrams: 200,
        calories: 380,
        protein: 22,
        carbs: 30,
        fat: 18,
        timestamp: '2026-05-13T08:30:00.000Z',
      },
      {
        id: 'c_m2',
        foodId: 'f2',
        name: 'Chicken Rice',
        mealType: 'lunch',
        servings: 1,
        servingSize: '1 bowl',
        servingGrams: 300,
        calories: 600,
        protein: 45,
        carbs: 65,
        fat: 12,
        timestamp: '2026-05-13T13:30:00.000Z',
      },
      {
        id: 'c_m3',
        foodId: 'f3',
        name: 'Protein Shake',
        mealType: 'snack',
        servings: 1,
        servingSize: '1 scoop',
        servingGrams: 40,
        calories: 160,
        protein: 30,
        carbs: 4,
        fat: 2,
        timestamp: '2026-05-13T17:00:00.000Z',
      },
    ];

    const yesterdayLog = await loadDailyLog(yesterdayDate);
    await saveDailyLog({
      ...yesterdayLog,
      meals,
    });

    // Launch 3 simultaneous overlapping copy requests
    const [c1, c2, c3] = await Promise.all([
      copyYesterdayMeals(targetDate),
      copyYesterdayMeals(targetDate),
      copyYesterdayMeals(targetDate),
    ]);

    const totalAdded = c1.addedCount + c2.addedCount + c3.addedCount;
    assert(totalAdded === 3, `Total meals added across concurrent calls must be exactly 3, got ${totalAdded}`);

    // Verify storage state
    const saved = await loadDailyLog(targetDate);
    assert(saved.meals.length === 3, `Stored meals must be exactly 3, got ${saved.meals.length}`);
    const sourceIds = saved.meals.map((m) => m.copiedFromId);
    assert(sourceIds.includes('c_m1') && sourceIds.includes('c_m2') && sourceIds.includes('c_m3'), 'All 3 source meals copied');
    console.log('✓ Scenario 3 passed: Concurrent calls execute safely without duplication.');
  }

  // Test 4: Partial overlap between copyYesterdayMealType and copyYesterdayMeals
  {
    console.log('Testing Scenario 4: Partial overlap...');
    const yesterdayDate = '2026-05-15';
    const targetDate = '2026-05-16';

    const mealBreakfast: LoggedMeal = {
      id: 'po_b1',
      foodId: 'f_b1',
      name: 'Greek Yogurt & Berries',
      mealType: 'breakfast',
      servings: 1,
      servingSize: '200g',
      servingGrams: 200,
      calories: 220,
      protein: 20,
      carbs: 25,
      fat: 2,
      timestamp: '2026-05-15T08:00:00.000Z',
    };
    const mealLunch: LoggedMeal = {
      id: 'po_l1',
      foodId: 'f_l1',
      name: 'Steak & Potatoes',
      mealType: 'lunch',
      servings: 1,
      servingSize: '1 plate',
      servingGrams: 350,
      calories: 680,
      protein: 52,
      carbs: 45,
      fat: 30,
      timestamp: '2026-05-15T13:00:00.000Z',
    };
    const mealDinner: LoggedMeal = {
      id: 'po_d1',
      foodId: 'f_d1',
      name: 'Lentil Soup',
      mealType: 'dinner',
      servings: 1,
      servingSize: '1 bowl',
      servingGrams: 300,
      calories: 340,
      protein: 18,
      carbs: 50,
      fat: 6,
      timestamp: '2026-05-15T19:30:00.000Z',
    };

    const yesterdayLog = await loadDailyLog(yesterdayDate);
    await saveDailyLog({
      ...yesterdayLog,
      meals: [mealBreakfast, mealLunch, mealDinner],
    });

    // Step A: Copy only breakfast first
    const resB = await copyYesterdayMealType(targetDate, 'breakfast');
    assert(resB.addedCount === 1, `Expected 1 meal added for breakfast, got ${resB.addedCount}`);
    assert(resB.meals.length === 1, 'Target now has 1 meal');
    assert(resB.meals[0].name === 'Greek Yogurt & Berries', 'Breakfast meal copied correctly');

    // Step B: Now copy all yesterday meals (partial overlap: breakfast already copied, lunch + dinner remaining)
    const resAll = await copyYesterdayMeals(targetDate);
    assert(resAll.addedCount === 2, `Expected exactly 2 remaining meals added, got ${resAll.addedCount}`);
    assert(resAll.alreadyCopiedCount === 1, `Expected 1 already copied meal skipped, got ${resAll.alreadyCopiedCount}`);
    assert(resAll.meals.length === 3, `Target log now contains all 3 distinct meals, got ${resAll.meals.length}`);

    // Step C: Try copying lunch again
    const resLunchAgain = await copyYesterdayMealType(targetDate, 'lunch');
    assert(resLunchAgain.addedCount === 0, 'Lunch was already copied, addedCount must be 0');
    assert(resLunchAgain.alreadyCopiedCount === 1, 'Lunch already copied must be 1');
    assert(resLunchAgain.meals.length === 3, 'Target log count remains 3');

    // Step D: Try copying all meals again
    const resAllAgain = await copyYesterdayMeals(targetDate);
    assert(resAllAgain.addedCount === 0, 'All meals already copied, addedCount must be 0');
    assert(resAllAgain.alreadyCopiedCount === 3, 'All 3 meals marked as already copied');
    assert(resAllAgain.meals.length === 3, 'Target log count remains 3');

    console.log('✓ Scenario 4 passed: Partial overlap correctly skips already cloned meals.');
  }

  console.log('All Copy Yesterday Idempotency & Concurrency Tests Passed Successfully!');
}

runCopyYesterdayIdempotencyTests().catch((err) => {
  console.error('Copy yesterday idempotency tests failed:', err);
  (process as any).exit(1);
});
