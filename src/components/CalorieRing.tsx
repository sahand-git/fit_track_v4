import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { theme } from '../theme';

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
  size = 200,
}) => {
  const strokeWidth = 10;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;

  // Calorie percentage
  const calorieRatio = target > 0 ? Math.min(consumed / target, 1) : 0;
  const calorieOffset = circumference - calorieRatio * circumference;

  const remaining = Math.max(0, target - consumed);
  const isOver = consumed > target;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={theme.colors.surfaceSubtle}
          strokeWidth={strokeWidth}
          fill="none"
        />

        {/* Botanical Green Progress Arc */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={isOver ? theme.colors.accent : theme.colors.primary}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={calorieOffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>

      {/* Center Metrics: Natural, calm typography */}
      <View style={styles.centerContent}>
        <Text style={styles.remainingValue}>
          {remaining.toLocaleString()}
        </Text>
        <Text style={styles.remainingLabel}>
          {isOver ? 'kcal over budget' : 'kcal remaining'}
        </Text>

        <View style={styles.ratioPill}>
          <Text style={styles.ratioText}>
            {consumed.toLocaleString()} of {target.toLocaleString()} kcal
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
  },
  centerContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  remainingValue: {
    fontFamily: theme.fonts.serif,
    fontSize: 40,
    fontWeight: '700',
    color: theme.colors.primary,
    letterSpacing: -0.6,
  },
  remainingLabel: {
    fontFamily: theme.fonts.sans,
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  ratioPill: {
    marginTop: 10,
    backgroundColor: theme.colors.surfaceSubtle,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  ratioText: {
    fontFamily: theme.fonts.sans,
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
});
