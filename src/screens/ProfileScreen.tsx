import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { User, Activity, Target, Save, Check } from 'lucide-react-native';
import { UserProfile, Gender, ActivityLevel, FitnessGoal } from '../types';
import {
  calculateTargets,
  ACTIVITY_MULTIPLIERS,
  GOAL_ADJUSTMENTS,
} from '../utils/calculator';
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

  // Live preview of calculated targets
  const numericWeight = parseFloat(weightKg) || 75;
  const numericHeight = parseFloat(heightCm) || 178;
  const numericAge = parseInt(age, 10) || 26;

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
      name,
      age: numericAge,
      gender,
      weightKg: numericWeight,
      heightCm: numericHeight,
      activityLevel,
      goal,
      ...liveTargets,
    };
    onSaveProfile(updated);
  };

  const activityOptions: { key: ActivityLevel; label: string; desc: string }[] = [
    { key: 'sedentary', label: 'Sedentary', desc: 'Little to no exercise (1.2x)' },
    { key: 'light', label: 'Lightly Active', desc: 'Exercise 1-3 days/wk (1.375x)' },
    { key: 'moderate', label: 'Moderately Active', desc: 'Exercise 3-5 days/wk (1.55x)' },
    { key: 'very_active', label: 'Very Active', desc: 'Hard training 6-7 days/wk (1.725x)' },
    { key: 'athlete', label: 'Athlete', desc: 'Heavy sports or physical job (1.9x)' },
  ];

  const goalOptions: { key: FitnessGoal; label: string; desc: string }[] = [
    { key: 'fat_loss_aggressive', label: 'Aggressive Fat Loss', desc: '-500 kcal/day' },
    { key: 'fat_loss_moderate', label: 'Steady Fat Loss', desc: '-300 kcal/day' },
    { key: 'maintenance', label: 'Maintain Weight', desc: 'Recomposition / 0 delta' },
    { key: 'lean_bulk', label: 'Lean Bulk', desc: '+250 kcal/day' },
    { key: 'muscle_gain', label: 'Muscle Gain', desc: '+450 kcal/day' },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.screenTitle}>Profile & Target Setup</Text>
      <Text style={styles.screenSubtitle}>
        Mifflin-St Jeor metabolic calorie budget and nutrient calculation
      </Text>

      {/* Calculated Target Summary Card */}
      <View style={styles.targetPreviewCard}>
        <Text style={styles.previewTitle}>Calculated Daily Target & Nutrients</Text>
        <View style={styles.previewGrid}>
          <View style={styles.previewBox}>
            <Text style={styles.previewBoxLabel}>Daily Target</Text>
            <Text style={styles.previewBoxValue}>{liveTargets.targetCalories}</Text>
            <Text style={styles.previewBoxUnit}>kcal</Text>
          </View>
          <View style={styles.previewBox}>
            <Text style={styles.previewBoxLabel}>Protein</Text>
            <Text style={[styles.previewBoxValue, { color: '#F59E0B' }]}>
              {liveTargets.targetProtein}
            </Text>
            <Text style={styles.previewBoxUnit}>g</Text>
          </View>
          <View style={styles.previewBox}>
            <Text style={styles.previewBoxLabel}>Carbohydrates</Text>
            <Text style={[styles.previewBoxValue, { color: '#06B6D4' }]}>
              {liveTargets.targetCarbs}
            </Text>
            <Text style={styles.previewBoxUnit}>g</Text>
          </View>
          <View style={styles.previewBox}>
            <Text style={styles.previewBoxLabel}>Fat</Text>
            <Text style={[styles.previewBoxValue, { color: '#EC4899' }]}>
              {liveTargets.targetFat}
            </Text>
            <Text style={styles.previewBoxUnit}>g</Text>
          </View>
        </View>
        <Text style={styles.bmrFootnote}>
          BMR: {liveTargets.bmr} kcal • TDEE: {liveTargets.tdee} kcal
        </Text>
      </View>

      {/* Biometric Inputs */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionTitleRow}>
          <User size={18} color="#10B981" />
          <Text style={styles.sectionTitle}>Body Stats</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor="#64748B"
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
              placeholderTextColor="#64748B"
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
              placeholderTextColor="#64748B"
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
              placeholderTextColor="#64748B"
            />
          </View>
        </View>

        {/* Gender Toggle */}
        <Text style={styles.inputLabel}>Biological Gender</Text>
        <View style={styles.genderRow}>
          {(['male', 'female'] as Gender[]).map((g) => (
            <TouchableOpacity
              key={g}
              style={[styles.genderBtn, gender === g && styles.genderBtnActive]}
              onPress={() => setGender(g)}
            >
              <Text style={[styles.genderBtnText, gender === g && styles.genderBtnTextActive]}>
                {g.charAt(0).toUpperCase() + g.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Activity Level Selector */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionTitleRow}>
          <Activity size={18} color="#06B6D4" />
          <Text style={styles.sectionTitle}>Activity Level</Text>
        </View>
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
            {activityLevel === act.key && <Check size={18} color="#10B981" />}
          </TouchableOpacity>
        ))}
      </View>

      {/* Fitness Goal Selector */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionTitleRow}>
          <Target size={18} color="#F59E0B" />
          <Text style={styles.sectionTitle}>Fitness Goal</Text>
        </View>
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
            {goal === g.key && <Check size={18} color="#10B981" />}
          </TouchableOpacity>
        ))}
      </View>

      {/* Save Button */}
      <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.8}>
        <Save size={18} color="#FFFFFF" />
        <Text style={styles.saveBtnText}>Save & Apply Targets</Text>
      </TouchableOpacity>
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
    paddingBottom: 110,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  screenSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
    marginBottom: 16,
  },
  targetPreviewCard: {
    backgroundColor: '#131B2E',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 16,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 12,
  },
  previewGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  previewBox: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  previewBoxLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 4,
  },
  previewBoxValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  previewBoxUnit: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  bmrFootnote: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 12,
  },
  sectionCard: {
    backgroundColor: '#131B2E',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 16,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  inputGroup: {
    marginBottom: 12,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 10,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
    color: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 6,
  },
  genderBtn: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
    paddingVertical: 10,
    alignItems: 'center',
  },
  genderBtnActive: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  genderBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
  },
  genderBtnTextActive: {
    color: '#10B981',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  optionRowActive: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  optionDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  saveBtn: {
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 6,
    marginBottom: 30,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
