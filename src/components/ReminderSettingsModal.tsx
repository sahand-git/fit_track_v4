import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText as Text } from './AppText';
import {
  X,
  Bell,
  Droplet,
  Utensils,
  Pill,
  AlertCircle,
  AlertTriangle,
  Plus,
  Minus,
  Check,
  Info,
} from 'lucide-react-native';
import {
  ReminderSettings,
  SupplementRoutineItem,
  SupplementTime,
  MealType,
} from '../types';
import { useLanguage } from '../i18n/I18nContext';
import { translate } from '../i18n/strings';
import { theme } from '../theme';
import * as Haptics from 'expo-haptics';
import {
  checkNotificationPermissions,
  requestNotificationPermissions,
  syncAllReminders,
  isNotificationSupported,
} from '../services/notificationService';
import {
  loadReminderSettings,
  saveReminderSettings,
  DEFAULT_REMINDER_SETTINGS,
} from '../storage/storage';
import { AnimatedPressable } from './AnimatedPressable';

interface ReminderSettingsModalProps {
  visible: boolean;
  onClose: () => void;
  routine: SupplementRoutineItem[];
}

const slotLabels: Record<SupplementTime, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
  bedtime: 'Bedtime',
};

const mealLabels: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snacks',
};

function formatTime(hour: number, minute: number): string {
  const h = hour.toString().padStart(2, '0');
  const m = minute.toString().padStart(2, '0');
  return `${h}:${m}`;
}

