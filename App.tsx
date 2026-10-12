import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
} from 'react-native';
import { AppText as Text } from './src/components/AppText';
import { StatusBar } from 'expo-status-bar';
import {
  LayoutDashboard,
  Plus,
  TrendingUp,
  UtensilsCrossed,
  Bot,
} from 'lucide-react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { UserProfile, DailyLog, LoggedMeal, MealType, AppLanguage, SupplementRoutineItem } from './src/types';
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
  setSupplementTaken,
} from './src/storage/storage';
import { getDefaultProfile } from './src/utils/calculator';
import { OnboardingModal } from './src/components/OnboardingModal';
import { getTodayDateString } from './src/utils/dateUtils';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { FoodLogScreen } from './src/screens/FoodLogScreen';
import { ScannerScreen } from './src/screens/ScannerScreen';
import { ProgressScreen } from './src/screens/ProgressScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { SupplementsScreen } from './src/screens/SupplementsScreen';
import { CoachScreen } from './src/screens/CoachScreen';
import { I18nProvider } from './src/i18n/I18nContext';
import { theme } from './src/theme';
import * as Haptics from 'expo-haptics';
import { translate } from './src/i18n/strings';

type Tab = 'today' | 'diary' | 'scan' | 'progress' | 'profile' | 'supplements' | 'coach';

export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}

