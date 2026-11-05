import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { AppText as Text } from './AppText';
import { ThemeType } from '../theme';
import { isReducedMotion } from '../utils/motion';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface MacroSummaryBarProps {
  totalKcal: number;
  effectiveCalorieTarget: number | null;
  totalProtein: number;
  targetProtein: number;
  totalCarbs: number;
  targetCarbs: number;
  totalFat: number;
  targetFat: number;
  theme: ThemeType;
  t: (key: string) => string;
}

interface AnimatedMacroRowProps {
  label: string;
  consumed: number;
  target: number;
  color: string;
  theme: ThemeType;
}

const AnimatedMacroRow: React.FC<AnimatedMacroRowProps> = ({
  label,
  consumed,
  target,
  color,
  theme,
}) => {
  const styles = useMemo(() => createStyles(theme), [theme]);
  const ratio = target > 0 ? Math.min(consumed / target, 1) : 0;
  const progress = useSharedValue(ratio);

  useEffect(() => {
    if (isReducedMotion()) {
      progress.value = ratio;
    } else {
      progress.value = withTiming(ratio, {
        duration: 450,
        easing: Easing.out(Easing.cubic),
      });
    }
  }, [ratio, progress]);

  const animatedFillStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  return (
    <View style={styles.macroRow}>
      <View style={styles.macroRowHeader}>
        <View style={styles.macroRowLabelContainer}>
          <View style={[styles.macroDot, { backgroundColor: color }]} />
          <Text style={styles.macroRowLabel}>{label}</Text>
        </View>
        <Text style={styles.macroRowValues}>
          <Text style={styles.macroRowCurrent}>{consumed}g</Text>
          <Text style={styles.macroRowTarget}> / {target}g</Text>
        </Text>
      </View>
      <View style={styles.macroTrack}>
        <Animated.View style={[styles.macroFill, { backgroundColor: color }, animatedFillStyle]} />
      </View>
    </View>
  );
};

export const MacroSummaryBar: React.FC<MacroSummaryBarProps> = React.memo(({
  totalKcal,
  effectiveCalorieTarget,
  totalProtein,
  targetProtein,
  totalCarbs,
  targetCarbs,
  totalFat,
  targetFat,
  theme,
  t,
}) => {
  const styles = useMemo(() => createStyles(theme), [theme]);

  // SVG Circular Ring Configuration
  const size = 78;
  const strokeWidth = 7;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;

  const target = effectiveCalorieTarget ?? 2000;
  const ratio = target > 0 ? Math.min(totalKcal / target, 1) : 0;
  const ringProgress = useSharedValue(ratio);

  useEffect(() => {
    if (isReducedMotion()) {
      ringProgress.value = ratio;
    } else {
      ringProgress.value = withTiming(ratio, {
        duration: 450,
        easing: Easing.out(Easing.cubic),
      });
    }
  }, [ratio, ringProgress]);

  const animatedCircleProps = useAnimatedProps(() => {
    'worklet';
    return {
      strokeDashoffset: circumference - ringProgress.value * circumference,
    };
  });

  return (
    <View style={styles.container}>
      {/* Left: Circular Calorie Ring with eaten kcal inside */}
      <View style={styles.ringCol}>
        <View style={[styles.ringContainer, { width: size, height: size }]}>
          <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            {/* Background Track */}
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={theme.colors.surfaceSubtle}
              strokeWidth={strokeWidth}
              fill="none"
            />
            {/* Animated Progress Arc */}
            <AnimatedCircle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={theme.colors.primary}
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={circumference}
              animatedProps={animatedCircleProps}
              strokeLinecap="round"
              rotation="-90"
              origin={`${size / 2}, ${size / 2}`}
            />
          </Svg>

          {/* Centered Calories Display */}
          <View style={styles.ringCenterText}>
            <Text style={styles.ringKcalVal} numberOfLines={1}>
              {totalKcal}
            </Text>
            <Text style={styles.ringKcalUnit}>kcal</Text>
          </View>
        </View>

        {effectiveCalorieTarget && (
          <Text style={styles.ringTargetLabel}>
            / {effectiveCalorieTarget} {t('Target')}
          </Text>
        )}
      </View>

      {/* Divider */}
      <View style={styles.columnDivider} />

      {/* Right: Protein, Carbs, Fat Horizontal Progress Bars */}
      <View style={styles.macrosCol}>
        <AnimatedMacroRow
          label={t('Protein')}
          consumed={totalProtein}
          target={targetProtein}
          color={theme.colors.macroProtein}
          theme={theme}
        />
        <AnimatedMacroRow
          label={t('Carbs')}
          consumed={totalCarbs}
          target={targetCarbs}
          color={theme.colors.macroCarbs}
          theme={theme}
        />
        <AnimatedMacroRow
          label={t('Fat')}
          consumed={totalFat}
          target={targetFat}
          color={theme.colors.macroFat}
          theme={theme}
        />
      </View>
    </View>
  );
});

MacroSummaryBar.displayName = 'MacroSummaryBar';

const createStyles = (theme: ThemeType) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      marginHorizontal: theme.spacing.md,
      marginTop: 10,
      marginBottom: 6,
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...theme.shadow.subtle,
    },
    ringCol: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingEnd: 12,
    },
    ringContainer: {
      position: 'relative',
      alignItems: 'center',
      justifyContent: 'center',
    },
    ringCenterText: {
      position: 'absolute',
      alignItems: 'center',
      justifyContent: 'center',
    },
    ringKcalVal: {
      fontFamily: theme.fonts.sans,
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.textPrimary,
      lineHeight: 18,
    },
    ringKcalUnit: {
      fontFamily: theme.fonts.sans,
      fontSize: 12,
      fontWeight: '500',
      color: theme.colors.textMuted,
      lineHeight: 13,
    },
    ringTargetLabel: {
      fontFamily: theme.fonts.sans,
      fontSize: 12,
      color: theme.colors.textMuted,
      marginTop: 3,
      textAlign: 'center',
    },
    columnDivider: {
      width: 1,
      height: '80%',
      backgroundColor: theme.colors.border,
      marginEnd: 14,
    },
    macrosCol: {
      flex: 1,
      justifyContent: 'space-between',
      gap: 8,
    },
    macroRow: {
      gap: 3,
    },
    macroRowHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    macroRowLabelContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    macroDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
    },
    macroRowLabel: {
      fontFamily: theme.fonts.sans,
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.textPrimary,
    },
    macroRowValues: {
      fontFamily: theme.fonts.sans,
      fontSize: 12,
    },
    macroRowCurrent: {
      fontWeight: '700',
      color: theme.colors.textPrimary,
    },
    macroRowTarget: {
      color: theme.colors.textMuted,
    },
    macroTrack: {
      height: 5,
      borderRadius: 3,
      backgroundColor: theme.colors.surfaceSubtle,
      overflow: 'hidden',
    },
    macroFill: {
      height: '100%',
      borderRadius: 3,
    },
  });
