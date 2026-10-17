import {
  FitTrackBackup,
  BackupSummary,
  UserProfile,
  DailyLog,
  LoggedMeal,
  WorkoutEntry,
  LoggedDailySupplement,
  SupplementRoutineItem,
  SupplementTime,
  WeightEntry,
  FoodItem,
} from '../types';
import { validateBackup, computeBackupSummary } from './backupCore';

export interface V2ImportResult {
  backup: FitTrackBackup;
  summary: BackupSummary;
  sourceVersion: '2.0';
  migratedCustomFoodsCount: number;
}

const invalidV2 = (reason?: string): never => {
  throw new Error(`Invalid v2 backup format${reason ? ': ' + reason : '.'}`);
};

/**
 * Checks if raw input object or JSON represents a v2 backup export or v2 cloud snapshot.
 */
export function isV2BackupPayload(raw: unknown): boolean {
  if (!raw) return false;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return isV2BackupPayload(parsed);
    } catch {
      return false;
    }
  }
  if (typeof raw === 'object' && raw !== null) {
    const obj = raw as Record<string, unknown>;
    if (obj.version === '2.0') return true;
    if (obj.schemaVersion === 1 && typeof obj.payload === 'string') return true;
  }
  return false;
}

/**
 * Maps v2 time 'noon' to v4 'afternoon'.
 */
function normalizeV2Time(time?: string): SupplementTime {
  if (time === 'noon') return 'afternoon';
  if (time === 'afternoon' || time === 'evening' || time === 'bedtime') return time;
  return 'morning';
}

/**
 * Validates and migrates a v2 JSON export or v2 fitnessBackups Firestore document into a 100% compliant v4 FitTrackBackup.
 */
