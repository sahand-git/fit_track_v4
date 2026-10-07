import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import {
  Calendar,
  Flame,
  Dumbbell,
  Sparkles,
  TrendingUp,
  AlertCircle,
  Award,
  ArrowRight,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

export const InsightsScreen: React.FC = () => {
  const [selectedDay, setSelectedDay] = useState({
    day: 'Tue',
    kcal: '2,010 kcal',
    status: 'Sweet spot hit!',
  });

  const weeklyData = [
    { day: 'Mon', kcal: '1,940', status: 'Within target', height: '78%', color: '#FA5D29' },
    { day: 'Tue', kcal: '2,010', status: 'Sweet spot hit!', height: '82%', color: '#10B981' },
    { day: 'Wed', kcal: '1,890', status: '94% of target', height: '74%', color: '#FA5D29' },
    { day: 'Thu', kcal: '1,995', status: 'Perfect match', height: '80%', color: '#10B981' },
    { day: 'Fri', kcal: '2,050', status: 'Post-workout fuel', height: '84%', color: '#FA5D29' },
    { day: 'Sat', kcal: '2,240', status: '+240 kcal dinner out', height: '94%', color: '#AE3100' },
    { day: 'Sun', kcal: '1,750', status: 'Light rest day', height: '68%', color: '#FA5D29' },
  ];

  const handleSelectBar = (item: (typeof weeklyData)[0]) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setSelectedDay({
      day: item.day,
      kcal: `${item.kcal} kcal`,
      status: item.status,
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Top Header & Period Filter */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.headerSubtitle}>WEEKLY REVIEW</Text>
          <Text style={styles.headerTitle}>Your Insights</Text>
        </View>
        <TouchableOpacity style={styles.dateFilterBtn}>
          <Calendar size={15} color="#FA5D29" />
          <Text style={styles.dateFilterText}>Oct 1 - Oct 7</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Stats Grid */}
      <View style={styles.statsGrid}>
        {/* Stat 1: Daily Average */}
        <View style={styles.statCard}>
          <View style={styles.statTop}>
            <Text style={styles.statLabel}>DAILY AVERAGE</Text>
            <View style={[styles.statIconBox, { backgroundColor: 'rgba(250, 93, 41, 0.15)' }]}>
              <Flame size={15} color="#FA5D29" />
            </View>
          </View>
          <View style={styles.statValueRow}>
            <Text style={styles.statValue}>1,982</Text>
            <Text style={styles.statUnit}>kcal</Text>
          </View>
          <View style={styles.badgeRow}>
            <View style={styles.badgeGreen}>
              <Text style={styles.badgeGreenText}>99% goal</Text>
            </View>
            <Text style={styles.badgeSub}>Target 2,000</Text>
          </View>
        </View>

        {/* Stat 2: Protein Intake */}
        <View style={styles.statCard}>
          <View style={styles.statTop}>
            <Text style={styles.statLabel}>PROTEIN PACE</Text>
            <View style={[styles.statIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
              <Dumbbell size={15} color="#10B981" />
            </View>
          </View>
          <View style={styles.statValueRow}>
            <Text style={styles.statValue}>126</Text>
            <Text style={styles.statUnit}>g/day</Text>
          </View>
          <View style={styles.badgeRow}>
            <View style={styles.badgeGreen}>
              <Text style={styles.badgeGreenText}>+12%</Text>
            </View>
            <Text style={styles.badgeSub}>vs last week</Text>
          </View>
        </View>
      </View>

      {/* Weekly Calorie Intake Trend Card */}
      <View style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <View>
            <Text style={styles.chartTitle}>Calorie Trend</Text>
            <Text style={styles.chartSubtitle}>Monday — Sunday breakdown</Text>
          </View>
          <View style={styles.targetPill}>
            <View style={styles.targetDot} />
            <Text style={styles.targetPillText}>2,000 kcal Target</Text>
          </View>
        </View>

        {/* 7-Day Bar Chart */}
        <View style={styles.barChartContainer}>
          {/* Target Line */}
          <View style={styles.dashedTargetLine} />

          <View style={styles.barsRow}>
            {weeklyData.map((item) => {
              const isSelected = selectedDay.day === item.day;
              return (
                <TouchableOpacity
                  key={item.day}
                  style={styles.barColumn}
                  onPress={() => handleSelectBar(item)}
                  activeOpacity={0.8}
                >
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          height: item.height as any,
                          backgroundColor: item.color,
                        },
                        isSelected && styles.barFillSelected,
                      ]}
                    />
                  </View>
                  <Text style={[styles.dayLabel, isSelected && styles.dayLabelSelected]}>
                    {item.day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Interactive Detail Status Banner */}
        <View style={styles.detailBanner}>
          <View style={styles.detailLeft}>
            <View style={styles.detailDot} />
            <Text style={styles.detailDayText}>
              {selectedDay.day}: {selectedDay.kcal}
            </Text>
          </View>
          <Text style={styles.detailStatusText}>{selectedDay.status}</Text>
        </View>
      </View>

      {/* Macronutrient Distribution Breakdown */}
      <View style={styles.macroCard}>
        <View style={styles.chartHeader}>
          <View>
            <Text style={styles.chartTitle}>Macronutrient Balance</Text>
            <Text style={styles.chartSubtitle}>Actual distribution this week</Text>
          </View>
          <View style={styles.planBadge}>
            <Text style={styles.planBadgeText}>Balanced Plan</Text>
          </View>
        </View>

        {/* Segmented Bar Visualization */}
        <View style={styles.segmentedBar}>
          <View style={[styles.segment, { width: '45%', backgroundColor: '#FA5D29' }]} />
          <View style={[styles.segment, { width: '30%', backgroundColor: '#10B981' }]} />
          <View style={[styles.segment, { width: '25%', backgroundColor: '#3298DC' }]} />
        </View>

        {/* Macro Details Legend */}
        <View style={styles.macroLegendRow}>
          <View style={styles.legendItem}>
            <View style={styles.legendHeader}>
              <View style={[styles.macroDot, { backgroundColor: '#FA5D29' }]} />
              <Text style={styles.legendLabel}>Carbs</Text>
            </View>
            <Text style={styles.legendPct}>45%</Text>
            <Text style={styles.legendAvg}>223g avg</Text>
          </View>

          <View style={styles.legendItem}>
            <View style={styles.legendHeader}>
              <View style={[styles.macroDot, { backgroundColor: '#10B981' }]} />
              <Text style={styles.legendLabel}>Protein</Text>
            </View>
            <Text style={styles.legendPct}>30%</Text>
            <Text style={styles.legendAvg}>126g avg</Text>
          </View>

          <View style={styles.legendItem}>
            <View style={styles.legendHeader}>
              <View style={[styles.macroDot, { backgroundColor: '#3298DC' }]} />
              <Text style={styles.legendLabel}>Fats</Text>
            </View>
            <Text style={styles.legendPct}>25%</Text>
            <Text style={styles.legendAvg}>55g avg</Text>
          </View>
        </View>
      </View>

      {/* AI Nutrition Insights Section */}
      <View style={styles.insightsSection}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderLeft}>
            <View style={styles.aiSparkleIcon}>
              <Sparkles size={16} color="#FFFFFF" />
            </View>
            <Text style={styles.sectionTitle}>AI Nutrition Insights</Text>
          </View>
          <View style={styles.newBadge}>
            <Text style={styles.newBadgeText}>3 New</Text>
          </View>
        </View>

        {/* Insight Card 1 */}
        <View style={styles.insightCard}>
          <View style={[styles.insightIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
            <Award size={20} color="#10B981" />
          </View>
          <View style={styles.insightContent}>
            <View style={styles.insightTitleRow}>
              <Text style={styles.insightTitle}>Calorie Consistency Master</Text>
              <Text style={styles.insightTagGreen}>ACHIEVEMENT</Text>
            </View>
            <Text style={styles.insightBody}>
              You're consistently hitting within <Text style={styles.boldText}>5%</Text> of your
              calorie target on weekdays. Steady energy keeps fatigue away!
            </Text>
          </View>
        </View>

        {/* Insight Card 2 */}
        <View style={styles.insightCard}>
          <View style={[styles.insightIconBox, { backgroundColor: 'rgba(250, 93, 41, 0.15)' }]}>
            <TrendingUp size={20} color="#FA5D29" />
          </View>
          <View style={styles.insightContent}>
            <View style={styles.insightTitleRow}>
              <Text style={styles.insightTitle}>Protein Optimization</Text>
              <Text style={styles.insightTagOrange}>+12% PEAK</Text>
            </View>
            <Text style={styles.insightBody}>
              Your protein intake is <Text style={styles.boldText}>12% higher</Text> than last
              week, reaching peak synthesis on workout days.
            </Text>
          </View>
        </View>

        {/* Insight Card 3 */}
        <View style={styles.insightCard}>
          <View style={[styles.insightIconBox, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
            <AlertCircle size={20} color="#EF4444" />
          </View>
          <View style={styles.insightContent}>
            <View style={styles.insightTitleRow}>
              <Text style={styles.insightTitle}>Weekend Habit Alert</Text>
              <Text style={styles.insightTagRed}>PATTERN</Text>
            </View>
            <Text style={styles.insightBody}>
              You're <Text style={styles.boldText}>24% more likely</Text> to exceed your calorie
              target on Saturday evenings. Planning wholesome snacks keeps you on track.
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090D16',
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
    color: '#64748B',
    letterSpacing: 1.2,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#F8FAFC',
    marginTop: 2,
  },
  dateFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#131B2E',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  dateFilterText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#131B2E',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  statTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.6,
  },
  statIconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
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
    fontSize: 24,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  statUnit: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  badgeGreen: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeGreenText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10B981',
  },
  badgeSub: {
    fontSize: 11,
    color: '#64748B',
  },
  chartCard: {
    backgroundColor: '#131B2E',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 16,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  chartSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  targetPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0F172A',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
  },
  targetDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FA5D29',
  },
  targetPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
  },
  barChartContainer: {
    height: 160,
    position: 'relative',
    justifyContent: 'flex-end',
    marginBottom: 12,
  },
  dashedTargetLine: {
    position: 'absolute',
    top: 36,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderColor: '#334155',
    borderStyle: 'dashed',
    zIndex: 1,
  },
  barsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 140,
    zIndex: 2,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    height: 140,
    justifyContent: 'flex-end',
  },
  barTrack: {
    width: 24,
    height: 120,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    padding: 2,
  },
  barFill: {
    width: '100%',
    borderRadius: 10,
  },
  barFillSelected: {
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  dayLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 6,
  },
  dayLabelSelected: {
    color: '#F8FAFC',
    fontWeight: '800',
  },
  detailBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
  },
  detailLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  detailDayText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  detailStatusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10B981',
  },
  macroCard: {
    backgroundColor: '#131B2E',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 16,
  },
  planBadge: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  planBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
  },
  segmentedBar: {
    flexDirection: 'row',
    height: 14,
    borderRadius: 7,
    overflow: 'hidden',
    marginVertical: 12,
    gap: 2,
  },
  segment: {
    height: '100%',
    borderRadius: 4,
  },
  macroLegendRow: {
    flexDirection: 'row',
    gap: 8,
  },
  legendItem: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  legendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  macroDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  legendPct: {
    fontSize: 17,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  legendAvg: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  insightsSection: {
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  aiSparkleIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FA5D29',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  newBadge: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  newBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
  },
  insightCard: {
    backgroundColor: '#131B2E',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    gap: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  insightIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightContent: {
    flex: 1,
  },
  insightTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F8FAFC',
    flex: 1,
  },
  insightTagGreen: {
    fontSize: 9,
    fontWeight: '800',
    color: '#10B981',
    letterSpacing: 0.6,
  },
  insightTagOrange: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FA5D29',
    letterSpacing: 0.6,
  },
  insightTagRed: {
    fontSize: 9,
    fontWeight: '800',
    color: '#EF4444',
    letterSpacing: 0.6,
  },
  insightBody: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 18,
  },
  boldText: {
    color: '#F8FAFC',
    fontWeight: '700',
  },
});
