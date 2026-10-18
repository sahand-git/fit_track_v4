import AsyncStorage from '@react-native-async-storage/async-storage';

export interface GuestDataSummary {
  mealsCount: number;
  workoutsCount: number;
  weightsCount: number;
  hasOnboardedProfile: boolean;
  totalRecords: number;
}

const GUEST_DATA_KEYS = [
  '@fittrack_profile',
  '@fittrack_supplement_routine',
  '@fittrack_weight_history',
  '@fittrack_favorite_foods',
  '@fittrack_custom_foods',
  '@fittrack_meal_templates',
  '@fittrack_reminder_settings',
  '@fittrack_disclaimer_accepted',
];

/**
 * Summarizes local guest fitness records (meals, workouts, weights, profile).
 * Operates purely on the un-scoped guest keys.
 */
export async function getGuestDataSummary(): Promise<GuestDataSummary> {
  let mealsCount = 0;
  let workoutsCount = 0;
  let weightsCount = 0;
  let hasOnboardedProfile = false;

  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const guestLogKeys = allKeys.filter(
      (k) => k.startsWith('@fittrack_log_') && !k.startsWith('@fittrack_account_')
    );

    if (guestLogKeys.length > 0) {
      const logs = await AsyncStorage.multiGet(guestLogKeys);
      for (const [, val] of logs) {
        if (!val) continue;
        try {
          const parsed = JSON.parse(val);
          if (Array.isArray(parsed?.meals)) mealsCount += parsed.meals.length;
          if (Array.isArray(parsed?.workouts)) workoutsCount += parsed.workouts.length;
        } catch {
          // Ignore invalid individual day logs
        }
      }
    }

    const weightsRaw = await AsyncStorage.getItem('@fittrack_weight_history');
    if (weightsRaw) {
      try {
        const parsedWeights = JSON.parse(weightsRaw);
        if (Array.isArray(parsedWeights)) weightsCount = parsedWeights.length;
      } catch {
        // Ignore parsing errors
      }
    }

    const profileRaw = await AsyncStorage.getItem('@fittrack_profile');
    if (profileRaw) {
      try {
        const parsedProfile = JSON.parse(profileRaw);
        if (parsedProfile && parsedProfile.isOnboarded) {
          hasOnboardedProfile = true;
        }
      } catch {
        // Ignore parsing errors
      }
    }
  } catch (err) {
    console.warn('Failed to inspect guest data summary:', err);
  }

  const totalRecords = mealsCount + workoutsCount + weightsCount + (hasOnboardedProfile ? 1 : 0);

  return {
    mealsCount,
    workoutsCount,
    weightsCount,
    hasOnboardedProfile,
    totalRecords,
  };
}

/**
 * Checks whether the target account storage namespace is empty on this device.
 */
export async function isAccountEmpty(uid: string): Promise<boolean> {
  const sanitized = uid.replace(/[^a-zA-Z0-9_-]/g, '_');
  const accountPrefix = `@fittrack_account_${sanitized}:`;
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const accountKeys = allKeys.filter((k) => k.startsWith(accountPrefix));
    if (accountKeys.length === 0) return true;

    // Check if account has an onboarded profile
    const profileKey = `${accountPrefix}@fittrack_profile`;
    const profileRaw = await AsyncStorage.getItem(profileKey);
    if (profileRaw) {
      try {
        const parsed = JSON.parse(profileRaw);
        if (parsed?.isOnboarded) return false;
      } catch {
        // Ignore
      }
    }

    // Check if account has any daily logs
    const logKeys = accountKeys.filter((k) => k.startsWith(`${accountPrefix}@fittrack_log_`));
    if (logKeys.length > 0) return false;

    return true;
  } catch {
    return true;
  }
}

/**
 * Non-destructively copies all existing guest records on this device into the target account namespace.
 * Guest records are left 100% intact.
 */
export async function copyGuestDataToAccount(uid: string): Promise<boolean> {
  const sanitized = uid.replace(/[^a-zA-Z0-9_-]/g, '_');
  const accountPrefix = `@fittrack_account_${sanitized}:`;

  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const guestKeysToCopy = allKeys.filter((k) => {
      if (k.startsWith('@fittrack_account_')) return false;
      if (k.startsWith('@fittrack_log_')) return true;
      return GUEST_DATA_KEYS.includes(k);
    });

    if (guestKeysToCopy.length === 0) return false;

    const guestData = await AsyncStorage.multiGet(guestKeysToCopy);
    const targetPairs: [string, string][] = [];

    for (const [key, value] of guestData) {
      if (value !== null && value !== undefined) {
        targetPairs.push([`${accountPrefix}${key}`, value]);
      }
    }

    if (targetPairs.length > 0) {
      await AsyncStorage.multiSet(targetPairs);
      return true;
    }
    return false;
  } catch (err) {
    console.error('Failed to copy guest data to account:', err);
    return false;
  }
}
