import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
  BackHandler,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText as Text } from '../components/AppText';
import {
  Check,
  Globe2,
  Bell,
  Database,
  Flame,
  UserRound,
  ShieldAlert,
  BookOpen,
  ShieldCheck,
  MessageSquare,
  FileText,
  Moon,
  Sun,
  Award,
  Camera,
  Cloud,
  Footprints,
  SlidersHorizontal,
} from 'lucide-react-native';
import { DirectionalIcon } from '../components/DirectionalIcon';
import { StreakBadge } from '../components/StreakBadge';
import {
  UserProfile,
  Gender,
  ActivityLevel,
  FitnessGoal,
  AppLanguage,
  SupplementRoutineItem,
} from '../types';
import { AuthIdentity } from '../services/authService';
import { calculateTargets } from '../utils/calculator';
import { estimateStepCalories } from '../services/stepTrackingCore';
import { formatKcal } from '../utils/formatKcal';
import { GeminiKeyManager } from '../components/GeminiKeyManager';
import { ReminderSettingsModal } from '../components/ReminderSettingsModal';
import { BackupModal } from '../components/BackupModal';
import { CrashReportModal } from '../components/CrashReportModal';
import { MedicalDisclaimerModal } from '../components/MedicalDisclaimerModal';
import { ScientificReferencesModal } from '../components/ScientificReferencesModal';
import { AnimatedCheckbox } from '../components/AnimatedCheckbox';
import { isNotificationSupported } from '../services/notificationService';
import { getLastStoredCrash, ScrubbedCrashReport } from '../services/crashReportingService';
import { sendFeedback } from '../utils/feedback';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { useLanguage } from '../i18n/I18nContext';
import { languageNames, translate } from '../i18n/strings';
import { useTheme } from '../theme/ThemeContext';
import { ThemeType } from '../theme';
import { useIsRTL } from '../hooks/useIsRTL';
import * as Haptics from 'expo-haptics';

interface ProfileScreenProps {
  profile: UserProfile;
  language: AppLanguage;
  supplementRoutine?: SupplementRoutineItem[];
  streak?: number;
  authUser?: AuthIdentity | null;
  onLanguageChange: (language: AppLanguage) => void;
  onSaveProfile: (profile: UserProfile) => void;
  onUpdateProfile?: (profile: UserProfile) => void | Promise<void>;
  onRestoreComplete?: () => void;
  onBack?: () => void;
  onOpenAccount?: () => void;
  onOpenAchievements?: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = React.memo(({
  profile,
  language,
  supplementRoutine = [],
  streak = 0,
  authUser = null,
  onLanguageChange,
  onSaveProfile,
  onUpdateProfile,
  onRestoreComplete,
  onBack,
  onOpenAccount,
  onOpenAchievements,
}) => {
  const currentLanguage = useLanguage();
  const isRtl = useIsRTL();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const dockBottom = insets.bottom > 0 ? insets.bottom + 8 : Platform.OS === 'ios' ? 18 : 10;
  const bottomPadding = Math.max(124, dockBottom + 96);
  const t = (str: string) => translate(currentLanguage, str);

  const [remindersModalVisible, setRemindersModalVisible] = useState(false);
  const [backupModalVisible, setBackupModalVisible] = useState(false);
  const [crashModalVisible, setCrashModalVisible] = useState(false);
  const [selectedCrash, setSelectedCrash] = useState<ScrubbedCrashReport | null>(null);
  const [disclaimerModalVisible, setDisclaimerModalVisible] = useState(false);
  const [referencesModalVisible, setReferencesModalVisible] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const [includeWorkouts, setIncludeWorkouts] = useState(!!profile.includeWorkoutsInCalorieBudget);
  const enableCrashReporting = !!profile.enableCrashReporting;

  const [name, setName] = useState(profile.name);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl || '');
  const [avatarPreset, setAvatarPreset] = useState(profile.avatarPreset || '');
  const [age, setAge] = useState(profile.age.toString());
  const [gender, setGender] = useState<Gender>(profile.gender);
  const [weightKg, setWeightKg] = useState(profile.weightKg.toString());
  const [targetWeightKg, setTargetWeightKg] = useState(
    (profile.targetWeightKg ?? profile.weightKg).toString(),
  );
  const [heightCm, setHeightCm] = useState(profile.heightCm.toString());
  const [stepGoalInput, setStepGoalInput] = useState((profile.stepGoal || 8000).toString());
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(profile.activityLevel);
  const [goal, setGoal] = useState<FitnessGoal>(profile.goal);

  useEffect(() => {
    setName(profile.name);
    setAvatarUrl(profile.avatarUrl || '');
    setAvatarPreset(profile.avatarPreset || '');
    setAge(profile.age.toString());
    setGender(profile.gender);
    setWeightKg(profile.weightKg.toString());
    setTargetWeightKg((profile.targetWeightKg ?? profile.weightKg).toString());
    setHeightCm(profile.heightCm.toString());
    setStepGoalInput((profile.stepGoal || 8000).toString());
    setActivityLevel(profile.activityLevel);
    setGoal(profile.goal);
    setIncludeWorkouts(!!profile.includeWorkoutsInCalorieBudget);
  }, [profile]);

  // Handle Android back button when sub-modals are open
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const onBackPress = () => {
      if (crashModalVisible) {
        setCrashModalVisible(false);
        return true;
      }
      if (disclaimerModalVisible) {
        setDisclaimerModalVisible(false);
        return true;
      }
      if (referencesModalVisible) {
        setReferencesModalVisible(false);
        return true;
      }
      if (remindersModalVisible) {
        setRemindersModalVisible(false);
        return true;
      }
      if (backupModalVisible) {
        setBackupModalVisible(false);
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [
    remindersModalVisible,
    backupModalVisible,
    disclaimerModalVisible,
    referencesModalVisible,
    crashModalVisible,
  ]);

  const rawWeight = parseFloat(weightKg);
  const numericWeight =
    isNaN(rawWeight) || rawWeight <= 0 ? 75 : Math.max(30, Math.min(300, rawWeight));

  const rawTargetWeight = parseFloat(targetWeightKg);
  const numericTargetWeight =
    isNaN(rawTargetWeight) || rawTargetWeight <= 0
      ? numericWeight
      : Math.max(30, Math.min(300, rawTargetWeight));

  const rawHeight = parseFloat(heightCm);
  const numericHeight =
    isNaN(rawHeight) || rawHeight <= 0 ? 178 : Math.max(100, Math.min(250, rawHeight));

  const rawAge = parseInt(age, 10);
  const numericAge =
    isNaN(rawAge) || rawAge <= 0 ? 26 : Math.max(14, Math.min(100, rawAge));

  const rawStepGoal = parseInt(stepGoalInput, 10);
  const numericStepGoal =
    isNaN(rawStepGoal) || rawStepGoal <= 0
      ? 8000
      : Math.max(1000, Math.min(50000, rawStepGoal));

  const liveTargets = calculateTargets(
    gender,
    numericWeight,
    numericHeight,
    numericAge,
    activityLevel,
    goal,
  );
  const kcalPerThousandSteps = estimateStepCalories(1000, numericWeight);

  const persistImmediate = (nextProfile: UserProfile) => {
    if (onUpdateProfile) {
      onUpdateProfile(nextProfile);
    } else {
      onSaveProfile(nextProfile);
    }
  };

  const handleSave = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    const updatedCustomGoals = { ...(profile.customNutrientGoals || {}) };
    delete updatedCustomGoals.calories;
    delete updatedCustomGoals.protein;
    delete updatedCustomGoals.carbs;
    delete updatedCustomGoals.fat;

    const updated: UserProfile = {
      ...profile,
      name: name.trim() || 'Athlete',
      avatarUrl: avatarUrl || undefined,
      avatarPreset: avatarPreset || undefined,
      age: numericAge,
      gender,
      weightKg: numericWeight,
      targetWeightKg: numericTargetWeight,
      heightCm: numericHeight,
      stepGoal: numericStepGoal,
      activityLevel,
      goal,
      language,
      isOnboarded: true,
      includeWorkoutsInCalorieBudget: includeWorkouts,
      enableCrashReporting,
      customNutrientGoals: updatedCustomGoals,
      ...liveTargets,
    };
    onSaveProfile(updated);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2000);
  };

