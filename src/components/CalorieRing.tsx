import React, { useEffect, useId, useMemo, useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, {
  Easing,
  interpolateColor,
  runOnJS,
  useAnimatedProps,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
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
  getBaseRingRatioFromSignedDelta,
  getVisualOverflowSweep,
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
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const baseGradId = `calorieBaseGrad_${uid}`;
  const overflowGradId = `calorieOverflowGrad_${uid}`;

  const strokeWidth = 10;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  const metrics = useMemo(
    () => calculateCalorieRingMetrics(consumed, target),
    [consumed, target]
  );

  // Single continuous signed shared value (consumed - target) drives BOTH SVG arcs,
  // ambient glow, glowing endpoint orb, and center/ledger signed readouts in lockstep.
  const signedDeltaSV = useSharedValue(metrics.signedDelta);
  const targetSV = useSharedValue(Math.max(0, target));
  const [displaySignedDelta, setDisplaySignedDelta] = useState(Math.round(metrics.signedDelta));

  useEffect(() => {
    targetSV.value = Math.max(0, target);
    if (isReducedMotion()) {
      signedDeltaSV.value = metrics.signedDelta;
      setDisplaySignedDelta(Math.round(metrics.signedDelta));
    } else {
      signedDeltaSV.value = withTiming(metrics.signedDelta, {
        duration: 650,
        easing: Easing.out(Easing.cubic),
      });
    }
  }, [metrics.signedDelta, target, signedDeltaSV, targetSV]);

  useAnimatedReaction(
    () => Math.round(signedDeltaSV.value),
    (rounded, prev) => {
      if (rounded !== prev) {
        runOnJS(setDisplaySignedDelta)(rounded);
      }
    },
    []
  );

  const animatedBaseCircleProps = useAnimatedProps(() => {
    'worklet';
    const ratio = getBaseRingRatioFromSignedDelta(signedDeltaSV.value, targetSV.value);
    return {
      strokeDashoffset: circumference - ratio * circumference,
      strokeOpacity: ratio <= 0.002 ? 0 : 1,
    };
  });

  const animatedOverflowGlowProps = useAnimatedProps(() => {
    'worklet';
    const sweep = getVisualOverflowSweep(signedDeltaSV.value, targetSV.value);
    return {
      strokeDashoffset: circumference - sweep * circumference,
      strokeOpacity: sweep <= 0.002 ? 0 : Math.min(0.3, sweep * 35),
    };
  });

  const animatedOverflowProps = useAnimatedProps(() => {
    'worklet';
    const sweep = getVisualOverflowSweep(signedDeltaSV.value, targetSV.value);
    return {
      strokeDashoffset: circumference - sweep * circumference,
      strokeOpacity: sweep <= 0.002 ? 0 : Math.min(1, sweep * 120),
    };
  });

  const animatedEndpointGlowProps = useAnimatedProps(() => {
    'worklet';
    const sweep = getVisualOverflowSweep(signedDeltaSV.value, targetSV.value);
    const angle = -Math.PI / 2 + sweep * Math.PI * 2;
    return {
      cx: center + radius * Math.cos(angle),
      cy: center + radius * Math.sin(angle),
      opacity: sweep <= 0.004 ? 0 : 1,
    };
  });

  const animatedEndpointCoreProps = useAnimatedProps(() => {
    'worklet';
    const sweep = getVisualOverflowSweep(signedDeltaSV.value, targetSV.value);
    const angle = -Math.PI / 2 + sweep * Math.PI * 2;
    return {
      cx: center + radius * Math.cos(angle),
      cy: center + radius * Math.sin(angle),
      opacity: sweep <= 0.004 ? 0 : 1,
    };
  });

  const emeraldGlow = theme.colors.calorieGlowEmerald;
  const crimsonGlow = theme.colors.calorieGlowCrimson;
  const animatedAmbientGlowStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      backgroundColor: interpolateColor(
        signedDeltaSV.value,
        [-150, 0, 150],
        [emeraldGlow, emeraldGlow, crimsonGlow]
      ),
    };
  }, [emeraldGlow, crimsonGlow]);

  const displayIsOver = displaySignedDelta > 0;
  const displayMagnitude = Math.abs(displaySignedDelta);
  const displaySurplusRatio =
    displayIsOver && target > 0 ? displayMagnitude / target : displayIsOver ? 1 : 0;
  const displaySurplusMix = displayIsOver ? Math.min(displaySurplusRatio / 0.1, 1) : 0;

  const overTextColor = useMemo(() => {
    if (!displayIsOver) return theme.colors.calorieBaseGreen;
    return interpolateHexColor(
      theme.colors.calorieOverflowAmber,
      theme.colors.calorieOverflowRed,
      displaySurplusMix
    );
  }, [displayIsOver, displaySurplusMix, theme]);

  const tolerance = Math.max(25, Math.round(target * 0.02));
  const isInTolerance = target > 0 && Math.abs(consumed - target) <= tolerance;
  const formattedDeltaText = displayIsOver
    ? `+${displayMagnitude.toLocaleString()}`
    : displayMagnitude.toLocaleString();
  const glowDiameter = Math.round(size * 0.84);

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
        <Animated.View
          pointerEvents="none"
          style={[
            styles.ambientGlow,
            {
              width: glowDiameter,
              height: glowDiameter,
              borderRadius: glowDiameter / 2,
            },
            animatedAmbientGlowStyle,
          ]}
        />

        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Defs>
            <LinearGradient id={baseGradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={theme.colors.calorieBaseStart} />
              <Stop offset="50%" stopColor={theme.colors.calorieBaseMid} />
              <Stop offset="100%" stopColor={theme.colors.calorieBaseEnd} />
            </LinearGradient>
            <LinearGradient id={overflowGradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={theme.colors.calorieOverflowAmber} />
              <Stop offset="55%" stopColor={theme.colors.calorieOverflowRed} />
              <Stop offset="100%" stopColor={theme.colors.calorieOverflowDeepRed} />
            </LinearGradient>
          </Defs>

          {/* Subtle Recessed Track */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={theme.colors.surfaceSubtle}
            strokeWidth={strokeWidth}
            fill="none"
          />

          {/* Base Emerald Progress Arc (remains full 100% green when budget met or exceeded) */}
          <AnimatedCircle
            cx={center}
            cy={center}
            r={radius}
            stroke={`url(#${baseGradId})`}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${circumference}`}
            animatedProps={animatedBaseCircleProps}
            strokeLinecap="round"
            transform={`rotate(-90 ${center} ${center})`}
          />

          {/* Always-mounted Progressive Overflow Glow + Capped Arc (animates continuously through 0) */}
          <AnimatedCircle
            cx={center}
            cy={center}
            r={radius}
            stroke={theme.colors.calorieOverflowRed}
            strokeWidth={strokeWidth + 8}
            fill="none"
            strokeDasharray={`${circumference}`}
            animatedProps={animatedOverflowGlowProps}
            strokeLinecap="round"
            transform={`rotate(-90 ${center} ${center})`}
          />
          <AnimatedCircle
            cx={center}
            cy={center}
            r={radius}
            stroke={`url(#${overflowGradId})`}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${circumference}`}
            animatedProps={animatedOverflowProps}
            strokeLinecap="round"
            transform={`rotate(-90 ${center} ${center})`}
          />

          {/* Glowing Overflow Endpoint Orb */}
          <AnimatedCircle
            r={strokeWidth * 0.9}
            fill={theme.colors.calorieEndpointGlow}
            animatedProps={animatedEndpointGlowProps}
          />
          <AnimatedCircle
            r={strokeWidth * 0.42}
            fill={theme.colors.calorieOverflowRed}
            animatedProps={animatedEndpointCoreProps}
          />
        </Svg>

        {/* Center Metrics: Synchronized continuously with signedDeltaSV */}
        <View style={styles.centerContent}>
          <Text
            style={[
              styles.remainingValue,
              displayIsOver && { color: overTextColor },
            ]}
          >
            {formattedDeltaText}
          </Text>
          <Text
            style={[
              styles.remainingLabel,
              displayIsOver && { color: overTextColor },
            ]}
            numberOfLines={2}
          >
            {displayIsOver
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
          <Text
            style={[styles.ledgerVal, displayIsOver && { color: overTextColor }]}
          >
            {formattedDeltaText}
          </Text>
          <Text style={styles.ledgerLbl}>
            {displayIsOver ? t('Over') : t('Remaining')}
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
  ambientGlow: {
    position: 'absolute',
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
