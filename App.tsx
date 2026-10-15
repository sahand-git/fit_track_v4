import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Platform,
  Alert,
  BackHandler,
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText as Text } from './src/components/AppText';
import { StatusBar } from 'expo-status-bar';
import {
  LayoutDashboard,
  UtensilsCrossed,
  Bot,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react-native';
import { UserProfile, DailyLog, LoggedMeal, MealType, AppLanguage, SupplementRoutineItem, LoggedDailySupplement, WorkoutEntry, AICoachReport } from './src/types';
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
  loadReminderSettings,
  addWorkoutToDay,
  removeWorkoutFromDay,
  updateWorkoutInDay,
  loadWeightHistory,
  loadAccurateStreak,
  setDailySteps,
  addDailySteps,
  loadMedicalDisclaimerAccepted,
  saveMedicalDisclaimerAccepted,
  saveDailyAIReport,
} from './src/storage/storage';
import {
  initNotificationService,
  scheduleSupplementReminders,
  reconcileNotificationLanguage,
  checkNotificationPermissions,
  syncAllReminders,
  isNotificationSupported,
} from './src/services/notificationService';
import { getDefaultProfile } from './src/utils/calculator';
import { OnboardingModal } from './src/components/OnboardingModal';
import { getTodayDateString } from './src/utils/dateUtils';
import { calculateLoggingStreak } from './src/utils/streak';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { FoodLogScreen } from './src/screens/FoodLogScreen';
import { ProgressScreen } from './src/screens/ProgressScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { SupplementsScreen } from './src/screens/SupplementsScreen';
import { CoachScreen } from './src/screens/CoachScreen';
import { AddFoodSheet } from './src/components/addfood/AddFoodSheet';
import { MedicalDisclaimerModal } from './src/components/MedicalDisclaimerModal';
import { ScientificReferencesModal } from './src/components/ScientificReferencesModal';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { ScreenTransitionView } from './src/components/ScreenTransitionView';
import { persistRoutineThenCommit } from './src/utils/supplementRoutine';
import { I18nProvider } from './src/i18n/I18nContext';
import { translate } from './src/i18n/strings';
import { theme } from './src/theme';
import * as Haptics from 'expo-haptics';

import { shouldUpdateVisibleDate } from './src/utils/dateSync';
import { StepsScreen } from './src/screens/StepsScreen';
import { WorkoutsScreen } from './src/screens/WorkoutsScreen';
import { AccountScreen } from './src/screens/AccountScreen';
import { AuthIdentity, watchAuthState } from './src/services/authService';
import { setAccountStorageNamespace } from './src/storage/storage';

type Tab = 'today' | 'meals' | 'coach' | 'progress';
type TemporaryScreen = 'none' | 'profile' | 'supplements' | 'steps' | 'workouts' | 'account';

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <FitTrackApp />
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

