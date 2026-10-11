import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
  LayoutDashboard,
  BookOpen,
  Plus,
  TrendingUp,
  User,
} from 'lucide-react-native';
import { UserProfile, DailyLog, LoggedMeal, MealType } from './src/types';
import {
  loadUserProfile,
  saveUserProfile,
  loadDailyLog,
  addMealToDay,
  updateMealInDay,
  removeMealFromDay,
  updateWater,
} from './src/storage/storage';
import { getDefaultProfile } from './src/utils/calculator';
import { OnboardingModal } from './src/components/OnboardingModal';
import { getTodayDateString } from './src/utils/dateUtils';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { FoodLogScreen } from './src/screens/FoodLogScreen';
import { ScannerScreen } from './src/screens/ScannerScreen';
import { ProgressScreen } from './src/screens/ProgressScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { theme } from './src/theme';
import * as Haptics from 'expo-haptics';

type Tab = 'today' | 'diary' | 'scan' | 'progress' | 'profile';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('today');
  const [previousTab, setPreviousTab] = useState<Tab>('today');

  const [profile, setProfile] = useState<UserProfile>(getDefaultProfile());
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [log, setLog] = useState<DailyLog>({
    date: getTodayDateString(),
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

  const handleUpdateMeal = async (meal: LoggedMeal) => {
    const updated = await updateMealInDay(selectedDate, meal);
    setLog(updated);
  };

  const handleRemoveMeal = async (mealId: string) => {
    const updated = await removeMealFromDay(selectedDate, mealId);
    setLog(updated);
  };

  const handleSaveProfile = async (newProfile: UserProfile) => {
    await saveUserProfile(newProfile);
    setProfile(newProfile);
    setActiveTab('today');
  };

  const handleNavigateToMeals = (targetMeal?: MealType) => {
    if (targetMeal) setInitialMealForAdd(targetMeal);
    setActiveTab('diary');
  };

  const switchTab = (tab: Tab) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (tab === 'scan') {
      setPreviousTab(activeTab);
    }
    setActiveTab(tab);
  };

  if (!profile.isOnboarded) {
    return <OnboardingModal onComplete={handleSaveProfile} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* Main Screen Body */}
      <View style={styles.main}>
        {/* Tab 1: TODAY DASHBOARD */}
        {activeTab === 'today' && (
          <DashboardScreen
            profile={profile}
            log={log}
            onUpdateWater={handleUpdateWater}
            onNavigateToMeals={handleNavigateToMeals}
            onOpenChooser={() => {
              setPreviousTab('today');
              setActiveTab('scan');
            }}
          />
        )}

        {/* Tab 2: FOOD DIARY */}
        {activeTab === 'diary' && (
          <FoodLogScreen
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            log={log}
            onAddMeal={handleAddMeal}
            onUpdateMeal={handleUpdateMeal}
            onRemoveMeal={handleRemoveMeal}
            initialMealType={initialMealForAdd}
          />
        )}

        {/* Tab 3: FOOD LOGGING CHOOSER (Scan Barcode, Meal Photo, Manual Search) */}
        {activeTab === 'scan' && (
          <ScannerScreen
            onBack={() => setActiveTab(previousTab)}
            onAddMeal={(meal) => {
              handleAddMeal(meal);
              setActiveTab('diary');
            }}
          />
        )}

        {/* Tab 4: PROGRESS & INSIGHTS */}
        {activeTab === 'progress' && <ProgressScreen profile={profile} />}

        {/* Tab 5: PROFILE */}
        {activeTab === 'profile' && (
          <ProfileScreen profile={profile} onSaveProfile={handleSaveProfile} />
        )}
      </View>

      {/* Editorial Ledger Bottom Navigation Dock */}
      {activeTab !== 'scan' && (
        <View style={styles.dockContainer}>
          <View style={styles.bottomNav}>
            {/* 1. Today */}
            <TouchableOpacity
              style={styles.navBtn}
              onPress={() => switchTab('today')}
              activeOpacity={0.7}
              accessibilityLabel="Today"
              accessibilityRole="button"
            >
              <LayoutDashboard
                size={20}
                color={activeTab === 'today' ? theme.colors.primary : theme.colors.textMuted}
              />
              <Text
                style={[
                  styles.navLabel,
                  activeTab === 'today' && styles.navLabelActive,
                ]}
              >
                Today
              </Text>
            </TouchableOpacity>

            {/* 2. Diary */}
            <TouchableOpacity
              style={styles.navBtn}
              onPress={() => switchTab('diary')}
              activeOpacity={0.7}
              accessibilityLabel="Diary"
              accessibilityRole="button"
            >
              <BookOpen
                size={20}
                color={activeTab === 'diary' ? theme.colors.primary : theme.colors.textMuted}
              />
              <Text
                style={[
                  styles.navLabel,
                  activeTab === 'diary' && styles.navLabelActive,
                ]}
              >
                Diary
              </Text>
            </TouchableOpacity>

            {/* 3. Log Food (Centered Action Button) */}
            <TouchableOpacity
              style={styles.logNavBtn}
              onPress={() => switchTab('scan')}
              activeOpacity={0.8}
              accessibilityLabel="Log food"
              accessibilityRole="button"
            >
              <View style={styles.logIconBox}>
                <Plus size={20} color={theme.colors.textInverted} />
              </View>
              <Text style={styles.logNavLabel}>Log food</Text>
            </TouchableOpacity>

            {/* 4. Progress */}
            <TouchableOpacity
              style={styles.navBtn}
              onPress={() => switchTab('progress')}
              activeOpacity={0.7}
              accessibilityLabel="Progress"
              accessibilityRole="button"
            >
              <TrendingUp
                size={20}
                color={activeTab === 'progress' ? theme.colors.primary : theme.colors.textMuted}
              />
              <Text
                style={[
                  styles.navLabel,
                  activeTab === 'progress' && styles.navLabelActive,
                ]}
              >
                Progress
              </Text>
            </TouchableOpacity>

            {/* 5. Profile */}
            <TouchableOpacity
              style={styles.navBtn}
              onPress={() => switchTab('profile')}
              activeOpacity={0.7}
              accessibilityLabel="Profile"
              accessibilityRole="button"
            >
              <User
                size={20}
                color={activeTab === 'profile' ? theme.colors.primary : theme.colors.textMuted}
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
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingTop: Platform.OS === 'android' ? 35 : 0,
  },
  main: {
    flex: 1,
  },
  dockContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 18 : 10,
    left: 14,
    right: 14,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 7,
    paddingHorizontal: 6,
    justifyContent: 'space-around',
    alignItems: 'center',
    ...theme.shadow.floating,
  },
  navBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    minWidth: 50,
  },
  navLabel: {
    fontFamily: theme.fonts.sans,
    fontSize: 11,
    fontWeight: '500',
    color: theme.colors.textMuted,
    marginTop: 3,
  },
  navLabelActive: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  logNavBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    minWidth: 54,
  },
  logIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadow.subtle,
  },
  logNavLabel: {
    fontFamily: theme.fonts.sans,
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.primary,
    marginTop: 2,
  },
});
