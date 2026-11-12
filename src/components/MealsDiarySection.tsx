import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import {
  Plus,
  Coffee,
  Utensils,
  Moon,
  Apple,
  ChevronDown,
  Search,
  Sparkles,
  Barcode as BarcodeIcon,
} from 'lucide-react-native';
import { DailyLog, LoggedMeal, MealType, UserProfile, FoodItem } from '../types';
import { useAppDialog } from './dialogs/AppDialogProvider';
import { AppText as Text } from './AppText';
import { FoodDetailsModal } from './FoodDetailsModal';
import { AnimatedFoodRow } from './AnimatedFoodRow';
import { AnimatedPressable } from './AnimatedPressable';
import { FoodLogSwipeableRow } from './FoodLogSwipeableRow';
import { MealQuickLogCarousel } from './MealQuickLogCarousel';
import { VERIFIED_FOOD_DATABASE } from '../data/foodDatabase';
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
  DIARY_MEAL_ORDER,
  DiaryMealFilter,
  getQuickLogFoodsForMeal,
  groupMealsByType,
  resolveTargetMealForQuickAction,
} from '../utils/diaryCore';

export interface DiaryToastState {
  id: string;
  meal: LoggedMeal;
  message: string;
}

export const RotatingChevron: React.FC<{ expanded: boolean; color: string }> = React.memo(
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
        <ChevronDown size={16} color={color} strokeWidth={2.1} />
      </Animated.View>
    );
  },
);
RotatingChevron.displayName = 'RotatingChevron';

export const renderMealGlyph = (mealType: DiaryMealFilter, size: number, color: string) => {
  switch (mealType) {
    case 'breakfast':
      return <Coffee size={size} color={color} strokeWidth={1.9} />;
    case 'lunch':
      return <Utensils size={size} color={color} strokeWidth={1.9} />;
    case 'dinner':
      return <Moon size={size} color={color} strokeWidth={1.9} />;
    case 'snack':
      return <Apple size={size} color={color} strokeWidth={1.9} />;
    default:
      return <Utensils size={size} color={color} strokeWidth={1.9} />;
  }
};

export interface MealsDiarySectionProps {
  profile?: UserProfile;
  log: DailyLog;
  selectedDate: string;
  isFuture?: boolean;
  activeFilter?: DiaryMealFilter;
  showSectionHeading?: boolean;
  sectionTitle?: string;
  showQuickActionBar?: boolean;
  toastMode?: 'inline' | 'external';
  onToastChange?: (toast: DiaryToastState | null, undo: () => void) => void;
  onMealOffset?: (meal: MealType, y: number) => void;
  onOpenAddFood: (
    mealType?: MealType,
    initialTab?: 'search' | 'photo' | 'describe',
    initialScanBarcode?: boolean,
  ) => void;
  onAddMeal: (meal: LoggedMeal, targetDate: string) => void;
  onUpdateMeal?: (meal: LoggedMeal) => void;
  onRemoveMeal: (mealId: string) => void;
  initialExpandedFilter?: MealType | null;
}

