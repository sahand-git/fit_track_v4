import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  UserProfile,
  DailyLog,
  LoggedMeal,
  SupplementCheck,
  SupplementRoutineItem,
  WorkoutEntry,
  FitTrackBackup,
  FoodItem,
  AICoachReport,
  MealTemplate,
  MealTemplateItem,
  MealType,
} from '../types';
import { normalizeSupplementRoutine } from '../utils/supplementUtils';
import { getDefaultProfile } from '../utils/calculator';
import { getTodayDateString, addDaysToDateString } from '../utils/dateUtils';
import { validateBackup } from '../utils/backupCore';
import { calculateStreakByWalkback, getPreviousDayString } from '../utils/streak';
import { normalizeSearch } from '../utils/localeUtils';

const PROFILE_KEY = '@fittrack_profile';
const DAILY_LOG_PREFIX = '@fittrack_log_';
const SUPPLEMENT_ROUTINE_KEY = '@fittrack_supplement_routine';
const WEIGHT_HISTORY_KEY = '@fittrack_weight_history';
const REMINDER_SETTINGS_KEY = '@fittrack_reminder_settings';
const RECENT_FOODS_KEY = '@fittrack_recent_foods';
const FAVORITE_FOODS_KEY = '@fittrack_favorite_foods';
const CUSTOM_FOODS_KEY = '@fittrack_custom_foods';
const BARCODE_CACHE_KEY = '@fittrack_barcode_cache';
const MEAL_TEMPLATES_KEY = '@fittrack_meal_templates';
const MEDICAL_DISCLAIMER_KEY = '@fittrack_disclaimer_accepted';
let accountNamespace: string | null = null;

/** Signed-in data is isolated; null preserves all existing v4 guest keys verbatim. */
export function setAccountStorageNamespace(uid: string | null): void {
  accountNamespace = uid ? uid.replace(/[^a-zA-Z0-9_-]/g, '_') : null;
}

export function getScopedStorageKey(key: string): string {
  return accountNamespace ? `@fittrack_account_${accountNamespace}:${key}` : key;
}

function dailyLogPrefix(): string {
  return getScopedStorageKey(DAILY_LOG_PREFIX);
}

// Per-key write queue to eliminate read-modify-write race conditions
const keyQueues = new Map<string, Promise<unknown>>();
let activeRestorePromise: Promise<void> | null = null;

export function setRestoreLock(promise: Promise<void> | null): void {
  activeRestorePromise = promise;
}

export function getActiveRestoreLock(): Promise<void> | null {
  return activeRestorePromise;
}

export async function waitForPendingStorageOperations(): Promise<void> {
  const pending = Array.from(keyQueues.values());
  if (pending.length > 0) {
    await Promise.allSettled(pending);
  }
}

