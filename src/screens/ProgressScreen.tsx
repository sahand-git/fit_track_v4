import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Platform,
  BackHandler,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText as Text } from '../components/AppText';
import {
  TrendingDown,
  TrendingUp,
  Scale,
  Plus,
  Trash2,
  Calendar,
  X,
  Check,
  Flame,
  Info,
} from 'lucide-react-native';
import { DailyLog, UserProfile, WeightEntry } from '../types';
import { loadWeightHistory, addWeightEntry, removeWeightEntry, loadLogsForDates, loadAccurateStreak } from '../storage/storage';
import { getTodayDateString, formatDisplayDate, parseLocalDateString } from '../utils/dateUtils';
import { useLanguage } from '../i18n/I18nContext';
import { translate } from '../i18n/strings';
import { InsightsScreen } from './InsightsScreen';
import { TrendLineChart } from '../components/TrendLineChart';
import { TrendBarChart } from '../components/TrendBarChart';
import {
  generateDateWindow,
  CalorieTrendPoint,
  WeightTrendPoint,
} from '../utils/trends';
import { useTheme } from '../theme/ThemeContext';
import { ThemeType } from '../theme';
import { useIsRTL } from '../hooks/useIsRTL';
import * as Haptics from 'expo-haptics';
import { ProgressSkeleton } from '../components/SkeletonLoader';

interface ProgressScreenProps {
  profile?: UserProfile;
  isLoading?: boolean;
  onUpdateWeight?: (weightKg: number) => void;
}

