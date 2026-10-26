import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText as Text } from './AppText';
import { ArrowRight, Check } from 'lucide-react-native';
import { Gender, ActivityLevel, FitnessGoal, UserProfile, AppLanguage } from '../types';
import { languageNames, translate } from '../i18n/strings';
import { calculateTargets } from '../utils/calculator';
import { formatKcal } from '../utils/formatKcal';
import { theme } from '../theme';
import * as Haptics from 'expo-haptics';
import { useLanguage } from '../i18n/I18nContext';
import { AiSetupWizard } from './AiSetupWizardModal';

interface OnboardingModalProps {
  onComplete: (profile: UserProfile) => void;
  onLanguageChange: (language: AppLanguage) => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ onComplete, onLanguageChange }) => {
  const currentLanguage = useLanguage();
  const [step, setStep] = useState(1);

  // Handle Android hardware back press during onboarding steps
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const onBackPress = () => {
      if (step > 1) {
        setStep((s) => s - 1);
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [step]);

  const [language, setLanguage] = useState<AppLanguage>(currentLanguage || 'en');
  const t = (str: string) => translate(language, str);
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
      waterTargetGlasses: Math.max(6, Math.min(16, Math.round((numWeight * 35) / 250))),
      isOnboarded: true,
      language,
      enableCrashReporting: false,
      ...targets,
    };
    onComplete(profile);
  };

  const activityOptions: { key: ActivityLevel; label: string; desc: string }[] = [
    { key: 'sedentary', label: 'Sedentary', desc: 'Desk job, little to no exercise' },
    { key: 'light', label: 'Lightly Active', desc: 'Light exercise 1–3 days a week' },
    { key: 'moderate', label: 'Moderately Active', desc: 'Moderate training 3–5 days a week' },
    { key: 'very_active', label: 'Very Active', desc: 'Intense training 6–7 days a week' },
  ];

  const goalOptions: { key: FitnessGoal; label: string; desc: string }[] = [
    { key: 'fat_loss_aggressive', label: 'Aggressive Fat Loss', desc: '−500 kcal daily deficit' },
    { key: 'fat_loss_moderate', label: 'Steady Fat Loss', desc: '−300 kcal sustainable deficit' },
    { key: 'maintenance', label: 'Maintain Weight', desc: 'Energy balance & recomposition' },
    { key: 'lean_bulk', label: 'Lean Bulk', desc: '+250 kcal controlled surplus' },
    { key: 'muscle_gain', label: 'Muscle Gain', desc: '+450 kcal muscle building' },
  ];

  return (
    <SafeAreaView style={[styles.container, { direction: language === 'en' ? 'ltr' : 'rtl' }]}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Step Indicator */}
        <View style={styles.stepHeader}>
          <Text style={styles.badgeText}>{t('Welcome to FitTrack')}</Text>
          <Text style={styles.stepCounter}>{t('Step')} {step} {t('of')} 4</Text>
        </View>
        <View style={styles.languageBlock}>
          <Text style={styles.languageLabel}>{t('Language')}</Text>
          <View style={styles.languageRow}>
            {(['en', 'ar', 'ckb'] as AppLanguage[]).map(option => (
              <TouchableOpacity
                key={option}
                onPress={() => { setLanguage(option); onLanguageChange(option); }}
                style={[styles.languageChip, language === option && styles.languageChipActive]}
                accessibilityRole="button"
                accessibilityLabel={languageNames[option]}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Text style={[styles.languageChipText, language === option && styles.languageChipTextActive]}>{languageNames[option]}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* STEP 1: Body Measurements */}
        {step === 1 && (
          <View style={styles.stepContainer}>
            <Text style={styles.title}>{t('Let’s set your baseline')}</Text>
            <Text style={styles.subtitle}>
              {t('We use the Mifflin-St Jeor equation to estimate your basal metabolic rate and daily calorie needs.')}
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('Your Name')}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('What should we call you?')}
                placeholderTextColor={theme.colors.textMuted}
                value={name}
                onChangeText={setName}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('Biological Sex')}</Text>
              <View style={styles.genderRow}>
                {(['male', 'female'] as Gender[]).map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={[styles.genderBtn, gender === g && styles.genderBtnActive]}
                    onPress={() => setGender(g)}
                    accessibilityRole="button"
                    accessibilityLabel={g === 'male' ? t('Male') : t('Female')}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={[styles.genderText, gender === g && styles.genderTextActive]}>
                      {g === 'male' ? t('Male') : t('Female')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>{t('Weight (kg)')}</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={weightKg}
                  onChangeText={setWeightKg}
                  placeholder="70"
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>{t('Height (cm)')}</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={heightCm}
                  onChangeText={setHeightCm}
                  placeholder="175"
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>{t('Age')}</Text>
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

            <TouchableOpacity
              style={styles.nextBtn}
              onPress={() => setStep(2)}
              accessibilityRole="button"
              accessibilityLabel={t('Continue')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.nextBtnText}>{t('Continue')}</Text>
              <ArrowRight size={16} color={theme.colors.textInverted} />
            </TouchableOpacity>
          </View>
        )}

        {/* STEP 2: Routine & Target */}
        {step === 2 && (
          <View style={styles.stepContainer}>
            <Text style={styles.title}>{t('Your Routine & Goal')}</Text>
            <Text style={styles.subtitle}>
              {t('Activity determines your total energy expenditure. Goals shape your caloric budget.')}
            </Text>

            <Text style={styles.sectionHeader}>{t('Activity Level')}</Text>
            {activityOptions.map((act) => (
              <TouchableOpacity
                key={act.key}
                style={[styles.cardOption, activityLevel === act.key && styles.cardOptionActive]}
                onPress={() => setActivityLevel(act.key)}
                accessibilityRole="button"
                accessibilityLabel={`${t(act.label)}: ${t(act.desc)}`}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionTitle}>{t(act.label)}</Text>
                  <Text style={styles.optionDesc}>{t(act.desc)}</Text>
                </View>
                {activityLevel === act.key && <Check size={16} color={theme.colors.primary} />}
              </TouchableOpacity>
            ))}

            <Text style={[styles.sectionHeader, { marginTop: 12 }]}>{t('Fitness Goal')}</Text>
            {goalOptions.map((g) => (
              <TouchableOpacity
                key={g.key}
                style={[styles.cardOption, goal === g.key && styles.cardOptionActive]}
                onPress={() => setGoal(g.key)}
                accessibilityRole="button"
                accessibilityLabel={`${t(g.label)}: ${t(g.desc)}`}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionTitle}>{t(g.label)}</Text>
                  <Text style={styles.optionDesc}>{t(g.desc)}</Text>
                </View>
                {goal === g.key && <Check size={16} color={theme.colors.primary} />}
              </TouchableOpacity>
            ))}

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.backBtn}
                onPress={() => setStep(1)}
                accessibilityRole="button"
                accessibilityLabel={t('Back')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.backBtnText}>{t('Back')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.nextBtn, { flex: 2 }]}
                onPress={() => setStep(3)}
                accessibilityRole="button"
                accessibilityLabel={t('Review Plan')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.nextBtnText}>{t('Review Plan')}</Text>
                <ArrowRight size={16} color={theme.colors.textInverted} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* STEP 3: Plan Review */}
        {step === 3 && (
          <View style={styles.stepContainer}>
            <Text style={styles.title}>{t('Your Daily Budget')}</Text>
            <Text style={styles.subtitle}>
              {t('Here is your calculated nutrition estimate based on your measurements:')}
            </Text>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>{t('Estimated Daily Target')}</Text>
              <Text style={styles.summaryValue}>{formatKcal(targets.targetCalories, t)}</Text>
              <Text style={styles.summarySub}>
                {t('BMR')}: {formatKcal(targets.bmr, t)} • {t('TDEE')}: {formatKcal(targets.tdee, t)}
              </Text>

              <View style={styles.macroSplitRow}>
                <View style={styles.macroSplitItem}>
                  <Text style={[styles.macroSplitVal, { color: theme.colors.macroProtein }]}>
                    {targets.targetProtein}g
                  </Text>
                  <Text style={styles.macroSplitLabel}>{t('Protein')}</Text>
                </View>
                <View style={styles.macroDivider} />
                <View style={styles.macroSplitItem}>
                  <Text style={[styles.macroSplitVal, { color: theme.colors.macroCarbs }]}>
                    {targets.targetCarbs}g
                  </Text>
                  <Text style={styles.macroSplitLabel}>{t('Carbs')}</Text>
                </View>
                <View style={styles.macroDivider} />
                <View style={styles.macroSplitItem}>
                  <Text style={[styles.macroSplitVal, { color: theme.colors.macroFat }]}>
                    {targets.targetFat}g
                  </Text>
                  <Text style={styles.macroSplitLabel}>{t('Fat')}</Text>
                </View>
              </View>
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.backBtn}
                onPress={() => setStep(2)}
                accessibilityRole="button"
                accessibilityLabel={t('Back')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.backBtnText}>{t('Back')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.nextBtn, { flex: 2 }]}
                onPress={() => setStep(4)}
                accessibilityRole="button"
                accessibilityLabel={t('Next: AI Setup (Optional)')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.nextBtnText}>{t('Next: AI Setup (Optional)')}</Text>
                <ArrowRight size={16} color={theme.colors.textInverted} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* STEP 4: Optional AI Setup Wizard */}
        {step === 4 && (
          <View style={styles.stepContainer}>
            <AiSetupWizard
              isModal={false}
              isSkippable={true}
              onSkip={handleFinish}
              onComplete={handleFinish}
            />
            <View style={[styles.buttonRow, { marginTop: 8 }]}>
              <TouchableOpacity
                style={styles.backBtn}
                onPress={() => setStep(3)}
                accessibilityRole="button"
                accessibilityLabel={t('Back')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.backBtnText}>{t('Back')}</Text>
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
  consentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: 14,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginTop: 10,
    gap: 12,
  },
  consentRowActive: {
    borderColor: theme.colors.primary,
    backgroundColor: `${theme.colors.primary}0D`,
  },
  consentTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  consentDesc: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
    lineHeight: 16,
  },
});
