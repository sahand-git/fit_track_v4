import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
  BackHandler,
  PanResponder,
} from 'react-native';
import { useAppDialog } from '../components/dialogs/AppDialogProvider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText as Text } from '../components/AppText';
import {
  Plus,
  CalendarDays,
  Calendar as CalendarIcon,
  Coffee,
  Utensils,
  Moon,
  Apple,
  ChevronDown,
  ChevronUp,
} from 'lucide-react-native';
import { DailyLog, LoggedMeal, MealType, UserProfile, FoodItem } from '../types';
import { FoodDetailsModal } from '../components/FoodDetailsModal';
import { CalendarPickerModal } from '../components/CalendarPickerModal';
import { AddFoodSheet } from '../components/addfood/AddFoodSheet';
import { AnimatedFoodRow } from '../components/AnimatedFoodRow';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { FoodLogSwipeableRow } from '../components/FoodLogSwipeableRow';
import { MealQuickLogCarousel } from '../components/MealQuickLogCarousel';
import { VERIFIED_FOOD_DATABASE } from '../data/foodDatabase';
import { addDaysToDateString, formatDisplayDate, getTodayDateString } from '../utils/dateUtils';
import { useLanguage } from '../i18n/I18nContext';
import { translate } from '../i18n/strings';
import { useTheme } from '../theme/ThemeContext';
import { ThemeType } from '../theme';
import { useIsRTL } from '../hooks/useIsRTL';
import { DirectionalIcon } from '../components/DirectionalIcon';
import * as Haptics from 'expo-haptics';
import { MealsSkeleton } from '../components/SkeletonLoader';
import { formatKcal } from '../utils/formatKcal';
import { getDailyEffectiveCalorieTarget } from '../utils/activityBudget';

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
  const t = (value: string) => translate(language, value);
  const isRtl = useIsRTL();
  const [userAddedMealIds, setUserAddedMealIds] = useState<Set<string>>(() => new Set());

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
    },
    [onAddMeal]
  );

  const dockBottom = insets.bottom > 0 ? insets.bottom + 8 : (Platform.OS === 'ios' ? 18 : 10);
  const dockClearance = dockBottom + 72;
  const scrollBottomPadding = Math.max(160, dockClearance + 80);

  const [addSheetVisible, setAddSheetVisible] = useState(false);
  const [activeMealType, setActiveMealType] = useState<MealType>(initialMealType);
  const [inspectingMeal, setInspectingMeal] = useState<LoggedMeal | null>(null);
  const [calendarVisible, setCalendarVisible] = useState(false);

  // Collapsible meals state (by default: with food -> collapsed, empty -> expanded)
  const [collapsedOverrides, setCollapsedOverrides] = useState<Partial<Record<MealType, boolean>>>({});
  const [activeMealNav, setActiveMealNav] = useState<MealType>('breakfast');
  const scrollViewRef = useRef<ScrollView>(null);
  const mealOffsets = useRef<Record<MealType, number>>({
    breakfast: 0,
    lunch: 0,
    dinner: 0,
    snack: 0,
  });

  useEffect(() => {
    setCollapsedOverrides({});
  }, [selectedDate]);

  // Handle Android hardware back press for dialogs
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const onBackPress = () => {
      if (addSheetVisible) {
        setAddSheetVisible(false);
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
  }, [addSheetVisible, calendarVisible, inspectingMeal]);

  const isPast = selectedDate < getTodayDateString();
  const isFuture = selectedDate > getTodayDateString();

  // Date navigation
  const handlePrevDay = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onSelectDate(addDaysToDateString(selectedDate, -1));
  };

  const handleNextDay = () => {
    if (selectedDate >= getTodayDateString()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onSelectDate(addDaysToDateString(selectedDate, 1));
  };

  const handleBackToToday = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onSelectDate(getTodayDateString());
  };

  const selectedDateRef = useRef(selectedDate);
  selectedDateRef.current = selectedDate;
  const isRtlRef = useRef(isRtl);
  isRtlRef.current = isRtl;

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onStartShouldSetPanResponderCapture: () => false,
        onMoveShouldSetPanResponder: (_, gestureState) => {
          return (
            Math.abs(gestureState.dx) > 35 &&
            Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.8
          );
        },
        onMoveShouldSetPanResponderCapture: () => false,
        onPanResponderRelease: (_, gestureState) => {
          if (Math.abs(gestureState.dx) > 50) {
            if (gestureState.dx > 0) {
              if (isRtlRef.current) {
                if (selectedDateRef.current < getTodayDateString()) {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                  onSelectDate(addDaysToDateString(selectedDateRef.current, 1));
                }
              } else {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                onSelectDate(addDaysToDateString(selectedDateRef.current, -1));
              }
            } else {
              if (isRtlRef.current) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                onSelectDate(addDaysToDateString(selectedDateRef.current, -1));
              } else {
                if (selectedDateRef.current < getTodayDateString()) {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                  onSelectDate(addDaysToDateString(selectedDateRef.current, 1));
                }
              }
            }
          }
        },
      }),
    [onSelectDate]
  );

  // Daily Totals & Targets
  const totalKcal = log.meals.reduce((sum, m) => sum + m.calories, 0);
  const totalProtein = Math.round(log.meals.reduce((sum, m) => sum + m.protein, 0) * 10) / 10;
  const totalCarbs = Math.round(log.meals.reduce((sum, m) => sum + m.carbs, 0) * 10) / 10;
  const totalFat = Math.round(log.meals.reduce((sum, m) => sum + m.fat, 0) * 10) / 10;
  const effectiveCalorieTarget = profile ? getDailyEffectiveCalorieTarget(profile, log) : null;

  const openAddSheet = (mealType: MealType) => {
    if (isFuture) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setActiveMealType(mealType);
    setAddSheetVisible(true);
  };

  const toggleMealExpanded = useCallback((mealKey: MealType, currentExpanded: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setCollapsedOverrides((prev) => ({
      ...prev,
      [mealKey]: !currentExpanded,
    }));
  }, []);

  const handleJumpToMeal = useCallback((mealKey: MealType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setActiveMealNav(mealKey);
    setCollapsedOverrides((prev) => ({
      ...prev,
      [mealKey]: true,
    }));
    const targetY = mealOffsets.current[mealKey];
    if (targetY !== undefined && scrollViewRef.current) {
      scrollViewRef.current.scrollTo({
        y: Math.max(0, targetY - 56),
        animated: true,
      });
    }
  }, []);

  const handleScroll = useCallback((e: any) => {
    const scrollY = e.nativeEvent.contentOffset.y;
    const offsets = mealOffsets.current;
    const categories: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
    let current: MealType = 'breakfast';
    for (const cat of categories) {
      if (scrollY + 90 >= (offsets[cat] || 0)) {
        current = cat;
      }
    }
    setActiveMealNav((prev) => (prev !== current ? current : prev));
  }, []);

  const handleDelete = async (id: string) => {
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
  };

  const handleUpdateInspectingServings = (newServings: number) => {
    if (!inspectingMeal) return;
    const baseServings = inspectingMeal.servings > 0 ? inspectingMeal.servings : 1;
    const baseKcal = inspectingMeal.calories / baseServings;
    const baseProtein = inspectingMeal.protein / baseServings;
    const baseCarbs = inspectingMeal.carbs / baseServings;
    const baseFat = inspectingMeal.fat / baseServings;
    const baseGrams = inspectingMeal.servingGrams / baseServings;

    const scaleNutrient = (val: number | undefined): number | undefined => {
      if (val === undefined) return undefined;
      const base = val / baseServings;
      return Math.round(base * newServings * 10) / 10;
    };

    const updatedMeal: LoggedMeal = {
      ...inspectingMeal,
      servings: newServings,
      calories: Math.round(baseKcal * newServings),
      protein: Math.round(baseProtein * newServings * 10) / 10,
      carbs: Math.round(baseCarbs * newServings * 10) / 10,
      fat: Math.round(baseFat * newServings * 10) / 10,
      servingGrams: Math.round(baseGrams * newServings),
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
    };

    if (onUpdateMeal) {
      onUpdateMeal(updatedMeal);
    } else {
      onRemoveMeal(inspectingMeal.id);
      onAddMeal(updatedMeal, selectedDate);
    }
    setInspectingMeal(null);
  };

  const getMealHeaderIcon = (mealType: MealType) => {
    switch (mealType) {
      case 'breakfast':
        return (
          <View style={[styles.categoryIconCircle, { backgroundColor: theme.colors.amberLight }]}>
            <Coffee size={16} color={theme.colors.amberDark} />
          </View>
        );
      case 'lunch':
        return (
          <View style={[styles.categoryIconCircle, { backgroundColor: theme.colors.emeraldLight }]}>
            <Utensils size={16} color={theme.colors.emeraldDark} />
          </View>
        );
      case 'dinner':
        return (
          <View style={[styles.categoryIconCircle, { backgroundColor: theme.colors.waterLight }]}>
            <Moon size={16} color={theme.colors.water} />
          </View>
        );
      case 'snack':
        return (
          <View style={[styles.categoryIconCircle, { backgroundColor: theme.colors.terracottaWarmLight }]}>
            <Apple size={16} color={theme.colors.terracottaDark} />
          </View>
        );
      default:
        return (
          <View style={[styles.categoryIconCircle, { backgroundColor: theme.colors.surfaceSubtle }]}>
            <Utensils size={16} color={theme.colors.primary} />
          </View>
        );
    }
  };

  const mealCategories: { key: MealType; label: string }[] = [
    { key: 'breakfast', label: t('Breakfast') },
    { key: 'lunch', label: t('Lunch') },
    { key: 'dinner', label: t('Dinner') },
    { key: 'snack', label: t('Snacks') },
  ];

  const mealBorderColors: Record<MealType, string> = {
    breakfast: theme.colors.orange,
    lunch: theme.colors.emerald,
    dinner: theme.colors.primary,
    snack: theme.colors.purple,
  };

  const getRecentFoodsForMeal = useCallback((mealType: MealType): FoodItem[] => {
    return VERIFIED_FOOD_DATABASE.filter((f) => {
      if (mealType === 'breakfast') return /egg|cheese|bread|yogurt|honey|tea|coffee|labneh|جبن|هێلکە/i.test(f.name + (f.category || ''));
      if (mealType === 'lunch') return /chicken|rice|meat|stew|salad|fish|kebab|dolma|دجاج|تمن/i.test(f.name + (f.category || ''));
      if (mealType === 'dinner') return /soup|salad|grilled|fish|chicken|vegetable|kebab|شوربة/i.test(f.name + (f.category || ''));
      return /apple|banana|date|almond|walnut|fruit|sweet|snack|تمر|سێو/i.test(f.name + (f.category || ''));
    }).slice(0, 8);
  }, []);

  const handleQuickLogFood = useCallback((food: FoodItem, mealType: MealType) => {
    const newMeal: LoggedMeal = {
      id: `meal_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      foodId: food.id,
      name: food.name,
      nameAr: food.nameAr,
      nameCkb: food.nameCkb,
      mealType,
      servings: 1,
      servingSize: food.servingSize,
      servingGrams: food.servingGrams,
      unit: food.unit,
      calories: food.calories,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat,
      fiber: food.fiber,
      sugar: food.sugar,
      sodium: food.sodium,
      potassium: food.potassium,
      calcium: food.calcium,
      iron: food.iron,
      vitaminC: food.vitaminC,
      vitaminA: food.vitaminA,
      vitaminD: food.vitaminD,
      vitaminB12: food.vitaminB12,
      magnesium: food.magnesium,
      zinc: food.zinc,
      timestamp: new Date().toISOString(),
      source: food.source,
    };
    onAddMeal(newMeal, selectedDate);
  }, [onAddMeal, selectedDate]);

  if (isLoading) {
    return <MealsSkeleton />;
  }

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      {/* Calm Calendar Navigation — True Horizontal Center */}
      <View style={styles.dateHeader}>
        <AnimatedPressable
          style={styles.dateNavBtn}
          onPress={handlePrevDay}
          accessibilityLabel={t('Previous day')}
          accessibilityRole="button"
          minScale={0.9}
        >
          <DirectionalIcon name="ChevronLeft" size={22} color={theme.colors.textPrimary} />
        </AnimatedPressable>

        <AnimatedPressable
          style={styles.datePickButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            setCalendarVisible(true);
          }}
          accessibilityLabel={t('Choose date')}
          accessibilityRole="button"
          minScale={0.96}
        >
          <CalendarDays size={18} color={theme.colors.primary} />
          <Text style={styles.dateTitle}>{formatDisplayDate(selectedDate, language)}</Text>
        </AnimatedPressable>

        <AnimatedPressable
          style={[
            styles.dateNavBtn,
            selectedDate >= getTodayDateString() && styles.disabledButton,
          ]}
          onPress={handleNextDay}
          disabled={selectedDate >= getTodayDateString()}
          accessibilityLabel={t('Next day')}
          accessibilityRole="button"
          minScale={0.9}
        >
          <DirectionalIcon
            name="ChevronRight"
            size={22}
            color={selectedDate >= getTodayDateString() ? theme.colors.textMuted : theme.colors.textPrimary}
          />
        </AnimatedPressable>
      </View>

      {/* Meal Groups Scroll List */}
      <ScrollView
        ref={scrollViewRef}
        onScroll={handleScroll}
        scrollEventThrottle={32}
        stickyHeaderIndices={[1]}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollBottomPadding }]}
      >
        {/* Child 0: Past Date Banner & Macro Summary */}
        <View style={styles.topSummaryContainer}>
          {isPast && (
            <TouchableOpacity
              style={styles.pastDateBanner}
              onPress={handleBackToToday}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={`${t('Viewing')} ${formatDisplayDate(selectedDate, language)} · ${t('Back to today')}`}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <CalendarIcon size={14} color={theme.colors.secondary} />
              <Text style={styles.pastDateBannerText}>
                {`${t('Viewing')} ${formatDisplayDate(selectedDate, language)} · `}
                <Text style={styles.backToTodayLink}>{t('Back to today')}</Text>
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Child 1: Sticky Jump-to-Meal Mini-Nav */}
        <View style={styles.stickyNavContainer}>
          <View style={styles.stickyNavRow}>
            {mealCategories.map((cat) => {
              const isActive = activeMealNav === cat.key;
              const count = log.meals.filter((m) => m.mealType === cat.key).length;
              return (
                <TouchableOpacity
                  key={cat.key}
                  style={[styles.mealNavPill, isActive && styles.mealNavPillActive]}
                  onPress={() => handleJumpToMeal(cat.key)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={`${cat.label}${count > 0 ? ` (${count})` : ''}`}
                >
                  <Text
                    style={[styles.mealNavPillText, isActive && styles.mealNavPillTextActive]}
                    numberOfLines={1}
                  >
                    {cat.label}
                    {count > 0 ? ` · ${count}` : ''}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Meal Categories */}
        {mealCategories.map((cat) => {
          const categoryMeals = log.meals.filter((m) => m.mealType === cat.key);
          const categoryKcal = categoryMeals.reduce((s, m) => s + m.calories, 0);
          const hasItems = categoryMeals.length > 0;
          const isExpanded = collapsedOverrides[cat.key] ?? !hasItems;

          return (
            <View
              key={cat.key}
              onLayout={(e) => {
                mealOffsets.current[cat.key] = e.nativeEvent.layout.y;
              }}
              style={[
                styles.mealSection,
                isRtl
                  ? { borderRightWidth: 4, borderRightColor: mealBorderColors[cat.key], borderLeftWidth: 0, paddingRight: 10, paddingLeft: 4 }
                  : { borderLeftWidth: 4, borderLeftColor: mealBorderColors[cat.key], borderRightWidth: 0, paddingLeft: 10, paddingRight: 4 },
              ]}
            >
              {/* Category Header */}
              <View style={styles.mealSectionHeader}>
                <TouchableOpacity
                  style={styles.mealHeaderTitleArea}
                  onPress={() => toggleMealExpanded(cat.key, isExpanded)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={`${cat.label}, ${isExpanded ? t('Collapse') : t('Expand')}`}
                >
                  {getMealHeaderIcon(cat.key)}
                  <View style={styles.mealHeaderInfo}>
                    <View style={styles.mealTitleRow}>
                      <Text style={styles.categoryTitle}>{cat.label}</Text>
                      <View style={styles.chevronWrap}>
                        {isExpanded ? (
                          <ChevronUp size={16} color={theme.colors.textSecondary} />
                        ) : (
                          <ChevronDown size={16} color={theme.colors.textSecondary} />
                        )}
                      </View>
                    </View>
                    <Text style={styles.categorySummarySub}>
                      {hasItems
                        ? `${formatKcal(categoryKcal, t)} · ${categoryMeals.length} ${t(categoryMeals.length > 1 ? 'items' : 'item')}`
                        : t('No items yet')}
                    </Text>
                  </View>
                </TouchableOpacity>

                {!isFuture && (
                  <AnimatedPressable
                    style={styles.addFoodBtn}
                    onPress={() => openAddSheet(cat.key)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    accessibilityLabel={`${t('Add food to')} ${cat.label}`}
                    accessibilityRole="button"
                  >
                    <Plus size={14} color={theme.colors.primary} />
                    <Text style={styles.addFoodBtnText}>{t('Add')}</Text>
                  </AnimatedPressable>
                )}
              </View>

              {/* Collapsible Content */}
              {isExpanded && (
                <>
                  {/* Quick Log Circular Carousel */}
                  {!isFuture && (
                    <MealQuickLogCarousel
                      mealType={cat.key}
                      recentFoods={getRecentFoodsForMeal(cat.key)}
                      onQuickLog={(food) => handleQuickLogFood(food, cat.key)}
                    />
                  )}

                  {/* Items List */}
                  {categoryMeals.length === 0 ? (
                    <AnimatedPressable
                      style={styles.emptyPromptBox}
                      onPress={() => openAddSheet(cat.key)}
                      disabled={isFuture}
                      accessibilityRole="button"
                      accessibilityLabel={`${t('Tap + to log your first meal')} ${t('Add food')}`}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <View style={styles.emptyPlateBadge}>
                        <Utensils size={18} color={theme.colors.primary} />
                      </View>
                      <Text style={styles.emptyPromptText}>
                        {t('Tap + to log your first meal')}
                      </Text>
                      {!isFuture && (
                        <View style={styles.emptyAddActionPill}>
                          <Plus size={13} color={theme.colors.primary} strokeWidth={2.4} />
                          <Text style={styles.emptyAddActionText}>{t('Add food')}</Text>
                        </View>
                      )}
                    </AnimatedPressable>
                  ) : (
                    <View style={styles.foodListContainer}>
                      {categoryMeals.map((item, idx) => (
                        <AnimatedFoodRow key={item.id} isNew={userAddedMealIds.has(item.id)} delay={idx * 30}>
                          <FoodLogSwipeableRow
                            item={item}
                            language={language}
                            t={t}
                            theme={theme}
                            isRtl={isRtl}
                            onInspect={setInspectingMeal}
                            onDelete={handleDelete}
                            idx={idx}
                          />
                        </AnimatedFoodRow>
                      ))}
                    </View>
                  )}
                </>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Calendar Picker Modal */}
      <CalendarPickerModal
        visible={calendarVisible}
        selectedDate={selectedDate}
        onClose={() => setCalendarVisible(false)}
        onSelect={onSelectDate}
      />

      {/* Unified Add Food Sheet */}
      <AddFoodSheet
        visible={addSheetVisible}
        mealType={activeMealType}
        date={selectedDate}
        onClose={() => setAddSheetVisible(false)}
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
            handleDelete(inspectingMeal.id);
            setInspectingMeal(null);
          }
        }}
      />
    </View>
  );
});
FoodLogScreen.displayName = 'FoodLogScreen';

const createStyles = (theme: ThemeType) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  dateHeader: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  dateNavBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadow.subtle,
  },
  disabledButton: {
    opacity: 0.35,
  },
  datePickButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  dateTitle: {
    fontFamily: theme.fonts.serif,
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  pastDateBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: theme.colors.surfaceSubtle,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  pastDateBannerText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  backToTodayLink: {
    color: theme.colors.primary,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  topSummaryContainer: {
    marginHorizontal: -theme.spacing.md,
  },
  compactDaySummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.sm + 4,
    paddingVertical: 10,
    marginTop: 6,
    ...theme.shadow.subtle,
  },
  summaryKcalCol: {
    flexShrink: 0,
  },
  summaryKcalMain: {
    fontFamily: theme.fonts.sans,
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  summaryKcalTarget: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  summaryKcalSub: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
    marginTop: 1,
  },
  summaryMacrosCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  miniMacroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 7,
    paddingVertical: 4,
    gap: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  macroDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  miniMacroText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    includeFontPadding: false,
  },
  stickyNavContainer: {
    backgroundColor: theme.colors.background,
    paddingVertical: 8,
    paddingHorizontal: theme.spacing.md,
    marginHorizontal: -theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    zIndex: 10,
  },
  stickyNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mealNavPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    paddingHorizontal: 4,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minHeight: 34,
    ...theme.shadow.subtle,
  },
  mealNavPillActive: {
    backgroundColor: theme.colors.primaryLight,
    borderColor: theme.colors.primary,
  },
  mealNavPillText: {
    fontFamily: theme.fonts.sans,
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  mealNavPillTextActive: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: 4,
    gap: 8,
  },
  mealSection: {
    gap: 2,
    marginBottom: 4,
  },
  mealSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  mealHeaderTitleArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
    paddingVertical: 2,
  },
  mealHeaderInfo: {
    flex: 1,
    minWidth: 0,
  },
  mealTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chevronWrap: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categorySummarySub: {
    fontFamily: theme.fonts.sans,
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
  categoryIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryTitle: {
    fontFamily: theme.fonts.serif,
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  categoryKcal: {
    fontFamily: theme.fonts.sans,
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
  addFoodBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.primaryLight,
    flexShrink: 0,
  },
  addFoodBtnText: {
    fontFamily: theme.fonts.sans,
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
    lineHeight: 16,
    includeFontPadding: false,
  },
  emptyPromptBox: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 8,
    ...theme.shadow.subtle,
  },
  emptyPlateBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyPromptText: {
    fontFamily: theme.fonts.sans,
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  emptyAddActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: theme.colors.primaryLight,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: theme.radius.full,
    marginTop: 2,
  },
  emptyAddActionText: {
    fontFamily: theme.fonts.sans,
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  foodListContainer: {
    gap: 2,
  },
});
