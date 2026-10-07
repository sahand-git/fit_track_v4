import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import {
  Trophy,
  TrendingDown,
  Flag,
  Percent,
  Dumbbell,
  Scale,
  Camera,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react-native';
import Svg, { Path, Circle, Defs, LinearGradient, Stop, Line } from 'react-native-svg';
import * as Haptics from 'expo-haptics';

export const ProgressScreen: React.FC = () => {
  const [activeRange, setActiveRange] = useState('1M');

  const ranges = ['1W', '1M', '3M', '6M', '1Y', 'All'];

  const handleSelectRange = (r: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setActiveRange(r);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Top Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.headerSubtitle}>WEIGHT & PROGRESS</Text>
          <Text style={styles.headerTitle}>Trajectory Tracker</Text>
        </View>
        <TouchableOpacity style={styles.awardBtn}>
          <Trophy size={18} color="#FA5D29" />
        </TouchableOpacity>
      </View>

      {/* Current Weight Hero Card */}
      <View style={styles.heroCard}>
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.heroLabel}>CURRENT WEIGHT</Text>
            <View style={styles.heroValueRow}>
              <Text style={styles.heroValue}>72.4</Text>
              <Text style={styles.heroUnit}>kg</Text>
            </View>
          </View>
          <View style={styles.heroRight}>
            <View style={styles.deltaBadge}>
              <TrendingDown size={14} color="#00714D" />
              <Text style={styles.deltaBadgeText}>-1.8 kg</Text>
            </View>
            <Text style={styles.deltaSub}>Since Aug 1</Text>
          </View>
        </View>

        {/* Progress Track */}
        <View style={styles.trackLabels}>
          <Text style={styles.trackLabelLeft}>
            Start: <Text style={styles.boldText}>74.2 kg</Text>
          </Text>
          <Text style={styles.trackLabelRight}>
            Target: <Text style={styles.boldText}>69.0 kg</Text>
          </Text>
        </View>

        <View style={styles.trackBarContainer}>
          <View style={[styles.trackBarFill, { width: '35%' }]} />
        </View>

        <View style={styles.trackFooter}>
          <View style={styles.flagRow}>
            <Flag size={13} color="#FA5D29" />
            <Text style={styles.flagText}>3.4 kg to goal</Text>
          </View>
          <Text style={styles.percentText}>35% reached</Text>
        </View>
      </View>

      {/* Time Range Filter Pills */}
      <View style={styles.rangePillsRow}>
        {ranges.map((r) => (
          <TouchableOpacity
            key={r}
            style={[styles.rangePill, activeRange === r && styles.rangePillActive]}
            onPress={() => handleSelectRange(r)}
          >
            <Text style={[styles.rangePillText, activeRange === r && styles.rangePillTextActive]}>
              {r}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Interactive Trend Chart Card */}
      <View style={styles.chartCard}>
        <View style={styles.chartTop}>
          <View style={styles.chartTitleRow}>
            <View style={styles.chartDot} />
            <Text style={styles.chartTitle}>Trend Trajectory</Text>
          </View>
          <View style={styles.weeklyAvgBox}>
            <Text style={styles.weeklyAvgLabel}>WEEKLY AVG</Text>
            <Text style={styles.weeklyAvgValue}>-0.45 kg</Text>
          </View>
        </View>

        {/* SVG Curve Chart */}
        <View style={styles.svgContainer}>
          <Svg width="100%" height={160} viewBox="0 0 340 160">
            <Defs>
              <LinearGradient id="weightGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor="#FA5D29" stopOpacity="0.3" />
                <Stop offset="100%" stopColor="#090D16" stopOpacity="0" />
              </LinearGradient>
            </Defs>

            {/* Gridlines */}
            <Line x1="0" y1="35" x2="340" y2="35" stroke="#1E293B" strokeDasharray="4 4" />
            <Line x1="0" y1="85" x2="340" y2="85" stroke="#1E293B" strokeDasharray="4 4" />
            <Line x1="0" y1="135" x2="340" y2="135" stroke="#1E293B" strokeDasharray="4 4" />

            {/* Shaded Area */}
            <Path
              d="M 15 32 C 45 35, 75 48, 105 60 C 140 74, 175 78, 215 92 L 215 155 L 15 155 Z"
              fill="url(#weightGrad)"
            />

            {/* Solid Weight Trajectory Line */}
            <Path
              d="M 15 32 C 45 35, 75 48, 105 60 C 140 74, 175 78, 215 92"
              fill="none"
              stroke="#FA5D29"
              strokeWidth={3.5}
              strokeLinecap="round"
            />

            {/* Projected Target Line */}
            <Path
              d="M 215 92 C 245 102, 280 126, 325 138"
              fill="none"
              stroke="#FA5D29"
              strokeWidth={2.5}
              strokeDasharray="5 5"
              strokeOpacity={0.6}
            />

            {/* Milestones */}
            <Circle cx="15" cy="32" r="4" fill="#94A3B8" />
            <Circle cx="105" cy="60" r="3.5" fill="#FA5D29" />
            <Circle cx="215" cy="92" r="6" fill="#FA5D29" />
            <Circle cx="325" cy="138" r="4.5" fill="#10B981" />
          </Svg>
        </View>

        {/* Timeline X-Axis Labels */}
        <View style={styles.timelineRow}>
          <Text style={styles.timelineLabel}>Sep 07</Text>
          <Text style={styles.timelineLabel}>Sep 17</Text>
          <Text style={styles.timelineLabel}>Sep 27</Text>
          <Text style={[styles.timelineLabel, { color: '#FA5D29', fontWeight: '800' }]}>
            Oct 07
          </Text>
          <Text style={[styles.timelineLabel, { color: '#10B981', fontWeight: '800' }]}>
            Nov 01
          </Text>
        </View>
      </View>

      {/* Body Composition Grid */}
      <View style={styles.compositionSection}>
        <View style={styles.compositionHeader}>
          <Text style={styles.sectionTitle}>Body Composition</Text>
          <Text style={styles.syncBadge}>Smart Scale Sync</Text>
        </View>

        <View style={styles.compositionGrid}>
          {/* BMI */}
          <View style={styles.compCard}>
            <View style={styles.compTop}>
              <Text style={styles.compLabel}>BMI</Text>
              <Scale size={15} color="#10B981" />
            </View>
            <Text style={styles.compValue}>22.4</Text>
            <View style={styles.normalBadge}>
              <Text style={styles.normalBadgeText}>Normal</Text>
            </View>
          </View>

          {/* Body Fat */}
          <View style={styles.compCard}>
            <View style={styles.compTop}>
              <Text style={styles.compLabel}>Body Fat</Text>
              <Percent size={15} color="#FA5D29" />
            </View>
            <Text style={styles.compValue}>18.2%</Text>
            <View style={styles.deltaSmallRow}>
              <ArrowDownRight size={12} color="#10B981" />
              <Text style={styles.deltaSmallText}>-1.1%</Text>
            </View>
          </View>

          {/* Muscle Mass */}
          <View style={styles.compCard}>
            <View style={styles.compTop}>
              <Text style={styles.compLabel}>Muscle</Text>
              <Dumbbell size={15} color="#06B6D4" />
            </View>
            <Text style={styles.compValue}>
              56.1<Text style={styles.compUnit}>kg</Text>
            </Text>
            <View style={styles.deltaSmallRow}>
              <ArrowUpRight size={12} color="#10B981" />
              <Text style={styles.deltaSmallText}>+0.4 kg</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Photo Check-in Strip */}
      <View style={styles.photoCard}>
        <View style={styles.photoHeader}>
          <Text style={styles.sectionTitle}>Photo Check-in</Text>
          <TouchableOpacity>
            <Text style={styles.compareText}>Compare</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.photosGrid}>
          <View style={styles.photoBox}>
            <Image
              source={{
                uri: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=300&q=80',
              }}
              style={styles.checkinPhoto}
            />
            <View style={styles.photoTag}>
              <Text style={styles.photoTagTitle}>AUG 1 (DAY 1)</Text>
              <Text style={styles.photoTagWeight}>74.2 kg</Text>
            </View>
          </View>

          <View style={styles.photoBox}>
            <Image
              source={{
                uri: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=300&q=80',
              }}
              style={styles.checkinPhoto}
            />
            <View style={styles.photoTag}>
              <Text style={styles.photoTagTitle}>OCT 7 (TODAY)</Text>
              <Text style={styles.photoTagWeight}>72.4 kg</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Primary Log Weight CTA */}
      <TouchableOpacity style={styles.logWeightBtn} activeOpacity={0.85}>
        <Camera size={20} color="#FFFFFF" />
        <Text style={styles.logWeightBtnText}>Log Weight & Photo</Text>
      </TouchableOpacity>
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
  awardBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#131B2E',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  heroCard: {
    backgroundColor: '#131B2E',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 14,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  heroLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.6,
  },
  heroValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginTop: 4,
  },
  heroValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  heroUnit: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
  },
  heroRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  deltaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 113, 77, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
  },
  deltaBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#4EDEA3',
  },
  deltaSub: {
    fontSize: 10,
    color: '#64748B',
  },
  trackLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  trackLabelLeft: {
    fontSize: 11,
    color: '#64748B',
  },
  trackLabelRight: {
    fontSize: 11,
    color: '#64748B',
  },
  boldText: {
    color: '#F8FAFC',
    fontWeight: '700',
  },
  trackBarContainer: {
    height: 8,
    backgroundColor: '#0F172A',
    borderRadius: 4,
    overflow: 'hidden',
  },
  trackBarFill: {
    height: '100%',
    backgroundColor: '#FA5D29',
    borderRadius: 4,
  },
  trackFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  flagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  flagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FA5D29',
  },
  percentText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  rangePillsRow: {
    flexDirection: 'row',
    backgroundColor: '#131B2E',
    borderRadius: 14,
    padding: 3,
    marginBottom: 16,
  },
  rangePill: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 12,
  },
  rangePillActive: {
    backgroundColor: '#FA5D29',
  },
  rangePillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  rangePillTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  chartCard: {
    backgroundColor: '#131B2E',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 16,
  },
  chartTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  chartTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chartDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FA5D29',
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  weeklyAvgBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0F172A',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  weeklyAvgLabel: {
    fontSize: 9,
    color: '#64748B',
    fontWeight: '700',
  },
  weeklyAvgValue: {
    fontSize: 11,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  svgContainer: {
    height: 160,
    width: '100%',
  },
  timelineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  timelineLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  compositionSection: {
    marginBottom: 16,
  },
  compositionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  syncBadge: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  compositionGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  compCard: {
    flex: 1,
    backgroundColor: '#131B2E',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  compTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  compLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  compValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  compUnit: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
  },
  normalBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderRadius: 6,
    paddingVertical: 2,
    paddingHorizontal: 6,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  normalBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#10B981',
  },
  deltaSmallRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 6,
  },
  deltaSmallText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10B981',
  },
  photoCard: {
    backgroundColor: '#131B2E',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 20,
  },
  photoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  compareText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FA5D29',
  },
  photosGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  photoBox: {
    flex: 1,
    height: 180,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#0F172A',
  },
  checkinPhoto: {
    width: '100%',
    height: '100%',
    opacity: 0.85,
  },
  photoTag: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 8,
    backgroundColor: 'rgba(9, 13, 22, 0.85)',
  },
  photoTagTitle: {
    fontSize: 9,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: 0.6,
  },
  photoTagWeight: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FA5D29',
    marginTop: 1,
  },
  logWeightBtn: {
    backgroundColor: '#FA5D29',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
    shadowColor: '#FA5D29',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  logWeightBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
});