function AppContent() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<Tab>('today');
  const [previousTab, setPreviousTab] = useState<Tab>('today');

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
  const [openAddFoodOnNavigate, setOpenAddFoodOnNavigate] = useState(false);
  const handleAutoOpenComplete = useCallback(() => setOpenAddFoodOnNavigate(false), []);
  const [supplementRoutine, setSupplementRoutine] = useState<SupplementRoutineItem[]>([]);
  const language = appLanguage;
  const isTodaySelected = activeTab === 'today' || activeTab === 'supplements' || activeTab === 'profile' || (activeTab === 'scan' && previousTab === 'today');
  const isMealsSelected = activeTab === 'diary' || (activeTab === 'scan' && previousTab === 'diary');

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
    if (selectedDate > getTodayDateString()) return;
    const updated = await updateWater(selectedDate, delta);
    setLog(updated);
  };

  const handleAddMeal = async (meal: LoggedMeal) => {
    if (selectedDate > getTodayDateString()) return;
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
    setAppLanguage(newProfile.language || 'en');
    setActiveTab('today');
  };

  const handleLanguageChange = async (nextLanguage: AppLanguage) => {
    if (language === nextLanguage) return;
    const updated = { ...profile, language: nextLanguage };
    await saveUserProfile(updated);
    setProfile(updated);
    setAppLanguage(nextLanguage);
  };

  const handleAddSupplement = async (item: SupplementRoutineItem) => {
    const updated = [...supplementRoutine, item];
    setSupplementRoutine(updated);
    await saveSupplementRoutine(updated);
  };

  const handleRemoveSupplement = async (id: string) => {
    const updated = supplementRoutine.filter(item => item.id !== id);
    setSupplementRoutine(updated);
    await saveSupplementRoutine(updated);
  };

  const handleUpdateSupplement = async (item: SupplementRoutineItem) => {
    const updated = supplementRoutine.map(existing => existing.id === item.id ? item : existing);
    setSupplementRoutine(updated);
    await saveSupplementRoutine(updated);
  };

  const handleToggleSupplement = async (id: string, taken: boolean) => {
    if (selectedDate > getTodayDateString()) return;
    setLog(await setSupplementTaken(selectedDate, id, taken));
  };

  const handleNavigateToMeals = (targetMeal?: MealType) => {
    setOpenAddFoodOnNavigate(Boolean(targetMeal));
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

  if (!profile.isOnboarded) return <I18nProvider language={language}><OnboardingModal onComplete={handleSaveProfile} onLanguageChange={setAppLanguage} /></I18nProvider>;

  return (
    <I18nProvider language={language}>
    <View style={[styles.container, { direction: language === 'en' ? 'ltr' : 'rtl', paddingTop: insets.top, paddingLeft: insets.left, paddingRight: insets.right }]}>
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
            supplementRoutine={supplementRoutine}
            supplementChecks={log.supplements || []}
            onToggleSupplement={handleToggleSupplement}
            onOpenSupplements={() => setActiveTab('supplements')}
            onOpenProfile={() => setActiveTab('profile')}
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
            openAddOnMount={openAddFoodOnNavigate}
            onAutoOpenComplete={handleAutoOpenComplete}
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
          <ProfileScreen profile={profile} onSaveProfile={handleSaveProfile} language={language} onLanguageChange={handleLanguageChange} onBack={() => setActiveTab('today')} />
        )}
        {activeTab === 'supplements' && (
          <SupplementsScreen selectedDate={selectedDate} routine={supplementRoutine} checks={log.supplements || []} onAdd={handleAddSupplement} onUpdate={handleUpdateSupplement} onRemove={handleRemoveSupplement} onToggle={handleToggleSupplement} onBack={() => setActiveTab('today')} />
        )}
        {activeTab === 'coach' && <CoachScreen profile={profile} log={log} />}
      </View>

      {/* Editorial Ledger Bottom Navigation Dock */}
      <View style={[styles.dockContainer, { bottom: insets.bottom + 8, left: Math.max(insets.left, 14), right: Math.max(insets.right, 14) }]}>
          <View style={styles.bottomNav}>
            {/* 1. Today */}
            <TouchableOpacity
              style={styles.navBtn}
              onPress={() => switchTab('today')}
              activeOpacity={0.7}
              accessibilityLabel={translate(language, 'Today')}
              accessibilityRole="button"
            >
              <LayoutDashboard
                size={20}
                color={isTodaySelected ? theme.colors.primary : theme.colors.textMuted}
              />
              <Text
                style={[
                  styles.navLabel,
                  isTodaySelected && styles.navLabelActive,
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
              accessibilityLabel={translate(language, 'Meals')}
              accessibilityRole="button"
            >
              <UtensilsCrossed
                size={20}
                color={isMealsSelected ? theme.colors.primary : theme.colors.textMuted}
              />
              <Text
                style={[
                  styles.navLabel,
                  isMealsSelected && styles.navLabelActive,
                ]}
              >
                Meals
              </Text>
            </TouchableOpacity>

            {/* 3. Coach */}
            <TouchableOpacity style={styles.navBtn} onPress={() => switchTab('coach')} activeOpacity={0.7} accessibilityLabel={translate(language, 'Coach')} accessibilityRole="button">
              <Bot size={20} color={activeTab === 'coach' ? theme.colors.primary : theme.colors.textMuted} />
              <Text style={[styles.navLabel, activeTab === 'coach' && styles.navLabelActive]}>Coach</Text>
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

          </View>
      </View>
      {(activeTab === 'today' || activeTab === 'diary') && selectedDate <= getTodayDateString() && (
        <TouchableOpacity
          style={[styles.addFoodFloating, { bottom: insets.bottom + 78 }, language === 'en' ? { right: Math.max(insets.right, 20) } : { left: Math.max(insets.left, 20) }]}
          onPress={() => { setPreviousTab(activeTab); setActiveTab('scan'); }}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={translate(language, 'Add food')}
        >
          <Plus size={19} color={theme.colors.textInverted} />
          <Text style={styles.addFoodFloatingText}>Add food</Text>
        </TouchableOpacity>
      )}
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
    bottom: 8,
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
  addFoodFloating: { position: 'absolute', minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: theme.radius.full, paddingHorizontal: 18, backgroundColor: theme.colors.primary, ...theme.shadow.floating },
  addFoodFloatingText: { color: theme.colors.textInverted, fontSize: 14, fontWeight: '700' },
});
