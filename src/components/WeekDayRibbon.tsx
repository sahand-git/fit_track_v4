import React, { useMemo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { AppText as Text } from './AppText';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useLanguage } from '../i18n/I18nContext';
import { translate } from '../i18n/strings';
import { useTheme } from '../theme/ThemeContext';
import { ThemeType } from '../theme';
import { useIsRTL } from '../hooks/useIsRTL';
import * as Haptics from 'expo-haptics';
import { AnimatedPressable } from './AnimatedPressable';
import {
  getTodayDateString,
  parseLocalDateString,
  formatDateToLocalString,
  addDaysToDateString,
} from '../utils/dateUtils';

interface WeekDayRibbonProps {
  selectedDate: string;
  onSelectDate: (dateStr: string) => void;
  onOpenDatePicker?: () => void;
}

const SHORT_DAY_NAMES: Record<string, string[]> = {
  en: ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
  ar: ['أحد', 'إثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت'],
  ckb: ['یەک', 'دوو', 'سێ', 'چوار', 'پێنج', 'هەینی', 'شەم'],
};

const FULL_DAY_KEYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

export const WeekDayRibbon: React.FC<WeekDayRibbonProps> = ({
  selectedDate,
  onSelectDate,
  onOpenDatePicker,
}) => {
  const language = useLanguage();
  const { theme } = useTheme();
  const isRtl = useIsRTL();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const t = useCallback((key: string) => translate(language, key), [language]);

  const todayStr = useMemo(() => getTodayDateString(), []);
  const activeDate = selectedDate || todayStr;

  // In Arabic and Kurdish, week starts on Saturday (day 6). In English, on Sunday (day 0).
  const weekStartDay = (language === 'ar' || language === 'ckb') ? 6 : 0;

  // Generate the 7 days of the calendar week containing activeDate
  const weekDates = useMemo(() => {
    const target = parseLocalDateString(activeDate);
    const dayOfWeek = target.getDay(); // 0 = Sun ... 6 = Sat
    const diff = (dayOfWeek - weekStartDay + 7) % 7;
    const start = new Date(target);
    start.setDate(target.getDate() - diff);

    const list: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      list.push(formatDateToLocalString(d));
    }
    return list;
  }, [activeDate, weekStartDay]);

  const isCurrentWeek = useMemo(() => {
    return weekDates.includes(todayStr);
  }, [weekDates, todayStr]);

  const handleSelect = (dateStr: string) => {
    if (dateStr === selectedDate || dateStr > todayStr) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onSelectDate(dateStr);
  };

  const handlePrevWeek = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const newDate = addDaysToDateString(activeDate, -7);
    onSelectDate(newDate);
  };

  const handleNextWeek = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const candidate = addDaysToDateString(activeDate, 7);
    // Do not jump past today
    const finalDate = candidate > todayStr ? todayStr : candidate;
    onSelectDate(finalDate);
  };

  const handleJumpToToday = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onSelectDate(todayStr);
  };

  const dayAbbrList = SHORT_DAY_NAMES[language] || SHORT_DAY_NAMES.en;

  return (
    <View style={styles.container}>
      {/* Week Navigation Sub-Bar */}
      <View style={[styles.navRow, isRtl && styles.rowRtl]}>
        <TouchableOpacity
          style={styles.navArrowBtn}
          onPress={isRtl ? handleNextWeek : handlePrevWeek}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={t('Previous week')}
        >
          {isRtl ? (
            <ChevronRight size={18} color={theme.colors.textMuted} />
          ) : (
            <ChevronLeft size={18} color={theme.colors.textMuted} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.dateRangeBtn, isRtl && styles.rowRtl]}
          onPress={onOpenDatePicker}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t('Choose date')}
        >
          <Calendar size={14} color={theme.colors.primary} />
          <Text style={styles.dateRangeText}>
            {parseLocalDateString(weekDates[0]).toLocaleDateString(language === 'ckb' ? 'en-US' : language, { month: 'short', day: 'numeric' })}
            {' – '}
            {parseLocalDateString(weekDates[6]).toLocaleDateString(language === 'ckb' ? 'en-US' : language, { month: 'short', day: 'numeric' })}
          </Text>
        </TouchableOpacity>

        <View style={styles.navRightGroup}>
          {!isCurrentWeek && (
            <TouchableOpacity
              style={styles.todayJumpBtn}
              onPress={handleJumpToToday}
              accessibilityRole="button"
              accessibilityLabel={t('Today')}
            >
              <Text style={styles.todayJumpText}>{t('Today')}</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.navArrowBtn, isCurrentWeek && styles.navArrowBtnDisabled]}
            onPress={isRtl ? handlePrevWeek : handleNextWeek}
            disabled={isCurrentWeek}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={t('Next week')}
          >
            {isRtl ? (
              <ChevronLeft size={18} color={isCurrentWeek ? theme.colors.border : theme.colors.textMuted} />
            ) : (
              <ChevronRight size={18} color={isCurrentWeek ? theme.colors.border : theme.colors.textMuted} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* 7-Cell Responsive Week Row (Picture 2 Reference) */}
      <View style={[styles.weekGrid, isRtl && styles.rowRtl]}>
        {weekDates.map((dateStr) => {
          const dateObj = parseLocalDateString(dateStr);
          const dayOfWeekIndex = dateObj.getDay();
          const dayAbbr = dayAbbrList[dayOfWeekIndex] || SHORT_DAY_NAMES.en[dayOfWeekIndex];
          const dayNameKey = FULL_DAY_KEYS[dayOfWeekIndex];
          const fullDayName = t(dayNameKey);
          const dayNum = dateObj.getDate();
          const isSelected = dateStr === selectedDate;
          const isToday = dateStr === todayStr;
          const isFuture = dateStr > todayStr;

          return (
            <AnimatedPressable
              key={dateStr}
              style={[
                styles.dayCell,
                isSelected && styles.dayCellSelected,
                !isSelected && isToday && styles.dayCellToday,
                isFuture && styles.dayCellFuture,
              ]}
              onPress={() => handleSelect(dateStr)}
              disabled={isFuture}
              minScale={0.93}
              accessibilityRole="button"
              accessibilityLabel={`${fullDayName} ${dayNum}${isToday ? `, ${t('Today')}` : ''}${isSelected ? `, ${t('Selected')}` : ''}`}
              accessibilityState={{ selected: isSelected, disabled: isFuture }}
            >
              <Text
                style={[
                  styles.dayAbbr,
                  isSelected && styles.dayAbbrSelected,
                  !isSelected && isToday && styles.dayAbbrToday,
                  isFuture && styles.textFuture,
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >
                {dayAbbr}
              </Text>
              <Text
                style={[
                  styles.dayNum,
                  isSelected && styles.dayNumSelected,
                  !isSelected && isToday && styles.dayNumToday,
                  isFuture && styles.textFuture,
                ]}
                numberOfLines={1}
              >
                {dayNum}
              </Text>
              {isToday && (
                <View
                  style={[
                    styles.todayIndicatorDot,
                    isSelected ? styles.todayIndicatorDotSelected : styles.todayIndicatorDotUnselected,
                  ]}
                />
              )}
            </AnimatedPressable>
          );
        })}
      </View>
    </View>
  );
};

const createStyles = (theme: ThemeType) =>
  StyleSheet.create({
    container: {
      marginVertical: 6,
      paddingHorizontal: 2,
    },
    navRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 4,
      marginBottom: 8,
    },
    rowRtl: {
      flexDirection: 'row-reverse',
    },
    navArrowBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surfaceSubtle,
    },
    navArrowBtnDisabled: {
      opacity: 0.35,
    },
    dateRangeBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.surfaceSubtle,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    dateRangeText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.textPrimary,
    },
    navRightGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    todayJumpBtn: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.primaryLight,
      borderWidth: 1,
      borderColor: theme.colors.primary,
    },
    todayJumpText: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.colors.primary,
    },
    weekGrid: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 6,
    },
    dayCell: {
      flex: 1,
      height: 66,
      borderRadius: 14,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 6,
      paddingHorizontal: 2,
      ...theme.shadow.subtle,
    },
    dayCellSelected: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
      ...theme.shadow.floating,
    },
    dayCellToday: {
      borderColor: theme.colors.primary,
      borderWidth: 1.5,
    },
    dayCellFuture: {
      opacity: 0.35,
      backgroundColor: theme.colors.surfaceSubtle,
    },
    dayAbbr: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.colors.textMuted,
      marginBottom: 3,
      letterSpacing: 0.3,
      textAlign: 'center',
    },
    dayAbbrSelected: {
      color: theme.colors.black,
      fontWeight: '800',
    },
    dayAbbrToday: {
      color: theme.colors.primary,
      fontWeight: '800',
    },
    dayNum: {
      fontSize: 16,
      fontWeight: '800',
      color: theme.colors.textPrimary,
      textAlign: 'center',
    },
    dayNumSelected: {
      color: theme.colors.black,
      fontWeight: '900',
    },
    dayNumToday: {
      color: theme.colors.primary,
      fontWeight: '900',
    },
    textFuture: {
      color: theme.colors.textMuted,
    },
    todayIndicatorDot: {
      width: 4,
      height: 4,
      borderRadius: 2,
      marginTop: 3,
    },
    todayIndicatorDotSelected: {
      backgroundColor: theme.colors.black,
    },
    todayIndicatorDotUnselected: {
      backgroundColor: theme.colors.primary,
    },
  });
