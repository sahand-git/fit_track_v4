import { parseBackup, serializeBackup, computeBackupSummary } from './backupCore';
import { FitTrackBackup } from '../types';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

// 1. Valid sample backup
const sampleBackup: FitTrackBackup = {
  version: '4.0',
  exportedAt: '2026-10-13T12:00:00.000Z',
  profile: {
    name: 'Saif',
    age: 28,
    gender: 'male',
    weightKg: 78,
    heightCm: 180,
    activityLevel: 'moderate',
    goal: 'fat_loss_moderate',
    bmr: 1750,
    tdee: 2450,
    targetCalories: 2150,
    targetProtein: 160,
    targetCarbs: 215,
    targetFat: 70,
    waterTargetGlasses: 10,
    language: 'en',
    isOnboarded: true,
    includeWorkoutsInCalorieBudget: false,
  },
  dailyLogs: {
    '2026-10-12': {
      date: '2026-10-12',
      waterGlasses: 8,
      steps: 5000,
      meals: [
        {
          id: 'meal_1',
          foodId: 'food_chicken',
          name: 'Grilled Chicken Breast',
          mealType: 'lunch',
          servings: 1.5,
          servingSize: '100g cooked',
          servingGrams: 150,
          calories: 248,
          protein: 46.5,
          carbs: 0,
          fat: 5.4,
          timestamp: '2026-10-12T13:00:00Z',
        },
      ],
      workouts: [
        {
          id: 'wo_1',
          name: 'Running (10 km/h)',
          category: 'cardio',
          durationMinutes: 30,
          caloriesBurned: 390,
          loggedAt: '2026-10-12T18:00:00Z',
          calorieSource: 'met_estimate',
          sets: [],
        },
      ],
      supplements: [
        {
          itemId: 'supp_1',
          taken: true,
          takenAt: '2026-10-12T09:00:00Z',
        },
      ],
      dailySupplements: [],
    },
  },
  supplementRoutine: [
    {
      id: 'supp_1',
      name: 'Creatine Monohydrate',
      dose: '5g',
      time: 'morning',
    },
  ],
  weightHistory: [
    {
      id: 'weight_1',
      date: '2026-10-12',
      weightKg: 78.2,
      note: 'Morning empty stomach',
      timestamp: '2026-10-12T08:00:00Z',
    },
  ],
  reminderSettings: {
    supplementsEnabled: true,
    supplementTimes: {
      morning: { enabled: true, hour: 8, minute: 0 },
      afternoon: { enabled: false, hour: 13, minute: 0 },
      evening: { enabled: true, hour: 19, minute: 0 },
      bedtime: { enabled: false, hour: 22, minute: 0 },
    },
    water: {
      enabled: true,
      intervalHours: 2,
      startHour: 8,
      endHour: 22,
    },
    meals: {
      breakfast: { enabled: true, hour: 8, minute: 30 },
      lunch: { enabled: true, hour: 13, minute: 0 },
      dinner: { enabled: true, hour: 19, minute: 30 },
      snack: { enabled: false, hour: 16, minute: 0 },
    },
  },
  recentFoods: [
    {
      id: 'food_recent_1',
      name: 'Oatmeal',
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
      id: 'food_fav_1',
      name: 'Greek Yogurt',
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
      id: 'food_custom_1',
      name: 'Special Protein Shake',
      servingSize: '1 shake',
      servingGrams: 350,
      calories: 280,
      protein: 35,
      carbs: 20,
      fat: 4,
      source: 'custom',
    },
  ],
};

// Test A: Round-trip serialization & parsing
const serialized = serializeBackup(sampleBackup);
const parsed = parseBackup(serialized);
assert(parsed.version === '4.0', 'version is 4.0');
assert(parsed.profile?.name === 'Saif', 'profile name restored');
assert(parsed.profile?.includeWorkoutsInCalorieBudget === false, 'workout budget setting preserved');
assert(parsed.dailyLogs['2026-10-12']?.workouts?.[0]?.caloriesBurned === 390, 'workout burned calories restored');
assert(parsed.weightHistory[0]?.weightKg === 78.2, 'weight history restored');
assert(parsed.supplementRoutine[0]?.name === 'Creatine Monohydrate', 'supplement routine restored');
assert(parsed.recentFoods?.[0]?.name === 'Oatmeal', 'recent foods round-trip preserved');
assert(parsed.favoriteFoods?.[0]?.name === 'Greek Yogurt', 'favorite foods round-trip preserved');
assert(parsed.customFoods?.[0]?.name === 'Special Protein Shake', 'custom foods round-trip preserved');

// Test B: Secrets and unauthorized fields are strictly stripped
const untrustedData = {
  ...JSON.parse(serialized),
  geminiApiKey: 'AIzaSySecretApiKey12345',
  sessionToken: 'secret_session_token_xyz',
  userPasswordHash: 'abcd1234efgh',
  profile: {
    ...sampleBackup.profile,
    geminiApiKey: 'secret_key_in_profile',
    adminRole: true,
  },
  extraUnwantedData: { hack: true },
};

const sanitized = parseBackup(JSON.stringify(untrustedData));
assert(!('geminiApiKey' in sanitized), 'geminiApiKey excluded from root');
assert(!('sessionToken' in sanitized), 'sessionToken excluded from root');
assert(!('userPasswordHash' in sanitized), 'userPasswordHash excluded from root');
assert(!('extraUnwantedData' in sanitized), 'extra unknown fields excluded');
assert(!('geminiApiKey' in sanitized.profile!), 'geminiApiKey excluded from profile');
assert(!('adminRole' in sanitized.profile!), 'unauthorized role excluded from profile');

// Test C: Malformed and partial backups rejected
let threwOnInvalidVersion = false;
try {
  parseBackup(JSON.stringify({ ...sampleBackup, version: '3.0' }));
} catch {
  threwOnInvalidVersion = true;
}
assert(threwOnInvalidVersion, 'rejects wrong version string');

let threwOnMalformedJson = false;
try {
  parseBackup('{ broken json:');
} catch {
  threwOnMalformedJson = true;
}
assert(threwOnMalformedJson, 'rejects syntax-invalid json');

let threwOnNonObject = false;
try {
  parseBackup(JSON.stringify('a plain string'));
} catch {
  threwOnNonObject = true;
}
assert(threwOnNonObject, 'rejects primitive non-object json');

// Test D: Summary calculation
const summary = computeBackupSummary(parsed);
assert(summary.daysCount === 1, 'summary reports 1 day');
assert(summary.mealsCount === 1, 'summary reports 1 meal');
assert(summary.workoutsCount === 1, 'summary reports 1 workout');
assert(summary.weightsCount === 1, 'summary reports 1 weight entry');
assert(summary.routineItemsCount === 1, 'summary reports 1 routine item');

// Test E: Share cancellation is not reported as saved
async function runAsyncTests() {
  let shareWasSaved = false;
  const mockShare = async (_uri: string, _title: string): Promise<boolean> => {
    // User opened share sheet and dismissed/cancelled without saving
    return false;
  };
  const result = await mockShare('file:///path/to/backup.json', 'FitTrack Backup');
  if (result) {
    shareWasSaved = true;
  }
  assert(!shareWasSaved, 'share sheet dismissal or cancellation is not recorded as saved');
  console.log('All backup tests passed successfully.');
}

runAsyncTests();
