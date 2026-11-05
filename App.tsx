import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Platform,
  BackHandler,
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { AppDialogProvider, appDialog } from './src/components/dialogs/AppDialogProvider';
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
  loadAccurateStreak,
  setDailySteps,
  addDailySteps,
  loadMedicalDisclaimerAccepted,
  saveMedicalDisclaimerAccepted,
  saveDailyAIReport,
  setAccountStorageNamespace,
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
import { WEB_APP_MAX_WIDTH } from './src/utils/dashboardLayout';
import { TodaySkeleton } from './src/components/SkeletonLoader';
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
import { I18nProvider, useLanguage } from './src/i18n/I18nContext';
import { translate } from './src/i18n/strings';
import { ThemeType } from './src/theme';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import * as Haptics from 'expo-haptics';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { getSpringConfig } from './src/utils/reanimatedMotion';
import { isReducedMotion } from './src/utils/motion';

import { StepsScreen } from './src/screens/StepsScreen';
import { WorkoutsScreen } from './src/screens/WorkoutsScreen';
import { AccountScreen } from './src/screens/AccountScreen';
import { AuthIdentity, watchAuthState } from './src/services/authService';

const getScreenTopOffset = (insetsTop: number, platform: string = Platform.OS) =>
  Math.max(insetsTop, platform === 'android' ? 24 : 0);

type Tab = 'today' | 'meals' | 'coach' | 'progress';
type TemporaryScreen = 'none' | 'profile' | 'supplements' | 'steps' | 'workouts' | 'account';

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <KeyboardProvider statusBarTranslucent navigationBarTranslucent>
          <FitTrackApp />
        </KeyboardProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const ThemedStatusBar: React.FC = () => {
  const { isDark } = useTheme();
  return <StatusBar style={isDark ? 'light' : 'dark'} />;
};

const ThemedAppLayout: React.FC<{
  children: React.ReactNode;
  direction?: 'ltr' | 'rtl';
  paddingTop?: number;
}> = ({ children, direction = 'ltr', paddingTop = 0 }) => {
  const { theme: activeTheme, isDark } = useTheme();

  if (Platform.OS === 'web') {
    return (
      <View
        style={[
          styles.webOuter,
          {
            backgroundColor: isDark ? activeTheme.colors.background : activeTheme.colors.surfaceSubtle,
          },
        ]}
      >
        <View
          style={[
            styles.container,
            styles.webColumn,
            {
              direction,
              paddingTop,
              backgroundColor: activeTheme.colors.background,
              borderColor: activeTheme.colors.border,
              shadowColor: activeTheme.colors.shadow,
            },
          ]}
        >
          {children}
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        {
          direction,
          paddingTop,
          backgroundColor: activeTheme.colors.background,
        },
      ]}
    >
      {children}
    </View>
  );
};

interface ThemedBottomNavProps {
  activeTab: Tab;
  tempScreen: TemporaryScreen;
  isHighlightToday: boolean;
  onSwitchTab: (tab: Tab) => void;
  insetsBottom: number;
}

interface AnimatedBottomNavItemProps {
  label: string;
  isActive: boolean;
  activeTheme: ThemeType;
  onPress: () => void;
  accessibilityLabel: string;
  icon: (color: string) => React.ReactNode;
}

