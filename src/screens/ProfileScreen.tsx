import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Check } from 'lucide-react-native';
import { UserProfile, Gender, ActivityLevel, FitnessGoal } from '../types';
import { calculateTargets } from '../utils/calculator';
import { theme } from '../theme';
import * as Haptics from 'expo-haptics';

interface ProfileScreenProps {
  profile: UserProfile;
  onSaveProfile: (profile: UserProfile) => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  profile,
  onSaveProfile,
}) => {
  const [name, setName] = useState(profile.name);
  const [age, setAge] = useState(profile.age.toString());
  const [gender, setGender] = useState<Gender>(profile.gender);
  const [weightKg, setWeightKg] = useState(profile.weightKg.toString());
  const [heightCm, setHeightCm] = useState(profile.heightCm.toString());
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(profile.activityLevel);
  const [goal, setGoal] = useState<FitnessGoal>(profile.goal);

  // Live preview of calculated targets (bounded to safe human ranges)
  const rawWeight = parseFloat(weightKg);
  const numericWeight = isNaN(rawWeight) || rawWeight <= 0 ? 75 : Math.max(30, Math.min(300, rawWeight));
  const rawHeight = parseFloat(heightCm);
  const numericHeight = isNaN(rawHeight) || rawHeight <= 0 ? 178 : Math.max(100, Math.min(250, rawHeight));
  const rawAge = parseInt(age, 10);
  const numericAge = isNaN(rawAge) || rawAge <= 0 ? 26 : Math.max(14, Math.min(100, rawAge));

  const liveTargets = calculateTargets(
    gender,
    numericWeight,
    numericHeight,
    numericAge,
    activityLevel,
    goal
  );

  const handleSave = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    const updated: UserProfile = {
      ...profile,
      name: name.trim() || 'Athlete',
      age: numericAge,
      gender,
      weightKg: numericWeight,
      heightCm: numericHeight,
      activityLevel,
      goal,
      isOnboarded: true,
      ...liveTargets,
    };
    onSaveProfile(updated);
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.screenTitle}>Profile & Goals</Text>
      <Text style={styles.screenSubtitle}>
        Calibrated with the Mifflin-St Jeor metabolic formula.
      </Text>

      {/* Daily Target Estimation Summary Card */}
      <View style={styles.targetPreviewCard}>
        <Text style={styles.previewTitle}>Estimated Daily Target</Text>
        <Text style={styles.previewKcal}>{liveTargets.targetCalories} kcal</Text>
        <Text style={styles.previewMeta}>
          BMR: {liveTargets.bmr} kcal • TDEE: {liveTargets.tdee} kcal
        </Text>

        <View style={styles.macroStrip}>
          <View style={styles.macroStripItem}>
            <Text style={[styles.macroVal, { color: theme.colors.macroProtein }]}>
              {liveTargets.targetProtein}g
            </Text>
            <Text style={styles.macroLabel}>Protein</Text>
          </View>
          <View style={styles.macroDivider} />
          <View style={styles.macroStripItem}>
            <Text style={[styles.macroVal, { color: theme.colors.macroCarbs }]}>
              {liveTargets.targetCarbs}g
            </Text>
            <Text style={styles.macroLabel}>Carbs</Text>
          </View>
          <View style={styles.macroDivider} />
          <View style={styles.macroStripItem}>
            <Text style={[styles.macroVal, { color: theme.colors.macroFat }]}>
              {liveTargets.targetFat}g
            </Text>
            <Text style={styles.macroLabel}>Fat</Text>
          </View>
        </View>
      </View>

      {/* Body Stats Section */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Body Measurements</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor={theme.colors.textMuted}
          />
        </View>

        <View style={styles.rowInputs}>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.inputLabel}>Weight (kg)</Text>
            <TextInput
              style={styles.input}
              value={weightKg}
              onChangeText={setWeightKg}
              keyboardType="numeric"
              placeholder="75"
              placeholderTextColor={theme.colors.textMuted}
            />
          </View>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.inputLabel}>Height (cm)</Text>
            <TextInput
              style={styles.input}
              value={heightCm}
              onChangeText={setHeightCm}
              keyboardType="numeric"
              placeholder="178"
              placeholderTextColor={theme.colors.textMuted}
            />
          </View>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.inputLabel}>Age</Text>
            <TextInput
              style={styles.input}
              value={age}
              onChangeText={setAge}
              keyboardType="numeric"
              placeholder="26"
              placeholderTextColor={theme.colors.textMuted}
            />
          </View>
        </View>

        {/* Biological Sex Toggle */}
        <Text style={styles.inputLabel}>Biological Sex</Text>
        <View style={styles.genderRow}>
          {(['male', 'female'] as Gender[]).map((g) => (
            <TouchableOpacity
              key={g}
              style={[styles.genderBtn, gender === g && styles.genderBtnActive]}
              onPress={() => setGender(g)}
              activeOpacity={0.7}
            >
              <Text style={[styles.genderBtnText, gender === g && styles.genderBtnTextActive]}>
                {g.charAt(0).toUpperCase() + g.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Activity Level Selector */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Activity Level</Text>
        {activityOptions.map((act) => (
          <TouchableOpacity
            key={act.key}
            style={[styles.optionRow, activityLevel === act.key && styles.optionRowActive]}
            onPress={() => setActivityLevel(act.key)}
            activeOpacity={0.7}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.optionLabel}>{act.label}</Text>
              <Text style={styles.optionDesc}>{act.desc}</Text>
            </View>
            {activityLevel === act.key && <Check size={16} color={theme.colors.primary} />}
          </TouchableOpacity>
        ))}
      </View>

      {/* Fitness Goal Selector */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Nutritional Goal</Text>
        {goalOptions.map((g) => (
          <TouchableOpacity
            key={g.key}
            style={[styles.optionRow, goal === g.key && styles.optionRowActive]}
            onPress={() => setGoal(g.key)}
            activeOpacity={0.7}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.optionLabel}>{g.label}</Text>
              <Text style={styles.optionDesc}>{g.desc}</Text>
            </View>
            {goal === g.key && <Check size={16} color={theme.colors.primary} />}
          </TouchableOpacity>
        ))}
      </View>

      {/* Save Button */}
      <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.85}>
        <Text style={styles.saveBtnText}>Save Targets</Text>
      </TouchableOpacity>
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
    gap: 16,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    letterSpacing: -0.4,
  },
  screenSubtitle: {
    fontSize: 13,
    color: theme.colors.textMuted,
    marginTop: -8,
  },
  targetPreviewCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    ...theme.shadow.subtle,
  },
  previewTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  previewKcal: {
    fontSize: 34,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginVertical: 4,
    letterSpacing: -0.6,
  },
  previewMeta: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 14,
  },
  macroStrip: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 14,
  },
  macroStripItem: {
    alignItems: 'center',
  },
  macroVal: {
    fontSize: 17,
    fontWeight: '700',
  },
  macroLabel: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  macroDivider: {
    width: 1,
    backgroundColor: theme.colors.border,
  },
  section: {
    gap: 10,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  inputGroup: {
    gap: 6,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 10,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    color: theme.colors.textPrimary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 10,
  },
  genderBtn: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 10,
    alignItems: 'center',
  },
  genderBtnActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight,
  },
  genderBtnText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  genderBtnTextActive: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  optionRowActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  optionDesc: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  saveBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
    ...theme.shadow.subtle,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textInverted,
  },
});