  const activityOptions: { key: ActivityLevel; label: string; desc: string }[] = [
    { key: 'sedentary', label: t('Sedentary'), desc: t('Desk job, little to no exercise') },
    { key: 'light', label: t('Lightly Active'), desc: t('Light exercise 1–3 days a week') },
    { key: 'moderate', label: t('Moderately Active'), desc: t('Moderate training 3–5 days a week') },
    { key: 'very_active', label: t('Very Active'), desc: t('Intense training 6–7 days a week') },
  ];

  const goalOptions: { key: FitnessGoal; label: string; desc: string }[] = [
    { key: 'fat_loss_aggressive', label: t('Aggressive Fat Loss'), desc: t('−500 kcal daily deficit') },
    { key: 'fat_loss_moderate', label: t('Steady Fat Loss'), desc: t('−300 kcal sustainable deficit') },
    { key: 'maintenance', label: t('Maintain Weight'), desc: t('Energy balance & recomposition') },
    { key: 'lean_bulk', label: t('Lean Bulk'), desc: t('+250 kcal controlled surplus') },
    { key: 'muscle_gain', label: t('Muscle Gain'), desc: t('+450 kcal muscle building') },
  ];

  const PRESET_AVATARS = ['🏃‍♂️', '🏋️', '🧘', '🥑', '⚡', '🦁', '🎯', '💧'];

