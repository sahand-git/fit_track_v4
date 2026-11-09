import React, { useMemo, useRef, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { AppText as Text } from './AppText';
import { Calendar } from 'lucide-react-native';
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
  addDaysToDateString,
} from '../utils/dateUtils';

interface WeekDayRibbonProps {
  selectedDate: string;
  onSelectDate: (dateStr: string) => void;
  onOpenDatePicker?: () => void;
}

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
  const t = (key: string) => translate(language, key);
  const scrollViewRef = useRef<ScrollView>(null);

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

  const scrollToSelected = useCallback((animated: boolean = false) => {
    if (!scrollViewRef.current) return;
    const selectedIdx = dates.indexOf(selectedDate);
    const targetIdx = selectedIdx >= 0 ? selectedIdx : dates.length - 1;

    // Each item is 72px width + 8px gap = 80px total step
    if (targetIdx === dates.length - 1) {
      scrollViewRef.current.scrollToEnd({ animated });
    } else {
      const targetOffset = Math.max(0, targetIdx * 80 - 40);
      scrollViewRef.current.scrollTo({ x: targetOffset, animated });
    }
  }, [dates, selectedDate]);

  useEffect(() => {
    const timer = setTimeout(() => {
      scrollToSelected(false);
    }, 60);
    return () => clearTimeout(timer);
  }, [selectedDate, language, scrollToSelected]);

  const handleSelect = (dateStr: string) => {
    if (dateStr === selectedDate) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onSelectDate(dateStr);
  };

  return (
    <View style={[styles.container, isRtl && styles.containerRtl]}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        onContentSizeChange={() => scrollToSelected(false)}
      >
        {dates.map((dateStr) => {
          const dateObj = parseLocalDateString(dateStr);
          const dayOfWeekIndex = dateObj.getDay();
          const dayNameKey = FULL_DAY_KEYS[dayOfWeekIndex];
          const dayName = t(dayNameKey);
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
              accessibilityLabel={`${dayName} ${dayNum}${isToday ? `, ${t('Today')}` : ''}`}
              accessibilityState={{ selected: isSelected }}
            >
              <Text
                style={[
                  styles.dayAbbr,
                  isSelected && styles.dayAbbrSelected,
                  !isSelected && isToday && styles.dayAbbrToday,
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.72}
              >
                {dayName}
              </Text>
              <Text
                style={[
                  styles.dayNum,
                  isSelected && styles.dayNumSelected,
                  !isSelected && isToday && styles.dayNumToday,
                ]}
                numberOfLines={1}
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
      </ScrollView>

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
          <Calendar size={20} color={theme.colors.primary} />
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
      paddingVertical: 8,
      paddingHorizontal: 8,
      backgroundColor: theme.colors.background,
      gap: 8,
    },
    containerRtl: {
      flexDirection: 'row-reverse',
    },
    scrollContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 2,
    },
    dayPill: {
      width: 72,
      height: 78,
      borderRadius: 18,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      paddingHorizontal: 4,
      ...theme.shadow.subtle,
    },
    dayPillSelected: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
      ...theme.shadow.floating,
    },
    dayPillToday: {
      borderColor: theme.colors.primary,
      borderWidth: 1.5,
    },
    dayAbbr: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.textMuted,
      marginBottom: 4,
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
      fontSize: 20,
      fontWeight: '800',
      color: theme.colors.textPrimary,
      textAlign: 'center',
      includeFontPadding: false,
      lineHeight: 24,
    },
    dayNumSelected: {
      color: theme.colors.textInverted,
    },
    dayNumToday: {
      color: theme.colors.primary,
    },
    todayDot: {
      width: 5,
      height: 5,
      borderRadius: 2.5,
      marginTop: 4,
    },
    emptyDot: {
      width: 5,
      height: 5,
      marginTop: 4,
    },
    todayDotSelected: {
      backgroundColor: theme.colors.textInverted,
    },
    todayDotUnselected: {
      backgroundColor: theme.colors.primary,
    },
    calendarBtn: {
      width: 44,
      height: 78,
      borderRadius: 18,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      ...theme.shadow.subtle,
    },
  });
