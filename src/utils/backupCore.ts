import {
  FitTrackBackup,
  BackupSummary,
  UserProfile,
  DailyLog,
  LoggedMeal,
  WorkoutEntry,
  SupplementRoutineItem,
  SupplementCheck,
  WeightEntry,
  ReminderSettings,
  FoodItem,
} from '../types';

type Validator<T = any> = (value: unknown) => T;

const invalid = (): never => {
  throw new Error('Invalid backup file format.');
};

const str: Validator<string> = (v) => (typeof v === 'string' ? v : invalid());
const num: Validator<number> = (v) =>
  typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : invalid();
const bool: Validator<boolean> = (v) => (typeof v === 'boolean' ? v : invalid());

const date: Validator<string> = (v) => {
  if (
    typeof v === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(v) &&
    !Number.isNaN(Date.parse(v)) &&
    new Date(v).toISOString().slice(0, 10) === v
  ) {
    return v;
  }
  return invalid();
};

const choice = <T extends string>(...values: T[]): Validator<T> => (v) =>
  values.includes(v as T) ? (v as T) : invalid();

const optional = <T>(check: Validator<T>): Validator<T | undefined> => (v) =>
  v === undefined || v === null ? undefined : check(v);

const list = <T>(check: Validator<T>): Validator<T[]> => (v) =>
  Array.isArray(v) ? v.map(check) : invalid();

const record = (v: unknown): Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : invalid();

