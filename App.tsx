import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText as Text } from './src/components/AppText';
import { StatusBar } from 'expo-status-bar';
import {
  LayoutDashboard,
  UtensilsCrossed,
  Bot,
  TrendingUp,
} from 'lucide-react-native';
import { UserProfile, DailyLog, LoggedMeal, MealType, AppLanguage, SupplementRoutineItem, LoggedDailySupplement } from './src/types';
import {
  loadUserProfile,
  saveUserProfile,
  loadDailyLog,
  addMealToDay,
  updateMealInDay,
  removeMealFromDay,
  updateWater,
  loadSupplementRoutine,
  saveSupplementRoutine,
  saveDailySupplements,
  setSupplementTaken,
} from './src/storage/storage';
import { getDefaultProfile } from './src/utils/calculator';
import { OnboardingModal } from './src/components/OnboardingModal';
import { getTodayDateString } from './src/utils/dateUtils';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { FoodLogScreen } from './src/screens/FoodLogScreen';
import { ProgressScreen } from './src/screens/ProgressScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { SupplementsScreen } from './src/screens/SupplementsScreen';
import { CoachScreen } from './src/screens/CoachScreen';
import { AddFoodSheet } from './src/components/addfood/AddFoodSheet';
import { I18nProvider } from './src/i18n/I18nContext';
import { translate } from './src/i18n/strings';
import { theme } from './src/theme';
import * as Haptics from 'expo-haptics';

type Tab = 'today' | 'meals' | 'coach' | 'progress';
type TemporaryScreen = 'none' | 'profile' | 'supplements';

export default function App() {
  return (
    <SafeAreaProvider>
      <FitTrackApp />
    </SafeAreaProvider>
  );
}

