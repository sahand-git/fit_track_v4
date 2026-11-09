import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { AppText as Text } from './AppText';
import { useLanguage } from '../i18n/I18nContext';
import { translate } from '../i18n/strings';
import { useTheme } from '../theme/ThemeContext';
import { ThemeType } from '../theme';
import { useIsRTL } from '../hooks/useIsRTL';
import { isReducedMotion } from '../utils/motion';
import { Activity } from 'lucide-react-native';
import { DirectionalIcon } from './DirectionalIcon';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const RING_SIZE = 52;
const STROKE_WIDTH = 5;
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface MacroCardsProps {
  calorieTarget: number;
  calorieConsumed: number;
  proteinTarget: number;
  proteinConsumed: number;
  carbsTarget: number;
  carbsConsumed: number;
  fatTarget: number;
  fatConsumed: number;
  waterGlasses?: number;
  waterTargetGlasses?: number;
  fiberConsumed?: number;
  fiberTarget?: number;
  fiberHasTarget?: boolean;
  sugarConsumed?: number;
  sugarTarget?: number;
  sugarHasTarget?: boolean;
  fiberIsIncomplete?: boolean;
  sugarIsIncomplete?: boolean;
  onSelectNutrient?: (nutrientKey: string) => void;
}

interface MacroRingColProps {
  macroKey: string;
  name: string;
  displayConsumed: string;
  displayTarget: string;
  pct: number;
  color: string;
  trackColor: string;
  onPress?: (key: string) => void;
  accessibilityLabel: string;
}

const MacroRingCol: React.FC<MacroRingColProps> = React.memo(({
  macroKey,
  name,
  displayConsumed,
  displayTarget,
  pct,
  color,
  trackColor,
  onPress,
  accessibilityLabel,
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const progress = useSharedValue(0);

  const clampedRatio = Math.max(0, Math.min(pct / 100, 1));

  useEffect(() => {
    if (isReducedMotion()) {
      progress.value = clampedRatio;
    } else {
      progress.value = withTiming(clampedRatio, {
        duration: 700,
        easing: Easing.out(Easing.cubic),
      });
    }
  }, [clampedRatio, progress]);

  const animatedCircleProps = useAnimatedProps(() => {
    'worklet';
    return {
      strokeDashoffset: CIRCUMFERENCE - progress.value * CIRCUMFERENCE,
    };
  });

  const handlePress = () => {
    if (onPress) {
      Haptics.selectionAsync().catch(() => {});
      onPress(macroKey);
    }
  };

  return (
    <TouchableOpacity
      style={styles.ringCol}
      onPress={handlePress}
      disabled={!onPress}
      activeOpacity={0.72}
      accessibilityRole={onPress ? 'button' : 'none'}
      accessibilityLabel={accessibilityLabel}
      hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
    >
      {/* Top Value: Current vs Target */}
      <View style={styles.topValueRow}>
        <Text style={styles.consumedValText} numberOfLines={1} adjustsFontSizeToFit>
          {displayConsumed}
        </Text>
        <Text style={styles.targetValText} numberOfLines={1} adjustsFontSizeToFit>
          /{displayTarget}
        </Text>
      </View>

      {/* SVG Ring with Percentage in Center */}
      <View style={styles.ringWrapper}>
        <Svg width={RING_SIZE} height={RING_SIZE} viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}>
          {/* Background Track */}
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RADIUS}
            stroke={trackColor}
            strokeWidth={STROKE_WIDTH}
            fill="none"
          />
          {/* Progress Arc */}
          <AnimatedCircle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RADIUS}
            stroke={color}
            strokeWidth={STROKE_WIDTH}
            fill="none"
            strokeDasharray={`${CIRCUMFERENCE}`}
            animatedProps={animatedCircleProps}
            strokeLinecap="round"
            transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
          />
        </Svg>
        <View style={styles.ringCenterTextWrapper} pointerEvents="none">
          <Text style={styles.ringCenterPct} numberOfLines={1} adjustsFontSizeToFit>
            {`${Math.round(pct)}%`}
          </Text>
        </View>
      </View>

      {/* Localized Nutrient Label */}
      <Text style={styles.macroLabel} numberOfLines={1} adjustsFontSizeToFit>
        {name}
      </Text>
    </TouchableOpacity>
  );
});
MacroRingCol.displayName = 'MacroRingCol';

