import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { ReminderSettings, SupplementRoutineItem, AppLanguage, SupplementTime, MealType } from '../types';
import { translate } from '../i18n/strings';
import { loadReminderSettings } from '../storage/storage';

let isHandlerConfigured = false;

export function isNotificationSupported(): boolean {
  return Platform.OS === 'android' || Platform.OS === 'ios';
}

export async function initNotificationService(): Promise<void> {
  if (!isNotificationSupported()) return;

  if (!isHandlerConfigured) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    isHandlerConfigured = true;
  }

  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync('fittrack-supplements', {
        name: 'Vitamins & Supplements',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#10B981',
      });
      await Notifications.setNotificationChannelAsync('fittrack-water', {
        name: 'Hydration',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 200, 200],
        lightColor: '#0EA5E9',
      });
      await Notifications.setNotificationChannelAsync('fittrack-meals', {
        name: 'Meal Logging',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 200, 200],
        lightColor: '#F59E0B',
      });
    } catch (err) {
      console.warn('Failed to configure Android notification channels:', err);
    }
  }
}

export async function checkNotificationPermissions(): Promise<{
  granted: boolean;
  canAskAgain: boolean;
  isSupported: boolean;
}> {
  if (!isNotificationSupported()) {
    return { granted: false, canAskAgain: false, isSupported: false };
  }
  try {
    const { status, canAskAgain } = await Notifications.getPermissionsAsync();
    return {
      granted: status === 'granted',
      canAskAgain: canAskAgain ?? true,
      isSupported: true,
    };
  } catch (err) {
    console.warn('Error checking notification permissions:', err);
    return { granted: false, canAskAgain: false, isSupported: true };
  }
}

export async function requestNotificationPermissions(): Promise<{
  granted: boolean;
  canAskAgain: boolean;
  isSupported: boolean;
}> {
  if (!isNotificationSupported()) {
    return { granted: false, canAskAgain: false, isSupported: false };
  }
  try {
    await initNotificationService();
    const { status, canAskAgain } = await Notifications.requestPermissionsAsync();
    return {
      granted: status === 'granted',
      canAskAgain: canAskAgain ?? true,
      isSupported: true,
    };
  } catch (err) {
    console.warn('Error requesting notification permissions:', err);
    return { granted: false, canAskAgain: false, isSupported: true };
  }
}

export async function cancelNotificationsByType(type: 'supplement' | 'water' | 'meal'): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const item of scheduled) {
      if (item.content.data?.type === type) {
        await Notifications.cancelScheduledNotificationAsync(item.identifier);
      }
    }
  } catch (e) {
    console.warn('Error cancelling notifications by type:', e);
  }
}

export async function scheduleSupplementReminders(
  settings: ReminderSettings,
  routine: SupplementRoutineItem[],
  language: AppLanguage
): Promise<void> {
  if (Platform.OS === 'web') return;
  await cancelNotificationsByType('supplement');

  if (!settings.supplementsEnabled) return;

  const slotLabels: Record<SupplementTime, string> = {
    morning: 'Morning',
    afternoon: 'Afternoon',
    evening: 'Evening',
    bedtime: 'Bedtime',
  };

  const slots: SupplementTime[] = ['morning', 'afternoon', 'evening', 'bedtime'];
  for (const slot of slots) {
    const slotSetting = settings.supplementTimes[slot];
    if (!slotSetting || !slotSetting.enabled) continue;

    // Schedule ONLY if routine contains items for this time slot
    const slotItems = routine.filter((r) => r.time === slot);
    if (slotItems.length === 0) continue;

    const itemNames = slotItems.map((s) => s.name).join(', ');
    const title = `${translate(language, 'Vitamins & Supplements')} · ${translate(language, slotLabels[slot])}`;
    const body = `${translate(language, 'Time for your routine:')} ${itemNames}`;

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: { type: 'supplement', timeSlot: slot },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: slotSetting.hour,
          minute: slotSetting.minute,
          channelId: 'fittrack-supplements',
        },
      });
    } catch (err) {
      console.warn(`Failed to schedule supplement notification for ${slot}:`, err);
    }
  }
}

export async function scheduleWaterReminders(
  settings: ReminderSettings,
  language: AppLanguage
): Promise<void> {
  if (!isNotificationSupported()) return;
  await cancelNotificationsByType('water');

  if (!settings.water.enabled) return;

  const { startHour, endHour, intervalHours } = settings.water;
  const safeInterval = Math.max(1, Math.min(6, intervalHours || 2));
  const safeStart = Math.max(0, Math.min(22, startHour));
  const safeEnd = Math.max(safeStart + 1, Math.min(23, endHour));

  // Reminders are scheduled strictly within [safeStart, safeEnd),
  // ensuring no reminder is scheduled at or after safeEnd.
  for (let hour = safeStart; hour < safeEnd; hour += safeInterval) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: translate(language, 'Hydration Reminder'),
          body: translate(language, 'Time to drink a glass of water to reach your daily goal.'),
          data: { type: 'water', hour },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute: 0,
          channelId: 'fittrack-water',
        },
      });
    } catch (err) {
      console.warn(`Failed to schedule water notification at ${hour}:00:`, err);
    }
  }
}

export async function scheduleMealReminders(
  settings: ReminderSettings,
  language: AppLanguage
): Promise<void> {
  if (!isNotificationSupported()) return;
  await cancelNotificationsByType('meal');

  const mealLabels: Record<MealType, string> = {
    breakfast: 'Breakfast',
    lunch: 'Lunch',
    dinner: 'Dinner',
    snack: 'Snacks',
  };

  const mealTypes: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
  for (const mt of mealTypes) {
    const mealSetting = settings.meals[mt];
    if (!mealSetting || !mealSetting.enabled) continue;

    const title = `${translate(language, 'Meal Log Reminder')} · ${translate(language, mealLabels[mt])}`;
    const body = translate(language, 'Remember to log your meal to keep your diary updated.');

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: { type: 'meal', mealType: mt },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: mealSetting.hour,
          minute: mealSetting.minute,
          channelId: 'fittrack-meals',
        },
      });
    } catch (err) {
      console.warn(`Failed to schedule meal notification for ${mt}:`, err);
    }
  }
}

export async function syncAllReminders(
  settings: ReminderSettings,
  routine: SupplementRoutineItem[],
  language: AppLanguage
): Promise<void> {
  await scheduleSupplementReminders(settings, routine, language);
  await scheduleWaterReminders(settings, language);
  await scheduleMealReminders(settings, language);
}

/**
 * Reconciles scheduled notification content after an app language change.
 * Reuses existing category cancellation to prevent duplicates.
 * Safe to call at startup or language selection — never requests permissions.
 */
export async function reconcileNotificationLanguage(
  language: AppLanguage,
  routine: SupplementRoutineItem[]
): Promise<void> {
  if (!isNotificationSupported()) return;
  const perm = await checkNotificationPermissions();
  if (!perm.granted) return; // Do not prompt for permissions during reconciliation

  const settings = await loadReminderSettings();
  const hasActive =
    settings.supplementsEnabled ||
    settings.water.enabled ||
    Object.values(settings.meals).some((m) => m.enabled);

  if (hasActive) {
    await syncAllReminders(settings, routine, language);
  }
}