export function enqueueStorageOperation<T>(key: string, task: () => Promise<T>): Promise<T> {
  const previous = keyQueues.get(key) || Promise.resolve();
  const restoreWait = activeRestorePromise ? activeRestorePromise.catch(() => {}) : Promise.resolve();

  const next = Promise.all([previous.catch(() => {}), restoreWait])
    .then(() => task());

  keyQueues.set(key, next);

  next
    .finally(() => {
      if (keyQueues.get(key) === next) {
        keyQueues.delete(key);
      }
    })
    .catch(() => {
      // Suppress unhandled rejection on the cleanup promise branch.
      // The caller awaiting `next` will still receive the original rejection.
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
    const raw = await AsyncStorage.getItem(getScopedStorageKey(PROFILE_KEY));
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
  return enqueueStorageOperation(getScopedStorageKey(PROFILE_KEY), async () => {
    try {
      await AsyncStorage.setItem(getScopedStorageKey(PROFILE_KEY), JSON.stringify(profile));
    } catch (err) {
      console.error('Error saving profile:', err);
      throw new Error('Failed to save user profile. Please check device storage.');
    }
  });
}

export async function loadMedicalDisclaimerAccepted(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(getScopedStorageKey(MEDICAL_DISCLAIMER_KEY));
    if (raw === 'true') return true;
    const profile = await loadUserProfile();
    return !!profile.hasAcceptedMedicalDisclaimer;
  } catch (err) {
    console.warn('Failed to load medical disclaimer state:', err);
    return false;
  }
}

export async function saveMedicalDisclaimerAccepted(accepted: boolean): Promise<void> {
  return enqueueStorageOperation(getScopedStorageKey(MEDICAL_DISCLAIMER_KEY), async () => {
    try {
      await AsyncStorage.setItem(
        getScopedStorageKey(MEDICAL_DISCLAIMER_KEY),
        accepted ? 'true' : 'false'
      );
      const profile = await loadUserProfile();
      if (profile.hasAcceptedMedicalDisclaimer !== accepted) {
        await AsyncStorage.setItem(
          getScopedStorageKey(PROFILE_KEY),
          JSON.stringify({ ...profile, hasAcceptedMedicalDisclaimer: accepted })
        );
      }
    } catch (err) {
      console.error('Failed to save medical disclaimer state:', err);
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
    const key = getScopedStorageKey(`${DAILY_LOG_PREFIX}${dateStr}`);
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
      aiReport: parsed.aiReport && typeof parsed.aiReport === 'object' ? parsed.aiReport : undefined,
    };
  } catch (err) {
    console.error('Error loading daily log:', err);
    return fallback;
  }
}

export async function saveDailyAIReport(dateStr: string, report: AICoachReport): Promise<DailyLog> {
  const key = getScopedStorageKey(`${DAILY_LOG_PREFIX}${dateStr}`);
  return enqueueStorageOperation(key, async () => {
    const current = await loadDailyLog(dateStr);
    const updatedLog: DailyLog = { ...current, aiReport: report };
    await AsyncStorage.setItem(key, JSON.stringify(updatedLog));
    return updatedLog;
  });
}

export async function saveDailyLog(log: DailyLog): Promise<void> {
  const key = getScopedStorageKey(`${DAILY_LOG_PREFIX}${log.date}`);
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
  const key = getScopedStorageKey(`${DAILY_LOG_PREFIX}${dateStr}`);
  return enqueueStorageOperation(key, async () => {
    const current = await loadDailyLog(dateStr);
    const updatedMeals = [...current.meals, meal];
    const updatedLog: DailyLog = { ...current, meals: updatedMeals };
    await AsyncStorage.setItem(key, JSON.stringify(updatedLog));
    return updatedLog;
  });
}

export async function updateMealInDay(dateStr: string, updatedMeal: LoggedMeal): Promise<DailyLog> {
  const key = getScopedStorageKey(`${DAILY_LOG_PREFIX}${dateStr}`);
  return enqueueStorageOperation(key, async () => {
    const current = await loadDailyLog(dateStr);
    const updatedMeals = current.meals.map(m => m.id === updatedMeal.id ? updatedMeal : m);
    const updatedLog: DailyLog = { ...current, meals: updatedMeals };
    await AsyncStorage.setItem(key, JSON.stringify(updatedLog));
    return updatedLog;
  });
}

export async function removeMealFromDay(dateStr: string, mealId: string): Promise<DailyLog> {
  const key = getScopedStorageKey(`${DAILY_LOG_PREFIX}${dateStr}`);
  return enqueueStorageOperation(key, async () => {
    const current = await loadDailyLog(dateStr);
    const updatedMeals = current.meals.filter(m => m.id !== mealId);
    const updatedLog: DailyLog = { ...current, meals: updatedMeals };
    await AsyncStorage.setItem(key, JSON.stringify(updatedLog));
    return updatedLog;
  });
}

export async function updateWater(dateStr: string, delta: number): Promise<DailyLog> {
  const key = getScopedStorageKey(`${DAILY_LOG_PREFIX}${dateStr}`);
  return enqueueStorageOperation(key, async () => {
    const current = await loadDailyLog(dateStr);
    const updatedGlasses = Math.max(0, current.waterGlasses + delta);
    const updatedLog: DailyLog = { ...current, waterGlasses: updatedGlasses };
    await AsyncStorage.setItem(key, JSON.stringify(updatedLog));
    return updatedLog;
  });
}

export async function setDailySteps(dateStr: string, steps: number): Promise<DailyLog> {
  const key = getScopedStorageKey(`${DAILY_LOG_PREFIX}${dateStr}`);
  return enqueueStorageOperation(key, async () => {
    const current = await loadDailyLog(dateStr);
    const updatedLog: DailyLog = { ...current, steps: Math.max(0, Math.round(Number.isFinite(steps) ? steps : 0)) };
    await AsyncStorage.setItem(key, JSON.stringify(updatedLog));
    return updatedLog;
  });
}

export async function addDailySteps(dateStr: string, amount: number): Promise<DailyLog> {
  const key = getScopedStorageKey(`${DAILY_LOG_PREFIX}${dateStr}`);
  return enqueueStorageOperation(key, async () => {
    const current = await loadDailyLog(dateStr);
    const safeAmount = Math.max(0, Math.round(Number.isFinite(amount) ? amount : 0));
    const updatedLog: DailyLog = { ...current, steps: current.steps + safeAmount };
    await AsyncStorage.setItem(key, JSON.stringify(updatedLog));
    return updatedLog;
  });
}

export async function loadSupplementRoutine(): Promise<SupplementRoutineItem[]> {
  try {
    const raw = await AsyncStorage.getItem(getScopedStorageKey(SUPPLEMENT_ROUTINE_KEY));
    if (!raw) return [];
    const parsed = safeParseArray<unknown>(raw);
    return normalizeSupplementRoutine(parsed);
  } catch (err) {
    console.error('Error loading supplement routine:', err);
    return [];
  }
}

export async function saveSupplementRoutine(items: SupplementRoutineItem[]): Promise<void> {
  return enqueueStorageOperation(getScopedStorageKey(SUPPLEMENT_ROUTINE_KEY), async () => {
    try {
      await AsyncStorage.setItem(getScopedStorageKey(SUPPLEMENT_ROUTINE_KEY), JSON.stringify(items));
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
  const key = getScopedStorageKey(`${DAILY_LOG_PREFIX}${dateStr}`);
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
  const key = getScopedStorageKey(`${DAILY_LOG_PREFIX}${dateStr}`);
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
      const existingChecksMap = new Map((current.supplements || []).map((c) => [c.itemId, c]));
      if (routine && routine.length > 0) {
        updatedDailySupplements = routine.map((r) => {
          const isTarget = r.id === itemId;
          const existingCheck = existingChecksMap.get(r.id);
          const isTaken = isTarget ? taken : !!existingCheck?.taken;
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
            takenAt: isTaken
              ? isTarget
                ? takenAt
                : existingCheck?.takenAt || new Date().toISOString()
              : undefined,
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
    const raw = await AsyncStorage.getItem(getScopedStorageKey(WEIGHT_HISTORY_KEY));
    if (!raw) return [];
    return safeParseArray<import('../types').WeightEntry>(raw);
  } catch (err) {
    console.error('Error loading weight history:', err);
    return [];
  }
}

export async function addWeightEntry(entry: import('../types').WeightEntry): Promise<import('../types').WeightEntry[]> {
  return enqueueStorageOperation(getScopedStorageKey(WEIGHT_HISTORY_KEY), async () => {
    const history = await loadWeightHistory();
    const filtered = history.filter(h => h.date !== entry.date);
    const updated = [...filtered, entry].sort((a, b) => a.date.localeCompare(b.date));
    await AsyncStorage.setItem(getScopedStorageKey(WEIGHT_HISTORY_KEY), JSON.stringify(updated));
    return updated;
  });
}

export async function removeWeightEntry(id: string): Promise<import('../types').WeightEntry[]> {
  return enqueueStorageOperation(getScopedStorageKey(WEIGHT_HISTORY_KEY), async () => {
    const history = await loadWeightHistory();
    const updated = history.filter(h => h.id !== id);
    await AsyncStorage.setItem(getScopedStorageKey(WEIGHT_HISTORY_KEY), JSON.stringify(updated));
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

// Food collections (Recent, Favorites, Custom Foods)
export async function loadRecentFoods(): Promise<FoodItem[]> {
  try {
    const raw = await AsyncStorage.getItem(getScopedStorageKey(RECENT_FOODS_KEY));
    if (!raw) return [];
    return safeParseArray<FoodItem>(raw);
  } catch (err) {
    console.error('Error loading recent foods:', err);
    return [];
  }
}

export async function saveRecentFoods(foods: FoodItem[]): Promise<void> {
  const key = getScopedStorageKey(RECENT_FOODS_KEY);
  return enqueueStorageOperation(key, async () => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(foods));
    } catch (err) {
      console.error('Error saving recent foods:', err);
      throw new Error('Failed to save recent foods.');
    }
  });
}

export async function addRecentFood(food: FoodItem): Promise<FoodItem[]> {
  const key = getScopedStorageKey(RECENT_FOODS_KEY);
  return enqueueStorageOperation(key, async () => {
    const current = await loadRecentFoods();
    const filtered = current.filter(
      (f) => f.id !== food.id && f.name.trim().toLowerCase() !== food.name.trim().toLowerCase()
    );
    const updated = [food, ...filtered].slice(0, 30);
    await AsyncStorage.setItem(key, JSON.stringify(updated));
    return updated;
  });
}

export async function loadFavoriteFoods(): Promise<FoodItem[]> {
  try {
    const raw = await AsyncStorage.getItem(getScopedStorageKey(FAVORITE_FOODS_KEY));
    if (!raw) return [];
    return safeParseArray<FoodItem>(raw);
  } catch (err) {
    console.error('Error loading favorite foods:', err);
    return [];
  }
}

export async function saveFavoriteFoods(foods: FoodItem[]): Promise<void> {
  const key = getScopedStorageKey(FAVORITE_FOODS_KEY);
  return enqueueStorageOperation(key, async () => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(foods));
    } catch (err) {
      console.error('Error saving favorite foods:', err);
      throw new Error('Failed to save favorite foods.');
    }
  });
}

export async function toggleFavoriteFood(food: FoodItem): Promise<{ favorites: FoodItem[]; isFavorite: boolean }> {
  const key = getScopedStorageKey(FAVORITE_FOODS_KEY);
  return enqueueStorageOperation(key, async () => {
    const current = await loadFavoriteFoods();
    const index = current.findIndex(
      (f) => f.id === food.id || f.name.trim().toLowerCase() === food.name.trim().toLowerCase()
    );
    let updated: FoodItem[];
    let isFavorite: boolean;
    if (index >= 0) {
      updated = current.filter((_, i) => i !== index);
      isFavorite = false;
    } else {
      updated = [food, ...current];
      isFavorite = true;
    }
    await AsyncStorage.setItem(key, JSON.stringify(updated));
    return { favorites: updated, isFavorite };
  });
}

export async function loadCustomFoods(): Promise<FoodItem[]> {
  try {
    const raw = await AsyncStorage.getItem(getScopedStorageKey(CUSTOM_FOODS_KEY));
    if (!raw) return [];
    return safeParseArray<FoodItem>(raw);
  } catch (err) {
    console.error('Error loading custom foods:', err);
    return [];
  }
}

export async function saveCustomFoods(foods: FoodItem[]): Promise<void> {
  const key = getScopedStorageKey(CUSTOM_FOODS_KEY);
  return enqueueStorageOperation(key, async () => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(foods));
    } catch (err) {
      console.error('Error saving custom foods:', err);
      throw new Error('Failed to save custom foods.');
    }
  });
}

export async function addCustomFood(food: FoodItem): Promise<FoodItem[]> {
  const key = getScopedStorageKey(CUSTOM_FOODS_KEY);
  return enqueueStorageOperation(key, async () => {
    const current = await loadCustomFoods();
    const filtered = current.filter((f) => f.id !== food.id);
    const updated = [food, ...filtered];
    await AsyncStorage.setItem(key, JSON.stringify(updated));
    return updated;
  });
}

export async function deleteCustomFood(id: string): Promise<FoodItem[]> {
  const key = getScopedStorageKey(CUSTOM_FOODS_KEY);
  return enqueueStorageOperation(key, async () => {
    const current = await loadCustomFoods();
    const updated = current.filter((f) => f.id !== id);
    await AsyncStorage.setItem(key, JSON.stringify(updated));
    return updated;
  });
}

// Barcode Offline Cache (Open Food Facts local cache)
export async function loadBarcodeCache(): Promise<FoodItem[]> {
  try {
    const raw = await AsyncStorage.getItem(getScopedStorageKey(BARCODE_CACHE_KEY));
    if (!raw) return [];
    return safeParseArray<FoodItem>(raw);
  } catch (err) {
    console.error('Error loading barcode cache:', err);
    return [];
  }
}

export async function saveBarcodeCache(foods: FoodItem[]): Promise<void> {
  const key = getScopedStorageKey(BARCODE_CACHE_KEY);
  return enqueueStorageOperation(key, async () => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(foods));
    } catch (err) {
      console.error('Error saving barcode cache:', err);
      throw new Error('Failed to save barcode cache.');
    }
  });
}

