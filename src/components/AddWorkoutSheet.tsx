import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  BackHandler,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText as Text } from './AppText';
import {
  X,
  Dumbbell,
  Clock,
  Flame,
  Plus,
  Trash2,
  AlertCircle,
  Check,
} from 'lucide-react-native';
import {
  WorkoutEntry,
  ExerciseCategory,
  ExerciseSet,
  UserProfile,
} from '../types';
import {
  EXERCISE_DATABASE,
  ExercisePreset,
  estimateWorkoutCalories,
} from '../data/exerciseDatabase';
import { getTodayDateString, formatDisplayDate } from '../utils/dateUtils';
import { createUniqueId } from '../utils/idUtils';
import { useLanguage } from '../i18n/I18nContext';
import { translate } from '../i18n/strings';
import { useTheme } from '../theme/ThemeContext';
import { ThemeType } from '../theme';
import { SaveSuccessOverlay } from './SaveSuccessOverlay';
import * as Haptics from 'expo-haptics';

export interface AddWorkoutSheetProps {
  visible: boolean;
  onClose: () => void;
  date: string;
  profile: UserProfile;
  onSaveWorkout: (workout: WorkoutEntry, targetDate: string) => void;
  editingWorkout?: WorkoutEntry | null;
  onUpdateWorkout?: (workout: WorkoutEntry, targetDate: string) => void;
}

