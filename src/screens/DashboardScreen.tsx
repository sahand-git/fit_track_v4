import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText as Text } from '../components/AppText';
import {
  Sun,
  Moon,
  Calendar,
  Pill,
  Check,
} from 'lucide-react-native';
import { UserProfile, DailyLog, LoggedMeal, MealType, SupplementRoutineItem, WorkoutEntry } from '../types';
import { CalorieRing } from '../components/CalorieRing';
import { ActiveBurnCard } from '../components/ActiveBurnCard';
import { MacroCards } from '../components/MacroCards';
import { WaterTracker } from '../components/WaterTracker';
import { CalendarPickerModal } from '../components/CalendarPickerModal';
import { WeekDayRibbon } from '../components/WeekDayRibbon';
import { MealsDiarySection } from '../components/MealsDiarySection';

import { AddWorkoutSheet } from '../components/AddWorkoutSheet';
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
import { formatFullCalendarDate, getTodayDateString, parseLocalDateString } from '../utils/dateUtils';
import { calculateActivityBudget } from '../utils/activityBudget';
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
  onNavigateToMeals?: (targetMeal?: MealType) => void;
  onOpenAddFood: (
    mealType?: MealType,
    initialTab?: 'search' | 'photo' | 'describe',
    initialScanBarcode?: boolean
  ) => void;
  onAddMeal?: (meal: LoggedMeal, targetDate: string) => void;
  onUpdateMeal?: (meal: LoggedMeal) => void;
  onRemoveMeal?: (mealId: string) => void;
  onOpenSupplements: () => void;
  onOpenProfile?: () => void;
  onOpenSteps: () => void;
  onOpenWorkouts: () => void;
  onAddWorkout: (workout: WorkoutEntry, date: string) => void;
  onDeleteWorkout?: (workoutId: string) => void;
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
  onOpenAddFood,
  onAddMeal,
  onUpdateMeal,
  onRemoveMeal,
  onOpenSupplements,
  onOpenSteps,
  onOpenWorkouts,
  onAddWorkout,
  onUpdateWorkout,
  onUpdateProfile,
  isAddFoodSheetOpen = false,
  selectedDate,
  onSelectDate,
}) => {
  const language = useLanguage();
  const isRtl = useIsRTL();
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const t = useCallback((str: string) => translate(language, str), [language]);

  const [workoutSheetVisible, setWorkoutSheetVisible] = useState(false);
  const [showCalendarPicker, setShowCalendarPicker] = useState(false);
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
  const scrollBottomPadding = Math.max(120, dockClearance + 28);

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
    storedStepCalories: log.stepCalories,
  }), [profile, log.workouts, log.steps, log.stepCalories]);
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

  const supplementItems = useMemo(() => {
    if (log.dailySupplements && log.dailySupplements.length > 0) {
      return log.dailySupplements.map((s) => ({
        id: s.routineItemId || s.id,
        name: s.name,
        taken: !!s.taken,
      }));
    }
    return supplementRoutine.map((item) => {
      const check = (log.supplements || []).find((c) => c.itemId === item.id);
      return {
        id: item.id,
        name: item.name,
        taken: !!check?.taken,
      };
    });
  }, [log.dailySupplements, log.supplements, supplementRoutine]);

  const takenSupplementsCount = useMemo(
    () => supplementItems.filter((item) => item.taken).length,
    [supplementItems]
  );

  const todayStr = useMemo(() => getTodayDateString(), []);
  const activeDate = selectedDate || log.date;
  const isFutureDate = activeDate > todayStr;
  const parsedDate = useMemo(() => parseLocalDateString(log.date), [log.date]);
  const dayNamesEn = useMemo(() => ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], []);
  const dayOfWeekName = t(dayNamesEn[parsedDate.getDay()] || 'Today');
  const headerTitle = log.date === todayStr ? t('Today') : dayOfWeekName;
  const headerSubtitle = formatFullCalendarDate(log.date, language);





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

  if (isLoading) {
    return <TodaySkeleton />;
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, { paddingBottom: scrollBottomPadding }]}>
        {/* Editorial Header (Picture 2 Reference) */}
        <View style={[styles.header, isRtl && styles.rowRtl]}>
          <TouchableOpacity
            style={styles.headerTitleContainer}
            onPress={() => setShowCalendarPicker(true)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={t('Choose date')}
          >
            <Text style={styles.screenTitle}>{headerTitle}</Text>
            <View style={[styles.headerSubtitleRow, isRtl && styles.rowRtl]}>
              <Text style={styles.dateLabel}>{headerSubtitle}</Text>
              <Calendar size={13} color={theme.colors.textMuted} style={isRtl ? { marginRight: 4 } : { marginLeft: 4 }} />
            </View>
          </TouchableOpacity>

          <View style={[styles.headerActions, isRtl && styles.rowRtl]}>
            <StreakBadge streak={streak} />
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
          </View>
        </View>

        {/* 1.1 Glassmorphic Calendar Header & 7-Day Strip */}
        {onSelectDate && (
          <WeekDayRibbon
            selectedDate={selectedDate || log.date}
            onSelectDate={onSelectDate}
            onOpenDatePicker={() => setShowCalendarPicker(true)}
            currentLog={log}
            profile={profile}
          />
        )}

        {/* Hero Calorie Budget Focus (cleanly directly below Calendar Header) */}
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
        </Animated.View>

        {/* Nutrients Bar (4-Ring Macro Row: Calories, Protein, Carbs, Fat) */}
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
            waterGlasses={log.waterGlasses}
            waterTargetGlasses={profile.waterTargetGlasses}
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

        {/* Integrated Quick Action Bar + Collapsible Today's Meals Diary */}
        <Animated.View entering={getStaggeredCardEntry(2)} style={styles.mealsSectionContainer}>
          <MealsDiarySection
            profile={profile}
            log={log}
            selectedDate={activeDate}
            isFuture={isFutureDate}
            showSectionHeading={true}
            showQuickActionBar={true}
            toastMode="inline"
            onOpenAddFood={onOpenAddFood}
            onAddMeal={onAddMeal ?? (() => {})}
            onUpdateMeal={onUpdateMeal}
            onRemoveMeal={onRemoveMeal ?? (() => {})}
          />
        </Animated.View>

        {/* Active Burn Telemetry Card (Workouts + Steps Progress + In-Budget Toggle) */}
        <Animated.View entering={getStaggeredCardEntry(3)}>
          <ActiveBurnCard
            steps={log.steps || 0}
            nonWorkoutSteps={activityBudget.nonWorkoutSteps}
            stepGoal={profile.stepGoal || 8000}
            weightKg={profile.weightKg || 70}
            stepCalories={activityBudget.stepCalories}
            workoutCalories={activityBudget.workoutCalories}
            workouts={log.workouts || []}
            includeInBudget={!!profile.includeWorkoutsInCalorieBudget}
            canToggleBudget={Boolean(onUpdateProfile)}
            onToggleBudget={handleToggleIncludeWorkouts}
            onOpenSteps={onOpenSteps}
            onOpenWorkouts={onOpenWorkouts}
            onQuickLogWorkout={() => setWorkoutSheetVisible(true)}
          />
        </Animated.View>

        {/* Slim Interactive Supplements Routine Row */}
        <Animated.View entering={getStaggeredCardEntry(4)}>
          <View style={styles.supplementsSlimCard}>
            <TouchableOpacity
              style={[styles.supplementsHeaderRow, isRtl && styles.rowRtl]}
              onPress={onOpenSupplements}
              activeOpacity={0.78}
              accessibilityRole="button"
              accessibilityLabel={t('Supplements')}
            >
              <View style={[styles.supplementsTitleLeft, isRtl && styles.rowRtl]}>
                <View style={styles.supplementsSquircle}>
                  <Pill size={16} color={theme.colors.primary} strokeWidth={2.1} />
                </View>
                <View style={styles.supplementsTextGroup}>
                  <Text style={[styles.supplementsTitle, isRtl && styles.rtlText]}>
                    {t('Supplements')}
                  </Text>
                  <Text style={[styles.supplementsSubtitle, isRtl && styles.rtlText]}>
                    {supplementSummaryText(takenSupplementsCount, supplementItems.length, t)}
                  </Text>
                </View>
              </View>
              <DirectionalIcon
                name="ChevronRight"
                size={18}
                color={theme.colors.diarySubtleSlate}
              />
            </TouchableOpacity>

            {supplementItems.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={[
                  styles.supplementsChipRow,
                  isRtl && styles.rowRtl,
                ]}
              >
                {supplementItems.map((sup) => (
                  <TouchableOpacity
                    key={sup.id}
                    style={[
                      styles.supplementChip,
                      sup.taken && styles.supplementChipTaken,
                      isRtl && styles.rowRtl,
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                      onToggleSupplement(sup.id, !sup.taken);
                    }}
                    activeOpacity={0.75}
                    accessibilityRole="button"
                    accessibilityLabel={`${sup.name}, ${sup.taken ? t('Taken') : t('Tap to mark taken')}`}
                  >
                    <View
                      style={[
                        styles.supplementCheckCircle,
                        sup.taken && styles.supplementCheckCircleTaken,
                      ]}
                    >
                      {sup.taken && (
                        <Check
                          size={12}
                          color={theme.colors.calendarSelectedText}
                          strokeWidth={2.8}
                        />
                      )}
                    </View>
                    <Text
                      style={[
                        styles.supplementChipLabel,
                        sup.taken && styles.supplementChipLabelTaken,
                      ]}
                      numberOfLines={1}
                    >
                      {sup.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </Animated.View>

        {/* Hydration Row */}
        <Animated.View entering={getStaggeredCardEntry(5)} style={styles.waterTrackerSection}>
          <WaterTracker
            glasses={log.waterGlasses}
            target={profile.waterTargetGlasses}
            onUpdate={onUpdateWater}
          />
        </Animated.View>
      </ScrollView>

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

      <CalendarPickerModal
        visible={showCalendarPicker}
        selectedDate={selectedDate || log.date}
        onClose={() => setShowCalendarPicker(false)}
        onSelect={(date) => {
          onSelectDate?.(date);
          setShowCalendarPicker(false);
        }}
      />

      <NutrientDetailModal
        visible={!!selectedNutrientForDetail}
        initialNutrientKey={selectedNutrientForDetail || 'calories'}
        meals={log.meals}
        supplements={log.dailySupplements}
        waterGlasses={log.waterGlasses}
        profile={profile}
        onClose={() => setSelectedNutrientForDetail(null)}
        onSaveGoal={handleSaveNutrientGoal}
        onResetGoal={handleResetNutrientGoal}
      />
    </View>
  );
});
DashboardScreen.displayName = 'DashboardScreen';

const supplementSummaryText = (
  takenCount: number,
  totalCount: number,
  t: (k: string) => string,
) => {
  if (totalCount === 0) {
    return t('Add daily vitamins & supplements');
  }
  return `${takenCount} / ${totalCount} ${t('taken today')}`;
};

const createStyles = (theme: ThemeType) => StyleSheet.create({
  headerTitleContainer: {
    flex: 1,
  },
  headerSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  primaryAddFoodBtn: {
    height: 48,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
    ...theme.shadow.subtle,
  },
  primaryAddFoodText: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.black,
  },
  mealsContainer: {
    gap: 10,
  },
  mealCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    ...theme.shadow.subtle,
  },
  mealCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mealCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mealPlusCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealCalsUnit: {
    fontSize: 11,
    fontWeight: '500',
    color: theme.colors.textMuted,
  },
  mealItemsCount: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.textMuted,
  },
  mealItemsList: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
    gap: 4,
  },
  mealItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  mealItemName: {
    fontSize: 13,
    color: theme.colors.textPrimary,
    flex: 1,
  },
  mealItemCals: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginLeft: 8,
  },
  mealDashedAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 42,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    marginTop: 10,
  },
  mealDashedAddText: {
    fontSize: 13,
    fontWeight: '700',
  },
  waterTrackerSection: {
    marginTop: 20,
    marginBottom: 16,
  },
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
    justifyContent: 'center',
    gap: 6,
    minWidth: 126,
    height: 32,
    paddingHorizontal: 10,
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
    minHeight: 38,
    justifyContent: 'center',
  },
  activityFooterText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textMuted,
    lineHeight: 16,
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
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
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
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    letterSpacing: -0.5,
    marginTop: 1,
  },
  heroSection: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 4,
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
  mealsSectionContainer: {
    marginTop: 14,
    marginBottom: 4,
  },
  supplementsSlimCard: {
    backgroundColor: theme.colors.diaryMealCardBg,
    borderColor: theme.colors.diaryMealCardBorder,
    borderWidth: 1,
    borderRadius: 20,
    padding: 14,
    marginTop: 12,
  },
  supplementsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  supplementsTitleLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  supplementsSquircle: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: theme.colors.diarySquircleBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  supplementsTextGroup: {
    flex: 1,
    gap: 1,
  },
  supplementsTitle: {
    fontFamily: theme.fonts.sans,
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.diaryHeadingText,
  },
  supplementsSubtitle: {
    fontFamily: theme.fonts.sans,
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.diarySubtleSlate,
  },
  rtlText: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  supplementsChipRow: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 12,
  },
  supplementChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: theme.colors.diaryLoggedRowBg,
    borderWidth: 1,
    borderColor: theme.colors.diaryLoggedRowBorder,
  },
  supplementChipTaken: {
    backgroundColor: theme.colors.diaryAddBtnBg,
    borderColor: theme.colors.diaryAddBtnBorder,
  },
  supplementCheckCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: theme.colors.diarySubtleSlate,
    alignItems: 'center',
    justifyContent: 'center',
  },
  supplementCheckCircleTaken: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  supplementChipLabel: {
    fontFamily: theme.fonts.sans,
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.diaryHeadingText,
    maxWidth: 140,
  },
  supplementChipLabelTaken: {
    color: theme.colors.primary,
  },
  floatingAddFab: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.colors.primary,
    borderWidth: 1.5,
    borderColor: theme.colors.primaryBorder,
    ...theme.shadow.floating,
    zIndex: 99,
    elevation: 8,
  },
});
