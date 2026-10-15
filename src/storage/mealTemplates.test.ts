// Setup mock window.localStorage for AsyncStorage in Node
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

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  loadMealTemplates,
  saveMealTemplate,
  deleteMealTemplate,
  createTemplateFromMeals,
  copyYesterdayMealType,
  getFrequentFoods,
  saveDailyLog,
  loadDailyLog,
  restoreAllData,
  saveUserProfile,
} from './storage';
import { createBackupPayload } from '../services/backupService';
import { computeBackupSummary } from '../utils/backupCore';
import { LoggedMeal, DailyLog, MealTemplate, FitTrackBackup } from '../types';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

async function runMealTemplatesTests() {
  console.log('Starting Meal Templates, Copy Yesterday MealType, & Frequent Foods Tests...');
  await AsyncStorage.clear();

  // Test 1: createTemplateFromMeals
  {
    const meal1: LoggedMeal = {
      id: 'm1',
      foodId: 'f_samoon',
      name: 'Diamond Stone Samoon',
      mealType: 'breakfast',
      servings: 2,
      servingSize: '1 samoon (90g)',
      servingGrams: 180,
      calories: 470,
      protein: 15,
      carbs: 96,
      fat: 2.4,
      portionUnit: 'samoon',
      gramsPerUnit: 90,
      timestamp: '2026-10-15T08:00:00Z',
    };
    const meal2: LoggedMeal = {
      id: 'm2',
      foodId: 'f_kahi',
      name: 'Kahi with Buffalo Qaimar & Honey',
      mealType: 'breakfast',
      servings: 1,
      servingSize: '1 pastry & cream (150g)',
      servingGrams: 150,
      calories: 530,
      protein: 6,
      carbs: 52,
      fat: 34,
      portionUnit: 'piece',
      gramsPerUnit: 150,
      isEstimate: true,
      timestamp: '2026-10-15T08:15:00Z',
    };

    const template = createTemplateFromMeals('Iraqi Friday Breakfast', 'breakfast', [meal1, meal2]);
    assert(template.name === 'Iraqi Friday Breakfast', 'Template name matches');
    assert(template.mealType === 'breakfast', 'MealType matches');
    assert(template.items.length === 2, 'Has 2 items');
    assert(template.totalCalories === 1000, `Calories match 1000, got ${template.totalCalories}`);
    assert(template.totalProtein === 21, `Protein matches 21, got ${template.totalProtein}`);
    assert(template.totalCarbs === 148, `Carbs match 148, got ${template.totalCarbs}`);
    assert(template.totalFat === 36.4, `Fat matches 36.4, got ${template.totalFat}`);
    assert(template.items[0].portionUnit === 'samoon', 'Item 1 portionUnit preserved');
    assert(template.items[1].isEstimate === true, 'Item 2 isEstimate preserved');
    console.log('✓ Test 1 passed: createTemplateFromMeals aggregates macros and items correctly.');
  }

  // Test 2: saveMealTemplate, loadMealTemplates, deleteMealTemplate
  {
    const t1: MealTemplate = {
      id: 'tmpl_1',
      name: 'High Protein Lunch',
      mealType: 'lunch',
      items: [
        {
          name: 'Grilled Chicken Breast',
          servingSize: '200g',
          servingGrams: 200,
          servings: 2,
          calories: 330,
          protein: 62,
          carbs: 0,
          fat: 7.2,
        },
      ],
      totalCalories: 330,
      totalProtein: 62,
      totalCarbs: 0,
      totalFat: 7.2,
      createdAt: '2026-10-15T12:00:00Z',
    };

    const t2: MealTemplate = {
      id: 'tmpl_2',
      name: 'Kurdish Dinner Feast',
      mealType: 'dinner',
      items: [
        {
          name: 'Iraqi Dolma / Kurdish Yaprax',
          servingSize: '5 pieces',
          servingGrams: 150,
          servings: 2,
          calories: 520,
          protein: 18,
          carbs: 62,
          fat: 23,
          portionUnit: 'piece',
          gramsPerUnit: 30,
          isEstimate: true,
        },
      ],
      totalCalories: 520,
      totalProtein: 18,
      totalCarbs: 62,
      totalFat: 23,
      createdAt: '2026-10-15T19:00:00Z',
    };

    await saveMealTemplate(t1);
    await saveMealTemplate(t2);

    let templates = await loadMealTemplates();
    assert(templates.length === 2, `Expected 2 templates, got ${templates.length}`);
    assert(templates[0].id === 'tmpl_2', 'Latest saved template is at the front');

    // Update existing template by ID
    const updatedT1: MealTemplate = { ...t1, name: 'Ultra High Protein Lunch' };
    await saveMealTemplate(updatedT1);
    templates = await loadMealTemplates();
    assert(templates.length === 2, 'Template count unchanged when updating by ID');
    assert(templates[0].name === 'Ultra High Protein Lunch', 'Updated template moved to front with new name');

    // Delete template
    await deleteMealTemplate('tmpl_2');
    templates = await loadMealTemplates();
    assert(templates.length === 1 && templates[0].id === 'tmpl_1', 'deleteMealTemplate removes specified template');
    console.log('✓ Test 2 passed: Template saving, updating, and deletion verified.');
  }

  // Test 3: copyYesterdayMealType
  {
    const yesterdayDate = '2026-10-14';
    const targetDate = '2026-10-15';

    const b1: LoggedMeal = {
      id: 'yesterday_b1',
      foodId: 'f_eggs',
      name: 'Boiled Eggs',
      mealType: 'breakfast',
      servings: 2,
      servingSize: '2 eggs',
      servingGrams: 100,
      calories: 144,
      protein: 12.6,
      carbs: 0.8,
      fat: 9.6,
      timestamp: '2026-10-14T08:00:00Z',
    };
    const l1: LoggedMeal = {
      id: 'yesterday_l1',
      foodId: 'f_tashreeb',
      name: 'Lamb Tashreeb Broth & Samoon',
      mealType: 'lunch',
      servings: 1,
      servingSize: '1 bowl',
      servingGrams: 400,
      calories: 580,
      protein: 38,
      carbs: 45,
      fat: 27,
      timestamp: '2026-10-14T13:00:00Z',
    };

    await saveDailyLog({
      date: yesterdayDate,
      waterGlasses: 4,
      steps: 5000,
      meals: [b1, l1],
    });

    // Today initially has a snack
    const s1: LoggedMeal = {
      id: 'today_s1',
      foodId: 'f_apple',
      name: 'Green Apple',
      mealType: 'snack',
      servings: 1,
      servingSize: '1 medium',
      servingGrams: 150,
      calories: 80,
      protein: 0.4,
      carbs: 21,
      fat: 0.2,
      timestamp: '2026-10-15T10:00:00Z',
    };
    await saveDailyLog({
      date: targetDate,
      waterGlasses: 2,
      steps: 1000,
      meals: [s1],
    });

    // Copy only breakfast from yesterday
    const updatedLog = await copyYesterdayMealType(targetDate, 'breakfast');
    assert(updatedLog.meals.length === 2, `Expected 2 meals (snack + copied breakfast), got ${updatedLog.meals.length}`);
    assert(updatedLog.meals[0].id === 'today_s1', 'Existing snack preserved');
    assert(updatedLog.meals[1].name === 'Boiled Eggs', 'Copied meal is Boiled Eggs');
    assert(updatedLog.meals[1].mealType === 'breakfast', 'Copied meal type is breakfast');
    assert(updatedLog.meals[1].id !== 'yesterday_b1', 'Copied meal assigned fresh unique ID');

    // Calling copy yesterday for dinner (which was empty yesterday) leaves today untouched
    const noDinnerLog = await copyYesterdayMealType(targetDate, 'dinner');
    assert(noDinnerLog.meals.length === 2, 'No meals copied when yesterday had no dinner');

    // Verify yesterday's log is completely unmutated
    const yesterdayCheck = await loadDailyLog(yesterdayDate);
    assert(yesterdayCheck.meals.length === 2, "Yesterday's log unchanged");
    assert(yesterdayCheck.meals[0].id === 'yesterday_b1', "Yesterday's IDs intact");
    console.log('✓ Test 3 passed: copyYesterdayMealType filters accurately and clones non-destructively.');
  }

  // Test 4: getFrequentFoods
  {
    const mockDailyLogs: Record<string, DailyLog> = {
      '2026-10-10': {
        date: '2026-10-10',
        waterGlasses: 8,
        steps: 8000,
        meals: [
          {
            id: 'm_10_1',
            foodId: 'food_chicken',
            name: 'Grilled Chicken Breast',
            mealType: 'lunch',
            servings: 1,
            servingSize: '100g',
            servingGrams: 100,
            calories: 165,
            protein: 31,
            carbs: 0,
            fat: 3.6,
            timestamp: '2026-10-10T12:00:00Z',
          },
          {
            id: 'm_10_2',
            foodId: 'food_samoon',
            name: 'Diamond Stone Samoon',
            mealType: 'breakfast',
            servings: 1,
            servingSize: '1 samoon (90g)',
            servingGrams: 90,
            calories: 235,
            protein: 7.5,
            carbs: 48,
            fat: 1.2,
            portionUnit: 'samoon',
            gramsPerUnit: 90,
            timestamp: '2026-10-10T08:00:00Z',
          },
        ],
      },
      '2026-10-11': {
        date: '2026-10-11',
        waterGlasses: 8,
        steps: 8000,
        meals: [
          {
            id: 'm_11_1',
            foodId: 'food_chicken',
            name: 'Grilled Chicken Breast',
            mealType: 'dinner',
            servings: 2,
            servingSize: '100g',
            servingGrams: 200,
            calories: 330,
            protein: 62,
            carbs: 0,
            fat: 7.2,
            timestamp: '2026-10-11T19:00:00Z',
          },
          {
            id: 'm_11_2',
            foodId: 'food_samoon',
            name: 'Diamond Stone Samoon',
            mealType: 'breakfast',
            servings: 1,
            servingSize: '1 samoon (90g)',
            servingGrams: 90,
            calories: 235,
            protein: 7.5,
            carbs: 48,
            fat: 1.2,
            portionUnit: 'samoon',
            gramsPerUnit: 90,
            timestamp: '2026-10-11T08:00:00Z',
          },
        ],
      },
      '2026-10-12': {
        date: '2026-10-12',
        waterGlasses: 8,
        steps: 8000,
        meals: [
          {
            id: 'm_12_1',
            foodId: 'food_chicken',
            name: 'Grilled Chicken Breast',
            mealType: 'lunch',
            servings: 1,
            servingSize: '100g',
            servingGrams: 100,
            calories: 165,
            protein: 31,
            carbs: 0,
            fat: 3.6,
            timestamp: '2026-10-12T13:00:00Z',
          },
        ],
      },
    };

    const frequent = getFrequentFoods(mockDailyLogs, 5);
    assert(frequent.length === 2, `Expected 2 frequent foods, got ${frequent.length}`);
    assert(frequent[0].id === 'food_chicken', 'Chicken is #1 most frequent (logged 3 times)');
    assert(frequent[1].id === 'food_samoon', 'Samoon is #2 most frequent (logged 2 times)');
    // Check normalized unit values:
    assert(frequent[0].calories === 165, `Chicken calories normalized to 1 portion (165), got ${frequent[0].calories}`);
    assert(frequent[1].portionUnit === 'samoon', 'Samoon portionUnit preserved in frequent foods');
    console.log('✓ Test 4 passed: getFrequentFoods ranks and normalizes foods by frequency correctly.');
  }

  // Test 5: Backup & Restore with mealTemplates
  {
    await saveUserProfile({
      name: 'Saif Al-Iraqi',
      age: 28,
      gender: 'male',
      weightKg: 78,
      heightCm: 178,
      activityLevel: 'moderate',
      goal: 'muscle_gain',
      bmr: 1750,
      tdee: 2400,
      targetCalories: 2600,
      targetProtein: 160,
      targetCarbs: 320,
      targetFat: 70,
      waterTargetGlasses: 10,
    });

    const backupPayload = await createBackupPayload();
    assert(Array.isArray(backupPayload.mealTemplates), 'Backup payload includes mealTemplates array');
    assert(backupPayload.mealTemplates!.length === 1, 'Backup payload includes saved template');

    const summary = computeBackupSummary(backupPayload);
    assert(summary.templatesCount === 1, `Backup summary templatesCount is 1, got ${summary.templatesCount}`);

    // Test restore in replace mode
    const replacementBackup: FitTrackBackup = {
      ...backupPayload,
      mealTemplates: [
        {
          id: 'restored_tmpl_1',
          name: 'Restored Kebab Feast',
          mealType: 'dinner',
          items: [
            {
              name: 'Iraqi Charcoal Lamb Kebab',
              servingSize: '1 skewer (90g)',
              servingGrams: 90,
              servings: 3,
              calories: 660,
              protein: 48,
              carbs: 3,
              fat: 51,
              portionUnit: 'piece',
              gramsPerUnit: 90,
              isEstimate: true,
            },
          ],
          totalCalories: 660,
          totalProtein: 48,
          totalCarbs: 3,
          totalFat: 51,
          createdAt: '2026-10-15T20:00:00Z',
        },
      ],
    };

    await restoreAllData(replacementBackup, 'replace');
    let loadedTemplates = await loadMealTemplates();
    assert(loadedTemplates.length === 1, '1 template after replace restore');
    assert(loadedTemplates[0].id === 'restored_tmpl_1', 'Restored template id matches');

    // Test restore in merge mode
    const mergeBackup: FitTrackBackup = {
      ...backupPayload,
      mealTemplates: [
        {
          id: 'merged_tmpl_2',
          name: 'Merged Tashreeb Lunch',
          mealType: 'lunch',
          items: [],
          totalCalories: 580,
          totalProtein: 38,
          totalCarbs: 45,
          totalFat: 27,
          createdAt: '2026-10-15T21:00:00Z',
        },
      ],
    };
    await restoreAllData(mergeBackup, 'merge');
    loadedTemplates = await loadMealTemplates();
    assert(loadedTemplates.length === 2, `2 templates after merge restore, got ${loadedTemplates.length}`);
    console.log('✓ Test 5 passed: Meal templates backup and replace/merge restore verified.');
  }

  console.log('All Meal Templates & Frequent Foods Storage Tests Passed successfully!');
}

runMealTemplatesTests();