export const AddWorkoutSheet: React.FC<AddWorkoutSheetProps> = ({
  visible,
  onClose,
  date,
  profile,
  onSaveWorkout,
  editingWorkout = null,
  onUpdateWorkout,
}) => {
  const language = useLanguage();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const t = (str: string) => translate(language, str);

  const isFuture = date > getTodayDateString();

  const editingPreset = editingWorkout
    ? EXERCISE_DATABASE.find((item) => item.name === editingWorkout.name && item.category === editingWorkout.category)
    : undefined;
  const [selectedCategory, setSelectedCategory] = useState<ExerciseCategory | 'all'>(editingWorkout?.category ?? 'all');
  const [selectedPreset, setSelectedPreset] = useState<ExercisePreset>(editingPreset ?? EXERCISE_DATABASE[0]);
  const [durationMinutes, setDurationMinutes] = useState<number>(editingWorkout?.durationMinutes ?? EXERCISE_DATABASE[0].defaultMinutes);
  const [customCalories, setCustomCalories] = useState<string>(editingWorkout ? String(editingWorkout.caloriesBurned) : '');
  const [isCustomCalorieMode, setIsCustomCalorieMode] = useState<boolean>(editingWorkout?.calorieSource === 'user_entered');
  const [sets, setSets] = useState<ExerciseSet[]>(editingWorkout?.sets?.length ? editingWorkout.sets : [
    { setNum: 1, weightKg: 20, reps: 10, completed: true },
  ]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [customName, setCustomName] = useState(editingPreset ? '' : (editingWorkout?.name ?? ''));

  // Handle hardware back button on Android
  useEffect(() => {
    if (!visible || Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onClose]);

  // When preset changes, update default duration and reset custom calories
  const handleSelectPreset = (preset: ExercisePreset) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setSelectedPreset(preset);
    setDurationMinutes(preset.defaultMinutes);
    setIsCustomCalorieMode(false);
    setCustomCalories('');
  };

  const calculatedCalories = estimateWorkoutCalories(
    selectedPreset.metValue,
    durationMinutes,
    profile.weightKg || 75
  );

  // If user entered a custom number (even 0), respect it
  const effectiveCalories = isCustomCalorieMode
    ? customCalories.trim() === ''
      ? 0
      : Math.max(0, parseInt(customCalories, 10) || 0)
    : calculatedCalories;

  const handleCustomCalorieChange = (text: string) => {
    setIsCustomCalorieMode(true);
    // Allow digits only
    const digits = text.replace(/[^0-9]/g, '');
    setCustomCalories(digits);
  };

  const handleAddSet = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const nextNum = sets.length + 1;
    const lastSet = sets[sets.length - 1];
    setSets([
      ...sets,
      {
        setNum: nextNum,
        weightKg: lastSet?.weightKg || 20,
        reps: lastSet?.reps || 10,
        completed: true,
      },
    ]);
  };

  const handleRemoveSet = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const updated = sets
      .filter((_, i) => i !== index)
      .map((s, i) => ({ ...s, setNum: i + 1 }));
    setSets(updated);
  };

  const handleUpdateSet = (index: number, field: 'weightKg' | 'reps', value: number) => {
    const updated = [...sets];
    updated[index] = { ...updated[index], [field]: Math.max(0, value) };
    setSets(updated);
  };

  const handleSave = () => {
    if (isFuture) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const newWorkout: WorkoutEntry = {
      id: editingWorkout?.id || createUniqueId('workout'),
      name: customName.trim() || selectedPreset.name,
      category: selectedPreset.category,
      durationMinutes,
      caloriesBurned: effectiveCalories,
      loggedAt: editingWorkout?.loggedAt || timeStr,
      calorieSource: isCustomCalorieMode ? 'user_entered' : 'met_estimate',
      sets: selectedPreset.category === 'strength' && sets.length > 0 ? sets : undefined,
    };

    if (editingWorkout && onUpdateWorkout) onUpdateWorkout(newWorkout, date);
    else onSaveWorkout(newWorkout, date);
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      onClose();
    }, 950);
  };

  const categories: { id: ExerciseCategory | 'all'; label: string }[] = [
    { id: 'all', label: t('All') },
    { id: 'strength', label: t('Strength') },
    { id: 'cardio', label: t('Cardio') },
    { id: 'hiit', label: t('HIIT') },
    { id: 'sports', label: t('Sports') },
    { id: 'flexibility', label: t('Flexibility') },
  ];

  const filteredPresets = selectedCategory === 'all'
    ? EXERCISE_DATABASE
    : EXERCISE_DATABASE.filter((p) => p.category === selectedCategory);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t('Close')}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheetContainer}
        >
          <SaveSuccessOverlay visible={showSuccess} message={t('Workout Logged')} />
          <View style={styles.dragPill} />

          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>{t(editingWorkout ? 'Edit workout' : 'Log Workout')}</Text>
              <Text style={styles.subtitle}>
                {formatDisplayDate(date, language)}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel={t('Close')}
            >
              <X size={20} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Future Date Lock Warning */}
          {isFuture && (
            <View style={styles.futureWarning}>
              <AlertCircle size={18} color={theme.colors.warning} />
              <Text style={styles.futureWarningText}>
                {t('Workouts cannot be logged for future dates.')}
              </Text>
            </View>
          )}

          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: insets.bottom + 20 },
            ]}
            keyboardShouldPersistTaps="handled"
          >
            {/* Category Filter Pills */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryPills}
            >
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.catPill,
                    selectedCategory === cat.id && styles.catPillActive,
                  ]}
                  onPress={() => setSelectedCategory(cat.id)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={cat.label}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Text
                    style={[
                      styles.catPillText,
                      selectedCategory === cat.id && styles.catPillTextActive,
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Presets List */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('Exercise Preset')}</Text>
            </View>
            <View style={styles.presetList}>
              {filteredPresets.map((preset) => {
                const isSelected = selectedPreset.id === preset.id;
                return (
                  <TouchableOpacity
                    key={preset.id}
                    style={[
                      styles.presetItem,
                      isSelected && styles.presetItemActive,
                    ]}
                    onPress={() => handleSelectPreset(preset)}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={`${t(preset.name)}: ${t(preset.description)}`}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <View style={styles.presetInfo}>
                      <Text style={[styles.presetName, isSelected && styles.presetNameActive]}>
                        {t(preset.name)}
                      </Text>
                      <Text style={styles.presetDesc}>{t(preset.description)}</Text>
                    </View>
                    {isSelected && (
                      <View style={styles.checkIcon}>
                        <Check size={16} color={theme.colors.primary} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('Custom workout name (optional)')}</Text>
            </View>
            <TextInput
              value={customName}
              onChangeText={setCustomName}
              placeholder={t('Use preset name or enter your own')}
              placeholderTextColor={theme.colors.textMuted}
              style={styles.customNameInput}
              accessibilityLabel={t('Custom workout name (optional)')}
            />

            {/* Duration & Calorie Calculation */}
            <View style={styles.statsCard}>
              {/* Duration Input */}
              <View style={styles.statRow}>
                <View style={styles.statLabelRow}>
                  <Clock size={16} color={theme.colors.primary} />
                  <Text style={styles.statLabel}>{t('Duration (minutes)')}</Text>
                </View>
                <View style={styles.stepperContainer}>
                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                      setDurationMinutes((prev) => Math.max(5, prev - 5));
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={t('Decrease 5 minutes')}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.stepperBtnText}>-5</Text>
                  </TouchableOpacity>
                  <TextInput
                    style={styles.durationInput}
                    keyboardType="number-pad"
                    value={String(durationMinutes)}
                    onChangeText={(val) => {
                      const num = parseInt(val.replace(/[^0-9]/g, ''), 10);
                      setDurationMinutes(isNaN(num) ? 0 : Math.max(0, num));
                    }}
                  />
                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                      setDurationMinutes((prev) => prev + 5);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={t('Increase 5 minutes')}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.stepperBtnText}>+5</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Calories Burned Section */}
              <View style={styles.statRow}>
                <View style={styles.statLabelRow}>
                  <Flame size={16} color={theme.colors.warning} />
                  <View>
                    <Text style={styles.statLabel}>{t('Calories Burned')}</Text>
                    <Text style={styles.statSubLabel}>
                      {isCustomCalorieMode ? t('User override') : t('Estimate (MET)')}
                    </Text>
                  </View>
                </View>
                <View style={styles.calorieInputContainer}>
                  <TextInput
                    style={styles.calorieInput}
                    keyboardType="number-pad"
                    value={
                      isCustomCalorieMode
                        ? customCalories
                        : String(calculatedCalories)
                    }
                    onChangeText={handleCustomCalorieChange}
                    placeholder="0"
                    placeholderTextColor={theme.colors.textMuted}
                  />
                  <Text style={styles.calorieUnit}>{t('kcal')}</Text>
                </View>
              </View>
            </View>

            {/* Optional Sets / Reps for Strength */}
            {selectedPreset.category === 'strength' && (
              <View style={styles.setsSection}>
                <View style={styles.sectionHeaderRow}>
                  <View style={styles.sectionHeaderLeft}>
                    <Dumbbell size={16} color={theme.colors.primary} />
                    <Text style={styles.sectionTitle}>{t('Resistance Sets')}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.addSetBtn}
                    onPress={handleAddSet}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={t('Add Set')}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Plus size={14} color={theme.colors.primary} />
                    <Text style={styles.addSetBtnText}>{t('Add Set')}</Text>
                  </TouchableOpacity>
                </View>

                {sets.map((set, idx) => (
                  <View key={set.setNum} style={styles.setRow}>
                    <Text style={styles.setNumLabel}>#{set.setNum}</Text>
                    <View style={styles.setInputGroup}>
                      <TextInput
                        style={styles.setInput}
                        keyboardType="decimal-pad"
                        value={String(set.weightKg ?? 0)}
                        onChangeText={(v) => handleUpdateSet(idx, 'weightKg', parseFloat(v) || 0)}
                      />
                      <Text style={styles.setInputUnit}>kg</Text>
                    </View>
                    <Text style={styles.timesLabel}>×</Text>
                    <View style={styles.setInputGroup}>
                      <TextInput
                        style={styles.setInput}
                        keyboardType="number-pad"
                        value={String(set.reps ?? 0)}
                        onChangeText={(v) => handleUpdateSet(idx, 'reps', parseInt(v, 10) || 0)}
                      />
                      <Text style={styles.setInputUnit}>{t('reps')}</Text>
                    </View>
                    {sets.length > 1 && (
                      <TouchableOpacity
                        onPress={() => handleRemoveSet(idx)}
                        style={styles.removeSetBtn}
                        accessibilityRole="button"
                        accessibilityLabel={t('Remove set')}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Trash2 size={16} color={theme.colors.danger} />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>
            )}

            {/* Save Button */}
            <TouchableOpacity
              style={[
                styles.saveBtn,
                (isFuture || durationMinutes <= 0) && styles.saveBtnDisabled,
              ]}
              onPress={handleSave}
              disabled={isFuture || durationMinutes <= 0}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={t(editingWorkout ? 'Update workout' : 'Save Workout')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.saveBtnText}>{t(editingWorkout ? 'Update workout' : 'Save Workout')}</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const createStyles = (theme: ThemeType) =>
  StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheetContainer: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    maxHeight: '90%',
    paddingTop: 10,
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 480 : undefined,
    alignSelf: 'center',
    ...theme.shadow.floating,
  },
  dragPill: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.border,
    alignSelf: 'center',
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    fontFamily: theme.fonts.serif,
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.surface,
  },
  futureWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.warningLight,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: theme.radius.md,
  },
  futureWarningText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.warning,
    fontWeight: '500',
  },
  scrollContent: {
    padding: 20,
    gap: 16,
  },
  categoryPills: {
    gap: 8,
    paddingBottom: 4,
  },
  catPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  catPillActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  catPillText: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  catPillTextActive: {
    color: theme.colors.textInverted,
    fontWeight: '600',
  },
  sectionHeader: {
    marginTop: 4,
  },
  sectionTitle: {
    fontFamily: theme.fonts.serif,
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    flexShrink: 1,
  },
  presetList: {
    gap: 8,
  },
  presetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  presetItemActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight,
  },
  presetInfo: {
    flex: 1,
    minWidth: 0,
    marginEnd: 8,
  },
  presetName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    flexShrink: 1,
  },
  presetNameActive: {
    color: theme.colors.primary,
  },
  presetDesc: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
    flexShrink: 1,
  },
  customNameInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: theme.colors.textPrimary,
    fontSize: 14,
  },
  checkIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 16,
  },
  statRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  statLabelRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  statSubLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepperBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  stepperBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  durationInput: {
    width: 48,
    textAlign: 'center',
    paddingVertical: 4,
    paddingHorizontal: 6,
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  calorieInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  calorieInput: {
    minWidth: 54,
    textAlign: 'right',
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  calorieUnit: {
    fontSize: 13,
    color: theme.colors.textMuted,
    fontWeight: '500',
  },
  setsSection: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  sectionHeaderLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addSetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.primaryLight,
  },
  addSetBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  setNumLabel: {
    width: 24,
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  setInputGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 8,
  },
  setInput: {
    flex: 1,
    paddingVertical: 6,
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  setInputUnit: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  timesLabel: {
    fontSize: 14,
    color: theme.colors.textMuted,
    fontWeight: '600',
  },
  removeSetBtn: {
    padding: 6,
  },
  saveBtn: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    marginTop: 8,
    ...theme.shadow.subtle,
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textInverted,
  },
});
