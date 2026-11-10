import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { AppText as Text } from './AppText';
import { AnimatedCount } from './AnimatedCount';
import { useLanguage } from '../i18n/I18nContext';
import { translate } from '../i18n/strings';
import { useTheme } from '../theme/ThemeContext';
import { ThemeType } from '../theme';
import { useIsRTL } from '../hooks/useIsRTL';
import { isReducedMotion } from '../utils/motion';
import {
  calculateCalorieRingMetrics,
  CalorieRingMetrics,
  interpolateHexColor,
} from '../utils/calorieRingCalculations';

export { calculateCalorieRingMetrics, CalorieRingMetrics };

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface CalorieRingProps {
  consumed: number;
  target: number;
  proteinConsumed?: number;
  proteinTarget?: number;
  size?: number;
  onPress?: () => void;
}

export const CalorieRing: React.FC<CalorieRingProps> = React.memo(({
  consumed,
  target,
  size = 200,
  onPress,
}) => {
  const language = useLanguage();
  const isRtl = useIsRTL();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const t = (key: string) => translate(language, key);

  const strokeWidth = 10;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  const metrics = useMemo(
    () => calculateCalorieRingMetrics(consumed, target),
    [consumed, target]
  );

  const progress = useSharedValue(metrics.baseRatio);
  const overflowProgress = useSharedValue(metrics.overflowRatio);

  useEffect(() => {
    if (isReducedMotion()) {
      progress.value = metrics.baseRatio;
      overflowProgress.value = metrics.overflowRatio;
    } else {
      progress.value = withTiming(metrics.baseRatio, {
        duration: 750,
        easing: Easing.out(Easing.cubic),
      });
      overflowProgress.value = withTiming(metrics.overflowRatio, {
        duration: 750,
        easing: Easing.out(Easing.cubic),
      });
    }
  }, [metrics.baseRatio, metrics.overflowRatio, progress, overflowProgress]);

  const animatedBaseCircleProps = useAnimatedProps(() => {
    'worklet';
    return {
      strokeDashoffset: circumference - progress.value * circumference,
    };
  });

  const animatedOverflowProps = useAnimatedProps(() => {
    'worklet';
    return {
      strokeDashoffset: circumference - overflowProgress.value * circumference,
    };
  });

  const overTextColor = useMemo(() => {
    if (!metrics.isOver) return theme.colors.primary;
    return interpolateHexColor(
      theme.colors.calorieOverflowAmber,
      theme.colors.calorieOverflowRed,
      metrics.surplusColorMix
    );
  }, [metrics.isOver, metrics.surplusColorMix, theme]);

  const tolerance = Math.max(25, Math.round(target * 0.02));
  const isInTolerance = target > 0 && Math.abs(consumed - target) <= tolerance;
  const showOverflowArc = metrics.isOver && metrics.overflowRatio > 0;

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity
        style={[styles.container, { width: size, height: size }]}
        onPress={onPress}
        disabled={!onPress}
        activeOpacity={0.82}
        accessibilityRole="button"
        accessibilityLabel={`${t('Calories')} · ${metrics.isOver ? '+' : ''}${metrics.displayedValue} ${metrics.isOver ? t('kcal over') : t('kcal remaining')}`}
      >
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Track */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={theme.colors.surfaceSubtle}
            strokeWidth={strokeWidth}
            fill="none"
          />

          {/* Base Emerald Progress Arc (stays 100% green when daily budget reached or exceeded) */}
          <AnimatedCircle
            cx={center}
            cy={center}
            r={radius}
            stroke={theme.colors.calorieBaseGreen}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${circumference}`}
            animatedProps={animatedBaseCircleProps}
            strokeLinecap="round"
            transform={`rotate(-90 ${center} ${center})`}
          />

          {/* Layered Progressive Overflow Glow + Crimson Arc (only rendered when over limit) */}
          {showOverflowArc && (
            <>
              <AnimatedCircle
                cx={center}
                cy={center}
                r={radius}
                stroke={theme.colors.calorieOverflowRed}
                strokeOpacity={0.28}
                strokeWidth={strokeWidth + 8}
                fill="none"
                strokeDasharray={`${circumference}`}
                animatedProps={animatedOverflowProps}
                strokeLinecap="round"
                transform={`rotate(-90 ${center} ${center})`}
              />
              <AnimatedCircle
                cx={center}
                cy={center}
                r={radius}
                stroke={theme.colors.calorieOverflowRed}
                strokeWidth={strokeWidth}
                fill="none"
                strokeDasharray={`${circumference}`}
                animatedProps={animatedOverflowProps}
                strokeLinecap="round"
                transform={`rotate(-90 ${center} ${center})`}
              />
            </>
          )}
        </Svg>

        {/* Center Metrics: Natural typography with progressive surplus alert */}
        <View style={styles.centerContent}>
          <AnimatedCount
            value={metrics.displayedValue}
            formatter={(v) =>
              metrics.isOver
                ? `+${Math.round(v).toLocaleString()}`
                : Math.round(v).toLocaleString()
            }
            style={[
              styles.remainingValue,
              metrics.isOver && { color: overTextColor },
            ]}
          />
          <Text
            style={[
              styles.remainingLabel,
              metrics.isOver && { color: overTextColor },
            ]}
            numberOfLines={2}
          >
            {metrics.isOver
              ? t('kcal over')
              : isInTolerance
              ? t("You've reached today's calorie goal.")
              : t('kcal remaining')}
          </Text>
        </View>
      </TouchableOpacity>

      {/* 3-Point Calorie Ledger: Consumed | Remaining/Over | Daily Target */}
      <View style={[styles.ledgerRow, isRtl && styles.rowRtl]}>
        <View style={styles.ledgerCol}>
          <AnimatedCount value={consumed} style={styles.ledgerVal} />
          <Text style={styles.ledgerLbl}>{t('Consumed')}</Text>
        </View>

        <View style={styles.ledgerDivider} />

        <View style={styles.ledgerCol}>
          <AnimatedCount
            value={metrics.displayedValue}
            formatter={(v) =>
              metrics.isOver
                ? `+${Math.round(v).toLocaleString()}`
                : Math.round(v).toLocaleString()
            }
            style={[styles.ledgerVal, metrics.isOver && { color: overTextColor }]}
          />
          <Text style={styles.ledgerLbl}>
            {metrics.isOver ? t('Over') : t('Remaining')}
          </Text>
        </View>

        <View style={styles.ledgerDivider} />

        <View style={styles.ledgerCol}>
          <Text style={styles.ledgerVal}>{target.toLocaleString()}</Text>
          <Text style={styles.ledgerLbl}>{t('Daily Target')}</Text>
        </View>
      </View>
    </View>
  );
});

const createStyles = (theme: ThemeType) => StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    width: '100%',
  },
  rowRtl: {
    flexDirection: 'row-reverse',
  },
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  centerContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  remainingValue: {
    fontFamily: theme.fonts.serif,
    fontSize: 38,
    fontWeight: '700',
    color: theme.colors.calorieBaseGreen,
    letterSpacing: -0.6,
  },
  remainingLabel: {
    fontFamily: theme.fonts.sans,
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  ledgerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 320,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingHorizontal: 16,
  },
  ledgerCol: {
    flex: 1,
    alignItems: 'center',
  },
  ledgerVal: {
    fontFamily: theme.fonts.serif,
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  ledgerLbl: {
    fontFamily: theme.fonts.sans,
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.textMuted,
    marginTop: 2,
    letterSpacing: 0.3,
  },
  ledgerDivider: {
    width: 1,
    height: 22,
    backgroundColor: theme.colors.border,
  },
});

CalorieRing.displayName = 'CalorieRing';
