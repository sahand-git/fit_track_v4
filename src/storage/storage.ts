import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile, DailyLog, LoggedMeal, SupplementCheck, SupplementRoutineItem, WorkoutEntry, FitTrackBackup, WeightEntry, ReminderSettings } from '../types';
import { normalizeSupplementRoutine } from '../utils/supplementUtils';
import { getDefaultProfile } from '../utils/calculator';

const PROFILE_KEY = '@fittrack_profile';
const DAILY_LOG_PREFIX = '@fittrack_log_';
const SUPPLEMENT_ROUTINE_KEY = '@fittrack_supplement_routine';
const WEIGHT_HISTORY_KEY = '@fittrack_weight_history';
const REMINDER_SETTINGS_KEY = '@fittrack_reminder_settings';

// Per-key write queue to eliminate read-modify-write race conditions
const keyQueues = new Map<string, Promise<unknown>>();

export function enqueueStorageOperation<T>(key: string, task: () => Promise<T>): Promise<T> {
  const previous = keyQueues.get(key) || Promise.resolve();
  const next = previous
    .catch(() => {})
    .then(task);
  keyQueues.set(key, next);
  next.finally(() => {
    if (keyQueues.get(key) === next) {
      keyQueues.delete(key);
    }
  });
  return next;
}

// Safe parsing utilities
function safeParseObject<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return { ...fallback, ...parsed };
    }
    return fallback;
  } catch (err) {
    console.warn('safeParseObject failed to parse JSON, returning fallback:', err);
    return fallback;
  }
}

function safeParseArray<T>(raw: string | null): T[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('safeParseArray failed to parse JSON, returning empty array:', err);
    return [];
  }
}

export async function loadUserProfile(): Promise<UserProfile> {
  try {
    const raw = await AsyncStorage.getItem(PROFILE_KEY);
    if (!raw) {
      return { ...getDefaultProfile(), isOnboarded: false };
    }
    const def = { ...getDefaultProfile(), isOnboarded: false };
    return safeParseObject<UserProfile>(raw, def);
  } catch (err) {
    console.error('Error loading profile:', err);
    return getDefaultProfile();
  }
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  return enqueueStorageOperation(PROFILE_KEY, async () => {
    try {
      await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    } catch (err) {
      console.error('Error saving profile:', err);
      throw new Error('Failed to save user profile. Please check device storage.');
    }
  });
}

export async function loadDailyLog(dateStr: string): Promise<DailyLog> {
  const fallback: DailyLog = {
    date: dateStr,
    meals: [],
    waterGlasses: 0,
    steps: 0,
    supplements: [],
    workouts: [],
  };
  try {
    const key = `${DAILY_LOG_PREFIX}${dateStr}`;
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = safeParseObject<DailyLog>(raw, fallback);
    return {
      ...parsed,
      date: dateStr,
      meals: Array.isArray(parsed.meals) ? parsed.meals : [],
      waterGlasses: typeof parsed.waterGlasses === 'number' && !isNaN(parsed.waterGlasses) ? Math.max(0, parsed.waterGlasses) : 0,
      steps: typeof parsed.steps === 'number' && !isNaN(parsed.steps) ? Math.max(0, parsed.steps) : 0,
      supplements: Array.isArray(parsed.supplements) ? parsed.supplements : [],
      dailySupplements: Array.isArray(parsed.dailySupplements) ? parsed.dailySupplements : undefined,
      workouts: Array.isArray(parsed.workouts) ? parsed.workouts : [],
    };
  } catch (err) {
    console.error('Error loading daily log:', err);
    return fallback;
  }
}

export async function saveDailyLog(log: DailyLog): Promise<void> {
  const key = `${DAILY_LOG_PREFIX}${log.date}`;
  return enqueueStorageOperation(key, async () => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(log));
    } catch (err) {
      console.error('Error saving daily log:', err);
      throw new Error(`Failed to save daily log for ${log.date}.`);
    }
  });
}

