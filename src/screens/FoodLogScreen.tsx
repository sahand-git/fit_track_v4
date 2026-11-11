import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
  BackHandler,
  PanResponder,
  NativeSyntheticEvent,
  NativeScrollEvent,
  LayoutChangeEvent,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  Plus,
  CalendarDays,
  Coffee,
  Utensils,
  Moon,
  Apple,
  ChevronDown,
  LayoutGrid,
  Search,
  Sparkles,
  Barcode as BarcodeIcon,
  RotateCcw,
} from 'lucide-react-native';
import { DailyLog, LoggedMeal, MealType, UserProfile, FoodItem } from '../types';
import { useAppDialog } from '../components/dialogs/AppDialogProvider';
import { AppText as Text } from '../components/AppText';
import { FoodDetailsModal } from '../components/FoodDetailsModal';
import { CalendarPickerModal } from '../components/CalendarPickerModal';
import { AddFoodSheet } from '../components/addfood/AddFoodSheet';
import { AnimatedFoodRow } from '../components/AnimatedFoodRow';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { FoodLogSwipeableRow } from '../components/FoodLogSwipeableRow';
import { MealQuickLogCarousel } from '../components/MealQuickLogCarousel';
import { DirectionalIcon } from '../components/DirectionalIcon';
import { MealsSkeleton } from '../components/SkeletonLoader';
import { VERIFIED_FOOD_DATABASE } from '../data/foodDatabase';
import {
  addDaysToDateString,
  formatDisplayDate,
  getTodayDateString,
} from '../utils/dateUtils';
import { useLanguage } from '../i18n/I18nContext';
import { translate } from '../i18n/strings';
import { useTheme } from '../theme/ThemeContext';
import { ThemeType } from '../theme';
import { useIsRTL } from '../hooks/useIsRTL';
import { formatKcal } from '../utils/formatKcal';
import { createUniqueId } from '../utils/idUtils';
import { buildLoggedMealFromFood } from '../utils/mealNutrients';
import { getLocalizedFoodName } from '../utils/foodLocalization';
import { getTimingConfig } from '../utils/reanimatedMotion';
import { isReducedMotion } from '../utils/motion';
import {
  addRecentFood,
  loadFavoriteFoods,
  loadRecentFoods,
} from '../storage/storage';
import {
  calculateDiaryBudgetSummary,
  computeHeaderClearanceOffset,
  DiaryMealFilter,
  getMealAccentThemeKey,
  getQuickLogFoodsForMeal,
  groupMealsByType,
  resolveTargetMealForQuickAction,
} from '../utils/diaryCore';

interface FoodLogScreenProps {
  profile?: UserProfile;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  log: DailyLog;
  isLoading?: boolean;
  onAddMeal: (meal: LoggedMeal, targetDate: string) => void;
  onUpdateMeal?: (meal: LoggedMeal) => void;
  onRemoveMeal: (mealId: string) => void;
  initialMealType?: MealType;
  onCopyYesterdayMeals?: (targetDate: string) => Promise<void>;
}

interface AddSheetConfig {
  visible: boolean;
  mealType: MealType;
  initialTab: 'search' | 'photo';
  initialScanBarcode: boolean;
}

interface DiaryToastState {
  id: string;
  kind: 'added' | 'removed';
  meal: LoggedMeal;
  date: string;
  message: string;
}

const RotatingChevron: React.FC<{ expanded: boolean; color: string }> = React.memo(
  ({ expanded, color }) => {
    const progress = useSharedValue(expanded ? 1 : 0);

    useEffect(() => {
      progress.value = withTiming(
        expanded ? 1 : 0,
        getTimingConfig(isReducedMotion() ? 0 : 190),
      );
    }, [expanded, progress]);

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ rotate: `${progress.value * 180}deg` }],
    }));

    return (
      <Animated.View style={animatedStyle}>
        <ChevronDown size={16} color={color} strokeWidth={2.2} />
      </Animated.View>
    );
  },
);
RotatingChevron.displayName = 'RotatingChevron';

const renderMealGlyph = (mealType: DiaryMealFilter, size: number, color: string) => {
  switch (mealType) {
    case 'all':
      return <LayoutGrid size={size} color={color} strokeWidth={2.1} />;
    case 'breakfast':
      return <Coffee size={size} color={color} strokeWidth={2.1} />;
    case 'lunch':
      return <Utensils size={size} color={color} strokeWidth={2.1} />;
    case 'dinner':
      return <Moon size={size} color={color} strokeWidth={2.1} />;
    case 'snack':
      return <Apple size={size} color={color} strokeWidth={2.1} />;
  }
};

