import {
  validateAndMigrateV2Backup,
  isV2BackupPayload,
} from './v2Importer';
import { validateBackup } from './backupCore';

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

console.log('Testing v2 -> v4 backup importer and migration...');

const sampleV2Backup = {
  version: '2.0',
  exportedAt: '2026-10-14T20:00:00.000Z',
  profile: {
    name: 'Saif',
    email: 'saif@example.com',
    gender: 'male',
    age: 28,
    heightCm: 180,
    weightKg: 82,
    targetWeightKg: 78,
    activityLevel: 'moderate',
    goal: 'fat_loss_moderate',
    waterGoalMl: 2750, // 2750 / 250 = 11 glasses
    stepGoal: 10000,
    bmr: 1800,
    tdee: 2400,
    targetCalories: 1900,
    targetProtein: 160,
    targetCarbs: 180,
    targetFat: 60,
    includeWorkoutsInCalorieBudget: false,
    profileCompleted: true,
  },
  dailyLogs: {
    '2026-10-14': {
      date: '2026-10-14',
      meals: {
        breakfast: [
          {
            id: 'v2_m1',
            foodId: 'food_egg',
            name: 'Boiled Eggs',
            servingSize: '2 large eggs',
            servingGrams: 100,
            servingsCount: 1,
            calories: 140,
            protein: 12,
            carbs: 1,
            fat: 10,
            vitaminD: 2,
            loggedAt: '2026-10-14T08:30:00.000Z',
          },
        ],
        lunch: [
          {
            id: 'v2_m2',
            foodId: 'food_chicken',
            name: 'Grilled Chicken Breast',
            servingSize: '150g',
            servingGrams: 150,
            servingsCount: 1,
            calories: 250,
            protein: 45,
            carbs: 0,
            fat: 5,
            zinc: 2,
            loggedAt: '2026-10-14T13:00:00.000Z',
          },
        ],
        dinner: [],
        snack: [
          {
            id: 'v2_m3',
            foodId: 'food_apple',
            name: 'Apple',
            servingSize: '1 medium',
            servingGrams: 180,
            servingsCount: 1,
            calories: 95,
            protein: 0.5,
            carbs: 25,
            fat: 0.3,
            fiber: 4,
            loggedAt: '2026-10-14T16:00:00.000Z',
          },
        ],
      },
      waterMl: 2500, // 10 glasses
      steps: 8400,
      workouts: [
        {
          id: 'v2_w1',
          name: 'Upper Body Strength',
          category: 'strength',
          durationMinutes: 45,
          caloriesBurned: 280,
          loggedAt: '2026-10-14T18:00:00.000Z',
          sets: [
            { setNum: 1, weightKg: 60, reps: 10, completed: true },
            { setNum: 2, weightKg: 65, reps: 8, completed: true },
          ],
        },
      ],
      supplements: [
        {
          id: 'v2_s1',
          name: 'Vitamin D3',
          category: 'vitamin',
          dosage: '2000 IU',
          amount: 2000,
          unit: 'IU',
          part: 'noon', // maps to afternoon
          taken: true,
          loggedAt: '2026-10-14T12:30:00.000Z',
        },
      ],
      aiReport: {
        overallGrade: 'A-',
        headline: 'Strong protein pacing and solid deficit',
        caloricBalance: 'Within 50 kcal of target',
        macroBreakdown: 'Protein target met',
        mistakesAndBlindSpots: ['Dinner was skipped'],
        actionableTomorrowFixes: ['Add healthy fats with dinner'],
        customMealSuggestion: 'Salmon bowl with quinoa',
        coachNote: 'Great execution overall.',
        generatedAt: '2026-10-14T21:00:00.000Z',
      },
    },
  },
  customFoods: [
    {
      id: 'cf_1',
      name: 'Homemade Protein Smoothie',
      servingSize: '1 glass (400ml)',
      servingGrams: 400,
      calories: 320,
      protein: 35,
      carbs: 28,
      fat: 6,
      source: 'custom',
    },
  ],
  weightHistory: [
    {
      date: '2026-10-14',
      weightKg: 82.2,
      bodyFatPercent: 18.5,
      note: 'Morning weigh-in',
    },
  ],
};

