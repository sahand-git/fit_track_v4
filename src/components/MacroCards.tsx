import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

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
  calorieTarget,
  calorieConsumed,
  proteinTarget,
  proteinConsumed,
  carbsTarget,
  carbsConsumed,
  fatTarget,
  fatConsumed,
}) => {
  const cards = [
    {
      label: 'Daily Target',
      value: calorieTarget,
      consumed: calorieConsumed,
      unit: 'kcal',
      color: '#10B981', // Emerald
    },
    {
      label: 'Protein',
      value: proteinTarget,
      consumed: Math.round(proteinConsumed * 10) / 10,
      unit: 'g',
      color: '#F59E0B', // Amber
    },
    {
      label: 'Carbohydrates',
      value: carbsTarget,
      consumed: Math.round(carbsConsumed * 10) / 10,
      unit: 'g',
      color: '#06B6D4', // Cyan
    },
    {
      label: 'Fat',
      value: fatTarget,
      consumed: Math.round(fatConsumed * 10) / 10,
      unit: 'g',
      color: '#EC4899', // Pink
    },
  ];

  return (
    <View style={styles.grid}>
      {cards.map((card, idx) => {
        const pct = card.value > 0 ? Math.min((card.consumed / card.value) * 100, 100) : 0;
        return (
          <View key={idx} style={styles.card}>
            {/* Top: Label */}
            <Text style={styles.cardLabel} numberOfLines={1}>
              {card.label}
            </Text>

            {/* Middle: Prominent Value */}
            <View style={styles.valueRow}>
              <Text style={styles.cardValue}>{card.consumed}</Text>
              <Text style={styles.cardDivider}>/</Text>
              <Text style={styles.cardTarget}>{card.value}</Text>
            </View>

            {/* Bottom: Unit */}
            <Text style={styles.cardUnit}>{card.unit}</Text>

            {/* Progress Bar */}
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressBar,
                  { width: `${pct}%`, backgroundColor: card.color },
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginVertical: 12,
  },
  card: {
    flex: 1,
    minWidth: '46%',
    backgroundColor: '#131B2E',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  cardValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  cardDivider: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '600',
  },
  cardTarget: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  cardUnit: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 2,
    textTransform: 'lowercase',
  },
  progressTrack: {
    height: 4,
    backgroundColor: '#1E293B',
    borderRadius: 2,
    marginTop: 10,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
});