export async function addMealToDay(dateStr: string, meal: LoggedMeal): Promise<DailyLog> {
  const key = `${DAILY_LOG_PREFIX}${dateStr}`;
  return enqueueStorageOperation(key, async () => {
    const current = await loadDailyLog(dateStr);
    const updatedMeals = [...current.meals, meal];
    const updatedLog: DailyLog = { ...current, meals: updatedMeals };
    await AsyncStorage.setItem(key, JSON.stringify(updatedLog));
    return updatedLog;
  });
}

export async function updateMealInDay(dateStr: string, updatedMeal: LoggedMeal): Promise<DailyLog> {
  const key = `${DAILY_LOG_PREFIX}${dateStr}`;
  return enqueueStorageOperation(key, async () => {
    const current = await loadDailyLog(dateStr);
    const updatedMeals = current.meals.map(m => m.id === updatedMeal.id ? updatedMeal : m);
    const updatedLog: DailyLog = { ...current, meals: updatedMeals };
    await AsyncStorage.setItem(key, JSON.stringify(updatedLog));
    return updatedLog;
  });
}

export async function removeMealFromDay(dateStr: string, mealId: string): Promise<DailyLog> {
  const key = `${DAILY_LOG_PREFIX}${dateStr}`;
  return enqueueStorageOperation(key, async () => {
    const current = await loadDailyLog(dateStr);
    const updatedMeals = current.meals.filter(m => m.id !== mealId);
    const updatedLog: DailyLog = { ...current, meals: updatedMeals };
    await AsyncStorage.setItem(key, JSON.stringify(updatedLog));
    return updatedLog;
  });
}

export async function updateWater(dateStr: string, delta: number): Promise<DailyLog> {
  const key = `${DAILY_LOG_PREFIX}${dateStr}`;
  return enqueueStorageOperation(key, async () => {
    const current = await loadDailyLog(dateStr);
    const updatedGlasses = Math.max(0, current.waterGlasses + delta);
    const updatedLog: DailyLog = { ...current, waterGlasses: updatedGlasses };
    await AsyncStorage.setItem(key, JSON.stringify(updatedLog));
    return updatedLog;
  });
}

export async function loadSupplementRoutine(): Promise<SupplementRoutineItem[]> {
  try {
    const raw = await AsyncStorage.getItem(SUPPLEMENT_ROUTINE_KEY);
    if (!raw) return [];
    const parsed = safeParseArray<unknown>(raw);
    return normalizeSupplementRoutine(parsed);
  } catch (err) {
    console.error('Error loading supplement routine:', err);
    return [];
  }
}

export async function saveSupplementRoutine(items: SupplementRoutineItem[]): Promise<void> {
  return enqueueStorageOperation(SUPPLEMENT_ROUTINE_KEY, async () => {
    try {
      await AsyncStorage.setItem(SUPPLEMENT_ROUTINE_KEY, JSON.stringify(items));
    } catch (err) {
      console.error('Error saving supplement routine:', err);
      throw new Error('Failed to save supplement routine.');
    }
  });
}

export async function saveDailySupplements(
  dateStr: string,
  items: import('../types').LoggedDailySupplement[]
): Promise<DailyLog> {
  const key = `${DAILY_LOG_PREFIX}${dateStr}`;
  return enqueueStorageOperation(key, async () => {
    const current = await loadDailyLog(dateStr);
    const updatedChecks: SupplementCheck[] = items.map((it) => ({
      itemId: it.id,
      taken: it.taken,
      takenAt: it.takenAt,
    }));
    const updated: DailyLog = {
      ...current,
      dailySupplements: items,
      supplements: updatedChecks,
    };
    await AsyncStorage.setItem(key, JSON.stringify(updated));
    return updated;
  });
}