export async function upsertBarcodeCacheItem(food: FoodItem): Promise<FoodItem[]> {
  const key = getScopedStorageKey(BARCODE_CACHE_KEY);
  return enqueueStorageOperation(key, async () => {
    const current = await loadBarcodeCache();
    const cleanBarcode = food.barcode?.trim().replace(/[\s-]/g, '');
    const filtered = current.filter((f) => {
      const fb = f.barcode?.trim().replace(/[\s-]/g, '');
      if (cleanBarcode && fb && cleanBarcode === fb) return false;
      if (f.id === food.id) return false;
      return true;
    });
    const updated = [{ ...food, source: food.source ?? 'open_food_facts' }, ...filtered].slice(0, 200);
    await AsyncStorage.setItem(key, JSON.stringify(updated));
    return updated;
  });
}

export async function getBarcodeCacheItem(rawBarcode: string): Promise<FoodItem | null> {
  const code = rawBarcode.trim().replace(/[\s-]/g, '');
  if (!code) return null;
  const cache = await loadBarcodeCache();
  return (
    cache.find((f) => {
      const fb = f.barcode?.trim().replace(/[\s-]/g, '');
      return fb === code || f.id === `barcode_${code}`;
    }) ?? null
  );
}

export async function searchBarcodeCache(query: string): Promise<FoodItem[]> {
  const normQuery = normalizeSearch(query);
  if (!normQuery) return [];
  const cache = await loadBarcodeCache();
  return cache.filter((f) => {
    const normName = normalizeSearch(f.name);
    const normBrand = f.brand ? normalizeSearch(f.brand) : '';
    const normBarcode = f.barcode ? normalizeSearch(f.barcode) : '';
    const normCategory = f.category ? normalizeSearch(f.category) : '';
    return (
      normName.includes(normQuery) ||
      normBrand.includes(normQuery) ||
      normBarcode.includes(normQuery) ||
      normCategory.includes(normQuery)
    );
  });
}