const AnimatedBottomNavItem: React.FC<AnimatedBottomNavItemProps> = ({
  label,
  isActive,
  activeTheme,
  onPress,
  accessibilityLabel,
  icon,
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (!isReducedMotion()) {
      // eslint-disable-next-line react-hooks/immutability
      scale.value = withSpring(0.92, getSpringConfig('tactile'));
    }
  };

  const handlePressOut = () => {
    if (!isReducedMotion()) {
      // eslint-disable-next-line react-hooks/immutability
      scale.value = withSpring(1, getSpringConfig('pop'));
    }
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onPress();
  };

  const color = isActive ? activeTheme.colors.primary : activeTheme.colors.textMuted;

  return (
    <TouchableOpacity
      style={navItemStyles.navBtn}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.85}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
    >
      <Animated.View
        style={[
          navItemStyles.navPill,
          isActive && {
            backgroundColor: activeTheme.colors.primaryLight,
            borderColor: activeTheme.colors.primaryBorder,
            borderWidth: 1,
          },
          animatedStyle,
        ]}
      >
        {icon(color)}
        <Text
          style={[
            navItemStyles.navLabel,
            {
              fontFamily: activeTheme.fonts.sans,
              color,
              fontWeight: isActive ? '700' : '500',
            },
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

const navItemStyles = StyleSheet.create({
  navBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    paddingVertical: 2,
    paddingHorizontal: 2,
  },
  navPill: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    minWidth: 58,
  },
  navLabel: {
    fontSize: 12,
    marginTop: 3,
    textAlign: 'center',
  },
});

const ThemedBottomNav: React.FC<ThemedBottomNavProps> = ({
  activeTab,
  tempScreen,
  isHighlightToday,
  onSwitchTab,
  insetsBottom,
}) => {
  const { theme: activeTheme } = useTheme();
  const styles = useMemo(() => createNavStyles(activeTheme), [activeTheme]);
  const language = useLanguage();
  const t = useCallback((str: string) => translate(language, str), [language]);

  const dockBottom = insetsBottom > 0 ? insetsBottom + 8 : (Platform.OS === 'ios' ? 18 : 10);

  return (
    <>
      {/* Solid background covering the area below the tab bar and system navigation bar */}
      <View
        pointerEvents="none"
        style={[
          styles.bottomSolidBar,
          {
            height: dockBottom + 4,
            backgroundColor: activeTheme.colors.background,
          },
        ]}
      />
      <View
        style={[
          styles.dockContainer,
          {
            bottom: dockBottom,
          },
        ]}
      >
        <View style={styles.bottomNav}>
          <AnimatedBottomNavItem
            label={t('Today')}
            isActive={isHighlightToday}
            activeTheme={activeTheme}
            onPress={() => onSwitchTab('today')}
            accessibilityLabel={t('Today')}
            icon={(color) => <LayoutDashboard size={20} color={color} />}
          />
          <AnimatedBottomNavItem
            label={t('Diary')}
            isActive={tempScreen === 'none' && activeTab === 'meals'}
            activeTheme={activeTheme}
            onPress={() => onSwitchTab('meals')}
            accessibilityLabel={t('Diary')}
            icon={(color) => <UtensilsCrossed size={20} color={color} />}
          />
          <AnimatedBottomNavItem
            label={t('Coach')}
            isActive={tempScreen === 'none' && activeTab === 'coach'}
            activeTheme={activeTheme}
            onPress={() => onSwitchTab('coach')}
            accessibilityLabel={t('Coach')}
            icon={(color) => <Bot size={20} color={color} />}
          />
          <AnimatedBottomNavItem
            label={t('Progress')}
            isActive={tempScreen === 'none' && activeTab === 'progress'}
            activeTheme={activeTheme}
            onPress={() => onSwitchTab('progress')}
            accessibilityLabel={t('Progress')}
            icon={(color) => <TrendingUp size={20} color={color} />}
          />
        </View>
      </View>
    </>
  );
};

const createNavStyles = (activeTheme: ThemeType) =>
  StyleSheet.create({
    bottomSolidBar: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
    },
    dockContainer: {
      position: 'absolute',
      left: 14,
      right: 14,
      maxWidth: 500,
      alignSelf: 'center',
    },
    bottomNav: {
      flexDirection: 'row',
      backgroundColor: activeTheme.colors.surfaceElevated,
      borderRadius: 28,
      borderWidth: 1,
      borderColor: activeTheme.colors.borderStrong,
      paddingVertical: 6,
      paddingHorizontal: 8,
      justifyContent: 'space-around',
      alignItems: 'center',
      ...activeTheme.shadow.floating,
      shadowOpacity: 0.14,
      shadowRadius: 20,
      elevation: 8,
    },
  });

