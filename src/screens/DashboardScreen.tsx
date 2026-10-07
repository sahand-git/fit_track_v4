import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Flame, Utensils, Award, PlusCircle } from 'lucide-react-native';
import { UserProfile, DailyLog, MealType } from '../types';
import { CalorieRing } from '../components/CalorieRing';
import { MacroCards } from '../components/MacroCards';
import { WaterTracker } from '../components/WaterTracker';
import * as Haptics from 'expo-haptics';

interface DashboardScreenProps {
  profile: UserProfile;
  log: DailyLog;
  onUpdateWater: (delta: number) => void;
  onNavigateToMeals: (targetMeal?: MealType) => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  profile,
  log,
  onUpdateWater,
  onNavigateToMeals,
}) => {
  // Aggregate consumed macros
  const consumedCalories = log.meals.reduce((sum, m) => sum + m.calories, 0);
  const consumedProtein = log.meals.reduce((sum, m) => sum + m.protein, 0);
  const consumedCarbs = log.meals.reduce((sum, m) => sum + m.carbs, 0);
  const consumedFat = log.meals.reduce((sum, m) => sum + m.fat, 0);

  const handleQuickAdd = (meal: MealType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onNavigateToMeals(meal);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.userName}>{profile.name} 👋</Text>
        </View>
        <View style={styles.badge}>
          <Flame size={15} color="#10B981" />
          <Text style={styles.badgeText}>Day Streak: 1</Text>
        </View>
      </View>

      {/* Hero Calorie Progress Ring */}
      <View style={styles.heroCard}>
        <CalorieRing
          consumed={consumedCalories}
          target={profile.targetCalories}
          proteinConsumed={consumedProtein}
          proteinTarget={profile.targetProtein}
        />
      </View>

      {/* Standardized 4 Macro Target Cards */}
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

      {/* Hydration Tracker */}
      <WaterTracker
        glasses={log.waterGlasses}
        target={profile.waterTargetGlasses}
        onUpdate={onUpdateWater}
      />

      {/* Quick Meal Logging Shortcuts */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Quick Log Meal</Text>
        <Utensils size={16} color="#64748B" />
      </View>

      <View style={styles.quickGrid}>
        {(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map((meal) => {
          const count = log.meals.filter((m) => m.mealType === meal).length;
          return (
            <TouchableOpacity
              key={meal}
              style={styles.quickCard}
              onPress={() => handleQuickAdd(meal)}
              activeOpacity={0.7}
            >
              <View style={styles.quickCardTop}>
                <Text style={styles.quickMealName}>
                  {meal.charAt(0).toUpperCase() + meal.slice(1)}
                </Text>
                <PlusCircle size={18} color="#10B981" />
              </View>
              <Text style={styles.quickMealSub}>
                {count > 0 ? `${count} items logged` : 'Tap to add food'}
              </Text>
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
    backgroundColor: '#090D16',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  greeting: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  userName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#F8FAFC',
    marginTop: 2,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10B981',
  },
  heroCard: {
    backgroundColor: '#131B2E',
    borderRadius: 20,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
    alignItems: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickCard: {
    flex: 1,
    minWidth: '46%',
    backgroundColor: '#131B2E',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  quickCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quickMealName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  quickMealSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
});
