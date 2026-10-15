import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
  BackHandler,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText as Text } from '../components/AppText';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  CalendarDays,
  Calendar as CalendarIcon,
} from 'lucide-react-native';
import { DailyLog, LoggedMeal, MealType } from '../types';
import { FoodDetailsModal } from '../components/FoodDetailsModal';
import { CalendarPickerModal } from '../components/CalendarPickerModal';
import { AddFoodSheet } from '../components/addfood/AddFoodSheet';
import { AnimatedFoodRow } from '../components/AnimatedFoodRow';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { FoodThumbnail } from '../components/FoodThumbnail';
import { addDaysToDateString, formatDisplayDate, getTodayDateString } from '../utils/dateUtils';
import { useLanguage } from '../i18n/I18nContext';
import { translate } from '../i18n/strings';
import { theme } from '../theme';
import * as Haptics from 'expo-haptics';
import { MealsSkeleton } from '../components/SkeletonLoader';

interface FoodLogScreenProps {
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

export const FoodLogScreen: React.FC<FoodLogScreenProps> = ({
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
  const insets = useSafeAreaInsets();
  const t = (value: string) => translate(language, value);

  const dockBottom = insets.bottom > 0 ? insets.bottom + 8 : (Platform.OS === 'ios' ? 18 : 10);
  const floatingBottom = dockBottom + 66;

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

  // Daily Totals
  const totalKcal = log.meals.reduce((sum, m) => sum + m.calories, 0);
  const totalProtein = Math.round(log.meals.reduce((sum, m) => sum + m.protein, 0) * 10) / 10;
  const totalCarbs = Math.round(log.meals.reduce((sum, m) => sum + m.carbs, 0) * 10) / 10;
  const totalFat = Math.round(log.meals.reduce((sum, m) => sum + m.fat, 0) * 10) / 10;

  const openAddSheet = (mealType: MealType) => {
    if (isFuture) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setActiveMealType(mealType);
    setAddSheetVisible(true);
  };

  const handleDelete = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    Alert.alert(
      t('Delete food item'),
      t('Are you sure you want to delete this item?'),
      [
        { text: t('Cancel'), style: 'cancel' },
        {
          text: t('Delete'),
          style: 'destructive',
          onPress: () => onRemoveMeal(id),
        },
      ]
    );
  };

  const handleUpdateInspectingServings = (newServings: number) => {
    if (!inspectingMeal) return;
    const baseServings = inspectingMeal.servings > 0 ? inspectingMeal.servings : 1;
    const baseKcal = inspectingMeal.calories / baseServings;
    const baseProtein = inspectingMeal.protein / baseServings;
    const baseCarbs = inspectingMeal.carbs / baseServings;
    const baseFat = inspectingMeal.fat / baseServings;
    const baseGrams = inspectingMeal.servingGrams / baseServings;

    const updatedMeal: LoggedMeal = {
      ...inspectingMeal,
      servings: newServings,
      calories: Math.round(baseKcal * newServings),
      protein: Math.round(baseProtein * newServings * 10) / 10,
      carbs: Math.round(baseCarbs * newServings * 10) / 10,
      fat: Math.round(baseFat * newServings * 10) / 10,
      servingGrams: Math.round(baseGrams * newServings),
    };

    if (onUpdateMeal) {
      onUpdateMeal(updatedMeal);
    } else {
      onRemoveMeal(inspectingMeal.id);
      onAddMeal(updatedMeal, selectedDate);
    }
    setInspectingMeal(null);
  };

  const mealCategories: { key: MealType; label: string }[] = [
    { key: 'breakfast', label: t('Breakfast') },
    { key: 'lunch', label: t('Lunch') },
    { key: 'dinner', label: t('Dinner') },
    { key: 'snack', label: t('Snacks') },
  ];

  return (
    <View style={styles.container}>
      {/* Calm Calendar Navigation */}
      <View style={styles.dateHeader}>
        <TouchableOpacity
          style={styles.dateNavBtn}
          onPress={handlePrevDay}
          accessibilityLabel={t('Previous day')}
          accessibilityRole="button"
        >
          <ChevronLeft size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.datePickButton}
          onPress={() => setCalendarVisible(true)}
          accessibilityLabel={t('Choose date')}
          accessibilityRole="button"
        >
          <CalendarDays size={17} color={theme.colors.primary} />
          <Text style={styles.dateTitle}>{formatDisplayDate(selectedDate, language)}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.dateNavBtn, selectedDate >= getTodayDateString() && styles.disabledButton]}
          onPress={handleNextDay}
          disabled={selectedDate >= getTodayDateString()}
          accessibilityLabel={t('Next day')}
          accessibilityRole="button"
        >
          <ChevronRight size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Past Date Banner */}
      {isPast && (
        <TouchableOpacity
          style={styles.pastDateBanner}
          onPress={handleBackToToday}
          activeOpacity={0.8}
          accessibilityRole="button"
        >
          <CalendarIcon size={14} color={theme.colors.secondary} />
          <Text style={styles.pastDateBannerText}>
            {`${t('Viewing')} ${formatDisplayDate(selectedDate, language)} · `}
            <Text style={styles.backToTodayLink}>{t('Back to today')}</Text>
          </Text>
        </TouchableOpacity>
      )}

      {/* Understated Daily Summary Strip */}
      <View style={styles.summaryBar}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{totalKcal}</Text>
          <Text style={styles.summaryLabel}>kcal</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{totalProtein}g</Text>
          <Text style={styles.summaryLabel}>{t('Protein')}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{totalCarbs}g</Text>
          <Text style={styles.summaryLabel}>{t('Carbs')}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{totalFat}g</Text>
          <Text style={styles.summaryLabel}>{t('Fat')}</Text>
        </View>
      </View>

      {/* Meal Groups Scroll List */}
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: floatingBottom + 70 }]}>
        {mealCategories.map((cat) => {
          const categoryMeals = log.meals.filter((m) => m.mealType === cat.key);
          const categoryKcal = categoryMeals.reduce((s, m) => s + m.calories, 0);

          return (
            <View key={cat.key} style={styles.mealSection}>
              {/* Category Header */}
              <View style={styles.mealSectionHeader}>
                <View>
                  <Text style={styles.categoryTitle}>{cat.label}</Text>
                  {categoryKcal > 0 && (
                    <Text style={styles.categoryKcal}>{categoryKcal} kcal</Text>
                  )}
                </View>

                {!isFuture && (
                  <TouchableOpacity
                    style={styles.addFoodBtn}
                    onPress={() => openAddSheet(cat.key)}
                    accessibilityLabel={`${t('Add food to')} ${cat.label}`}
                    accessibilityRole="button"
                  >
                    <Plus size={14} color={theme.colors.primary} />
                    <Text style={styles.addFoodBtnText}>{t('Add')}</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Items List */}
              {categoryMeals.length === 0 ? (
                <TouchableOpacity
                  style={styles.emptyPromptBox}
                  onPress={() => openAddSheet(cat.key)}
                  disabled={isFuture}
                  activeOpacity={0.6}
                >
                  <Text style={styles.emptyPromptText}>
                    {t('No meals logged yet.')}
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.foodListContainer}>
                  {categoryMeals.map((item, idx) => (
                    <AnimatedFoodRow key={item.id} delay={idx * 30}>
                      <TouchableOpacity
                        style={[
                          styles.foodRow,
                          idx > 0 && styles.foodRowBorder,
                        ]}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                          setInspectingMeal(item);
                        }}
                        activeOpacity={0.7}
                      >
                        <FoodThumbnail name={item.name} size="small" style={{ marginEnd: 12 }} />
                        <View style={styles.foodInfo}>
                          <Text style={styles.foodName}>{item.name}</Text>
                          <Text style={styles.foodPortion}>
                            {item.servings} × {item.servingSize}
                          </Text>
                          <Text style={styles.foodMacros}>
                            P: {item.protein}g • C: {item.carbs}g • F: {item.fat}g
                          </Text>
                        </View>

                        <View style={styles.foodRight}>
                          <Text style={styles.foodKcal}>{item.calories} kcal</Text>
                          <TouchableOpacity
                            style={styles.deleteBtn}
                            onPress={(e) => {
                              e.stopPropagation();
                              handleDelete(item.id);
                            }}
                            accessibilityLabel={`${t('Delete')} ${item.name}`}
                            accessibilityRole="button"
                          >
                            <Trash2 size={15} color={theme.colors.danger} />
                          </TouchableOpacity>
                        </View>
                      </TouchableOpacity>
                    </AnimatedFoodRow>
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Floating "+ Add food" Action Button */}
      {!isFuture && (
        <AnimatedPressable
          style={[
            styles.floatingAddBtn,
            {
              bottom: floatingBottom,
              ...(language === 'en' ? { right: 18 } : { left: 18 }),
            },
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
            const currentHour = new Date().getHours();
            const defaultMeal: MealType =
              currentHour < 11 ? 'breakfast' : currentHour < 16 ? 'lunch' : currentHour < 21 ? 'dinner' : 'snack';
            openAddSheet(defaultMeal);
          }}
          activeOpacity={0.88}
          accessibilityLabel={t('Add food')}
          accessibilityRole="button"
        >
          <Plus size={18} color={theme.colors.textInverted} strokeWidth={2.4} />
          <Text style={styles.floatingAddBtnText}>{t('Add food')}</Text>
        </AnimatedPressable>
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
        visible={addSheetVisible}
        mealType={activeMealType}
        date={selectedDate}
        onClose={() => setAddSheetVisible(false)}
        onAddMeal={onAddMeal}
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
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  dateNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    opacity: 0.3,
  },
  datePickButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 5,
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
  summaryBar: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    paddingVertical: 12,
    paddingHorizontal: theme.spacing.md,
    justifyContent: 'space-around',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontFamily: theme.fonts.sans,
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  summaryLabel: {
    fontFamily: theme.fonts.sans,
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  divider: {
    width: 1,
    height: '60%',
    alignSelf: 'center',
    backgroundColor: theme.colors.border,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: 160,
    gap: 16,
  },
  mealSection: {
    gap: 8,
  },
  mealSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: 4,
  },
  categoryTitle: {
    fontFamily: theme.fonts.serif,
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  categoryKcal: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 1,
  },
  addFoodBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.primaryLight,
  },
  addFoodBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  emptyPromptBox: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: theme.colors.borderStrong,
    paddingVertical: 14,
    alignItems: 'center',
  },
  emptyPromptText: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  foodListContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
    ...theme.shadow.subtle,
  },
  foodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: theme.spacing.md,
  },
  foodRowBorder: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  foodInfo: {
    flex: 1,
  },
  foodName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  foodPortion: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  foodMacros: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  foodRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  foodKcal: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  deleteBtn: {
    padding: 2,
  },
  floatingAddBtn: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: theme.radius.full,
    ...theme.shadow.floating,
    zIndex: 10,
    elevation: 6,
  },
  floatingAddBtnText: {
    fontFamily: theme.fonts.sans,
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textInverted,
  },
});
