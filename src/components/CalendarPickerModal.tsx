import React, { useEffect, useMemo, useState } from 'react';
import { Modal, StyleSheet, TouchableOpacity, View } from 'react-native';
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react-native';
import { AppText as Text } from './AppText';
import { useLanguage } from '../i18n/I18nContext';
import { translate } from '../i18n/strings';
import { DailyLog } from '../types';
import { loadLogsForDates } from '../storage/storage';
import { addDaysToDateString, formatDateToLocalString, getTodayDateString, parseLocalDateString } from '../utils/dateUtils';
import { theme } from '../theme';

interface CalendarPickerModalProps { visible: boolean; selectedDate: string; onClose: () => void; onSelect: (date: string) => void }

export function CalendarPickerModal({ visible, selectedDate, onClose, onSelect }: CalendarPickerModalProps) {
  const language = useLanguage();
  const t = (value: string) => translate(language, value);
  const [month, setMonth] = useState(() => {
    const date = parseLocalDateString(selectedDate);
    return new Date(date.getFullYear(), date.getMonth(), 1);
  });
  const [monthLogs, setMonthLogs] = useState<Record<string, DailyLog>>({});
  const today = getTodayDateString();
  const locale = language === 'ar' ? 'ar' : language === 'ckb' ? 'ckb-IQ' : undefined;
  const firstDate = useMemo(() => {
    const first = formatDateToLocalString(new Date(month.getFullYear(), month.getMonth(), 1));
    return addDaysToDateString(first, -new Date(month.getFullYear(), month.getMonth(), 1).getDay());
  }, [month]);
  const dates = useMemo(() => Array.from({ length: 42 }, (_, index) => addDaysToDateString(firstDate, index)), [firstDate]);

  const [prevSelectedDate, setPrevSelectedDate] = useState(selectedDate);
  const [prevVisible, setPrevVisible] = useState(visible);
  if (selectedDate !== prevSelectedDate || (visible && !prevVisible)) {
    setPrevSelectedDate(selectedDate);
    setPrevVisible(visible);
    if (visible) {
      const selected = parseLocalDateString(selectedDate);
      setMonth(new Date(selected.getFullYear(), selected.getMonth(), 1));
    }
  }

  useEffect(() => {
    if (!visible) return;
    let active = true;
    loadLogsForDates(dates).then(logs => { if (active) setMonthLogs(logs); });
    return () => { active = false; };
  }, [dates, visible]);

  const shiftMonth = (delta: number) => setMonth(current => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  const canMoveForward = month < new Date(parseLocalDateString(today).getFullYear(), parseLocalDateString(today).getMonth(), 1);
  const monthLabel = month.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => t(day));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.backdrop, { direction: language === 'en' ? 'ltr' : 'rtl' }]}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.headerIcon}><CalendarDays size={18} color={theme.colors.primary} /></View>
            <Text style={styles.title}>{t('Choose date')}</Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel={t('Close')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <View style={styles.monthRow}>
            <TouchableOpacity
              onPress={() => shiftMonth(-1)}
              style={styles.monthButton}
              accessibilityRole="button"
              accessibilityLabel={t('Previous month')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <ChevronLeft size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
            <Text style={styles.monthLabel}>{monthLabel}</Text>
            <TouchableOpacity
              onPress={() => canMoveForward && shiftMonth(1)}
              disabled={!canMoveForward}
              style={[styles.monthButton, !canMoveForward && styles.disabled]}
              accessibilityRole="button"
              accessibilityLabel={t('Next month')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <ChevronRight size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <View style={styles.grid}>
            {weekdayLabels.map((day, index) => <Text key={`weekday_${index}`} style={styles.weekday}>{day}</Text>)}
            {dates.map(date => {
              const parsed = parseLocalDateString(date);
              const inMonth = parsed.getMonth() === month.getMonth();
              const future = date > today;
              const selected = date === selectedDate;
              const hasLog = Boolean(monthLogs[date]?.meals?.length || monthLogs[date]?.waterGlasses || monthLogs[date]?.supplements?.length || monthLogs[date]?.steps);
              return (
                <TouchableOpacity
                  key={date}
                  style={[styles.dayCell, selected && styles.daySelected, !inMonth && styles.outsideMonth, future && styles.disabled]}
                  disabled={!inMonth || future}
                  onPress={() => { onSelect(date); onClose(); }}
                  accessibilityRole="button"
                  accessibilityLabel={`${date}${hasLog ? `, ${t('logged')}` : ''}`}
                  accessibilityState={{ selected, disabled: !inMonth || future }}
                >
                  <Text style={[styles.dayNumber, selected && styles.dayNumberSelected, future && styles.dayNumberFuture]}>{parsed.getDate()}</Text>
                  {hasLog && <View style={[styles.logDot, selected && styles.logDotSelected]} />}
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={styles.legend}><View style={styles.logDot} /><Text style={styles.legendText}>{t('Day with activity')}</Text><View style={styles.legendSpacer} /><Text style={styles.legendText}>{t('Future dates are unavailable')}</Text></View>
          <TouchableOpacity
            style={styles.todayButton}
            onPress={() => { onSelect(today); onClose(); }}
            accessibilityRole="button"
            accessibilityLabel={t('Today')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.todayButtonText}>{t('Today')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: theme.colors.backdrop, justifyContent: 'center', padding: 18 },
  sheet: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.xl, borderWidth: 1, borderColor: theme.colors.border, padding: 16, ...theme.shadow.floating },
  header: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 10 },
  headerIcon: { width: 34, height: 34, borderRadius: 12, backgroundColor: theme.colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontFamily: theme.fonts.serif, color: theme.colors.textPrimary, fontSize: 20, fontWeight: '700' },
  closeButton: { padding: 5 },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  monthButton: { padding: 8 },
  disabled: { opacity: 0.35 },
  monthLabel: { color: theme.colors.textPrimary, fontSize: 15, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  weekday: { width: `${100 / 7}%`, textAlign: 'center', color: theme.colors.textMuted, fontSize: 10, fontWeight: '700', paddingVertical: 8 },
  dayCell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 16, marginVertical: 1 },
  outsideMonth: { opacity: 0 },
  daySelected: { backgroundColor: theme.colors.primary },
  dayNumber: { color: theme.colors.textPrimary, fontSize: 13, fontWeight: '600' },
  dayNumberSelected: { color: theme.colors.textInverted },
  dayNumberFuture: { color: theme.colors.textMuted },
  logDot: { width: 4, height: 4, borderRadius: 2, marginTop: 2, backgroundColor: theme.colors.accent },
  logDotSelected: { backgroundColor: theme.colors.textInverted },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, marginBottom: 12 },
  legendText: { color: theme.colors.textMuted, fontSize: 9 },
  legendSpacer: { width: 4 },
  todayButton: { borderRadius: theme.radius.md, backgroundColor: theme.colors.primaryLight, alignItems: 'center', paddingVertical: 11 },
  todayButtonText: { color: theme.colors.primary, fontSize: 13, fontWeight: '700' },
});
