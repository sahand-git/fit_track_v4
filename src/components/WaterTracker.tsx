import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import {
  Droplets,
  Plus,
  Minus,
  Sparkles,
  Coffee,
  GlassWater,
  Cylinder,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

interface WaterTrackerProps {
  glasses: number;
  target: number;
  onUpdate: (delta: number) => void;
}

export const WaterTracker: React.FC<WaterTrackerProps> = ({
  glasses,
  target,
  onUpdate,
}) => {
  const currentLiters = ((glasses * 250) / 1000).toFixed(2);
  const targetLiters = ((target * 250) / 1000).toFixed(2);
  const remainingMl = Math.max(0, (target - glasses) * 250);
  const percentage = target > 0 ? Math.min(Math.round((glasses / target) * 100), 100) : 0;

  const handleQuickAdd = (glassesToAdd: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onUpdate(glassesToAdd);
  };

  const handleSubtract = () => {
    if (glasses <= 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onUpdate(-1);
  };

  return (
    <View style={styles.card}>
      {/* Sub-header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.subtitle}>HYDRATION BALANCE</Text>
          <Text style={styles.title}>Daily Fluid Rhythm</Text>
        </View>
        <View style={styles.pctBadge}>
          <Text style={styles.pctBadgeText}>{percentage}%</Text>
        </View>
      </View>

      {/* Numerical Intake Breakdown Card */}
      <View style={styles.intakeCard}>
        <View>
          <Text style={styles.intakeLabel}>WATER TODAY</Text>
          <View style={styles.intakeRow}>
            <Text style={styles.intakeValue}>{currentLiters}</Text>
            <Text style={styles.intakeTarget}>/ {targetLiters} L</Text>
          </View>
        </View>

        <View style={styles.remainingBox}>
          <Text style={styles.remainingLabel}>REMAINING</Text>
          <Text style={styles.remainingValue}>{remainingMl} ml</Text>
        </View>
      </View>

      {/* Progress Drops Bar */}
      <View style={styles.dropsRow}>
        {Array.from({ length: Math.max(target, 8) }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.dropDot,
              i < glasses && styles.dropDotFilled,
            ]}
          />
        ))}
      </View>

      {/* Smart Adaptive Coach Reminder */}
      <View style={styles.coachCard}>
        <View style={styles.coachIconBox}>
          <Sparkles size={16} color="#FA5D29" />
        </View>
        <View style={styles.coachTextContent}>
          <View style={styles.coachHeaderRow}>
            <Text style={styles.coachTag}>ADAPTIVE COACH</Text>
            <View style={styles.coachDot} />
            <Text style={styles.coachTime}>Just now</Text>
          </View>
          <Text style={styles.coachMessage}>
            A glass of water now boosts mental alertness, metabolic digestion, and prevents
            afternoon fatigue.
          </Text>
        </View>
      </View>

      {/* Quick Add Buttons Row */}
      <Text style={styles.quickAddHeader}>Quick Add</Text>
      <View style={styles.quickButtonsGrid}>
        {/* +250 ml (1 glass) */}
        <TouchableOpacity
          style={styles.quickBtn}
          onPress={() => handleQuickAdd(1)}
          activeOpacity={0.7}
        >
          <View style={styles.quickBtnIconBox}>
            <Coffee size={16} color="#06B6D4" />
          </View>
          <Text style={styles.quickBtnAmount}>+250 ml</Text>
          <Text style={styles.quickBtnLabel}>Small Glass</Text>
        </TouchableOpacity>

        {/* +500 ml (2 glasses) */}
        <TouchableOpacity
          style={styles.quickBtn}
          onPress={() => handleQuickAdd(2)}
          activeOpacity={0.7}
        >
          <View style={styles.quickBtnIconBox}>
            <GlassWater size={16} color="#06B6D4" />
          </View>
          <Text style={styles.quickBtnAmount}>+500 ml</Text>
          <Text style={styles.quickBtnLabel}>Bottle</Text>
        </TouchableOpacity>

        {/* +750 ml (3 glasses) */}
        <TouchableOpacity
          style={styles.quickBtn}
          onPress={() => handleQuickAdd(3)}
          activeOpacity={0.7}
        >
          <View style={styles.quickBtnIconBox}>
            <Cylinder size={16} color="#06B6D4" />
          </View>
          <Text style={styles.quickBtnAmount}>+750 ml</Text>
          <Text style={styles.quickBtnLabel}>Tumbler</Text>
        </TouchableOpacity>

        {/* Minus 1 glass */}
        <TouchableOpacity
          style={[styles.quickBtn, glasses === 0 && { opacity: 0.5 }]}
          disabled={glasses === 0}
          onPress={handleSubtract}
          activeOpacity={0.7}
        >
          <View style={[styles.quickBtnIconBox, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
            <Minus size={16} color="#EF4444" />
          </View>
          <Text style={[styles.quickBtnAmount, { color: '#EF4444' }]}>-250 ml</Text>
          <Text style={styles.quickBtnLabel}>Undo</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#131B2E',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginVertical: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
    marginTop: 2,
  },
  pctBadge: {
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
  },
  pctBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#06B6D4',
  },
  intakeCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 12,
  },
  intakeLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  intakeRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginTop: 2,
  },
  intakeValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  intakeTarget: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  remainingBox: {
    alignItems: 'flex-end',
  },
  remainingLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FA5D29',
  },
  remainingValue: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FA5D29',
    marginTop: 2,
  },
  dropsRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 14,
  },
  dropDot: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#1E293B',
  },
  dropDotFilled: {
    backgroundColor: '#06B6D4',
  },
  coachCard: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    borderRadius: 14,
    padding: 12,
    gap: 10,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 14,
  },
  coachIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(250, 93, 41, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coachTextContent: {
    flex: 1,
  },
  coachHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  coachTag: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FA5D29',
    letterSpacing: 0.6,
  },
  coachDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#64748B',
  },
  coachTime: {
    fontSize: 10,
    color: '#64748B',
  },
  coachMessage: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 16,
  },
  quickAddHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 8,
  },
  quickButtonsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  quickBtn: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  quickBtnIconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  quickBtnAmount: {
    fontSize: 12,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  quickBtnLabel: {
    fontSize: 9,
    color: '#64748B',
    marginTop: 1,
    textAlign: 'center',
  },
});