export async function setSupplementTaken(dateStr: string, itemId: string, taken: boolean): Promise<DailyLog> {
  const key = `${DAILY_LOG_PREFIX}${dateStr}`;
  return enqueueStorageOperation(key, async () => {
    const current = await loadDailyLog(dateStr);
    const takenAt = taken ? new Date().toISOString() : undefined;

    let updatedDailySupplements: import('../types').LoggedDailySupplement[];

    if (current.dailySupplements !== undefined) {
      updatedDailySupplements = current.dailySupplements.map((s) => {
        if (s.id === itemId || s.routineItemId === itemId) {
          return {
            ...s,
            taken,
            takenAt,
          };
        }
        return s;
      });
    } else {
      // Daily supplements not initialized yet, seed from routine
      const routine = await loadSupplementRoutine();
      const existingChecks = new Set((current.supplements || []).filter((c) => c.taken).map((c) => c.itemId));
      if (routine && routine.length > 0) {
        updatedDailySupplements = routine.map((r) => {
          const isTarget = r.id === itemId;
          const isTaken = isTarget ? taken : existingChecks.has(r.id);
          return {
            id: r.id,
            routineItemId: r.id,
            name: r.name,
            category: r.category || 'supplement',
            amount: r.amount,
            unit: r.unit,
            dose: r.dose,
            note: r.note,
            time: r.time,
            taken: isTaken,
            takenAt: isTaken ? (isTarget ? takenAt : new Date().toISOString()) : undefined,
          };
        });
      } else {
        updatedDailySupplements = [];
      }
    }

    const supplements = current.supplements || [];
    const existing = supplements.find((item) => item.itemId === itemId);
    const nextChecks: SupplementCheck[] = existing
      ? supplements.map((item) =>
          item.itemId === itemId ? { ...item, taken, takenAt } : item
        )
      : [...supplements, { itemId, taken, ...(takenAt ? { takenAt } : {}) }];

    const updated: DailyLog = {
      ...current,
      supplements: nextChecks,
      dailySupplements: updatedDailySupplements,
    };
    await AsyncStorage.setItem(key, JSON.stringify(updated));
    return updated;
  });
}

export async function loadWeightHistory(): Promise<import('../types').WeightEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(WEIGHT_HISTORY_KEY);
    if (!raw) return [];
    return safeParseArray<import('../types').WeightEntry>(raw);
  } catch (err) {
    console.error('Error loading weight history:', err);
    return [];
  }
}

export async function addWeightEntry(entry: import('../types').WeightEntry): Promise<import('../types').WeightEntry[]> {
  return enqueueStorageOperation(WEIGHT_HISTORY_KEY, async () => {
    const history = await loadWeightHistory();
    const filtered = history.filter(h => h.date !== entry.date);
    const updated = [...filtered, entry].sort((a, b) => a.date.localeCompare(b.date));
    await AsyncStorage.setItem(WEIGHT_HISTORY_KEY, JSON.stringify(updated));
    return updated;
  });
}

export async function removeWeightEntry(id: string): Promise<import('../types').WeightEntry[]> {
  return enqueueStorageOperation(WEIGHT_HISTORY_KEY, async () => {
    const history = await loadWeightHistory();
    const updated = history.filter(h => h.id !== id);
    await AsyncStorage.setItem(WEIGHT_HISTORY_KEY, JSON.stringify(updated));
    return updated;
  });
}

export async function loadLogsForDates(dates: string[]): Promise<Record<string, DailyLog>> {
  const result: Record<string, DailyLog> = {};
  await Promise.all(
    dates.map(async (d) => {
      result[d] = await loadDailyLog(d);
    })
  );
  return result;
}

export const DEFAULT_REMINDER_SETTINGS: import('../types').ReminderSettings = {
  supplementsEnabled: false,
  supplementTimes: {
    morning: { hour: 8, minute: 0, enabled: true },
    afternoon: { hour: 13, minute: 0, enabled: true },
    evening: { hour: 18, minute: 0, enabled: true },
    bedtime: { hour: 21, minute: 30, enabled: true },
  },
  water: {
    enabled: false,
    intervalHours: 2,
    startHour: 8,
    endHour: 20,
  },
  meals: {
    breakfast: { hour: 8, minute: 30, enabled: false },
    lunch: { hour: 12, minute: 30, enabled: false },
    dinner: { hour: 19, minute: 0, enabled: false },
    snack: { hour: 16, minute: 0, enabled: false },
  },
};

