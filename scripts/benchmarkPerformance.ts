import {
  loadUserProfile,
  saveUserProfile,
  loadDailyLog,
  saveDailyLog,
  loadSupplementRoutine,
  saveSupplementRoutine,
  loadWeightHistory,
  addWeightEntry,
  loadLogsForDates,
  loadAccurateStreak,
  getAllDailyLogs,
  getFrequentFoods,
  getYesterdayMealsPreview,
  loadMealTemplates,
  saveMealTemplates,
  loadCustomFoods,
  saveCustomFoods,
  loadBarcodeCache,
  saveBarcodeCache,
  restoreAllData,
  loadReminderSettings,
  loadRecentFoods,
  loadFavoriteFoods,
} from '../src/storage/storage';
import { serializeBackup, parseBackup } from '../src/utils/backupCore';
import {
  DailyLog,
  UserProfile,
  WeightEntry,
  LoggedMeal,
  WorkoutEntry,
  SupplementRoutineItem,
  MealTemplate,
  FoodItem,
  FitTrackBackup,
} from '../src/types';
import { calculateTargets } from '../src/utils/calculator';
import { generateDateWindow, calculateCalorieTrendMetrics, calculateWeightTrendMetrics } from '../src/utils/trends';
import { addDaysToDateString, getTodayDateString } from '../src/utils/dateUtils';

// Performance Benchmark Script for 2-Year (730 Days) Dataset
// Setup mock storage environment before running storage operations
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

async function createBenchmarkBackupPayload(): Promise<FitTrackBackup> {
  const [
    profile,
    dailyLogs,
    supplementRoutine,
    weightHistory,
    reminderSettings,
    recentFoods,
    favoriteFoods,
    customFoods,
    barcodeCache,
    mealTemplates,
  ] = await Promise.all([
    loadUserProfile(),
    getAllDailyLogs(),
    loadSupplementRoutine(),
    loadWeightHistory(),
    loadReminderSettings(),
    loadRecentFoods(),
    loadFavoriteFoods(),
    loadCustomFoods(),
    loadBarcodeCache(),
    loadMealTemplates(),
  ]);

  const raw = {
    version: '4.0',
    exportedAt: new Date().toISOString(),
    profile,
    dailyLogs,
    supplementRoutine,
    weightHistory,
    reminderSettings,
    recentFoods,
    favoriteFoods,
    customFoods,
    barcodeCache,
    mealTemplates,
  };

  const serialized = serializeBackup(raw);
  return parseBackup(serialized);
}

interface BenchmarkResult {
  operation: string;
  iterations: number;
  totalMs: number;
  avgMs: number;
  minMs: number;
  maxMs: number;
  metadata?: string;
}

async function measureAsync<T>(
  name: string,
  iterations: number,
  fn: () => Promise<T>,
  metadataFn?: (lastResult: T) => string
): Promise<BenchmarkResult> {
  // Warmup
  await fn();

  const timings: number[] = [];
  let lastResult!: T;

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    lastResult = await fn();
    const duration = performance.now() - start;
    timings.push(duration);
  }

  const totalMs = timings.reduce((sum, t) => sum + t, 0);
  const avgMs = totalMs / iterations;
  const minMs = Math.min(...timings);
  const maxMs = Math.max(...timings);

  return {
    operation: name,
    iterations,
    totalMs,
    avgMs,
    minMs,
    maxMs,
    metadata: metadataFn ? metadataFn(lastResult) : undefined,
  };
}