export const MealsDiarySection: React.FC<MealsDiarySectionProps> = React.memo(({
  profile,
  log,
  selectedDate,
  isFuture = false,
  activeFilter = 'all',
  showSectionHeading = true,
  sectionTitle,
  showQuickActionBar = true,
  toastMode = 'inline',
  onToastChange,
  onMealOffset,
  onOpenAddFood,
  onAddMeal,
  onUpdateMeal,
  onRemoveMeal,
}) => {
  const language = useLanguage();
  const { theme } = useTheme();
  const dialog = useAppDialog();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const t = useCallback((value: string) => translate(language, value), [language]);
  const isRtl = useIsRTL();

  const [userAddedMealIds, setUserAddedMealIds] = useState<Set<string>>(() => new Set());
  const [collapsedOverrides, setCollapsedOverrides] = useState<Partial<Record<MealType, boolean>>>({});
  const [favoriteFoods, setFavoriteFoods] = useState<FoodItem[]>([]);
  const [recentFoods, setRecentFoods] = useState<FoodItem[]>([]);
  const [inspectingMeal, setInspectingMeal] = useState<LoggedMeal | null>(null);
  const [toast, setToast] = useState<DiaryToastState | null>(null);

  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

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
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const dismissToast = useCallback(() => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    setToast(null);
  }, []);

  const showToast = useCallback((next: DiaryToastState) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToast(next);
    toastTimerRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        setToast(null);
      }
    }, 3400);
  }, []);

  const handleUndoToast = useCallback(() => {
    if (!toast) return;
    Haptics.selectionAsync().catch(() => {});
    const pending = toast;
    dismissToast();
    onRemoveMeal(pending.meal.id);
  }, [dismissToast, onRemoveMeal, toast]);

  useEffect(() => {
    if (onToastChange) {
      onToastChange(toast, handleUndoToast);
    }
  }, [handleUndoToast, onToastChange, toast]);

  const handleTrackedAddMeal = useCallback(
    (meal: LoggedMeal, targetDate: string) => {
      setUserAddedMealIds((prev) => {
        const next = new Set(prev);
        next.add(meal.id);
        return next;
      });
      onAddMeal(meal, targetDate);
    },
    [onAddMeal],
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
      handleTrackedAddMeal(newMeal, selectedDate);
      addRecentFood(food)
        .then((updated) => {
          if (isMountedRef.current) setRecentFoods(updated);
        })
        .catch(() => {});
      showToast({
        id: newMeal.id,
        meal: newMeal,
        message: `${t('Added')} ${getLocalizedFoodName(food, language)}`,
      });
    },
    [handleTrackedAddMeal, isFuture, language, selectedDate, showToast, t],
  );

  const handleDeleteMeal = useCallback(
    async (id: string) => {
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
    [dialog, onRemoveMeal, t],
  );

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

  const toggleMealExpanded = useCallback((mealKey: MealType, currentExpanded: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setCollapsedOverrides((prev) => ({
      ...prev,
      [mealKey]: !currentExpanded,
    }));
  }, []);

  const triggerOpenAdd = useCallback(
    (
      mealType?: MealType,
      initialTab: 'search' | 'photo' | 'describe' = 'search',
      initialScanBarcode = false,
    ) => {
      if (isFuture) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      const targetMeal = mealType ?? resolveTargetMealForQuickAction(activeFilter);
      onOpenAddFood(targetMeal, initialTab, initialScanBarcode);
    },
    [activeFilter, isFuture, onOpenAddFood],
  );

  const budgetSummary = useMemo(
    () => calculateDiaryBudgetSummary(profile, log),
    [log, profile],
  );

  const groupedMeals = useMemo(() => groupMealsByType(log.meals), [log.meals]);

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

  const mealMeta = useMemo(
    () => [
      { key: 'breakfast' as MealType, label: t('Breakfast') },
      { key: 'lunch' as MealType, label: t('Lunch') },
      { key: 'dinner' as MealType, label: t('Dinner') },
      { key: 'snack' as MealType, label: t('Snacks') },
    ],
    [t],
  );

  const visibleMeals = useMemo(() => {
    if (activeFilter === 'all') {
      return DIARY_MEAL_ORDER.map((k) => mealMeta.find((m) => m.key === k)!);
    }
    return mealMeta.filter((m) => m.key === activeFilter);
  }, [activeFilter, mealMeta]);

  return (
    <View style={styles.sectionRoot}>
      {/* Unified Quick Action Bar: Search Food | AI Plate | Barcode */}
      {showQuickActionBar && !isFuture && (
        <View style={[styles.quickActionBar, isRtl && styles.rowRtl]}>
          <View style={styles.quickActionSlot}>
            <AnimatedPressable
              style={[styles.quickActionBtn, isRtl && styles.rowRtl]}
              onPress={() => triggerOpenAdd(undefined, 'search', false)}
              accessibilityRole="button"
              accessibilityLabel={t('Search Food')}
              minScale={0.95}
            >
              <Search size={15} color={theme.colors.macroPillProteinText} strokeWidth={2.2} />
              <Text
                style={styles.quickActionLabel}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.82}
              >
                {t('Search Food')}
              </Text>
            </AnimatedPressable>
          </View>

          <View style={styles.quickActionDivider} />

          <View style={styles.quickActionSlot}>
            <AnimatedPressable
              style={[styles.quickActionBtn, isRtl && styles.rowRtl]}
              onPress={() => triggerOpenAdd(undefined, 'photo', false)}
              accessibilityRole="button"
              accessibilityLabel={t('AI Plate')}
              minScale={0.95}
            >
              <Sparkles size={15} color={theme.colors.macroPillCarbsText} strokeWidth={2.2} />
              <Text
                style={styles.quickActionLabel}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.82}
              >
                {t('AI Plate')}
              </Text>
            </AnimatedPressable>
          </View>

          <View style={styles.quickActionDivider} />

          <View style={styles.quickActionSlot}>
            <AnimatedPressable
              style={[styles.quickActionBtn, isRtl && styles.rowRtl]}
              onPress={() => triggerOpenAdd(undefined, 'search', true)}
              accessibilityRole="button"
              accessibilityLabel={t('Barcode')}
              minScale={0.95}
            >
              <BarcodeIcon size={15} color={theme.colors.macroPillFatText} strokeWidth={2.2} />
              <Text
                style={styles.quickActionLabel}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.82}
              >
                {t('Barcode')}
              </Text>
            </AnimatedPressable>
          </View>
        </View>
      )}

      {/* Optional Inline Section Heading */}
      {showSectionHeading && (
        <View style={[styles.diaryHeadingRow, isRtl && styles.rowRtl]}>
          <Text style={[styles.diaryHeadingText, isRtl && styles.rtlText]}>
            {sectionTitle || t('Today’s Meals')}
          </Text>
          <Text style={styles.diarySummaryPill}>
            {formatKcal(budgetSummary.consumedCalories, t)} · {log.meals.length}{' '}
            {t(log.meals.length === 1 ? 'item' : 'items')}
          </Text>
        </View>
      )}

      {/* Inline Undo Toast after Quick-Log */}
      {toastMode === 'inline' && toast && (
        <Animated.View
          entering={isReducedMotion() ? undefined : FadeIn.duration(180)}
          exiting={isReducedMotion() ? undefined : FadeOut.duration(150)}
          style={[styles.inlineToastCard, isRtl && styles.rowRtl]}
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

      {/* Collapsible Luxury Meal Cards */}
      {visibleMeals.map((cat) => {
        const categoryMeals = groupedMeals[cat.key];
        const mealStats = budgetSummary.mealStats[cat.key];
        const hasItems = categoryMeals.length > 0;
        const isExpanded =
          activeFilter === cat.key
            ? true
            : (collapsedOverrides[cat.key] ?? true);

        return (
          <View
            key={cat.key}
            onLayout={(e) => {
              if (onMealOffset && activeFilter === 'all') {
                onMealOffset(cat.key, e.nativeEvent.layout.y);
              }
            }}
            style={styles.mealCard}
          >
            {/* Clean Luxury Meal Header */}
            <View style={[styles.mealHeaderRow, isRtl && styles.rowRtl]}>
              <TouchableOpacity
                style={[styles.mealHeaderMain, isRtl && styles.rowRtl]}
                onPress={() => toggleMealExpanded(cat.key, isExpanded)}
                activeOpacity={0.78}
                accessibilityRole="button"
                accessibilityLabel={`${cat.label}, ${isExpanded ? t('Collapse') : t('Expand')}`}
              >
                <View style={styles.mealIconSquircle}>
                  {renderMealGlyph(cat.key, 18, theme.colors.diaryMutedLabel)}
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
                      ? `${formatKcal(mealStats.calories, t)} · ${mealStats.count} ${t(mealStats.count === 1 ? 'item' : 'items')}`
                      : formatKcal(0, t)}
                  </Text>
                </View>
              </TouchableOpacity>

              <View style={[styles.mealHeaderActions, isRtl && styles.rowRtl]}>
                {!isFuture && (
                  <AnimatedPressable
                    style={[styles.addMealPillBtn, isRtl && styles.rowRtl]}
                    onPress={() => triggerOpenAdd(cat.key, 'search', false)}
                    hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                    accessibilityRole="button"
                    accessibilityLabel={`${t('Add food to')} ${cat.label}`}
                    minScale={0.94}
                  >
                    <Plus
                      size={14}
                      color={theme.colors.macroPillProteinText}
                      strokeWidth={2.5}
                    />
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
                      color={theme.colors.diarySubtleSlate}
                    />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Collapsible Body */}
            {isExpanded && (
              <View style={styles.mealCardBody}>
                {!isFuture && (
                  <MealQuickLogCarousel
                    foods={quickLogByMeal[cat.key]}
                    onQuickLog={(food) => handleQuickLogFood(food, cat.key)}
                    disabled={isFuture}
                    language={language}
                    isRtl={isRtl}
                  />
                )}

                {hasItems ? (
                  <View style={styles.foodGroupContainer}>
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
                          isLast={idx === categoryMeals.length - 1}
                          onPress={setInspectingMeal}
                          onDelete={handleDeleteMeal}
                        />
                      </AnimatedFoodRow>
                    ))}
                  </View>
                ) : null}
              </View>
            )}
          </View>
        );
      })}

      {/* Food Details & Serving Adjustment Modal */}
      <FoodDetailsModal
        visible={inspectingMeal !== null}
        item={inspectingMeal}
        isLogged={true}
        onClose={() => setInspectingMeal(null)}
        onSave={handleUpdateInspectingServings}
        onDelete={() => {
          if (inspectingMeal) {
            handleDeleteMeal(inspectingMeal.id);
            setInspectingMeal(null);
          }
        }}
      />
    </View>
  );
});