function FitTrackApp() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<Tab>('today');
  const [tempScreen, setTempScreen] = useState<TemporaryScreen>('none');
  const [authUser, setAuthUser] = useState<AuthIdentity | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const [profile, setProfile] = useState<UserProfile>(getDefaultProfile());
  const [appLanguage, setAppLanguage] = useState<AppLanguage>('en');
  const [initError, setInitError] = useState<string | null>(null);
  const [initRetryCount, setInitRetryCount] = useState<number>(0);
  const [initialLoaded, setInitialLoaded] = useState<boolean>(false);
  const [referencesModalVisible, setReferencesModalVisible] = useState<boolean>(false);
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const selectedDateRef = React.useRef(selectedDate);
  useEffect(() => {
    selectedDateRef.current = selectedDate;
  }, [selectedDate]);

  const [log, setLog] = useState<DailyLog>({
    date: getTodayDateString(),
    meals: [],
    waterGlasses: 0,
    steps: 0,
    workouts: [],
  });
  const [streak, setStreak] = useState<number>(0);
  const [initialMealForAdd, setInitialMealForAdd] = useState<MealType>('breakfast');
  const [supplementRoutine, setSupplementRoutine] = useState<SupplementRoutineItem[]>([]);

  // AddFoodSheet modal state
  const [addSheetConfig, setAddSheetConfig] = useState<{
    visible: boolean;
    targetDate: string;
    mealType?: MealType;
    initialTab?: 'search' | 'photo' | 'describe';
    initialScanBarcode?: boolean;
  }>({
    visible: false,
    targetDate: getTodayDateString(),
  });

  const language = appLanguage;
  const t = (str: string) => translate(language, str);

  const refreshStreak = async () => {
    try {
      const res = await loadAccurateStreak();
      setStreak(res.currentStreak);
    } catch (e) {
      console.warn('Error calculating streak:', e);
    }
  };

  useEffect(() => watchAuthState((user) => {
    setAccountStorageNamespace(user?.uid || null);
    setAuthUser(user);
    setAuthReady(true);
  }), []);

  // Load the active namespace only after Firebase restores the session.
  useEffect(() => {
    if (!authReady) return;
    let isCancelled = false;
    async function init() {
      setInitError(null);
      setInitialLoaded(false);
      try {
        await initNotificationService();
        const p = await loadUserProfile();
        const disclaimerAccepted = await loadMedicalDisclaimerAccepted();
        if (disclaimerAccepted && !p.hasAcceptedMedicalDisclaimer) {
          p.hasAcceptedMedicalDisclaimer = true;
        }
        if (isCancelled) return;
        setProfile(p);
        const appLang = p.language || 'en';
        setAppLanguage(appLang);
        const l = await loadDailyLog(selectedDate);
        if (isCancelled) return;
        setLog(l);
        const initialRoutine = await loadSupplementRoutine();
        if (isCancelled) return;
        setSupplementRoutine(initialRoutine);
        await refreshStreak();

        // Reconcile reminders safely at startup WITHOUT requesting permission
        if (isNotificationSupported()) {
          const perm = await checkNotificationPermissions();
          if (perm.granted) {
            const reminderSettings = await loadReminderSettings();
            const hasActive =
              reminderSettings.supplementsEnabled ||
              reminderSettings.water.enabled ||
              Object.values(reminderSettings.meals).some((m) => m.enabled);
            if (hasActive) {
              await syncAllReminders(reminderSettings, initialRoutine, appLang);
            }
          }
        }
        if (!isCancelled) {
          setInitialLoaded(true);
        }
      } catch (err: any) {
        if (!isCancelled) {
          console.error('Initialization error in App:', err);
          setInitError(err?.message || 'Failed to initialize app');
        }
      }
    }
    init();
    return () => { isCancelled = true; };
  }, [authReady, authUser?.uid, initRetryCount]);

  // Reload log whenever date changes with cancellation to prevent race conditions
  useEffect(() => {
    if (!authReady) return;
    let isCancelled = false;
    async function fetchDateLog() {
      const l = await loadDailyLog(selectedDate);
      if (!isCancelled) {
        setLog(l);
        await refreshStreak();
      }
    }
    fetchDateLog();
    return () => {
      isCancelled = true;
    };
  }, [selectedDate, authReady, authUser?.uid]);

  // Handle Android hardware back button
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const onHardwareBack = () => {
      if (addSheetConfig.visible) {
        setAddSheetConfig((prev) => ({ ...prev, visible: false }));
        return true;
      }
      if (tempScreen !== 'none') {
        setTempScreen('none');
        return true;
      }
      if (activeTab !== 'today') {
        setActiveTab('today');
        return true;
      }
      return false;
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', onHardwareBack);
    return () => subscription.remove();
  }, [addSheetConfig.visible, tempScreen, activeTab]);

  // Handlers
  const handleUpdateWater = async (delta: number) => {
    const targetDate = selectedDate;
    if (targetDate > getTodayDateString()) return;
    try {
      const updated = await updateWater(targetDate, delta);
      if (selectedDateRef.current === targetDate) {
        setLog(updated);
      }
    } catch (err) {
      console.error('Failed to update water:', err);
      Alert.alert(t('Error'), t('Could not update water intake.'));
    }
  };

  const handleAddMeal = async (meal: LoggedMeal, targetDate: string) => {
    if (targetDate > getTodayDateString()) return;
    try {
      const updated = await addMealToDay(targetDate, meal);
      if (selectedDateRef.current === targetDate) {
        setLog(updated);
      }
      await refreshStreak();
    } catch (err) {
      console.error('Failed to add meal:', err);
      Alert.alert(t('Error'), t('Failed to save meal.'));
    }
  };

  const handleUpdateMeal = async (meal: LoggedMeal) => {
    const targetDate = selectedDate;
    try {
      const updated = await updateMealInDay(targetDate, meal);
      if (selectedDateRef.current === targetDate) {
        setLog(updated);
      }
    } catch (err) {
      console.error('Failed to update meal:', err);
      Alert.alert(t('Error'), t('Failed to update meal.'));
    }
  };

  const handleRemoveMeal = async (mealId: string) => {
    const targetDate = selectedDate;
    try {
      const updated = await removeMealFromDay(targetDate, mealId);
      if (selectedDateRef.current === targetDate) {
        setLog(updated);
      }
      await refreshStreak();
    } catch (err) {
      console.error('Failed to remove meal:', err);
      Alert.alert(t('Error'), t('Failed to remove meal.'));
    }
  };

  const handleCopyYesterdayMeals = async (targetDate: string) => {
    try {
      const updated = await loadDailyLog(targetDate);
      if (selectedDateRef.current === targetDate) {
        setLog(updated);
      }
      await refreshStreak();
    } catch (err) {
      console.error('Failed to reload after copying meals:', err);
    }
  };

  const handleSaveProfile = async (newProfile: UserProfile) => {
    try {
      const prevLanguage = language;
      await saveUserProfile(newProfile);
      setProfile(newProfile);
      const nextLanguage = newProfile.language || 'en';
      setAppLanguage(nextLanguage);
      if (prevLanguage !== nextLanguage) {
        await reconcileNotificationLanguage(nextLanguage, supplementRoutine);
      }
      setTempScreen('none');
      setActiveTab('today');
      setSelectedDate(getTodayDateString());
    } catch (err) {
      console.error('Error saving user profile:', err);
      Alert.alert(t('Save Error'), t('Could not save your profile changes. Please try again.'));
    }
  };

  const handleLanguageChange = async (nextLanguage: AppLanguage) => {
    if (language === nextLanguage) return;
    try {
      const updated = { ...profile, language: nextLanguage };
      await saveUserProfile(updated);
      setProfile(updated);
      setAppLanguage(nextLanguage);
      await reconcileNotificationLanguage(nextLanguage, supplementRoutine);
    } catch (err) {
      console.error('Error changing language:', err);
      Alert.alert(t('Save Error'), t('Could not save language preference. Please try again.'));
    }
  };

  const handleUpdateDailySupplements = async (items: LoggedDailySupplement[]) => {
    const targetDate = selectedDate;
    if (targetDate > getTodayDateString()) return;
    const updated = await saveDailySupplements(targetDate, items);
    if (selectedDateRef.current === targetDate) {
      setLog(updated);
    }
  };

  const handleUpdateRoutine = async (items: SupplementRoutineItem[]) => {
    await persistRoutineThenCommit(items, saveSupplementRoutine, setSupplementRoutine);
    try {
      const remSettings = await loadReminderSettings();
      await scheduleSupplementReminders(remSettings, items, language);
    } catch (e) {
      console.warn('Error syncing reminders after routine update:', e);
    }
  };

  const handleUpdateSupplement = async (item: SupplementRoutineItem) => {
    const updated = supplementRoutine.map((existing) => existing.id === item.id ? item : existing);
    await persistRoutineThenCommit(updated, saveSupplementRoutine, setSupplementRoutine);
    try {
      const remSettings = await loadReminderSettings();
      await scheduleSupplementReminders(remSettings, updated, language);
    } catch (e) {
      console.warn('Error syncing reminders after supplement update:', e);
    }
  };

  const handleToggleSupplement = async (id: string, taken: boolean) => {
    const targetDate = selectedDate;
    if (targetDate > getTodayDateString()) return;
    const updated = await setSupplementTaken(targetDate, id, taken);
    if (selectedDateRef.current === targetDate) {
      setLog(updated);
    }
  };

  const handleAddWorkout = async (workout: WorkoutEntry, targetDate: string) => {
    if (targetDate > getTodayDateString()) return;
    try {
      const updated = await addWorkoutToDay(targetDate, workout);
      if (selectedDateRef.current === targetDate) {
        setLog(updated);
      }
      await refreshStreak();
    } catch (err) {
      console.error('Failed to add workout:', err);
      Alert.alert(t('Error'), t('Failed to save workout.'));
    }
  };

  const handleDeleteWorkout = async (workoutId: string) => {
    const targetDate = selectedDate;
    try {
      const updated = await removeWorkoutFromDay(targetDate, workoutId);
      if (selectedDateRef.current === targetDate) {
        setLog(updated);
      }
      await refreshStreak();
    } catch (err) {
      console.error('Failed to delete workout:', err);
      Alert.alert(t('Error'), t('Failed to delete workout.'));
    }
  };

  const handleUpdateWorkout = async (workout: WorkoutEntry, targetDate: string) => {
    if (targetDate > getTodayDateString()) return;
    const updated = await updateWorkoutInDay(targetDate, workout);
    if (selectedDateRef.current === targetDate) setLog(updated);
  };

  const handleSaveAIReport = async (report: AICoachReport, targetDate: string) => {
    const updated = await saveDailyAIReport(targetDate, report);
    if (selectedDateRef.current === targetDate) setLog(updated);
  };

  const handleSaveSteps = async (total: number) => {
    const targetDate = selectedDateRef.current;
    if (targetDate > getTodayDateString()) return;
    const updated = await setDailySteps(targetDate, total);
    if (selectedDateRef.current === targetDate) setLog(updated);
  };

  const handleAddSteps = async (amount: number) => {
    const targetDate = selectedDateRef.current;
    if (targetDate > getTodayDateString()) return;
    const updated = await addDailySteps(targetDate, amount);
    if (selectedDateRef.current === targetDate) setLog(updated);
  };

  const handleSaveStepGoal = async (stepGoal: number) => {
    const updated = { ...profile, stepGoal };
    await saveUserProfile(updated);
    setProfile(updated);
  };

  const handleRestoreComplete = async () => {
    const p = await loadUserProfile();
    setProfile(p);
    const nextLang = p.language || 'en';
    setAppLanguage(nextLang);
    const routine = await loadSupplementRoutine();
    setSupplementRoutine(routine);
    const l = await loadDailyLog(selectedDate);
    setLog(l);
    await refreshStreak();
    if (isNotificationSupported()) {
      const remSettings = await loadReminderSettings();
      await syncAllReminders(remSettings, routine, nextLang);
    }
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

  const handleOpenAddFoodToday = (
    mealType?: MealType,
    initialTab?: 'search' | 'photo' | 'describe',
    initialScanBarcode?: boolean
  ) => {
    setAddSheetConfig({
      visible: true,
      targetDate: getTodayDateString(),
      mealType,
      initialTab,
      initialScanBarcode,
    });
  };

  if (initError) {
    return (
      <I18nProvider language={language}>
        <View style={styles.initErrorContainer}>
          <View style={styles.initErrorCard}>
            <View style={styles.initErrorIconCircle}>
              <AlertTriangle size={36} color={theme.colors.danger} />
            </View>
            <Text style={styles.initErrorTitle}>{t('Failed to start FitTrack')}</Text>
            <Text style={styles.initErrorMessage}>
              {t('Unable to load app data. Please try again.')}
            </Text>
            <TouchableOpacity
              style={styles.initRetryButton}
              onPress={() => {
                setInitError(null);
                setInitRetryCount((c) => c + 1);
              }}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={t('Retry')}
            >
              <RefreshCw size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.initRetryButtonText}>{t('Retry')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </I18nProvider>
    );
  }

  if (initialLoaded && !profile.hasAcceptedMedicalDisclaimer) {
    return (
      <I18nProvider language={language}>
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
          <MedicalDisclaimerModal
            visible={true}
            onAccept={async () => {
              try {
                await saveMedicalDisclaimerAccepted(true);
              } catch (e) {
                console.error('Failed to save medical disclaimer acceptance:', e);
              }
              setProfile((prev) => ({ ...prev, hasAcceptedMedicalDisclaimer: true }));
            }}
            isFirstRun={true}
            onOpenReferences={() => setReferencesModalVisible(true)}
          />
          <ScientificReferencesModal
            visible={referencesModalVisible}
            onClose={() => setReferencesModalVisible(false)}
            onOpenDisclaimer={() => setReferencesModalVisible(false)}
          />
        </View>
      </I18nProvider>
    );
  }

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
        <ScreenTransitionView
          transitionKey={tempScreen !== 'none' ? tempScreen : activeTab}
          style={styles.main}
        >
          {/* Temporary Screen: Profile */}
          {tempScreen === 'profile' && (
            <ProfileScreen
              profile={profile}
              language={language}
              supplementRoutine={supplementRoutine}
              onLanguageChange={handleLanguageChange}
              onSaveProfile={handleSaveProfile}
              onRestoreComplete={handleRestoreComplete}
              onOpenAccount={() => setTempScreen('account')}
              onBack={() => setTempScreen('none')}
            />
          )}

          {/* Temporary Screen: Supplements */}
          {tempScreen === 'supplements' && (
            <SupplementsScreen
              selectedDate={selectedDate}
              routine={supplementRoutine}
              dailySupplements={log.dailySupplements}
              checks={log.supplements || []}
              onUpdateDailySupplements={handleUpdateDailySupplements}
              onUpdateRoutine={handleUpdateRoutine}
              onToggleSupplement={handleToggleSupplement}
              onBack={() => setTempScreen('none')}
            />
          )}

          {tempScreen === 'steps' && (
            <StepsScreen
              date={selectedDate}
              steps={log.steps || 0}
              goal={profile.stepGoal || 8000}
              weightKg={profile.weightKg}
              heightCm={profile.heightCm}
              onSetSteps={handleSaveSteps}
              onAddSteps={handleAddSteps}
              onSetGoal={handleSaveStepGoal}
              onBack={() => setTempScreen('none')}
            />
          )}

          {tempScreen === 'workouts' && (
            <WorkoutsScreen
              date={selectedDate}
              workouts={log.workouts || []}
              profile={profile}
              onSelectDate={setSelectedDate}
              onAddWorkout={handleAddWorkout}
              onUpdateWorkout={handleUpdateWorkout}
              onDeleteWorkout={handleDeleteWorkout}
              onBack={() => setTempScreen('none')}
            />
          )}

          {tempScreen === 'account' && (
            <AccountScreen
              user={authUser}
              onBack={() => setTempScreen('profile')}
              onRestoreComplete={handleRestoreComplete}
            />
          )}

          {/* Tab 1: Today */}
          {tempScreen === 'none' && activeTab === 'today' && (
            <DashboardScreen
              profile={profile}
              log={log}
              supplementRoutine={supplementRoutine}
              streak={streak}
              isLoading={!initialLoaded}
              onToggleSupplement={handleToggleSupplement}
              onUpdateWater={handleUpdateWater}
              onNavigateToMeals={handleNavigateToMeals}
              onOpenAddFood={handleOpenAddFoodToday}
              onOpenSupplements={() => setTempScreen('supplements')}
              onOpenProfile={() => setTempScreen('profile')}
              onOpenSteps={() => setTempScreen('steps')}
              onOpenWorkouts={() => setTempScreen('workouts')}
              onAddWorkout={handleAddWorkout}
              onDeleteWorkout={handleDeleteWorkout}
              onUpdateWorkout={handleUpdateWorkout}
              onOpenLogWeight={() => handleSwitchTab('progress')}
            />
          )}

          {/* Tab 2: Meals */}
          {tempScreen === 'none' && activeTab === 'meals' && (
            <FoodLogScreen
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              log={log}
              isLoading={!initialLoaded}
              onAddMeal={handleAddMeal}
              onUpdateMeal={handleUpdateMeal}
              onRemoveMeal={handleRemoveMeal}
              initialMealType={initialMealForAdd}
              onCopyYesterdayMeals={handleCopyYesterdayMeals}
            />
          )}

          {/* Tab 3: AI Coach */}
          {tempScreen === 'none' && activeTab === 'coach' && (
            <CoachScreen
              profile={profile}
              log={log}
              onSaveReport={handleSaveAIReport}
            />
          )}

          {/* Tab 4: Progress */}
          {tempScreen === 'none' && activeTab === 'progress' && (
            <ProgressScreen profile={profile} isLoading={!initialLoaded} />
          )}
        </ScreenTransitionView>

        {/* Global AddFoodSheet for Today and quick actions */}
        <AddFoodSheet
          visible={addSheetConfig.visible}
          mealType={addSheetConfig.mealType}
          date={addSheetConfig.targetDate}
          initialTab={addSheetConfig.initialTab}
          initialScanBarcode={addSheetConfig.initialScanBarcode}
          onClose={() => setAddSheetConfig((prev) => ({ ...prev, visible: false }))}
          onAddMeal={handleAddMeal}
          onCopyYesterdayMeals={handleCopyYesterdayMeals}
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
  initErrorContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  initErrorCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 28,
    alignItems: 'center',
    width: '100%',
    maxWidth: 380,
    ...theme.shadow.floating,
  },
  initErrorIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.dangerLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  initErrorTitle: {
    fontFamily: theme.fonts.serif,
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  initErrorMessage: {
    fontFamily: theme.fonts.sans,
    fontSize: 15,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  initRetryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    paddingVertical: 13,
    paddingHorizontal: 28,
    minWidth: 140,
  },
  initRetryButtonText: {
    fontFamily: theme.fonts.sans,
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