export async function loadReminderSettings(): Promise<import('../types').ReminderSettings> {
  try {
    const raw = await AsyncStorage.getItem(REMINDER_SETTINGS_KEY);
    if (!raw) return DEFAULT_REMINDER_SETTINGS;
    const parsed = safeParseObject<Partial<import('../types').ReminderSettings>>(raw, {});
    return {
      ...DEFAULT_REMINDER_SETTINGS,
      ...parsed,
      supplementTimes: {
        ...DEFAULT_REMINDER_SETTINGS.supplementTimes,
        ...(parsed.supplementTimes || {}),
      },
      water: {
        ...DEFAULT_REMINDER_SETTINGS.water,
        ...(parsed.water || {}),
      },
      meals: {
        ...DEFAULT_REMINDER_SETTINGS.meals,
        ...(parsed.meals || {}),
      },
    };
  } catch (err) {
    console.error('Error loading reminder settings:', err);
    return DEFAULT_REMINDER_SETTINGS;
  }
}

export async function saveReminderSettings(settings: import('../types').ReminderSettings): Promise<void> {
  return enqueueStorageOperation(REMINDER_SETTINGS_KEY, async () => {
    try {
      await AsyncStorage.setItem(REMINDER_SETTINGS_KEY, JSON.stringify(settings));
    } catch (err) {
      console.error('Error saving reminder settings:', err);
      throw new Error('Failed to save reminder settings.');
    }
  });
}

// Workout mutations
export async function addWorkoutToDay(dateStr: string, workout: WorkoutEntry): Promise<DailyLog> {
  const key = `${DAILY_LOG_PREFIX}${dateStr}`;
  return enqueueStorageOperation(key, async () => {
    const current = await loadDailyLog(dateStr);
    const existingWorkouts = current.workouts || [];
    const updatedWorkouts = [...existingWorkouts, workout];
    const updatedLog: DailyLog = { ...current, workouts: updatedWorkouts };
    await AsyncStorage.setItem(key, JSON.stringify(updatedLog));
    return updatedLog;
  });
}

export async function updateWorkoutInDay(dateStr: string, updatedWorkout: WorkoutEntry): Promise<DailyLog> {
  const key = `${DAILY_LOG_PREFIX}${dateStr}`;
  return enqueueStorageOperation(key, async () => {
    const current = await loadDailyLog(dateStr);
    const existingWorkouts = current.workouts || [];
    const updatedWorkouts = existingWorkouts.map((w) => (w.id === updatedWorkout.id ? updatedWorkout : w));
    const updatedLog: DailyLog = { ...current, workouts: updatedWorkouts };
    await AsyncStorage.setItem(key, JSON.stringify(updatedLog));
    return updatedLog;
  });
}

export async function removeWorkoutFromDay(dateStr: string, workoutId: string): Promise<DailyLog> {
  const key = `${DAILY_LOG_PREFIX}${dateStr}`;
  return enqueueStorageOperation(key, async () => {
    const current = await loadDailyLog(dateStr);
    const existingWorkouts = current.workouts || [];
    const updatedWorkouts = existingWorkouts.filter((w) => w.id !== workoutId);
    const updatedLog: DailyLog = { ...current, workouts: updatedWorkouts };
    await AsyncStorage.setItem(key, JSON.stringify(updatedLog));
    return updatedLog;
  });
}

// Backup & Restore
export async function getAllDailyLogs(): Promise<Record<string, DailyLog>> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const logKeys = allKeys.filter((k) => k.startsWith(DAILY_LOG_PREFIX));
    const result: Record<string, DailyLog> = {};

    await Promise.all(
      logKeys.map(async (key) => {
        const dateStr = key.replace(DAILY_LOG_PREFIX, '');
        const log = await loadDailyLog(dateStr);
        result[dateStr] = log;
      })
    );
    return result;
  } catch (err) {
    console.error('Error fetching all daily logs:', err);
    return {};
  }
}

