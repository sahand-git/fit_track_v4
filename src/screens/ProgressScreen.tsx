import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert
} from 'react-native';
import { AppText as Text } from '../components/AppText';
import {
  TrendingDown,
  TrendingUp,
  Scale,
  Plus,
  Trash2,
  Calendar,
  X,
  Check,
  Flame,
} from 'lucide-react-native';
import Svg, { Path, Circle, Line } from 'react-native-svg';
import { UserProfile, WeightEntry } from '../types';
import { loadWeightHistory, addWeightEntry, removeWeightEntry } from '../storage/storage';
import { getTodayDateString, formatDisplayDate } from '../utils/dateUtils';
import { InsightsScreen } from './InsightsScreen';
import { theme } from '../theme';
import * as Haptics from 'expo-haptics';

interface ProgressScreenProps {
  profile?: UserProfile;
  onUpdateWeight?: (weightKg: number) => void;
}

export const ProgressScreen: React.FC<ProgressScreenProps> = ({ profile, onUpdateWeight }) => {
  const [subTab, setSubTab] = useState<'weight' | 'nutrition'>('weight');
  const [history, setHistory] = useState<WeightEntry[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [inputWeight, setInputWeight] = useState(profile ? String(profile.weightKg) : '75');
  const [inputNote, setInputNote] = useState('');

  useEffect(() => {
    async function load() {
      const data = await loadWeightHistory();
      setHistory(data);
    }
    load();
  }, []);

  const currentWeight = history.length > 0 
    ? history[history.length - 1].weightKg 
    : (profile?.weightKg ?? 75);

  const startWeight = history.length > 0 
    ? history[0].weightKg 
    : currentWeight;

  const totalDelta = Math.round((currentWeight - startWeight) * 10) / 10;

  const bmi = profile && profile.heightCm > 0
    ? (currentWeight / Math.pow(profile.heightCm / 100, 2)).toFixed(1)
    : '22.4';

  const handleSaveWeight = async () => {
    const num = parseFloat(inputWeight);
    if (isNaN(num) || num < 25 || num > 350) {
      Alert.alert('Invalid Weight', 'Please enter a realistic weight between 25 and 350 kg.');
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    const today = getTodayDateString();
    const entry: WeightEntry = {
      id: `w_${Date.now()}`,
      date: today,
      weightKg: Math.round(num * 10) / 10,
      note: inputNote.trim() || undefined,
      timestamp: new Date().toISOString(),
    };

    const updated = await addWeightEntry(entry);
    setHistory(updated);
    if (onUpdateWeight) {
      onUpdateWeight(num);
    }
    setModalVisible(false);
    setInputNote('');
  };

  const handleDeleteEntry = async (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    const updated = await removeWeightEntry(id);
    setHistory(updated);
  };

  const renderChart = () => {
    if (history.length < 2) {
      return (
        <View style={styles.chartEmptyBox}>
          <Scale size={24} color={theme.colors.textMuted} />
          <Text style={styles.chartEmptyTitle}>Need at least 2 entries for trend chart</Text>
          <Text style={styles.chartEmptySubtitle}>
            Log your weight across multiple days to view your true trajectory curve.
          </Text>
        </View>
      );
    }

    const minWeight = Math.min(...history.map(h => h.weightKg)) - 1;
    const maxWeight = Math.max(...history.map(h => h.weightKg)) + 1;
    const range = Math.max(1, maxWeight - minWeight);

    const width = 320;
    const height = 120;
    const padding = 14;

    const points = history.map((entry, idx) => {
      const x = padding + (idx / (history.length - 1)) * (width - padding * 2);
      const y = height - padding - ((entry.weightKg - minWeight) / range) * (height - padding * 2);
      return { x, y, ...entry };
    });

    const pathD = points.reduce((acc, pt, idx) => {
      return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
    }, '');

    return (
      <View style={styles.svgContainer}>
        <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
          <Line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke={theme.colors.border} strokeDasharray="3 3" />
          <Path
            d={pathD}
            fill="none"
            stroke={theme.colors.primary}
            strokeWidth={2.5}
            strokeLinecap="round"
          />
          {points.map((pt, idx) => (
            <Circle key={idx} cx={pt.x} cy={pt.y} r={3.5} fill={theme.colors.primary} />
          ))}
        </Svg>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Ledger Segment Bar */}
      <View style={styles.segmentBar}>
        <TouchableOpacity
          style={[styles.segmentBtn, subTab === 'weight' && styles.segmentBtnActive]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            setSubTab('weight');
          }}
          activeOpacity={0.7}
        >
          <Scale size={14} color={subTab === 'weight' ? theme.colors.primary : theme.colors.textMuted} />
          <Text style={[styles.segmentText, subTab === 'weight' && styles.segmentTextActive]}>
            Body Weight
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, subTab === 'nutrition' && styles.segmentBtnActive]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            setSubTab('nutrition');
          }}
          activeOpacity={0.7}
        >
          <Flame size={14} color={subTab === 'nutrition' ? theme.colors.primary : theme.colors.textMuted} />
          <Text style={[styles.segmentText, subTab === 'nutrition' && styles.segmentTextActive]}>
            Weekly Nutrition
          </Text>
        </TouchableOpacity>
      </View>

      {subTab === 'nutrition' ? (
        <InsightsScreen profile={profile} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.headerSubtitle}>Progress</Text>
              <Text style={styles.headerTitle}>Body Weight</Text>
            </View>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => setModalVisible(true)}
              accessibilityLabel="Record weight"
              accessibilityRole="button"
            >
              <Plus size={15} color={theme.colors.textInverted} />
              <Text style={styles.addBtnText}>Log weight</Text>
            </TouchableOpacity>
          </View>

          {/* Current Weight Focus Card */}
          <View style={styles.heroCard}>
            <View style={styles.heroTop}>
              <View>
                <Text style={styles.heroLabel}>Current Weight</Text>
                <View style={styles.heroValueRow}>
                  <Text style={styles.heroValue}>{currentWeight}</Text>
                  <Text style={styles.heroUnit}>kg</Text>
                </View>
              </View>

              <View style={styles.heroRight}>
                <View style={[styles.deltaBadge, totalDelta <= 0 ? styles.deltaLoss : styles.deltaGain]}>
                  {totalDelta <= 0 ? (
                    <TrendingDown size={14} color={theme.colors.primary} />
                  ) : (
                    <TrendingUp size={14} color={theme.colors.accent} />
                  )}
                  <Text style={[styles.deltaBadgeText, totalDelta <= 0 ? { color: theme.colors.primary } : { color: theme.colors.accent }]}>
                    {totalDelta > 0 ? `+${totalDelta}` : `${totalDelta}`} kg
                  </Text>
                </View>
                <Text style={styles.deltaSub}>Net change</Text>
              </View>
            </View>

            {/* BMI Meta */}
            <View style={styles.bmiStrip}>
              <Text style={styles.bmiText}>
                BMI: <Text style={styles.boldText}>{bmi}</Text> •{' '}
                {parseFloat(bmi) < 18.5
                  ? 'Underweight'
                  : parseFloat(bmi) < 25
                  ? 'Healthy Weight'
                  : parseFloat(bmi) < 30
                  ? 'Overweight'
                  : 'Obese'}
              </Text>
            </View>
          </View>

          {/* Trajectory Card */}
          <View style={styles.chartCard}>
            <View style={styles.chartTop}>
              <Text style={styles.chartTitle}>Trajectory Curve</Text>
              <Text style={styles.chartSubtitle}>
                {history.length > 0 ? `${history.length} logged weigh-in${history.length > 1 ? 's' : ''}` : 'No history yet'}
              </Text>
            </View>

            {renderChart()}
          </View>

          {/* Real History List */}
          <View style={styles.historySection}>
            <Text style={styles.sectionTitle}>Recorded Entries</Text>

            {history.length === 0 ? (
              <View style={styles.emptyHistoryBox}>
                <Scale size={28} color={theme.colors.textMuted} />
                <Text style={styles.emptyHistoryTitle}>No weight entries logged yet</Text>
                <Text style={styles.emptyHistoryBody}>
                  Tap "Log weight" above to track your weight across weeks.
                </Text>
              </View>
            ) : (
              [...history].reverse().map((entry) => (
                <View key={entry.id} style={styles.historyRow}>
                  <View style={styles.historyDateBox}>
                    <Calendar size={14} color={theme.colors.textMuted} />
                    <Text style={styles.historyDate}>{formatDisplayDate(entry.date)}</Text>
                  </View>

                  <View style={styles.historyRight}>
                    <Text style={styles.historyWeight}>{entry.weightKg} kg</Text>
                    {entry.note ? <Text style={styles.historyNote}>{entry.note}</Text> : null}
                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => handleDeleteEntry(entry.id)}
                      accessibilityLabel="Delete entry"
                    >
                      <Trash2 size={14} color={theme.colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      )}

      {/* LOG WEIGHT MODAL */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Record Weigh-in</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={20} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalInputGroup}>
              <Text style={styles.modalLabel}>Weight (kg)</Text>
              <TextInput
                style={styles.modalInput}
                keyboardType="numeric"
                value={inputWeight}
                onChangeText={setInputWeight}
                autoFocus
              />
            </View>

            <View style={styles.modalInputGroup}>
              <Text style={styles.modalLabel}>Note (optional)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Morning, post-workout"
                placeholderTextColor={theme.colors.textMuted}
                value={inputNote}
                onChangeText={setInputNote}
              />
            </View>

            <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSaveWeight}>
              <Check size={16} color={theme.colors.textInverted} />
              <Text style={styles.modalSaveText}>Save Weigh-in</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  segmentBar: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.md,
    marginTop: 10,
    marginBottom: 6,
    padding: 3,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: theme.radius.sm,
    gap: 6,
  },
  segmentBtnActive: {
    backgroundColor: theme.colors.primaryLight,
  },
  segmentText: {
    fontFamily: theme.fonts.sans,
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.textMuted,
  },
  segmentTextActive: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  content: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: 110,
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  headerSubtitle: {
    fontFamily: theme.fonts.sans,
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  headerTitle: {
    fontFamily: theme.fonts.serif,
    fontSize: 26,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    letterSpacing: -0.4,
    marginTop: 2,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: theme.radius.full,
    ...theme.shadow.subtle,
  },
  addBtnText: {
    fontFamily: theme.fonts.sans,
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textInverted,
  },
  heroCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.subtle,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  heroLabel: {
    fontFamily: theme.fonts.sans,
    fontSize: 12,
    color: theme.colors.textMuted,
    fontWeight: '500',
  },
  heroValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginTop: 2,
  },
  heroValue: {
    fontFamily: theme.fonts.serif,
    fontSize: 36,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    letterSpacing: -0.6,
  },
  heroUnit: {
    fontFamily: theme.fonts.sans,
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.textMuted,
  },
  heroRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  deltaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.full,
  },
  deltaLoss: {
    backgroundColor: theme.colors.primaryLight,
  },
  deltaGain: {
    backgroundColor: theme.colors.accentLight,
  },
  deltaBadgeText: {
    fontFamily: theme.fonts.sans,
    fontSize: 12,
    fontWeight: '700',
  },
  deltaSub: {
    fontFamily: theme.fonts.sans,
    fontSize: 10,
    color: theme.colors.textMuted,
  },
  bmiStrip: {
    backgroundColor: theme.colors.surfaceSubtle,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.radius.sm,
    marginTop: 4,
  },
  bmiText: {
    fontFamily: theme.fonts.sans,
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  boldText: {
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
  chartCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.subtle,
  },
  chartTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  chartTitle: {
    fontFamily: theme.fonts.serif,
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  chartSubtitle: {
    fontFamily: theme.fonts.sans,
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  svgContainer: {
    height: 120,
    width: '100%',
    marginVertical: 4,
  },
  chartEmptyBox: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 4,
  },
  chartEmptyTitle: {
    fontFamily: theme.fonts.serif,
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  chartEmptySubtitle: {
    fontFamily: theme.fonts.sans,
    fontSize: 12,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  historySection: {
    gap: 8,
  },
  sectionTitle: {
    fontFamily: theme.fonts.serif,
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: 14,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  historyDateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  historyDate: {
    fontFamily: theme.fonts.sans,
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  historyRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  historyWeight: {
    fontFamily: theme.fonts.serif,
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  historyNote: {
    fontFamily: theme.fonts.sans,
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  deleteBtn: {
    padding: 4,
  },
  emptyHistoryBox: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 4,
  },
  emptyHistoryTitle: {
    fontFamily: theme.fonts.serif,
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  emptyHistoryBody: {
    fontFamily: theme.fonts.sans,
    fontSize: 12,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: theme.colors.backdrop,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 14,
    ...theme.shadow.floating,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontFamily: theme.fonts.serif,
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  modalInputGroup: {
    gap: 6,
  },
  modalLabel: {
    fontFamily: theme.fonts.sans,
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
  },
  modalInput: {
    fontFamily: theme.fonts.sans,
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: theme.colors.textPrimary,
  },
  modalSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    borderRadius: theme.radius.md,
    marginTop: 6,
  },
  modalSaveText: {
    fontFamily: theme.fonts.sans,
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textInverted,
  },
});
