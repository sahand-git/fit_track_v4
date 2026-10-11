import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import {
  TrendingDown,
  TrendingUp,
  Scale,
  Plus,
  Trash2,
  Calendar,
  X,
  Check,
  Info,
} from 'lucide-react-native';
import Svg, { Path, Circle, Defs, LinearGradient, Stop, Line } from 'react-native-svg';
import { UserProfile, WeightEntry } from '../types';
import { loadWeightHistory, addWeightEntry, removeWeightEntry } from '../storage/storage';
import { getTodayDateString, formatDisplayDate } from '../utils/dateUtils';
import { theme } from '../theme';
import * as Haptics from 'expo-haptics';

interface ProgressScreenProps {
  profile?: UserProfile;
  onUpdateWeight?: (weightKg: number) => void;
}

export const ProgressScreen: React.FC<ProgressScreenProps> = ({ profile, onUpdateWeight }) => {
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

  // Generate dynamic SVG chart points if 2+ data points
  const renderChart = () => {
    if (history.length < 2) {
      return (
        <View style={styles.chartEmptyBox}>
          <Scale size={28} color={theme.colors.textMuted} />
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
    const height = 130;
    const padding = 15;

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
          <Defs>
            <LinearGradient id="weightGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={theme.colors.accent} stopOpacity="0.4" />
              <Stop offset="100%" stopColor={theme.colors.background} stopOpacity="0" />
            </LinearGradient>
          </Defs>

          {/* Gridline */}
          <Line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke={theme.colors.surfaceBorder} strokeDasharray="4 4" />

          {/* Curve */}
          <Path
            d={pathD}
            fill="none"
            stroke={theme.colors.accent}
            strokeWidth={3}
            strokeLinecap="round"
          />

          {/* Points */}
          {points.map((pt, idx) => (
            <Circle key={idx} cx={pt.x} cy={pt.y} r={4} fill={theme.colors.accent} />
          ))}
        </Svg>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Top Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.headerSubtitle}>PROGRESS & BODY WEIGHT</Text>
          <Text style={styles.headerTitle}>Weight History</Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setModalVisible(true)}
          accessibilityLabel="Log current weight"
          accessibilityRole="button"
        >
          <Plus size={18} color="#FFFFFF" />
          <Text style={styles.addBtnText}>Log Weight</Text>
        </TouchableOpacity>
      </View>

      {/* Current Weight Hero Card */}
      <View style={styles.heroCard}>
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.heroLabel}>CURRENT WEIGHT</Text>
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
                <TrendingUp size={14} color={theme.colors.amber} />
              )}
              <Text style={[styles.deltaBadgeText, totalDelta <= 0 ? { color: theme.colors.primary } : { color: theme.colors.amber }]}>
                {totalDelta > 0 ? `+${totalDelta}` : `${totalDelta}`} kg
              </Text>
            </View>
            <Text style={styles.deltaSub}>Overall delta</Text>
          </View>
        </View>

        {/* BMI & Status */}
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

      {/* Chart Card */}
      <View style={styles.chartCard}>
        <View style={styles.chartTop}>
          <Text style={styles.chartTitle}>Weight Trend</Text>
          <Text style={styles.chartSubtitle}>
            {history.length > 0 ? `${history.length} weigh-in(s) recorded` : 'No data yet'}
          </Text>
        </View>

        {renderChart()}
      </View>

      {/* Real Weight History Log */}
      <View style={styles.historySection}>
        <Text style={styles.sectionTitle}>Recorded Entries</Text>

        {history.length === 0 ? (
          <View style={styles.emptyHistoryBox}>
            <Scale size={32} color={theme.colors.textMuted} />
            <Text style={styles.emptyHistoryTitle}>No weight entries logged yet</Text>
            <Text style={styles.emptyHistoryBody}>
              Tap the "Log Weight" button above to record your current weight and track your progress over time.
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
                  <Trash2 size={16} color={theme.colors.danger} />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Modal for Logging Weight */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Record Weight</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Weight (kg)</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="numeric"
              placeholder="e.g. 74.5"
              placeholderTextColor={theme.colors.textMuted}
              value={inputWeight}
              onChangeText={setInputWeight}
            />

            <Text style={styles.modalLabel}>Note (optional)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Morning fasting, post workout"
              placeholderTextColor={theme.colors.textMuted}
              value={inputNote}
              onChangeText={setInputNote}
            />

            <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSaveWeight}>
              <Check size={18} color="#FFFFFF" />
              <Text style={styles.modalSaveBtnText}>Save Entry</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 110,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerSubtitle: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.textMuted,
    letterSpacing: 1.2,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    marginTop: 2,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.radius.full,
  },
  addBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  heroCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    marginBottom: 14,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  heroLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textMuted,
    letterSpacing: 0.6,
  },
  heroValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginTop: 4,
  },
  heroValue: {
    fontSize: 32,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  heroUnit: {
    fontSize: 15,
    fontWeight: '600',
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
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radius.full,
  },
  deltaLoss: {
    backgroundColor: theme.colors.primaryLight,
  },
  deltaGain: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  deltaBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  deltaSub: {
    fontSize: 10,
    color: theme.colors.textMuted,
  },
  bmiStrip: {
    backgroundColor: theme.colors.surfaceLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radius.md,
    marginTop: 6,
  },
  bmiText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  boldText: {
    color: theme.colors.textPrimary,
    fontWeight: '700',
  },
  chartCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    marginBottom: 16,
  },
  chartTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  chartSubtitle: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  svgContainer: {
    height: 130,
    width: '100%',
    marginVertical: 4,
  },
  chartEmptyBox: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 6,
  },
  chartEmptyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  chartEmptySubtitle: {
    fontSize: 11,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  historySection: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  emptyHistoryBox: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    gap: 8,
  },
  emptyHistoryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  emptyHistoryBody: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  historyDateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  historyDate: {
    fontSize: 13,
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
  historyRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  historyWeight: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  historyNote: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  deleteBtn: {
    padding: 4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    gap: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  modalLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
  },
  modalInput: {
    backgroundColor: theme.colors.surfaceLight,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    borderRadius: theme.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: theme.colors.textPrimary,
    fontSize: 15,
  },
  modalSaveBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 6,
  },
  modalSaveBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
