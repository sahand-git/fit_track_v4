import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Droplets, Plus, Minus } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

interface WaterTrackerProps {
  glasses: number;
  target: number;
  onUpdate: (delta: number) => void;
}

export const WaterTracker: React.FC<WaterTrackerProps> = ({
  glasses,
  target,
  onUpdate,
}) => {
  const handleAdd = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onUpdate(1);
  };

  const handleSubtract = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onUpdate(-1);
  };

  const milliliters = glasses * 250;
  const targetMilliliters = target * 250;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={styles.iconCircle}>
            <Droplets size={18} color="#06B6D4" />
          </View>
          <View>
            <Text style={styles.title}>Hydration Tracker</Text>
            <Text style={styles.subtitle}>
              {milliliters} ml / {targetMilliliters} ml ({glasses} of {target} glasses)
            </Text>
          </View>
        </View>

        <View style={styles.controls}>
          <TouchableOpacity
            style={[styles.btn, glasses === 0 && styles.btnDisabled]}
            disabled={glasses === 0}
            onPress={handleSubtract}
            activeOpacity={0.7}
          >
            <Minus size={16} color={glasses === 0 ? '#475569' : '#94A3B8'} />
          </TouchableOpacity>
          <Text style={styles.glassCount}>{glasses}</Text>
          <TouchableOpacity
            style={[styles.btn, styles.btnAdd]}
            onPress={handleAdd}
            activeOpacity={0.7}
          >
            <Plus size={16} color="#06B6D4" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Visual Drops Bar */}
      <View style={styles.dropsRow}>
        {Array.from({ length: target }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.dropDot,
              i < glasses && styles.dropDotFilled,
            ]}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#131B2E',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(6, 182, 212, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnAdd: {
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
  },
  btnDisabled: {
    opacity: 0.5,
  },
  glassCount: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F8FAFC',
    minWidth: 20,
    textAlign: 'center',
  },
  dropsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 14,
  },
  dropDot: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#1E293B',
  },
  dropDotFilled: {
    backgroundColor: '#06B6D4',
  },
});
