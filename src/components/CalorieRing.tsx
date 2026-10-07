import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

interface CalorieRingProps {
  consumed: number;
  target: number;
  proteinConsumed: number;
  proteinTarget: number;
  size?: number;
}

export const CalorieRing: React.FC<CalorieRingProps> = ({
  consumed,
  target,
  proteinConsumed,
  proteinTarget,
  size = 230,
}) => {
  const strokeWidth = 14;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;

  // Calorie percentage (clamp at 100% or allow slight overshoot)
  const calorieRatio = target > 0 ? Math.min(consumed / target, 1) : 0;
  const calorieStrokeDashoffset = circumference - calorieRatio * circumference;

  // Inner Protein Ring
  const innerRadius = radius - 16;
  const innerCircumference = 2 * Math.PI * innerRadius;
  const proteinRatio = proteinTarget > 0 ? Math.min(proteinConsumed / proteinTarget, 1) : 0;
  const proteinStrokeDashoffset = innerCircumference - proteinRatio * innerCircumference;

  const remaining = Math.max(0, target - consumed);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          {/* Calorie Gradient (Cyan to Emerald) */}
          <LinearGradient id="calorieGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#06B6D4" />
            <Stop offset="50%" stopColor="#10B981" />
            <Stop offset="100%" stopColor="#34D399" />
          </LinearGradient>
          {/* Protein Gradient (Gold to Amber) */}
          <LinearGradient id="proteinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#FBBF24" />
            <Stop offset="100%" stopColor="#F97316" />
          </LinearGradient>
        </Defs>

        {/* Background Track (Outer Calorie) */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#1E293B"
          strokeWidth={strokeWidth}
          fill="none"
          opacity={0.4}
        />

        {/* Progress Arc (Outer Calorie) */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#calorieGrad)"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={calorieStrokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />

        {/* Background Track (Inner Protein) */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={innerRadius}
          stroke="#1E293B"
          strokeWidth={8}
          fill="none"
          opacity={0.3}
        />

        {/* Progress Arc (Inner Protein) */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={innerRadius}
          stroke="url(#proteinGrad)"
          strokeWidth={8}
          fill="none"
          strokeDasharray={`${innerCircumference}`}
          strokeDashoffset={proteinStrokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>

      {/* Center Metrics */}
      <View style={styles.centerContent}>
        <Text style={styles.remainingValue}>{remaining.toLocaleString()}</Text>
        <Text style={styles.remainingLabel}>KCAL REMAINING</Text>
        <View style={styles.subStats}>
          <Text style={styles.subStatText}>
            Eaten: <Text style={styles.subStatHighlight}>{consumed}</Text>
          </Text>
          <Text style={styles.subStatDivider}>•</Text>
          <Text style={styles.subStatText}>
            Goal: <Text style={styles.subStatHighlight}>{target}</Text>
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginVertical: 12,
  },
  centerContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  remainingValue: {
    fontSize: 34,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: -0.5,
  },
  remainingLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 1.2,
    marginTop: 2,
  },
  subStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  subStatText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  subStatHighlight: {
    color: '#CBD5E1',
    fontWeight: '700',
  },
  subStatDivider: {
    color: '#475569',
    marginHorizontal: 6,
  },
});
