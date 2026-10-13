import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText as Text } from '../components/AppText';
import {
  Flame,
  Dumbbell,
  Calendar,
  AlertCircle,
} from 'lucide-react-native';
import { UserProfile, DailyLog } from '../types';
import { loadLogsForDates } from '../storage/storage';
import { getPastDates, parseLocalDateString, formatDisplayDate } from '../utils/dateUtils';
import { useLanguage } from '../i18n/I18nContext';
import { translate } from '../i18n/strings';
import { theme } from '../theme';
import * as Haptics from 'expo-haptics';

interface InsightsScreenProps {
  profile?: UserProfile;
}

export const InsightsScreen: React.FC<InsightsScreenProps> = ({ profile }) => {
  const language = useLanguage();
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(110, insets.bottom + 76);
  const t = (key: string) => translate(language, key);

  const [daysLogs, setDaysLogs] = useState<{ date: string; log: DailyLog; dayLabel: string }[]>([]);
  const [selectedDayIdx, setSelectedDayIdx] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadPastWeek() {
      const dates = getPastDates(7);
      const logsMap = await loadLogsForDates(dates);
      if (!isMounted) return;
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const parsed = dates.map((d) => {
        const dateObj = parseLocalDateString(d);
        const dayLabel = t(dayNames[dateObj.getDay()]);
        return {
          date: d,
          log: logsMap[d] || { date: d, meals: [], waterGlasses: 0, steps: 0 },
          dayLabel,
        };
      });
      if (isMounted) {
        setDaysLogs(parsed);
        setSelectedDayIdx(parsed.length - 1);
      }
    }
    loadPastWeek();
    return () => {
      isMounted = false;
    };
  }, [language]);

  const calorieTarget = profile?.targetCalories || 2000;
  const proteinTarget = profile?.targetProtein || 140;

  const activeDays = daysLogs.filter((d) => d.log.meals.length > 0);
  const totalCaloriesLogged = daysLogs.reduce((sum, d) => {
    return sum + d.log.meals.reduce((mSum, m) => mSum + m.calories, 0);
  }, 0);

  const totalProteinLogged = daysLogs.reduce((sum, d) => {
    return sum + d.log.meals.reduce((mSum, m) => mSum + m.protein, 0);
  }, 0);

  const dailyAvgCalories = activeDays.length > 0
    ? Math.round(totalCaloriesLogged / activeDays.length)
    : 0;

  const dailyAvgProtein = activeDays.length > 0
    ? Math.round((totalProteinLogged / activeDays.length) * 10) / 10
    : 0;

  const selectedEntry = selectedDayIdx !== null && daysLogs[selectedDayIdx]
    ? daysLogs[selectedDayIdx]
    : null;

  const selectedCalories = selectedEntry
    ? selectedEntry.log.meals.reduce((sum, m) => sum + m.calories, 0)
    : 0;

  const maxWeeklyCalories = Math.max(
    calorieTarget * 1.2,
    ...daysLogs.map((d) => d.log.meals.reduce((s, m) => s + m.calories, 0))
  );

  return (
    <ScrollView
      style={[styles.container, { direction: language === 'en' ? 'ltr' : 'rtl' }]}
      contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.headerSubtitle}>{t('Weekly Review')}</Text>
          <Text style={styles.headerTitle}>{t('Nutrition Insights')}</Text>
        </View>
        <View style={styles.rangeBadge}>
          <Calendar size={13} color={theme.colors.textMuted} />
          <Text style={styles.rangeBadgeText}>{t('Last 7 Days')}</Text>
        </View>
      </View>

      {/* Quick Averages Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <View style={styles.statTop}>
            <Text style={styles.statLabel}>{t('Daily Average')}</Text>
            <Flame size={15} color={theme.colors.accent} />
          </View>
          <View style={styles.statValueRow}>
            <Text style={styles.statValue}>{dailyAvgCalories}</Text>
            <Text style={styles.statUnit}>kcal</Text>
          </View>
          <Text style={styles.statSub}>
            {activeDays.length > 0 ? `${activeDays.length} ${t('of')} 7 ${t('days logged')}` : t('No data yet')}
          </Text>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statTop}>
            <Text style={styles.statLabel}>{t('Avg Protein')}</Text>
            <Dumbbell size={15} color={theme.colors.primary} />
          </View>
          <View style={styles.statValueRow}>
            <Text style={styles.statValue}>{dailyAvgProtein}</Text>
            <Text style={styles.statUnit}>g</Text>
          </View>
          <Text style={styles.statSub}>{t('Target')}: {proteinTarget}g</Text>
        </View>
      </View>

      {/* 7-Day Calorie Chart */}
      <View style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>{t('7-Day Intake Trend')}</Text>
          <Text style={styles.targetLabel}>{calorieTarget} {t('kcal target')}</Text>
        </View>

        <View style={styles.barChartContainer}>
          <View style={styles.barsRow}>
            {daysLogs.map((item, idx) => {
              const dayKcal = item.log.meals.reduce((s, m) => s + m.calories, 0);
              const heightPct = maxWeeklyCalories > 0
                ? Math.min(100, Math.max(6, Math.round((dayKcal / maxWeeklyCalories) * 100)))
                : 6;
              const isSelected = selectedDayIdx === idx;
              const hasData = dayKcal > 0;

              return (
                <TouchableOpacity
                  key={item.date}
                  style={styles.barColumn}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                    setSelectedDayIdx(idx);
                  }}
                  activeOpacity={0.8}
                >
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          height: `${heightPct}%`,
                          backgroundColor: !hasData
                            ? theme.colors.surfaceSubtle
                            : dayKcal <= calorieTarget
                            ? theme.colors.primary
                            : theme.colors.accent,
                        },
                        isSelected && styles.barFillSelected,
                      ]}
                    />
                  </View>
                  <Text style={[styles.dayLabel, isSelected && styles.dayLabelSelected]}>
                    {item.dayLabel}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {selectedEntry && (
          <View style={styles.detailBanner}>
            <Text style={styles.detailDayText}>
              {formatDisplayDate(selectedEntry.date, language)}: {selectedCalories} kcal
            </Text>
            <Text style={styles.detailStatusText}>
              {selectedCalories === 0
                ? t('No entries')
                : selectedCalories <= calorieTarget
                ? `${calorieTarget - selectedCalories} ${t('kcal under budget')}`
                : `${selectedCalories - calorieTarget} ${t('kcal over budget')}`}
            </Text>
          </View>
        )}
      </View>

      {/* Observations Section */}
      <View style={styles.insightsSection}>
        <Text style={styles.sectionTitle}>{t('Weekly Observations')}</Text>

        {activeDays.length === 0 ? (
          <View style={styles.emptyCard}>
            <AlertCircle size={22} color={theme.colors.textMuted} />
            <Text style={styles.emptyTitle}>{t('Not enough logged days yet')}</Text>
            <Text style={styles.emptyBody}>
              {t('Log meals over several days to unlock consistency and habit trends.')}
            </Text>
          </View>
        ) : (
          <View style={styles.observationCard}>
            <Text style={styles.observationTitle}>{t('Logging Consistency')}</Text>
            <Text style={styles.observationBody}>
              {t('You have tracked food on')} {activeDays.length} {t('out of the last 7 days. Consistency helps establish a clear metabolic baseline.')}
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: 110,
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerSubtitle: {
    fontFamily: theme.fonts.sans,
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.secondary,
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
  rangeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  rangeBadgeText: {
    fontFamily: theme.fonts.sans,
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.subtle,
  },
  statTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    fontFamily: theme.fonts.sans,
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.textMuted,
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginTop: 6,
  },
  statValue: {
    fontFamily: theme.fonts.serif,
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  statUnit: {
    fontFamily: theme.fonts.sans,
    fontSize: 12,
    color: theme.colors.textMuted,
    fontWeight: '500',
  },
  statSub: {
    fontFamily: theme.fonts.sans,
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 4,
  },
  chartCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.subtle,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  chartTitle: {
    fontFamily: theme.fonts.serif,
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  targetLabel: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  barChartContainer: {
    height: 120,
    justifyContent: 'flex-end',
    marginBottom: 10,
  },
  barsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 100,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    height: 100,
    justifyContent: 'flex-end',
  },
  barTrack: {
    width: 18,
    height: 80,
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: 9,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 8,
  },
  barFillSelected: {
    borderWidth: 1.5,
    borderColor: theme.colors.textPrimary,
  },
  dayLabel: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 6,
  },
  dayLabelSelected: {
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
  detailBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceSubtle,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radius.md,
    marginTop: 4,
  },
  detailDayText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  detailStatusText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  insightsSection: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  emptyCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 4,
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  emptyBody: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  observationCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 4,
    ...theme.shadow.subtle,
  },
  observationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  observationBody: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
});
