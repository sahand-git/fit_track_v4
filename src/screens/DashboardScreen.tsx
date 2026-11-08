import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Image,
} from 'react-native';
import { useAppDialog } from '../components/dialogs/AppDialogProvider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText as Text } from '../components/AppText';
import {
  Plus,
  Utensils,
  Coffee,
  Sun,
  Moon,
  Apple,
  User,
  Pill,
  Flame,
  Dumbbell,
  Trash2,
  Footprints,
  CheckCircle2,
} from 'lucide-react-native';
import { AnimatedCheckbox } from '../components/AnimatedCheckbox';
import { UserProfile, DailyLog, MealType, SupplementRoutineItem, WorkoutEntry } from '../types';
import { CalorieRing } from '../components/CalorieRing';
import { MacroCards } from '../components/MacroCards';
import { WaterTracker } from '../components/WaterTracker';
import { WeekDayRibbon } from '../components/WeekDayRibbon';
import { DashboardQuickGrid } from '../components/DashboardQuickGrid';
import { WeightJourneyCard } from '../components/WeightJourneyCard';
import { AddWorkoutSheet } from '../components/AddWorkoutSheet';
import { QuickActionSheet } from '../components/QuickActionSheet';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { StreakBadge } from '../components/StreakBadge';
import { GoalCelebration } from '../components/GoalCelebration';
import {
  evaluateDailyMilestones,
  getMilestoneDisplayMessage,
  getGoalMilestonesStorageKey,
  DayCelebratedMilestones,
} from '../utils/goalMilestonesCore';
import Animated from 'react-native-reanimated';
import {
  getStaggeredCardEntry,
  getListLayoutTransition,
  getItemExitAnimation,
} from '../utils/reanimatedMotion';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../theme/ThemeContext';
import { ThemeType } from '../theme';
import { DirectionalIcon } from '../components/DirectionalIcon';
import { useIsRTL } from '../hooks/useIsRTL';
import * as Haptics from 'expo-haptics';
import { useLanguage } from '../i18n/I18nContext';
import { translate } from '../i18n/strings';
import { getScopedStorageKey, saveUserProfile } from '../storage/storage';
import { formatDisplayDate, getTodayDateString } from '../utils/dateUtils';
import { getWorkoutDisplayMeta } from '../utils/workoutDisplay';
import { calculateActivityBudget } from '../utils/activityBudget';
import { formatKcal } from '../utils/formatKcal';
import { getCalorieRingSize } from '../utils/dashboardLayout';
import { NutrientDetailModal } from '../components/NutrientDetailModal';
import { SupportedNutrientKey, calculateNutrientDayProgress } from '../utils/nutrientTotals';
import { calculateTargets } from '../utils/calculator';
import { TodaySkeleton } from '../components/SkeletonLoader';

interface DashboardScreenProps {
  profile: UserProfile;
  log: DailyLog;
  supplementRoutine: SupplementRoutineItem[];
  streak?: number;
  isLoading?: boolean;
  onToggleSupplement: (id: string, taken: boolean) => void;
  onUpdateWater: (delta: number) => void;
  onNavigateToMeals: (targetMeal?: MealType) => void;
  onOpenAddFood: (
    mealType?: MealType,
    initialTab?: 'search' | 'photo' | 'describe',
    initialScanBarcode?: boolean
  ) => void;
  onOpenSupplements: () => void;
  onOpenProfile: () => void;
  onOpenSteps: () => void;
  onOpenWorkouts: () => void;
  onAddWorkout: (workout: WorkoutEntry, date: string) => void;
  onDeleteWorkout: (workoutId: string) => void;
  onUpdateWorkout?: (workout: WorkoutEntry, date: string) => void;
  onOpenLogWeight?: () => void;
  onUpdateProfile?: (profile: UserProfile) => Promise<void> | void;
  isAddFoodSheetOpen?: boolean;
  selectedDate?: string;
  onSelectDate?: (date: string) => void;
  onOpenDatePicker?: () => void;
  onExploreFood?: () => void;
}

