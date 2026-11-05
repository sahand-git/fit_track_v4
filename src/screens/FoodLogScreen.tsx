import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
  BackHandler,
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
} from 'lucide-react-native';
import { DailyLog, LoggedMeal, MealType, UserProfile } from '../types';
import { FoodDetailsModal } from '../components/FoodDetailsModal';
import { CalendarPickerModal } from '../components/CalendarPickerModal';
import { AddFoodSheet } from '../components/addfood/AddFoodSheet';
import { AnimatedFoodRow } from '../components/AnimatedFoodRow';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { FoodLogSwipeableRow } from '../components/FoodLogSwipeableRow';
import { MacroSummaryBar } from '../components/MacroSummaryBar';
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
      onAddMeal(meal, targetDate);
    },
    [onAddMeal]
  );

  const dockBottom = insets.bottom > 0 ? insets.bottom + 8 : (Platform.OS === 'ios' ? 18 : 10);

  const [addSheetVisible, setAddSheetVisible] = useState(false);
  const [activeMealType, setActiveMealType] = useState<MealType>(initialMealType);
  const [inspectingMeal, setInspectingMeal] = useState<LoggedMeal | null>(null);
  const [calendarVisible, setCalendarVisible] = useState(false);

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

  if (isLoading) {
    return <MealsSkeleton />;
  }

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

  if (isLoading) {
    return <MealsSkeleton />;
  }

  return (
    <View style={styles.container}>
      {/* Calm Calendar Navigation — True Horizontal Center */}
      <View style={styles.dateHeader}>
        <AnimatedPressable
          style={[styles.dateNavBtn, styles.dateNavBtnLeft]}
          onPress={handlePrevDay}
          accessibilityLabel={t('Previous day')}
          accessibilityRole="button"
        >
          <DirectionalIcon name="ChevronLeft" size={20} color={theme.colors.textSecondary} />
        </AnimatedPressable>

        <AnimatedPressable
          style={styles.datePickButton}
          onPress={() => setCalendarVisible(true)}
          accessibilityLabel={t('Choose date')}
          accessibilityRole="button"
        >
          <CalendarDays size={18} color={theme.colors.primary} />
          <Text style={styles.dateTitle}>{formatDisplayDate(selectedDate, language)}</Text>
        </AnimatedPressable>

        <AnimatedPressable
          style={[
            styles.dateNavBtn,
            styles.dateNavBtnRight,
            selectedDate >= getTodayDateString() && styles.disabledButton,
          ]}
          onPress={handleNextDay}
          disabled={selectedDate >= getTodayDateString()}
          accessibilityLabel={t('Next day')}
          accessibilityRole="button"
        >
          <DirectionalIcon name="ChevronRight" size={20} color={theme.colors.textSecondary} />
        </AnimatedPressable>
      </View>

      {/* Past Date Banner */}
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

      {/* Macro Summary Bar with Circular Progress Ring & Horizontal Macro Bars */}
      <MacroSummaryBar
        totalKcal={totalKcal}
        effectiveCalorieTarget={effectiveCalorieTarget}
        totalProtein={totalProtein}
        targetProtein={profile?.targetProtein ?? 130}
        totalCarbs={totalCarbs}
        targetCarbs={profile?.targetCarbs ?? 220}
        totalFat={totalFat}
        targetFat={profile?.targetFat ?? 65}
        theme={theme}
        t={t}
      />

      {/* Meal Groups Scroll List */}
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: dockBottom + 28 }]}>
        {mealCategories.map((cat) => {
          const categoryMeals = log.meals.filter((m) => m.mealType === cat.key);
          const categoryKcal = categoryMeals.reduce((s, m) => s + m.calories, 0);

          return (
            <View key={cat.key} style={styles.mealSection}>
              {/* Category Header */}
              <View style={styles.mealSectionHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                  {getMealHeaderIcon(cat.key)}
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.categoryTitle}>{cat.label}</Text>
                    {categoryKcal > 0 && (
                      <Text style={styles.categoryKcal}>{formatKcal(categoryKcal, t)}</Text>
                    )}
                  </View>
                </View>

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
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    position: 'relative',
  },
  dateNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateNavBtnLeft: {
    position: 'absolute',
    left: theme.spacing.md,
    zIndex: 2,
  },
  dateNavBtnRight: {
    position: 'absolute',
    right: theme.spacing.md,
    zIndex: 2,
  },
  disabledButton: {
    opacity: 0.3,
  },
  datePickButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 8,
    paddingVertical: 4,
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
  scrollContent: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: 8,
    gap: 12,
  },
  mealSection: {
    gap: 4,
  },
  mealSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 6,
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
    fontSize: 18,
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
