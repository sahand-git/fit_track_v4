import React, { useMemo, useRef, useEffect } from 'react';
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

const DAY_KEYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const ITEM_WIDTH = 50;
const ITEM_GAP = 8;

export const WeekDayRibbon: React.FC<WeekDayRibbonProps> = ({
  selectedDate,
  onSelectDate,
  onOpenDatePicker,
}) => {
  const language = useLanguage();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const t = (key: string) => translate(language, key);
  const scrollRef = useRef<ScrollView>(null);

  const todayStr = useMemo(() => getTodayDateString(), []);

  // Generate a 14-day window ending today
  const dates = useMemo(() => {
    const list: string[] = [];
    for (let i = 13; i >= 0; i--) {
      list.push(addDaysToDateString(todayStr, -i));
    }
    return list;
  }, [todayStr]);

  const selectedIndex = dates.indexOf(selectedDate);

  // Auto-scroll to selected date on mount or date change
  useEffect(() => {
    if (selectedIndex >= 0 && scrollRef.current) {
      const scrollX = Math.max(0, selectedIndex * (ITEM_WIDTH + ITEM_GAP) - (ITEM_WIDTH * 2));
      scrollRef.current.scrollTo({ x: scrollX, animated: true });
    }
  }, [selectedIndex]);

  const handleSelect = (dateStr: string) => {
    if (dateStr === selectedDate) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onSelectDate(dateStr);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
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
              {isToday && (
                <View
                  style={[
                    styles.todayDot,
                    isSelected ? styles.todayDotSelected : styles.todayDotUnselected,
                  ]}
                />
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
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.md,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: ITEM_GAP,
      paddingRight: theme.spacing.sm,
    },
    dayPill: {
      width: ITEM_WIDTH,
      height: 64,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 6,
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
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 2,
    },
    dayAbbrSelected: {
      color: theme.colors.textInverted,
    },
    dayAbbrToday: {
      color: theme.colors.primary,
    },
    dayNum: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.textPrimary,
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
      marginTop: 3,
    },
    todayDotSelected: {
      backgroundColor: theme.colors.textInverted,
    },
    todayDotUnselected: {
      backgroundColor: theme.colors.primary,
    },
    calendarBtn: {
      width: 40,
      height: 64,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 4,
    },
  });
