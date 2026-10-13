import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
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
import { theme } from '../theme';
import { isReducedMotion } from '../utils/motion';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface CalorieRingProps {
  consumed: number;
  target: number;
  proteinConsumed?: number;
  proteinTarget?: number;
  size?: number;
}

export const CalorieRing: React.FC<CalorieRingProps> = React.memo(({
  consumed,
  target,
  size = 200,
}) => {
  const language = useLanguage();
  const t = (key: string) => translate(language, key);

  const strokeWidth = 10;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;

  // Calorie percentage
  const calorieRatio = target > 0 ? Math.min(consumed / target, 1) : 0;
  const progress = useSharedValue(calorieRatio);

  useEffect(() => {
    if (isReducedMotion()) {
      progress.value = calorieRatio;
    } else {
      progress.value = withTiming(calorieRatio, {
        duration: 350,
        easing: Easing.out(Easing.cubic),
      });
    }
  }, [calorieRatio]);

  const animatedCircleProps = useAnimatedProps(() => {
    'worklet';
    return {
      strokeDashoffset: circumference - progress.value * circumference,
    };
  });

  const remaining = Math.max(0, target - consumed);
  const isOver = consumed > target;

  return (
    <View style={styles.wrapper}>
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

          {/* Botanical Green Progress Arc (Driven natively via Reanimated) */}
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={isOver ? theme.colors.accent : theme.colors.primary}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${circumference}`}
            animatedProps={animatedCircleProps}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>

        {/* Center Metrics: Natural, calm typography with count-up */}
        <View style={styles.centerContent}>
          <AnimatedCount
            value={remaining}
            style={[styles.remainingValue, isOver && { color: theme.colors.accent }]}
          />
          <Text style={styles.remainingLabel}>
            {isOver ? t('kcal over budget') : t('kcal remaining')}
          </Text>
        </View>
      </View>

      {/* 3-Point Calorie Ledger: Consumed | Remaining | Daily Target */}
      <View style={styles.ledgerRow}>
        <View style={styles.ledgerCol}>
          <AnimatedCount value={consumed} style={styles.ledgerVal} />
          <Text style={styles.ledgerLbl}>{t('Consumed')}</Text>
        </View>

        <View style={styles.ledgerDivider} />

        <View style={styles.ledgerCol}>
          <AnimatedCount
            value={remaining}
            style={[styles.ledgerVal, isOver && { color: theme.colors.accent }]}
          />
          <Text style={styles.ledgerLbl}>
            {isOver ? t('Over') : t('Remaining')}
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

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    width: '100%',
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
  ledgerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 320,
    marginTop: 18,
    paddingTop: 14,
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
    fontSize: 11,
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