export const ReminderSettingsModal: React.FC<ReminderSettingsModalProps> = ({
  visible,
  onClose,
  routine,
}) => {
  const language = useLanguage();
  const insets = useSafeAreaInsets();
  const t = (str: string) => translate(language, str);

  const [settings, setSettings] = useState<ReminderSettings>(DEFAULT_REMINDER_SETTINGS);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const isSupported = isNotificationSupported();

  const loadInitialState = useCallback(async () => {
    const loaded = await loadReminderSettings();
    setSettings(loaded);
    if (!isSupported) {
      setHasPermission(false);
      return;
    }
    const perm = await checkNotificationPermissions();
    setHasPermission(perm.granted);
  }, [isSupported]);

  useEffect(() => {
    if (visible) {
      // This fetch synchronizes modal state with persisted settings when the modal opens.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void loadInitialState();
    }
  }, [visible, loadInitialState]);

  const verifyAndRequestPermission = async (): Promise<boolean> => {
    if (!isSupported) return false;
    const current = await checkNotificationPermissions();
    if (current.granted) {
      setHasPermission(true);
      return true;
    }

    if (!current.canAskAgain) {
      Alert.alert(
        t('Notifications Permission'),
        t('FitTrack needs notification permission to remind you about supplements, water, and meals at your chosen times.'),
        [
          { text: t('Cancel'), style: 'cancel' },
          {
            text: t('Open Settings'),
            onPress: () => {
              if (Platform.OS === 'ios') Linking.openURL('app-settings:');
              else Linking.openSettings();
            },
          },
        ]
      );
      return false;
    }

    const requested = await requestNotificationPermissions();
    setHasPermission(requested.granted);
    return requested.granted;
  };

  const handleToggleSupplementsMaster = async (val: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (val && isSupported) {
      const ok = await verifyAndRequestPermission();
      if (!ok) return;
    }
    setSettings((prev) => ({ ...prev, supplementsEnabled: val }));
  };

  const handleToggleWaterMaster = async (val: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (val && isSupported) {
      const ok = await verifyAndRequestPermission();
      if (!ok) return;
    }
    setSettings((prev) => ({
      ...prev,
      water: { ...prev.water, enabled: val },
    }));
  };

  const handleToggleMeal = async (mealKey: MealType, val: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (val && isSupported) {
      const ok = await verifyAndRequestPermission();
      if (!ok) return;
    }
    setSettings((prev) => ({
      ...prev,
      meals: {
        ...prev.meals,
        [mealKey]: { ...prev.meals[mealKey], enabled: val },
      },
    }));
  };

  const handleAdjustSlotTime = (slot: SupplementTime, deltaHour: number, deltaMinute: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setSettings((prev) => {
      const current = prev.supplementTimes[slot];
      let totalMinutes = (current.hour + deltaHour) * 60 + (current.minute + deltaMinute);
      if (totalMinutes < 0) totalMinutes += 24 * 60;
      totalMinutes = totalMinutes % (24 * 60);
      const newH = Math.floor(totalMinutes / 60);
      const newM = totalMinutes % 60;

      return {
        ...prev,
        supplementTimes: {
          ...prev.supplementTimes,
          [slot]: { ...current, hour: newH, minute: newM },
        },
      };
    });
  };

  const handleAdjustMealTime = (mealKey: MealType, deltaHour: number, deltaMinute: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setSettings((prev) => {
      const current = prev.meals[mealKey];
      let totalMinutes = (current.hour + deltaHour) * 60 + (current.minute + deltaMinute);
      if (totalMinutes < 0) totalMinutes += 24 * 60;
      totalMinutes = totalMinutes % (24 * 60);
      const newH = Math.floor(totalMinutes / 60);
      const newM = totalMinutes % 60;

      return {
        ...prev,
        meals: {
          ...prev.meals,
          [mealKey]: { ...current, hour: newH, minute: newM },
        },
      };
    });
  };

  const handleAdjustWaterStartHour = (delta: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setSettings((prev) => {
      const currentStart = prev.water.startHour;
      const currentEnd = prev.water.endHour;
      let newStart = currentStart + delta;
      if (newStart < 0) newStart = 0;
      if (newStart >= currentEnd) {
        newStart = Math.max(0, currentEnd - 1);
      }
      return {
        ...prev,
        water: { ...prev.water, startHour: newStart },
      };
    });
  };

  const handleAdjustWaterEndHour = (delta: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setSettings((prev) => {
      const currentStart = prev.water.startHour;
      const currentEnd = prev.water.endHour;
      let newEnd = currentEnd + delta;
      if (newEnd > 23) newEnd = 23;
      if (newEnd <= currentStart) {
        newEnd = Math.min(23, currentStart + 1);
      }
      return {
        ...prev,
        water: { ...prev.water, endHour: newEnd },
      };
    });
  };

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await saveReminderSettings(settings);
      if (isSupported) {
        await syncAllReminders(settings, routine, language);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      onClose();
    } catch (err) {
      console.warn('Error saving reminders:', err);
      Alert.alert(t('Save Error'), t('Could not save reminder settings. Please try again.'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={[styles.backdrop, { direction: language === 'en' ? 'ltr' : 'rtl' }]}>
        <View style={[styles.sheetContainer, { paddingBottom: Math.max(theme.spacing.md, insets.bottom + 12) }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleWrap}>
              <Bell size={20} color={theme.colors.primary} />
              <Text style={styles.headerTitle}>{t('Daily Reminders')}</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              accessibilityLabel={t('Close')}
              accessibilityRole="button"
            >
              <X size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Subtitle / Calm Note */}
          <View style={styles.disclaimerCard}>
            <Info size={16} color={theme.colors.secondary} style={{ marginTop: 2 }} />
            <Text style={styles.disclaimerText}>
              {t(
                'Reminders are informational only. FitTrack does not give medical advice. Notification delivery may vary depending on Android battery optimization.'
              )}
            </Text>
          </View>

          {/* Unsupported platform notice or permission warning */}
          {!isSupported ? (
            <View style={styles.unsupportedCard}>
              <AlertTriangle size={16} color={theme.colors.accent} style={{ marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.unsupportedTitle}>
                  {t('Reminders are unavailable on web browsers')}
                </Text>
                <Text style={styles.unsupportedDesc}>
                  {t('Local notifications are only supported on Android and iOS devices. You can configure your preferences here, and they will take effect when you use the mobile app.')}
                </Text>
              </View>
            </View>
          ) : hasPermission === false ? (
            <TouchableOpacity
              style={styles.permWarningCard}
              onPress={verifyAndRequestPermission}
              accessibilityRole="button"
              accessibilityLabel={t('Notification permissions are required to schedule reminders.')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <AlertCircle size={16} color={theme.colors.accent} />
              <View style={{ flex: 1 }}>
                <Text style={styles.permWarningTitle}>{t('Notification permissions are required to schedule reminders.')}</Text>
                <Text style={styles.permWarningAction}>{t('Enable in Settings')}</Text>
              </View>
            </TouchableOpacity>
          ) : null}

          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            {/* 1. SUPPLEMENT REMINDERS */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderLeft}>
                  <Pill size={18} color={theme.colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sectionTitle}>{t('Supplement reminders')}</Text>
                    <Text style={styles.sectionSub}>
                      {t('Only scheduled for items in your repeating routine.')}
                    </Text>
                  </View>
                </View>
                <Switch
                  value={settings.supplementsEnabled}
                  onValueChange={handleToggleSupplementsMaster}
                  trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                  thumbColor={theme.colors.surface}
                />
              </View>

              {settings.supplementsEnabled && (
                <View style={styles.slotsList}>
                  {(['morning', 'afternoon', 'evening', 'bedtime'] as SupplementTime[]).map((slot) => {
                    const slotItems = routine.filter((r) => r.time === slot);
                    const slotSetting = settings.supplementTimes[slot];
                    const hasItems = slotItems.length > 0;

                    return (
                      <View key={slot} style={styles.slotRow}>
                        <View style={styles.slotInfo}>
                          <View style={styles.slotTitleRow}>
                            <Text style={styles.slotName}>{t(slotLabels[slot])}</Text>
                            <Switch
                              value={slotSetting.enabled && hasItems}
                              disabled={!hasItems}
                              onValueChange={(val) => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                                setSettings((prev) => ({
                                  ...prev,
                                  supplementTimes: {
                                    ...prev.supplementTimes,
                                    [slot]: { ...slotSetting, enabled: val },
                                  },
                                }));
                              }}
                              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                              thumbColor={theme.colors.surface}
                            />
                          </View>

                          {hasItems ? (
                            <Text style={styles.slotItemNames} numberOfLines={2}>
                              {slotItems.map((s) => s.name).join(', ')}
                            </Text>
                          ) : (
                            <Text style={styles.slotEmptyNote}>
                              {t('No supplements scheduled for this time.')}
                            </Text>
                          )}
                        </View>

                        {hasItems && slotSetting.enabled && (
                          <View style={styles.timeStepperWrap}>
                            <TouchableOpacity
                              style={styles.stepperBtn}
                              onPress={() => handleAdjustSlotTime(slot, -1, 0)}
                              accessibilityRole="button"
                              accessibilityLabel={t('Previous hour')}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                              <Minus size={13} color={theme.colors.textPrimary} />
                            </TouchableOpacity>
                            <Text style={styles.timeDisplay}>
                              {formatTime(slotSetting.hour, slotSetting.minute)}
                            </Text>
                            <TouchableOpacity
                              style={styles.stepperBtn}
                              onPress={() => handleAdjustSlotTime(slot, 1, 0)}
                              accessibilityRole="button"
                              accessibilityLabel={t('Next hour')}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                              <Plus size={13} color={theme.colors.textPrimary} />
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            {/* 2. WATER REMINDERS */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderLeft}>
                  <Droplet size={18} color={theme.colors.sky} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sectionTitle}>{t('Water reminders')}</Text>
                    <Text style={styles.sectionSub}>
                      {t('Waking hours window with friendly hydration prompts.')}
                    </Text>
                  </View>
                </View>
                <Switch
                  value={settings.water.enabled}
                  onValueChange={handleToggleWaterMaster}
                  trackColor={{ false: theme.colors.border, true: theme.colors.sky }}
                  thumbColor={theme.colors.surface}
                />
              </View>

              {settings.water.enabled && (
                <View style={styles.waterControls}>
                  {/* Interval */}
                  <View style={styles.settingItemRow}>
                    <Text style={styles.settingItemLabel}>{t('Every')}</Text>
                    <View style={styles.quickChipRow}>
                      {[1, 2, 3].map((intv) => (
                        <TouchableOpacity
                          key={intv}
                          style={[
                            styles.chipBtn,
                            settings.water.intervalHours === intv && styles.chipBtnActive,
                          ]}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                            setSettings((prev) => ({
                              ...prev,
                              water: { ...prev.water, intervalHours: intv },
                            }));
                          }}
                          accessibilityRole="button"
                          accessibilityLabel={`${intv} ${t('hours')}`}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        >
                          <Text
                            style={[
                              styles.chipBtnText,
                              settings.water.intervalHours === intv && styles.chipBtnTextActive,
                            ]}
                          >
                            {intv} {t('hours')}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Start time */}
                  <View style={styles.waterTimeRow}>
                    <View style={styles.timeLabelWrap}>
                      <Text style={styles.settingItemLabel}>{t('Start time')}</Text>
                      <Text style={styles.settingItemSubLabel}>{t('First reminder of the day')}</Text>
                    </View>
                    <View style={styles.timeStepperWrap}>
                      <TouchableOpacity
                        style={[styles.stepperBtn, settings.water.startHour <= 0 && styles.stepperBtnDisabled]}
                        onPress={() => handleAdjustWaterStartHour(-1)}
                        disabled={settings.water.startHour <= 0}
                        accessibilityLabel={t('Decrease start hour')}
                        accessibilityRole="button"
                      >
                        <Minus
                          size={13}
                          color={settings.water.startHour <= 0 ? theme.colors.textMuted : theme.colors.textPrimary}
                        />
                      </TouchableOpacity>
                      <Text style={styles.timeDisplay}>
                        {formatTime(settings.water.startHour, 0)}
                      </Text>
                      <TouchableOpacity
                        style={[
                          styles.stepperBtn,
                          settings.water.startHour >= settings.water.endHour - 1 && styles.stepperBtnDisabled,
                        ]}
                        onPress={() => handleAdjustWaterStartHour(1)}
                        disabled={settings.water.startHour >= settings.water.endHour - 1}
                        accessibilityLabel={t('Increase start hour')}
                        accessibilityRole="button"
                      >
                        <Plus
                          size={13}
                          color={
                            settings.water.startHour >= settings.water.endHour - 1
                              ? theme.colors.textMuted
                              : theme.colors.textPrimary
                          }
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* End time */}
                  <View style={styles.waterTimeRow}>
                    <View style={styles.timeLabelWrap}>
                      <Text style={styles.settingItemLabel}>{t('End time')}</Text>
                      <Text style={styles.settingItemSubLabel}>{t('No reminders at or after this hour')}</Text>
                    </View>
                    <View style={styles.timeStepperWrap}>
                      <TouchableOpacity
                        style={[
                          styles.stepperBtn,
                          settings.water.endHour <= settings.water.startHour + 1 && styles.stepperBtnDisabled,
                        ]}
                        onPress={() => handleAdjustWaterEndHour(-1)}
                        disabled={settings.water.endHour <= settings.water.startHour + 1}
                        accessibilityLabel={t('Decrease end hour')}
                        accessibilityRole="button"
                      >
                        <Minus
                          size={13}
                          color={
                            settings.water.endHour <= settings.water.startHour + 1
                              ? theme.colors.textMuted
                              : theme.colors.textPrimary
                          }
                        />
                      </TouchableOpacity>
                      <Text style={styles.timeDisplay}>
                        {formatTime(settings.water.endHour, 0)}
                      </Text>
                      <TouchableOpacity
                        style={[styles.stepperBtn, settings.water.endHour >= 23 && styles.stepperBtnDisabled]}
                        onPress={() => handleAdjustWaterEndHour(1)}
                        disabled={settings.water.endHour >= 23}
                        accessibilityLabel={t('Increase end hour')}
                        accessibilityRole="button"
                      >
                        <Plus
                          size={13}
                          color={settings.water.endHour >= 23 ? theme.colors.textMuted : theme.colors.textPrimary}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}
            </View>

            {/* 3. MEAL REMINDERS */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderLeft}>
                  <Utensils size={18} color={theme.colors.nutrientVitaminA} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sectionTitle}>{t('Meal reminders')}</Text>
                    <Text style={styles.sectionSub}>
                      {t('Remind for routine items')}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.slotsList}>
                {(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map((mKey) => {
                  const mSetting = settings.meals[mKey];
                  return (
                    <View key={mKey} style={styles.slotRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.slotName}>{t(mealLabels[mKey])}</Text>
                      </View>

                      {mSetting.enabled && (
                        <View style={styles.timeStepperWrap}>
                          <TouchableOpacity
                            style={styles.stepperBtn}
                            onPress={() => handleAdjustMealTime(mKey, -1, 0)}
                            accessibilityRole="button"
                            accessibilityLabel={t('Previous hour')}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Minus size={13} color={theme.colors.textPrimary} />
                          </TouchableOpacity>
                          <Text style={styles.timeDisplay}>
                            {formatTime(mSetting.hour, mSetting.minute)}
                          </Text>
                          <TouchableOpacity
                            style={styles.stepperBtn}
                            onPress={() => handleAdjustMealTime(mKey, 1, 0)}
                            accessibilityRole="button"
                            accessibilityLabel={t('Next hour')}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Plus size={13} color={theme.colors.textPrimary} />
                          </TouchableOpacity>
                        </View>
                      )}

                      <Switch
                        value={mSetting.enabled}
                        onValueChange={(val) => handleToggleMeal(mKey, val)}
                        trackColor={{ false: theme.colors.border, true: theme.colors.nutrientVitaminA }}
                        thumbColor={theme.colors.surface}
                      />
                    </View>
                  );
                })}
              </View>
            </View>
          </ScrollView>

          {/* Save Button */}
          <AnimatedPressable
            style={styles.saveBtn}
            onPress={handleSave}
            disabled={isSaving}
            accessibilityRole="button"
            accessibilityLabel={t('Save')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Check size={18} color={theme.colors.textInverted} />
            <Text style={styles.saveBtnText}>{t('Save')}</Text>
          </AnimatedPressable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: theme.colors.backdrop,
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    maxHeight: '90%',
    padding: theme.spacing.md,
    gap: 12,
    ...theme.shadow.floating,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 4,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontFamily: theme.fonts.serif,
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  closeBtn: {
    padding: 6,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.surfaceSubtle,
  },
  disclaimerCard: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.radius.md,
    padding: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12,
    color: theme.colors.textMuted,
    lineHeight: 16,
  },
  unsupportedCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(193, 102, 76, 0.08)',
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: 'rgba(193, 102, 76, 0.3)',
    padding: 12,
  },
  unsupportedTitle: {
    fontFamily: theme.fonts.sans,
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.accent,
  },
  unsupportedDesc: {
    fontFamily: theme.fonts.sans,
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  permWarningCard: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    backgroundColor: theme.colors.amberLight,
    borderRadius: theme.radius.md,
    padding: 10,
    borderWidth: 1,
    borderColor: theme.colors.amberBorder,
  },
  permWarningTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.amberDark,
  },
  permWarningAction: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.amberText,
    marginTop: 2,
    textDecorationLine: 'underline',
  },
  scrollContent: {
    gap: 12,
    paddingBottom: 8,
  },
  sectionCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    gap: 12,
    ...theme.shadow.subtle,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  sectionHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  sectionSub: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 1,
  },
  slotsList: {
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 10,
  },
  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingVertical: 4,
  },
  slotInfo: {
    flex: 1,
    gap: 2,
  },
  slotTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  slotName: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  slotItemNames: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
  },
  slotEmptyNote: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  timeStepperWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 4,
    paddingVertical: 2,
    gap: 6,
  },
  stepperBtn: {
    padding: 6,
    borderRadius: 4,
  },
  stepperBtnDisabled: {
    opacity: 0.35,
  },
  timeDisplay: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    minWidth: 44,
    textAlign: 'center',
  },
  waterControls: {
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 10,
  },
  waterTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  timeLabelWrap: {
    flex: 1,
    minWidth: 140,
  },
  settingItemSubLabel: {
    fontFamily: theme.fonts.sans,
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  settingItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingItemLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  quickChipRow: {
    flexDirection: 'row',
    gap: 6,
  },
  chipBtn: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSubtle,
  },
  chipBtnActive: {
    borderColor: theme.colors.sky,
    backgroundColor: theme.colors.skyLight,
  },
  chipBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  chipBtnTextActive: {
    color: theme.colors.skyDark,
    fontWeight: '700',
  },
  timeWindowText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    paddingVertical: 14,
    ...theme.shadow.subtle,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textInverted,
  },
});