export async function restoreAllData(
  backup: FitTrackBackup,
  mode: 'replace' | 'merge'
): Promise<void> {
  if (mode === 'replace') {
    // 1. Clear all existing log keys
    const allKeys = await AsyncStorage.getAllKeys();
    const existingLogKeys = allKeys.filter((k) => k.startsWith(DAILY_LOG_PREFIX));
    if (existingLogKeys.length > 0) {
      await AsyncStorage.multiRemove(existingLogKeys);
    }

    // 2. Write profile
    await saveUserProfile(backup.profile);

    // 3. Write each daily log
    for (const [dateStr, dayLog] of Object.entries(backup.dailyLogs || {})) {
      await saveDailyLog({ ...dayLog, date: dateStr });
    }

    // 4. Write supplement routine
    await saveSupplementRoutine(backup.supplementRoutine || []);

    // 5. Write weight history
    await AsyncStorage.setItem(WEIGHT_HISTORY_KEY, JSON.stringify(backup.weightHistory || []));

    // 6. Write reminder settings if present
    if (backup.reminderSettings) {
      await saveReminderSettings(backup.reminderSettings);
    }
  } else {
    // MERGE mode
    // 1. Profile: preserve existing non-defaults or update with incoming profile
    const currentProfile = await loadUserProfile();
    await saveUserProfile({
      ...currentProfile,
      ...backup.profile,
    });

    // 2. Daily logs: merge per date
    for (const [dateStr, incomingLog] of Object.entries(backup.dailyLogs || {})) {
      const currentLog = await loadDailyLog(dateStr);

      // Merge meals: avoid duplicate IDs
      const existingMealIds = new Set(currentLog.meals.map((m) => m.id));
      const mergedMeals = [
        ...currentLog.meals,
        ...(incomingLog.meals || []).filter((m) => !existingMealIds.has(m.id)),
      ];

      // Merge workouts: avoid duplicate IDs
      const existingWorkoutIds = new Set((currentLog.workouts || []).map((w) => w.id));
      const mergedWorkouts = [
        ...(currentLog.workouts || []),
        ...(incomingLog.workouts || []).filter((w) => !existingWorkoutIds.has(w.id)),
      ];

      // Water & steps: take higher recorded value
      const waterGlasses = Math.max(currentLog.waterGlasses || 0, incomingLog.waterGlasses || 0);
      const steps = Math.max(currentLog.steps || 0, incomingLog.steps || 0);

      // Supplements: merge checks & daily supplements
      const existingSuppIds = new Set((currentLog.dailySupplements || []).map((s) => s.id));
      const mergedDailySupplements = [
        ...(currentLog.dailySupplements || []),
        ...(incomingLog.dailySupplements || []).filter((s) => !existingSuppIds.has(s.id)),
      ];

      const mergedLog: DailyLog = {
        date: dateStr,
        meals: mergedMeals,
        workouts: mergedWorkouts,
        waterGlasses,
        steps,
        supplements: incomingLog.supplements || currentLog.supplements,
        dailySupplements: mergedDailySupplements.length > 0 ? mergedDailySupplements : undefined,
      };

      await saveDailyLog(mergedLog);
    }

    // 3. Supplement routine: union by name/id
    const currentRoutine = await loadSupplementRoutine();
    const routineNames = new Set(currentRoutine.map((r) => r.name.toLowerCase()));
    const mergedRoutine = [
      ...currentRoutine,
      ...(backup.supplementRoutine || []).filter((r) => !routineNames.has(r.name.toLowerCase())),
    ];
    await saveSupplementRoutine(mergedRoutine);

    // 4. Weight history: union by date
    const currentWeights = await loadWeightHistory();
    const weightDates = new Set(currentWeights.map((w) => w.date));
    const mergedWeights = [
      ...currentWeights,
      ...(backup.weightHistory || []).filter((w) => !weightDates.has(w.date)),
    ].sort((a, b) => a.date.localeCompare(b.date));
    await AsyncStorage.setItem(WEIGHT_HISTORY_KEY, JSON.stringify(mergedWeights));

    // 5. Reminders
    if (backup.reminderSettings) {
      await saveReminderSettings(backup.reminderSettings);
    }
  }
}
