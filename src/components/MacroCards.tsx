import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../theme';

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

export const MacroCards: React.FC<MacroCardsProps> = ({
  proteinTarget,
  proteinConsumed,
  carbsTarget,
  carbsConsumed,
  fatTarget,
  fatConsumed,
}) => {
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
              <Text style={styles.macroName}>{m.name}</Text>
              <Text style={styles.macroNumbers}>
                <Text style={styles.consumedText}>{m.consumed}</Text>
                <Text style={styles.targetText}> / {m.target}g</Text>
              </Text>
            </View>

            <View style={styles.track}>
              <View
                style={[
                  styles.bar,
                  { width: `${pct}%`, backgroundColor: m.color },
                ]}
              />
            </View>
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
