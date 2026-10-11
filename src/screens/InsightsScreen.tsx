import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import {
  Flame,
  Dumbbell,
  Sparkles,
  Award,
  Calendar,
  AlertCircle,
} from 'lucide-react-native';
import { UserProfile, DailyLog } from '../types';
import { loadLogsForDates } from '../storage/storage';
import { getPastDates, parseLocalDateString, formatDisplayDate } from '../utils/dateUtils';
import { theme } from '../theme';
import * as Haptics from 'expo-haptics';

interface InsightsScreenProps {
  profile?: UserProfile;
}

export const InsightsScreen: React.FC<InsightsScreenProps> = ({ profile }) => {
  const [daysLogs, setDaysLogs] = useState<{ date: string; log: DailyLog; dayLabel: string }[]>([]);
  const [selectedDayIdx, setSelectedDayIdx] = useState<number | null>(null);

  useEffect(() => {
    async function loadPastWeek() {
      const dates = getPastDates(7);
      const logsMap = await loadLogsForDates(dates);
      const parsed = dates.map((d) => {
        const dateObj = parseLocalDateString(d);
        const dayLabel = dateObj.toLocaleDateString(undefined, { weekday: 'short' });
        return {
          date: d,
          log: logsMap[d] || { date: d, meals: [], waterGlasses: 0, steps: 0 },
          dayLabel,
        };
      });
      setDaysLogs(parsed);
      setSelectedDayIdx(parsed.length - 1);
    }
    loadPastWeek();
  }, []);

  const calorieTarget = profile?.targetCalories || 2000;
  const proteinTarget = profile?.targetProtein || 140;

  // Real calculations over the 7 days
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Top Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.headerSubtitle}>7-DAY SUMMARY</Text>
          <Text style={styles.headerTitle}>Nutrition Insights</Text>
        </View>
        <View style={styles.rangeBadge}>
          <Calendar size={14} color={theme.colors.primary} />
          <Text style={styles.rangeBadgeText}>Last 7 Days</Text>
        </View>
      </View>

      {/* Quick Stats Grid */}
      <View style={styles.statsGrid}>
        {/* Stat 1: Daily Average Calories */}
        <View style={styles.statCard}>
          <View style={styles.statTop}>
            <Text style={styles.statLabel}>AVG LOGGED CALORIES</Text>
            <View style={[styles.statIconBox, { backgroundColor: theme.colors.accentLight }]}>
              <Flame size={15} color={theme.colors.accent} />
            </View>
          </View>
          <View style={styles.statValueRow}>
            <Text style={styles.statValue}>{dailyAvgCalories}</Text>
            <Text style={styles.statUnit}>kcal/day</Text>
          </View>
          <Text style={styles.statSub}>
            {activeDays.length > 0
              ? `Across ${activeDays.length} active day(s)`
              : 'No meals logged yet'}
          </Text>
        </View>

        {/* Stat 2: Daily Average Protein */}
        <View style={styles.statCard}>
          <View style={styles.statTop}>
            <Text style={styles.statLabel}>AVG PROTEIN</Text>
            <View style={[styles.statIconBox, { backgroundColor: theme.colors.primaryLight }]}>
              <Dumbbell size={15} color={theme.colors.primary} />
            </View>
          </View>
          <View style={styles.statValueRow}>
            <Text style={styles.statValue}>{dailyAvgProtein}</Text>
            <Text style={styles.statUnit}>g/day</Text>
          </View>
          <Text style={styles.statSub}>Target: {proteinTarget}g</Text>
        </View>
      </View>

      {/* Weekly 7-Day Calorie Bar Chart */}
      <View style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <View>
            <Text style={styles.chartTitle}>7-Day Calorie Intake</Text>
            <Text style={styles.chartSubtitle}>Computed directly from your diary</Text>
          </View>
          <View style={styles.targetPill}>
            <View style={styles.targetDot} />
            <Text style={styles.targetPillText}>{calorieTarget} kcal Target</Text>
          </View>
        </View>

        {/* 7 Bars */}
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
                            ? theme.colors.surfaceBorder
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

        {/* Selected Day Details */}
        {selectedEntry && (
          <View style={styles.detailBanner}>
            <View style={styles.detailLeft}>
              <Text style={styles.detailDayText}>
                {formatDisplayDate(selectedEntry.date)}: {selectedCalories} kcal
              </Text>
            </View>
            <Text style={styles.detailStatusText}>
              {selectedCalories === 0
                ? 'No entries'
                : selectedCalories <= calorieTarget
                ? `${calorieTarget - selectedCalories} kcal under`
                : `${selectedCalories - calorieTarget} kcal over`}
            </Text>
          </View>
        )}
      </View>

      {/* Generated Analysis Observations */}
      <View style={styles.insightsSection}>
        <View style={styles.sectionHeader}>
          <Sparkles size={16} color={theme.colors.primary} />
          <Text style={styles.sectionTitle}>Diary Observations</Text>
        </View>

        {activeDays.length === 0 ? (
          <View style={styles.emptyCard}>
            <AlertCircle size={24} color={theme.colors.textMuted} />
            <Text style={styles.emptyTitle}>Not enough logged days yet</Text>
            <Text style={styles.emptyBody}>
              Log meals over several days to unlock nutritional consistency reports and trend insights.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.insightCard}>
              <View style={[styles.insightIconBox, { backgroundColor: theme.colors.primaryLight }]}>
                <Award size={18} color={theme.colors.primary} />
              </View>
              <View style={styles.insightContent}>
                <Text style={styles.insightTitle}>Tracking Consistency</Text>
                <Text style={styles.insightBody}>
                  You have logged food on {activeDays.length} out of the last 7 days. Daily logging is the #1 predictor of meeting fitness goals.
                </Text>
              </View>
            </View>

            {dailyAvgProtein > 0 && (
              <View style={styles.insightCard}>
                <View style={[styles.insightIconBox, { backgroundColor: theme.colors.accentLight }]}>
                  <Dumbbell size={18} color={theme.colors.accent} />
                </View>
                <View style={styles.insightContent}>
                  <Text style={styles.insightTitle}>Protein Average</Text>
                  <Text style={styles.insightBody}>
                    Your average protein intake is {dailyAvgProtein}g/day (Target: {proteinTarget}g). {dailyAvgProtein >= proteinTarget ? 'Great job hitting your muscle synthesis target!' : 'Try adding a lean protein source like chicken breast or Greek yogurt.'}
                  </Text>
                </View>
              </View>
            )}
          </>
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
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 110,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerSubtitle: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.textMuted,
    letterSpacing: 1.2,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    marginTop: 2,
  },
  rangeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  rangeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  statTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: theme.colors.textMuted,
    letterSpacing: 0.6,
  },
  statIconBox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginTop: 8,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  statUnit: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  statSub: {
    fontSize: 10,
    color: theme.colors.textMuted,
    marginTop: 4,
  },
  chartCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    marginBottom: 16,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  chartSubtitle: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  targetPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.surfaceLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radius.full,
  },
  targetDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.primary,
  },
  targetPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  barChartContainer: {
    height: 140,
    justifyContent: 'flex-end',
    marginBottom: 12,
  },
  barsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    height: 120,
    justifyContent: 'flex-end',
  },
  barTrack: {
    width: 22,
    height: 100,
    backgroundColor: theme.colors.surfaceLight,
    borderRadius: 11,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    padding: 2,
  },
  barFill: {
    width: '100%',
    borderRadius: 8,
  },
  barFillSelected: {
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  dayLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textMuted,
    marginTop: 6,
  },
  dayLabelSelected: {
    color: theme.colors.textPrimary,
    fontWeight: '800',
  },
  detailBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceLight,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: theme.radius.md,
  },
  detailLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailDayText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  detailStatusText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  insightsSection: {
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  emptyCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  emptyBody: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  insightCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: 14,
    flexDirection: 'row',
    gap: 12,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  insightIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  insightBody: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
});
