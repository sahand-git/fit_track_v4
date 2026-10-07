import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile, DailyLog, LoggedMeal } from '../types';
import { getDefaultProfile } from '../utils/calculator';

const PROFILE_KEY = '@fittrack_profile';
const DAILY_LOG_PREFIX = '@fittrack_log_';

export async function loadUserProfile(): Promise<UserProfile> {
  try {
    const raw = await AsyncStorage.getItem(PROFILE_KEY);
    if (!raw) {
      const defaultProf = getDefaultProfile();
      await saveUserProfile(defaultProf);
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
    return JSON.parse(raw) as DailyLog;
  } catch (err) {
    console.error('Error loading daily log:', err);
    return {
      date: dateStr,
      meals: [],
      waterGlasses: 0,
      steps: 0,
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
