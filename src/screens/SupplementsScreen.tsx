import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { CheckCircle2, Circle, Pill, Plus, Trash2, ArrowLeft } from 'lucide-react-native';
import { SupplementCheck, SupplementRoutineItem, SupplementTime } from '../types';
import { AppText as Text } from '../components/AppText';
import { translate } from '../i18n/strings';
import { useLanguage } from '../i18n/I18nContext';
import { formatDisplayDate, getTodayDateString } from '../utils/dateUtils';
import { theme } from '../theme';

interface SupplementsScreenProps {
  selectedDate: string;
  routine: SupplementRoutineItem[];
  checks: SupplementCheck[];
  onAdd: (item: SupplementRoutineItem) => void;
  onRemove: (id: string) => void;
  onToggle: (id: string, taken: boolean) => void;
  onBack?: () => void;
}

const timeOptions: SupplementTime[] = ['morning', 'afternoon', 'evening', 'bedtime'];
const timeLabels: Record<SupplementTime, string> = { morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening', bedtime: 'Bedtime' };

export function SupplementsScreen({ selectedDate, routine, checks, onAdd, onRemove, onToggle, onBack }: SupplementsScreenProps) {
  const language = useLanguage();
  const [name, setName] = useState('');
  const [dose, setDose] = useState('');
  const [time, setTime] = useState<SupplementTime>('morning');
  const takenIds = useMemo(() => new Set(checks.filter(check => check.taken).map(check => check.itemId)), [checks]);
  const t = (value: string) => translate(language, value);
  const isFuture = selectedDate > getTodayDateString();

  const addItem = () => {
    const cleanName = name.trim();
    if (!cleanName) return;
    onAdd({ id: `supp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, name: cleanName, dose: dose.trim(), time });
    setName('');
    setDose('');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={{ padding: 6, marginRight: 6 }} accessibilityLabel={t('Back')}>
            <ArrowLeft size={20} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        )}
        <View style={styles.icon}><Pill size={19} color={theme.colors.primary} /></View>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Vitamins & supplements</Text>
          <Text style={styles.subtitle}>{formatDisplayDate(selectedDate, language)}</Text>
        </View>
        <Text style={styles.count}>{takenIds.size}/{routine.length}</Text>
      </View>

      <View style={styles.notice}>
        <Text style={styles.noticeText}>Tracking only — this app does not recommend supplements or doses.</Text>
      </View>

      <View style={styles.addCard}>
        <Text style={styles.sectionTitle}>Add supplement</Text>
        <TextInput value={name} onChangeText={setName} placeholder={t('Supplement name')} placeholderTextColor={theme.colors.textMuted} style={styles.input} returnKeyType="next" />
        <TextInput value={dose} onChangeText={setDose} placeholder={t('Dose / serving')} placeholderTextColor={theme.colors.textMuted} style={styles.input} returnKeyType="done" />
        <Text style={styles.fieldLabel}>Time of day</Text>
        <View style={styles.timeRow}>
          {timeOptions.map(option => (
            <TouchableOpacity key={option} onPress={() => setTime(option)} style={[styles.timeChip, time === option && styles.timeChipActive]} accessibilityRole="button">
              <Text style={[styles.timeText, time === option && styles.timeTextActive]}>{timeLabels[option]}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={[styles.addButton, !name.trim() && styles.addButtonDisabled]} onPress={addItem} disabled={!name.trim()} accessibilityRole="button">
          <Plus size={17} color={theme.colors.textInverted} /><Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>My supplement routine</Text>
      {routine.length === 0 ? (
        <View style={styles.empty}>
          <Pill size={22} color={theme.colors.secondary} />
          <Text style={styles.emptyText}>No supplements added yet. Add items you already take to build your checklist.</Text>
        </View>
      ) : timeOptions.map(slot => {
        const items = routine.filter(item => item.time === slot);
        if (!items.length) return null;
        return (
          <View key={slot} style={styles.group}>
            <Text style={styles.groupTitle}>{timeLabels[slot]}</Text>
            {items.map(item => {
              const taken = takenIds.has(item.id);
              return (
                <View key={item.id} style={styles.routineRow}>
                  <TouchableOpacity onPress={() => onToggle(item.id, !taken)} disabled={isFuture} style={[styles.checkButton, isFuture && styles.disabled]} accessibilityLabel={t(taken ? 'Taken' : 'Mark as taken')} accessibilityRole="checkbox" accessibilityState={{ checked: taken, disabled: isFuture }}>
                    {taken ? <CheckCircle2 size={22} color={theme.colors.primary} /> : <Circle size={22} color={theme.colors.textMuted} />}
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => onToggle(item.id, !taken)} disabled={isFuture} style={[styles.itemCopy, isFuture && styles.disabled]}>
                    <Text style={[styles.itemName, taken && styles.itemNameTaken]}>{item.name}</Text>
                    {item.dose ? <Text style={styles.itemDose}>{item.dose}</Text> : null}
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => onRemove(item.id)} style={styles.deleteButton} accessibilityLabel={`${t('Delete')} ${item.name}`}>
                    <Trash2 size={17} color={theme.colors.danger} />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.md, paddingBottom: 112, gap: 14 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 2 },
  icon: { width: 42, height: 42, borderRadius: 15, backgroundColor: theme.colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1 },
  title: { fontFamily: theme.fonts.serif, fontSize: 23, color: theme.colors.textPrimary, fontWeight: '700' },
  subtitle: { color: theme.colors.textMuted, fontSize: 12, marginTop: 2 },
  count: { color: theme.colors.primary, fontWeight: '700', fontSize: 14 },
  notice: { borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.primaryBorder, backgroundColor: theme.colors.primaryLight, padding: 12 },
  noticeText: { color: theme.colors.textSecondary, fontSize: 12, lineHeight: 18 },
  addCard: { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1, borderRadius: theme.radius.lg, padding: 14, gap: 10, ...theme.shadow.subtle },
  sectionTitle: { fontFamily: theme.fonts.serif, color: theme.colors.textPrimary, fontSize: 18, fontWeight: '700', marginTop: 2 },
  input: { backgroundColor: theme.colors.surfaceSubtle, borderColor: theme.colors.border, borderWidth: 1, borderRadius: theme.radius.md, paddingHorizontal: 12, paddingVertical: 11, color: theme.colors.textPrimary, fontSize: 14 },
  fieldLabel: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: '600' },
  timeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  timeChip: { borderColor: theme.colors.border, borderWidth: 1, borderRadius: theme.radius.full, paddingHorizontal: 11, paddingVertical: 7, backgroundColor: theme.colors.surface },
  timeChipActive: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight },
  timeText: { color: theme.colors.textSecondary, fontSize: 11, fontWeight: '600' },
  timeTextActive: { color: theme.colors.primary },
  addButton: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 7, borderRadius: theme.radius.md, paddingVertical: 11, backgroundColor: theme.colors.primary },
  addButtonDisabled: { opacity: 0.5 },
  addButtonText: { color: theme.colors.textInverted, fontWeight: '700', fontSize: 14 },
  empty: { alignItems: 'center', gap: 10, padding: 24, backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, borderColor: theme.colors.border, borderWidth: 1 },
  emptyText: { color: theme.colors.textMuted, fontSize: 13, lineHeight: 19, textAlign: 'center' },
  group: { gap: 7 },
  groupTitle: { color: theme.colors.secondary, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  routineRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md, padding: 12 },
  checkButton: { padding: 2 },
  itemCopy: { flex: 1 },
  itemName: { color: theme.colors.textPrimary, fontSize: 14, fontWeight: '700' },
  itemNameTaken: { color: theme.colors.textMuted, textDecorationLine: 'line-through' },
  itemDose: { color: theme.colors.textMuted, fontSize: 12, marginTop: 3 },
  deleteButton: { padding: 5 },
  disabled: { opacity: 0.55 },
});