export const DashboardScreen = React.memo<DashboardScreenProps>(({
  profile,
  log,
  supplementRoutine,
  streak = 0,
  isLoading,
  onToggleSupplement,
  onUpdateWater,
  onNavigateToMeals,
  onOpenAddFood,
  onOpenSupplements,
  onOpenProfile,
  onOpenSteps,
  onOpenWorkouts,
  onAddWorkout,
  onDeleteWorkout,
  onUpdateWorkout,
  onOpenLogWeight,
  onUpdateProfile,
  isAddFoodSheetOpen = false,
  selectedDate,
  onSelectDate,
  onOpenDatePicker,
  onExploreFood,
}) => {
  const language = useLanguage();
  const isRtl = useIsRTL();
  const { theme, isDark } = useTheme();
  const dialog = useAppDialog();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const t = useCallback((str: string) => translate(language, str), [language]);

  const [workoutSheetVisible, setWorkoutSheetVisible] = useState(false);
  const [quickActionVisible, setQuickActionVisible] = useState(false);
  const [heroWidth, setHeroWidth] = useState(0);
  const [selectedNutrientForDetail, setSelectedNutrientForDetail] = useState<SupportedNutrientKey | string | null>(null);
  const pendingMilestoneRef = useRef<(() => void) | null>(null);
  const celebratedMilestonesRef = useRef<Record<string, DayCelebratedMilestones>>({});

  const handleToggleTheme = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const nextMode = isDark ? 'light' : 'dark';
    const updated: UserProfile = {
      ...profile,
      themeMode: nextMode,
    };
    if (onUpdateProfile) {
      await onUpdateProfile(updated);
    } else {
      await saveUserProfile(updated);
    }
  }, [isDark, profile, onUpdateProfile]);

  useEffect(() => {
    if (!isAddFoodSheetOpen && pendingMilestoneRef.current) {
      const run = pendingMilestoneRef.current;
      pendingMilestoneRef.current = null;
      run();
    }
  }, [isAddFoodSheetOpen]);

  const dockBottom = insets.bottom > 0 ? insets.bottom + 8 : (Platform.OS === 'ios' ? 18 : 10);
  const dockClearance = dockBottom + 72;
  const scrollBottomPadding = Math.max(300, dockClearance + 200);

  const fiberProgress = useMemo(
    () => calculateNutrientDayProgress('fiber', log.meals, log.dailySupplements, profile),
    [log.meals, log.dailySupplements, profile]
  );
  const sugarProgress = useMemo(
    () => calculateNutrientDayProgress('sugar', log.meals, log.dailySupplements, profile),
    [log.meals, log.dailySupplements, profile]
  );

  const handleSaveNutrientGoal = async (nutrientKey: SupportedNutrientKey, newTarget: number) => {
    const updatedGoals = { ...(profile.customNutrientGoals || {}), [nutrientKey]: newTarget };
    const updated: UserProfile = {
      ...profile,
      customNutrientGoals: updatedGoals,
    };
    if (nutrientKey === 'calories') updated.targetCalories = newTarget;
    if (nutrientKey === 'protein') updated.targetProtein = newTarget;
    if (nutrientKey === 'carbs') updated.targetCarbs = newTarget;
    if (nutrientKey === 'fat') updated.targetFat = newTarget;

    if (onUpdateProfile) {
      await onUpdateProfile(updated);
    } else {
      await saveUserProfile(updated);
    }
  };

  const handleResetNutrientGoal = async (nutrientKey: SupportedNutrientKey) => {
    const updatedGoals = { ...(profile.customNutrientGoals || {}) };
    delete updatedGoals[nutrientKey];
    const updated: UserProfile = {
      ...profile,
      customNutrientGoals: updatedGoals,
    };

    if (nutrientKey === 'calories' || nutrientKey === 'protein' || nutrientKey === 'carbs' || nutrientKey === 'fat') {
      const defaultTargets = calculateTargets(
        profile.gender,
        profile.weightKg,
        profile.heightCm,
        profile.age,
        profile.activityLevel,
        profile.goal
      );
      if (nutrientKey === 'calories') updated.targetCalories = defaultTargets.targetCalories;
      if (nutrientKey === 'protein') updated.targetProtein = defaultTargets.targetProtein;
      if (nutrientKey === 'carbs') updated.targetCarbs = defaultTargets.targetCarbs;
      if (nutrientKey === 'fat') updated.targetFat = defaultTargets.targetFat;
    }

    if (onUpdateProfile) {
      await onUpdateProfile(updated);
    } else {
      await saveUserProfile(updated);
    }
  };

  const { consumedCalories, consumedProtein, consumedCarbs, consumedFat } = useMemo(() => {
    return log.meals.reduce(
      (acc, m) => ({
        consumedCalories: acc.consumedCalories + m.calories,
        consumedProtein: acc.consumedProtein + m.protein,
        consumedCarbs: acc.consumedCarbs + m.carbs,
        consumedFat: acc.consumedFat + m.fat,
      }),
      { consumedCalories: 0, consumedProtein: 0, consumedCarbs: 0, consumedFat: 0 }
    );
  }, [log.meals]);

  const activityBudget = useMemo(() => calculateActivityBudget({
    profile,
    workouts: log.workouts || [],
    steps: log.steps || 0,
  }), [profile, log.workouts, log.steps]);
  const burnedCalories = activityBudget.grossWorkoutCalories;
  const effectiveCalorieTarget = activityBudget.effectiveTarget;

  const handleToggleIncludeWorkouts = useCallback(async () => {
    if (!onUpdateProfile) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    const updated: UserProfile = {
      ...profile,
      includeWorkoutsInCalorieBudget: !profile.includeWorkoutsInCalorieBudget,
    };
    await onUpdateProfile(updated);
  }, [onUpdateProfile, profile]);

  const getMealIcon = (mealType: MealType) => {
    switch (mealType) {
      case 'breakfast':
        return <Coffee size={14} color={theme.colors.secondary} />;
      case 'lunch':
        return <Utensils size={14} color={theme.colors.secondary} />;
      case 'dinner':
        return <Moon size={14} color={theme.colors.secondary} />;
      case 'snack':
        return <Apple size={14} color={theme.colors.secondary} />;
      default:
        return <Utensils size={14} color={theme.colors.secondary} />;
    }
  };

  const mealTypes: { key: MealType; label: string }[] = useMemo(
    () => [
      { key: 'breakfast', label: t('Breakfast') },
      { key: 'lunch', label: t('Lunch') },
      { key: 'dinner', label: t('Dinner') },
      { key: 'snack', label: t('Snacks') },
    ],
    [t]
  );

  const todayLabel = formatDisplayDate(log.date, language);
  const isFuture = log.date > getTodayDateString();

  const takenSupplementIds = useMemo(
    () => new Set((log.supplements || []).filter((c) => c.taken).map((c) => c.itemId)),
    [log.supplements]
  );

  const activeSupplements = useMemo(() => {
    if (log.dailySupplements !== undefined) {
      return log.dailySupplements.map((s) => ({
        id: s.id,
        name: s.name,
        doseText: s.dose || (s.amount && s.unit ? `${s.amount} ${t(s.unit)}` : s.amount ? `${s.amount}` : ''),
        isTaken: !!s.taken,
      }));
    }
    if (supplementRoutine && supplementRoutine.length > 0) {
      return supplementRoutine.map((r) => ({
        id: r.id,
        name: r.name,
        doseText: r.dose || (r.amount && r.unit ? `${r.amount} ${t(r.unit)}` : r.amount ? `${r.amount}` : ''),
        isTaken: takenSupplementIds.has(r.id),
      }));
    }
    return [];
  }, [log.dailySupplements, supplementRoutine, takenSupplementIds, t]);

  const takenSupplementsCount = useMemo(
    () => activeSupplements.filter((s) => s.isTaken).length,
    [activeSupplements]
  );

  const [activeMilestoneBanner, setActiveMilestoneBanner] = useState<{
    visible: boolean;
    title: string;
    message: string;
    isNeutralStatusOnly: boolean;
  } | null>(null);

  // Trigger milestone celebration once per date when target is reached
  useEffect(() => {
    let isCancelled = false;
    async function checkGoalMilestones() {
      const currentDate = log.date;
      const storageKey = getScopedStorageKey(getGoalMilestonesStorageKey(currentDate));
      let celebrated: DayCelebratedMilestones = { ...(celebratedMilestonesRef.current[currentDate] || {}) };
      try {
        const raw = await AsyncStorage.getItem(storageKey);
        if (raw) {
          celebrated = { ...JSON.parse(raw), ...celebrated };
        }
      } catch {
        // keep memory cache
      }

      const evalResult = evaluateDailyMilestones({
        date: currentDate,
        consumedCalories,
        calorieTarget: effectiveCalorieTarget,
        steps: log.steps || 0,
        stepGoal: profile.stepGoal || 8000,
        waterGlasses: log.waterGlasses || 0,
        waterTargetGlasses: profile.waterTargetGlasses || 8,
        celebrated,
      });

      if (evalResult.newlyReached.length > 0 && !isCancelled) {
        celebratedMilestonesRef.current[currentDate] = evalResult.updatedCelebrated;
        try {
          await AsyncStorage.setItem(storageKey, JSON.stringify(evalResult.updatedCelebrated));
        } catch (e) {
          console.warn('Failed to save celebrated milestones:', e);
        }

        const milestoneToAnnounce =
          evalResult.newlyReached.find((m) => m === 'steps') ||
          evalResult.newlyReached.find((m) => m === 'water') ||
          evalResult.newlyReached[0];

        if (milestoneToAnnounce) {
          const triggerAnnounce = () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
            const meta = getMilestoneDisplayMessage(
              milestoneToAnnounce,
              {
                steps: log.steps || 0,
                stepGoal: profile.stepGoal || 8000,
                calorieTolerance: evalResult.calorieTolerance,
              },
              t
            );
            setActiveMilestoneBanner({
              visible: true,
              title: meta.title,
              message: meta.message,
              isNeutralStatusOnly: meta.isNeutralStatusOnly,
            });
          };

          if (isAddFoodSheetOpen) {
            pendingMilestoneRef.current = triggerAnnounce;
          } else {
            triggerAnnounce();
          }
        }
      }
    }

    checkGoalMilestones();
    return () => {
      isCancelled = true;
    };
  }, [
    consumedCalories,
    effectiveCalorieTarget,
    log.steps,
    profile.stepGoal,
    log.waterGlasses,
    profile.waterTargetGlasses,
    log.date,
    isAddFoodSheetOpen,
    t,
  ]);

  const handleQuickAdd = (meal: MealType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onOpenAddFood(meal);
  };

  if (isLoading) {
    return <TodaySkeleton />;
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, { paddingBottom: scrollBottomPadding }]}>
        {/* Editorial Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.dateLabel}>{todayLabel}</Text>
            <View style={styles.titleRow}>
              <Text style={styles.screenTitle}>{t('Today')}</Text>
              <StreakBadge streak={streak} />
            </View>
          </View>

          <View style={styles.headerActions}>
            <AnimatedPressable
              style={styles.profileBtn}
              onPress={handleToggleTheme}
              accessibilityLabel={isDark ? t('Switch to light theme') : t('Switch to dark theme')}
              accessibilityRole="button"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              {isDark ? (
                <Sun size={18} color={theme.colors.amber || theme.colors.textPrimary} />
              ) : (
                <Moon size={18} color={theme.colors.textPrimary} />
              )}
            </AnimatedPressable>

            <AnimatedPressable
              style={styles.profileBtn}
              onPress={onOpenProfile}
              accessibilityLabel={t('Profile & Goals')}
              accessibilityRole="button"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              {profile.avatarUrl ? (
                <Image
                  source={{ uri: profile.avatarUrl }}
                  style={{ width: 28, height: 28, borderRadius: 14 }}
                />
              ) : profile.avatarPreset ? (
                <Text style={{ fontSize: 18, lineHeight: 22 }}>{profile.avatarPreset}</Text>
              ) : (
                <User size={18} color={theme.colors.textPrimary} />
              )}
            </AnimatedPressable>
          </View>
        </View>

        {/* 1.1 Horizontal Week Day Ribbon */}
        {onSelectDate && (
          <WeekDayRibbon
            selectedDate={selectedDate || log.date}
            onSelectDate={onSelectDate}
            onOpenDatePicker={onOpenDatePicker}
          />
        )}

        {/* Hero Calorie Budget Focus */}
        <Animated.View
          entering={getStaggeredCardEntry(0)}
          onLayout={(event) => setHeroWidth(event.nativeEvent.layout.width)}
          style={styles.heroSection}
        >
          <CalorieRing
            consumed={consumedCalories}
            target={effectiveCalorieTarget}
            proteinConsumed={consumedProtein}
            proteinTarget={profile.customNutrientGoals?.protein ?? profile.targetProtein}
            size={getCalorieRingSize(heroWidth)}
            onPress={() => setSelectedNutrientForDetail('calories')}
          />

          {/* Activity & Energy Balance Card */}
          <View style={styles.activityCard}>
            {/* Top row: Summary + Toggle Button */}
            <View style={[styles.activityHeaderRow, isRtl && styles.rowRtl]}>
              <View style={[styles.activityHeaderLeft, isRtl && styles.rowRtl]}>
                <View style={styles.activityFlameIcon}>
                  <Flame size={16} color={theme.colors.warning} />
                </View>
                <View>
                  <Text style={styles.activityCardTitle}>{t('Active Burn')}</Text>
                  <Text style={styles.activityTotalKcal}>
                    {activityBudget.workoutCalories + activityBudget.stepCalories} <Text style={styles.activityKcalUnit}>{t('kcal total')}</Text>
                  </Text>
                </View>
              </View>

              {/* In-place Budget Toggle Button */}
              {onUpdateProfile && (
                <TouchableOpacity
                  style={[
                    styles.budgetToggleBtn,
                    profile.includeWorkoutsInCalorieBudget && styles.budgetToggleBtnActive,
                    isRtl && styles.rowRtl,
                  ]}
                  onPress={handleToggleIncludeWorkouts}
                  activeOpacity={0.8}
                  accessibilityRole="switch"
                  accessibilityLabel={t('Include activity burn in calorie budget')}
                  accessibilityState={{ checked: !!profile.includeWorkoutsInCalorieBudget }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <View style={[
                    styles.toggleSwitchKnob,
                    profile.includeWorkoutsInCalorieBudget && styles.toggleSwitchKnobActive,
                  ]} />
                  <Text style={[
                    styles.budgetToggleBtnText,
                    profile.includeWorkoutsInCalorieBudget && styles.budgetToggleBtnTextActive,
                  ]}>
                    {profile.includeWorkoutsInCalorieBudget ? t('In Budget: ON') : t('In Budget: OFF')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Split Metrics: Workouts vs Steps */}
            <View style={[styles.activitySplitRow, isRtl && styles.rowRtl]}>
              {/* Workouts Burn Box */}
              <TouchableOpacity
                style={styles.activityMetricBox}
                onPress={onOpenWorkouts}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`${t('Workouts')}: ${activityBudget.workoutCalories} ${t('kcal')}`}
              >
                <View style={[styles.metricBoxHeader, isRtl && styles.rowRtl]}>
                  <Dumbbell size={14} color={theme.colors.accent} />
                  <Text style={styles.metricBoxLabel}>{t('Workouts')}</Text>
                </View>
                <Text style={styles.metricBoxValue}>
                  {activityBudget.workoutCalories} <Text style={styles.metricBoxSub}>{t('kcal')}</Text>
                </Text>
                <Text style={styles.metricBoxHint}>
                  {log.workouts?.length ? `${log.workouts.length} ${t('logged')}` : t('0 logged')}
                </Text>
              </TouchableOpacity>

              {/* Steps Burn Box */}
              <TouchableOpacity
                style={styles.activityMetricBox}
                onPress={onOpenSteps}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`${t('Steps')}: ${(log.steps || 0).toLocaleString()}, ${activityBudget.stepCalories} ${t('kcal')}`}
              >
                <View style={[styles.metricBoxHeader, isRtl && styles.rowRtl]}>
                  <Footprints size={14} color={theme.colors.water} />
                  <Text style={styles.metricBoxLabel}>{t('Steps')}</Text>
                </View>
                <Text style={styles.metricBoxValue}>
                  {activityBudget.stepCalories} <Text style={styles.metricBoxSub}>{t('kcal')}</Text>
                </Text>
                <Text style={styles.metricBoxHint}>
                  {(log.steps || 0).toLocaleString()} / {(profile.stepGoal || 8000).toLocaleString()}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Reconciled Budget Footer Explanation */}
            <View style={[styles.activityFooterBanner, isRtl && styles.rowRtl]}>
              <Text style={styles.activityFooterText}>
                {profile.includeWorkoutsInCalorieBudget
                  ? `${t('Active burn added to food budget')}: +${activityBudget.workoutCalories + activityBudget.stepCalories} ${t('kcal')} (${activityBudget.workoutCalories} ${t('Workouts')} + ${activityBudget.stepCalories} ${t('Steps')})`
                  : `${activityBudget.workoutCalories + activityBudget.stepCalories} ${t('kcal burned')} · ${t('tracked as burn, not in food budget')}`}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Nutrients Bar */}
        <Animated.View entering={getStaggeredCardEntry(1)}>
          <MacroCards
            calorieTarget={effectiveCalorieTarget}
            calorieConsumed={consumedCalories}
            proteinTarget={profile.customNutrientGoals?.protein ?? profile.targetProtein}
            proteinConsumed={consumedProtein}
            carbsTarget={profile.customNutrientGoals?.carbs ?? profile.targetCarbs}
            carbsConsumed={consumedCarbs}
            fatTarget={profile.customNutrientGoals?.fat ?? profile.targetFat}
            fatConsumed={consumedFat}
            fiberConsumed={fiberProgress.current}
            fiberTarget={fiberProgress.target}
            fiberHasTarget={fiberProgress.hasTarget}
            fiberIsIncomplete={fiberProgress.isIncomplete}
            sugarConsumed={sugarProgress.current}
            sugarTarget={sugarProgress.target}
            sugarHasTarget={sugarProgress.hasTarget}
            sugarIsIncomplete={sugarProgress.isIncomplete}
            onSelectNutrient={(key) => setSelectedNutrientForDetail(key)}
          />
        </Animated.View>

        {/* 1.3 Quick Action Grid (6 Choices: Scan Food, AI Describe, Barcode, Vitamins, Workouts, Steps) */}
        <Animated.View entering={getStaggeredCardEntry(2)}>
          <DashboardQuickGrid
            onScanPlate={() => onOpenAddFood(undefined, 'photo')}
            onDescribeMeal={() => onOpenAddFood(undefined, 'describe')}
            onScanBarcode={() => onOpenAddFood(undefined, 'search', true)}
            onOpenSupplements={onOpenSupplements}
            onOpenWorkouts={onOpenWorkouts}
            onOpenSteps={onOpenSteps}
          />
        </Animated.View>

        {/* Meals Ledger (Positioned directly below macros for fast, seamless food logging) */}
        <Animated.View entering={getStaggeredCardEntry(3)}>
          <View style={styles.mealsHeader}>
            <Text style={styles.sectionHeading}>{t('Today’s Meals')}</Text>
            <TouchableOpacity
              onPress={() => onNavigateToMeals()}
              style={styles.seeAllBtn}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={t('View diary')}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={styles.seeAllText}>{t('View diary')}</Text>
              <DirectionalIcon name="ChevronRight" size={14} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Meals Ledger List */}
          <View style={styles.mealsList}>
            {mealTypes.map((m, index) => {
              const mealsOfCategory = log.meals.filter((item) => item.mealType === m.key);
              const cals = mealsOfCategory.reduce((sum, item) => sum + item.calories, 0);
              const isLast = index === mealTypes.length - 1;
              const isEmpty = mealsOfCategory.length === 0;

              return (
                <AnimatedPressable
                  key={m.key}
                  style={[
                    styles.mealRow,
                    isLast && styles.mealRowLast,
                    isEmpty && styles.mealRowEmpty,
                  ]}
                  onPress={() => handleQuickAdd(m.key)}
                  minScale={0.97}
                  accessibilityLabel={`${t('Add to')} ${m.label}`}
                  accessibilityRole="button"
                >
                  <View style={styles.mealLeft}>
                    <View style={[styles.mealIconBox, isEmpty && styles.mealIconBoxEmpty]}>
                      {getMealIcon(m.key)}
                    </View>
                    <View style={styles.mealTextWrapper}>
                      <Text style={styles.mealName}>{m.label}</Text>
                      <View style={styles.mealSubRow}>
                        {isEmpty && (
                          <Plus size={12} color={theme.colors.primary} strokeWidth={2.5} style={styles.mealSubPlus} />
                        )}
                        <Text style={[styles.mealSub, isEmpty && styles.mealSubEmpty]}>
                          {mealsOfCategory.length > 0
                            ? `${mealsOfCategory.length} ${t(mealsOfCategory.length > 1 ? 'items' : 'item')}`
                            : t('Tap to log food')}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.mealRight}>
                    {cals > 0 && <Text style={styles.mealCals}>{formatKcal(cals, t)}</Text>}
                    <View style={styles.plusIconWrapper}>
                      <View style={styles.plusIconCircle}>
                        <Plus size={20} color={theme.colors.textInverted} strokeWidth={2.5} />
                      </View>
                    </View>
                  </View>
                </AnimatedPressable>
              );
            })}
          </View>
        </Animated.View>

        {/* 6.1 Weight Journey Card */}
        <Animated.View entering={getStaggeredCardEntry(4)}>
          <WeightJourneyCard
            currentWeightKg={profile.weightKg}
            targetWeightKg={profile.targetWeightKg}
            heightCm={profile.heightCm}
            onLogWeight={onOpenLogWeight}
          />
        </Animated.View>

        {/* Hydration Row */}
        <Animated.View entering={getStaggeredCardEntry(5)}>
          <WaterTracker
            glasses={log.waterGlasses}
            target={profile.waterTargetGlasses}
            onUpdate={onUpdateWater}
          />
        </Animated.View>
      </ScrollView>

      {/* Floating "+ Add Food" Circular FAB */}
      <AnimatedPressable
        style={[
          styles.floatingAddFab,
          { bottom: dockClearance + 18 },
          isRtl ? { left: 20 } : { right: 20 },
        ]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
          onOpenAddFood();
        }}
        minScale={0.92}
        accessibilityRole="button"
        accessibilityLabel={t('Add Food')}
      >
        <Plus size={26} color={theme.colors.textInverted} strokeWidth={2.6} />
      </AnimatedPressable>

      <QuickActionSheet
        visible={quickActionVisible}
        onClose={() => setQuickActionVisible(false)}
        onOpenBarcodeScanner={(meal) => onOpenAddFood(meal, 'search', true)}
        onOpenPlateScanner={(meal) => onOpenAddFood(meal, 'photo', false)}
        onOpenFoodLog={(meal) => onOpenAddFood(meal, 'search', false)}
        onQuickWater={(glasses = 1) => onUpdateWater(glasses)}
        onOpenAddWorkout={() => setWorkoutSheetVisible(true)}
        onOpenStepTracker={onOpenSteps}
        onOpenSupplements={onOpenSupplements}
        onOpenLogWeight={onOpenLogWeight}
      />

      <AddWorkoutSheet
        visible={workoutSheetVisible}
        onClose={() => setWorkoutSheetVisible(false)}
        date={log.date}
        profile={profile}
        onSaveWorkout={onAddWorkout}
        onUpdateWorkout={onUpdateWorkout}
      />

      <GoalCelebration
        visible={Boolean(activeMilestoneBanner?.visible)}
        title={activeMilestoneBanner?.title}
        message={activeMilestoneBanner?.message}
        isNeutralStatusOnly={activeMilestoneBanner?.isNeutralStatusOnly}
        onDismiss={() => setActiveMilestoneBanner(null)}
      />

      <NutrientDetailModal
        visible={!!selectedNutrientForDetail}
        initialNutrientKey={selectedNutrientForDetail || 'calories'}
        meals={log.meals}
        supplements={log.dailySupplements}
        profile={profile}
        onClose={() => setSelectedNutrientForDetail(null)}
        onSaveGoal={handleSaveNutrientGoal}
        onResetGoal={handleResetNutrientGoal}
      />
    </View>
  );
});
DashboardScreen.displayName = 'DashboardScreen';

