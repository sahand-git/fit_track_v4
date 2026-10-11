import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Plus, ChevronRight, Utensils } from 'lucide-react-native';
import { UserProfile, DailyLog, MealType } from '../types';
import { CalorieRing } from '../components/CalorieRing';
import { MacroCards } from '../components/MacroCards';
import { WaterTracker } from '../components/WaterTracker';
import { theme } from '../theme';
import * as Haptics from 'expo-haptics';

interface DashboardScreenProps {
  profile: UserProfile;
  log: DailyLog;
  onUpdateWater: (delta: number) => void;
  onNavigateToMeals: (targetMeal?: MealType) => void;
  onOpenChooser?: () => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  profile,
  log,
  onUpdateWater,
  onNavigateToMeals,
  onOpenChooser,
}) => {
  const consumedCalories = log.meals.reduce((sum, m) => sum + m.calories, 0);
  const consumedProtein = log.meals.reduce((sum, m) => sum + m.protein, 0);
  const consumedCarbs = log.meals.reduce((sum, m) => sum + m.carbs, 0);
  const consumedFat = log.meals.reduce((sum, m) => sum + m.fat, 0);

  const mealTypes: { key: MealType; label: string }[] = [
    { key: 'breakfast', label: 'Breakfast' },
    { key: 'lunch', label: 'Lunch' },
    { key: 'dinner', label: 'Dinner' },
    { key: 'snack', label: 'Snacks' },
  ];

  const todayLabel = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  const handleQuickAdd = (meal: MealType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onNavigateToMeals(meal);
  };

  const handleOpenLog = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (onOpenChooser) {
      onOpenChooser();
    } else {
      onNavigateToMeals('lunch');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Editorial Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.dateLabel}>{todayLabel}</Text>
          <Text style={styles.screenTitle}>Today</Text>
        </View>

        <TouchableOpacity
          style={styles.logCtaBtn}
          onPress={handleOpenLog}
          activeOpacity={0.8}
          accessibilityLabel="Log food"
          accessibilityRole="button"
        >
          <Plus size={16} color={theme.colors.textInverted} />
          <Text style={styles.logCtaText}>Log food</Text>
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

      {/* Meals Ledger Header */}
      <View style={styles.mealsHeader}>
        <Text style={styles.sectionHeading}>Today’s Meals</Text>
        <TouchableOpacity
          onPress={() => onNavigateToMeals()}
          style={styles.seeAllBtn}
          activeOpacity={0.7}
        >
          <Text style={styles.seeAllText}>View diary</Text>
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
              accessibilityLabel={`Add to ${m.label}`}
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
                      ? `${mealsOfCategory.length} item${mealsOfCategory.length > 1 ? 's' : ''} logged`
                      : 'Tap to log food'}
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
    paddingBottom: 110,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: theme.spacing.lg,
    paddingHorizontal: 2,
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
  logCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: theme.radius.full,
    ...theme.shadow.subtle,
  },
  logCtaText: {
    fontFamily: theme.fonts.sans,
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textInverted,
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
  mealsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
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
});