export function validateAndMigrateV2Backup(rawInput: unknown): V2ImportResult {
  let root: Record<string, unknown> = {};

  if (typeof rawInput === 'string') {
    try {
      root = JSON.parse(rawInput);
    } catch {
      invalidV2('Malformed JSON string');
    }
  } else if (typeof rawInput === 'object' && rawInput !== null) {
    root = rawInput as Record<string, unknown>;
  } else {
    invalidV2('Expected JSON object or string');
  }

  // 1. If v2 Cloud Snapshot document (fitnessBackups/{uid}), unwrap payload
  if (root.schemaVersion === 1 && typeof root.payload === 'string') {
    try {
      root = JSON.parse(root.payload);
    } catch {
      invalidV2('Malformed payload string inside v2 cloud document');
    }
  }

  // 2. Validate v2 version
  if (root.version !== '2.0') {
    invalidV2('Unsupported version, expected version 2.0');
  }

  if (typeof root.profile !== 'object' || root.profile === null) {
    invalidV2('Missing profile in v2 backup');
  }

  const v2Profile = root.profile as Record<string, any>;
  const v2DailyLogs = (root.dailyLogs || {}) as Record<string, any>;
  const v2CustomFoods = Array.isArray(root.customFoods) ? root.customFoods : [];
  const v2WeightHistory = Array.isArray(root.weightHistory) ? root.weightHistory : [];

  // 3. Migrate Profile
  const profile: UserProfile = {
    name: String(v2Profile.name || 'FitTrack User'),
    age: Number(v2Profile.age) || 25,
    gender:
      v2Profile.gender === 'female' || v2Profile.gender === 'male'
        ? v2Profile.gender
        : 'other',
    weightKg: Number(v2Profile.weightKg) || 70,
    heightCm: Number(v2Profile.heightCm) || 175,
    activityLevel: [
      'sedentary',
      'light',
      'moderate',
      'very_active',
      'athlete',
    ].includes(v2Profile.activityLevel)
      ? v2Profile.activityLevel
      : 'moderate',
    goal: [
      'fat_loss_aggressive',
      'fat_loss_moderate',
      'maintenance',
      'lean_bulk',
      'muscle_gain',
    ].includes(v2Profile.goal)
      ? v2Profile.goal
      : 'maintenance',
    bmr: Number(v2Profile.bmr) || 1600,
    tdee: Number(v2Profile.tdee) || 2200,
    targetCalories: Number(v2Profile.targetCalories) || 2000,
    targetProtein: Number(v2Profile.targetProtein) || 150,
    targetCarbs: Number(v2Profile.targetCarbs) || 200,
    targetFat: Number(v2Profile.targetFat) || 65,
    waterTargetGlasses: Math.max(
      1,
      Math.round((Number(v2Profile.waterGoalMl) || 2500) / 250)
    ),
    stepGoal: Number(v2Profile.stepGoal) || 8000,
    targetWeightKg:
      typeof v2Profile.targetWeightKg === 'number'
        ? v2Profile.targetWeightKg
        : undefined,
    isOnboarded: true,
    hasAcceptedMedicalDisclaimer: false,
    includeWorkoutsInCalorieBudget: Boolean(
      v2Profile.includeWorkoutsInCalorieBudget
    ),
  };

  // 4. Migrate DailyLogs
  const dailyLogs: Record<string, DailyLog> = {};
  const routineHarvestMap = new Map<string, SupplementRoutineItem>();

  for (const [dateStr, rawDay] of Object.entries(v2DailyLogs)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) continue;
    const v2Day = (rawDay || {}) as Record<string, any>;

    const meals: LoggedMeal[] = [];
    const v2Meals = v2Day.meals || {};
    const mealTypes: ('breakfast' | 'lunch' | 'dinner' | 'snack')[] = [
      'breakfast',
      'lunch',
      'dinner',
      'snack',
    ];

    for (const mType of mealTypes) {
      const items = Array.isArray(v2Meals[mType]) ? v2Meals[mType] : [];
      for (let idx = 0; idx < items.length; idx++) {
        const item = items[idx] || {};
        const mealId =
          item.id ||
          `m_${dateStr}_${mType}_${idx}_${Math.random().toString(36).slice(2, 6)}`;
        meals.push({
          id: mealId,
          foodId: item.foodId || mealId,
          name: String(item.name || 'Logged Meal'),
          mealType: mType,
          servings: Number(item.servingsCount) || 1,
          servingSize: String(item.servingSize || '1 serving'),
          servingGrams: Number(item.servingGrams) || 100,
          calories: Math.max(0, Number(item.calories) || 0),
          protein: Math.max(0, Number(item.protein) || 0),
          carbs: Math.max(0, Number(item.carbs) || 0),
          fat: Math.max(0, Number(item.fat) || 0),
          fiber: typeof item.fiber === 'number' ? item.fiber : undefined,
          calcium: typeof item.calcium === 'number' ? item.calcium : undefined,
          iron: typeof item.iron === 'number' ? item.iron : undefined,
          vitaminC: typeof item.vitaminC === 'number' ? item.vitaminC : undefined,
          vitaminA: typeof item.vitaminA === 'number' ? item.vitaminA : undefined,
          vitaminD: typeof item.vitaminD === 'number' ? item.vitaminD : undefined,
          vitaminB12:
            typeof item.vitaminB12 === 'number' ? item.vitaminB12 : undefined,
          magnesium:
            typeof item.magnesium === 'number' ? item.magnesium : undefined,
          zinc: typeof item.zinc === 'number' ? item.zinc : undefined,
          barcode: typeof item.barcode === 'string' ? item.barcode : undefined,
          source: [
            'verified_database',
            'usda_sr28',
            'custom',
            'open_food_facts',
            'ai_estimated',
          ].includes(item.source)
            ? item.source
            : item.barcode
            ? 'open_food_facts'
            : 'verified_database',
          timestamp: item.loggedAt || `${dateStr}T12:00:00.000Z`,
        });
      }
    }

    // Workouts
    const workouts: WorkoutEntry[] = [];
    const v2Workouts = Array.isArray(v2Day.workouts) ? v2Day.workouts : [];
    for (const w of v2Workouts) {
      if (!w || !w.name) continue;
      workouts.push({
        id: w.id || `w_${dateStr}_${Math.random().toString(36).slice(2, 6)}`,
        name: String(w.name),
        category: [
          'strength',
          'cardio',
          'hiit',
          'sports',
          'flexibility',
        ].includes(w.category)
          ? w.category
          : 'strength',
        durationMinutes: Math.max(1, Number(w.durationMinutes) || 30),
        caloriesBurned: Math.max(0, Number(w.caloriesBurned) || 0),
        sets: Array.isArray(w.sets)
          ? w.sets.map((s: any, sIdx: number) => ({
              setNum: s.setNum ?? sIdx + 1,
              weightKg: typeof s.weightKg === 'number' ? s.weightKg : undefined,
              reps: Number(s.reps) || 10,
              completed: Boolean(s.completed),
            }))
          : undefined,
        loggedAt: w.loggedAt || `${dateStr}T17:00:00.000Z`,
      });
    }

    // Supplements
    const dailySupplements: LoggedDailySupplement[] = [];
    const v2Supplements = Array.isArray(v2Day.supplements)
      ? v2Day.supplements
      : [];

    for (const s of v2Supplements) {
      if (!s || !s.name) continue;
      const suppTime = normalizeV2Time(s.part);
      const suppId =
        s.id || `supp_${dateStr}_${Math.random().toString(36).slice(2, 6)}`;
      const numAmt = typeof s.amount === 'number' ? s.amount : undefined;
      const cleanUnit = typeof s.unit === 'string' ? s.unit : undefined;
      const cleanDose =
        s.dosage || (numAmt && cleanUnit ? `${numAmt} ${cleanUnit}` : undefined);

      dailySupplements.push({
        id: suppId,
        name: String(s.name),
        category: [
          'vitamin',
          'mineral',
          'supplement',
          'other',
        ].includes(s.category)
          ? s.category
          : 'supplement',
        amount: numAmt,
        unit: cleanUnit,
        dose: cleanDose,
        time: suppTime,
        taken: Boolean(s.taken),
        takenAt: s.loggedAt,
      });

      // Add to routine harvest
      const routineKey = `${String(s.name).trim().toLowerCase()}_${suppTime}`;
      if (!routineHarvestMap.has(routineKey)) {
        routineHarvestMap.set(routineKey, {
          id: `r_${suppId}`,
          name: String(s.name),
          category: s.category || 'supplement',
          amount: numAmt,
          unit: cleanUnit,
          dose: cleanDose,
          time: suppTime,
        });
      }
    }

    // AI Report (Parity with A6)
    let aiReport = undefined;
    if (v2Day.aiReport && typeof v2Day.aiReport === 'object') {
      const rep = v2Day.aiReport;
      aiReport = {
        overallGrade: String(rep.overallGrade || 'B'),
        headline: String(rep.headline || 'Daily Nutrition Audit'),
        caloricBalance: String(rep.caloricBalance || ''),
        macroBreakdown: String(rep.macroBreakdown || ''),
        mistakesAndBlindSpots: Array.isArray(rep.mistakesAndBlindSpots)
          ? rep.mistakesAndBlindSpots.map(String)
          : [],
        actionableTomorrowFixes: Array.isArray(rep.actionableTomorrowFixes)
          ? rep.actionableTomorrowFixes.map(String)
          : [],
        customMealSuggestion: String(rep.customMealSuggestion || ''),
        coachNote: String(rep.coachNote || ''),
        generatedAt: String(rep.generatedAt || new Date().toISOString()),
      };
    }

    dailyLogs[dateStr] = {
      date: dateStr,
      meals,
      waterGlasses: Math.max(
        0,
        Math.round((Number(v2Day.waterMl) || 0) / 250)
      ),
      steps: Math.max(0, Number(v2Day.steps) || 0),
      workouts: workouts.length > 0 ? workouts : undefined,
      dailySupplements:
        dailySupplements.length > 0 ? dailySupplements : undefined,
      supplements:
        dailySupplements.length > 0
          ? dailySupplements.map((s) => ({ itemId: s.id, taken: s.taken }))
          : undefined,
      aiReport,
    };
  }

  // 5. Migrate Custom Foods
  const customFoods: FoodItem[] = [];
  for (const cf of v2CustomFoods) {
    if (!cf || !cf.name) continue;
    customFoods.push({
      id: cf.id || `custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: String(cf.name),
      brand: typeof cf.brand === 'string' ? cf.brand : undefined,
      barcode: typeof cf.barcode === 'string' ? cf.barcode : undefined,
      servingSize: String(cf.servingSize || '1 serving'),
      servingGrams: Number(cf.servingGrams) || 100,
      calories: Math.max(0, Number(cf.calories) || 0),
      protein: Math.max(0, Number(cf.protein) || 0),
      carbs: Math.max(0, Number(cf.carbs) || 0),
      fat: Math.max(0, Number(cf.fat) || 0),
      fiber: typeof cf.fiber === 'number' ? cf.fiber : undefined,
      calcium: typeof cf.calcium === 'number' ? cf.calcium : undefined,
      iron: typeof cf.iron === 'number' ? cf.iron : undefined,
      vitaminC: typeof cf.vitaminC === 'number' ? cf.vitaminC : undefined,
      vitaminA: typeof cf.vitaminA === 'number' ? cf.vitaminA : undefined,
      vitaminD: typeof cf.vitaminD === 'number' ? cf.vitaminD : undefined,
      vitaminB12: typeof cf.vitaminB12 === 'number' ? cf.vitaminB12 : undefined,
      magnesium: typeof cf.magnesium === 'number' ? cf.magnesium : undefined,
      zinc: typeof cf.zinc === 'number' ? cf.zinc : undefined,
      source: 'custom',
    });
  }

  // 6. Migrate Weight History
  const weightHistory: WeightEntry[] = [];
  for (const wh of v2WeightHistory) {
    if (!wh || !wh.date || typeof wh.weightKg !== 'number') continue;
    let note = typeof wh.note === 'string' ? wh.note : undefined;
    if (typeof wh.bodyFatPercent === 'number') {
      note = note
        ? `${note} (Body fat: ${wh.bodyFatPercent}%)`
        : `Body fat: ${wh.bodyFatPercent}%`;
    }
    weightHistory.push({
      id: `w_${wh.date}_${Math.random().toString(36).slice(2, 6)}`,
      date: wh.date,
      weightKg: wh.weightKg,
      note,
      timestamp: `${wh.date}T08:00:00.000Z`,
    });
  }

  // 7. Assemble v4 Backup Object
  const candidateBackup: FitTrackBackup = {
    version: '4.0',
    exportedAt: String(root.exportedAt || new Date().toISOString()),
    profile,
    dailyLogs,
    supplementRoutine: Array.from(routineHarvestMap.values()),
    weightHistory,
    customFoods: customFoods.length > 0 ? customFoods : undefined,
  };

  // 8. Strict validation through v4 backup schema to guarantee 100% integrity
  const validated = validateBackup(candidateBackup);
  const summary = computeBackupSummary(validated);

  return {
    backup: validated,
    summary,
    sourceVersion: '2.0',
    migratedCustomFoodsCount: customFoods.length,
  };
}
