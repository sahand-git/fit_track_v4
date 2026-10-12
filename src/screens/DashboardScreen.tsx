import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity
} from 'react-native';
import { AppText as Text } from '../components/AppText';
import { Plus, ChevronRight, Utensils, CheckCircle2, Circle, Pill, UserRound } from 'lucide-react-native';
import { UserProfile, DailyLog, MealType, SupplementCheck, SupplementRoutineItem } from '../types';
import { CalorieRing } from '../components/CalorieRing';
import { MacroCards } from '../components/MacroCards';
import { WaterTracker } from '../components/WaterTracker';
import { theme } from '../theme';
import * as Haptics from 'expo-haptics';
import { useLanguage } from '../i18n/I18nContext';
import { formatDisplayDate, getTodayDateString } from '../utils/dateUtils';
import { translate } from '../i18n/strings';

interface DashboardScreenProps {
  profile: UserProfile;
  log: DailyLog;
  onUpdateWater: (delta: number) => void;
  onNavigateToMeals: (targetMeal?: MealType) => void;
  supplementRoutine: SupplementRoutineItem[];
  supplementChecks: SupplementCheck[];
  onToggleSupplement: (id: string, taken: boolean) => void;
  onOpenSupplements: () => void;
  onOpenProfile: () => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  profile,
  log,
  onUpdateWater,
  onNavigateToMeals,
  supplementRoutine,
  supplementChecks,
  onToggleSupplement,
  onOpenSupplements,
  onOpenProfile,
}) => {
  const language = useLanguage();
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

  const todayLabel = formatDisplayDate(log.date, language);
  const translateText = (value: string) => translate(language, value);
  const takenIds = new Set(supplementChecks.filter(item => item.taken).map(item => item.itemId));
  const isFuture = log.date > getTodayDateString();

  const handleQuickAdd = (meal: MealType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onNavigateToMeals(meal);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Editorial Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.dateLabel}>{todayLabel}</Text>
          <Text style={styles.screenTitle}>Nutrition</Text>
        </View>

        <TouchableOpacity
          style={styles.profileButton}
          onPress={onOpenProfile}
          activeOpacity={0.8}
          accessibilityLabel={translateText('Profile')}
          accessibilityRole="button"
        >
          <UserRound size={20} color={theme.colors.textPrimary} />
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

      {supplementRoutine.length === 0 ? (
        <TouchableOpacity style={styles.vitaminEmptyRow} onPress={onOpenSupplements} activeOpacity={0.75} accessibilityRole="button" accessibilityLabel={translateText('Track vitamins & supplements')}>
          <View style={styles.vitaminIcon}><Pill size={18} color={theme.colors.primary} /></View>
          <Text style={styles.vitaminEmptyLabel}>Track vitamins & supplements</Text>
          <ChevronRight size={17} color={theme.colors.textMuted} />
        </TouchableOpacity>
      ) : (
        <View style={styles.vitaminCard}>
          <View style={styles.vitaminHeader}>
            <View style={styles.vitaminTitleGroup}>
              <View style={styles.vitaminIcon}><Pill size={18} color={theme.colors.primary} /></View>
              <View>
                <Text style={styles.vitaminTitle}>Vitamins & supplements</Text>
                <Text style={styles.vitaminCount}>{supplementRoutine.filter(item => takenIds.has(item.id)).length} {translateText('of')} {supplementRoutine.length} {translateText('taken today')}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onOpenSupplements} accessibilityRole="button" accessibilityLabel={translateText('Manage vitamins')}>
              <Text style={styles.manageLink}>Manage</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.vitaminList}>
            {supplementRoutine.map(item => {
              const taken = takenIds.has(item.id);
              return (
                <TouchableOpacity key={item.id} style={styles.vitaminRow} onPress={() => onToggleSupplement(item.id, !taken)} disabled={isFuture} activeOpacity={0.7} accessibilityRole="checkbox" accessibilityState={{ checked: taken, disabled: isFuture }} accessibilityLabel={`${translateText(taken ? 'Taken' : 'Mark as taken')}: ${item.name}`}>
                  {taken ? <CheckCircle2 size={20} color={theme.colors.primary} /> : <Circle size={20} color={theme.colors.textMuted} />}
                  <Text style={[styles.vitaminItemName, taken && styles.vitaminItemTaken]}>{item.name}</Text>
                  {item.dose ? <Text style={styles.vitaminDose}>{item.dose}</Text> : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

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
    paddingBottom: 184,
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
  profileButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, ...theme.shadow.subtle },
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
  vitaminEmptyRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, paddingHorizontal: 14, paddingVertical: 13, borderWidth: 1, borderColor: theme.colors.border, marginTop: 12, ...theme.shadow.subtle },
  vitaminIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primaryLight },
  vitaminEmptyLabel: { flex: 1, color: theme.colors.textPrimary, fontWeight: '700', fontSize: 14 },
  vitaminCard: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, padding: 14, borderWidth: 1, borderColor: theme.colors.border, marginTop: 12, ...theme.shadow.subtle },
  vitaminHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 },
  vitaminTitleGroup: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  vitaminTitle: { color: theme.colors.textPrimary, fontWeight: '700', fontSize: 14 },
  vitaminCount: { color: theme.colors.textMuted, fontSize: 11, marginTop: 2 },
  manageLink: { color: theme.colors.primary, fontSize: 12, fontWeight: '700' },
  vitaminList: { gap: 2 },
  vitaminRow: { flexDirection: 'row', alignItems: 'center', gap: 9, minHeight: 42, paddingHorizontal: 2 },
  vitaminItemName: { flex: 1, color: theme.colors.textPrimary, fontSize: 13, fontWeight: '600' },
  vitaminItemTaken: { color: theme.colors.textMuted, textDecorationLine: 'line-through' },
  vitaminDose: { color: theme.colors.textMuted, fontSize: 11 },
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