function FitTrackApp() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<Tab>('today');
  const [tempScreen, setTempScreen] = useState<TemporaryScreen>('none');

  const [profile, setProfile] = useState<UserProfile>(getDefaultProfile());
  const [appLanguage, setAppLanguage] = useState<AppLanguage>('en');
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [log, setLog] = useState<DailyLog>({
    date: getTodayDateString(),
    meals: [],
    waterGlasses: 0,
    steps: 0,
  });
  const [initialMealForAdd, setInitialMealForAdd] = useState<MealType>('breakfast');
  const [supplementRoutine, setSupplementRoutine] = useState<SupplementRoutineItem[]>([]);

  // AddFoodSheet modal state
  const [addSheetConfig, setAddSheetConfig] = useState<{
    visible: boolean;
    targetDate: string;
    mealType?: MealType;
  }>({
    visible: false,
    targetDate: getTodayDateString(),
  });

  const language = appLanguage;
  const t = (str: string) => translate(language, str);

  // Load initial profile and daily log
  useEffect(() => {
    async function init() {
      const p = await loadUserProfile();
      setProfile(p);
      setAppLanguage(p.language || 'en');
      const l = await loadDailyLog(selectedDate);
      setLog(l);
      setSupplementRoutine(await loadSupplementRoutine());
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
    const today = getTodayDateString();
    const updated = await updateWater(today, delta);
    if (selectedDate === today) {
      setLog(updated);
    }
  };

  const handleAddMeal = async (meal: LoggedMeal, targetDate: string) => {
    if (targetDate > getTodayDateString()) return;
    const updated = await addMealToDay(targetDate, meal);
    if (selectedDate === targetDate) {
      setLog(updated);
    }
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
    setAppLanguage(newProfile.language || 'en');
    setTempScreen('none');
    setActiveTab('today');
    setSelectedDate(getTodayDateString());
  };

  const handleLanguageChange = async (nextLanguage: AppLanguage) => {
    if (language === nextLanguage) return;
    const updated = { ...profile, language: nextLanguage };
    await saveUserProfile(updated);
    setProfile(updated);
    setAppLanguage(nextLanguage);
  };

  const handleUpdateDailySupplements = async (items: LoggedDailySupplement[]) => {
    const updated = await saveDailySupplements(selectedDate, items);
    setLog(updated);
  };

  const handleUpdateRoutine = async (items: SupplementRoutineItem[]) => {
    setSupplementRoutine(items);
    await saveSupplementRoutine(items);
  };

  const handleToggleSupplement = async (id: string, taken: boolean) => {
    if (selectedDate > getTodayDateString()) return;
    const updated = await setSupplementTaken(selectedDate, id, taken);
    setLog(updated);
  };

  const handleNavigateToMeals = (targetMeal?: MealType) => {
    if (targetMeal) setInitialMealForAdd(targetMeal);
    setTempScreen('none');
    setActiveTab('meals');
  };

  const handleSwitchTab = (tab: Tab) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setTempScreen('none');
    if (tab === 'today') {
      setSelectedDate(getTodayDateString());
    }
    setActiveTab(tab);
  };

  const handleOpenAddFoodToday = (mealType?: MealType) => {
    setAddSheetConfig({
      visible: true,
      targetDate: getTodayDateString(),
      mealType,
    });
  };

  if (!profile.isOnboarded) {
    return (
      <I18nProvider language={language}>
        <OnboardingModal onComplete={handleSaveProfile} onLanguageChange={setAppLanguage} />
      </I18nProvider>
    );
  }

  // Highlight 'today' if a temporary screen is open
  const isHighlightToday = tempScreen !== 'none' || activeTab === 'today';

  return (
    <I18nProvider language={language}>
      <View
        style={[
          styles.container,
          {
            direction: language === 'en' ? 'ltr' : 'rtl',
            paddingTop: Math.max(insets.top, Platform.OS === 'android' ? 24 : 0),
          },
        ]}
      >
        <StatusBar style="dark" />

        {/* Main Screen Body */}
        <View style={styles.main}>
          {/* Temporary Screen: Profile */}
          {tempScreen === 'profile' && (
            <ProfileScreen
              profile={profile}
              language={language}
              onLanguageChange={handleLanguageChange}
              onSaveProfile={handleSaveProfile}
              onBack={() => setTempScreen('none')}
            />
          )}

          {/* Temporary Screen: Supplements */}
          {tempScreen === 'supplements' && (
            <SupplementsScreen
              selectedDate={selectedDate}
              routine={supplementRoutine}
              dailySupplements={log.dailySupplements || []}
              checks={log.supplements || []}
              onUpdateDailySupplements={handleUpdateDailySupplements}
              onUpdateRoutine={handleUpdateRoutine}
              onToggleSupplement={handleToggleSupplement}
              onBack={() => setTempScreen('none')}
            />
          )}

          {/* Tab 1: Today */}
          {tempScreen === 'none' && activeTab === 'today' && (
            <DashboardScreen
              profile={profile}
              log={log}
              supplementRoutine={supplementRoutine}
              onToggleSupplement={handleToggleSupplement}
              onUpdateWater={handleUpdateWater}
              onNavigateToMeals={handleNavigateToMeals}
              onOpenAddFood={handleOpenAddFoodToday}
              onOpenSupplements={() => setTempScreen('supplements')}
              onOpenProfile={() => setTempScreen('profile')}
            />
          )}

          {/* Tab 2: Meals */}
          {tempScreen === 'none' && activeTab === 'meals' && (
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

          {/* Tab 3: AI Coach */}
          {tempScreen === 'none' && activeTab === 'coach' && (
            <CoachScreen
              profile={profile}
              log={log}
            />
          )}

          {/* Tab 4: Progress */}
          {tempScreen === 'none' && activeTab === 'progress' && (
            <ProgressScreen profile={profile} />
          )}
        </View>

        {/* Global AddFoodSheet for Today and quick actions */}
        <AddFoodSheet
          visible={addSheetConfig.visible}
          mealType={addSheetConfig.mealType}
          date={addSheetConfig.targetDate}
          onClose={() => setAddSheetConfig((prev) => ({ ...prev, visible: false }))}
          onAddMeal={handleAddMeal}
        />

        {/* Bottom Navigation Dock: Exactly 4 Tabs */}
        <View
          style={[
            styles.dockContainer,
            {
              bottom: insets.bottom > 0 ? insets.bottom + 8 : (Platform.OS === 'ios' ? 18 : 10),
            },
          ]}
        >
          <View style={styles.bottomNav}>
            {/* 1. Today */}
            <TouchableOpacity
              style={styles.navBtn}
              onPress={() => handleSwitchTab('today')}
              activeOpacity={0.7}
              accessibilityLabel={t('Today')}
              accessibilityRole="button"
            >
              <LayoutDashboard
                size={20}
                color={isHighlightToday ? theme.colors.primary : theme.colors.textMuted}
              />
              <Text
                style={[
                  styles.navLabel,
                  isHighlightToday && styles.navLabelActive,
                ]}
              >
                {t('Today')}
              </Text>
            </TouchableOpacity>

            {/* 2. Meals */}
            <TouchableOpacity
              style={styles.navBtn}
              onPress={() => handleSwitchTab('meals')}
              activeOpacity={0.7}
              accessibilityLabel={t('Meals')}
              accessibilityRole="button"
            >
              <UtensilsCrossed
                size={20}
                color={tempScreen === 'none' && activeTab === 'meals' ? theme.colors.primary : theme.colors.textMuted}
              />
              <Text
                style={[
                  styles.navLabel,
                  tempScreen === 'none' && activeTab === 'meals' && styles.navLabelActive,
                ]}
              >
                {t('Meals')}
              </Text>
            </TouchableOpacity>

            {/* 3. Coach */}
            <TouchableOpacity
              style={styles.navBtn}
              onPress={() => handleSwitchTab('coach')}
              activeOpacity={0.7}
              accessibilityLabel={t('Coach')}
              accessibilityRole="button"
            >
              <Bot
                size={20}
                color={tempScreen === 'none' && activeTab === 'coach' ? theme.colors.primary : theme.colors.textMuted}
              />
              <Text
                style={[
                  styles.navLabel,
                  tempScreen === 'none' && activeTab === 'coach' && styles.navLabelActive,
                ]}
              >
                {t('Coach')}
              </Text>
            </TouchableOpacity>

            {/* 4. Progress */}
            <TouchableOpacity
              style={styles.navBtn}
              onPress={() => handleSwitchTab('progress')}
              activeOpacity={0.7}
              accessibilityLabel={t('Progress')}
              accessibilityRole="button"
            >
              <TrendingUp
                size={20}
                color={tempScreen === 'none' && activeTab === 'progress' ? theme.colors.primary : theme.colors.textMuted}
              />
              <Text
                style={[
                  styles.navLabel,
                  tempScreen === 'none' && activeTab === 'progress' && styles.navLabelActive,
                ]}
              >
                {t('Progress')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </I18nProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  main: {
    flex: 1,
  },
  dockContainer: {
    position: 'absolute',
    left: 14,
    right: 14,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 8,
    paddingHorizontal: 8,
    justifyContent: 'space-around',
    alignItems: 'center',
    ...theme.shadow.floating,
  },
  navBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 6,
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
});
