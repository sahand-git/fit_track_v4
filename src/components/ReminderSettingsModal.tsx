import React, { useState, useEffect } from 'react';
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
  Clock,
  Droplet,
  Utensils,
  Pill,
  AlertCircle,
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
  TimeSetting,
} from '../types';
import { useLanguage } from '../i18n/I18nContext';
import { translate } from '../i18n/strings';
import { theme } from '../theme';
import * as Haptics from 'expo-haptics';
import {
  checkNotificationPermissions,
  requestNotificationPermissions,
  syncAllReminders,
} from '../services/notificationService';
import {
  loadReminderSettings,
  saveReminderSettings,
  DEFAULT_REMINDER_SETTINGS,
} from '../storage/storage';

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
  const [canAskPermission, setCanAskPermission] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      loadInitialState();
    }
  }, [visible]);

  const loadInitialState = async () => {
    const loaded = await loadReminderSettings();
    setSettings(loaded);
    const perm = await checkNotificationPermissions();
    setHasPermission(perm.granted);
    setCanAskPermission(perm.canAskAgain);
  };

  const verifyAndRequestPermission = async (): Promise<boolean> => {
    if (Platform.OS === 'web') return true;
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
    setCanAskPermission(requested.canAskAgain);
    return requested.granted;
  };

  const handleToggleSupplementsMaster = async (val: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (val) {
      const ok = await verifyAndRequestPermission();
      if (!ok) return;
    }
    setSettings((prev) => ({ ...prev, supplementsEnabled: val }));
  };

  const handleToggleWaterMaster = async (val: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (val) {
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
    if (val) {
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
      let newH = current.hour + deltaHour;
      let newM = current.minute + deltaMinute;

      if (newM >= 60) {
        newM = 0;
        newH += 1;
      } else if (newM < 0) {
        newM = 45;
        newH -= 1;
      }

      if (newH >= 24) newH = 0;
      if (newH < 0) newH = 23;

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
      let newH = current.hour + deltaHour;
      let newM = current.minute + deltaMinute;

      if (newM >= 60) {
        newM = 0;
        newH += 1;
      } else if (newM < 0) {
        newM = 45;
        newH -= 1;
      }

      if (newH >= 24) newH = 0;
      if (newH < 0) newH = 23;

      return {
        ...prev,
        meals: {
          ...prev.meals,
          [mealKey]: { ...current, hour: newH, minute: newM },
        },
      };
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    try {
      await saveReminderSettings(settings);
      await syncAllReminders(settings, routine, language);
      onClose();
    } catch (err) {
      console.warn('Error saving reminders:', err);
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

          {/* Permission warning if disabled */}
          {hasPermission === false && (
            <TouchableOpacity
              style={styles.permWarningCard}
              onPress={verifyAndRequestPermission}
              accessibilityRole="button"
            >
              <AlertCircle size={16} color={theme.colors.accent} />
              <View style={{ flex: 1 }}>
                <Text style={styles.permWarningTitle}>{t('Notification permissions are required to schedule reminders.')}</Text>
                <Text style={styles.permWarningAction}>{t('Enable in Settings')}</Text>
              </View>
            </TouchableOpacity>
          )}

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
                              accessibilityLabel={t('Previous hour')}
                            >
                              <Minus size={13} color={theme.colors.textPrimary} />
                            </TouchableOpacity>
                            <Text style={styles.timeDisplay}>
                              {formatTime(slotSetting.hour, slotSetting.minute)}
                            </Text>
                            <TouchableOpacity
                              style={styles.stepperBtn}
                              onPress={() => handleAdjustSlotTime(slot, 1, 0)}
                              accessibilityLabel={t('Next hour')}
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
                  <Droplet size={18} color="#0EA5E9" />
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
                  trackColor={{ false: theme.colors.border, true: '#0EA5E9' }}
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

                  {/* Window */}
                  <View style={styles.settingItemRow}>
                    <Text style={styles.settingItemLabel}>{t('Waking hours')}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.timeWindowText}>
                        {formatTime(settings.water.startHour, 0)} - {formatTime(settings.water.endHour, 0)}
                      </Text>
                    </View>
                  </View>
                </View>
              )}
            </View>

            {/* 3. MEAL REMINDERS */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderLeft}>
                  <Utensils size={18} color="#F59E0B" />
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
                            accessibilityLabel={t('Previous hour')}
                          >
                            <Minus size={13} color={theme.colors.textPrimary} />
                          </TouchableOpacity>
                          <Text style={styles.timeDisplay}>
                            {formatTime(mSetting.hour, mSetting.minute)}
                          </Text>
                          <TouchableOpacity
                            style={styles.stepperBtn}
                            onPress={() => handleAdjustMealTime(mKey, 1, 0)}
                            accessibilityLabel={t('Next hour')}
                          >
                            <Plus size={13} color={theme.colors.textPrimary} />
                          </TouchableOpacity>
                        </View>
                      )}

                      <Switch
                        value={mSetting.enabled}
                        onValueChange={(val) => handleToggleMeal(mKey, val)}
                        trackColor={{ false: theme.colors.border, true: '#F59E0B' }}
                        thumbColor={theme.colors.surface}
                      />
                    </View>
                  );
                })}
              </View>
            </View>
          </ScrollView>

          {/* Save Button */}
          <TouchableOpacity
            style={styles.saveBtn}
            onPress={handleSave}
            disabled={isSaving}
            accessibilityRole="button"
          >
            <Check size={18} color={theme.colors.textInverted} />
            <Text style={styles.saveBtnText}>{t('Save')}</Text>
          </TouchableOpacity>
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
    fontSize: 11,
    color: theme.colors.textMuted,
    lineHeight: 16,
  },
  permWarningCard: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderRadius: theme.radius.md,
    padding: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  permWarningTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
  },
  permWarningAction: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B45309',
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
    fontSize: 11,
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
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
  },
  slotEmptyNote: {
    fontSize: 11,
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
    borderColor: '#0EA5E9',
    backgroundColor: '#E0F2FE',
  },
  chipBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  chipBtnTextActive: {
    color: '#0369A1',
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
