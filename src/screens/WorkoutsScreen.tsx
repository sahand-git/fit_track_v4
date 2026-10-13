import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { Activity, ArrowLeft, ChevronLeft, ChevronRight, Dumbbell, Plus, Search, Trash2 } from 'lucide-react-native';
import { AppText as Text } from '../components/AppText';
import { AddWorkoutSheet } from '../components/AddWorkoutSheet';
import { WorkoutEntry, UserProfile, ExerciseCategory } from '../types';
import { useLanguage } from '../i18n/I18nContext';
import { translate } from '../i18n/strings';
import { theme } from '../theme';
import { addDaysToDateString, formatDisplayDate, getTodayDateString } from '../utils/dateUtils';

interface Props {
  date: string;
  workouts: WorkoutEntry[];
  profile: UserProfile;
  onSelectDate: (date: string) => void;
  onAddWorkout: (workout: WorkoutEntry, date: string) => void;
  onUpdateWorkout: (workout: WorkoutEntry, date: string) => void;
  onDeleteWorkout: (workoutId: string) => void;
  onBack: () => void;
}

const categories: (ExerciseCategory | 'all')[] = ['all', 'strength', 'cardio', 'hiit', 'sports', 'flexibility'];

export const WorkoutsScreen: React.FC<Props> = ({ date, workouts, profile, onSelectDate, onAddWorkout, onUpdateWorkout, onDeleteWorkout, onBack }) => {
  const language = useLanguage();
  const t = (value: string) => translate(language, value);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<ExerciseCategory | 'all'>('all');
  const [sheetVisible, setSheetVisible] = useState(false);
  const [editing, setEditing] = useState<WorkoutEntry | null>(null);
  const future = date > getTodayDateString();
  const visibleWorkouts = useMemo(() => workouts.filter((workout) =>
    (category === 'all' || workout.category === category) && workout.name.toLowerCase().includes(query.trim().toLowerCase()),
  ), [workouts, category, query]);
  const totalMinutes = visibleWorkouts.reduce((total, workout) => total + workout.durationMinutes, 0);
  const totalKcal = visibleWorkouts.reduce((total, workout) => total + workout.caloriesBurned, 0);

  const openEdit = (workout: WorkoutEntry) => { setEditing(workout); setSheetVisible(true); };
  const closeSheet = () => { setSheetVisible(false); setEditing(null); };
  const askDelete = (workoutId: string) => Alert.alert(t('Delete workout'), t('Are you sure you want to delete this workout?'), [
    { text: t('Cancel'), style: 'cancel' },
    { text: t('Delete'), style: 'destructive', onPress: () => onDeleteWorkout(workoutId) },
  ]);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.back} accessibilityLabel={t('Back')} accessibilityRole="button"><ArrowLeft size={19} color={theme.colors.textPrimary} /></TouchableOpacity>
          <View style={{ flex: 1 }}><Text style={styles.eyebrow}>{t('Activity history')}</Text><Text style={styles.title}>{t('Workouts')}</Text></View>
          <Dumbbell size={24} color={theme.colors.primary} />
        </View>
        <View style={styles.dateCard}>
          <TouchableOpacity onPress={() => onSelectDate(addDaysToDateString(date, -1))} style={styles.dateArrow} accessibilityLabel={t('Previous day')}><ChevronLeft size={20} color={theme.colors.primary} /></TouchableOpacity>
          <Text style={styles.dateText}>{formatDisplayDate(date, language)}</Text>
          <TouchableOpacity disabled={future} onPress={() => onSelectDate(addDaysToDateString(date, 1))} style={[styles.dateArrow, future && { opacity: 0.35 }]} accessibilityLabel={t('Next day')}><ChevronRight size={20} color={theme.colors.primary} /></TouchableOpacity>
        </View>
        <View style={styles.summary}>
          <Summary label={t('Workouts')} value={String(visibleWorkouts.length)} />
          <View style={styles.divider} />
          <Summary label={t('Duration')} value={`${totalMinutes} ${t('min')}`} />
          <View style={styles.divider} />
          <Summary label={t('Estimated burn')} value={`${totalKcal} kcal`} />
        </View>
        <View style={styles.search}><Search size={17} color={theme.colors.textMuted} /><TextInput value={query} onChangeText={setQuery} placeholder={t('Search workouts')} placeholderTextColor={theme.colors.textMuted} style={styles.searchInput} accessibilityLabel={t('Search workouts')} /></View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {categories.map((item) => <TouchableOpacity key={item} onPress={() => setCategory(item)} style={[styles.filter, category === item && styles.filterActive]}><Text style={[styles.filterText, category === item && styles.filterTextActive]}>{t(item === 'all' ? 'All' : item[0].toUpperCase() + item.slice(1))}</Text></TouchableOpacity>)}
        </ScrollView>
        {visibleWorkouts.length === 0 ? (
          <View style={styles.empty}><Activity size={26} color={theme.colors.secondary} /><Text style={styles.emptyTitle}>{t('No workouts for this day')}</Text><Text style={styles.emptyText}>{t('Log exercise to build your activity history.')}</Text></View>
        ) : visibleWorkouts.map((workout) => (
          <TouchableOpacity key={workout.id} style={styles.workoutCard} onPress={() => openEdit(workout)} activeOpacity={0.75} accessibilityRole="button" accessibilityLabel={`${t('Edit workout')}: ${t(workout.name)}`}>
            <View style={styles.workoutIcon}><Dumbbell size={19} color={theme.colors.primary} /></View>
            <View style={styles.workoutInfo}>
              <Text style={styles.workoutName}>{t(workout.name)}</Text>
              <Text style={styles.workoutMeta}>{t(workout.category[0].toUpperCase() + workout.category.slice(1))} · {workout.durationMinutes} {t('min')} · {workout.caloriesBurned} kcal {workout.calorieSource === 'met_estimate' ? `· ${t('Estimate')}` : ''}</Text>
              {workout.sets?.length ? <Text style={styles.workoutMeta}>{workout.sets.length} {t('sets')} · {workout.sets.filter((set) => set.completed).length} {t('completed')}</Text> : null}
            </View>
            <TouchableOpacity onPress={() => askDelete(workout.id)} style={styles.delete} accessibilityLabel={t('Delete workout')}><Trash2 size={17} color={theme.colors.textMuted} /></TouchableOpacity>
          </TouchableOpacity>
        ))}
      </ScrollView>
      {!future && <TouchableOpacity style={styles.addButton} onPress={() => { setEditing(null); setSheetVisible(true); }} accessibilityRole="button"><Plus size={18} color={theme.colors.textInverted} /><Text style={styles.addButtonText}>{t('Add workout')}</Text></TouchableOpacity>}
      {sheetVisible && <AddWorkoutSheet visible onClose={closeSheet} date={date} profile={profile} onSaveWorkout={onAddWorkout} editingWorkout={editing} onUpdateWorkout={onUpdateWorkout} />}
    </View>
  );
};