export const FoodLogScreen = React.memo<FoodLogScreenProps>(({
  profile,
  selectedDate,
  onSelectDate,
  log,
  isLoading,
  onAddMeal,
  onUpdateMeal,
  onRemoveMeal,
  initialMealType = 'breakfast',
  onCopyYesterdayMeals,
}) => {
  const language = useLanguage();
  const { theme } = useTheme();
  const dialog = useAppDialog();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const t = useCallback((value: string) => translate(language, value), [language]);
  const isRtl = useIsRTL();

  const [userAddedMealIds, setUserAddedMealIds] = useState<Set<string>>(() => new Set());
  const [collapsedOverrides, setCollapsedOverrides] = useState<Partial<Record<MealType, boolean>>>({});
  const [activeFilter, setActiveFilter] = useState<DiaryMealFilter>('all');
  const [stickyHeaderHeight, setStickyHeaderHeight] = useState<number>(172);
  const [favoriteFoods, setFavoriteFoods] = useState<FoodItem[]>([]);
  const [recentFoods, setRecentFoods] = useState<FoodItem[]>([]);
  const [inspectingMeal, setInspectingMeal] = useState<LoggedMeal | null>(null);
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [toast, setToast] = useState<DiaryToastState | null>(null);
  const [addSheetConfig, setAddSheetConfig] = useState<AddSheetConfig>({
    visible: false,
    mealType: initialMealType,
    initialTab: 'search',
    initialScanBarcode: false,
  });

  const scrollViewRef = useRef<ScrollView>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);
  const mealOffsets = useRef<Record<MealType, number>>({
    breakfast: 0,
    lunch: 0,
    dinner: 0,
    snack: 0,
  });

  useEffect(() => {
    isMountedRef.current = true;
    Promise.all([loadFavoriteFoods(), loadRecentFoods()])
      .then(([favs, recs]) => {
        if (!isMountedRef.current) return;
        setFavoriteFoods(favs);
        setRecentFoods(recs);
      })
      .catch(() => {});

    return () => {
      isMountedRef.current = false;
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setCollapsedOverrides({});
  }, [selectedDate]);

  const showToast = useCallback((nextToast: DiaryToastState) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToast(nextToast);
    toastTimerRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        setToast(null);
      }
    }, 3600);
  }, []);

  const dismissToast = useCallback(() => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    setToast(null);
  }, []);

  // Android hardware back handler for modals
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const onBackPress = () => {
      if (addSheetConfig.visible) {
        setAddSheetConfig((prev) => ({ ...prev, visible: false }));
        return true;
      }
      if (calendarVisible) {
        setCalendarVisible(false);
        return true;
      }
      if (inspectingMeal) {
        setInspectingMeal(null);
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [addSheetConfig.visible, calendarVisible, inspectingMeal]);

  const todayStr = getTodayDateString();
  const isPast = selectedDate < todayStr;
  const isFuture = selectedDate > todayStr;

  // Dock clearance ensures bottom meal cards clear BOTH the bottom nav and floating action dock
  const dockBottom =
    insets.bottom > 0 ? insets.bottom + 8 : Platform.OS === 'ios' ? 18 : 10;
  const dockClearance = dockBottom + 72;
  const floatingDockBottom = dockClearance + 2;
  const scrollBottomPadding = Math.max(180, dockClearance + 115);

  const selectedDateRef = useRef(selectedDate);
  const isRtlRef = useRef(isRtl);
  useEffect(() => {
    selectedDateRef.current = selectedDate;
    isRtlRef.current = isRtl;
  }, [isRtl, selectedDate]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onStartShouldSetPanResponderCapture: () => false,
        onMoveShouldSetPanResponder: (_, gs) =>
          Math.abs(gs.dx) > 36 && Math.abs(gs.dx) > Math.abs(gs.dy) * 1.9,
        onMoveShouldSetPanResponderCapture: () => false,
        onPanResponderRelease: (_, gs) => {
          if (Math.abs(gs.dx) <= 52) return;
          const movingForward = isRtlRef.current ? gs.dx > 0 : gs.dx < 0;
          if (movingForward) {
            if (selectedDateRef.current < getTodayDateString()) {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              onSelectDate(addDaysToDateString(selectedDateRef.current, 1));
            }
          } else {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            onSelectDate(addDaysToDateString(selectedDateRef.current, -1));
          }
        },
      }),
    [onSelectDate],
  );

  const handlePrevDay = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onSelectDate(addDaysToDateString(selectedDate, -1));
  }, [onSelectDate, selectedDate]);

  const handleNextDay = useCallback(() => {
    if (selectedDate >= getTodayDateString()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onSelectDate(addDaysToDateString(selectedDate, 1));
  }, [onSelectDate, selectedDate]);

  const handleBackToToday = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onSelectDate(getTodayDateString());
  }, [onSelectDate]);

  const handleAddMeal = useCallback(
    (meal: LoggedMeal, targetDate: string) => {
      setUserAddedMealIds((prev) => {
        const next = new Set(prev);
        next.add(meal.id);
        return next;
      });
      setCollapsedOverrides((prev) => ({
        ...prev,
        [meal.mealType]: true,
      }));
      onAddMeal(meal, targetDate);

      if (activeFilter === 'all') {
        const sectionY = mealOffsets.current[meal.mealType];
        if (sectionY !== undefined) {
          requestAnimationFrame(() => {
            scrollViewRef.current?.scrollTo({
              y: computeHeaderClearanceOffset(sectionY, stickyHeaderHeight, 10),
              animated: true,
            });
          });
        }
      }
    },
    [activeFilter, onAddMeal, stickyHeaderHeight],
  );

  const openAddSheet = useCallback(
    (
      mealType?: MealType,
      initialTab: 'search' | 'photo' = 'search',
      initialScanBarcode = false,
    ) => {
      if (isFuture) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      const targetMeal =
        mealType ?? resolveTargetMealForQuickAction(activeFilter);
      setAddSheetConfig({
        visible: true,
        mealType: targetMeal,
        initialTab,
        initialScanBarcode,
      });
    },
    [activeFilter, isFuture],
  );

  const toggleMealExpanded = useCallback((mealKey: MealType, currentExpanded: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setCollapsedOverrides((prev) => ({
      ...prev,
      [mealKey]: !currentExpanded,
    }));
  }, []);

  const handleSelectFilter = useCallback(
    (nextFilter: DiaryMealFilter) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      if (nextFilter !== 'all' && nextFilter === activeFilter) {
        setActiveFilter('all');
        requestAnimationFrame(() => {
          scrollViewRef.current?.scrollTo({ y: 0, animated: true });
        });
        return;
      }

      setActiveFilter(nextFilter);
      if (nextFilter !== 'all') {
        setCollapsedOverrides((prev) => ({
          ...prev,
          [nextFilter]: true,
        }));
      }
      requestAnimationFrame(() => {
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      });
    },
    [activeFilter],
  );

  const handleQuickLogFood = useCallback(
    (food: FoodItem, mealType: MealType) => {
      if (isFuture) return;
      const newMeal = buildLoggedMealFromFood({
        id: createUniqueId('meal'),
        food,
        mealType,
        servings: 1,
        servingSize: food.servingSize,
        servingGrams: food.servingGrams,
      });
      handleAddMeal(newMeal, selectedDate);
      addRecentFood(food)
        .then((updated) => {
          if (isMountedRef.current) setRecentFoods(updated);
        })
        .catch(() => {});
      showToast({
        id: newMeal.id,
        kind: 'added',
        meal: newMeal,
        date: selectedDate,
        message: `${t('Added')} ${getLocalizedFoodName(food, language)}`,
      });
    },
    [handleAddMeal, isFuture, language, selectedDate, showToast, t],
  );

  const handleDeleteMeal = useCallback(
    async (id: string, viaSwipe = false) => {
      const targetMeal = log.meals.find((m) => m.id === id);

      if (viaSwipe && targetMeal) {
        onRemoveMeal(id);
        showToast({
          id: targetMeal.id,
          kind: 'removed',
          meal: targetMeal,
          date: selectedDate,
          message: `${t('Removed')} ${getLocalizedFoodName(targetMeal, language)}`,
        });
        return;
      }

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      const confirmed = await dialog.confirm({
        title: t('Delete food item'),
        message: t('Are you sure you want to delete this item?'),
        confirmText: t('Delete'),
        cancelText: t('Cancel'),
        destructive: true,
      });
      if (confirmed) {
        onRemoveMeal(id);
      }
    },
    [dialog, language, log.meals, onRemoveMeal, selectedDate, showToast, t],
  );

  const handleUndoToast = useCallback(() => {
    if (!toast) return;
    Haptics.selectionAsync().catch(() => {});
    const pending = toast;
    dismissToast();
    if (pending.kind === 'added') {
      onRemoveMeal(pending.meal.id);
    } else {
      handleAddMeal(pending.meal, pending.date);
    }
  }, [dismissToast, handleAddMeal, onRemoveMeal, toast]);

  const handleUpdateInspectingServings = useCallback(
    (newServings: number) => {
      if (!inspectingMeal) return;
      const baseServings = inspectingMeal.servings > 0 ? inspectingMeal.servings : 1;
      const factor = newServings / baseServings;

      const scaleNutrient = (val: number | undefined): number | undefined => {
        if (val === undefined) return undefined;
        return Math.round(val * factor * 10) / 10;
      };

      const scaledSnapshot = inspectingMeal.nutrientsSnapshot
        ? Object.fromEntries(
            Object.entries(inspectingMeal.nutrientsSnapshot).map(([k, v]) => [
              k,
              typeof v === 'number' ? Math.round(v * factor * 10) / 10 : v,
            ]),
          )
        : undefined;

      const updatedMeal: LoggedMeal = {
        ...inspectingMeal,
        servings: newServings,
        calories: Math.round(inspectingMeal.calories * factor),
        protein: Math.round(inspectingMeal.protein * factor * 10) / 10,
        carbs: Math.round(inspectingMeal.carbs * factor * 10) / 10,
        fat: Math.round(inspectingMeal.fat * factor * 10) / 10,
        servingGrams: Math.round(inspectingMeal.servingGrams * factor),
        fiber: scaleNutrient(inspectingMeal.fiber),
        sugar: scaleNutrient(inspectingMeal.sugar),
        sodium: scaleNutrient(inspectingMeal.sodium),
        potassium: scaleNutrient(inspectingMeal.potassium),
        calcium: scaleNutrient(inspectingMeal.calcium),
        iron: scaleNutrient(inspectingMeal.iron),
        vitaminC: scaleNutrient(inspectingMeal.vitaminC),
        vitaminA: scaleNutrient(inspectingMeal.vitaminA),
        vitaminD: scaleNutrient(inspectingMeal.vitaminD),
        vitaminB12: scaleNutrient(inspectingMeal.vitaminB12),
        magnesium: scaleNutrient(inspectingMeal.magnesium),
        zinc: scaleNutrient(inspectingMeal.zinc),
        nutrientsSnapshot: scaledSnapshot,
      };

      if (onUpdateMeal) {
        onUpdateMeal(updatedMeal);
      } else {
        onRemoveMeal(inspectingMeal.id);
        onAddMeal(updatedMeal, selectedDate);
      }
      setInspectingMeal(null);
    },
    [inspectingMeal, onAddMeal, onRemoveMeal, onUpdateMeal, selectedDate],
  );

  const budgetSummary = useMemo(
    () => calculateDiaryBudgetSummary(profile, log),
    [log, profile],
  );

  const groupedMeals = useMemo(
    () => groupMealsByType(log.meals),
    [log.meals],
  );

  const quickLogByMeal = useMemo<Record<MealType, FoodItem[]>>(
    () => ({
      breakfast: getQuickLogFoodsForMeal('breakfast', {
        favorites: favoriteFoods,
        recent: recentFoods,
        catalog: VERIFIED_FOOD_DATABASE,
        limit: 10,
      }),
      lunch: getQuickLogFoodsForMeal('lunch', {
        favorites: favoriteFoods,
        recent: recentFoods,
        catalog: VERIFIED_FOOD_DATABASE,
        limit: 10,
      }),
      dinner: getQuickLogFoodsForMeal('dinner', {
        favorites: favoriteFoods,
        recent: recentFoods,
        catalog: VERIFIED_FOOD_DATABASE,
        limit: 10,
      }),
      snack: getQuickLogFoodsForMeal('snack', {
        favorites: favoriteFoods,
        recent: recentFoods,
        catalog: VERIFIED_FOOD_DATABASE,
        limit: 10,
      }),
    }),
    [favoriteFoods, recentFoods],
  );

  const mealMetaList = useMemo<{ key: MealType; label: string }[]>(
    () => [
      { key: 'breakfast', label: t('Breakfast') },
      { key: 'lunch', label: t('Lunch') },
      { key: 'dinner', label: t('Dinner') },
      { key: 'snack', label: t('Snacks') },
    ],
    [t],
  );

  const filterTabs = useMemo<
    { key: DiaryMealFilter; label: string; count: number }[]
  >(
    () => [
      { key: 'all', label: t('All'), count: budgetSummary.totalCount },
      ...mealMetaList.map((m) => ({
        key: m.key as DiaryMealFilter,
        label: m.label,
        count: budgetSummary.mealStats[m.key].count,
      })),
    ],
    [budgetSummary.mealStats, budgetSummary.totalCount, mealMetaList, t],
  );

  const visibleMeals = useMemo(
    () =>
      activeFilter === 'all'
        ? mealMetaList
        : mealMetaList.filter((m) => m.key === activeFilter),
    [activeFilter, mealMetaList],
  );

  const handleStickyHeaderLayout = useCallback((e: LayoutChangeEvent) => {
    const h = Math.round(e.nativeEvent.layout.height);
    if (h > 40) {
      setStickyHeaderHeight((prev) => (Math.abs(prev - h) > 2 ? h : prev));
    }
  }, []);

  const handleScroll = useCallback((_e: NativeSyntheticEvent<NativeScrollEvent>) => {
    // Reserved for smooth sticky header elevation/scroll tracking without setState churn
  }, []);

  if (isLoading) {
    return <MealsSkeleton />;
  }

  const gramUnit = t('g');
  const budgetProgressPct = `${Math.round(budgetSummary.progressRatio * 100)}%` as `${number}%`;
  const remainingOrOverValue = budgetSummary.isOverBudget
    ? budgetSummary.overCalories
    : budgetSummary.remainingCalories;

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      {/* Unified Blurred Glassmorphic Sticky Top Header */}
      <View style={styles.stickyHeader} onLayout={handleStickyHeaderLayout}>
        {/* Row 1: Date Navigation Bar */}
        <View style={[styles.dateRow, isRtl && styles.rowRtl]}>
          <AnimatedPressable
            style={styles.dateNavBtn}
            onPress={handlePrevDay}
            accessibilityLabel={t('Previous day')}
            accessibilityRole="button"
            minScale={0.9}
          >
            <DirectionalIcon
              name="ChevronLeft"
              size={20}
              color={theme.colors.textPrimary}
            />
          </AnimatedPressable>

          <View style={[styles.dateCenterGroup, isRtl && styles.rowRtl]}>
            <AnimatedPressable
              style={[styles.datePickPill, isRtl && styles.rowRtl]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                setCalendarVisible(true);
              }}
              accessibilityLabel={t('Choose date')}
              accessibilityRole="button"
              minScale={0.95}
            >
              <CalendarDays size={16} color={theme.colors.emeraldDark} />
              <Text style={styles.dateTitle} numberOfLines={1}>
                {formatDisplayDate(selectedDate, language)}
              </Text>
            </AnimatedPressable>

            {isPast && (
              <AnimatedPressable
                style={[styles.todayResetPill, isRtl && styles.rowRtl]}
                onPress={handleBackToToday}
                accessibilityRole="button"
                accessibilityLabel={t('Today')}
                minScale={0.93}
              >
                <RotateCcw size={12} color={theme.colors.emeraldDark} strokeWidth={2.5} />
                <Text style={styles.todayResetText} numberOfLines={1}>
                  {t('Today')}
                </Text>
              </AnimatedPressable>
            )}
          </View>

          <AnimatedPressable
            style={[
              styles.dateNavBtn,
              selectedDate >= todayStr && styles.disabledControl,
            ]}
            onPress={handleNextDay}
            disabled={selectedDate >= todayStr}
            accessibilityLabel={t('Next day')}
            accessibilityRole="button"
            minScale={0.9}
          >
            <DirectionalIcon
              name="ChevronRight"
              size={20}
              color={
                selectedDate >= todayStr
                  ? theme.colors.textMuted
                  : theme.colors.textPrimary
              }
            />
          </AnimatedPressable>
        </View>

        {/* Row 2: Mini Daily Budget Strip */}
        <View style={[styles.budgetStrip, isRtl && styles.rowRtl]}>
          <View style={styles.budgetLeftCol}>
            <View style={[styles.budgetTextRow, isRtl && styles.rowRtl]}>
              <Text style={styles.budgetKcalRatio} numberOfLines={1}>
                {budgetSummary.consumedCalories.toLocaleString()}
                <Text style={styles.budgetKcalTarget}>
                  {' '}
                  / {budgetSummary.targetCalories.toLocaleString()} {t('kcal')}
                </Text>
              </Text>
              <Text
                style={[
                  styles.budgetDeltaText,
                  budgetSummary.isOverBudget
                    ? styles.budgetOverText
                    : styles.budgetRemainText,
                ]}
                numberOfLines={1}
              >
                {remainingOrOverValue.toLocaleString()}{' '}
                {budgetSummary.isOverBudget ? t('Over') : t('Remaining')}
              </Text>
            </View>

            <View style={[styles.progressTrack, isRtl && styles.rowRtl]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: budgetProgressPct,
                    backgroundColor: budgetSummary.isOverBudget
                      ? theme.colors.calorieOverflowRed
                      : theme.colors.calorieBaseGreen,
                  },
                ]}
              />
            </View>
          </View>

          <View style={[styles.budgetMacroPills, isRtl && styles.rowRtl]}>
            <View style={[styles.miniMacroPill, styles.proteinPill]}>
              <Text style={[styles.miniMacroText, styles.proteinText]}>
                {t('P')} {budgetSummary.protein}
                {gramUnit}
              </Text>
            </View>
            <View style={[styles.miniMacroPill, styles.carbsPill]}>
              <Text style={[styles.miniMacroText, styles.carbsText]}>
                {t('C')} {budgetSummary.carbs}
                {gramUnit}
              </Text>
            </View>
            <View style={[styles.miniMacroPill, styles.fatPill]}>
              <Text style={[styles.miniMacroText, styles.fatText]}>
                {t('F')} {budgetSummary.fat}
                {gramUnit}
              </Text>
            </View>
          </View>
        </View>

        {/* Row 3: Smart Meal Filter Segmented Bar (zero truncation) */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[
            styles.filterBarContent,
            isRtl && styles.rowRtl,
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {filterTabs.map((tab) => {
            const isActive = activeFilter === tab.key;
            const iconColor = isActive
              ? theme.colors.calendarSelectedText
              : theme.colors.textSecondary;

            return (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.filterPill,
                  isActive && styles.filterPillActive,
                  isRtl && styles.rowRtl,
                ]}
                onPress={() => handleSelectFilter(tab.key)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={`${tab.label}${tab.count > 0 ? `, ${tab.count}` : ''}`}
              >
                {renderMealGlyph(tab.key, 14, iconColor)}
                <Text
                  style={[
                    styles.filterPillLabel,
                    isActive && styles.filterPillLabelActive,
                  ]}
                >
                  {tab.label}
                </Text>
                {tab.count > 0 && (
                  <View
                    style={[
                      styles.filterCountBadge,
                      isActive && styles.filterCountBadgeActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterCountText,
                        isActive && styles.filterCountTextActive,
                      ]}
                    >
                      {tab.count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Main Meal Sections Scroll Area */}
      <ScrollView
        ref={scrollViewRef}
        onScroll={handleScroll}
        scrollEventThrottle={32}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: stickyHeaderHeight + 10,
            paddingBottom: scrollBottomPadding,
          },
        ]}
      >
        {visibleMeals.map((cat) => {
          const categoryMeals = groupedMeals[cat.key];
          const mealStats = budgetSummary.mealStats[cat.key];
          const hasItems = categoryMeals.length > 0;
          const isExpanded =
            activeFilter === cat.key
              ? true
              : (collapsedOverrides[cat.key] ?? true);
          const { accentKey, tintKey } = getMealAccentThemeKey(cat.key);
          const accentColor = theme.colors[accentKey];
          const tintColor = theme.colors[tintKey];

          return (
            <View
              key={cat.key}
              onLayout={(e) => {
                if (activeFilter === 'all') {
                  mealOffsets.current[cat.key] = e.nativeEvent.layout.y;
                }
              }}
              style={styles.mealCard}
            >
              {/* Section Header */}
              <View style={[styles.mealHeaderRow, isRtl && styles.rowRtl]}>
                <TouchableOpacity
                  style={[styles.mealHeaderMain, isRtl && styles.rowRtl]}
                  onPress={() => toggleMealExpanded(cat.key, isExpanded)}
                  activeOpacity={0.78}
                  accessibilityRole="button"
                  accessibilityLabel={`${cat.label}, ${isExpanded ? t('Collapse') : t('Expand')}`}
                >
                  {/* Internal subtle left/start accent indicator */}
                  <View
                    style={[
                      styles.internalAccentBar,
                      { backgroundColor: accentColor },
                    ]}
                  />

                  <View
                    style={[
                      styles.mealIconSquircle,
                      { backgroundColor: tintColor },
                    ]}
                  >
                    {renderMealGlyph(cat.key, 17, accentColor)}
                  </View>

                  <View style={styles.mealTitleBlock}>
                    <Text
                      style={[styles.mealTitleText, isRtl && styles.rtlText]}
                      numberOfLines={1}
                    >
                      {cat.label}
                    </Text>
                    <Text
                      style={[styles.mealSubBadge, isRtl && styles.rtlText]}
                      numberOfLines={1}
                    >
                      {hasItems
                        ? `${formatKcal(mealStats.calories, t)} • ${mealStats.count} ${t(mealStats.count === 1 ? 'item' : 'items')}`
                        : formatKcal(0, t)}
                    </Text>
                  </View>
                </TouchableOpacity>

                <View style={[styles.mealHeaderActions, isRtl && styles.rowRtl]}>
                  {!isFuture && (
                    <AnimatedPressable
                      style={[styles.addMealPillBtn, isRtl && styles.rowRtl]}
                      onPress={() => openAddSheet(cat.key, 'search', false)}
                      hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                      accessibilityRole="button"
                      accessibilityLabel={`${t('Add food to')} ${cat.label}`}
                      minScale={0.94}
                    >
                      <Plus size={14} color={theme.colors.emeraldDark} strokeWidth={2.6} />
                      <Text style={styles.addMealPillText}>{t('Add')}</Text>
                    </AnimatedPressable>
                  )}

                  {activeFilter === 'all' && (
                    <TouchableOpacity
                      style={styles.chevronBtn}
                      onPress={() => toggleMealExpanded(cat.key, isExpanded)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      accessibilityRole="button"
                      accessibilityLabel={`${cat.label} ${isExpanded ? t('Collapse') : t('Expand')}`}
                    >
                      <RotatingChevron
                        expanded={isExpanded}
                        color={theme.colors.textSecondary}
                      />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Collapsible Section Body */}
              {isExpanded && (
                <View style={styles.mealCardBody}>
                  <View style={styles.sectionDivider} />

                  {/* Quick-Log Horizontal Pill Strip */}
                  {!isFuture && (
                    <View style={styles.quickLogWrap}>
                      <MealQuickLogCarousel
                        foods={quickLogByMeal[cat.key]}
                        onQuickLog={(food) => handleQuickLogFood(food, cat.key)}
                        disabled={isFuture}
                        language={language}
                        isRtl={isRtl}
                      />
                    </View>
                  )}

                  {/* Compact Smart Empty State OR Logged Food Cards */}
                  {hasItems ? (
                    <View style={styles.foodListStack}>
                      {categoryMeals.map((item, idx) => (
                        <AnimatedFoodRow
                          key={item.id}
                          isNew={userAddedMealIds.has(item.id)}
                          index={idx}
                        >
                          <FoodLogSwipeableRow
                            item={item}
                            language={language}
                            isRtl={isRtl}
                            disabled={isFuture}
                            onPress={setInspectingMeal}
                            onDelete={handleDeleteMeal}
                          />
                        </AnimatedFoodRow>
                      ))}
                    </View>
                  ) : (
                    <Text style={[styles.compactEmptyPrompt, isRtl && styles.rtlText]}>
                      {isFuture ? t('No items yet') : t('Tap to quick log or add above')}
                    </Text>
                  )}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Inline Undo Toast for Quick Log & Swipe Delete */}
      {toast && (
        <Animated.View
          entering={isReducedMotion() ? undefined : FadeIn.duration(180)}
          exiting={isReducedMotion() ? undefined : FadeOut.duration(150)}
          style={[
            styles.toastWrapper,
            { bottom: floatingDockBottom + 56 },
            isRtl && styles.rowRtl,
          ]}
        >
          <Text style={[styles.toastText, isRtl && styles.rtlText]} numberOfLines={1}>
            {toast.message}
          </Text>
          <TouchableOpacity
            onPress={handleUndoToast}
            style={styles.toastUndoBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={t('Undo')}
          >
            <Text style={styles.toastUndoText}>{t('Undo')}</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Floating Bottom Quick-Action Pill Bar (clears nav dock) */}
      {!isFuture && (
        <View
          style={[
            styles.floatingDockOuter,
            { bottom: floatingDockBottom },
          ]}
          pointerEvents="box-none"
        >
          <View style={[styles.floatingDockPill, isRtl && styles.rowRtl]}>
            <AnimatedPressable
              style={[styles.dockActionBtn, isRtl && styles.rowRtl]}
              onPress={() => openAddSheet(undefined, 'search', false)}
              accessibilityRole="button"
              accessibilityLabel={t('Search')}
              minScale={0.94}
            >
              <Search size={15} color={theme.colors.emeraldDark} strokeWidth={2.3} />
              <Text style={styles.dockActionLabel} numberOfLines={1}>
                {t('Search')}
              </Text>
            </AnimatedPressable>

            <View style={styles.dockSeparator} />

            <AnimatedPressable
              style={[styles.dockActionBtn, isRtl && styles.rowRtl]}
              onPress={() => openAddSheet(undefined, 'photo', false)}
              accessibilityRole="button"
              accessibilityLabel={t('AI Plate')}
              minScale={0.94}
            >
              <Sparkles size={15} color={theme.colors.amberText} strokeWidth={2.3} />
              <Text style={styles.dockActionLabel} numberOfLines={1}>
                {t('AI Plate')}
              </Text>
            </AnimatedPressable>

            <View style={styles.dockSeparator} />

            <AnimatedPressable
              style={[styles.dockActionBtn, isRtl && styles.rowRtl]}
              onPress={() => openAddSheet(undefined, 'search', true)}
              accessibilityRole="button"
              accessibilityLabel={t('Barcode')}
              minScale={0.94}
            >
              <BarcodeIcon size={15} color={theme.colors.stepsAccent} strokeWidth={2.3} />
              <Text style={styles.dockActionLabel} numberOfLines={1}>
                {t('Barcode')}
              </Text>
            </AnimatedPressable>
          </View>
        </View>
      )}

      {/* Calendar Picker Modal */}
      <CalendarPickerModal
        visible={calendarVisible}
        selectedDate={selectedDate}
        onClose={() => setCalendarVisible(false)}
        onSelect={onSelectDate}
      />

      {/* Unified Add Food Sheet */}
      <AddFoodSheet
        visible={addSheetConfig.visible}
        mealType={addSheetConfig.mealType}
        initialTab={addSheetConfig.initialTab}
        initialScanBarcode={addSheetConfig.initialScanBarcode}
        date={selectedDate}
        onClose={() => setAddSheetConfig((prev) => ({ ...prev, visible: false }))}
        onAddMeal={handleAddMeal}
        onRemoveMeal={onRemoveMeal}
        onCopyYesterdayMeals={onCopyYesterdayMeals}
      />

      {/* Food Details & Serving Adjustment Modal */}
      <FoodDetailsModal
        visible={inspectingMeal !== null}
        item={inspectingMeal}
        isLogged={true}
        onClose={() => setInspectingMeal(null)}
        onSave={handleUpdateInspectingServings}
        onDelete={() => {
          if (inspectingMeal) {
            handleDeleteMeal(inspectingMeal.id, false);
            setInspectingMeal(null);
          }
        }}
      />
    </View>
  );
});

FoodLogScreen.displayName = 'FoodLogScreen';

const createStyles = (theme: ThemeType) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    rowRtl: {
      flexDirection: 'row-reverse',
    },
    rtlText: {
      textAlign: 'right',
      writingDirection: 'rtl',
    },
    stickyHeader: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 20,
      backgroundColor: theme.colors.diaryStickyHeaderBg,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.diaryStickyHeaderBorder,
      paddingTop: 8,
      paddingBottom: 10,
      gap: 9,
      ...Platform.select({
        web: {
          backdropFilter: 'blur(16px)',
        },
        default: {
          elevation: 4,
        },
      }),
    },
    dateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      gap: 8,
    },
    dateNavBtn: {
      width: 36,
      height: 36,
      borderRadius: 12,
      backgroundColor: theme.colors.glassControlBg,
      borderWidth: 1,
      borderColor: theme.colors.glassControlBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    disabledControl: {
      opacity: 0.38,
    },
    dateCenterGroup: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    datePickPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: theme.colors.glassSubCardBg,
      borderWidth: 1,
      borderColor: theme.colors.glassSubCardBorder,
      maxWidth: '78%',
    },
    dateTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.colors.textPrimary,
      flexShrink: 1,
    },
    todayResetPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 9,
      paddingVertical: 5,
      borderRadius: 999,
      backgroundColor: theme.colors.emeraldLight,
      borderWidth: 1,
      borderColor: theme.colors.emeraldBorder,
    },
    todayResetText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.emeraldDark,
    },
    budgetStrip: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginHorizontal: 14,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 14,
      backgroundColor: theme.colors.glassSubCardBg,
      borderWidth: 1,
      borderColor: theme.colors.glassSubCardBorder,
      gap: 10,
    },
    budgetLeftCol: {
      flex: 1,
      minWidth: 150,
      gap: 5,
    },
    budgetTextRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      gap: 6,
    },
    budgetKcalRatio: {
      fontSize: 13,
      fontWeight: '800',
      color: theme.colors.textPrimary,
      fontVariant: ['tabular-nums'],
    },
    budgetKcalTarget: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.textSecondary,
    },
    budgetDeltaText: {
      fontSize: 12,
      fontWeight: '700',
      fontVariant: ['tabular-nums'],
    },
    budgetRemainText: {
      color: theme.colors.emeraldDark,
    },
    budgetOverText: {
      color: theme.colors.calorieOverflowRed,
    },
    progressTrack: {
      height: 5,
      borderRadius: 3,
      backgroundColor: theme.colors.glassControlBg,
      overflow: 'hidden',
      flexDirection: 'row',
    },
    progressFill: {
      height: '100%',
      borderRadius: 3,
    },
    budgetMacroPills: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      flexShrink: 0,
    },
    miniMacroPill: {
      paddingHorizontal: 6,
      paddingVertical: 3,
      borderRadius: 7,
      borderWidth: 1,
    },
    miniMacroText: {
      fontSize: 12,
      fontWeight: '700',
      fontVariant: ['tabular-nums'],
    },
    proteinPill: {
      backgroundColor: theme.colors.macroPillProteinBg,
      borderColor: theme.colors.macroPillProteinBorder,
    },
    proteinText: {
      color: theme.colors.macroPillProteinText,
    },
    carbsPill: {
      backgroundColor: theme.colors.macroPillCarbsBg,
      borderColor: theme.colors.macroPillCarbsBorder,
    },
    carbsText: {
      color: theme.colors.macroPillCarbsText,
    },
    fatPill: {
      backgroundColor: theme.colors.macroPillFatBg,
      borderColor: theme.colors.macroPillFatBorder,
    },
    fatText: {
      color: theme.colors.macroPillFatText,
    },
    filterBarContent: {
      paddingHorizontal: 14,
      gap: 7,
      alignItems: 'center',
    },
    filterPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 11,
      paddingVertical: 7,
      borderRadius: 999,
      backgroundColor: theme.colors.glassSubCardBg,
      borderWidth: 1,
      borderColor: theme.colors.glassSubCardBorder,
    },
    filterPillActive: {
      backgroundColor: theme.colors.calendarSelectedStart,
      borderColor: theme.colors.calendarSelectedEnd,
    },
    filterPillLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.textSecondary,
    },
    filterPillLabelActive: {
      color: theme.colors.calendarSelectedText,
      fontWeight: '700',
    },
    filterCountBadge: {
      minWidth: 20,
      height: 20,
      borderRadius: 10,
      paddingHorizontal: 5,
      backgroundColor: theme.colors.glassControlBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    filterCountBadgeActive: {
      backgroundColor: theme.colors.overlayGlass,
    },
    filterCountText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.textPrimary,
      fontVariant: ['tabular-nums'],
    },
    filterCountTextActive: {
      color: theme.colors.calendarSelectedText,
    },
    scrollContent: {
      paddingHorizontal: 14,
      gap: 14,
    },
    mealCard: {
      backgroundColor: theme.colors.diaryMealCardBg,
      borderColor: theme.colors.diaryMealCardBorder,
      borderWidth: 1,
      borderRadius: 20,
      overflow: 'hidden',
    },
    mealHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 12,
      paddingVertical: 12,
      gap: 8,
    },
    mealHeaderMain: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      minWidth: 0,
    },
    internalAccentBar: {
      width: 3.5,
      height: 28,
      borderRadius: 2,
      flexShrink: 0,
    },
    mealIconSquircle: {
      width: 38,
      height: 38,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.glassSubCardBorder,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    mealTitleBlock: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    mealTitleText: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.textPrimary,
    },
    mealSubBadge: {
      fontSize: 12.5,
      fontWeight: '600',
      color: theme.colors.textSecondary,
      fontVariant: ['tabular-nums'],
    },
    mealHeaderActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flexShrink: 0,
    },
    addMealPillBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: theme.colors.emeraldLight,
      borderWidth: 1,
      borderColor: theme.colors.emeraldBorder,
    },
    addMealPillText: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.emeraldDark,
    },
    chevronBtn: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: theme.colors.glassControlBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    mealCardBody: {
      paddingBottom: 12,
    },
    sectionDivider: {
      height: 1,
      backgroundColor: theme.colors.diaryLoggedRowBorder,
      marginHorizontal: 14,
      marginBottom: 8,
    },
    quickLogWrap: {
      marginBottom: 8,
    },
    foodListStack: {
      paddingHorizontal: 10,
      gap: 8,
    },
    compactEmptyPrompt: {
      fontSize: 12,
      fontWeight: '500',
      color: theme.colors.textMuted,
      paddingHorizontal: 16,
      paddingTop: 2,
    },
    toastWrapper: {
      position: 'absolute',
      alignSelf: 'center',
      zIndex: 30,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      maxWidth: '90%',
      backgroundColor: theme.colors.diaryActionDockBg,
      borderColor: theme.colors.emeraldBorder,
      borderWidth: 1,
      borderRadius: 999,
      paddingHorizontal: 16,
      paddingVertical: 10,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.22,
      shadowRadius: 12,
      elevation: 8,
    },
    toastText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.textPrimary,
      flexShrink: 1,
    },
    toastUndoBtn: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: theme.colors.emeraldLight,
    },
    toastUndoText: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.emeraldDark,
    },
    floatingDockOuter: {
      position: 'absolute',
      left: 0,
      right: 0,
      alignItems: 'center',
      zIndex: 25,
    },
    floatingDockPill: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.diaryActionDockBg,
      borderColor: theme.colors.diaryActionDockBorder,
      borderWidth: 1,
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 6,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 14,
      elevation: 8,
    },
    dockActionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 999,
    },
    dockActionLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.textPrimary,
    },
    dockSeparator: {
      width: 1,
      height: 18,
      backgroundColor: theme.colors.diaryLoggedRowBorder,
    },
  });
