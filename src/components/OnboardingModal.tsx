import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Sparkles, ArrowRight, Check } from 'lucide-react-native';
import { Gender, ActivityLevel, FitnessGoal, UserProfile } from '../types';
import { calculateTargets } from '../utils/calculator';
import { theme } from '../theme';
import * as Haptics from 'expo-haptics';

interface OnboardingModalProps {
  onComplete: (profile: UserProfile) => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [gender, setGender] = useState<Gender>('male');
  const [age, setAge] = useState('26');
  const [weightKg, setWeightKg] = useState('75');
  const [heightCm, setHeightCm] = useState('178');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderate');
  const [goal, setGoal] = useState<FitnessGoal>('fat_loss_moderate');

  const numWeight = Math.max(30, Math.min(300, parseFloat(weightKg) || 75));
  const numHeight = Math.max(100, Math.min(250, parseFloat(heightCm) || 178));
  const numAge = Math.max(14, Math.min(100, parseInt(age, 10) || 26));

  const targets = calculateTargets(gender, numWeight, numHeight, numAge, activityLevel, goal);

  const handleFinish = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    const profile: UserProfile = {
      name: name.trim() || 'Champion',
      age: numAge,
      gender,
      weightKg: numWeight,
      heightCm: numHeight,
      activityLevel,
      goal,
      waterTargetGlasses: 8,
      isOnboarded: true,
      ...targets,
    };
    onComplete(profile);
  };

  const activityOptions: { key: ActivityLevel; label: string; desc: string }[] = [
    { key: 'sedentary', label: 'Sedentary', desc: 'Little/no exercise, desk job' },
    { key: 'light', label: 'Lightly Active', desc: 'Light workouts 1-3 days/wk' },
    { key: 'moderate', label: 'Moderately Active', desc: 'Exercise 3-5 days/wk' },
    { key: 'very_active', label: 'Very Active', desc: 'Hard training 6-7 days/wk' },
  ];

  const goalOptions: { key: FitnessGoal; label: string; desc: string }[] = [
    { key: 'fat_loss_aggressive', label: 'Aggressive Fat Loss', desc: '-500 kcal deficit' },
    { key: 'fat_loss_moderate', label: 'Steady Fat Loss', desc: '-300 kcal sustainable deficit' },
    { key: 'maintenance', label: 'Maintain Weight', desc: 'Healthy body recomposition' },
    { key: 'lean_bulk', label: 'Lean Bulk', desc: '+250 kcal controlled surplus' },
    { key: 'muscle_gain', label: 'Muscle Gain', desc: '+450 kcal muscle building' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Step Indicator */}
        <View style={styles.stepHeader}>
          <View style={styles.badge}>
            <Sparkles size={14} color={theme.colors.primary} />
            <Text style={styles.badgeText}>FitTrack Setup</Text>
          </View>
          <Text style={styles.stepCounter}>Step {step} of 3</Text>
        </View>

        {/* STEP 1: Basic Info & Body */}
        {step === 1 && (
          <View style={styles.stepContainer}>
            <Text style={styles.title}>Welcome! Let's get to know you.</Text>
            <Text style={styles.subtitle}>
              We calibrate your precise metabolic calorie targets using the Mifflin-St Jeor equation.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Your Name</Text>
              <TextInput
                style={styles.input}
                placeholder="What should we call you?"
                placeholderTextColor={theme.colors.textMuted}
                value={name}
                onChangeText={setName}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Biological Sex</Text>
              <View style={styles.genderRow}>
                {(['male', 'female'] as Gender[]).map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={[styles.genderBtn, gender === g && styles.genderBtnActive]}
                    onPress={() => setGender(g)}
                  >
                    <Text style={[styles.genderText, gender === g && styles.genderTextActive]}>
                      {g.charAt(0).toUpperCase() + g.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Weight (kg)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={weightKg}
                  onChangeText={setWeightKg}
                  placeholder="75"
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Height (cm)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={heightCm}
                  onChangeText={setHeightCm}
                  placeholder="178"
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Age</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={age}
                  onChangeText={setAge}
                  placeholder="26"
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>
            </View>

            <TouchableOpacity style={styles.nextBtn} onPress={() => setStep(2)}>
              <Text style={styles.nextBtnText}>Continue</Text>
              <ArrowRight size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}

        {/* STEP 2: Activity & Goal */}
        {step === 2 && (
          <View style={styles.stepContainer}>
            <Text style={styles.title}>Activity & Goal</Text>
            <Text style={styles.subtitle}>Select your routine to calculate daily expenditure.</Text>

            <Text style={styles.sectionHeader}>Activity Level</Text>
            {activityOptions.map((act) => (
              <TouchableOpacity
                key={act.key}
                style={[styles.cardOption, activityLevel === act.key && styles.cardOptionActive]}
                onPress={() => setActivityLevel(act.key)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionTitle}>{act.label}</Text>
                  <Text style={styles.optionDesc}>{act.desc}</Text>
                </View>
                {activityLevel === act.key && <Check size={18} color={theme.colors.primary} />}
              </TouchableOpacity>
            ))}

            <Text style={[styles.sectionHeader, { marginTop: 14 }]}>Your Target Goal</Text>
            {goalOptions.map((g) => (
              <TouchableOpacity
                key={g.key}
                style={[styles.cardOption, goal === g.key && styles.cardOptionActive]}
                onPress={() => setGoal(g.key)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionTitle}>{g.label}</Text>
                  <Text style={styles.optionDesc}>{g.desc}</Text>
                </View>
                {goal === g.key && <Check size={18} color={theme.colors.primary} />}
              </TouchableOpacity>
            ))}

            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.backBtn} onPress={() => setStep(1)}>
                <Text style={styles.backBtnText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.nextBtn, { flex: 2 }]} onPress={() => setStep(3)}>
                <Text style={styles.nextBtnText}>See Your Target</Text>
                <ArrowRight size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* STEP 3: Target Preview & Confirmation */}
        {step === 3 && (
          <View style={styles.stepContainer}>
            <Text style={styles.title}>You're All Set!</Text>
            <Text style={styles.subtitle}>Here is your personalized daily nutritional formula:</Text>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>DAILY CALORIE TARGET</Text>
              <Text style={styles.summaryValue}>{targets.targetCalories} kcal</Text>
              <Text style={styles.summarySub}>
                BMR: {targets.bmr} kcal • TDEE: {targets.tdee} kcal
              </Text>

              <View style={styles.macroSplitRow}>
                <View style={styles.macroSplitItem}>
                  <Text style={[styles.macroSplitVal, { color: theme.colors.amber }]}>
                    {targets.targetProtein}g
                  </Text>
                  <Text style={styles.macroSplitLabel}>Protein</Text>
                </View>
                <View style={styles.macroSplitItem}>
                  <Text style={[styles.macroSplitVal, { color: theme.colors.cyan }]}>
                    {targets.targetCarbs}g
                  </Text>
                  <Text style={styles.macroSplitLabel}>Carbs</Text>
                </View>
                <View style={styles.macroSplitItem}>
                  <Text style={[styles.macroSplitVal, { color: theme.colors.pink }]}>
                    {targets.targetFat}g
                  </Text>
                  <Text style={styles.macroSplitLabel}>Fat</Text>
                </View>
              </View>
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.backBtn} onPress={() => setStep(2)}>
                <Text style={styles.backBtnText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.nextBtn, { flex: 2 }]} onPress={handleFinish}>
                <Text style={styles.nextBtnText}>Start Tracking</Text>
                <Check size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  stepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.radius.full,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  stepCounter: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  stepContainer: {
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: 8,
  },
  inputGroup: {
    marginBottom: 10,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    borderRadius: theme.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: theme.colors.textPrimary,
    fontSize: 15,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 10,
  },
  genderBtn: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    borderRadius: theme.radius.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  genderBtnActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight,
  },
  genderText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  genderTextActive: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 6,
  },
  cardOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    borderRadius: theme.radius.md,
    padding: 12,
  },
  cardOptionActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  optionDesc: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  summaryCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    alignItems: 'center',
    marginVertical: 12,
  },
  summaryTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textMuted,
    letterSpacing: 1,
  },
  summaryValue: {
    fontSize: 36,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    marginVertical: 4,
  },
  summarySub: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 16,
  },
  macroSplitRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: theme.colors.surfaceBorder,
    paddingTop: 14,
  },
  macroSplitItem: {
    alignItems: 'center',
  },
  macroSplitVal: {
    fontSize: 20,
    fontWeight: '800',
  },
  macroSplitLabel: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  backBtn: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    borderRadius: theme.radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  nextBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
  },
  nextBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