const Summary: React.FC<{ label: string; value: string }> = ({ label, value }) => <View style={styles.summaryItem}><Text style={styles.summaryValue}>{value}</Text><Text style={styles.summaryLabel}>{label}</Text></View>;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background }, content: { padding: 18, paddingBottom: 150, gap: 14 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 }, back: { padding: 10, borderRadius: 24, backgroundColor: theme.colors.surface },
  eyebrow: { color: theme.colors.textMuted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }, title: { fontFamily: theme.fonts.serif, color: theme.colors.textPrimary, fontSize: 29 },
  dateCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 10, backgroundColor: theme.colors.surface, borderRadius: 15, borderWidth: 1, borderColor: theme.colors.border }, dateArrow: { padding: 8 }, dateText: { color: theme.colors.textPrimary, fontWeight: '700', fontSize: 15 },
  summary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingVertical: 16, backgroundColor: theme.colors.surface, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border }, summaryItem: { flex: 1, alignItems: 'center', gap: 4 }, summaryValue: { fontWeight: '700', color: theme.colors.primary, fontSize: 15 }, summaryLabel: { color: theme.colors.textMuted, fontSize: 11, textAlign: 'center' }, divider: { width: 1, height: 30, backgroundColor: theme.colors.border },
  search: { flexDirection: 'row', gap: 8, alignItems: 'center', paddingHorizontal: 12, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 13, backgroundColor: theme.colors.surface }, searchInput: { flex: 1, paddingVertical: 12, color: theme.colors.textPrimary, fontSize: 14 }, filters: { gap: 8 }, filter: { borderWidth: 1, borderColor: theme.colors.border, paddingHorizontal: 13, paddingVertical: 8, borderRadius: 20, backgroundColor: theme.colors.surface }, filterActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }, filterText: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: '600' }, filterTextActive: { color: theme.colors.textInverted },
  workoutCard: { flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: theme.colors.surface, padding: 14, borderRadius: 15, borderWidth: 1, borderColor: theme.colors.border }, workoutIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.primaryLight, alignItems: 'center', justifyContent: 'center' }, workoutInfo: { flex: 1, gap: 4 }, workoutName: { fontWeight: '700', color: theme.colors.textPrimary, fontSize: 15 }, workoutMeta: { color: theme.colors.textMuted, fontSize: 12, lineHeight: 17 }, delete: { padding: 8 },
  empty: { alignItems: 'center', padding: 28, borderRadius: 17, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, gap: 8 }, emptyTitle: { fontFamily: theme.fonts.serif, color: theme.colors.textPrimary, fontSize: 20, fontWeight: '700', textAlign: 'center' }, emptyText: { color: theme.colors.textMuted, fontSize: 13, textAlign: 'center' }, addButton: { position: 'absolute', bottom: 18, alignSelf: 'center', paddingHorizontal: 22, paddingVertical: 14, borderRadius: 24, backgroundColor: theme.colors.primary, flexDirection: 'row', alignItems: 'center', gap: 8, ...theme.shadow.floating }, addButtonText: { color: theme.colors.textInverted, fontWeight: '700', fontSize: 15 },
});