function generateDataset(totalDays: number = 730) {
  const today = getTodayDateString();
  const dailyLogs: Record<string, DailyLog> = {};
  const weightEntries: WeightEntry[] = [];

  const baseWeight = 85.0;
  const targetWeight = 76.5;

  for (let i = 0; i < totalDays; i++) {
    const dateStr = addDaysToDateString(today, -i);
    const progressFraction = (totalDays - i) / totalDays;
    const currentWeight = Math.round((baseWeight - (baseWeight - targetWeight) * progressFraction + (Math.sin(i / 10) * 0.4)) * 10) / 10;

    // Weight entry roughly every 3-4 days
    if (i % 3 === 0 || i === 0) {
      weightEntries.push({
        id: `weight_${dateStr}`,
        date: dateStr,
        weightKg: currentWeight,
        note: i === 0 ? 'Current morning weigh-in' : undefined,
        timestamp: `${dateStr}T07:00:00.000Z`,
      });
    }

    const meals: LoggedMeal[] = [
      {
        id: `meal_${dateStr}_1`,
        foodId: 'food_oatmeal',
        name: 'Rolled Oats with Berries & Whey Protein',
        mealType: 'breakfast',
        servings: 1,
        servingSize: '1 bowl (70g dry oats + 1 scoop whey)',
        servingGrams: 280,
        calories: 385,
        protein: 32.5,
        carbs: 48.0,
        fat: 6.5,
        fiber: 8.2,
        sugar: 6.1,
        sodium: 180,
        potassium: 420,
        calcium: 150,
        iron: 3.2,
        timestamp: `${dateStr}T08:15:00Z`,
        source: 'regional_culinary_estimate',
      },
      {
        id: `meal_${dateStr}_2`,
        foodId: 'food_chicken_rice',
        name: 'Grilled Herb Chicken with Basmati Rice & Broccoli',
        mealType: 'lunch',
        servings: 1.2,
        servingSize: '1 plate (180g chicken, 150g rice, 100g broccoli)',
        servingGrams: 430,
        calories: 590,
        protein: 54.0,
        carbs: 62.0,
        fat: 11.0,
        fiber: 6.8,
        sugar: 3.2,
        sodium: 460,
        potassium: 680,
        calcium: 85,
        iron: 2.8,
        vitaminC: 75,
        timestamp: `${dateStr}T13:00:00Z`,
        source: 'verified_database',
      },
      {
        id: `meal_${dateStr}_3`,
        foodId: 'food_snack',
        name: 'Greek Yogurt with Mixed Walnuts & Apple',
        mealType: 'snack',
        servings: 1,
        servingSize: '1 bowl (200g yogurt + 25g nuts)',
        servingGrams: 225,
        calories: 275,
        protein: 21.0,
        carbs: 24.0,
        fat: 9.5,
        fiber: 4.1,
        sugar: 15.2,
        sodium: 85,
        calcium: 220,
        timestamp: `${dateStr}T16:30:00Z`,
        source: 'verified_database',
      },
      {
        id: `meal_${dateStr}_4`,
        foodId: 'food_dinner',
        name: 'Pan-seared Salmon Fillet with Baked Sweet Potato',
        mealType: 'dinner',
        servings: 1,
        servingSize: '1 serving (170g salmon, 200g sweet potato)',
        servingGrams: 370,
        calories: 630,
        protein: 44.0,
        carbs: 48.0,
        fat: 25.0,
        fiber: 7.2,
        sugar: 9.4,
        sodium: 390,
        potassium: 910,
        vitaminA: 850,
        vitaminD: 14.5,
        vitaminB12: 4.8,
        timestamp: `${dateStr}T19:45:00Z`,
        source: 'verified_database',
      },
    ];

    const workouts: WorkoutEntry[] = (i % 2 === 0) ? [
      {
        id: `workout_${dateStr}_1`,
        name: i % 4 === 0 ? 'Strength Training (Push Day)' : 'Zone 2 Outdoor Running',
        category: i % 4 === 0 ? 'strength' : 'cardio',
        durationMinutes: 45,
        caloriesBurned: 340,
        loggedAt: `${dateStr}T17:30:00Z`,
        calorieSource: 'met_estimate',
      },
    ] : [];

    dailyLogs[dateStr] = {
      date: dateStr,
      meals,
      workouts,
      waterGlasses: 8 + (i % 3),
      steps: 7500 + ((i * 137) % 4500),
      supplements: [
        { itemId: 'supp_1', taken: true, takenAt: `${dateStr}T08:30:00Z` },
        { itemId: 'supp_2', taken: true, takenAt: `${dateStr}T08:30:00Z` },
        { itemId: 'supp_3', taken: i % 3 !== 0, takenAt: `${dateStr}T13:30:00Z` },
      ],
    };
  }

  const profile: UserProfile = {
    name: 'Benchmark Athlete',
    age: 29,
    gender: 'male',
    weightKg: 76.5,
    heightCm: 182,
    activityLevel: 'moderate',
    goal: 'fat_loss_moderate',
    bmr: 1780,
    tdee: 2450,
    targetCalories: 2050,
    targetProtein: 165,
    targetCarbs: 205,
    targetFat: 65,
    waterTargetGlasses: 10,
    language: 'en',
    isOnboarded: true,
    includeWorkoutsInCalorieBudget: false,
  };

  const supplementRoutine: SupplementRoutineItem[] = [
    { id: 'supp_1', name: 'Vitamin D3 + K2', amount: 5000, unit: 'IU', time: 'morning' },
    { id: 'supp_2', name: 'Omega-3 Fish Oil', amount: 2000, unit: 'mg', time: 'morning' },
    { id: 'supp_3', name: 'Magnesium Glycinate', amount: 400, unit: 'mg', time: 'evening' },
    { id: 'supp_4', name: 'Zinc Picolinate', amount: 15, unit: 'mg', time: 'evening' },
  ];

  const mealTemplates: MealTemplate[] = [
    {
      id: 'template_1',
      name: 'Power Protein Breakfast',
      mealType: 'breakfast',
      items: [
        { name: 'Oats & Berries', servingSize: '1 bowl', servingGrams: 280, servings: 1, calories: 385, protein: 32.5, carbs: 48, fat: 6.5 },
      ],
      totalCalories: 385,
      totalProtein: 32.5,
      totalCarbs: 48,
      totalFat: 6.5,
      createdAt: '2026-01-01T00:00:00Z',
    },
  ];

  const customFoods: FoodItem[] = [
    {
      id: 'custom_1',
      name: 'Homemade Lentil Soup',
      category: 'beans_lentils',
      servingSize: '1 large bowl (350g)',
      servingGrams: 350,
      calories: 290,
      protein: 18,
      carbs: 42,
      fat: 4.5,
      fiber: 12,
    },
  ];

  const barcodeCache: FoodItem[] = [
    {
      id: 'barcode_7622210449283',
      name: 'Greek Plain Strained Yogurt 0%',
      brand: 'Total',
      category: 'eggs_dairy',
      barcode: '7622210449283',
      servingSize: '100g',
      servingGrams: 100,
      calories: 57,
      protein: 10.3,
      carbs: 4.0,
      fat: 0,
    },
  ];

  return {
    today,
    totalDays,
    dailyLogs,
    weightEntries,
    profile,
    supplementRoutine,
    mealTemplates,
    customFoods,
    barcodeCache,
  };
}

