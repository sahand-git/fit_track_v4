import React, { useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { AppText as Text } from './AppText';
import { AnimatedCount } from './AnimatedCount';
import { useLanguage } from '../i18n/I18nContext';
import { translate } from '../i18n/strings';
import { theme } from '../theme';
import { isReducedMotion } from '../utils/motion';
import { Sparkles, ChevronRight } from 'lucide-react-native';

interface MacroCardsProps {
  calorieTarget: number;
  calorieConsumed: number;
  proteinTarget: number;
  proteinConsumed: number;
  carbsTarget: number;
  carbsConsumed: number;
  fatTarget: number;
  fatConsumed: number;
  fiberConsumed?: number;
  fiberTarget?: number;
  sugarConsumed?: number;
  sugarTarget?: number;
  fiberIsIncomplete?: boolean;
  sugarIsIncomplete?: boolean;
  onSelectNutrient?: (nutrientKey: string) => void;
}

const AnimatedProgressBar: React.FC<{ pct: number; color: string }> = ({ pct, color }) => {
  const width = useSharedValue(pct);

  useEffect(() => {
    if (isReducedMotion()) {
      width.value = pct;
    } else {
      width.value = withTiming(pct, {
        duration: 320,
        easing: Easing.out(Easing.cubic),
      });
    }
  }, [pct, width]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      width: `${Math.max(0, Math.min(100, width.value))}%`,
    };
  });

  return (
    <View style={styles.track}>
      <Animated.View
        style={[
          styles.bar,
          { backgroundColor: color },
          animatedStyle,
        ]}
      />
    </View>
  );
};

export const MacroCards: React.FC<MacroCardsProps> = ({
  proteinTarget,
  proteinConsumed,
  carbsTarget,
  carbsConsumed,
  fatTarget,
  fatConsumed,
  fiberConsumed,
  fiberTarget = 28,
  sugarConsumed,
  sugarTarget = 50,
  fiberIsIncomplete = false,
  sugarIsIncomplete = false,
  onSelectNutrient,
}) => {
  const language = useLanguage();
  const isRtl = language === 'ar' || language === 'ckb';
  const t = (key: string) => translate(language, key);

  const macros = [
    {
      key: 'protein',
      name: 'Protein',
      consumed: Math.round(proteinConsumed),
      target: proteinTarget,
      color: theme.colors.macroProtein,
    },
    {
      key: 'carbs',
      name: 'Carbs',
      consumed: Math.round(carbsConsumed),
      target: carbsTarget,
      color: theme.colors.macroCarbs,
    },
    {
      key: 'fat',
      name: 'Fat',
      consumed: Math.round(fatConsumed),
      target: fatTarget,
      color: theme.colors.macroFat,
    },
  ];

  return (
    <View style={styles.container}>
      {/* 3 Core Macronutrients */}
      {macros.map((m) => {
        const pct = m.target > 0 ? Math.min((m.consumed / m.target) * 100, 100) : 0;
        return (
          <TouchableOpacity
            key={m.key}
            style={styles.macroCol}
            onPress={() => onSelectNutrient?.(m.key)}
            disabled={!onSelectNutrient}
            activeOpacity={0.72}
            accessibilityRole={onSelectNutrient ? 'button' : 'none'}
            accessibilityLabel={`${t(m.name)}: ${m.consumed} / ${m.target}g`}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <View style={[styles.headerRow, isRtl && styles.rowRtl]}>
              <Text style={styles.macroName}>{t(m.name)}</Text>
              <Text style={styles.macroNumbers}>
                <AnimatedCount value={m.consumed} style={styles.consumedText} />
                <Text style={styles.targetText}> / {m.target}g</Text>
              </Text>
            </View>

            <AnimatedProgressBar pct={pct} color={m.color} />
          </TouchableOpacity>
        );
      })}

      {/* Secondary Nutrients Strip: Fiber, Sugar, and Micronutrients Explorer */}
      <View style={[styles.secondaryStrip, isRtl && styles.rowRtl]}>
        {/* Fiber Pill */}
        <TouchableOpacity
          style={[styles.secondaryPill, isRtl && styles.rowRtl]}
          onPress={() => onSelectNutrient?.('fiber')}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t('Fiber')}
        >
          <Text style={styles.secondaryLabel}>{t('Fiber')}:</Text>
          <Text style={styles.secondaryValue}>
            {typeof fiberConsumed === 'number' ? Math.round(fiberConsumed * 10) / 10 : 0}/{fiberTarget}g
          </Text>
          {fiberIsIncomplete && (
            <Text style={styles.incompleteAsterisk} accessibilityLabel={t('Incomplete data')}>
              *
            </Text>
          )}
        </TouchableOpacity>

        {/* Sugar Pill */}
        <TouchableOpacity
          style={[styles.secondaryPill, isRtl && styles.rowRtl]}
          onPress={() => onSelectNutrient?.('sugar')}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t('Sugar')}
        >
          <Text style={styles.secondaryLabel}>{t('Sugar')}:</Text>
          <Text style={styles.secondaryValue}>
            {typeof sugarConsumed === 'number' ? Math.round(sugarConsumed * 10) / 10 : 0}/{sugarTarget}g
          </Text>
          {sugarIsIncomplete && (
            <Text style={styles.incompleteAsterisk} accessibilityLabel={t('Incomplete data')}>
              *
            </Text>
          )}
        </TouchableOpacity>

        {/* Vitamins & RDA Explorer Button */}
        <TouchableOpacity
          style={[styles.vitaminsBtn, isRtl && styles.rowRtl]}
          onPress={() => onSelectNutrient?.('vitaminC')}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t('Micronutrients & Daily Allowance (RDA)')}
        >
          <Sparkles size={12} color={theme.colors.primary} />
          <Text style={styles.vitaminsBtnText}>{t('Vitamins')}</Text>
          <ChevronRight size={12} color={theme.colors.textMuted} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
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
  macroCol: {
    gap: 6,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  macroName: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  macroNumbers: {
    fontSize: 12,
  },
  consumedText: {
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  targetText: {
    color: theme.colors.textMuted,
  },
  track: {
    height: 6,
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: 3,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: 3,
  },
  secondaryStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: 6,
  },
  secondaryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surfaceSubtle,
  },
  secondaryLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  secondaryValue: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  incompleteAsterisk: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D97706',
    marginLeft: 1,
  },
  vitaminsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radius.sm,
    backgroundColor: `${theme.colors.primary}12`,
    marginLeft: 'auto',
  },
  vitaminsBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primary,
  },
});