const InitErrorScreen: React.FC<{ onRetry: () => void; language: AppLanguage }> = ({ onRetry, language }) => {
  const { theme: activeTheme } = useTheme();
  const styles = useMemo(() => createInitErrorStyles(activeTheme), [activeTheme]);
  const t = (str: string) => translate(language, str);

  return (
    <View style={styles.initErrorContainer}>
      <View style={styles.initErrorCard}>
        <View style={styles.initErrorIconCircle}>
          <AlertTriangle size={36} color={activeTheme.colors.danger} />
        </View>
        <Text style={styles.initErrorTitle}>{t('Failed to start FitTrack')}</Text>
        <Text style={styles.initErrorMessage}>
          {t('Unable to load app data. Please try again.')}
        </Text>
        <TouchableOpacity
          style={styles.initRetryButton}
          onPress={onRetry}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={t('Retry')}
        >
          <RefreshCw size={18} color={activeTheme.colors.white} style={{ marginRight: 8 }} />
          <Text style={styles.initRetryButtonText}>{t('Retry')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const createInitErrorStyles = (activeTheme: ThemeType) =>
  StyleSheet.create({
    initErrorContainer: {
      flex: 1,
      backgroundColor: activeTheme.colors.background,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    initErrorCard: {
      backgroundColor: activeTheme.colors.surface,
      borderRadius: activeTheme.radius.lg,
      borderWidth: 1,
      borderColor: activeTheme.colors.border,
      padding: 28,
      alignItems: 'center',
      width: '100%',
      maxWidth: 380,
      ...activeTheme.shadow.floating,
    },
    initErrorIconCircle: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: activeTheme.colors.dangerLight,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },
    initErrorTitle: {
      fontFamily: activeTheme.fonts.serif,
      fontSize: 22,
      fontWeight: '700',
      color: activeTheme.colors.textPrimary,
      textAlign: 'center',
      marginBottom: 8,
    },
    initErrorMessage: {
      fontFamily: activeTheme.fonts.sans,
      fontSize: 15,
      color: activeTheme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: 24,
    },
    initRetryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: activeTheme.colors.primary,
      borderRadius: activeTheme.radius.md,
      paddingVertical: 13,
      paddingHorizontal: 28,
      minWidth: 140,
    },
    initRetryButtonText: {
      fontFamily: activeTheme.fonts.sans,
      fontSize: 15,
      fontWeight: '600',
      color: activeTheme.colors.white,
    },
  });

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
  const t = useCallback((str: string) => translate(language, str), [language]);

  const refreshStreak = useCallback(async () => {
    try {
      const res = await loadAccurateStreak();
      setStreak(res.currentStreak);
    } catch (e) {
      console.warn('Error calculating streak:', e);
    }
  }, []);

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
      try {
        const p = await loadUserProfile();
        const disclaimerAccepted = await loadMedicalDisclaimerAccepted();
        if (disclaimerAccepted && !p.hasAcceptedMedicalDisclaimer) {
          p.hasAcceptedMedicalDisclaimer = true;
        }
        if (isCancelled) return;
        setProfile(p);
        const appLang = p.language || 'en';
        setAppLanguage(appLang);
        const initialRoutine = await loadSupplementRoutine();
        if (isCancelled) return;
        setSupplementRoutine(initialRoutine);
        try {
          await refreshStreak();
        } catch (streakErr) {
          console.warn('Streak calculation warning during init:', streakErr);
        }

        // Reconcile reminders safely at startup WITHOUT requesting permission
        try {
          await initNotificationService();
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
        } catch (notifErr) {
          console.warn('Notification service bypassed during startup:', notifErr);
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
  }, [authReady, authUser?.uid, initRetryCount, refreshStreak]);

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
  }, [selectedDate, authReady, authUser?.uid, refreshStreak]);

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
  const handleUpdateWater = useCallback(async (delta: number) => {
    const targetDate = selectedDateRef.current;
    if (targetDate > getTodayDateString()) return;
    try {
      const updated = await updateWater(targetDate, delta);
      if (selectedDateRef.current === targetDate) {
        setLog(updated);
      }
    } catch (err) {
      console.error('Failed to update water:', err);
      appDialog.notify({ title: t('Error'), message: t('Could not update water intake.') });
    }
  }, [t]);

  const handleAddMeal = useCallback(async (meal: LoggedMeal, targetDate: string) => {
    if (targetDate > getTodayDateString()) return;
    try {
      const updated = await addMealToDay(targetDate, meal);
      if (selectedDateRef.current === targetDate) {
        setLog(updated);
      }
      await refreshStreak();
    } catch (err) {
      console.error('Failed to add meal:', err);
      appDialog.notify({ title: t('Error'), message: t('Failed to save meal.') });
    }
  }, [refreshStreak, t]);

  const handleUpdateMeal = useCallback(async (meal: LoggedMeal) => {
    const targetDate = selectedDateRef.current;
    try {
      const updated = await updateMealInDay(targetDate, meal);
      if (selectedDateRef.current === targetDate) {
        setLog(updated);
      }
    } catch (err) {
      console.error('Failed to update meal:', err);
      appDialog.notify({ title: t('Error'), message: t('Failed to update meal.') });
    }
  }, [t]);

  const handleRemoveMeal = useCallback(async (mealId: string) => {
    const targetDate = selectedDateRef.current;
    try {
      const updated = await removeMealFromDay(targetDate, mealId);
      if (selectedDateRef.current === targetDate) {
        setLog(updated);
      }
      await refreshStreak();
    } catch (err) {
      console.error('Failed to remove meal:', err);
      appDialog.notify({ title: t('Error'), message: t('Failed to remove meal.') });
    }
  }, [refreshStreak, t]);

  const handleCopyYesterdayMeals = useCallback(async (targetDate: string) => {
    try {
      const updated = await loadDailyLog(targetDate);
      if (selectedDateRef.current === targetDate) {
        setLog(updated);
      }
      await refreshStreak();
    } catch (err) {
      console.error('Failed to reload after copying meals:', err);
    }
  }, [refreshStreak]);

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
      appDialog.notify({ title: t('Save Error'), message: t('Could not save your profile changes. Please try again.') });
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
      appDialog.notify({ title: t('Save Error'), message: t('Could not save language preference. Please try again.') });
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

  const handleToggleSupplement = useCallback(async (id: string, taken: boolean) => {
    const targetDate = selectedDateRef.current;
    if (targetDate > getTodayDateString()) return;
    const updated = await setSupplementTaken(targetDate, id, taken);
    if (selectedDateRef.current === targetDate) {
      setLog(updated);
    }
  }, []);

  const handleAddWorkout = useCallback(async (workout: WorkoutEntry, targetDate: string) => {
    if (targetDate > getTodayDateString()) return;
    try {
      const updated = await addWorkoutToDay(targetDate, workout);
      if (selectedDateRef.current === targetDate) {
        setLog(updated);
      }
      await refreshStreak();
    } catch (err) {
      console.error('Failed to add workout:', err);
      appDialog.notify({ title: t('Error'), message: t('Failed to save workout.') });
    }
  }, [refreshStreak, t]);

  const handleDeleteWorkout = useCallback(async (workoutId: string) => {
    const targetDate = selectedDateRef.current;
    try {
      const updated = await removeWorkoutFromDay(targetDate, workoutId);
      if (selectedDateRef.current === targetDate) {
        setLog(updated);
      }
      await refreshStreak();
    } catch (err) {
      console.error('Failed to delete workout:', err);
      appDialog.notify({ title: t('Error'), message: t('Failed to delete workout.') });
    }
  }, [refreshStreak, t]);

  const handleUpdateWorkout = useCallback(async (workout: WorkoutEntry, targetDate: string) => {
    if (targetDate > getTodayDateString()) return;
    const updated = await updateWorkoutInDay(targetDate, workout);
    if (selectedDateRef.current === targetDate) setLog(updated);
  }, []);

  const handleSaveAIReport = useCallback(async (report: AICoachReport, targetDate: string) => {
    const updated = await saveDailyAIReport(targetDate, report);
    if (selectedDateRef.current === targetDate) setLog(updated);
  }, []);

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

  const handleNavigateToMeals = useCallback((targetMeal?: MealType) => {
    if (targetMeal) setInitialMealForAdd(targetMeal);
    setTempScreen('none');
    setActiveTab('meals');
  }, []);

  const handleSwitchTab = useCallback((tab: Tab) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setTempScreen('none');
    if (tab === 'today') {
      setSelectedDate(getTodayDateString());
    }
    setActiveTab(tab);
  }, []);

  const handleSelectDate = useCallback((newDate: string) => {
    setSelectedDate(newDate);
  }, []);

  const handleOpenAddFoodToday = useCallback((
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
  }, []);

  const handleOpenSupplements = useCallback(() => setTempScreen('supplements'), []);
  const handleOpenProfile = useCallback(() => setTempScreen('profile'), []);
  const handleOpenSteps = useCallback(() => setTempScreen('steps'), []);
  const handleOpenWorkouts = useCallback(() => setTempScreen('workouts'), []);
  const handleOpenLogWeight = useCallback(() => handleSwitchTab('progress'), [handleSwitchTab]);
  const handleUpdateProfile = useCallback(async (p: UserProfile) => {
    await saveUserProfile(p);
    setProfile(p);
  }, []);
  const handleBackToNone = useCallback(() => setTempScreen('none'), []);
  const handleBackToProfile = useCallback(() => setTempScreen('profile'), []);
  const handleCloseAddSheet = useCallback(() => setAddSheetConfig((prev) => ({ ...prev, visible: false })), []);

  if (initError) {
    return (
      <I18nProvider language={language}>
        <ThemeProvider themeMode={profile?.themeMode}>
          <InitErrorScreen
            language={language}
            onRetry={() => {
              setInitError(null);
              setInitRetryCount((c) => c + 1);
            }}
          />
        </ThemeProvider>
      </I18nProvider>
    );
  }

  if (!initialLoaded) {
    return (
      <I18nProvider language={language}>
        <ThemeProvider themeMode={profile.themeMode}>
          <View
            style={[
              styles.container,
              {
                direction: language === 'en' ? 'ltr' : 'rtl',
                paddingTop: getScreenTopOffset(insets.top, Platform.OS),
              },
            ]}
          >
            <ThemedStatusBar />
            <TodaySkeleton />
          </View>
        </ThemeProvider>
      </I18nProvider>
    );
  }

  if (!profile.hasAcceptedMedicalDisclaimer && tempScreen !== 'account') {
    return (
      <I18nProvider language={language}>
        <ThemeProvider themeMode={profile.themeMode}>
          <AppDialogProvider>
            <ThemedAppLayout
              direction={language === 'en' ? 'ltr' : 'rtl'}
              paddingTop={getScreenTopOffset(insets.top, Platform.OS)}
            >
              <ThemedStatusBar />
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
            </ThemedAppLayout>
          </AppDialogProvider>
        </ThemeProvider>
      </I18nProvider>
    );
  }

  if (!profile.isOnboarded && tempScreen !== 'account') {
    return (
      <I18nProvider language={language}>
        <ThemeProvider themeMode={profile.themeMode}>
          <AppDialogProvider>
            <ThemedAppLayout
              direction={language === 'en' ? 'ltr' : 'rtl'}
              paddingTop={getScreenTopOffset(insets.top, Platform.OS)}
            >
              <ThemedStatusBar />
              <OnboardingModal onComplete={handleSaveProfile} onLanguageChange={setAppLanguage} />
            </ThemedAppLayout>
          </AppDialogProvider>
        </ThemeProvider>
      </I18nProvider>
    );
  }

  // Highlight 'today' if a temporary screen is open
  const isHighlightToday = tempScreen !== 'none' || activeTab === 'today';

  return (
    <I18nProvider language={language}>
      <ThemeProvider themeMode={profile.themeMode}>
        <AppDialogProvider>
          <ThemedAppLayout
            direction={language === 'en' ? 'ltr' : 'rtl'}
            paddingTop={getScreenTopOffset(insets.top, Platform.OS)}
          >
            <ThemedStatusBar />

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
              meals={log.meals}
              profile={profile}
              onUpdateProfile={handleSaveProfile}
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
              onSelectDate={handleSelectDate}
              onAddWorkout={handleAddWorkout}
              onUpdateWorkout={handleUpdateWorkout}
              onDeleteWorkout={handleDeleteWorkout}
              onBack={handleBackToNone}
            />
          )}

          {tempScreen === 'account' && (
            <AccountScreen
              user={authUser}
              onBack={handleBackToProfile}
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
              onOpenSupplements={handleOpenSupplements}
              onOpenProfile={handleOpenProfile}
              onOpenSteps={handleOpenSteps}
              onOpenWorkouts={handleOpenWorkouts}
              onAddWorkout={handleAddWorkout}
              onDeleteWorkout={handleDeleteWorkout}
              onUpdateWorkout={handleUpdateWorkout}
              onOpenLogWeight={handleOpenLogWeight}
              onUpdateProfile={handleUpdateProfile}
              isAddFoodSheetOpen={addSheetConfig.visible}
            />
          )}

          {/* Tab 2: Meals */}
          {tempScreen === 'none' && activeTab === 'meals' && (
            <FoodLogScreen
              profile={profile}
              selectedDate={selectedDate}
              onSelectDate={handleSelectDate}
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
          onClose={handleCloseAddSheet}
          onAddMeal={handleAddMeal}
          onRemoveMeal={handleRemoveMeal}
          onCopyYesterdayMeals={handleCopyYesterdayMeals}
        />

        {/* Bottom Navigation Dock: Exactly 4 Tabs */}
        <ThemedBottomNav
          activeTab={activeTab}
          tempScreen={tempScreen}
          isHighlightToday={isHighlightToday}
          onSwitchTab={handleSwitchTab}
          insetsBottom={insets.bottom}
        />
      </ThemedAppLayout>
      </AppDialogProvider>
      </ThemeProvider>
    </I18nProvider>
  );
}

const styles = StyleSheet.create({
  webOuter: {
    flex: 1,
    width: '100%',
    minHeight: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  webColumn: {
    width: '100%',
    maxWidth: WEB_APP_MAX_WIDTH,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    marginHorizontal: 'auto',
    ...Platform.select({
      web: {
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      default: {},
    }),
  },
  container: {
    flex: 1,
    position: 'relative',
  },
  main: {
    flex: 1,
  },
});
