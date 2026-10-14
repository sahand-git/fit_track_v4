import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText as Text } from '../components/AppText';
import {
  Plus,
  ChevronRight,
  Utensils,
  User,
  Pill,
  Flame,
  Dumbbell,
  Trash2,
  Footprints,
} from 'lucide-react-native';
import { AnimatedCheckbox } from '../components/AnimatedCheckbox';
import { UserProfile, DailyLog, MealType, SupplementRoutineItem, WorkoutEntry } from '../types';
import { CalorieRing } from '../components/CalorieRing';
import { MacroCards } from '../components/MacroCards';
import { WaterTracker } from '../components/WaterTracker';
import { AddWorkoutSheet } from '../components/AddWorkoutSheet';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { StreakBadge } from '../components/StreakBadge';
import { GoalCelebration } from '../components/GoalCelebration';
import { evaluateGoalAchievement } from '../utils/goalCelebration';
import Animated from 'react-native-reanimated';
import {
  getStaggeredCardEntry,
  getListLayoutTransition,
  getItemEnterAnimation,
  getItemExitAnimation,
} from '../utils/reanimatedMotion';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../theme';
import * as Haptics from 'expo-haptics';
import { useLanguage } from '../i18n/I18nContext';
import { translate } from '../i18n/strings';
import { getScopedStorageKey } from '../storage/storage';
import { formatDisplayDate, getTodayDateString } from '../utils/dateUtils';
import { getWorkoutDisplayMeta } from '../utils/workoutDisplay';
import { calculateActivityBudget } from '../utils/activityBudget';
import { getCalorieRingSize } from '../utils/dashboardLayout';