export async function runBenchmark() {
  console.log('================================================================');
  console.log('FitTrack v4 — Performance Benchmark Suite (2 Years / 730 Days)');
  console.log('================================================================\n');

  console.log('1. Generating 2-Year Synthetic Dataset...');
  const dataset = generateDataset(730);
  const totalMeals = Object.values(dataset.dailyLogs).reduce((s, d) => s + d.meals.length, 0);
  const totalWorkouts = Object.values(dataset.dailyLogs).reduce((s, d) => s + (d.workouts || []).length, 0);

  console.log(`✓ Generated ${dataset.totalDays} daily logs (${totalMeals} meals, ${totalWorkouts} workouts)`);
  console.log(`✓ Generated ${dataset.weightEntries.length} weight history entries`);
  console.log(`✓ Generated profile, routines, templates, custom foods, barcode cache\n`);

  console.log('2. Populating Storage...');
  const seedStart = performance.now();
  await saveUserProfile(dataset.profile);
  await saveSupplementRoutine(dataset.supplementRoutine);
  await saveMealTemplates(dataset.mealTemplates);
  await saveCustomFoods(dataset.customFoods);
  await saveBarcodeCache(dataset.barcodeCache);

  for (const entry of dataset.weightEntries) {
    await addWeightEntry(entry);
  }

  for (const [, log] of Object.entries(dataset.dailyLogs)) {
    await saveDailyLog(log);
  }
  const seedDuration = performance.now() - seedStart;
  console.log(`✓ Storage populated in ${seedDuration.toFixed(1)} ms. Total storage keys: ${Object.keys(mockStore).length}\n`);

  console.log('3. Running Benchmarks (10 iterations each)...\n');
  const results: BenchmarkResult[] = [];

  // A. App Startup Load
  results.push(
    await measureAsync('A. App Startup Cold Storage Read', 10, async () => {
      const [profile, routine, todayLog, streak] = await Promise.all([
        loadUserProfile(),
        loadSupplementRoutine(),
        loadDailyLog(dataset.today),
        loadAccurateStreak(dataset.today),
      ]);
      return { profile, routine, todayLog, streak };
    }, (res) => `Profile: ${res.profile.name}, Streak: ${res.streak.currentStreak} days, Today meals: ${res.todayLog.meals.length}`)
  );

  // B. Today Screen Render Data Fetch & Computation
  results.push(
    await measureAsync('B. Today Screen Render Data Fetch & Target Calc', 10, async () => {
      const [todayLog, profile, preview, streak] = await Promise.all([
        loadDailyLog(dataset.today),
        loadUserProfile(),
        getYesterdayMealsPreview(dataset.today),
        loadAccurateStreak(dataset.today),
      ]);
      const targets = calculateTargets(profile);
      const totalKcal = todayLog.meals.reduce((sum, m) => sum + m.calories, 0);
      const remainingKcal = targets.targetCalories - totalKcal;
      return { totalKcal, remainingKcal, preview, streak };
    }, (res) => `Logged: ${res.totalKcal} kcal, Yesterday preview: ${res.preview.count} items (${res.preview.calories} kcal)`)
  );

  // C. Progress Screen 30-Day Window Query & Trends
  results.push(
    await measureAsync('C. Progress Screen 30-Day Window & Trends Computation', 10, async () => {
      const dates = generateDateWindow(dataset.today, 30);
      const [weights, logs] = await Promise.all([
        loadWeightHistory(),
        loadLogsForDates(dates),
      ]);
      const caloriePoints = dates.map((d) => ({
        date: d,
        calories: logs[d]?.meals?.reduce((s, m) => s + m.calories, 0) || 0,
        target: 2050,
      }));
      const weightPoints = weights.map((w) => ({
        date: w.date,
        value: w.weightKg,
      }));
      const calorieMetrics = calculateCalorieTrendMetrics(caloriePoints);
      const weightMetrics = calculateWeightTrendMetrics(weightPoints);
      return { calorieMetrics, weightMetrics };
    }, (res) => `30-Day avg: ${Math.round(res.calorieMetrics.avgCalories)} kcal/day, Weight delta: ${res.weightMetrics.delta > 0 ? '+' : ''}${res.weightMetrics.delta.toFixed(1)} kg`)
  );

  // D. Progress Screen 90-Day Window Query
  results.push(
    await measureAsync('D. Progress Screen 90-Day Window Batch Query', 10, async () => {
      const dates = generateDateWindow(dataset.today, 90);
      const logs = await loadLogsForDates(dates);
      return logs;
    }, (res) => `Fetched ${Object.keys(res).length} dates`)
  );

  // E. Full 730-Day Historical Log Query & Frequent Foods Aggregation
  results.push(
    await measureAsync('E. 730-Day Full History Load & Frequent Foods Aggregation', 10, async () => {
      const allLogs = await getAllDailyLogs();
      const frequent = getFrequentFoods(allLogs, 20);
      return { totalLogs: Object.keys(allLogs).length, topFrequent: frequent[0]?.name };
    }, (res) => `Processed ${res.totalLogs} days. Top frequent food: "${res.topFrequent}"`)
  );

  // F. Backup Export Payload Generation (730 Days)
  results.push(
    await measureAsync('F. Backup Export Generation (Full 730 Days + JSON serialization)', 10, async () => {
      const backup = await createBenchmarkBackupPayload();
      const serialized = JSON.stringify(backup);
      return { backup, serializedLength: serialized.length };
    }, (res) => `Backup size: ${(res.serializedLength / 1024).toFixed(1)} KB (${Object.keys(res.backup.dailyLogs).length} days)`)
  );

  // Prepare backup payload for restore tests
  const exportedBackup = await createBenchmarkBackupPayload();

  // G. Backup Restore: Replace Mode (730 Days)
  results.push(
    await measureAsync('G. Backup Restore (730 Days — Replace Mode)', 5, async () => {
      await restoreAllData(exportedBackup, 'replace');
    }, () => `Successfully restored all 730 daily logs in replace mode`)
  );

  // H. Backup Restore: Merge Mode (730 Days)
  results.push(
    await measureAsync('H. Backup Restore (730 Days — Merge Mode)', 5, async () => {
      await restoreAllData(exportedBackup, 'merge');
    }, () => `Successfully merged all 730 daily logs in merge mode`)
  );

  console.log('------------------------------------------------------------------------------------------------------------------------');
  console.log(
    'Operation'.padEnd(52) +
    'Iterations'.padEnd(12) +
    'Avg (ms)'.padEnd(12) +
    'Min (ms)'.padEnd(12) +
    'Max (ms)'.padEnd(12) +
    'Details'
  );
  console.log('------------------------------------------------------------------------------------------------------------------------');

  for (const r of results) {
    console.log(
      r.operation.padEnd(52) +
      String(r.iterations).padEnd(12) +
      r.avgMs.toFixed(2).padEnd(12) +
      r.minMs.toFixed(2).padEnd(12) +
      r.maxMs.toFixed(2).padEnd(12) +
      (r.metadata || '')
    );
  }
  console.log('------------------------------------------------------------------------------------------------------------------------\n');

  console.log('All performance benchmarks completed successfully.');
  return results;
}

if (require.main === module) {
  runBenchmark().catch((err) => {
    console.error('Benchmark failed:', err);
    process.exit(1);
  });
}