const createStyles = (theme: ThemeType) => StyleSheet.create({
  scroll: {
    flex: 1,
  },
  stepsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    marginTop: 12,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.subtle,
  },
  stepsIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primaryLight },
  stepsInfo: { flex: 1, gap: 6 },
  stepsTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  stepsTitle: { color: theme.colors.textPrimary, fontWeight: '700', fontSize: 15 },
  stepsCount: { color: theme.colors.textSecondary, fontSize: 13, fontWeight: '600' },
  stepsTrack: { height: 6, overflow: 'hidden', borderRadius: 4, backgroundColor: theme.colors.surfaceSubtle },
  stepsFill: { height: '100%', backgroundColor: theme.colors.secondary, borderRadius: 4 },
  stepsHint: { color: theme.colors.textMuted, fontSize: 12 },
  rowRtl: {
    flexDirection: 'row-reverse',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 2,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.terracottaLightWash,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.terracottaWashBorder,
  },
  streakText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.terracottaDark,
  },
  activityCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginTop: 12,
    gap: 10,
    ...theme.shadow.subtle,
  },
  activityHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activityHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  activityFlameIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.colors.warningLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityCardTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  activityTotalKcal: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  activityKcalUnit: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.textMuted,
  },
  budgetToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  budgetToggleBtnActive: {
    backgroundColor: theme.colors.primaryLight,
    borderColor: theme.colors.primary,
  },
  toggleSwitchKnob: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.textMuted,
  },
  toggleSwitchKnobActive: {
    backgroundColor: theme.colors.primary,
  },
  budgetToggleBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    includeFontPadding: false,
  },
  budgetToggleBtnTextActive: {
    color: theme.colors.primary,
  },
  activitySplitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  activityMetricBox: {
    flex: 1,
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 2,
  },
  metricBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metricBoxLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  metricBoxValue: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  metricBoxSub: {
    fontSize: 11,
    fontWeight: '500',
    color: theme.colors.textMuted,
  },
  metricBoxHint: {
    fontSize: 11,
    fontWeight: '500',
    color: theme.colors.textMuted,
    marginTop: 1,
  },
  activityFooterBanner: {
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  activityFooterText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textMuted,
    lineHeight: 15,
  },
  burnBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.warningLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radius.md,
    marginTop: 12,
    alignSelf: 'stretch',
    maxWidth: '100%',
  },
  burnBannerText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.warning,
    flex: 1,
    flexShrink: 1,
  },
  workoutContainer: {
    marginTop: 10,
    marginBottom: 4,
  },
  workoutCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    ...theme.shadow.subtle,
  },
  workoutHeader: {
    gap: 8,
    marginBottom: 10,
  },
  workoutHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  workoutTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  workoutTitle: {
    fontFamily: theme.fonts.serif,
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  workoutBurnBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.warning,
    backgroundColor: theme.colors.warningLight,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: theme.radius.sm,
    overflow: 'hidden',
  },
  addWorkoutBtn: {
    alignSelf: 'stretch',
    justifyContent: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primaryLight,
  },
  addWorkoutBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  emptyWorkoutRow: {
    minHeight: 44,
    justifyContent: 'center',
    paddingVertical: 10,
    alignItems: 'center',
  },
  emptyWorkoutText: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  workoutItemsList: {
    gap: 8,
  },
  workoutItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: 10,
    minHeight: 52,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  workoutItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    lineHeight: 20,
  },
  workoutItemMeta: {
    fontSize: 12,
    color: theme.colors.textMuted,
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.radius.full,
    paddingHorizontal: 8,
    paddingVertical: 4,
    overflow: 'hidden',
  },
  workoutItemInfo: {
    flex: 1,
    minWidth: 0,
    gap: 6,
    paddingEnd: 10,
  },
  workoutItemMetaList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  deleteWorkoutBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    paddingHorizontal: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  profileBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadow.subtle,
  },
  dateLabel: {
    fontFamily: theme.fonts.sans,
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  screenTitle: {
    fontFamily: theme.fonts.serif,
    fontSize: 32,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    letterSpacing: -0.5,
    marginTop: 2,
  },
  heroSection: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    paddingVertical: theme.spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 6,
    ...theme.shadow.subtle,
  },
  supplementsContainer: {
    marginTop: 10,
    marginBottom: 4,
  },
  slimRoutineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 12,
    paddingHorizontal: 14,
    ...theme.shadow.subtle,
  },
  slimRoutineLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pillIconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slimRoutineText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  routineCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    gap: 12,
    ...theme.shadow.subtle,
  },
  routineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  routineTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  routineTitle: {
    fontFamily: theme.fonts.serif,
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  routineCount: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
    marginHorizontal: 4,
  },
  manageBtn: {
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surfaceSubtle,
  },
  manageBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  routineItemsList: {
    gap: 8,
  },
  routineItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
    minHeight: 44,
  },
  checkboxCircle: {
    padding: 2,
  },
  routineItemName: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  routineItemNameTaken: {
    color: theme.colors.textMuted,
    textDecorationLine: 'line-through',
  },
  routineItemDose: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 1,
  },
  mealsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  sectionHeading: {
    fontFamily: theme.fonts.serif,
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    letterSpacing: -0.3,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    gap: 2,
  },
  seeAllText: {
    fontFamily: theme.fonts.sans,
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.primary,
  },
  mealsList: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
    ...theme.shadow.subtle,
  },
  mealRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 48,
    paddingVertical: 14,
    paddingHorizontal: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  mealRowLast: {
    borderBottomWidth: 0,
  },
  mealRowEmpty: {
    backgroundColor: theme.colors.surface,
  },
  mealLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  mealIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealIconBoxEmpty: {
    backgroundColor: theme.colors.primaryLight,
  },
  mealTextWrapper: {
    justifyContent: 'center',
  },
  mealName: {
    fontFamily: theme.fonts.sans,
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  mealSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  mealSubPlus: {
    marginRight: 3,
  },
  mealSub: {
    fontFamily: theme.fonts.sans,
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  mealSubEmpty: {
    color: theme.colors.primary,
    fontWeight: '600',
    fontSize: 12,
  },
  mealRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  mealCals: {
    fontFamily: theme.fonts.sans,
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  plusIconWrapper: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadow.subtle,
  },
  floatingAddFab: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: theme.colors.primary,
    borderWidth: 1.5,
    borderColor: theme.colors.primaryBorder,
    ...theme.shadow.floating,
    zIndex: 99,
    elevation: 8,
  },
});
