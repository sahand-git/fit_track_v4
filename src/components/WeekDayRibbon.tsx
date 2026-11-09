import React, { useMemo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  PanResponder,
  AccessibilityInfo,
  useWindowDimensions,
} from 'react-native';
import { AppText as Text } from './AppText';
import { DirectionalIcon } from './DirectionalIcon';
import { useLanguage } from '../i18n/I18nContext';
import { translate } from '../i18n/strings';
import { useTheme } from '../theme/ThemeContext';
import { ThemeType } from '../theme';
import { useIsRTL } from '../hooks/useIsRTL';
import * as Haptics from 'expo-haptics';
import {
  getTodayDateString,
  parseLocalDateString,
} from '../utils/dateUtils';
import {
  WeekStartDay,
  resolveWeekStartDay,
  getWeekDaysForDate,
  orderWeekDaysForDisplay,
  shiftWeek,
  canShiftWeekForward,
  formatFullDateHeader,
  getShortWeekdayName,
} from '../utils/weekStripCore';

export interface WeekDayRibbonProps {
  selectedDate: string;
  onSelectDate: (dateStr: string) => void;
  onOpenDatePicker?: () => void;
  weekStartDay?: WeekStartDay;
  loggedDates?: Set<string> | string[];
}

export const WeekDayRibbon: React.FC<WeekDayRibbonProps> = ({
  selectedDate,
  onSelectDate,
  weekStartDay,
  loggedDates,
}) => {
  const language = useLanguage();
  const { theme } = useTheme();
  const isRtl = useIsRTL();
  const { width: windowWidth, fontScale } = useWindowDimensions();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const t = useCallback((key: string) => translate(language, key), [language]);

  const todayStr = useMemo(() => getTodayDateString(), []);
  const activeWeekStart = useMemo(
    () => resolveWeekStartDay(weekStartDay, language),
    [weekStartDay, language]
  );

  // 7 chronological days for the current calendar week of selectedDate
  const chronologicalWeek = useMemo(
    () => getWeekDaysForDate(selectedDate || todayStr, activeWeekStart),
    [selectedDate, todayStr, activeWeekStart]
  );

  // Mirrored for RTL display so older days appear on the right, newer on the left
  const displayDays = useMemo(
    () => orderWeekDaysForDisplay(chronologicalWeek, isRtl),
    [chronologicalWeek, isRtl]
  );

  const canGoForward = useMemo(
    () => canShiftWeekForward(chronologicalWeek, todayStr, false),
    [chronologicalWeek, todayStr]
  );

  const loggedSet = useMemo(() => {
    if (!loggedDates) return null;
    if (loggedDates instanceof Set) return loggedDates;
    return new Set(loggedDates);
  }, [loggedDates]);

  const handleSelect = useCallback(
    (dateStr: string) => {
      if (dateStr === selectedDate || dateStr > todayStr) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      onSelectDate(dateStr);
      const fullDate = formatFullDateHeader(dateStr, language);
      AccessibilityInfo.announceForAccessibility(fullDate);
    },
    [selectedDate, todayStr, onSelectDate, language]
  );

  const handleShiftWeek = useCallback(
    (deltaWeeks: number) => {
      const nextDate = shiftWeek(selectedDate || todayStr, deltaWeeks, todayStr, false);
      if (nextDate === selectedDate) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      onSelectDate(nextDate);
      const fullDate = formatFullDateHeader(nextDate, language);
      AccessibilityInfo.announceForAccessibility(fullDate);
    },
    [selectedDate, todayStr, onSelectDate, language]
  );

  // Swipe navigation responder: direction-aware for RTL
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) => {
          return (
            Math.abs(gestureState.dx) > 16 &&
            Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.5
          );
        },
        onPanResponderRelease: (_, gestureState) => {
          const threshold = 36;
          if (gestureState.dx > threshold) {
            // Swipe Right: In LTR -> previous week; In RTL -> next week
            if (isRtl) {
              if (canGoForward) handleShiftWeek(1);
            } else {
              handleShiftWeek(-1);
            }
          } else if (gestureState.dx < -threshold) {
            // Swipe Left: In LTR -> next week; In RTL -> previous week
            if (isRtl) {
              handleShiftWeek(-1);
            } else {
              if (canGoForward) handleShiftWeek(1);
            }
          }
        },
      }),
    [isRtl, canGoForward, handleShiftWeek]
  );

  // Use 1-letter abbreviation if screen is narrow or font is significantly enlarged
  const useCompactAbbr = fontScale > 1.25 || windowWidth < 370;

  return (
    <View style={styles.container}>
      {/* Previous Week Chevron */}
      <TouchableOpacity
        style={styles.chevronBtn}
        onPress={() => handleShiftWeek(-1)}
        accessibilityRole="button"
        accessibilityLabel={t('Previous week')}
        hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
      >
        <DirectionalIcon name="ChevronLeft" size={18} color={theme.colors.textMuted} />
      </TouchableOpacity>

      {/* 7-Cell Non-Scrolling Row */}
      <View style={styles.cellsRow} {...panResponder.panHandlers}>
        {displayDays.map((dateStr) => {
          const dateObj = parseLocalDateString(dateStr);
          const dayOfWeekIndex = dateObj.getDay();
          const { abbr3, abbr1 } = getShortWeekdayName(dayOfWeekIndex, language);
          const dayAbbr = useCompactAbbr ? abbr1 : abbr3;
          const dayNum = dateObj.getDate();

          const isSelected = dateStr === selectedDate;
          const isToday = dateStr === todayStr;
          const isFuture = dateStr > todayStr;
          const hasLoggedFood = loggedSet ? loggedSet.has(dateStr) : false;

          const accessibilityParts: string[] = [formatFullDateHeader(dateStr, language)];
          if (isSelected) accessibilityParts.push(t('selected'));
          if (isToday) accessibilityParts.push(t('Today'));
          if (hasLoggedFood) accessibilityParts.push(t('Food logged'));

          return (
            <TouchableOpacity
              key={dateStr}
              style={[
                styles.dayCell,
                isSelected && styles.dayCellSelected,
                !isSelected && isToday && styles.dayCellToday,
                isFuture && styles.dayCellFuture,
              ]}
              onPress={() => handleSelect(dateStr)}
              disabled={isFuture}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={accessibilityParts.join(', ')}
              accessibilityState={{ selected: isSelected, disabled: isFuture }}
              hitSlop={{ top: 4, bottom: 4, left: 2, right: 2 }}
            >
              <Text
                style={[
                  styles.dayAbbr,
                  isSelected && styles.dayAbbrSelected,
                  !isSelected && isToday && styles.dayAbbrToday,
                  isFuture && styles.dayTextFuture,
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
                  isFuture && styles.dayTextFuture,
                ]}
                numberOfLines={1}
              >
                {dayNum}
              </Text>

              {/* Logged food indicator dot */}
              <View style={styles.dotSlot}>
                {hasLoggedFood ? (
                  <View
                    style={[
                      styles.foodDot,
                      isSelected ? styles.foodDotSelected : styles.foodDotUnselected,
                    ]}
                  />
                ) : null}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Next Week Chevron */}
      <TouchableOpacity
        style={[styles.chevronBtn, !canGoForward && styles.chevronBtnDisabled]}
        onPress={() => canGoForward && handleShiftWeek(1)}
        disabled={!canGoForward}
        accessibilityRole="button"
        accessibilityLabel={t('Next week')}
        hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
      >
        <DirectionalIcon
          name="ChevronRight"
          size={18}
          color={canGoForward ? theme.colors.textMuted : theme.colors.border}
        />
      </TouchableOpacity>
    </View>
  );
};

const createStyles = (theme: ThemeType) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 4,
      paddingHorizontal: 8,
      backgroundColor: theme.colors.background,
      maxHeight: 64,
      minHeight: 56,
    },
    chevronBtn: {
      width: 28,
      height: 48,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.radius.sm,
    },
    chevronBtnDisabled: {
      opacity: 0.35,
    },
    cellsRow: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 4,
      paddingHorizontal: 2,
    },
    dayCell: {
      flex: 1,
      minWidth: 40,
      minHeight: 48,
      maxHeight: 56,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 4,
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
      borderColor: theme.colors.border,
    },
    dayAbbr: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.colors.textMuted,
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
      fontSize: 16,
      fontWeight: '800',
      color: theme.colors.textPrimary,
      textAlign: 'center',
      includeFontPadding: false,
      lineHeight: 18,
    },
    dayNumSelected: {
      color: theme.colors.textInverted,
    },
    dayNumToday: {
      color: theme.colors.primary,
    },
    dayTextFuture: {
      color: theme.colors.textMuted,
    },
    dotSlot: {
      height: 5,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 2,
    },
    foodDot: {
      width: 4,
      height: 4,
      borderRadius: 2,
    },
    foodDotSelected: {
      backgroundColor: theme.colors.textInverted,
    },
    foodDotUnselected: {
      backgroundColor: theme.colors.primary,
    },
  });
