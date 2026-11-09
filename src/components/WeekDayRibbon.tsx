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
  const styles = useMemo(() => createStyles(theme), [theme]);
  const t = (key: string) => translate(language, key);
  const scrollViewRef = useRef<ScrollView>(null);
  const contentWidthRef = useRef<number>(0);
  const layoutWidthRef = useRef<number>(0);

  const todayStr = useMemo(() => getTodayDateString(), []);

  // Generate 7-day strip ending on today (Today is always at the right end)
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
    const isTargetToday = selectedIdx === -1 || selectedIdx === dates.length - 1;

    // Today is at the right end: scroll to max offset so Today is immediately visible on the right
    if (isTargetToday) {
      if (contentWidthRef.current > 0 && layoutWidthRef.current > 0) {
        const maxOffset = Math.max(0, contentWidthRef.current - layoutWidthRef.current);
        scrollViewRef.current.scrollTo({ x: maxOffset, animated });
      } else {
        scrollViewRef.current.scrollToEnd({ animated });
      }
    } else {
      // Each item is 62px width + 6px gap = 68px step
      const targetOffset = Math.max(0, selectedIdx * 68 - 30);
      scrollViewRef.current.scrollTo({ x: targetOffset, animated });
    }
  }, [dates, selectedDate]);

  useEffect(() => {
    const t1 = setTimeout(() => scrollToSelected(false), 20);
    const t2 = setTimeout(() => scrollToSelected(false), 80);
    const t3 = setTimeout(() => scrollToSelected(false), 200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [selectedDate, language, scrollToSelected]);

  const handleSelect = (dateStr: string) => {
    if (dateStr === selectedDate) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onSelectDate(dateStr);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        key={`week-ribbon-${language}`}
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        onLayout={(e) => {
          layoutWidthRef.current = e.nativeEvent.layout.width;
          scrollToSelected(false);
        }}
        onContentSizeChange={(w) => {
          contentWidthRef.current = w;
          scrollToSelected(false);
        }}
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
                minimumFontScale={0.6}
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
      paddingVertical: 4,
      paddingHorizontal: 8,
      backgroundColor: theme.colors.background,
      gap: 6,
    },
    scrollContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 2,
    },
    dayPill: {
      width: 62,
      height: 60,
      borderRadius: 14,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 5,
      paddingHorizontal: 2,
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
      fontSize: 11,
      fontWeight: '700',
      color: theme.colors.textSecondary,
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
      fontSize: 18,
      fontWeight: '800',
      color: theme.colors.textPrimary,
      textAlign: 'center',
      includeFontPadding: false,
      lineHeight: 22,
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
      width: 38,
      height: 60,
      borderRadius: 14,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      ...theme.shadow.subtle,
    },
  });