export async function clearBarcodeCache(): Promise<void> {
  const key = getScopedStorageKey(BARCODE_CACHE_KEY);
  return enqueueStorageOperation(key, async () => {
    await AsyncStorage.removeItem(key);
  });
}

export async function copyYesterdayMeals(targetDate: string): Promise<DailyLog> {
  const yesterday = getPreviousDayString(targetDate);
  const targetKey = getScopedStorageKey(`${DAILY_LOG_PREFIX}${targetDate}`);
  return enqueueStorageOperation(targetKey, async () => {
    const yesterdayLog = await loadDailyLog(yesterday);
    if (!yesterdayLog.meals || yesterdayLog.meals.length === 0) {
      return await loadDailyLog(targetDate);
    }
    const currentTarget = await loadDailyLog(targetDate);
    const clonedMeals: LoggedMeal[] = yesterdayLog.meals.map((m) => ({
      ...m,
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      timestamp: new Date().toISOString(),
    }));
    const updatedTarget: DailyLog = {
      ...currentTarget,
      meals: [...currentTarget.meals, ...clonedMeals],
    };
    await AsyncStorage.setItem(targetKey, JSON.stringify(updatedTarget));
    return updatedTarget;
  });
}

export async function copyYesterdayMealType(targetDate: string, mealType: MealType): Promise<DailyLog> {
  const yesterday = getPreviousDayString(targetDate);
  const targetKey = getScopedStorageKey(`${DAILY_LOG_PREFIX}${targetDate}`);
  return enqueueStorageOperation(targetKey, async () => {
    const yesterdayLog = await loadDailyLog(yesterday);
    const targetMeals = (yesterdayLog.meals || []).filter((m) => m.mealType === mealType);
    if (targetMeals.length === 0) {
      return await loadDailyLog(targetDate);
    }
    const currentTarget = await loadDailyLog(targetDate);
    const clonedMeals: LoggedMeal[] = targetMeals.map((m) => ({
      ...m,
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      timestamp: new Date().toISOString(),
    }));
    const updatedTarget: DailyLog = {
      ...currentTarget,
      meals: [...currentTarget.meals, ...clonedMeals],
    };
    await AsyncStorage.setItem(targetKey, JSON.stringify(updatedTarget));
    return updatedTarget;
  });
}