export const MacroCards: React.FC<MacroCardsProps> = ({
  proteinTarget,
  proteinConsumed,
  carbsTarget,
  carbsConsumed,
  fatTarget,
  fatConsumed,
  waterGlasses = 0,
  waterTargetGlasses = 8,
  fiberConsumed,
  fiberTarget = 28,
  fiberHasTarget = true,
  sugarConsumed,
  sugarTarget = 50,
  sugarHasTarget = true,
  fiberIsIncomplete = false,
  sugarIsIncomplete = false,
  onSelectNutrient,
}) => {
  const language = useLanguage();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const isRtl = useIsRTL();
  const t = (key: string) => translate(language, key);

  const currentWaterLiters = Math.round((((waterGlasses ?? 0) * 250) / 1000) * 10) / 10;
  const targetWaterLiters = Math.round((((waterTargetGlasses ?? 8) * 250) / 1000) * 10) / 10;
  const formatWater = (liters: number) => (Number.isInteger(liters) ? `${liters}L` : `${liters.toFixed(1)}L`);

  const macros = [
    {
      key: 'protein',
      name: t('Protein'),
      consumed: Math.round(proteinConsumed),
      target: proteinTarget,
      displayConsumed: `${Math.round(proteinConsumed)}g`,
      displayTarget: `${Math.round(proteinTarget)}g`,
      pct: proteinTarget > 0 ? (proteinConsumed / proteinTarget) * 100 : 0,
      color: theme.colors.macroProtein,
    },
    {
      key: 'carbs',
      name: t('Carbs'),
      consumed: Math.round(carbsConsumed),
      target: carbsTarget,
      displayConsumed: `${Math.round(carbsConsumed)}g`,
      displayTarget: `${Math.round(carbsTarget)}g`,
      pct: carbsTarget > 0 ? (carbsConsumed / carbsTarget) * 100 : 0,
      color: theme.colors.macroCarbs,
    },
    {
      key: 'fat',
      name: t('Fat'),
      consumed: Math.round(fatConsumed),
      target: fatTarget,
      displayConsumed: `${Math.round(fatConsumed)}g`,
      displayTarget: `${Math.round(fatTarget)}g`,
      pct: fatTarget > 0 ? (fatConsumed / fatTarget) * 100 : 0,
      color: theme.colors.macroFat,
    },
    {
      key: 'water',
      name: t('Water'),
      consumed: currentWaterLiters,
      target: targetWaterLiters,
      displayConsumed: formatWater(currentWaterLiters),
      displayTarget: formatWater(targetWaterLiters),
      pct: targetWaterLiters > 0 ? (currentWaterLiters / targetWaterLiters) * 100 : 0,
      color: theme.colors.water,
    },
  ];

  return (
    <View style={styles.container}>
      {/* 4 Unified Macro & Hydration Rings */}
      <View style={[styles.ringsRow, isRtl && styles.rowRtl]}>
        {macros.map((m) => (
          <MacroRingCol
            key={m.key}
            macroKey={m.key}
            name={m.name}
            displayConsumed={m.displayConsumed}
            displayTarget={m.displayTarget}
            pct={m.pct}
            color={m.color}
            trackColor={theme.colors.surfaceSubtle}
            onPress={onSelectNutrient}
            accessibilityLabel={`${m.name}: ${m.displayConsumed} / ${m.displayTarget}, ${Math.round(m.pct)}%`}
          />
        ))}
      </View>

      {/* Secondary Nutrients Strip: Fiber, Sugar, and Micronutrients Explorer */}
      <View style={[styles.secondaryStrip, isRtl && styles.rowRtl]}>
        {/* Fiber Pill */}
        <TouchableOpacity
          style={[styles.secondaryPill, isRtl && styles.rowRtl]}
          onPress={() => onSelectNutrient?.('fiber')}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={`${t('Fiber')}: ${
            typeof fiberConsumed === 'number' && Number.isFinite(fiberConsumed)
              ? fiberHasTarget
                ? `${Math.round(fiberConsumed * 10) / 10} / ${fiberTarget}g`
                : `${Math.round(fiberConsumed * 10) / 10}g`
              : t('Not enough data')
          }`}
        >
          <Text style={styles.pillCombinedText} numberOfLines={1}>
            <Text style={styles.secondaryLabel}>{t('Fiber')}: </Text>
            <Text style={styles.secondaryValue}>
              {typeof fiberConsumed === 'number' && Number.isFinite(fiberConsumed)
                ? fiberHasTarget
                  ? `${Math.round(fiberConsumed * 10) / 10}/${fiberTarget}g`
                  : `${Math.round(fiberConsumed * 10) / 10}g`
                : fiberHasTarget
                ? `—/${fiberTarget}g`
                : '—g'}
            </Text>
            {fiberIsIncomplete && (
              <Text style={styles.incompleteAsterisk} accessibilityLabel={t('Incomplete data')}>
                {' '}*
              </Text>
            )}
          </Text>
        </TouchableOpacity>

        {/* Sugar Pill */}
        <TouchableOpacity
          style={[styles.secondaryPill, isRtl && styles.rowRtl]}
          onPress={() => onSelectNutrient?.('sugar')}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={`${t('Total Sugar')}: ${
            typeof sugarConsumed === 'number' && Number.isFinite(sugarConsumed)
              ? sugarHasTarget
                ? `${Math.round(sugarConsumed * 10) / 10} / ${sugarTarget}g`
                : `${Math.round(sugarConsumed * 10) / 10}g`
              : t('Not enough data')
          }`}
        >
          <Text style={styles.pillCombinedText} numberOfLines={1}>
            <Text style={styles.secondaryLabel}>{t('Total Sugar')}: </Text>
            <Text style={styles.secondaryValue}>
              {typeof sugarConsumed === 'number' && Number.isFinite(sugarConsumed)
                ? sugarHasTarget
                  ? `${Math.round(sugarConsumed * 10) / 10}/${sugarTarget}g`
                  : `${Math.round(sugarConsumed * 10) / 10}g`
                : sugarHasTarget
                ? `—/${sugarTarget}g`
                : '—g'}
            </Text>
            {sugarIsIncomplete && (
              <Text style={styles.incompleteAsterisk} accessibilityLabel={t('Incomplete data')}>
                {' '}*
              </Text>
            )}
          </Text>
        </TouchableOpacity>

        {/* Vitamins & RDA Explorer Button */}
        <TouchableOpacity
          style={[styles.vitaminsBtn, isRtl && styles.rowRtl]}
          onPress={() => onSelectNutrient?.('calories')}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={t('Micronutrients & Daily Allowance (RDA)')}
        >
          <Activity size={12} color={theme.colors.primary} />
          <Text style={styles.vitaminsBtnText} numberOfLines={1}>{t('Vitamins')}</Text>
          <DirectionalIcon name="ChevronRight" size={12} color={theme.colors.textMuted} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const createStyles = (theme: ThemeType) => StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 12,
    marginVertical: 10,
    ...theme.shadow.subtle,
  },
  rowRtl: {
    flexDirection: 'row-reverse',
  },
  ringsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  ringCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
  },
  topValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: 6,
    minHeight: 16,
  },
  consumedValText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    includeFontPadding: false,
  },
  targetValText: {
    fontSize: 10,
    fontWeight: '500',
    color: theme.colors.textMuted,
    includeFontPadding: false,
  },
  ringWrapper: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  ringCenterTextWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringCenterPct: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    includeFontPadding: false,
  },
  macroLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    includeFontPadding: false,
  },
  secondaryStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: 4,
    flexWrap: 'nowrap',
  },
  secondaryPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 5,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surfaceSubtle,
    minWidth: 0,
  },
  pillCombinedText: {
    fontSize: 11,
    lineHeight: 14,
    textAlign: 'center',
    includeFontPadding: false,
  },
  secondaryLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    includeFontPadding: false,
  },
  secondaryValue: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    includeFontPadding: false,
  },
  incompleteAsterisk: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.amberText,
  },
  vitaminsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.primaryLight,
    flexShrink: 0,
  },
  vitaminsBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primary,
    includeFontPadding: false,
  },
});
