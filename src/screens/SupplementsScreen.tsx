import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { ArrowLeft, Check, CheckCircle2, Circle, Clock3, Edit3, Pill, Plus, Trash2, X } from 'lucide-react-native';
import { SupplementCategory, SupplementCheck, SupplementRoutineItem, SupplementTime } from '../types';
import { AppText as Text } from '../components/AppText';
import { translate } from '../i18n/strings';
import { useLanguage } from '../i18n/I18nContext';
import { formatDisplayDate, getTodayDateString } from '../utils/dateUtils';
import { getSupplementProgress } from '../utils/supplementUtils';
import { createUniqueId } from '../utils/idUtils';
import { theme } from '../theme';

interface SupplementsScreenProps {
  selectedDate: string;
  routine: SupplementRoutineItem[];
  checks: SupplementCheck[];
  onAdd: (item: SupplementRoutineItem) => void;
  onUpdate: (item: SupplementRoutineItem) => void;
  onRemove: (id: string) => void;
  onToggle: (id: string, taken: boolean) => void;
  onBack?: () => void;
}

const timeOptions: SupplementTime[] = ['morning', 'afternoon', 'evening', 'bedtime'];
const categoryOptions: SupplementCategory[] = ['vitamin', 'mineral', 'supplement', 'other'];
const timeLabels: Record<SupplementTime, string> = { morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening', bedtime: 'Bedtime' };
const categoryLabels: Record<SupplementCategory, string> = { vitamin: 'Vitamin', mineral: 'Mineral', supplement: 'Supplement', other: 'Other' };

export function SupplementsScreen({ selectedDate, routine, checks, onAdd, onUpdate, onRemove, onToggle, onBack }: SupplementsScreenProps) {
  const language = useLanguage();
  const [name, setName] = useState('');
  const [dose, setDose] = useState('');
  const [time, setTime] = useState<SupplementTime>('morning');
  const [category, setCategory] = useState<SupplementCategory>('vitamin');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const takenIds = useMemo(() => new Set(checks.filter(check => check.taken).map(check => check.itemId)), [checks]);
  const progress = useMemo(() => getSupplementProgress(routine, checks), [routine, checks]);
  const t = (value: string) => translate(language, value);
  const isFuture = selectedDate > getTodayDateString();

  const resetForm = () => {
    setName('');
    setDose('');
    setTime('morning');
    setCategory('vitamin');
    setEditingId(null);
    setFormOpen(false);
  };

  const openEdit = (item: SupplementRoutineItem) => {
    setName(item.name);
    setDose(item.dose);
    setTime(item.time);
    setCategory(item.category || 'other');
    setEditingId(item.id);
    setFormOpen(true);
  };

  const saveItem = () => {
    const cleanName = name.trim();
    if (!cleanName || isFuture) return;
    const item: SupplementRoutineItem = {
      id: editingId || createUniqueId('supp'),
      name: cleanName,
      dose: dose.trim(),
      time,
      category,
    };
    if (editingId) onUpdate(item);
    else onAdd(item);
    resetForm();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        {onBack ? (
          <TouchableOpacity onPress={onBack} style={styles.backButton} accessibilityRole="button" accessibilityLabel={t('Back to Today')}>
            <ArrowLeft size={20} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        ) : null}
        <View style={styles.icon}><Pill size={19} color={theme.colors.primary} /></View>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>Daily routine</Text>
          <Text style={styles.title}>Vitamins & supplements</Text>
          <Text style={styles.subtitle}>{formatDisplayDate(selectedDate, language)}</Text>
        </View>
      </View>

      <View style={styles.progressCard}>
        <View style={styles.progressHeader}>
          <View>
            <Text style={styles.progressTitle}>Today’s progress</Text>
            <Text style={styles.progressCaption}>{progress.completed} {t('of')} {progress.scheduled} {t('scheduled')}</Text>
          </View>
          <View style={styles.progressBadge}><Text style={styles.progressPercent}>{progress.percentage}%</Text></View>
        </View>
        <View style={styles.progressTrack} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: progress.percentage }}>
          <View style={[styles.progressFill, { width: `${progress.percentage}%` }]} />
        </View>
        <View style={styles.statRow}>
          <ProgressStat value={progress.scheduled} label="Scheduled" />
          <ProgressStat value={progress.completed} label="Taken" />
          <ProgressStat value={progress.pending} label="Pending" />
        </View>
      </View>

      <View style={styles.notice}>
        <Text style={styles.noticeText}>Tracking only — this app does not recommend supplements or doses.</Text>
      </View>

      {isFuture ? (
        <View style={styles.futureNotice}>
          <Clock3 size={17} color={theme.colors.textMuted} />
          <Text style={styles.futureText}>Future dates are read-only.</Text>
        </View>
      ) : null}

      <View style={styles.sectionHeadingRow}>
        <View>
          <Text style={styles.sectionTitle}>My supplement routine</Text>
          <Text style={styles.sectionCaption}>{t('Organized by time of day')}</Text>
        </View>
        <TouchableOpacity
          style={[styles.addTopButton, isFuture && styles.disabled]}
          onPress={() => { resetForm(); setFormOpen(true); }}
          disabled={isFuture}
          accessibilityRole="button"
          accessibilityLabel={t('Add supplement')}
        >
          <Plus size={16} color={theme.colors.textInverted} /><Text style={styles.addTopText}>Add</Text>
        </TouchableOpacity>
      </View>

      {formOpen ? (
        <View style={styles.formCard}>
          <View style={styles.formTitleRow}>
            <Text style={styles.formTitle}>{editingId ? t('Edit supplement') : t('Add supplement')}</Text>
            <TouchableOpacity onPress={resetForm} style={styles.closeButton} accessibilityRole="button" accessibilityLabel={t('Close')}>
              <X size={19} color={theme.colors.textMuted} />
            </TouchableOpacity>
          </View>
          <Text style={styles.fieldLabel}>Name</Text>
          <TextInput value={name} onChangeText={setName} placeholder={t('Supplement name')} placeholderTextColor={theme.colors.textMuted} style={styles.input} returnKeyType="next" accessibilityLabel={t('Supplement name')} />
          <Text style={styles.fieldLabel}>Type</Text>
          <View style={styles.chipRow}>
            {categoryOptions.map(option => (
              <TouchableOpacity key={option} onPress={() => setCategory(option)} style={[styles.chip, category === option && styles.chipSelected]} accessibilityRole="radio" accessibilityState={{ selected: category === option }}>
                <Text style={[styles.chipText, category === option && styles.chipTextSelected]}>{categoryLabels[option]}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.fieldLabel}>Dose / serving (optional)</Text>
          <TextInput value={dose} onChangeText={setDose} placeholder={t('Enter the dose from your own label or clinician')} placeholderTextColor={theme.colors.textMuted} style={styles.input} returnKeyType="done" accessibilityLabel={t('Dose / serving')} />
          <Text style={styles.helperText}>Enter the amount printed on your product label or given by your clinician.</Text>
          <Text style={styles.fieldLabel}>Time of day</Text>
          <View style={styles.chipRow}>
            {timeOptions.map(option => (
              <TouchableOpacity key={option} onPress={() => setTime(option)} style={[styles.chip, time === option && styles.chipSelected]} accessibilityRole="radio" accessibilityState={{ selected: time === option }}>
                <Text style={[styles.chipText, time === option && styles.chipTextSelected]}>{timeLabels[option]}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={[styles.saveButton, !name.trim() && styles.disabled]} onPress={saveItem} disabled={!name.trim()} accessibilityRole="button">
            <Check size={17} color={theme.colors.textInverted} /><Text style={styles.saveButtonText}>{editingId ? t('Save changes') : t('Add to routine')}</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {timeOptions.map(slot => {
        const items = routine.filter(item => item.time === slot);
        return (
          <View key={slot} style={styles.group}>
            <View style={styles.groupHeader}>
              <Text style={styles.groupTitle}>{timeLabels[slot]}</Text>
              <Text style={styles.groupCount}>{items.length}</Text>
            </View>
            {items.length === 0 ? (
              <View style={styles.emptySlot}><Text style={styles.emptySlotText}>{t('Nothing scheduled for this time')}</Text></View>
            ) : items.map(item => {
              const taken = takenIds.has(item.id);
              const categoryLabel = categoryLabels[item.category || 'other'];
              return (
                <View key={item.id} style={[styles.routineRow, taken && styles.routineRowTaken]}>
                  <TouchableOpacity onPress={() => onToggle(item.id, !taken)} disabled={isFuture} style={styles.checkButton} accessibilityLabel={t(taken ? 'Taken' : 'Mark as taken')} accessibilityRole="checkbox" accessibilityState={{ checked: taken, disabled: isFuture }}>
                    {taken ? <CheckCircle2 size={23} color={theme.colors.primary} /> : <Circle size={23} color={theme.colors.textMuted} />}
                  </TouchableOpacity>
                  <View style={styles.itemCopy}>
                    <Text style={[styles.itemName, taken && styles.itemNameTaken]}>{item.name}</Text>
                    <View style={styles.itemMeta}>
                      <Text style={styles.categoryTag}>{t(categoryLabel)}</Text>
                      {item.dose ? <Text style={styles.itemDose}>{item.dose}</Text> : null}
                    </View>
                    <Text style={[styles.statusText, taken && styles.statusTaken]}>{taken ? t('Taken today') : t('Still to take')}</Text>
                  </View>
                  <View style={styles.itemActions}>
                    <TouchableOpacity onPress={() => openEdit(item)} disabled={isFuture} style={styles.iconAction} accessibilityRole="button" accessibilityLabel={`${t('Edit')} ${item.name}`}>
                      <Edit3 size={17} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => onRemove(item.id)} disabled={isFuture} style={styles.iconAction} accessibilityRole="button" accessibilityLabel={`${t('Delete')} ${item.name}`}>
                      <Trash2 size={17} color={theme.colors.danger} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        );
      })}
    </ScrollView>
  );
}

function ProgressStat({ value, label }: { value: number; label: string }) {
  const language = useLanguage();
  return <View style={styles.stat}><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{translate(language, label)}</Text></View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.md, paddingBottom: 148, gap: 14 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 2 },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: theme.radius.full, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border },
  icon: { width: 42, height: 42, borderRadius: 15, backgroundColor: theme.colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1 },
  eyebrow: { color: theme.colors.secondary, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  title: { fontFamily: theme.fonts.serif, fontSize: 22, color: theme.colors.textPrimary, fontWeight: '700' },
  subtitle: { color: theme.colors.textMuted, fontSize: 12, marginTop: 2 },
  progressCard: { backgroundColor: theme.colors.primary, borderRadius: theme.radius.xl, padding: 17, gap: 14, ...theme.shadow.subtle },
  progressHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  progressTitle: { color: theme.colors.textInverted, fontSize: 16, fontWeight: '700' },
  progressCaption: { color: 'rgba(255,255,255,0.76)', fontSize: 12, marginTop: 3 },
  progressBadge: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 24, borderWidth: 2, borderColor: 'rgba(255,255,255,0.65)' },
  progressPercent: { color: theme.colors.textInverted, fontWeight: '800', fontSize: 13 },
  progressTrack: { height: 7, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.24)', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 5, backgroundColor: theme.colors.textInverted },
  statRow: { flexDirection: 'row', justifyContent: 'space-between' },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statValue: { color: theme.colors.textInverted, fontSize: 17, fontWeight: '800' },
  statLabel: { color: 'rgba(255,255,255,0.76)', fontSize: 11 },
  notice: { borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.primaryBorder, backgroundColor: theme.colors.primaryLight, padding: 12 },
  noticeText: { color: theme.colors.textSecondary, fontSize: 12, lineHeight: 18 },
  futureNotice: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4 },
  futureText: { color: theme.colors.textMuted, fontSize: 12 },
  sectionHeadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 3 },
  sectionTitle: { fontFamily: theme.fonts.serif, color: theme.colors.textPrimary, fontSize: 19, fontWeight: '700' },
  sectionCaption: { color: theme.colors.textMuted, fontSize: 11, marginTop: 2 },
  addTopButton: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: theme.radius.full, paddingHorizontal: 14, backgroundColor: theme.colors.primary },
  addTopText: { color: theme.colors.textInverted, fontWeight: '700', fontSize: 13 },
  formCard: { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1, borderRadius: theme.radius.lg, padding: 14, gap: 10, ...theme.shadow.subtle },
  formTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  formTitle: { color: theme.colors.textPrimary, fontSize: 16, fontWeight: '700' },
  closeButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  fieldLabel: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: '600' },
  input: { backgroundColor: theme.colors.surfaceSubtle, borderColor: theme.colors.border, borderWidth: 1, borderRadius: theme.radius.md, paddingHorizontal: 12, paddingVertical: 11, color: theme.colors.textPrimary, fontSize: 14 },
  helperText: { color: theme.colors.textMuted, fontSize: 11, lineHeight: 16 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: { minHeight: 38, justifyContent: 'center', borderColor: theme.colors.border, borderWidth: 1, borderRadius: theme.radius.full, paddingHorizontal: 12, backgroundColor: theme.colors.surface },
  chipSelected: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight },
  chipText: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: '600' },
  chipTextSelected: { color: theme.colors.primary },
  saveButton: { minHeight: 46, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, borderRadius: theme.radius.md, paddingVertical: 11, backgroundColor: theme.colors.primary },
  saveButtonText: { color: theme.colors.textInverted, fontWeight: '700', fontSize: 14 },
  group: { gap: 8 },
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 3 },
  groupTitle: { color: theme.colors.secondary, fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6 },
  groupCount: { color: theme.colors.textMuted, fontSize: 11, fontWeight: '600' },
  emptySlot: { borderWidth: 1, borderColor: theme.colors.border, borderStyle: 'dashed', backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, padding: 12 },
  emptySlotText: { color: theme.colors.textMuted, fontSize: 12 },
  routineRow: { flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md, padding: 10, minHeight: 76 },
  routineRowTaken: { borderColor: theme.colors.primaryBorder },
  checkButton: { width: 42, height: 44, alignItems: 'center', justifyContent: 'center' },
  itemCopy: { flex: 1, minWidth: 0, gap: 4 },
  itemName: { color: theme.colors.textPrimary, fontSize: 14, fontWeight: '700' },
  itemNameTaken: { color: theme.colors.textMuted },
  itemMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  categoryTag: { color: theme.colors.primary, backgroundColor: theme.colors.primaryLight, overflow: 'hidden', borderRadius: theme.radius.full, paddingHorizontal: 7, paddingVertical: 2, fontSize: 10, fontWeight: '700' },
  itemDose: { color: theme.colors.textMuted, fontSize: 11 },
  statusText: { color: theme.colors.textMuted, fontSize: 10 },
  statusTaken: { color: theme.colors.primary, fontWeight: '700' },
  itemActions: { flexDirection: 'row', alignItems: 'center' },
  iconAction: { width: 38, height: 42, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.45 },
});