MealsDiarySection.displayName = 'MealsDiarySection';

const createStyles = (theme: ThemeType) =>
  StyleSheet.create({
    sectionRoot: {
      width: '100%',
    },
    rowRtl: {
      flexDirection: 'row-reverse',
    },
    rtlText: {
      textAlign: 'right',
      writingDirection: 'rtl',
    },
    quickActionBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.diaryActionDockBg,
      borderColor: theme.colors.diaryActionDockBorder,
      borderWidth: 1,
      borderRadius: 16,
      paddingVertical: 6,
      paddingHorizontal: 4,
      marginBottom: 14,
    },
    quickActionSlot: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    quickActionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 7,
      paddingHorizontal: 8,
    },
    quickActionLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.diaryBodyLight,
    },
    quickActionDivider: {
      width: 1,
      height: 18,
      backgroundColor: theme.colors.diaryHairlineDivider,
    },
    diaryHeadingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
      paddingHorizontal: 2,
    },
    diaryHeadingText: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.diaryHeadingText,
      fontFamily: theme.fonts.serif,
    },
    diarySummaryPill: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.diarySubtleSlate,
      fontVariant: ['tabular-nums'],
    },
    inlineToastCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      backgroundColor: theme.colors.diaryTelemetryBg,
      borderColor: theme.colors.diaryAddBtnBorder,
      borderWidth: 1,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 10,
      marginBottom: 12,
    },
    toastText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.diaryHeadingText,
      flex: 1,
    },
    toastUndoBtn: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: theme.colors.diaryAddBtnBg,
    },
    toastUndoText: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.macroPillProteinText,
    },
    mealCard: {
      backgroundColor: theme.colors.diaryMealCardBg,
      borderColor: theme.colors.diaryMealCardBorder,
      borderWidth: 1,
      borderRadius: 22,
      padding: 16,
      marginBottom: 14,
    },
    mealHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    mealHeaderMain: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      minWidth: 0,
    },
    mealIconSquircle: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor: theme.colors.diarySquircleBg,
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
      fontSize: 17,
      fontWeight: '700',
      color: theme.colors.diaryHeadingText,
    },
    mealSubBadge: {
      fontSize: 13,
      fontWeight: '500',
      color: theme.colors.diarySubtleSlate,
      fontVariant: ['tabular-nums'],
    },
    mealHeaderActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flexShrink: 0,
    },
    addMealPillBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: theme.colors.diaryAddBtnBg,
      borderWidth: 1,
      borderColor: theme.colors.diaryAddBtnBorder,
    },
    addMealPillText: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.macroPillProteinText,
    },
    chevronBtn: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: theme.colors.diarySquircleBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    mealCardBody: {
      marginTop: 12,
      gap: 12,
    },
    foodGroupContainer: {
      backgroundColor: theme.colors.diaryLoggedRowBg,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.diaryLoggedRowBorder,
      overflow: 'hidden',
    },
  });