interface DashboardScreenProps {
  profile: UserProfile;
  log: DailyLog;
  supplementRoutine: SupplementRoutineItem[];
  streak?: number;
  onToggleSupplement: (id: string, taken: boolean) => void;
  onUpdateWater: (delta: number) => void;
  onNavigateToMeals: (targetMeal?: MealType) => void;
  onOpenAddFood: (mealType?: MealType) => void;
  onOpenSupplements: () => void;
  onOpenProfile: () => void;
  onOpenSteps: () => void;
  onOpenWorkouts: () => void;
  onAddWorkout: (workout: WorkoutEntry, date: string) => void;
  onDeleteWorkout: (workoutId: string) => void;
  onUpdateWorkout?: (workout: WorkoutEntry, date: string) => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  profile,
  log,
  supplementRoutine,
  streak = 0,
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
}) => {
  const language = useLanguage();
  const insets = useSafeAreaInsets();
  const t = useCallback((str: string) => translate(language, str), [language]);

  const [workoutSheetVisible, setWorkoutSheetVisible] = useState(false);
  const [heroWidth, setHeroWidth] = useState(0);

  const dockBottom = insets.bottom > 0 ? insets.bottom + 8 : (Platform.OS === 'ios' ? 18 : 10);
  const dockClearance = dockBottom + 72;

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

  const [showCelebration, setShowCelebration] = useState(false);
  const celebratingDateRef = useRef<string | null>(null);
  const lastCelebratedDateRef = useRef<string | null>(null);

  // Trigger celebration once per day when target is reached appropriately
  useEffect(() => {
    async function checkGoalCelebration() {
      const isGoalMet = evaluateGoalAchievement({
        goal: profile.goal,
        consumedCalories,
        consumedProtein,
        effectiveCalorieTarget,
        targetProtein: profile.targetProtein,
      });

      if (!isGoalMet) return;

      const currentDate = log.date;
      // In-memory synchronization lock prevents overlapping/duplicate runs for the same date
      if (lastCelebratedDateRef.current === currentDate || celebratingDateRef.current === currentDate) {
        return;
      }
      celebratingDateRef.current = currentDate;

      try {
        const celebrationKey = getScopedStorageKey('@fittrack_last_celebrated_goal_date');
        const lastCelebrated = await AsyncStorage.getItem(celebrationKey);
        if (lastCelebrated !== currentDate) {
          lastCelebratedDateRef.current = currentDate;
          setShowCelebration(true);
          await AsyncStorage.setItem(celebrationKey, currentDate);
        } else {
          lastCelebratedDateRef.current = currentDate;
        }
      } catch {
        // Graceful fallback
      } finally {
        celebratingDateRef.current = null;
      }
    }
    checkGoalCelebration();
  }, [consumedCalories, consumedProtein, effectiveCalorieTarget, profile.goal, profile.targetProtein, log.date]);

  const handleQuickAdd = (meal: MealType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onOpenAddFood(meal);
  };

  const handleOpenFloatingAddFood = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onOpenAddFood();
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Editorial Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.dateLabel}>{todayLabel}</Text>
            <View style={styles.titleRow}>
              <Text style={styles.screenTitle}>{t('Today')}</Text>
              <StreakBadge streak={streak} />
            </View>
          </View>

          <TouchableOpacity
            style={styles.profileBtn}
            onPress={onOpenProfile}
            activeOpacity={0.8}
            accessibilityLabel={t('Profile & Goals')}
            accessibilityRole="button"
          >
            <User size={18} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        </View>

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
            proteinTarget={profile.targetProtein}
            size={getCalorieRingSize(heroWidth)}
          />

          {burnedCalories > 0 && (
            <View style={styles.burnBanner}>
              <Flame size={14} color={theme.colors.warning} />
              <Text style={styles.burnBannerText}>
                {burnedCalories} {t('kcal burned in active workouts')}
                {profile.includeWorkoutsInCalorieBudget
                  ? ` · ${t('Net activity added')}: ${activityBudget.eligibleActivityCalories} ${t('kcal')}`
                  : ` · ${t('tracked as burn, not in food budget')}`}
              </Text>
            </View>
          )}
        </Animated.View>

        {/* Nutrients Bar */}
        <Animated.View entering={getStaggeredCardEntry(1)}>
          <MacroCards
            calorieTarget={effectiveCalorieTarget}
            calorieConsumed={consumedCalories}
            proteinTarget={profile.targetProtein}
            proteinConsumed={consumedProtein}
            carbsTarget={profile.targetCarbs}
            carbsConsumed={consumedCarbs}
            fatTarget={profile.targetFat}
            fatConsumed={consumedFat}
          />
        </Animated.View>

        {/* Hydration Row */}
        <Animated.View entering={getStaggeredCardEntry(2)}>
          <WaterTracker
            glasses={log.waterGlasses}
            target={profile.waterTargetGlasses}
            onUpdate={onUpdateWater}
          />
        </Animated.View>

        <Animated.View entering={getStaggeredCardEntry(3)}>
          <TouchableOpacity style={styles.stepsCard} onPress={onOpenSteps} activeOpacity={0.75} accessibilityRole="button" accessibilityLabel={t('Steps')}>
            <View style={styles.stepsIcon}><Footprints size={19} color={theme.colors.primary} /></View>
            <View style={styles.stepsInfo}>
              <View style={styles.stepsTitleRow}><Text style={styles.stepsTitle}>{t('Steps')}</Text><Text style={styles.stepsCount}>{(log.steps || 0).toLocaleString()} / {(profile.stepGoal || 8000).toLocaleString()}</Text></View>
              <View style={styles.stepsTrack}><View style={[styles.stepsFill, { width: `${Math.min(100, ((log.steps || 0) / (profile.stepGoal || 8000)) * 100)}%` }]} /></View>
              <Text style={styles.stepsHint}>{t('Tap to view activity details')}</Text>
            </View>
            <ChevronRight size={17} color={theme.colors.textMuted} />
          </TouchableOpacity>
        </Animated.View>

        {/* Vitamins & Supplements Section (Below Water Tracker) */}
        <Animated.View entering={getStaggeredCardEntry(4)} style={styles.supplementsContainer}>
          {activeSupplements.length === 0 ? (
            /* Slim row if routine/daily log is empty */
            <TouchableOpacity
              style={styles.slimRoutineRow}
              onPress={onOpenSupplements}
              activeOpacity={0.7}
              accessibilityRole="button"
            >
              <View style={styles.slimRoutineLeft}>
                <View style={styles.pillIconBox}>
                  <Pill size={15} color={theme.colors.primary} />
                </View>
                <Text style={styles.slimRoutineText}>{t('Track vitamins & supplements')}</Text>
              </View>
              <ChevronRight size={16} color={theme.colors.textMuted} />
            </TouchableOpacity>
          ) : (
            /* Checklists with small Manage link if items exist */
            <View style={styles.routineCard}>
              <View style={styles.routineHeader}>
                <View style={styles.routineTitleRow}>
                  <Pill size={16} color={theme.colors.primary} />
                  <Text style={styles.routineTitle}>{t('Vitamins & supplements')}</Text>
                  <Text style={styles.routineCount}>
                    {takenSupplementsCount}/{activeSupplements.length}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={onOpenSupplements}
                  style={styles.manageBtn}
                  accessibilityRole="button"
                >
                  <Text style={styles.manageBtnText}>{t('Manage')}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.routineItemsList}>
                {activeSupplements.map((item) => {
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.routineItemRow}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                        onToggleSupplement(item.id, !item.isTaken);
                      }}
                      disabled={isFuture}
                      activeOpacity={0.7}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: item.isTaken }}
                    >
                      <View style={styles.checkboxCircle}>
                        <AnimatedCheckbox checked={item.isTaken} size={19} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.routineItemName, item.isTaken && styles.routineItemNameTaken]}>
                          {item.name}
                        </Text>
                        {item.doseText ? (
                          <Text style={styles.routineItemDose}>{item.doseText}</Text>
                        ) : null}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
        </Animated.View>

        {/* Workouts Section */}
        <Animated.View entering={getStaggeredCardEntry(5)} style={styles.workoutContainer}>
          <View style={styles.workoutCard}>
            <View style={styles.workoutHeader}>
              <View style={styles.workoutHeaderTop}>
                <View style={styles.workoutTitleRow}>
                  <Dumbbell size={17} color={theme.colors.primary} />
                  <Text style={styles.workoutTitle}>{t('Workouts')}</Text>
                </View>
                <AnimatedPressable onPress={onOpenWorkouts} style={styles.manageBtn} accessibilityRole="button">
                  <Text style={styles.manageBtnText}>{t('History')}</Text>
                </AnimatedPressable>
              </View>
              {burnedCalories > 0 && (
                <Text style={styles.workoutBurnBadge}>
                  {burnedCalories} {t('kcal')}
                </Text>
              )}
              <AnimatedPressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                  setWorkoutSheetVisible(true);
                }}
                style={styles.addWorkoutBtn}
                disabled={isFuture}
                accessibilityRole="button"
                accessibilityLabel={t('Add workout')}
              >
                <Plus size={14} color={theme.colors.primary} />
                <Text style={styles.addWorkoutBtnText}>{t('Add workout')}</Text>
              </AnimatedPressable>
            </View>

            {(!log.workouts || log.workouts.length === 0) ? (
              <TouchableOpacity
                style={styles.emptyWorkoutRow}
                onPress={() => {
                  if (!isFuture) setWorkoutSheetVisible(true);
                }}
                disabled={isFuture}
                activeOpacity={0.7}
              >
                <Text style={styles.emptyWorkoutText}>
                  {isFuture
                    ? t('Workouts cannot be logged for future dates.')
                    : t('No workouts logged yet. Tap to log exercise.')}
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.workoutItemsList}>
                {log.workouts.map((w) => (
                  <Animated.View
                    key={w.id}
                    entering={getItemEnterAnimation()}
                    exiting={getItemExitAnimation()}
                    layout={getListLayoutTransition()}
                    style={styles.workoutItemRow}
                  >
                    <View style={styles.workoutItemInfo}>
                      <Text style={styles.workoutItemName} numberOfLines={2}>{t(w.name)}</Text>
                      <View style={styles.workoutItemMetaList}>
                        {Object.values(getWorkoutDisplayMeta(w, t)).map((label, index) => (
                          <Text key={`${w.id}_meta_${index}`} style={styles.workoutItemMeta}>{label}</Text>
                        ))}
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                        Alert.alert(
                          t('Delete workout'),
                          t('Are you sure you want to delete this workout?'),
                          [
                            { text: t('Cancel'), style: 'cancel' },
                            {
                              text: t('Delete'),
                              style: 'destructive',
                              onPress: () => onDeleteWorkout(w.id),
                            },
                          ]
                        );
                      }}
                      style={styles.deleteWorkoutBtn}
                      accessibilityLabel={t('Delete workout')}
                    >
                      <Trash2 size={16} color={theme.colors.textMuted} />
                    </TouchableOpacity>
                  </Animated.View>
                ))}
              </View>
            )}
          </View>
        </Animated.View>

        {/* Meals Ledger */}
        <Animated.View entering={getStaggeredCardEntry(6)}>
          <View style={styles.mealsHeader}>
            <Text style={styles.sectionHeading}>{t('Today’s Meals')}</Text>
            <TouchableOpacity
              onPress={() => onNavigateToMeals()}
              style={styles.seeAllBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.seeAllText}>{t('View diary')}</Text>
              <ChevronRight size={14} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Meals Ledger List */}
          <View style={styles.mealsList}>
            {mealTypes.map((m, index) => {
              const mealsOfCategory = log.meals.filter((item) => item.mealType === m.key);
              const cals = mealsOfCategory.reduce((sum, item) => sum + item.calories, 0);
              const isLast = index === mealTypes.length - 1;

              return (
                <TouchableOpacity
                  key={m.key}
                  style={[styles.mealRow, isLast && styles.mealRowLast]}
                  onPress={() => handleQuickAdd(m.key)}
                  activeOpacity={0.7}
                  accessibilityLabel={`${t('Add to')} ${m.label}`}
                  accessibilityRole="button"
                >
                  <View style={styles.mealLeft}>
                    <View style={styles.mealIconBox}>
                      <Utensils size={14} color={theme.colors.secondary} />
                    </View>
                    <View>
                      <Text style={styles.mealName}>{m.label}</Text>
                      <Text style={styles.mealSub}>
                        {mealsOfCategory.length > 0
                          ? `${mealsOfCategory.length} ${t(mealsOfCategory.length > 1 ? 'items' : 'item')}`
                          : t('Tap to log food')}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.mealRight}>
                    {cals > 0 && <Text style={styles.mealCals}>{cals} kcal</Text>}
                    <View style={styles.plusIconCircle}>
                      <Plus size={14} color={theme.colors.primary} />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>
      </ScrollView>

      {/* Reserved action area keeps Add Food clear of the dashboard cards. */}
      {!isFuture && (
        <View style={[styles.addFoodFooter, { paddingBottom: dockClearance, alignItems: language === 'en' ? 'flex-end' : 'flex-start' }]}>
          <TouchableOpacity
            style={styles.floatingAddBtn}
            onPress={handleOpenFloatingAddFood}
            activeOpacity={0.88}
            accessibilityLabel={t('Add food')}
            accessibilityRole="button"
          >
            <Plus size={18} color={theme.colors.textInverted} strokeWidth={2.4} />
            <Text style={styles.floatingAddBtnText}>{t('Add food')}</Text>
          </TouchableOpacity>
        </View>
      )}

      <AddWorkoutSheet
        visible={workoutSheetVisible}
        onClose={() => setWorkoutSheetVisible(false)}
        date={log.date}
        profile={profile}
        onSaveWorkout={onAddWorkout}
        onUpdateWorkout={onUpdateWorkout}
      />

      <GoalCelebration
        visible={showCelebration}
        onDismiss={() => setShowCelebration(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  stepsCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14,
    marginTop: 12, backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg,
    borderWidth: 1, borderColor: theme.colors.border, ...theme.shadow.subtle,
  },
  stepsIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primaryLight },
  stepsInfo: { flex: 1, gap: 6 },
  stepsTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  stepsTitle: { color: theme.colors.textPrimary, fontWeight: '700', fontSize: 15 },
  stepsCount: { color: theme.colors.textSecondary, fontSize: 13, fontWeight: '600' },
  stepsTrack: { height: 6, overflow: 'hidden', borderRadius: 4, backgroundColor: theme.colors.surfaceSubtle },
  stepsFill: { height: '100%', backgroundColor: theme.colors.secondary, borderRadius: 4 },
  stepsHint: { color: theme.colors.textMuted, fontSize: 11 },
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
    backgroundColor: '#FDF2EE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: '#F5C6B9',
  },
  streakText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D95338',
  },
  burnBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.warningLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radius.full,
    marginTop: 12,
  },
  burnBannerText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.warning,
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
    padding: 14,
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
    minHeight: 42,
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
    paddingVertical: 8,
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
  },
  workoutItemMetaList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  deleteWorkoutBtn: {
    minWidth: 40,
    minHeight: 40,
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
    color: theme.colors.secondary,
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
    padding: 14,
    gap: 10,
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
    marginLeft: 4,
  },
  manageBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surfaceSubtle,
  },
  manageBtnText: {
    fontSize: 11,
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
    fontSize: 11,
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
    paddingVertical: 14,
    paddingHorizontal: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  mealRowLast: {
    borderBottomWidth: 0,
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
  mealName: {
    fontFamily: theme.fonts.sans,
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  mealSub: {
    fontFamily: theme.fonts.sans,
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
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
  plusIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: theme.radius.full,
    ...theme.shadow.floating,
  },
  addFoodFooter: {
    paddingHorizontal: 18,
    paddingTop: 8,
    backgroundColor: theme.colors.background,
  },
  floatingAddBtnText: {
    fontFamily: theme.fonts.sans,
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textInverted,
  },
});
