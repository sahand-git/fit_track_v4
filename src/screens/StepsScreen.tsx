import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { Activity, Footprints, HeartPulse, Minus, Plus, RefreshCw, Target } from 'lucide-react-native';
import { DirectionalIcon } from '../components/DirectionalIcon';
import { AppText as Text } from '../components/AppText';
import { useLanguage } from '../i18n/I18nContext';
import { translate } from '../i18n/strings';
import { useTheme } from '../theme/ThemeContext';
import { ThemeType } from '../theme';
import { formatDisplayDate, getTodayDateString } from '../utils/dateUtils';
import { formatKcal } from '../utils/formatKcal';
import { estimateStepCalories } from '../utils/activityBudget';
import { isHealthStepServiceAvailable, syncHealthStepsForDate } from '../services/stepTrackingService';

interface Props {
  date: string;
  steps: number;
  goal: number;
  weightKg: number;
  heightCm: number;
  onSetSteps: (value: number) => Promise<void>;
  onAddSteps: (value: number) => Promise<void>;
  onSetGoal: (value: number) => Promise<void>;
  onBack: () => void;
}

export const StepsScreen: React.FC<Props> = ({ date, steps, goal, weightKg, heightCm, onSetSteps, onAddSteps, onSetGoal, onBack }) => {
  const language = useLanguage();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const t = (value: string) => translate(language, value);
  const [stepInput, setStepInput] = useState(String(steps));
  const [goalInput, setGoalInput] = useState(String(goal));
  const [amountInput, setAmountInput] = useState('500');
  const [busy, setBusy] = useState(false);
  const [healthTotal, setHealthTotal] = useState<number | null>(null);
  const [error, setError] = useState('');
  const isFuture = date > getTodayDateString();
  const progress = Math.min(1, goal > 0 ? steps / goal : 0);
  const estimated = useMemo(() => {
    const strideMeters = Math.max(0.45, Math.min(0.9, (heightCm / 100) * 0.415));
    return {
      calories: estimateStepCalories(steps, weightKg),
      distanceKm: (steps * strideMeters / 1000).toFixed(2),
      activeMinutes: Math.round(steps / 100),
    };
  }, [steps, weightKg, heightCm]);

  const saveTotal = async () => {
    const value = Number(stepInput);
    if (!Number.isFinite(value) || value < 0) {
      setError(t('Enter a valid step count.'));
      return;
    }
    try { setError(''); await onSetSteps(Math.round(value)); }
    catch { setError(t('Could not save steps. Please try again.')); }
  };

  const saveGoal = async () => {
    const value = Number(goalInput);
    if (!Number.isFinite(value) || value < 500 || value > 100000) {
      setError(t('Step goal must be between 500 and 100000.'));
      return;
    }
    try { setError(''); await onSetGoal(Math.round(value)); }
    catch { setError(t('Could not save steps. Please try again.')); }
  };

  const addManualSteps = async () => {
    const amount = Number(amountInput);
    if (!Number.isFinite(amount) || amount <= 0 || amount > 100000) {
      setError(t('Enter an amount from 1 to 100000.'));
      return;
    }
    try { setError(''); await onAddSteps(Math.round(amount)); }
    catch { setError(t('Could not save steps. Please try again.')); }
  };

  const syncHealth = async () => {
    setBusy(true);
    setError('');
    try {
      if (!isHealthStepServiceAvailable()) {
        setError(t('Health Connect or Apple Health is not available on this device.'));
        return;
      }
      const total = await syncHealthStepsForDate(date, async (_date, value) => onSetSteps(value));
      if (total === null) setError(t('No step data was found for this date. Your saved total was kept.'));
      else { setHealthTotal(total); setStepInput(String(total)); }
    } catch {
      setError(t('Could not read health steps. Check permissions or enter steps manually.'));
    } finally { setBusy(false); }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} accessibilityRole="button" accessibilityLabel={t('Back')} style={styles.back}>
          <DirectionalIcon name="ArrowLeft" size={20} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>{formatDisplayDate(date, language)}</Text>
          <Text style={styles.title}>{t('Steps')}</Text>
        </View>
        <Footprints color={theme.colors.primary} size={25} />
      </View>

      <View style={styles.hero}>
        <View style={styles.stepIcon}><Footprints size={23} color={theme.colors.primary} /></View>
        <Text style={styles.stepNumber}>{steps.toLocaleString(language === 'en' ? 'en' : language === 'ar' ? 'ar' : 'ckb')}</Text>
        <Text style={styles.muted}>{t('steps today')}</Text>
        <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${progress * 100}%` }]} /></View>
        <Text style={styles.goalText}>{Math.round(progress * 100)}% · {t('Daily goal')} {goal.toLocaleString()} {t('steps')}</Text>
      </View>

      <View style={styles.stats}>
        <Stat styles={styles} icon={<Activity size={17} color={theme.colors.warning} />} label={t('Estimated active calories')} value={formatKcal(estimated.calories, t)} />
        <Stat styles={styles} icon={<Activity size={17} color={theme.colors.secondary} />} label={t('Estimated distance')} value={`${estimated.distanceKm} km`} />
        <Stat styles={styles} icon={<HeartPulse size={17} color={theme.colors.secondary} />} label={t('Estimated active minutes')} value={`${estimated.activeMinutes} min`} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('Update steps')}</Text>
        <Text style={styles.muted}>{t('Set the total for this date, or add steps to the saved total.')}</Text>
        <View style={styles.entryRow}>
          <TouchableOpacity
            disabled={isFuture}
            style={styles.roundBtn}
            onPress={() => { const n = Math.max(0, steps - 500); setStepInput(String(n)); onSetSteps(n).catch(() => setError(t('Could not save steps. Please try again.'))); }}
            accessibilityRole="button"
            accessibilityLabel={t('Remove 500 steps')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Minus size={18} color={theme.colors.primary} />
          </TouchableOpacity>
          <TextInput value={stepInput} onChangeText={setStepInput} keyboardType="number-pad" editable={!isFuture} style={styles.input} accessibilityLabel={t('Step count')} />
          <TouchableOpacity
            disabled={isFuture}
            style={styles.roundBtn}
            onPress={() => { const n = steps + 500; setStepInput(String(n)); onSetSteps(n).catch(() => setError(t('Could not save steps. Please try again.'))); }}
            accessibilityRole="button"
            accessibilityLabel={t('Add 500 steps')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Plus size={18} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          disabled={isFuture}
          style={styles.primaryButton}
          onPress={saveTotal}
          accessibilityRole="button"
          accessibilityLabel={t('Save total')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.primaryButtonText}>{t('Save total')}</Text>
        </TouchableOpacity>
        <View style={styles.goalRow}>
          <TextInput value={amountInput} onChangeText={setAmountInput} keyboardType="number-pad" editable={!isFuture} style={[styles.input, styles.goalInput]} accessibilityLabel={t('Steps to add')} />
          <TouchableOpacity
            disabled={isFuture}
            style={styles.outlineButton}
            onPress={addManualSteps}
            accessibilityRole="button"
            accessibilityLabel={t('Add steps')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.outlineButtonText}>{t('Add steps')}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.goalRow}>
          <Target size={17} color={theme.colors.secondary} />
          <TextInput value={goalInput} onChangeText={setGoalInput} keyboardType="number-pad" editable={!isFuture} style={[styles.input, styles.goalInput]} accessibilityLabel={t('Daily step goal')} />
          <TouchableOpacity
            disabled={isFuture}
            style={styles.outlineButton}
            onPress={saveGoal}
            accessibilityRole="button"
            accessibilityLabel={t('Save goal')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.outlineButtonText}>{t('Save goal')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        disabled={busy || isFuture}
        style={[styles.healthButton, (busy || isFuture) && { opacity: 0.55 }]}
        onPress={syncHealth}
        accessibilityRole="button"
        accessibilityLabel={busy ? t('Syncing health data…') : t('Sync Apple Health / Health Connect')}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <RefreshCw size={18} color={theme.colors.primary} />
        <Text style={styles.healthButtonText}>{busy ? t('Syncing health data…') : t('Sync Apple Health / Health Connect')}</Text>
      </TouchableOpacity>
      {healthTotal !== null && <Text style={styles.success}>{t('Health steps synced')}: {healthTotal.toLocaleString()}</Text>}
      <Text style={styles.disclaimer}>{t('Activity calories, distance, and minutes are estimates. Health sync replaces the total for this date; it does not add a duplicate.')}</Text>
      {isFuture && <Text style={styles.error}>{t('Future dates are read-only.')}</Text>}
      {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    </ScrollView>
  );
};

const Stat: React.FC<{ icon: React.ReactNode; label: string; value: string; styles: ReturnType<typeof createStyles> }> = ({ icon, label, value, styles }) => (
  <View style={styles.statRow}><View style={styles.statLabel}>{icon}<Text style={styles.statLabelText}>{label}</Text></View><Text style={styles.statValue}>{value}</Text></View>
);

const createStyles = (theme: ThemeType) =>
  StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 20, paddingBottom: 140, gap: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  back: { padding: 10, borderRadius: 24, backgroundColor: theme.colors.surface },
  eyebrow: { fontSize: 12, color: theme.colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 },
  title: { fontFamily: theme.fonts.serif, fontSize: 30, color: theme.colors.textPrimary },
  hero: { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1, borderRadius: 24, padding: 24, alignItems: 'center', ...theme.shadow.subtle },
  stepIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: theme.colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  stepNumber: { fontFamily: theme.fonts.serif, fontSize: 46, color: theme.colors.primary, fontWeight: '700' },
  muted: { color: theme.colors.textSecondary, fontSize: 14, lineHeight: 20 },
  progressTrack: { height: 12, borderRadius: 7, backgroundColor: theme.colors.background, width: '100%', overflow: 'hidden', marginTop: 22 },
  progressFill: { height: '100%', borderRadius: 7, backgroundColor: theme.colors.primary },
  goalText: { color: theme.colors.textSecondary, marginTop: 10, fontSize: 13 },
  stats: { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1, borderRadius: 18, padding: 16, gap: 14 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  statLabel: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  statLabelText: { color: theme.colors.textSecondary, fontSize: 13, flexShrink: 1 },
  statValue: { color: theme.colors.textPrimary, fontWeight: '700', fontSize: 14 },
  card: { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1, borderRadius: 18, padding: 18, gap: 12 },
  cardTitle: { fontFamily: theme.fonts.serif, color: theme.colors.textPrimary, fontWeight: '700', fontSize: 20 },
  entryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 4 },
  roundBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: theme.colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  input: { minWidth: 110, flex: 1, borderColor: theme.colors.border, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, textAlign: 'center', fontSize: 17, color: theme.colors.textPrimary, backgroundColor: theme.colors.background },
  primaryButton: { backgroundColor: theme.colors.primary, borderRadius: 14, padding: 14, alignItems: 'center' },
  primaryButtonText: { color: theme.colors.textInverted, fontWeight: '700', fontSize: 15 },
  goalRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  goalInput: { minWidth: 50, fontSize: 15 },
  outlineButton: { borderWidth: 1, borderColor: theme.colors.primary, borderRadius: 12, paddingVertical: 11, paddingHorizontal: 13 },
  outlineButtonText: { color: theme.colors.primary, fontWeight: '700', fontSize: 13 },
  healthButton: { minHeight: 52, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  healthButtonText: { color: theme.colors.primary, fontWeight: '700', fontSize: 14, textAlign: 'center', flexShrink: 1 },
  disclaimer: { color: theme.colors.textMuted, fontSize: 12, lineHeight: 18, textAlign: 'center' },
  error: { color: theme.colors.danger, fontSize: 13, textAlign: 'center' },
  success: { color: theme.colors.emeraldDark, fontSize: 13, textAlign: 'center' },
});
