import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LayoutDashboard, UtensilsCrossed, User } from 'lucide-react-native';
import { UserProfile, DailyLog, LoggedMeal, MealType } from './src/types';
import {
  loadUserProfile,
  saveUserProfile,
  loadDailyLog,
  addMealToDay,
  removeMealFromDay,
  updateWater,
} from './src/storage/storage';
import { getDefaultProfile } from './src/utils/calculator';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { FoodLogScreen } from './src/screens/FoodLogScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import * as Haptics from 'expo-haptics';

type Tab = 'dashboard' | 'meals' | 'profile';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [profile, setProfile] = useState<UserProfile>(getDefaultProfile());
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [log, setLog] = useState<DailyLog>({
    date: new Date().toISOString().split('T')[0],
    meals: [],
    waterGlasses: 0,
    steps: 0,
  });
  const [initialMealForAdd, setInitialMealForAdd] = useState<MealType>('breakfast');

  // Load initial profile and daily log
  useEffect(() => {
    async function init() {
      const p = await loadUserProfile();
      setProfile(p);
      const l = await loadDailyLog(selectedDate);
      setLog(l);
    }
    init();
  }, []);

  // Reload log whenever date changes
  useEffect(() => {
    async function fetchDateLog() {
      const l = await loadDailyLog(selectedDate);
      setLog(l);
    }
    fetchDateLog();
  }, [selectedDate]);

  // Handlers
  const handleUpdateWater = async (delta: number) => {
    const updated = await updateWater(selectedDate, delta);
    setLog(updated);
  };

  const handleAddMeal = async (meal: LoggedMeal) => {
    const updated = await addMealToDay(selectedDate, meal);
    setLog(updated);
  };

  const handleRemoveMeal = async (mealId: string) => {
    const updated = await removeMealFromDay(selectedDate, mealId);
    setLog(updated);
  };

  const handleSaveProfile = async (newProfile: UserProfile) => {
    await saveUserProfile(newProfile);
    setProfile(newProfile);
    setActiveTab('dashboard');
  };

  const handleNavigateToMeals = (targetMeal?: MealType) => {
    if (targetMeal) setInitialMealForAdd(targetMeal);
    setActiveTab('meals');
  };

  const switchTab = (tab: Tab) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setActiveTab(tab);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* Main Screen Body */}
      <View style={styles.main}>
        {activeTab === 'dashboard' && (
          <DashboardScreen
            profile={profile}
            log={log}
            onUpdateWater={handleUpdateWater}
            onNavigateToMeals={handleNavigateToMeals}
          />
        )}
        {activeTab === 'meals' && (
          <FoodLogScreen
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            log={log}
            onAddMeal={handleAddMeal}
            onRemoveMeal={handleRemoveMeal}
            initialMealType={initialMealForAdd}
          />
        )}
        {activeTab === 'profile' && (
          <ProfileScreen profile={profile} onSaveProfile={handleSaveProfile} />
        )}
      </View>

      {/* Floating Bottom Navigation Dock */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={[styles.navBtn, activeTab === 'dashboard' && styles.navBtnActive]}
          onPress={() => switchTab('dashboard')}
          activeOpacity={0.7}
        >
          <LayoutDashboard
            size={22}
            color={activeTab === 'dashboard' ? '#10B981' : '#64748B'}
          />
          <Text
            style={[
              styles.navLabel,
              activeTab === 'dashboard' && styles.navLabelActive,
            ]}
          >
            Dashboard
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navBtn, activeTab === 'meals' && styles.navBtnActive]}
          onPress={() => switchTab('meals')}
          activeOpacity={0.7}
        >
          <UtensilsCrossed
            size={22}
            color={activeTab === 'meals' ? '#10B981' : '#64748B'}
          />
          <Text
            style={[styles.navLabel, activeTab === 'meals' && styles.navLabelActive]}
          >
            Food Log
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navBtn, activeTab === 'profile' && styles.navBtnActive]}
          onPress={() => switchTab('profile')}
          activeOpacity={0.7}
        >
          <User
            size={22}
            color={activeTab === 'profile' ? '#10B981' : '#64748B'}
          />
          <Text
            style={[
              styles.navLabel,
              activeTab === 'profile' && styles.navLabelActive,
            ]}
          >
            Profile
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090D16',
    paddingTop: Platform.OS === 'android' ? 30 : 0,
  },
  main: {
    flex: 1,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    paddingVertical: 10,
    paddingHorizontal: 20,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  navBtn: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  navBtnActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  navLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  navLabelActive: {
    color: '#10B981',
    fontWeight: '700',
  },
});
