import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  SafeAreaView
} from 'react-native';
import { AppText as Text } from './AppText';
import { ArrowRight, Check } from 'lucide-react-native';
import { Gender, ActivityLevel, FitnessGoal, UserProfile, AppLanguage } from '../types';
import { languageNames } from '../i18n/strings';
import { calculateTargets } from '../utils/calculator';
import { theme } from '../theme';
import * as Haptics from 'expo-haptics';
import { useLanguage } from '../i18n/I18nContext';

interface OnboardingModalProps {
  onComplete: (profile: UserProfile) => void;
  onLanguageChange: (language: AppLanguage) => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ onComplete, onLanguageChange }) => {
  const currentLanguage = useLanguage();
  const [step, setStep] = useState(1);
  const [language, setLanguage] = useState<AppLanguage>('en');
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
      language,
      ...targets,
    };
    onComplete(profile);
  };

  const activityOptions: { key: ActivityLevel; label: string; desc: string }[] = [
    { key: 'sedentary', label: 'Sedentary', desc: 'Desk job, little/no exercise' },
    { key: 'light', label: 'Lightly Active', desc: 'Light workouts 1–3 days/wk' },
    { key: 'moderate', label: 'Moderately Active', desc: 'Exercise 3–5 days/wk' },
    { key: 'very_active', label: 'Very Active', desc: 'Hard training 6–7 days/wk' },
  ];

  const goalOptions: { key: FitnessGoal; label: string; desc: string }[] = [
    { key: 'fat_loss_aggressive', label: 'Aggressive Fat Loss', desc: '−500 kcal daily deficit' },
    { key: 'fat_loss_moderate', label: 'Steady Fat Loss', desc: '−300 kcal sustainable deficit' },
    { key: 'maintenance', label: 'Maintain Weight', desc: 'Healthy body recomposition' },
    { key: 'lean_bulk', label: 'Lean Bulk', desc: '+250 kcal controlled surplus' },
    { key: 'muscle_gain', label: 'Muscle Gain', desc: '+450 kcal muscle building' },
  ];

  return (
    <SafeAreaView style={[styles.container, { direction: currentLanguage === 'en' ? 'ltr' : 'rtl' }]}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Step Indicator */}
        <View style={styles.stepHeader}>
          <Text style={styles.badgeText}>Welcome to FitTrack</Text>
          <Text style={styles.stepCounter}>Step {step} of 3</Text>
        </View>
        <View style={styles.languageBlock}>
          <Text style={styles.languageLabel}>Language</Text>
          <View style={styles.languageRow}>
            {(['en', 'ar', 'ckb'] as AppLanguage[]).map(option => (
              <TouchableOpacity key={option} onPress={() => { setLanguage(option); onLanguageChange(option); }} style={[styles.languageChip, language === option && styles.languageChipActive]}>
                <Text style={[styles.languageChipText, language === option && styles.languageChipTextActive]}>{languageNames[option]}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* STEP 1: Body Measurements */}
        {step === 1 && (
          <View style={styles.stepContainer}>
            <Text style={styles.title}>Let's set your baseline</Text>
            <Text style={styles.subtitle}>
              We use the Mifflin-St Jeor equation to estimate your basal metabolic rate and daily calorie needs.
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
              <ArrowRight size={16} color={theme.colors.textInverted} />
            </TouchableOpacity>
          </View>
        )}

        {/* STEP 2: Routine & Target */}
        {step === 2 && (
          <View style={styles.stepContainer}>
            <Text style={styles.title}>Your Routine & Goal</Text>
            <Text style={styles.subtitle}>
              Activity determines your total energy expenditure. Goals shape your caloric budget.
            </Text>

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
                {activityLevel === act.key && <Check size={16} color={theme.colors.primary} />}
              </TouchableOpacity>
            ))}

            <Text style={[styles.sectionHeader, { marginTop: 12 }]}>Fitness Goal</Text>
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
                {goal === g.key && <Check size={16} color={theme.colors.primary} />}
              </TouchableOpacity>
            ))}

            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.backBtn} onPress={() => setStep(1)}>
                <Text style={styles.backBtnText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.nextBtn, { flex: 2 }]} onPress={() => setStep(3)}>
                <Text style={styles.nextBtnText}>Review Plan</Text>
                <ArrowRight size={16} color={theme.colors.textInverted} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* STEP 3: Plan Review */}
        {step === 3 && (
          <View style={styles.stepContainer}>
            <Text style={styles.title}>Your Daily Budget</Text>
            <Text style={styles.subtitle}>
              Here is your calculated nutrition estimate based on your measurements:
            </Text>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Estimated Daily Target</Text>
              <Text style={styles.summaryValue}>{targets.targetCalories} kcal</Text>
              <Text style={styles.summarySub}>
                BMR: {targets.bmr} kcal • TDEE: {targets.tdee} kcal
              </Text>

              <View style={styles.macroSplitRow}>
                <View style={styles.macroSplitItem}>
                  <Text style={[styles.macroSplitVal, { color: theme.colors.macroProtein }]}>
                    {targets.targetProtein}g
                  </Text>
                  <Text style={styles.macroSplitLabel}>Protein</Text>
                </View>
                <View style={styles.macroDivider} />
                <View style={styles.macroSplitItem}>
                  <Text style={[styles.macroSplitVal, { color: theme.colors.macroCarbs }]}>
                    {targets.targetCarbs}g
                  </Text>
                  <Text style={styles.macroSplitLabel}>Carbs</Text>
                </View>
                <View style={styles.macroDivider} />
                <View style={styles.macroSplitItem}>
                  <Text style={[styles.macroSplitVal, { color: theme.colors.macroFat }]}>
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
                <Check size={16} color={theme.colors.textInverted} />
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
    padding: theme.spacing.lg,
    paddingBottom: 40,
  },
  stepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  stepCounter: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.textMuted,
  },
  languageBlock: { gap: 7, marginBottom: 12 },
  languageLabel: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: '600' },
  languageRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  languageChip: { paddingHorizontal: 11, paddingVertical: 8, borderRadius: theme.radius.full, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
  languageChipActive: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight },
  languageChipText: { color: theme.colors.textSecondary, fontSize: 11, fontWeight: '600' },
  languageChipTextActive: { color: theme.colors.primary },
  stepContainer: {
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: 4,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
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
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingVertical: 10,
    alignItems: 'center',
  },
  genderBtnActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight,
  },
  genderText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  genderTextActive: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginTop: 6,
  },
  cardOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: 12,
  },
  cardOptionActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  optionDesc: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  summaryCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    marginVertical: 10,
    ...theme.shadow.subtle,
  },
  summaryTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  summaryValue: {
    fontSize: 34,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginVertical: 4,
    letterSpacing: -0.6,
  },
  summarySub: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 14,
  },
  macroSplitRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 14,
  },
  macroSplitItem: {
    alignItems: 'center',
  },
  macroSplitVal: {
    fontSize: 18,
    fontWeight: '700',
  },
  macroSplitLabel: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  macroDivider: {
    width: 1,
    backgroundColor: theme.colors.border,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  backBtn: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  nextBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    ...theme.shadow.subtle,
  },
  nextBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textInverted,
  },
});