  const handlePickPhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        const uri = result.assets[0].uri;
        setAvatarUrl(uri);
        setAvatarPreset('');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        persistImmediate({ ...profile, avatarUrl: uri, avatarPreset: undefined });
      }
    } catch {
      // ignore
    }
  };

  const handleSelectPreset = (preset: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setAvatarPreset(preset);
    setAvatarUrl('');
    persistImmediate({ ...profile, avatarPreset: preset, avatarUrl: undefined });
  };

  const syncStatusLabel = authUser
    ? authUser.email || t('Cloud Synced')
    : t('Local Only');

  return (
    <KeyboardAvoidingView behavior="padding" style={styles.root}>
      <ScrollView
        style={[styles.container, { direction: currentLanguage === 'en' ? 'ltr' : 'rtl' }]}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {onBack && (
          <TouchableOpacity
            onPress={onBack}
            style={[styles.backRow, isRtl && styles.rowRtl]}
            accessibilityLabel={t('Back')}
            accessibilityRole="button"
          >
            <DirectionalIcon name="ArrowLeft" size={18} color={theme.colors.textPrimary} />
            <Text style={styles.backText}>{t('Back')}</Text>
          </TouchableOpacity>
        )}

        {/* Top Luxury Header */}
        <View style={[styles.topHeaderRow, isRtl && styles.rowRtl]}>
          <View style={styles.topHeaderTitles}>
            <Text style={[styles.screenTitle, isRtl && styles.rtlText]}>
              {t('Profile & Goals')}
            </Text>
            <Text style={[styles.screenSubtitle, isRtl && styles.rtlText]}>
              {t('Calibrated with the Mifflin-St Jeor metabolic formula.')}
            </Text>
          </View>
          <AnimatedPressable
            style={styles.quickThemeBtn}
            onPress={() => {
              Haptics.selectionAsync();
              persistImmediate({ ...profile, themeMode: isDark ? 'light' : 'dark' });
            }}
            accessibilityRole="button"
            accessibilityLabel={isDark ? t('Switch to light theme') : t('Switch to dark theme')}
          >
            {isDark ? (
              <Sun size={18} color={theme.colors.amber || theme.colors.textPrimary} />
            ) : (
              <Moon size={18} color={theme.colors.textPrimary} />
            )}
          </AnimatedPressable>
        </View>

        {/* Luxury Hero Profile Card */}
        <View style={styles.heroCard}>
          <View style={[styles.heroTopRow, isRtl && styles.rowRtl]}>
            <TouchableOpacity
              style={styles.avatarCircle}
              onPress={handlePickPhoto}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={t('Profile Picture & Avatar')}
            >
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
              ) : avatarPreset ? (
                <Text style={styles.avatarEmoji}>{avatarPreset}</Text>
              ) : (
                <UserRound size={32} color={theme.colors.primary} />
              )}
              <View style={styles.avatarCameraBadge}>
                <Camera size={12} color={theme.colors.textInverted} />
              </View>
            </TouchableOpacity>

            <View style={styles.heroIdentityCol}>
              <View style={[styles.heroNameRow, isRtl && styles.rowRtl]}>
                <Text
                  style={[styles.heroNameText, isRtl && styles.rtlText]}
                  numberOfLines={1}
                >
                  {name.trim() || profile.name || 'Athlete'}
                </Text>
                <StreakBadge streak={streak} />
              </View>

              <TouchableOpacity
                style={[
                  styles.syncBadgePill,
                  authUser ? styles.syncBadgeSynced : styles.syncBadgeLocal,
                  isRtl && styles.rowRtl,
                ]}
                onPress={onOpenAccount}
                disabled={!onOpenAccount}
                activeOpacity={0.78}
                accessibilityRole="button"
                accessibilityLabel={syncStatusLabel}
              >
                <Cloud
                  size={13}
                  color={authUser ? theme.colors.primary : theme.colors.diarySubtleSlate}
                />
                <Text
                  style={[
                    styles.syncBadgeText,
                    authUser && styles.syncBadgeTextSynced,
                  ]}
                  numberOfLines={1}
                >
                  {syncStatusLabel}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Preset Avatars Row */}
          <View style={[styles.presetsRow, isRtl && styles.rowRtl]}>
            {PRESET_AVATARS.map((emoji) => {
              const isSelected = avatarPreset === emoji && !avatarUrl;
              return (
                <TouchableOpacity
                  key={emoji}
                  style={[styles.presetChip, isSelected && styles.presetChipActive]}
                  onPress={() => handleSelectPreset(emoji)}
                  accessibilityRole="button"
                  accessibilityLabel={emoji}
                >
                  <Text style={styles.presetEmojiText}>{emoji}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* 4-Stat Telemetry Strip: Current Weight / Target Weight / Daily Kcal / Step Goal */}
          <View style={[styles.heroStatsStrip, isRtl && styles.rowRtl]}>
            <View style={styles.heroStatCol}>
              <Text style={styles.heroStatValue}>
                {numericWeight} {t('kg')}
              </Text>
              <Text style={styles.heroStatLabel} numberOfLines={1}>
                {t('Current')}
              </Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStatCol}>
              <Text style={styles.heroStatValue}>
                {numericTargetWeight} {t('kg')}
              </Text>
              <Text style={styles.heroStatLabel} numberOfLines={1}>
                {t('Goal Weight')}
              </Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStatCol}>
              <Text style={[styles.heroStatValue, styles.heroStatAccent]}>
                {liveTargets.targetCalories.toLocaleString()}
              </Text>
              <Text style={styles.heroStatLabel} numberOfLines={1}>
                {t('kcal')}
              </Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStatCol}>
              <Text style={styles.heroStatValue}>
                {numericStepGoal.toLocaleString()}
              </Text>
              <Text style={styles.heroStatLabel} numberOfLines={1}>
                {t('Steps')}
              </Text>
            </View>
          </View>
        </View>

        {/* BENTO 1: Body Metrics & Nutrition Goals */}
        <View style={styles.bentoCard}>
          <View style={[styles.bentoHeaderRow, isRtl && styles.rowRtl]}>
            <View style={styles.bentoIconSquircle}>
              <SlidersHorizontal size={17} color={theme.colors.primary} />
            </View>
            <Text style={[styles.bentoTitle, isRtl && styles.rtlText]}>
              {t('Body & Nutrition Goals')}
            </Text>
          </View>

          {/* Daily Target Estimation Summary */}
          <View style={styles.targetPreviewCard}>
            <Text style={styles.previewTitle}>{t('Estimated Daily Target')}</Text>
            <Text style={styles.previewKcal}>{formatKcal(liveTargets.targetCalories, t)}</Text>
            <Text style={styles.previewMeta}>
              {t('BMR')}: {formatKcal(liveTargets.bmr, t)} • {t('TDEE')}: {formatKcal(liveTargets.tdee, t)}
            </Text>

            <View style={[styles.stepBurnPill, isRtl && styles.rowRtl]}>
              <Footprints size={14} color={theme.colors.stepsAccent} />
              <Text style={styles.stepBurnText}>
                {t('Step Burn Rate')}: {kcalPerThousandSteps} {t('kcal')} / 1,000 {t('Steps')}
              </Text>
            </View>

            <View style={[styles.macroStrip, isRtl && styles.rowRtl]}>
              <View style={styles.macroStripItem}>
                <Text style={[styles.macroVal, { color: theme.colors.macroProtein }]}>
                  {liveTargets.targetProtein}{t('g')}
                </Text>
                <Text style={styles.macroLabel}>{t('Protein')}</Text>
              </View>
              <View style={styles.macroDivider} />
              <View style={styles.macroStripItem}>
                <Text style={[styles.macroVal, { color: theme.colors.macroCarbs }]}>
                  {liveTargets.targetCarbs}{t('g')}
                </Text>
                <Text style={styles.macroLabel}>{t('Carbs')}</Text>
              </View>
              <View style={styles.macroDivider} />
              <View style={styles.macroStripItem}>
                <Text style={[styles.macroVal, { color: theme.colors.macroFat }]}>
                  {liveTargets.targetFat}{t('g')}
                </Text>
                <Text style={styles.macroLabel}>{t('Fat')}</Text>
              </View>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, isRtl && styles.rtlText]}>{t('Name')}</Text>
            <TextInput
              style={[styles.input, isRtl && styles.rtlText]}
              value={name}
              onChangeText={setName}
              placeholder={t('Name')}
              placeholderTextColor={theme.colors.textMuted}
            />
          </View>

          <View style={[styles.rowInputs, isRtl && styles.rowRtl]}>
            <View style={[styles.inputGroup, styles.flexItem]}>
              <Text style={[styles.inputLabel, isRtl && styles.rtlText]}>{t('Weight (kg)')}</Text>
              <TextInput
                style={styles.input}
                value={weightKg}
                onChangeText={setWeightKg}
                keyboardType="numeric"
                placeholder="75"
                placeholderTextColor={theme.colors.textMuted}
              />
            </View>
            <View style={[styles.inputGroup, styles.flexItem]}>
              <Text style={[styles.inputLabel, isRtl && styles.rtlText]}>{t('Goal Weight')}</Text>
              <TextInput
                style={styles.input}
                value={targetWeightKg}
                onChangeText={setTargetWeightKg}
                keyboardType="numeric"
                placeholder="72"
                placeholderTextColor={theme.colors.textMuted}
              />
            </View>
          </View>

          <View style={[styles.rowInputs, isRtl && styles.rowRtl]}>
            <View style={[styles.inputGroup, styles.flexItem]}>
              <Text style={[styles.inputLabel, isRtl && styles.rtlText]}>{t('Height (cm)')}</Text>
              <TextInput
                style={styles.input}
                value={heightCm}
                onChangeText={setHeightCm}
                keyboardType="numeric"
                placeholder="178"
                placeholderTextColor={theme.colors.textMuted}
              />
            </View>
            <View style={[styles.inputGroup, styles.flexItem]}>
              <Text style={[styles.inputLabel, isRtl && styles.rtlText]}>{t('Age')}</Text>
              <TextInput
                style={styles.input}
                value={age}
                onChangeText={setAge}
                keyboardType="numeric"
                placeholder="26"
                placeholderTextColor={theme.colors.textMuted}
              />
            </View>
            <View style={[styles.inputGroup, styles.flexItem]}>
              <Text style={[styles.inputLabel, isRtl && styles.rtlText]}>{t('Daily Step Goal')}</Text>
              <TextInput
                style={styles.input}
                value={stepGoalInput}
                onChangeText={setStepGoalInput}
                keyboardType="numeric"
                placeholder="8000"
                placeholderTextColor={theme.colors.textMuted}
              />
            </View>
          </View>

          {/* Biological Sex Toggle */}
          <Text style={[styles.inputLabel, isRtl && styles.rtlText]}>{t('Biological Sex')}</Text>
          <View style={[styles.genderRow, isRtl && styles.rowRtl]}>
            {(['male', 'female'] as Gender[]).map((g) => (
              <TouchableOpacity
                key={g}
                style={[styles.genderBtn, gender === g && styles.genderBtnActive]}
                onPress={() => setGender(g)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={g === 'male' ? t('Male') : t('Female')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={[styles.genderBtnText, gender === g && styles.genderBtnTextActive]}>
                  {g === 'male' ? t('Male') : t('Female')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Activity Level Selector */}
          <Text style={[styles.subSectionHeader, isRtl && styles.rtlText]}>{t('Activity Level')}</Text>
          {activityOptions.map((act) => (
            <TouchableOpacity
              key={act.key}
              style={[
                styles.optionRow,
                activityLevel === act.key && styles.optionRowActive,
                isRtl && styles.rowRtl,
              ]}
              onPress={() => setActivityLevel(act.key)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`${act.label}: ${act.desc}`}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <View style={styles.flexItem}>
                <Text style={[styles.optionLabel, isRtl && styles.rtlText]}>{act.label}</Text>
                <Text style={[styles.optionDesc, isRtl && styles.rtlText]}>{act.desc}</Text>
              </View>
              {activityLevel === act.key && <Check size={16} color={theme.colors.primary} />}
            </TouchableOpacity>
          ))}

          {/* Nutritional Goal Selector */}
          <Text style={[styles.subSectionHeader, isRtl && styles.rtlText]}>{t('Nutritional Goal')}</Text>
          {goalOptions.map((g) => (
            <TouchableOpacity
              key={g.key}
              style={[
                styles.optionRow,
                goal === g.key && styles.optionRowActive,
                isRtl && styles.rowRtl,
              ]}
              onPress={() => setGoal(g.key)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`${g.label}: ${g.desc}`}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <View style={styles.flexItem}>
                <Text style={[styles.optionLabel, isRtl && styles.rtlText]}>{g.label}</Text>
                <Text style={[styles.optionDesc, isRtl && styles.rtlText]}>{g.desc}</Text>
              </View>
              {goal === g.key && <Check size={16} color={theme.colors.primary} />}
            </TouchableOpacity>
          ))}

          {/* Activity Calorie Budget Checkbox */}
          <TouchableOpacity
            style={[
              styles.optionRow,
              includeWorkouts && styles.optionRowActive,
              isRtl && styles.rowRtl,
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              setIncludeWorkouts(!includeWorkouts);
            }}
            activeOpacity={0.7}
            accessibilityRole="checkbox"
            accessibilityLabel={t('Use adaptive activity budget')}
            accessibilityState={{ checked: includeWorkouts }}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <View style={[styles.optionRowLeft, isRtl && styles.rowRtl]}>
              <Flame size={20} color={theme.colors.warning} />
              <View style={styles.flexItem}>
                <Text style={[styles.optionLabel, isRtl && styles.rtlText]}>
                  {t('Use adaptive activity budget')}
                </Text>
                <Text style={[styles.optionDesc, isRtl && styles.rtlText]}>
                  {t('Off keeps your current target. When on, FitTrack uses a sedentary baseline plus net logged workouts and steps above a daily baseline, without double-counting workout steps.')}
                </Text>
              </View>
            </View>
            <AnimatedCheckbox checked={includeWorkouts} size={20} />
          </TouchableOpacity>

          {/* Save Button */}
          <AnimatedPressable
            style={styles.saveBtn}
            onPress={handleSave}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={t('Save Targets')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.saveBtnText}>
              {justSaved ? t('Saved') : t('Save Targets')}
            </Text>
          </AnimatedPressable>
        </View>

        {/* BENTO 2: AI & Cloud Hub */}
        <View style={styles.bentoCard}>
          <View style={[styles.bentoHeaderRow, isRtl && styles.rowRtl]}>
            <View style={styles.bentoIconSquircle}>
              <Cloud size={17} color={theme.colors.primary} />
            </View>
            <Text style={[styles.bentoTitle, isRtl && styles.rtlText]}>
              {t('AI & Cloud Hub')}
            </Text>
          </View>

          {onOpenAccount && (
            <AnimatedPressable
              style={[styles.optionRow, isRtl && styles.rowRtl]}
              onPress={onOpenAccount}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={t('Account & cloud backup')}
            >
              <View style={[styles.optionRowLeft, isRtl && styles.rowRtl]}>
                <View style={styles.accountShortcutIcon}>
                  <UserRound size={19} color={theme.colors.primary} />
                </View>
                <View style={styles.flexItem}>
                  <Text style={[styles.optionLabel, isRtl && styles.rtlText]}>
                    {t('Account & cloud backup')}
                  </Text>
                  <Text style={[styles.optionDesc, isRtl && styles.rtlText]}>
                    {t('Sign in, verify your account, and back up to your own cloud space.')}
                  </Text>
                </View>
              </View>
              <DirectionalIcon name="ChevronRight" size={16} color={theme.colors.textMuted} />
            </AnimatedPressable>
          )}

          {onOpenAchievements && (
            <AnimatedPressable
              style={[styles.optionRow, isRtl && styles.rowRtl]}
              onPress={onOpenAchievements}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={t('Achievements & Streak Freezes')}
            >
              <View style={[styles.optionRowLeft, isRtl && styles.rowRtl]}>
                <View style={[styles.accountShortcutIcon, { backgroundColor: theme.colors.amberLight }]}>
                  <Award size={19} color={theme.colors.amber} />
                </View>
                <View style={styles.flexItem}>
                  <Text style={[styles.optionLabel, isRtl && styles.rtlText]}>
                    {t('Achievements & Streak Freezes')}
                  </Text>
                  <Text style={[styles.optionDesc, isRtl && styles.rtlText]}>
                    {t('View unlocked badges, streak freezes, and progress.')}
                  </Text>
                </View>
              </View>
              <DirectionalIcon name="ChevronRight" size={16} color={theme.colors.textMuted} />
            </AnimatedPressable>
          )}

          <GeminiKeyManager />

          <TouchableOpacity
            style={[styles.optionRow, isRtl && styles.rowRtl]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              setBackupModalVisible(true);
            }}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={t('Backup & Restore')}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <View style={[styles.optionRowLeft, isRtl && styles.rowRtl]}>
              <Database size={19} color={theme.colors.primary} />
              <View style={styles.flexItem}>
                <Text style={[styles.optionLabel, isRtl && styles.rtlText]}>
                  {t('Backup & Restore')}
                </Text>
                <Text style={[styles.optionDesc, isRtl && styles.rtlText]}>
                  {t('Export or import complete local fitness records JSON.')}
                </Text>
              </View>
            </View>
            <DirectionalIcon name="ChevronRight" size={16} color={theme.colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* BENTO 3: Preferences & Localization */}
        <View style={styles.bentoCard}>
          <View style={[styles.bentoHeaderRow, isRtl && styles.rowRtl]}>
            <View style={styles.bentoIconSquircle}>
              <Globe2 size={17} color={theme.colors.secondary} />
            </View>
            <Text style={[styles.bentoTitle, isRtl && styles.rtlText]}>
              {t('Preferences & Safety')}
            </Text>
          </View>

          {/* Language Selector */}
          <View style={styles.innerGroup}>
            <Text style={[styles.subSectionHeader, isRtl && styles.rtlText]}>{t('Language')}</Text>
            <View style={[styles.languageOptions, isRtl && styles.rowRtl]}>
              {(['en', 'ar', 'ckb'] as AppLanguage[]).map((option) => (
                <TouchableOpacity
                  key={option}
                  onPress={() => onLanguageChange(option)}
                  style={[
                    styles.languageOption,
                    language === option && styles.languageOptionActive,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={languageNames[option]}
                  accessibilityState={{ selected: language === option }}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Text
                    style={[
                      styles.languageOptionText,
                      language === option && styles.languageOptionTextActive,
                    ]}
                  >
                    {languageNames[option]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.restartNote, isRtl && styles.rtlText]}>
              {t('Language updates immediately. Arabic and Sorani use a right-to-left layout.')}
            </Text>
          </View>

          {/* Theme Appearance Selector */}
          <View style={styles.innerGroup}>
            <Text style={[styles.subSectionHeader, isRtl && styles.rtlText]}>{t('Theme')}</Text>
            <View style={[styles.languageOptions, isRtl && styles.rowRtl]}>
              {(['system', 'light', 'dark'] as const).map((mode) => {
                const currentMode = profile.themeMode || 'system';
                const isSelected = currentMode === mode;
                const modeLabels: Record<string, string> = {
                  system: t('System'),
                  light: t('Light'),
                  dark: t('Dark'),
                };
                return (
                  <TouchableOpacity
                    key={mode}
                    onPress={() => {
                      Haptics.selectionAsync();
                      persistImmediate({ ...profile, themeMode: mode });
                    }}
                    style={[
                      styles.languageOption,
                      isSelected && styles.languageOptionActive,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={modeLabels[mode]}
                    accessibilityState={{ selected: isSelected }}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Text
                      style={[
                        styles.languageOptionText,
                        isSelected && styles.languageOptionTextActive,
                      ]}
                    >
                      {modeLabels[mode]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={[styles.restartNote, isRtl && styles.rtlText]}>
              {t('Matches device system appearance settings.')}
            </Text>
          </View>

          {/* Daily Reminders */}
          <TouchableOpacity
            style={[styles.optionRow, isRtl && styles.rowRtl]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              setRemindersModalVisible(true);
            }}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={t('Configure Reminders')}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <View style={[styles.optionRowLeft, isRtl && styles.rowRtl]}>
              <Bell size={19} color={theme.colors.primary} />
              <View style={styles.flexItem}>
                <Text style={[styles.optionLabel, isRtl && styles.rtlText]}>
                  {t('Configure Reminders')}
                </Text>
                <Text style={[styles.optionDesc, isRtl && styles.rtlText]}>
                  {isNotificationSupported()
                    ? t('Opt-in reminders for your habits and routines.')
                    : t('Available on mobile (Android & iOS)')}
                </Text>
              </View>
            </View>
            <DirectionalIcon name="ChevronRight" size={16} color={theme.colors.textMuted} />
          </TouchableOpacity>

          {/* Privacy & Diagnostics */}
          <View style={[styles.privacyNoteCard, isRtl && styles.rowRtl]}>
            <ShieldCheck size={19} color={theme.colors.primary} style={{ marginTop: 2 }} />
            <View style={styles.flexItem}>
              <Text style={[styles.privacyNoteTitle, isRtl && styles.rtlText]}>
                {t('Local On-Device Diagnostics')}
              </Text>
              <Text style={[styles.privacyNoteDesc, isRtl && styles.rtlText]}>
                {t('FitTrack transmits zero crash or health telemetry to remote servers. All crash diagnostics are scrubbed and stored locally on your device only.')}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.optionRow, isRtl && styles.rowRtl]}
            onPress={async () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              const last = await getLastStoredCrash();
              setSelectedCrash(last);
              setCrashModalVisible(true);
            }}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={t('View last crash report')}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <View style={[styles.optionRowLeft, isRtl && styles.rowRtl]}>
              <FileText size={19} color={theme.colors.primary} />
              <View style={styles.flexItem}>
                <Text style={[styles.optionLabel, isRtl && styles.rtlText]}>
                  {t('View last crash report')}
                </Text>
                <Text style={[styles.optionDesc, isRtl && styles.rtlText]}>
                  {t('Inspect scrubbed on-device diagnostic log from the most recent crash.')}
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.optionRow, isRtl && styles.rowRtl]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              sendFeedback(language).catch(() => {});
            }}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={t('Send Feedback')}
          >
            <View style={[styles.optionRowLeft, isRtl && styles.rowRtl]}>
              <MessageSquare size={19} color={theme.colors.primary} />
              <View style={styles.flexItem}>
                <Text style={[styles.optionLabel, isRtl && styles.rtlText]}>
                  {t('Send Feedback')}
                </Text>
                <Text style={[styles.optionDesc, isRtl && styles.rtlText]}>
                  {t('Share suggestions or report bugs. App version and device model are attached; health data is never included.')}
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Evidence & Safety */}
          <TouchableOpacity
            style={[styles.optionRow, isRtl && styles.rowRtl]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              setDisclaimerModalVisible(true);
            }}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={t('Medical Disclaimer')}
          >
            <View style={[styles.optionRowLeft, isRtl && styles.rowRtl]}>
              <ShieldAlert size={19} color={theme.colors.danger} />
              <View style={styles.flexItem}>
                <Text style={[styles.optionLabel, isRtl && styles.rtlText]}>
                  {t('Medical Disclaimer')}
                </Text>
                <Text style={[styles.optionDesc, isRtl && styles.rtlText]}>
                  {t('Educational wellness notice & emergency guidance')}
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.optionRow, isRtl && styles.rowRtl]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              setReferencesModalVisible(true);
            }}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={t('Scientific References')}
          >
            <View style={[styles.optionRowLeft, isRtl && styles.rowRtl]}>
              <BookOpen size={19} color={theme.colors.primary} />
              <View style={styles.flexItem}>
                <Text style={[styles.optionLabel, isRtl && styles.rtlText]}>
                  {t('Scientific References')}
                </Text>
                <Text style={[styles.optionDesc, isRtl && styles.rtlText]}>
                  {t('Equations, clinical sources, & nutritional databases')}
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          <View style={[styles.attributionCard, isRtl && styles.rowRtl]}>
            <Globe2 size={16} color={theme.colors.secondary} />
            <Text style={[styles.attributionText, isRtl && styles.rtlText]}>
              {t('Global food search & barcode data powered by Open Food Facts (openfoodfacts.org), under Open Database License (ODbL).')}
            </Text>
          </View>
        </View>

        <ReminderSettingsModal
          visible={remindersModalVisible}
          onClose={() => setRemindersModalVisible(false)}
          routine={supplementRoutine}
        />

        <BackupModal
          visible={backupModalVisible}
          onClose={() => setBackupModalVisible(false)}
          onRestoreComplete={onRestoreComplete || (() => {})}
        />

        <CrashReportModal
          visible={crashModalVisible}
          onClose={() => setCrashModalVisible(false)}
          report={selectedCrash}
          onClear={() => setSelectedCrash(null)}
        />

        <MedicalDisclaimerModal
          visible={disclaimerModalVisible}
          onAccept={() => setDisclaimerModalVisible(false)}
          onClose={() => setDisclaimerModalVisible(false)}
          isFirstRun={false}
          onOpenReferences={() => {
            setDisclaimerModalVisible(false);
            setReferencesModalVisible(true);
          }}
        />

        <ScientificReferencesModal
          visible={referencesModalVisible}
          onClose={() => setReferencesModalVisible(false)}
          onOpenDisclaimer={() => {
            setReferencesModalVisible(false);
            setDisclaimerModalVisible(true);
          }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
});

ProfileScreen.displayName = 'ProfileScreen';

const createStyles = (theme: ThemeType) =>
  StyleSheet.create({
    root: {
      flex: 1,
    },
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.md,
      gap: 16,
    },
    rowRtl: {
      flexDirection: 'row-reverse',
    },
    rtlText: {
      textAlign: 'right',
      writingDirection: 'rtl',
    },
    flexItem: {
      flex: 1,
    },
    backRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 2,
    },
    backText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.textPrimary,
    },
    topHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    topHeaderTitles: {
      flex: 1,
      gap: 2,
    },
    screenTitle: {
      fontFamily: theme.fonts.serif,
      fontSize: 26,
      fontWeight: '700',
      color: theme.colors.textPrimary,
      letterSpacing: -0.4,
    },
    screenSubtitle: {
      fontFamily: theme.fonts.sans,
      fontSize: 13,
      color: theme.colors.textMuted,
    },
    quickThemeBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.diaryMealCardBg,
      borderWidth: 1,
      borderColor: theme.colors.diaryMealCardBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroCard: {
      backgroundColor: theme.colors.diaryMealCardBg,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: theme.colors.diaryMealCardBorder,
      padding: 18,
      gap: 14,
      ...theme.shadow.subtle,
    },
    heroTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
    },
    avatarCircle: {
      width: 66,
      height: 66,
      borderRadius: 33,
      backgroundColor: theme.colors.surfaceSubtle,
      borderWidth: 2,
      borderColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    avatarImage: {
      width: 62,
      height: 62,
      borderRadius: 31,
    },
    avatarEmoji: {
      fontSize: 32,
    },
    avatarCameraBadge: {
      position: 'absolute',
      bottom: -2,
      right: -2,
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: theme.colors.surface,
    },
    heroIdentityCol: {
      flex: 1,
      gap: 6,
      minWidth: 0,
    },
    heroNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    heroNameText: {
      flex: 1,
      fontFamily: theme.fonts.serif,
      fontSize: 20,
      fontWeight: '700',
      color: theme.colors.textPrimary,
    },
    syncBadgePill: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
      borderWidth: 1,
    },
    syncBadgeLocal: {
      backgroundColor: theme.colors.diaryLoggedRowBg,
      borderColor: theme.colors.diaryLoggedRowBorder,
    },
    syncBadgeSynced: {
      backgroundColor: theme.colors.diaryAddBtnBg,
      borderColor: theme.colors.diaryAddBtnBorder,
    },
    syncBadgeText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.diarySubtleSlate,
      maxWidth: 190,
    },
    syncBadgeTextSynced: {
      color: theme.colors.primary,
    },
    presetsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: theme.colors.diaryHairlineDivider,
    },
    presetChip: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: theme.colors.diarySquircleBg,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.colors.diaryLoggedRowBorder,
    },
    presetChipActive: {
      backgroundColor: theme.colors.primaryLight,
      borderColor: theme.colors.primary,
      transform: [{ scale: 1.08 }],
    },
    presetEmojiText: {
      fontSize: 17,
    },
    heroStatsStrip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.diaryLoggedRowBg,
      borderColor: theme.colors.diaryLoggedRowBorder,
      borderWidth: 1,
      borderRadius: 16,
      paddingVertical: 12,
      paddingHorizontal: 8,
    },
    heroStatCol: {
      flex: 1,
      alignItems: 'center',
      gap: 2,
    },
    heroStatValue: {
      fontFamily: theme.fonts.serif,
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.textPrimary,
      fontVariant: ['tabular-nums'],
    },
    heroStatAccent: {
      color: theme.colors.primary,
    },
    heroStatLabel: {
      fontSize: 12,
      fontWeight: '500',
      color: theme.colors.diarySubtleSlate,
    },
    heroStatDivider: {
      width: 1,
      height: 24,
      backgroundColor: theme.colors.diaryHairlineDivider,
    },
    bentoCard: {
      backgroundColor: theme.colors.diaryMealCardBg,
      borderColor: theme.colors.diaryMealCardBorder,
      borderWidth: 1,
      borderRadius: 22,
      padding: 16,
      gap: 12,
    },
    bentoHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    bentoIconSquircle: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor: theme.colors.diarySquircleBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    bentoTitle: {
      fontFamily: theme.fonts.serif,
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.diaryHeadingText,
    },
    targetPreviewCard: {
      backgroundColor: theme.colors.diaryLoggedRowBg,
      borderRadius: 18,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.colors.diaryLoggedRowBorder,
      alignItems: 'center',
    },
    previewTitle: {
      fontFamily: theme.fonts.sans,
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    previewKcal: {
      fontFamily: theme.fonts.serif,
      fontSize: 34,
      fontWeight: '700',
      color: theme.colors.primary,
      marginVertical: 4,
      letterSpacing: -0.6,
    },
    previewMeta: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginBottom: 10,
    },
    stepBurnPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 999,
      backgroundColor: theme.colors.diarySquircleBg,
      marginBottom: 12,
    },
    stepBurnText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.textPrimary,
      fontVariant: ['tabular-nums'],
    },
    macroStrip: {
      flexDirection: 'row',
      width: '100%',
      justifyContent: 'space-around',
      borderTopWidth: 1,
      borderTopColor: theme.colors.diaryHairlineDivider,
      paddingTop: 12,
    },
    macroStripItem: {
      alignItems: 'center',
    },
    macroVal: {
      fontSize: 16,
      fontWeight: '700',
    },
    macroLabel: {
      fontSize: 12,
      color: theme.colors.textMuted,
      marginTop: 2,
    },
    macroDivider: {
      width: 1,
      backgroundColor: theme.colors.diaryHairlineDivider,
    },
    innerGroup: {
      gap: 8,
    },
    subSectionHeader: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.textSecondary,
      marginTop: 4,
    },
    inputGroup: {
      gap: 6,
    },
    rowInputs: {
      flexDirection: 'row',
      gap: 10,
    },
    inputLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.textSecondary,
    },
    input: {
      backgroundColor: theme.colors.diaryLoggedRowBg,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.diaryLoggedRowBorder,
      color: theme.colors.textPrimary,
      fontSize: 15,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    genderRow: {
      flexDirection: 'row',
      gap: 10,
    },
    genderBtn: {
      flex: 1,
      paddingVertical: 11,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.diaryLoggedRowBorder,
      backgroundColor: theme.colors.diaryLoggedRowBg,
      alignItems: 'center',
    },
    genderBtnActive: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.diaryAddBtnBg,
    },
    genderBtnText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.textSecondary,
    },
    genderBtnTextActive: {
      color: theme.colors.primary,
    },
    optionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.colors.diaryLoggedRowBg,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.colors.diaryLoggedRowBorder,
      padding: 12,
      gap: 10,
    },
    optionRowLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    optionRowActive: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.diaryAddBtnBg,
    },
    optionLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.textPrimary,
    },
    optionDesc: {
      fontSize: 12,
      color: theme.colors.textMuted,
      marginTop: 2,
    },
    accountShortcutIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: theme.colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    languageOptions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    languageOption: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: theme.colors.diaryLoggedRowBorder,
      backgroundColor: theme.colors.diaryLoggedRowBg,
    },
    languageOptionActive: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.diaryAddBtnBg,
    },
    languageOptionText: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      fontWeight: '600',
    },
    languageOptionTextActive: {
      color: theme.colors.primary,
    },
    restartNote: {
      color: theme.colors.textMuted,
      fontSize: 12,
      lineHeight: 16,
    },
    saveBtn: {
      backgroundColor: theme.colors.primary,
      borderRadius: 14,
      paddingVertical: 15,
      alignItems: 'center',
      marginTop: 4,
      ...theme.shadow.subtle,
    },
    saveBtnText: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.textInverted,
    },
    privacyNoteCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      backgroundColor: theme.colors.diaryLoggedRowBg,
      borderColor: theme.colors.diaryLoggedRowBorder,
      borderWidth: 1,
      borderRadius: 14,
      padding: 12,
    },
    privacyNoteTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.primary,
      marginBottom: 2,
    },
    privacyNoteDesc: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      lineHeight: 17,
    },
    attributionCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: theme.colors.diaryLoggedRowBg,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.colors.diaryLoggedRowBorder,
      padding: 12,
    },
    attributionText: {
      flex: 1,
      fontSize: 12,
      color: theme.colors.textMuted,
      lineHeight: 16,
    },
  });
