import React from 'react';
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
  Plus,
  ChevronRight,
  Utensils,
  User,
  Pill,
  CheckCircle2,
  Circle,
} from 'lucide-react-native';
import { UserProfile, DailyLog, MealType, SupplementRoutineItem } from '../types';
import { CalorieRing } from '../components/CalorieRing';
import { MacroCards } from '../components/MacroCards';
import { WaterTracker } from '../components/WaterTracker';
import { theme } from '../theme';
import * as Haptics from 'expo-haptics';
import { useLanguage } from '../i18n/I18nContext';
import { translate } from '../i18n/strings';
import { formatDisplayDate, getTodayDateString } from '../utils/dateUtils';

interface DashboardScreenProps {
  profile: UserProfile;
  log: DailyLog;
  supplementRoutine: SupplementRoutineItem[];
  onToggleSupplement: (id: string, taken: boolean) => void;
  onUpdateWater: (delta: number) => void;
  onNavigateToMeals: (targetMeal?: MealType) => void;
  onOpenAddFood: (mealType?: MealType) => void;
  onOpenSupplements: () => void;
  onOpenProfile: () => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  profile,
  log,
  supplementRoutine,
  onToggleSupplement,
  onUpdateWater,
  onNavigateToMeals,
  onOpenAddFood,
  onOpenSupplements,
  onOpenProfile,
}) => {
  const language = useLanguage();
  const insets = useSafeAreaInsets();
  const t = (str: string) => translate(language, str);

  const dockBottom = insets.bottom > 0 ? insets.bottom + 8 : (Platform.OS === 'ios' ? 18 : 10);
  const floatingBottom = dockBottom + 66;

  const consumedCalories = log.meals.reduce((sum, m) => sum + m.calories, 0);
  const consumedProtein = log.meals.reduce((sum, m) => sum + m.protein, 0);
  const consumedCarbs = log.meals.reduce((sum, m) => sum + m.carbs, 0);
  const consumedFat = log.meals.reduce((sum, m) => sum + m.fat, 0);

  const mealTypes: { key: MealType; label: string }[] = [
    { key: 'breakfast', label: t('Breakfast') },
    { key: 'lunch', label: t('Lunch') },
    { key: 'dinner', label: t('Dinner') },
    { key: 'snack', label: t('Snacks') },
  ];

  const todayLabel = formatDisplayDate(log.date, language);
  const isFuture = log.date > getTodayDateString();

  const takenSupplementIds = new Set(
    (log.supplements || []).filter((c) => c.taken).map((c) => c.itemId)
  );

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
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: floatingBottom + 70 }]}>
        {/* Editorial Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.dateLabel}>{todayLabel}</Text>
            <Text style={styles.screenTitle}>{t('Today')}</Text>
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
        <View style={styles.heroSection}>
          <CalorieRing
            consumed={consumedCalories}
            target={profile.targetCalories}
            proteinConsumed={consumedProtein}
            proteinTarget={profile.targetProtein}
          />
        </View>

        {/* Nutrients Bar */}
        <MacroCards
          calorieTarget={profile.targetCalories}
          calorieConsumed={consumedCalories}
          proteinTarget={profile.targetProtein}
          proteinConsumed={consumedProtein}
          carbsTarget={profile.targetCarbs}
          carbsConsumed={consumedCarbs}
          fatTarget={profile.targetFat}
          fatConsumed={consumedFat}
        />

        {/* Hydration Row */}
        <WaterTracker
          glasses={log.waterGlasses}
          target={profile.waterTargetGlasses}
          onUpdate={onUpdateWater}
        />

        {/* Vitamins & Supplements Section (Below Water Tracker) */}
        <View style={styles.supplementsContainer}>
          {supplementRoutine.length === 0 ? (
            /* Slim row if routine is empty */
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
            /* Checklists with small Manage link if routine has items */
            <View style={styles.routineCard}>
              <View style={styles.routineHeader}>
                <View style={styles.routineTitleRow}>
                  <Pill size={16} color={theme.colors.primary} />
                  <Text style={styles.routineTitle}>{t('Vitamins & supplements')}</Text>
                  <Text style={styles.routineCount}>
                    {takenSupplementIds.size}/{supplementRoutine.length}
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
                {supplementRoutine.map((item) => {
                  const isTaken = takenSupplementIds.has(item.id);
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.routineItemRow}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                        onToggleSupplement(item.id, !isTaken);
                      }}
                      disabled={isFuture}
                      activeOpacity={0.7}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: isTaken }}
                    >
                      <View style={styles.checkboxCircle}>
                        {isTaken ? (
                          <CheckCircle2 size={19} color={theme.colors.primary} />
                        ) : (
                          <Circle size={19} color={theme.colors.textMuted} />
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.routineItemName, isTaken && styles.routineItemNameTaken]}>
                          {item.name}
                        </Text>
                        {item.dose ? (
                          <Text style={styles.routineItemDose}>{item.dose}</Text>
                        ) : null}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
        </View>

        {/* Meals Ledger Header */}
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
      </ScrollView>

      {/* Floating "+ Add food" Action Button */}
      {!isFuture && (
        <TouchableOpacity
          style={[
            styles.floatingAddBtn,
            {
              bottom: floatingBottom,
              ...(language === 'en' ? { right: 18 } : { left: 18 }),
            },
          ]}
          onPress={handleOpenFloatingAddFood}
          activeOpacity={0.88}
          accessibilityLabel={t('Add food')}
          accessibilityRole="button"
        >
          <Plus size={18} color={theme.colors.textInverted} strokeWidth={2.4} />
          <Text style={styles.floatingAddBtnText}>{t('Add food')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: 160,
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
