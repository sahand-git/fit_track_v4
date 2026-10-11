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
  BookOpen,
  LineChart,
  Barcode,
  TrendingUp,
  User,
  LayoutDashboard,
  UtensilsCrossed,
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
import { InsightsScreen } from './src/screens/InsightsScreen';
import { ScannerScreen } from './src/screens/ScannerScreen';
import { ProgressScreen } from './src/screens/ProgressScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { theme } from './src/theme';
import * as Haptics from 'expo-haptics';

type Tab = 'diary' | 'insights' | 'scanner' | 'progress' | 'profile';
type DiarySubView = 'dashboard' | 'log';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('diary');
  const [diaryView, setDiaryView] = useState<DiarySubView>('dashboard');
  const [previousTab, setPreviousTab] = useState<Tab>('diary');

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
    setActiveTab('diary');
  };

  const handleNavigateToMeals = (targetMeal?: MealType) => {
    if (targetMeal) setInitialMealForAdd(targetMeal);
    setDiaryView('log');
    setActiveTab('diary');
  };

  const switchTab = (tab: Tab) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (tab === 'scanner') {
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
        {/* Tab 1: DIARY (Dashboard / Food Log Switcher) */}
        {activeTab === 'diary' && (
          <View style={styles.diaryContainer}>
            {/* Top Sub-Navigation Pill Header */}
            <View style={styles.diarySegmentBar}>
              <TouchableOpacity
                style={[
                  styles.segmentBtn,
                  diaryView === 'dashboard' && styles.segmentBtnActive,
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                  setDiaryView('dashboard');
                }}
                activeOpacity={0.7}
              >
                <LayoutDashboard
                  size={15}
                  color={diaryView === 'dashboard' ? theme.colors.primary : theme.colors.textMuted}
                />
                <Text
                  style={[
                    styles.segmentText,
                    diaryView === 'dashboard' && styles.segmentTextActive,
                  ]}
                >
                  Overview
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.segmentBtn,
                  diaryView === 'log' && styles.segmentBtnActive,
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                  setDiaryView('log');
                }}
                activeOpacity={0.7}
              >
                <UtensilsCrossed
                  size={15}
                  color={diaryView === 'log' ? theme.colors.primary : theme.colors.textMuted}
                />
                <Text
                  style={[
                    styles.segmentText,
                    diaryView === 'log' && styles.segmentTextActive,
                  ]}
                >
                  Food Diary
                </Text>
              </TouchableOpacity>
            </View>

            {/* Screen View */}
            {diaryView === 'dashboard' ? (
              <DashboardScreen
                profile={profile}
                log={log}
                onUpdateWater={handleUpdateWater}
                onNavigateToMeals={handleNavigateToMeals}
              />
            ) : (
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
          </View>
        )}

        {/* Tab 2: INSIGHTS */}
        {activeTab === 'insights' && <InsightsScreen profile={profile} />}

        {/* Tab 3: SCANNER */}
        {activeTab === 'scanner' && (
          <ScannerScreen
            onBack={() => setActiveTab(previousTab)}
            onAddMeal={(meal) => {
              handleAddMeal(meal);
              setActiveTab('diary');
              setDiaryView('log');
            }}
          />
        )}

        {/* Tab 4: PROGRESS */}
        {activeTab === 'progress' && <ProgressScreen profile={profile} />}

        {/* Tab 5: PROFILE */}
        {activeTab === 'profile' && (
          <ProfileScreen profile={profile} onSaveProfile={handleSaveProfile} />
        )}
      </View>

      {/* Calm Bottom Navigation Bar */}
      {activeTab !== 'scanner' && (
        <View style={styles.dockContainer}>
          <View style={styles.bottomNav}>
            {/* 1. Diary */}
            <TouchableOpacity
              style={styles.navBtn}
              onPress={() => switchTab('diary')}
              activeOpacity={0.7}
              accessibilityLabel="Diary"
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

            {/* 2. Insights */}
            <TouchableOpacity
              style={styles.navBtn}
              onPress={() => switchTab('insights')}
              activeOpacity={0.7}
              accessibilityLabel="Insights"
            >
              <LineChart
                size={20}
                color={activeTab === 'insights' ? theme.colors.primary : theme.colors.textMuted}
              />
              <Text
                style={[
                  styles.navLabel,
                  activeTab === 'insights' && styles.navLabelActive,
                ]}
              >
                Insights
              </Text>
            </TouchableOpacity>

            {/* 3. Barcode Lookup (Balanced, non-dominating) */}
            <TouchableOpacity
              style={styles.scannerNavBtn}
              onPress={() => switchTab('scanner')}
              activeOpacity={0.7}
              accessibilityLabel="Lookup Barcode"
            >
              <View style={styles.scannerIconBox}>
                <Barcode size={18} color={theme.colors.textInverted} />
              </View>
              <Text style={styles.scannerNavLabel}>Lookup</Text>
            </TouchableOpacity>

            {/* 4. Progress */}
            <TouchableOpacity
              style={styles.navBtn}
              onPress={() => switchTab('progress')}
              activeOpacity={0.7}
              accessibilityLabel="Progress"
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
  diaryContainer: {
    flex: 1,
  },
  diarySegmentBar: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.md,
    marginVertical: 8,
    padding: 3,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: theme.radius.sm,
    gap: 6,
  },
  segmentBtnActive: {
    backgroundColor: theme.colors.primaryLight,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.textMuted,
  },
  segmentTextActive: {
    color: theme.colors.primary,
    fontWeight: '600',
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
    paddingVertical: 6,
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
    fontSize: 11,
    fontWeight: '500',
    color: theme.colors.textMuted,
    marginTop: 3,
  },
  navLabelActive: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  scannerNavBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    minWidth: 50,
  },
  scannerIconBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scannerNavLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
});