// Meal Templates (Saved meal combinations for fast 1-tap logging)
export async function loadMealTemplates(): Promise<MealTemplate[]> {
  try {
    const raw = await AsyncStorage.getItem(getScopedStorageKey(MEAL_TEMPLATES_KEY));
    if (!raw) return [];
    return safeParseArray<MealTemplate>(raw);
  } catch (err) {
    console.error('Error loading meal templates:', err);
    return [];
  }
}

export async function saveMealTemplates(templates: MealTemplate[]): Promise<void> {
  const key = getScopedStorageKey(MEAL_TEMPLATES_KEY);
  return enqueueStorageOperation(key, async () => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(templates));
    } catch (err) {
      console.error('Error saving meal templates:', err);
      throw new Error('Failed to save meal templates.');
    }
  });
}

export async function saveMealTemplate(template: MealTemplate): Promise<MealTemplate[]> {
  const key = getScopedStorageKey(MEAL_TEMPLATES_KEY);
  return enqueueStorageOperation(key, async () => {
    const current = await loadMealTemplates();
    const filtered = current.filter((t) => t.id !== template.id);
    const updated = [template, ...filtered];
    await AsyncStorage.setItem(key, JSON.stringify(updated));
    return updated;
  });
}

export async function deleteMealTemplate(id: string): Promise<MealTemplate[]> {
  const key = getScopedStorageKey(MEAL_TEMPLATES_KEY);
  return enqueueStorageOperation(key, async () => {
    const current = await loadMealTemplates();
    const updated = current.filter((t) => t.id !== id);
    await AsyncStorage.setItem(key, JSON.stringify(updated));
    return updated;
  });
}

