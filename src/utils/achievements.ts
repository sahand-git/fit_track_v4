import AsyncStorage from '@react-native-async-storage/async-storage';
import { getScopedStorageKey } from '../storage/storage';

export type AchievementCategory = 'consistency' | 'nutrition' | 'fitness' | 'exploration';

export interface AchievementDefinition {
  id: string;
  category: AchievementCategory;
  titleKey: string;
  descKey: string;
  iconName: string;
  targetCount: number;
}

export const ACHIEVEMENTS_CATALOG: AchievementDefinition[] = [
  // CONSISTENCY
  {
    id: 'first_step',
    category: 'consistency',
    titleKey: 'First Step',
    descKey: 'Log your first meal',
    iconName: 'Footprints',
    targetCount: 1,
  },
  {
    id: 'on_track',
    category: 'consistency',
    titleKey: 'On Track',
    descKey: 'Log breakfast, lunch, and dinner in one day',
    iconName: 'CheckCircle2',
    targetCount: 1,
  },
  {
    id: 'week_warrior',
    category: 'consistency',
    titleKey: 'Week Warrior',
    descKey: '7-day logging streak',
    iconName: 'Flame',
    targetCount: 7,
  },
  {
    id: 'monthly_master',
    category: 'consistency',
    titleKey: 'Monthly Master',
    descKey: '30-day logging streak',
    iconName: 'Award',
    targetCount: 30,
  },
  {
    id: 'century_club',
    category: 'consistency',
    titleKey: 'Century Club',
    descKey: '100-day logging streak',
    iconName: 'Crown',
    targetCount: 100,
  },

  // NUTRITION
  {
    id: 'protein_champion',
    category: 'nutrition',
    titleKey: 'Protein Champion',
    descKey: 'Hit protein goal 7 days in a row',
    iconName: 'Beef',
    targetCount: 7,
  },
  {
    id: 'balanced_act',
    category: 'nutrition',
    titleKey: 'Balanced Act',
    descKey: 'Hit all 3 macro goals in one day',
    iconName: 'Scale',
    targetCount: 1,
  },
  {
    id: 'hydration_hero',
    category: 'nutrition',
    titleKey: 'Hydration Hero',
    descKey: 'Hit water goal 7 days in a row',
    iconName: 'Droplet',
    targetCount: 7,
  },
  {
    id: 'vitamin_virtuoso',
    category: 'nutrition',
    titleKey: 'Vitamin Virtuoso',
    descKey: 'Meet 80%+ RDA for 10+ micronutrients',
    iconName: 'Sparkles',
    targetCount: 10,
  },

  // FITNESS
  {
    id: 'step_master',
    category: 'fitness',
    titleKey: 'Step Master',
    descKey: 'Hit step goal 7 days in a row',
    iconName: 'Footprints',
    targetCount: 7,
  },
  {
    id: 'iron_pumper',
    category: 'fitness',
    titleKey: 'Iron Pumper',
    descKey: 'Log 20 workouts',
    iconName: 'Dumbbell',
    targetCount: 20,
  },
  {
    id: 'cardio_king',
    category: 'fitness',
    titleKey: 'Cardio King',
    descKey: 'Log 10 hours of cardio',
    iconName: 'HeartPulse',
    targetCount: 600, // minutes
  },

  // EXPLORATION
  {
    id: 'food_explorer',
    category: 'exploration',
    titleKey: 'Food Explorer',
    descKey: 'Log 50 unique foods',
    iconName: 'Compass',
    targetCount: 50,
  },
  {
    id: 'scanner_pro',
    category: 'exploration',
    titleKey: 'Scanner Pro',
    descKey: 'Scan 20 barcodes',
    iconName: 'Barcode',
    targetCount: 20,
  },
  {
    id: 'ai_gourmet',
    category: 'exploration',
    titleKey: 'AI Gourmet',
    descKey: 'Use AI photo analysis 10 times',
    iconName: 'Camera',
    targetCount: 10,
  },
  {
    id: 'supplement_star',
    category: 'exploration',
    titleKey: 'Supplement Star',
    descKey: 'Complete supplement routine 14 days straight',
    iconName: 'Pill',
    targetCount: 14,
  },
];

const ACHIEVEMENTS_STORAGE_KEY = 'fittrack_unlocked_achievements';

export async function getUnlockedAchievementIds(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(getScopedStorageKey(ACHIEVEMENTS_STORAGE_KEY));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function unlockAchievement(achievementId: string): Promise<string[]> {
  try {
    const current = await getUnlockedAchievementIds();
    if (!current.includes(achievementId)) {
      const updated = [...current, achievementId];
      await AsyncStorage.setItem(getScopedStorageKey(ACHIEVEMENTS_STORAGE_KEY), JSON.stringify(updated));
      return updated;
    }
    return current;
  } catch {
    return [];
  }
}

/**
 * Calculates current streak freeze tokens available (max 5 stored).
 * 1 token is earned for every 7 days of streak.
 */
export function calculateStreakFreezes(streak: number, usedFreezes = 0): number {
  const earned = Math.floor(streak / 7);
  return Math.min(5, Math.max(0, earned - usedFreezes));
}
