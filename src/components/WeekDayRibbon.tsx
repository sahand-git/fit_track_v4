import React, { useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { AppText as Text } from './AppText';
import { Calendar } from 'lucide-react-native';
import { useLanguage } from '../i18n/I18nContext';
import { translate } from '../i18n/strings';
import { useTheme } from '../theme/ThemeContext';
import { ThemeType } from '../theme';
import * as Haptics from 'expo-haptics';
import { AnimatedPressable } from './AnimatedPressable';
import {
  getTodayDateString,
  parseLocalDateString,
  addDaysToDateString,
} from '../utils/dateUtils';

interface WeekDayRibbonProps {
  selectedDate: string;
  onSelectDate: (dateStr: string) => void;
  onOpenDatePicker?: () => void;
}

const DAY_KEYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export const WeekDayRibbon: React.FC<WeekDayRibbonProps> = ({
  selectedDate,
  onSelectDate,
  onOpenDatePicker,
}) => {
  const language = useLanguage();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const t = (key: string) => translate(language, key);

  const todayStr = useMemo(() => getTodayDateString(), []);

  // Generate 7-day strip: always ends on today unless selectedDate is outside the 7-day window
  const dates = useMemo(() => {
    const list: string[] = [];
    const baseDate = selectedDate || todayStr;
    const diffDays = Math.round(
      (parseLocalDateString(todayStr).getTime() - parseLocalDateString(baseDate).getTime()) /
        (1000 * 60 * 60 * 24)
    );

    let endDate = todayStr;
    if (diffDays > 6) {
      endDate = baseDate;
    } else if (diffDays < 0) {
      endDate = baseDate;
    }

    for (let i = 6; i >= 0; i--) {
      list.push(addDaysToDateString(endDate, -i));
    }
    return list;
  }, [todayStr, selectedDate]);

  const handleSelect = (dateStr: string) => {
    if (dateStr === selectedDate) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onSelectDate(dateStr);
  };

  return (
    <View style={styles.container}>
      <View style={styles.daysRow}>
        {dates.map((dateStr) => {
          const dateObj = parseLocalDateString(dateStr);
          const dayOfWeekIndex = dateObj.getDay();
          const dayNameKey = DAY_KEYS[dayOfWeekIndex];
          const dayAbbr = t(dayNameKey);
          const dayNum = dateObj.getDate();
          const isSelected = dateStr === selectedDate;
          const isToday = dateStr === todayStr;

          return (
            <AnimatedPressable
              key={dateStr}
              style={[
                styles.dayPill,
                isSelected && styles.dayPillSelected,
                !isSelected && isToday && styles.dayPillToday,
              ]}
              onPress={() => handleSelect(dateStr)}
              minScale={0.94}
              accessibilityRole="button"
              accessibilityLabel={`${dayAbbr} ${dayNum}${isToday ? `, ${t('Today')}` : ''}`}
              accessibilityState={{ selected: isSelected }}
            >
              <Text
                style={[
                  styles.dayAbbr,
                  isSelected && styles.dayAbbrSelected,
                  !isSelected && isToday && styles.dayAbbrToday,
                ]}
                numberOfLines={1}
              >
                {dayAbbr}
              </Text>
              <Text
                style={[
                  styles.dayNum,
                  isSelected && styles.dayNumSelected,
                  !isSelected && isToday && styles.dayNumToday,
                ]}
              >
                {dayNum}
              </Text>
              {isToday ? (
                <View
                  style={[
                    styles.todayDot,
                    isSelected ? styles.todayDotSelected : styles.todayDotUnselected,
                  ]}
                />
              ) : (
                <View style={styles.emptyDot} />
              )}
            </AnimatedPressable>
          );
        })}
      </View>

      {onOpenDatePicker && (
        <TouchableOpacity
          style={styles.calendarBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            onOpenDatePicker();
          }}
          accessibilityRole="button"
          accessibilityLabel={t('Choose date')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Calendar size={18} color={theme.colors.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const createStyles = (theme: ThemeType) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: 8,
      backgroundColor: theme.colors.background,
      gap: 4,
    },
    daysRow: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 4,
    },
    dayPill: {
      flex: 1,
      height: 56,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 4,
      paddingHorizontal: 1,
    },
    dayPillSelected: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    dayPillToday: {
      borderColor: theme.colors.primaryBorder,
      borderWidth: 1.5,
    },
    dayAbbr: {
      fontSize: 10.5,
      fontWeight: '700',
      color: theme.colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0,
      marginBottom: 2,
      textAlign: 'center',
      includeFontPadding: false,
    },
    dayAbbrSelected: {
      color: theme.colors.textInverted,
    },
    dayAbbrToday: {
      color: theme.colors.primary,
    },
    dayNum: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.textPrimary,
      textAlign: 'center',
      includeFontPadding: false,
    },
    dayNumSelected: {
      color: theme.colors.textInverted,
    },
    dayNumToday: {
      color: theme.colors.primary,
    },
    todayDot: {
      width: 4,
      height: 4,
      borderRadius: 2,
      marginTop: 2,
    },
    emptyDot: {
      width: 4,
      height: 4,
      marginTop: 2,
    },
    todayDotSelected: {
      backgroundColor: theme.colors.textInverted,
    },
    todayDotUnselected: {
      backgroundColor: theme.colors.primary,
    },
    calendarBtn: {
      width: 34,
      height: 56,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