export function createTemplateFromMeals(
  name: string,
  mealType: MealType,
  meals: LoggedMeal[]
): MealTemplate {
  const items: MealTemplateItem[] = meals.map((m) => ({
    name: m.name,
    servingSize: m.servingSize,
    servingGrams: m.servingGrams,
    servings: m.servings,
    calories: m.calories,
    protein: m.protein,
    carbs: m.carbs,
    fat: m.fat,
    fiber: m.fiber,
    sugar: m.sugar,
    portionUnit: m.portionUnit,
    gramsPerUnit: m.gramsPerUnit,
    isEstimate: m.isEstimate,
    source: m.source,
  }));

  const totalCalories = items.reduce((sum, item) => sum + item.calories, 0);
  const totalProtein = Math.round(items.reduce((sum, item) => sum + item.protein, 0) * 10) / 10;
  const totalCarbs = Math.round(items.reduce((sum, item) => sum + item.carbs, 0) * 10) / 10;
  const totalFat = Math.round(items.reduce((sum, item) => sum + item.fat, 0) * 10) / 10;

  return {
    id: `template_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    name: name.trim(),
    mealType,
    items,
    totalCalories,
    totalProtein,
    totalCarbs,
    totalFat,
    createdAt: new Date().toISOString(),
  };
}

// Frequent foods calculation from historical daily logs
export function getFrequentFoods(
  dailyLogs: Record<string, DailyLog>,
  limit: number = 20
): FoodItem[] {
  const counts = new Map<string, { count: number; meal: LoggedMeal }>();
  for (const dayLog of Object.values(dailyLogs || {})) {
    for (const m of dayLog.meals || []) {
      const key = m.foodId || m.name.trim().toLowerCase();
      const existing = counts.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        counts.set(key, { count: 1, meal: m });
      }
    }
  }

  const sorted = Array.from(counts.values()).sort((a, b) => b.count - a.count);
  return sorted.slice(0, limit).map(({ meal }) => {
    const ratio = meal.servings > 0 ? meal.servings : 1;
    return {
      id: meal.foodId || `frequent_${meal.name.replace(/[^a-zA-Z0-9_-]/g, '_')}`,
      name: meal.name,
      brand: meal.brand,
      category: meal.category,
      servingSize: meal.servingSize,
      servingGrams: Math.round(meal.servingGrams / ratio),
      calories: Math.round(meal.calories / ratio),
      protein: Math.round((meal.protein / ratio) * 10) / 10,
      carbs: Math.round((meal.carbs / ratio) * 10) / 10,
      fat: Math.round((meal.fat / ratio) * 10) / 10,
      fiber: meal.fiber !== undefined ? Math.round((meal.fiber / ratio) * 10) / 10 : undefined,
      sugar: meal.sugar !== undefined ? Math.round((meal.sugar / ratio) * 10) / 10 : undefined,
      sodium: meal.sodium !== undefined ? Math.round(meal.sodium / ratio) : undefined,
      barcode: meal.barcode,
      source: meal.source,
      isEstimate: meal.isEstimate,
      portionUnit: meal.portionUnit,
      gramsPerUnit: meal.gramsPerUnit,
    };
  });
}

export async function loadFrequentFoods(limit: number = 20): Promise<FoodItem[]> {
  const recentLogs = await getRecentDailyLogs(90);
  return getFrequentFoods(recentLogs, limit);
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
    const raw = await AsyncStorage.getItem(getScopedStorageKey(REMINDER_SETTINGS_KEY));
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
  return enqueueStorageOperation(getScopedStorageKey(REMINDER_SETTINGS_KEY), async () => {
    try {
      await AsyncStorage.setItem(getScopedStorageKey(REMINDER_SETTINGS_KEY), JSON.stringify(settings));
    } catch (err) {
      console.error('Error saving reminder settings:', err);
      throw new Error('Failed to save reminder settings.');
    }
  });
}

// Workout mutations
export async function addWorkoutToDay(dateStr: string, workout: WorkoutEntry): Promise<DailyLog> {
  const key = getScopedStorageKey(`${DAILY_LOG_PREFIX}${dateStr}`);
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
  const key = getScopedStorageKey(`${DAILY_LOG_PREFIX}${dateStr}`);
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
  const key = getScopedStorageKey(`${DAILY_LOG_PREFIX}${dateStr}`);
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
    const prefix = dailyLogPrefix();
    const logKeys = allKeys.filter((k) => k.startsWith(prefix));
    if (logKeys.length === 0) return {};

    const pairs = await AsyncStorage.multiGet(logKeys);
    const result: Record<string, DailyLog> = {};

    for (const [key, raw] of pairs) {
      if (!raw) continue;
      const dateStr = key.slice(prefix.length);
      const parsed = safeParseObject<DailyLog>(raw, { date: dateStr, meals: [], waterGlasses: 0, steps: 0 });
      result[dateStr] = {
        ...parsed,
        date: dateStr,
        meals: Array.isArray(parsed.meals) ? parsed.meals : [],
        waterGlasses: typeof parsed.waterGlasses === 'number' && !isNaN(parsed.waterGlasses) ? Math.max(0, parsed.waterGlasses) : 0,
        steps: typeof parsed.steps === 'number' && !isNaN(parsed.steps) ? Math.max(0, parsed.steps) : 0,
        supplements: Array.isArray(parsed.supplements) ? parsed.supplements : [],
        dailySupplements: Array.isArray(parsed.dailySupplements) ? parsed.dailySupplements : undefined,
        workouts: Array.isArray(parsed.workouts) ? parsed.workouts : [],
      };
    }
    return result;
  } catch (err) {
    console.error('Error fetching all daily logs:', err);
    return {};
  }
}

/**
 * Loads daily logs for a specific range of calendar days ending on `endDate` going backward.
 * Uses a single batch query (AsyncStorage.multiGet) for efficiency.
 */
export async function getDailyLogsRange(endDate: string, days: number = 90): Promise<Record<string, DailyLog>> {
  try {
    const dates: string[] = [];
    let cur = endDate;
    for (let i = 0; i < days; i++) {
      dates.push(cur);
      cur = addDaysToDateString(cur, -1);
    }
    const prefix = dailyLogPrefix();
    const keys = dates.map((d) => getScopedStorageKey(`${DAILY_LOG_PREFIX}${d}`));
    const pairs = await AsyncStorage.multiGet(keys);
    const result: Record<string, DailyLog> = {};

    for (const [key, raw] of pairs) {
      if (!raw) continue;
      const dateStr = key.slice(prefix.length);
      const parsed = safeParseObject<DailyLog>(raw, { date: dateStr, meals: [], waterGlasses: 0, steps: 0 });
      result[dateStr] = {
        ...parsed,
        date: dateStr,
        meals: Array.isArray(parsed.meals) ? parsed.meals : [],
        waterGlasses: typeof parsed.waterGlasses === 'number' && !isNaN(parsed.waterGlasses) ? Math.max(0, parsed.waterGlasses) : 0,
        steps: typeof parsed.steps === 'number' && !isNaN(parsed.steps) ? Math.max(0, parsed.steps) : 0,
        supplements: Array.isArray(parsed.supplements) ? parsed.supplements : [],
        dailySupplements: Array.isArray(parsed.dailySupplements) ? parsed.dailySupplements : undefined,
        workouts: Array.isArray(parsed.workouts) ? parsed.workouts : [],
      };
    }
    return result;
  } catch (err) {
    console.error('Error fetching daily logs range:', err);
    return {};
  }
}

/**
 * Loads recent daily logs up to `days` back from today using a single batch query.
 * Prevents loading years of historical data into memory during streak calculations.
 */
export async function getRecentDailyLogs(days: number = 90): Promise<Record<string, DailyLog>> {
  return getDailyLogsRange(getTodayDateString(), days);
}

/**
 * Calculates current consecutive active logging streak by walking back from referenceDate (today)
 * and stopping at the first inactive day without calling getAllDailyLogs.
 */
export async function loadAccurateStreak(
  referenceDate: string = getTodayDateString()
): Promise<{ currentStreak: number; loggedToday: boolean }> {
  const weights = await loadWeightHistory();
  return calculateStreakByWalkback(
    (date) => loadDailyLog(date),
    weights,
    referenceDate
  );
}

export async function restoreAllData(
  backup: FitTrackBackup,
  mode: 'replace' | 'merge'
): Promise<void> {
  // Validate and stage incoming backup before performing destructive operations
  const staged = validateBackup(backup);

  if (mode === 'replace') {
    // 1. Wait for any in-flight queued operations and acquire restore lock
    await waitForPendingStorageOperations();

    let releaseLock!: () => void;
    const lockPromise = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });
    setRestoreLock(lockPromise);

    try {
      // 2. Snapshot every key that restore may change, including whether it was absent before
      const allKeys = await AsyncStorage.getAllKeys();
      const prefix = dailyLogPrefix();
      const existingLogKeys = allKeys.filter((k) => k.startsWith(prefix));
      const incomingLogKeys = Object.keys(staged.dailyLogs || {}).map((d) => getScopedStorageKey(`${DAILY_LOG_PREFIX}${d}`));

      const targetKeysSet = new Set<string>([
        getScopedStorageKey(PROFILE_KEY),
        getScopedStorageKey(SUPPLEMENT_ROUTINE_KEY),
        getScopedStorageKey(WEIGHT_HISTORY_KEY),
        getScopedStorageKey(REMINDER_SETTINGS_KEY),
        getScopedStorageKey(RECENT_FOODS_KEY),
        getScopedStorageKey(FAVORITE_FOODS_KEY),
        getScopedStorageKey(CUSTOM_FOODS_KEY),
        getScopedStorageKey(BARCODE_CACHE_KEY),
        getScopedStorageKey(MEAL_TEMPLATES_KEY),
        getScopedStorageKey(MEDICAL_DISCLAIMER_KEY),
        ...existingLogKeys,
        ...incomingLogKeys,
      ]);
      const targetKeys = Array.from(targetKeysSet);
      const snapshotPairs = targetKeys.length > 0 ? await AsyncStorage.multiGet(targetKeys) : [];
      const priorStateMap = new Map<string, string | null>(snapshotPairs);

      try {
        // 1. Clear existing log keys
        if (existingLogKeys.length > 0) {
          await AsyncStorage.multiRemove(existingLogKeys);
        }

        // 2. Write profile
        await AsyncStorage.setItem(getScopedStorageKey(PROFILE_KEY), JSON.stringify(staged.profile));

        // 3. Write each daily log
        const newLogPairs: [string, string][] = [];
        for (const [dateStr, dayLog] of Object.entries(staged.dailyLogs || {})) {
          newLogPairs.push([getScopedStorageKey(`${DAILY_LOG_PREFIX}${dateStr}`), JSON.stringify({ ...dayLog, date: dateStr })]);
        }
        if (newLogPairs.length > 0) {
          await AsyncStorage.multiSet(newLogPairs);
        }

        // 4. Write supplement routine
        await AsyncStorage.setItem(getScopedStorageKey(SUPPLEMENT_ROUTINE_KEY), JSON.stringify(staged.supplementRoutine || []));

        // 5. Write weight history
        await AsyncStorage.setItem(getScopedStorageKey(WEIGHT_HISTORY_KEY), JSON.stringify(staged.weightHistory || []));

        // 6. Write reminder settings if present, or remove if absent in incoming backup
        if (staged.reminderSettings) {
          await AsyncStorage.setItem(getScopedStorageKey(REMINDER_SETTINGS_KEY), JSON.stringify(staged.reminderSettings));
        } else {
          await AsyncStorage.removeItem(getScopedStorageKey(REMINDER_SETTINGS_KEY));
        }

        // 7. Write recent foods
        if (staged.recentFoods) {
          await AsyncStorage.setItem(getScopedStorageKey(RECENT_FOODS_KEY), JSON.stringify(staged.recentFoods));
        } else {
          await AsyncStorage.removeItem(getScopedStorageKey(RECENT_FOODS_KEY));
        }

        // 8. Write favorite foods
        if (staged.favoriteFoods) {
          await AsyncStorage.setItem(getScopedStorageKey(FAVORITE_FOODS_KEY), JSON.stringify(staged.favoriteFoods));
        } else {
          await AsyncStorage.removeItem(getScopedStorageKey(FAVORITE_FOODS_KEY));
        }

        // 9. Write custom foods
        if (staged.customFoods) {
          await AsyncStorage.setItem(getScopedStorageKey(CUSTOM_FOODS_KEY), JSON.stringify(staged.customFoods));
        } else {
          await AsyncStorage.removeItem(getScopedStorageKey(CUSTOM_FOODS_KEY));
        }

        // 10. Write barcode cache
        if (staged.barcodeCache) {
          await AsyncStorage.setItem(getScopedStorageKey(BARCODE_CACHE_KEY), JSON.stringify(staged.barcodeCache));
        } else {
          await AsyncStorage.removeItem(getScopedStorageKey(BARCODE_CACHE_KEY));
        }

        // 11. Write meal templates
        if (staged.mealTemplates) {
          await AsyncStorage.setItem(getScopedStorageKey(MEAL_TEMPLATES_KEY), JSON.stringify(staged.mealTemplates));
        } else {
          await AsyncStorage.removeItem(getScopedStorageKey(MEAL_TEMPLATES_KEY));
        }

        // 12. Write medical disclaimer state
        if (staged.profile.hasAcceptedMedicalDisclaimer) {
          await AsyncStorage.setItem(getScopedStorageKey(MEDICAL_DISCLAIMER_KEY), 'true');
        } else {
          await AsyncStorage.removeItem(getScopedStorageKey(MEDICAL_DISCLAIMER_KEY));
        }
      } catch (restoreErr) {
        console.error('Restore failed midway, attempting rollback:', restoreErr);
        try {
          const toRestorePairs: [string, string][] = [];
          const toRemoveKeys: string[] = [];

          for (const [key, priorVal] of priorStateMap.entries()) {
            if (priorVal === null) {
              toRemoveKeys.push(key);
            } else {
              toRestorePairs.push([key, priorVal]);
            }
          }

          if (toRemoveKeys.length > 0) {
            await AsyncStorage.multiRemove(toRemoveKeys);
          }
          if (toRestorePairs.length > 0) {
            await AsyncStorage.multiSet(toRestorePairs);
          }
        } catch (rollbackErr) {
          console.error('Rollback failed after restore failure:', rollbackErr);
          throw new Error(
            `Failed to restore backup data and rollback failed: ${
              rollbackErr instanceof Error ? rollbackErr.message : String(rollbackErr)
            }. Storage may be in an inconsistent state.`
          );
        }

        throw new Error('Failed to restore backup data. Previous data has been preserved.');
      }
    } finally {
      releaseLock();
      setRestoreLock(null);
    }
  } else {
    // MERGE mode
    // 1. Profile: preserve existing non-defaults or update with incoming profile
    const currentProfile = await loadUserProfile();
    await saveUserProfile({
      ...currentProfile,
      ...staged.profile,
    });

    // 2. Daily logs: merge per date
    for (const [dateStr, incomingLog] of Object.entries(staged.dailyLogs || {})) {
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
      ...(staged.supplementRoutine || []).filter((r) => !routineNames.has(r.name.toLowerCase())),
    ];
    await saveSupplementRoutine(mergedRoutine);

    // 4. Weight history: union by date
    const currentWeights = await loadWeightHistory();
    const weightDates = new Set(currentWeights.map((w) => w.date));
    const mergedWeights = [
      ...currentWeights,
      ...(staged.weightHistory || []).filter((w) => !weightDates.has(w.date)),
    ].sort((a, b) => a.date.localeCompare(b.date));
    await AsyncStorage.setItem(getScopedStorageKey(WEIGHT_HISTORY_KEY), JSON.stringify(mergedWeights));

    // 5. Reminders
    if (staged.reminderSettings) {
      await saveReminderSettings(staged.reminderSettings);
    }

    // 6. Recent foods
    if (staged.recentFoods && staged.recentFoods.length > 0) {
      const currentRecent = await loadRecentFoods();
      const existingIds = new Set(currentRecent.map((f) => f.id));
      const mergedRecent = [
        ...currentRecent,
        ...staged.recentFoods.filter((f) => !existingIds.has(f.id)),
      ].slice(0, 30);
      await AsyncStorage.setItem(getScopedStorageKey(RECENT_FOODS_KEY), JSON.stringify(mergedRecent));
    }

    // 7. Favorite foods
    if (staged.favoriteFoods && staged.favoriteFoods.length > 0) {
      const currentFavs = await loadFavoriteFoods();
      const existingFavIds = new Set(currentFavs.map((f) => f.id));
      const mergedFavs = [
        ...currentFavs,
        ...staged.favoriteFoods.filter((f) => !existingFavIds.has(f.id)),
      ];
      await AsyncStorage.setItem(getScopedStorageKey(FAVORITE_FOODS_KEY), JSON.stringify(mergedFavs));
    }

    // 8. Custom foods
    if (staged.customFoods && staged.customFoods.length > 0) {
      const currentCustom = await loadCustomFoods();
      const existingCustomIds = new Set(currentCustom.map((f) => f.id));
      const mergedCustom = [
        ...currentCustom,
        ...staged.customFoods.filter((f) => !existingCustomIds.has(f.id)),
      ];
      await AsyncStorage.setItem(getScopedStorageKey(CUSTOM_FOODS_KEY), JSON.stringify(mergedCustom));
    }

    // 9. Barcode cache
    if (staged.barcodeCache && staged.barcodeCache.length > 0) {
      const currentCache = await loadBarcodeCache();
      const existingBarcodes = new Set(
        currentCache.map((f) => f.barcode?.trim().replace(/[\s-]/g, '') || f.id)
      );
      const mergedCache = [
        ...currentCache,
        ...staged.barcodeCache.filter(
          (f) => !existingBarcodes.has(f.barcode?.trim().replace(/[\s-]/g, '') || f.id)
        ),
      ].slice(0, 200);
      await AsyncStorage.setItem(getScopedStorageKey(BARCODE_CACHE_KEY), JSON.stringify(mergedCache));
    }

    // 10. Meal templates
    if (staged.mealTemplates && staged.mealTemplates.length > 0) {
      const currentTemplates = await loadMealTemplates();
      const existingTemplateIds = new Set(currentTemplates.map((t) => t.id));
      const mergedTemplates = [
        ...currentTemplates,
        ...staged.mealTemplates.filter((t) => !existingTemplateIds.has(t.id)),
      ];
      await AsyncStorage.setItem(getScopedStorageKey(MEAL_TEMPLATES_KEY), JSON.stringify(mergedTemplates));
    }
  }
}
