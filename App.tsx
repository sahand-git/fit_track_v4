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
  Sparkles,
  QrCode,
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
  removeMealFromDay,
  updateWater,
} from './src/storage/storage';
import { getDefaultProfile } from './src/utils/calculator';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { FoodLogScreen } from './src/screens/FoodLogScreen';
import { InsightsScreen } from './src/screens/InsightsScreen';
import { ScannerScreen } from './src/screens/ScannerScreen';
import { ProgressScreen } from './src/screens/ProgressScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import * as Haptics from 'expo-haptics';

type Tab = 'diary' | 'insights' | 'scanner' | 'progress' | 'profile';
type DiarySubView = 'dashboard' | 'log';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('diary');
  const [diaryView, setDiaryView] = useState<DiarySubView>('dashboard');
  const [previousTab, setPreviousTab] = useState<Tab>('diary');

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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

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
                  color={diaryView === 'dashboard' ? '#10B981' : '#64748B'}
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
                  color={diaryView === 'log' ? '#10B981' : '#64748B'}
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
                onRemoveMeal={handleRemoveMeal}
                initialMealType={initialMealForAdd}
              />
            )}
          </View>
        )}

        {/* Tab 2: INSIGHTS */}
        {activeTab === 'insights' && <InsightsScreen />}

        {/* Tab 3: SCANNER (Barcode & AI Camera Viewfinder) */}
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

        {/* Tab 4: PROGRESS (Trajectory & Body Metrics) */}
        {activeTab === 'progress' && <ProgressScreen />}

        {/* Tab 5: PROFILE (Goals & Macro Setup) */}
        {activeTab === 'profile' && (
          <ProfileScreen profile={profile} onSaveProfile={handleSaveProfile} />
        )}
      </View>

      {/* Floating Bottom 5-Tab Navigation Dock (Hidden on Scanner full-screen) */}
      {activeTab !== 'scanner' && (
        <View style={styles.dockContainer}>
          <View style={styles.bottomNav}>
            {/* 1. Diary */}
            <TouchableOpacity
              style={[styles.navBtn, activeTab === 'diary' && styles.navBtnActive]}
              onPress={() => switchTab('diary')}
              activeOpacity={0.7}
            >
              <BookOpen
                size={22}
                color={activeTab === 'diary' ? '#10B981' : '#64748B'}
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
              style={[styles.navBtn, activeTab === 'insights' && styles.navBtnActive]}
              onPress={() => switchTab('insights')}
              activeOpacity={0.7}
            >
              <Sparkles
                size={22}
                color={activeTab === 'insights' ? '#FA5D29' : '#64748B'}
              />
              <Text
                style={[
                  styles.navLabel,
                  activeTab === 'insights' && { color: '#FA5D29', fontWeight: '700' },
                ]}
              >
                Insights
              </Text>
            </TouchableOpacity>

            {/* 3. Center Elevated Scanner Button */}
            <TouchableOpacity
              style={styles.scannerCenterBtn}
              onPress={() => switchTab('scanner')}
              activeOpacity={0.85}
            >
              <QrCode size={26} color="#FFFFFF" />
            </TouchableOpacity>

            {/* 4. Progress */}
            <TouchableOpacity
              style={[styles.navBtn, activeTab === 'progress' && styles.navBtnActive]}
              onPress={() => switchTab('progress')}
              activeOpacity={0.7}
            >
              <TrendingUp
                size={22}
                color={activeTab === 'progress' ? '#10B981' : '#64748B'}
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
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090D16',
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
    backgroundColor: '#0F172A',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 10,
    gap: 6,
  },
  segmentBtnActive: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  segmentTextActive: {
    color: '#F8FAFC',
    fontWeight: '700',
  },
  dockContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 20 : 12,
    left: 14,
    right: 14,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#1E293B',
    paddingVertical: 8,
    paddingHorizontal: 8,
    justifyContent: 'space-around',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
  },
  navBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 10,
    minWidth: 54,
  },
  navBtnActive: {
    // subtle active indicator
  },
  navLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 3,
  },
  navLabelActive: {
    color: '#10B981',
    fontWeight: '700',
  },
  scannerCenterBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FA5D29',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -28,
    borderWidth: 3.5,
    borderColor: '#090D16',
    shadowColor: '#FA5D29',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 14,
  },
});