// 1. Detection
{
  assert(isV2BackupPayload(sampleV2Backup), 'Should detect v2 object');
  assert(isV2BackupPayload(JSON.stringify(sampleV2Backup)), 'Should detect v2 JSON string');

  const cloudDoc = {
    schemaVersion: 1,
    revision: 2,
    payload: JSON.stringify(sampleV2Backup),
    updatedAt: '2026-10-14T22:00:00.000Z',
  };
  assert(isV2BackupPayload(cloudDoc), 'Should detect v2 cloud snapshot');
  assert(!isV2BackupPayload({ version: '4.0' }), 'Should NOT treat v4 as v2');
  assert(!isV2BackupPayload(null), 'Should NOT crash on null');
}

// 2. Full migration from v2 JSON export
{
  const result = validateAndMigrateV2Backup(sampleV2Backup);
  assertEqual(result.sourceVersion, '2.0');
  assertEqual(result.backup.version, '4.0');
  assertEqual(result.backup.profile.name, 'Saif');
  assertEqual(result.backup.profile.waterTargetGlasses, 11);
  assertEqual(result.summary.daysCount, 1);
  assertEqual(result.summary.mealsCount, 3);
  assertEqual(result.summary.workoutsCount, 1);
  assertEqual(result.summary.weightsCount, 1);
  assertEqual(result.migratedCustomFoodsCount, 1);

  // Check day details
  const day = result.backup.dailyLogs['2026-10-14'];
  assert(day !== undefined, 'Day log must exist');
  assertEqual(day.waterGlasses, 10);
  assertEqual(day.steps, 8400);
  assertEqual(day.meals.length, 3);

  // Check meal slot flattening and mealType assignment
  const breakfast = day.meals.find((m) => m.name === 'Boiled Eggs');
  const lunch = day.meals.find((m) => m.name === 'Grilled Chicken Breast');
  const snack = day.meals.find((m) => m.name === 'Apple');

  assert(Boolean(breakfast && lunch && snack), 'All 3 meals must be present');
  assertEqual(breakfast?.mealType, 'breakfast');
  assertEqual(lunch?.mealType, 'lunch');
  assertEqual(snack?.mealType, 'snack');
  assertEqual(breakfast?.servings, 1);

  // Check supplement time mapping (noon -> afternoon)
  assert(day.dailySupplements !== undefined, 'Supplements must exist');
  assertEqual(day.dailySupplements?.[0]?.time, 'afternoon');
  assertEqual(day.dailySupplements?.[0]?.amount, 2000);
  assertEqual(day.dailySupplements?.[0]?.unit, 'IU');
  assertEqual(day.dailySupplements?.[0]?.taken, true);

  // Check routine harvesting
  assertEqual(result.backup.supplementRoutine.length, 1);
  assertEqual(result.backup.supplementRoutine[0].name, 'Vitamin D3');
  assertEqual(result.backup.supplementRoutine[0].time, 'afternoon');

  // Check AI report preservation
  assertEqual(day.aiReport?.overallGrade, 'A-');
  assertEqual(day.aiReport?.headline, 'Strong protein pacing and solid deficit');

  // Verify the whole migrated object strictly passes v4 validator
  const revalidated = validateBackup(result.backup);
  assertEqual(revalidated.version, '4.0');
}

// 3. Migration from v2 Cloud Snapshot Document
{
  const cloudDoc = {
    schemaVersion: 1,
    revision: 5,
    payload: JSON.stringify(sampleV2Backup),
    updatedAt: '2026-10-14T23:00:00.000Z',
  };
  const result = validateAndMigrateV2Backup(cloudDoc);
  assertEqual(result.sourceVersion, '2.0');
  assertEqual(result.backup.version, '4.0');
  assertEqual(result.summary.mealsCount, 3);
}

// 4. Strict error rejection on corrupted / unsupported payloads
{
  let caught = false;
  try {
    validateAndMigrateV2Backup({ version: '3.0' });
  } catch {
    caught = true;
  }
  assert(caught, 'Must reject unsupported version');

  caught = false;
  try {
    validateAndMigrateV2Backup('invalid-json{{{');
  } catch {
    caught = true;
  }
  assert(caught, 'Must reject malformed JSON string');

  caught = false;
  try {
    validateAndMigrateV2Backup({ version: '2.0' /* missing profile */ });
  } catch {
    caught = true;
  }
  assert(caught, 'Must reject v2 missing profile');
}

console.log('All v2 -> v4 backup importer tests passed successfully.');