const shape = <T extends object>(
  fields: { [K in keyof T]: Validator<T[K]> }
): Validator<T> => (v) => {
  const source = record(v);
  const result: Record<string, unknown> = {};
  // Strict allowlist: only fields declared in the schema are copied.
  // Secrets, tokens, and unknown fields are automatically discarded.
  for (const [key, check] of Object.entries(fields)) {
    const value = (check as Validator)(source[key]);
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result as T;
};

// Nutrients & Food Meal
const mealShape = shape<LoggedMeal>({
  id: str,
  foodId: str,
  name: str,
  brand: optional(str),
  category: optional(str),
  mealType: choice('breakfast', 'lunch', 'dinner', 'snack'),
  servings: num,
  servingSize: str,
  servingGrams: num,
  calories: num,
  protein: num,
  carbs: num,
  fat: num,
  fiber: optional(num),
  sugar: optional(num),
  sodium: optional(num),
  potassium: optional(num),
  calcium: optional(num),
  iron: optional(num),
  vitaminC: optional(num),
  timestamp: str,
});

// Exercise & Workout
const exerciseSetShape = shape({
  setNum: num,
  weightKg: optional(num),
  reps: optional(num),
  completed: optional(bool),
});

const workoutShape = shape<WorkoutEntry>({
  id: str,
  name: str,
  category: choice('strength', 'cardio', 'hiit', 'sports', 'flexibility'),
  durationMinutes: num,
  caloriesBurned: num,
  sets: optional(list(exerciseSetShape)),
  loggedAt: str,
  calorieSource: optional(choice('user_entered', 'met_estimate')),
  note: optional(str),
});

// Supplements
const supplementCheckShape = shape<SupplementCheck>({
  itemId: str,
  taken: bool,
  takenAt: optional(str),
});

const loggedDailySupplementShape = shape({
  id: str,
  routineItemId: optional(str),
  name: str,
  category: optional(choice('vitamin', 'mineral', 'supplement', 'other')),
  amount: optional(num),
  unit: optional(str),
  dose: optional(str),
  note: optional(str),
  time: choice('morning', 'afternoon', 'evening', 'bedtime'),
  taken: bool,
  takenAt: optional(str),
});

const supplementRoutineItemShape = shape<SupplementRoutineItem>({
  id: str,
  name: str,
  category: optional(choice('vitamin', 'mineral', 'supplement', 'other')),
  amount: optional(num),
  unit: optional(str),
  dose: optional(str),
  note: optional(str),
  time: choice('morning', 'afternoon', 'evening', 'bedtime'),
});

// Daily Log
const dayLogShape = shape<DailyLog>({
  date,
  meals: list(mealShape),
  waterGlasses: num,
  steps: num,
  supplements: optional(list(supplementCheckShape)),
  dailySupplements: optional(list(loggedDailySupplementShape)),
  workouts: optional(list(workoutShape)),
});

// User Profile
const profileShape = shape<UserProfile>({
  name: str,
  age: num,
  gender: choice('male', 'female', 'other'),
  weightKg: num,
  heightCm: num,
  activityLevel: choice('sedentary', 'light', 'moderate', 'very_active', 'athlete'),
  goal: choice('fat_loss_aggressive', 'fat_loss_moderate', 'maintenance', 'lean_bulk', 'muscle_gain'),
  bmr: num,
  tdee: num,
  targetCalories: num,
  targetProtein: num,
  targetCarbs: num,
  targetFat: num,
  waterTargetGlasses: num,
  language: optional(choice('en', 'ar', 'ckb')),
  isOnboarded: optional(bool),
  includeWorkoutsInCalorieBudget: optional(bool),
});

// Reminders
const timeSettingShape = shape({
  hour: num,
  minute: num,
  enabled: bool,
});

const reminderSettingsShape = shape<ReminderSettings>({
  supplementsEnabled: bool,
  supplementTimes: optional(
    shape({
      morning: timeSettingShape,
      afternoon: timeSettingShape,
      evening: timeSettingShape,
      bedtime: timeSettingShape,
    })
  ) as any,
  water: shape({
    enabled: bool,
    intervalHours: num,
    startHour: num,
    endHour: num,
  }),
  meals: shape({
    breakfast: timeSettingShape,
    lunch: timeSettingShape,
    dinner: timeSettingShape,
    snack: timeSettingShape,
  }),
});

// Weight Entry
const weightEntryShape = shape<WeightEntry>({
  id: str,
  date,
  weightKg: num,
  note: optional(str),
  timestamp: str,
});

// Food Item (Recent, Favorite, Custom)
const foodItemShape = shape<FoodItem>({
  id: str,
  name: str,
  brand: optional(str),
  servingSize: str,
  servingGrams: num,
  calories: num,
  protein: num,
  carbs: num,
  fat: num,
  category: optional(str),
  barcode: optional(str),
  imageUrl: optional(str),
  source: optional(choice('verified_database', 'usda_sr28', 'custom', 'open_food_facts', 'ai_estimated')),
  fiber: optional(num),
  sugar: optional(num),
  sugars: optional(num),
  nutriScore: optional(str),
  sodium: optional(num),
  potassium: optional(num),
  calcium: optional(num),
  iron: optional(num),
  vitaminC: optional(num),
});

// Full Backup Root Validator
const backupShape = shape<FitTrackBackup>({
  version: choice('4.0'),
  exportedAt: str,
  profile: profileShape,
  dailyLogs: (v: unknown) => {
    const src = record(v);
    const result: Record<string, DailyLog> = {};
    for (const [key, value] of Object.entries(src)) {
      date(key);
      const entry = dayLogShape(value);
      if (entry.date !== key) {
        invalid();
      }
      result[key] = entry;
    }
    return result;
  },
  supplementRoutine: list(supplementRoutineItemShape),
  weightHistory: list(weightEntryShape),
  reminderSettings: optional(reminderSettingsShape),
  recentFoods: optional(list(foodItemShape)),
  favoriteFoods: optional(list(foodItemShape)),
  customFoods: optional(list(foodItemShape)),
  barcodeCache: optional(list(foodItemShape)),
});

/**
 * Validates an in-memory backup object against the schema.
 * Throws an error if the format is invalid or corrupted.
 */
export function validateBackup(value: unknown): FitTrackBackup {
  return backupShape(value);
}

/**
 * Validates and parses raw backup JSON text.
 * Throws an error if the format is invalid or corrupted.
 */
export function parseBackup(json: string): FitTrackBackup {
  try {
    const raw = JSON.parse(json);
    return backupShape(raw);
  } catch {
    return invalid();
  }
}

/**
 * Serializes and validates a backup object, ensuring that only allowlisted fields
 * are included and no secrets or private keys are serialized.
 */
export function serializeBackup(value: unknown): string {
  const validated = backupShape(value);
  return JSON.stringify(validated, null, 2);
}

/**
 * Computes a human-readable summary of the backup payload.
 */
export function computeBackupSummary(backup: FitTrackBackup): BackupSummary {
  const logEntries = Object.values(backup.dailyLogs || {});
  const mealsCount = logEntries.reduce((acc, log) => acc + (log.meals?.length || 0), 0);
  const workoutsCount = logEntries.reduce((acc, log) => acc + (log.workouts?.length || 0), 0);

  return {
    daysCount: Object.keys(backup.dailyLogs || {}).length,
    mealsCount,
    workoutsCount,
    weightsCount: (backup.weightHistory || []).length,
    routineItemsCount: (backup.supplementRoutine || []).length,
    hasProfile: Boolean(backup.profile?.name),
    hasReminders: Boolean(backup.reminderSettings),
  };
}
