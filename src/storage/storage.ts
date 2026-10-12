import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile, DailyLog, LoggedMeal, SupplementCheck, SupplementRoutineItem } from '../types';
import { normalizeSupplementRoutine } from '../utils/supplementUtils';
import { getDefaultProfile } from '../utils/calculator';

const PROFILE_KEY = '@fittrack_profile';
const DAILY_LOG_PREFIX = '@fittrack_log_';
const SUPPLEMENT_ROUTINE_KEY = '@fittrack_supplement_routine';

export async function loadUserProfile(): Promise<UserProfile> {
  try {
    const raw = await AsyncStorage.getItem(PROFILE_KEY);
    if (!raw) {
      const defaultProf = { ...getDefaultProfile(), isOnboarded: false };
      return defaultProf;
    }
    return JSON.parse(raw) as UserProfile;
  } catch (err) {
    console.error('Error loading profile:', err);
    return getDefaultProfile();
  }
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  try {
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch (err) {
    console.error('Error saving profile:', err);
  }
}

export async function loadDailyLog(dateStr: string): Promise<DailyLog> {
  try {
    const key = `${DAILY_LOG_PREFIX}${dateStr}`;
    const raw = await AsyncStorage.getItem(key);
    if (!raw) {
      return {
        date: dateStr,
        meals: [],
        waterGlasses: 0,
        steps: 0,
      };
    }
    const parsed = JSON.parse(raw) as DailyLog;
    return {
      ...parsed,
      supplements: parsed.supplements || [],
      dailySupplements: parsed.dailySupplements,
    };
  } catch (err) {
    console.error('Error loading daily log:', err);
    return {
      date: dateStr,
      meals: [],
      waterGlasses: 0,
      steps: 0,
      supplements: [],
    };
  }
}

export async function saveDailyLog(log: DailyLog): Promise<void> {
  try {
    const key = `${DAILY_LOG_PREFIX}${log.date}`;
    await AsyncStorage.setItem(key, JSON.stringify(log));
  } catch (err) {
    console.error('Error saving daily log:', err);
  }
}

export async function addMealToDay(dateStr: string, meal: LoggedMeal): Promise<DailyLog> {
  const current = await loadDailyLog(dateStr);
  const updatedMeals = [...current.meals, meal];
  const updatedLog = { ...current, meals: updatedMeals };
  await saveDailyLog(updatedLog);
  return updatedLog;
}

export async function updateMealInDay(dateStr: string, updatedMeal: LoggedMeal): Promise<DailyLog> {
  const current = await loadDailyLog(dateStr);
  const updatedMeals = current.meals.map(m => m.id === updatedMeal.id ? updatedMeal : m);
  const updatedLog = { ...current, meals: updatedMeals };
  await saveDailyLog(updatedLog);
  return updatedLog;
}

export async function removeMealFromDay(dateStr: string, mealId: string): Promise<DailyLog> {
  const current = await loadDailyLog(dateStr);
  const updatedMeals = current.meals.filter(m => m.id !== mealId);
  const updatedLog = { ...current, meals: updatedMeals };
  await saveDailyLog(updatedLog);
  return updatedLog;
}

export async function updateWater(dateStr: string, delta: number): Promise<DailyLog> {
  const current = await loadDailyLog(dateStr);
  const updatedGlasses = Math.max(0, current.waterGlasses + delta);
  const updatedLog = { ...current, waterGlasses: updatedGlasses };
  await saveDailyLog(updatedLog);
  return updatedLog;
}

export async function loadSupplementRoutine(): Promise<SupplementRoutineItem[]> {
  try {
    const raw = await AsyncStorage.getItem(SUPPLEMENT_ROUTINE_KEY);
    return raw ? normalizeSupplementRoutine(JSON.parse(raw)) : [];
  } catch (err) {
    console.error('Error loading supplement routine:', err);
    return [];
  }
}

export async function saveSupplementRoutine(items: SupplementRoutineItem[]): Promise<void> {
  await AsyncStorage.setItem(SUPPLEMENT_ROUTINE_KEY, JSON.stringify(items));
}

export async function saveDailySupplements(
  dateStr: string,
  items: import('../types').LoggedDailySupplement[]
): Promise<DailyLog> {
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
  await saveDailyLog(updated);
  return updated;
}

export async function setSupplementTaken(dateStr: string, itemId: string, taken: boolean): Promise<DailyLog> {
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
  await saveDailyLog(updated);
  return updated;
}

const WEIGHT_HISTORY_KEY = '@fittrack_weight_history';

export async function loadWeightHistory(): Promise<import('../types').WeightEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(WEIGHT_HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error loading weight history:', err);
    return [];
  }
}

export async function addWeightEntry(entry: import('../types').WeightEntry): Promise<import('../types').WeightEntry[]> {
  const history = await loadWeightHistory();
  // Filter out any existing entry for the same date to keep 1 entry per day, or append
  const filtered = history.filter(h => h.date !== entry.date);
  const updated = [...filtered, entry].sort((a, b) => a.date.localeCompare(b.date));
  await AsyncStorage.setItem(WEIGHT_HISTORY_KEY, JSON.stringify(updated));
  return updated;
}

export async function removeWeightEntry(id: string): Promise<import('../types').WeightEntry[]> {
  const history = await loadWeightHistory();
  const updated = history.filter(h => h.id !== id);
  await AsyncStorage.setItem(WEIGHT_HISTORY_KEY, JSON.stringify(updated));
  return updated;
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

const REMINDER_SETTINGS_KEY = '@fittrack_reminder_settings';

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
    const parsed = JSON.parse(raw);
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
  try {
    await AsyncStorage.setItem(REMINDER_SETTINGS_KEY, JSON.stringify(settings));
  } catch (err) {
    console.error('Error saving reminder settings:', err);
  }
}