export const ProgressScreen: React.FC<ProgressScreenProps> = ({ profile, isLoading, onUpdateWeight }) => {
  const language = useLanguage();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const bottomPadding = Math.max(110, insets.bottom + 76);
  const t = useCallback((key: string) => translate(language, key), [language]);

  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState<'weight' | 'nutrition'>('weight');
  const [history, setHistory] = useState<WeightEntry[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [inputWeight, setInputWeight] = useState(profile ? String(profile.weightKg) : '75');
  const [inputNote, setInputNote] = useState('');

  const [daysRange, setDaysRange] = useState<7 | 30>(7);
  const [trendCategory, setTrendCategory] = useState<'all' | 'weight' | 'calories'>('all');
  const [logsMap, setLogsMap] = useState<Record<string, DailyLog>>({});
  const [streak, setStreak] = useState<{ currentStreak: number; loggedToday: boolean }>({
    currentStreak: 0,
    loggedToday: false,
  });

  useEffect(() => {
    let isMounted = true;
    async function load() {
      const dates = generateDateWindow(getTodayDateString(), daysRange);
      const [wHistory, logs, accurateStreak] = await Promise.all([
        loadWeightHistory(),
        loadLogsForDates(dates),
        loadAccurateStreak(),
      ]);
      if (isMounted) {
        setHistory(wHistory);
        setLogsMap(logs);
        setStreak(accurateStreak);
        setLoading(false);
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [daysRange]);

  // Handle Android back button when modal is open
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const onBackPress = () => {
      if (modalVisible) {
        setModalVisible(false);
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [modalVisible]);

  const isRTL = useIsRTL();

  const dateList = useMemo(() => {
    return generateDateWindow(getTodayDateString(), daysRange);
  }, [daysRange]);

  const calorieData: CalorieTrendPoint[] = useMemo(() => {
    const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return dateList.map((d) => {
      const dayLog = logsMap[d];
      const totalCal = dayLog?.meals ? dayLog.meals.reduce((sum, m) => sum + m.calories, 0) : 0;
      const dateObj = parseLocalDateString(d);
      return {
        date: d,
        calories: totalCal,
        target: profile?.targetCalories || 2000,
        label: daysRange === 7 ? t(weekdayNames[dateObj.getDay()]) : d.slice(-2),
      };
    });
  }, [dateList, logsMap, daysRange, profile, t]);

  const weightData: WeightTrendPoint[] = useMemo(() => {
    const minDate = dateList[0];
    const maxDate = dateList[dateList.length - 1];
    const inWindow = history
      .filter((w) => w.date >= minDate && w.date <= maxDate)
      .sort((a, b) => a.date.localeCompare(b.date));

    if (inWindow.length > 0) {
      return inWindow.map((w) => ({
        date: w.date,
        value: w.weightKg,
        note: w.note,
      }));
    }
    if (profile?.weightKg) {
      return [{ date: getTodayDateString(), value: profile.weightKg }];
    }
    return [];
  }, [dateList, history, profile]);

  if (isLoading || loading) {
    return <ProgressSkeleton />;
  }

  const currentWeight = history.length > 0 
    ? history[history.length - 1].weightKg 
    : (profile?.weightKg ?? 75);

  const startWeight = history.length > 0 
    ? history[0].weightKg 
    : currentWeight;

  const totalDelta = Math.round((currentWeight - startWeight) * 10) / 10;

  const bmi = profile && profile.heightCm > 0
    ? (currentWeight / Math.pow(profile.heightCm / 100, 2)).toFixed(1)
    : '22.4';

  const bmiNum = parseFloat(bmi);
  const bmiCategory = bmiNum < 18.5
    ? t('Underweight')
    : bmiNum < 25
    ? t('Healthy Weight')
    : bmiNum < 30
    ? t('Overweight')
    : t('Obese');

  const handleSaveWeight = async () => {
    const num = parseFloat(inputWeight);
    if (isNaN(num) || num < 25 || num > 350) {
      Alert.alert(t('Invalid Weight'), t('Please enter a realistic weight between 25 and 350 kg.'));
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    const today = getTodayDateString();
    const entry: WeightEntry = {
      id: `w_${Date.now()}`,
      date: today,
      weightKg: Math.round(num * 10) / 10,
      note: inputNote.trim() || undefined,
      timestamp: new Date().toISOString(),
    };

    const updated = await addWeightEntry(entry);
    setHistory(updated);
    if (onUpdateWeight) {
      onUpdateWeight(num);
    }
    setModalVisible(false);
    setInputNote('');
  };

  const handleDeleteEntry = async (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    Alert.alert(
      t('Delete weight entry'),
      t('Are you sure you want to delete this weight record?'),
      [
        { text: t('Cancel'), style: 'cancel' },
        {
          text: t('Delete'),
          style: 'destructive',
          onPress: async () => {
            const updated = await removeWeightEntry(id);
            setHistory(updated);
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { direction: language === 'en' ? 'ltr' : 'rtl' }]}>
      {/* Top Ledger Segment Bar */}
      <View style={styles.segmentBar}>
        <TouchableOpacity
          style={[styles.segmentBtn, subTab === 'weight' && styles.segmentBtnActive]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            setSubTab('weight');
          }}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t('Body Weight')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Scale size={14} color={subTab === 'weight' ? theme.colors.primary : theme.colors.textMuted} />
          <Text style={[styles.segmentText, subTab === 'weight' && styles.segmentTextActive]}>
            {t('Body Weight')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, subTab === 'nutrition' && styles.segmentBtnActive]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            setSubTab('nutrition');
          }}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t('Weekly Nutrition')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Flame size={14} color={subTab === 'nutrition' ? theme.colors.primary : theme.colors.textMuted} />
          <Text style={[styles.segmentText, subTab === 'nutrition' && styles.segmentTextActive]}>
            {t('Weekly Nutrition')}
          </Text>
        </TouchableOpacity>
      </View>

      {subTab === 'nutrition' ? (
        <InsightsScreen profile={profile} />
      ) : (
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}>
          {/* Header */}
          <View style={[styles.headerRow, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
            <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
              <Text style={styles.headerSubtitle}>{t('Progress')}</Text>
              <Text style={styles.headerTitle}>{t('Progress & Trends')}</Text>
            </View>
            <TouchableOpacity
              style={[
                styles.addBtn,
                { flexDirection: isRTL ? 'row-reverse' : 'row' },
              ]}
              onPress={() => setModalVisible(true)}
              accessibilityLabel={t('Log weight')}
              accessibilityRole="button"
            >
              <Plus size={15} color={theme.colors.textInverted} />
              <Text style={styles.addBtnText}>{t('Log weight')}</Text>
            </TouchableOpacity>
          </View>

          {/* Range Selector & Category Filters */}
          <View style={[styles.rangeRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[styles.rangePills, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <TouchableOpacity
                style={[styles.rangePill, daysRange === 7 && styles.rangePillActive]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                  setDaysRange(7);
                }}
                accessibilityRole="button"
                accessibilityLabel={t('7 days')}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Text style={[styles.rangePillText, daysRange === 7 && styles.rangePillTextActive]}>
                  {t('7 days')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.rangePill, daysRange === 30 && styles.rangePillActive]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                  setDaysRange(30);
                }}
                accessibilityRole="button"
                accessibilityLabel={t('30 days')}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Text style={[styles.rangePillText, daysRange === 30 && styles.rangePillTextActive]}>
                  {t('30 days')}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.filterChipsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <TouchableOpacity
                style={[styles.filterChip, trendCategory === 'all' && styles.filterChipActive]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                  setTrendCategory('all');
                }}
                accessibilityRole="button"
                accessibilityLabel={t('All Trends')}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Text style={[styles.filterChipText, trendCategory === 'all' && styles.filterChipTextActive]}>
                  {t('All Trends')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterChip, trendCategory === 'weight' && styles.filterChipActive]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                  setTrendCategory('weight');
                }}
                accessibilityRole="button"
                accessibilityLabel={t('Weight Trend')}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Text style={[styles.filterChipText, trendCategory === 'weight' && styles.filterChipTextActive]}>
                  {t('Weight Trend')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterChip, trendCategory === 'calories' && styles.filterChipActive]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                  setTrendCategory('calories');
                }}
                accessibilityRole="button"
                accessibilityLabel={t('Calorie Trend')}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Text style={[styles.filterChipText, trendCategory === 'calories' && styles.filterChipTextActive]}>
                  {t('Calorie Trend')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Streak Card */}
          <View style={[styles.streakCard, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={styles.streakFlameCircle}>
              <Flame size={20} color={theme.colors.amber} />
            </View>
            <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
              <View style={[styles.inlineRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text style={styles.streakCount}>{streak.currentStreak}</Text>
                <Text style={styles.streakLabel}>{t('days streak')}</Text>
              </View>
              <Text style={styles.streakSubtitle}>
                {streak.loggedToday ? t('Logged today') : t('Log today to keep streak')}
              </Text>
            </View>
          </View>

          {/* Weight Trend Chart */}
          {(trendCategory === 'all' || trendCategory === 'weight') && (
            <View style={styles.trendBlock}>
              <View style={[styles.trendHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text style={styles.trendSectionTitle}>{t('Weight Trend')}</Text>
              </View>
              <TrendLineChart
                data={weightData}
                targetValue={profile?.targetWeightKg}
                unit="kg"
                isRTL={isRTL}
                selectedRange={daysRange}
              />
            </View>
          )}

          {/* Calorie Trend Chart */}
          {(trendCategory === 'all' || trendCategory === 'calories') && (
            <View style={styles.trendBlock}>
              <View style={[styles.trendHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text style={styles.trendSectionTitle}>{t('Calorie Consistency')}</Text>
              </View>
              <TrendBarChart
                data={calorieData}
                targetCalories={profile?.targetCalories || 2000}
                isRTL={isRTL}
                selectedRange={daysRange}
              />
            </View>
          )}

          {/* Current Weight Focus Card */}
          <View style={styles.heroCard}>
            <View style={[styles.heroTop, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View>
                <Text style={styles.heroLabel}>{t('Current Weight')}</Text>
                <View style={[styles.heroValueRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Text style={styles.heroValue}>{currentWeight}</Text>
                  <Text style={styles.heroUnit}>kg</Text>
                </View>
              </View>

              <View style={styles.heroRight}>
                <View style={[styles.deltaBadge, totalDelta <= 0 ? styles.deltaLoss : styles.deltaGain]}>
                  {totalDelta <= 0 ? (
                    <TrendingDown size={14} color={theme.colors.primary} />
                  ) : (
                    <TrendingUp size={14} color={theme.colors.accent} />
                  )}
                  <Text style={[styles.deltaBadgeText, totalDelta <= 0 ? { color: theme.colors.primary } : { color: theme.colors.accent }]}>
                    {totalDelta > 0 ? `+${totalDelta}` : `${totalDelta}`} kg
                  </Text>
                </View>
                <Text style={styles.deltaSub}>{t('Net change')}</Text>
              </View>
            </View>

            {/* BMI Meta */}
            <View style={styles.bmiStrip}>
              <Text style={styles.bmiText}>
                {t('BMI')}: <Text style={styles.boldText}>{bmi}</Text> • {bmiCategory}
              </Text>
            </View>
          </View>

          {/* Scientific Fluctuation Notice */}
          <View style={[styles.disclaimerCard, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Info size={14} color={theme.colors.secondary} />
            <Text style={styles.disclaimerText}>
              {t('Day-to-day weight fluctuations naturally reflect hydration, sodium, and digestion rather than immediate changes in fat or muscle mass. Track multi-week trends for meaningful insight.')}
            </Text>
          </View>

          {/* Real History List */}
          <View style={styles.historySection}>
            <Text style={styles.sectionTitle}>{t('Recorded Entries')}</Text>

            {history.length === 0 ? (
              <View style={styles.emptyHistoryBox}>
                <Scale size={28} color={theme.colors.textMuted} />
                <Text style={styles.emptyHistoryTitle}>{t('No weight entries logged yet')}</Text>
                <Text style={styles.emptyHistoryBody}>
                  {t('Tap "Log weight" above to track your weight across weeks.')}
                </Text>
              </View>
            ) : (
              [...history].reverse().map((entry) => (
                <View key={entry.id} style={styles.historyRow}>
                  <View style={styles.historyDateBox}>
                    <Calendar size={14} color={theme.colors.textMuted} />
                    <Text style={styles.historyDate}>{formatDisplayDate(entry.date, language)}</Text>
                  </View>

                  <View style={styles.historyRight}>
                    <Text style={styles.historyWeight}>{entry.weightKg} kg</Text>
                    {entry.note ? <Text style={styles.historyNote}>{entry.note}</Text> : null}
                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => handleDeleteEntry(entry.id)}
                      accessibilityRole="button"
                      accessibilityLabel={t('Delete entry')}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Trash2 size={14} color={theme.colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      )}

      {/* LOG WEIGHT MODAL */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ width: '100%', alignItems: 'center' }}
          >
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t('Record Weigh-in')}</Text>
                <TouchableOpacity
                  onPress={() => setModalVisible(false)}
                  accessibilityRole="button"
                  accessibilityLabel={t('Close')}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <X size={20} color={theme.colors.textPrimary} />
                </TouchableOpacity>
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalLabel}>{t('Weight (kg)')}</Text>
                <TextInput
                  style={styles.modalInput}
                  keyboardType="numeric"
                  value={inputWeight}
                  onChangeText={setInputWeight}
                  autoFocus
                />
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalLabel}>{t('Note (optional)')}</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder={t('Note (optional)')}
                  placeholderTextColor={theme.colors.textMuted}
                  value={inputNote}
                  onChangeText={setInputNote}
                />
              </View>

              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleSaveWeight}
                accessibilityRole="button"
                accessibilityLabel={t('Save Weigh-in')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Check size={16} color={theme.colors.textInverted} />
                <Text style={styles.modalSaveText}>{t('Save Weigh-in')}</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
};

const createStyles = (theme: ThemeType) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  segmentBar: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.md,
    marginTop: 10,
    marginBottom: 6,
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
    fontFamily: theme.fonts.sans,
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.textMuted,
  },
  segmentTextActive: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  content: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: 110,
    gap: 16,
  },
  headerRow: {
    gap: 10,
  },
  headerSubtitle: {
    fontFamily: theme.fonts.sans,
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  headerTitle: {
    fontFamily: theme.fonts.serif,
    fontSize: 26,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    letterSpacing: -0.4,
    marginTop: 2,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: theme.radius.full,
    ...theme.shadow.subtle,
  },
  addBtnText: {
    fontFamily: theme.fonts.sans,
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textInverted,
  },
  heroCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.subtle,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  heroLabel: {
    fontFamily: theme.fonts.sans,
    fontSize: 12,
    color: theme.colors.textMuted,
    fontWeight: '500',
  },
  heroValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginTop: 2,
  },
  heroValue: {
    fontFamily: theme.fonts.serif,
    fontSize: 36,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    letterSpacing: -0.6,
  },
  heroUnit: {
    fontFamily: theme.fonts.sans,
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.textMuted,
  },
  heroRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  deltaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.full,
  },
  deltaLoss: {
    backgroundColor: theme.colors.primaryLight,
  },
  deltaGain: {
    backgroundColor: theme.colors.accentLight,
  },
  deltaBadgeText: {
    fontFamily: theme.fonts.sans,
    fontSize: 12,
    fontWeight: '700',
  },
  deltaSub: {
    fontFamily: theme.fonts.sans,
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  bmiStrip: {
    backgroundColor: theme.colors.surfaceSubtle,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.radius.sm,
    marginTop: 4,
  },
  bmiText: {
    fontFamily: theme.fonts.sans,
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  boldText: {
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
  rangeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
    gap: 8,
    flexWrap: 'wrap',
  },
  rangePills: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.radius.full,
    padding: 3,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  rangePill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: theme.radius.full,
  },
  rangePillActive: {
    backgroundColor: theme.colors.primary,
  },
  rangePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  rangePillTextActive: {
    color: theme.colors.textInverted,
    fontWeight: '700',
  },
  filterChipsRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  filterChipTextActive: {
    color: theme.colors.textInverted,
    fontWeight: '700',
  },
  streakCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    gap: 12,
    marginBottom: theme.spacing.md,
    ...theme.shadow.subtle,
  },
  streakFlameCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: theme.colors.amberLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.amberBorder,
  },
  streakCount: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  streakLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  streakSubtitle: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 1,
  },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  trendBlock: {
    marginBottom: theme.spacing.md,
  },
  trendHeaderRow: {
    marginBottom: 6,
  },
  trendSectionTitle: {
    fontFamily: theme.fonts.serif,
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  disclaimerCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
  },
  disclaimerText: {
    flex: 1,
    fontFamily: theme.fonts.sans,
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  historySection: {
    gap: 8,
  },
  sectionTitle: {
    fontFamily: theme.fonts.serif,
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: 14,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  historyDateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  historyDate: {
    fontFamily: theme.fonts.sans,
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  historyRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  historyWeight: {
    fontFamily: theme.fonts.serif,
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  historyNote: {
    fontFamily: theme.fonts.sans,
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  deleteBtn: {
    padding: 4,
  },
  emptyHistoryBox: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 4,
  },
  emptyHistoryTitle: {
    fontFamily: theme.fonts.serif,
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  emptyHistoryBody: {
    fontFamily: theme.fonts.sans,
    fontSize: 12,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: theme.colors.backdrop,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 14,
    ...theme.shadow.floating,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontFamily: theme.fonts.serif,
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  modalInputGroup: {
    gap: 6,
  },
  modalLabel: {
    fontFamily: theme.fonts.sans,
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
  },
  modalInput: {
    fontFamily: theme.fonts.sans,
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: theme.colors.textPrimary,
  },
  modalSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    borderRadius: theme.radius.md,
    marginTop: 6,
  },
  modalSaveText: {
    fontFamily: theme.fonts.sans,
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textInverted,
  },
});
