import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
} from 'react-native';
import { AppText as Text } from './AppText';
import { useLanguage } from '../i18n/I18nContext';
import { translate } from '../i18n/strings';
import { theme } from '../theme';
import { isReducedMotion } from '../utils/motion';

interface MacroCardsProps {
  calorieTarget: number;
  calorieConsumed: number;
  proteinTarget: number;
  proteinConsumed: number;
  carbsTarget: number;
  carbsConsumed: number;
  fatTarget: number;
  fatConsumed: number;
}

const AnimatedProgressBar: React.FC<{ pct: number; color: string }> = ({ pct, color }) => {
  const widthAnim = useRef(new Animated.Value(pct)).current;

  useEffect(() => {
    if (isReducedMotion()) {
      widthAnim.setValue(pct);
    } else {
      Animated.timing(widthAnim, {
        toValue: pct,
        duration: 350,
        useNativeDriver: false,
      }).start();
    }
  }, [pct]);

  const widthStyle = widthAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.track}>
      <Animated.View
        style={[
          styles.bar,
          { width: widthStyle, backgroundColor: color },
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
}) => {
  const language = useLanguage();
  const t = (key: string) => translate(language, key);

  const macros = [
    {
      name: 'Protein',
      consumed: Math.round(proteinConsumed),
      target: proteinTarget,
      color: theme.colors.macroProtein,
    },
    {
      name: 'Carbs',
      consumed: Math.round(carbsConsumed),
      target: carbsTarget,
      color: theme.colors.macroCarbs,
    },
    {
      name: 'Fat',
      consumed: Math.round(fatConsumed),
      target: fatTarget,
      color: theme.colors.macroFat,
    },
  ];

  return (
    <View style={styles.container}>
      {macros.map((m) => {
        const pct = m.target > 0 ? Math.min((m.consumed / m.target) * 100, 100) : 0;
        return (
          <View key={m.name} style={styles.macroCol}>
            <View style={styles.headerRow}>
              <Text style={styles.macroName}>{t(m.name)}</Text>
              <Text style={styles.macroNumbers}>
                <Text style={styles.consumedText}>{m.consumed}</Text>
                <Text style={styles.targetText}> / {m.target}g</Text>
              </Text>
            </View>

            <AnimatedProgressBar pct={pct} color={m.color} />
          </View>
        );
      })}
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
});
