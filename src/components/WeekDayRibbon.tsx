import React, { useMemo, useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { Calendar } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { AppText as Text } from './AppText';
import { DirectionalIcon } from './DirectionalIcon';
import { AnimatedPressable } from './AnimatedPressable';
import { useLanguage } from '../i18n/I18nContext';
import { translate } from '../i18n/strings';
import { useTheme } from '../theme/ThemeContext';
import { ThemeType } from '../theme';
import { useIsRTL } from '../hooks/useIsRTL';
import { DailyLog, UserProfile } from '../types';
import { loadLogsForDates } from '../storage/storage';
import {
  getTodayDateString,
  parseLocalDateString,
  addDaysToDateString,
} from '../utils/dateUtils';
import {
  WEEK_FULL_DAY_KEYS,
  WEEK_SHORT_DAY_NAMES,
  WeekDayStatus,
  getWeekDatesForDate,
  formatWeekHeaderTitle,
  evaluateWeekDayStatus,
} from '../utils/weekCalendarCore';

interface WeekDayRibbonProps {
  selectedDate: string;
  onSelectDate: (dateStr: string) => void;
  onOpenDatePicker?: () => void;
  currentLog?: DailyLog;
  profile?: UserProfile;
}

export const WeekDayRibbon: React.FC<WeekDayRibbonProps> = React.memo(({
  selectedDate,
  onSelectDate,
  onOpenDatePicker,
  currentLog,
  profile,
}) => {
  const language = useLanguage();
  const { theme } = useTheme();
  const isRtl = useIsRTL();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const t = useCallback((key: string) => translate(language, key), [language]);

  const todayStr = getTodayDateString();
  const activeDate = selectedDate || todayStr;

  const weekDates = useMemo(
    () => getWeekDatesForDate(activeDate, language),
    [activeDate, language]
  );

  const isCurrentWeek = useMemo(() => weekDates.includes(todayStr), [weekDates, todayStr]);
  const isViewingToday = activeDate === todayStr;

  const { monthYearLabel, weekRangeLabel } = useMemo(
    () => formatWeekHeaderTitle(activeDate, weekDates, language),
    [activeDate, weekDates, language]
  );

  const [weekLogs, setWeekLogs] = useState<Record<string, DailyLog>>({});

  useEffect(() => {
    let active = true;
    loadLogsForDates(weekDates)
      .then((logs) => {
        if (active) setWeekLogs(logs);
      })
      .catch(() => {
        // Keep previously cached logs if read fails
      });
    return () => {
      active = false;
    };
  }, [weekDates, currentLog]);

  const mergedWeekLogs = useMemo(() => {
    if (!currentLog?.date) return weekLogs;
    return { ...weekLogs, [currentLog.date]: currentLog };
  }, [weekLogs, currentLog]);

  const handleSelect = (dateStr: string) => {
    if (dateStr === activeDate || dateStr > todayStr) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onSelectDate(dateStr);
  };

  const handlePrevWeek = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onSelectDate(addDaysToDateString(activeDate, -7));
  };

  const handleNextWeek = () => {
    if (isCurrentWeek) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const candidate = addDaysToDateString(activeDate, 7);
    onSelectDate(candidate > todayStr ? todayStr : candidate);
  };

  const handleJumpToToday = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onSelectDate(todayStr);
  };

  const dayAbbrList = WEEK_SHORT_DAY_NAMES[language] || WEEK_SHORT_DAY_NAMES.en;

  const getStatusLabel = (status: WeekDayStatus): string => {
    if (status === 'on_target') return t('On target');
    if (status === 'partial') return t('Partial');
    if (status === 'over_limit') return t('Over limit');
    return '';
  };

  return (
    <View style={styles.glassCard}>
      {/* Top Bar: Month & Year + Week Range | Conditional Today Reset | Glass Chevrons */}
      <View style={[styles.topBar, isRtl && styles.rowRtl]}>
        <TouchableOpacity
          style={[styles.dateTriggerPill, isRtl && styles.rowRtl]}
          onPress={onOpenDatePicker}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel={t('Choose date')}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <View style={styles.calendarIconBadge}>
            <Calendar size={14} color={theme.colors.emerald} />
          </View>
          <View style={styles.dateTitleGroup}>
            <Text style={styles.monthYearText} numberOfLines={1}>
              {monthYearLabel}
            </Text>
            <Text style={styles.weekRangeText} numberOfLines={1}>
              {weekRangeLabel}
            </Text>
          </View>
        </TouchableOpacity>

        <View style={[styles.topControlsRow, isRtl && styles.rowRtl]}>
          {!isViewingToday && (
            <TouchableOpacity
              style={styles.todayResetPill}
              onPress={handleJumpToToday}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={t('Today')}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Text style={styles.todayResetText} numberOfLines={1}>
                {t('Today')}
              </Text>
            </TouchableOpacity>
          )}

          {/* Previous Week Chevron (visually Left in LTR, Right in RTL via rowRtl + DirectionalIcon) */}
          <TouchableOpacity
            style={styles.glassChevronBtn}
            onPress={handlePrevWeek}
            activeOpacity={0.75}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            accessibilityRole="button"
            accessibilityLabel={t('Previous week')}
          >
            <DirectionalIcon
              name="ChevronLeft"
              size={16}
              color={theme.colors.calendarDayText}
            />
          </TouchableOpacity>

          {/* Next Week Chevron (visually Right in LTR, Left in RTL; disabled during current week) */}
          <TouchableOpacity
            style={[styles.glassChevronBtn, isCurrentWeek && styles.glassChevronBtnDisabled]}
            onPress={handleNextWeek}
            disabled={isCurrentWeek}
            activeOpacity={0.75}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            accessibilityRole="button"
            accessibilityLabel={t('Next week')}
          >
            <DirectionalIcon
              name="ChevronRight"
              size={16}
              color={isCurrentWeek ? theme.colors.textMuted : theme.colors.calendarDayText}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* 7-Day High-Contrast Capsule Row */}
      <View style={[styles.weekGrid, isRtl && styles.rowRtl]}>
        {weekDates.map((dateStr) => {
          const dateObj = parseLocalDateString(dateStr);
          const dayOfWeekIndex = dateObj.getDay();
          const dayAbbr = dayAbbrList[dayOfWeekIndex] || WEEK_SHORT_DAY_NAMES.en[dayOfWeekIndex];
          const fullDayName = t(WEEK_FULL_DAY_KEYS[dayOfWeekIndex]);
          const dayNum = dateObj.getDate();
          const isSelected = dateStr === activeDate;
          const isToday = dateStr === todayStr;
          const isFuture = dateStr > todayStr;

          const dayStatus: WeekDayStatus = isFuture
            ? 'none'
            : evaluateWeekDayStatus(mergedWeekLogs[dateStr], profile);
          const statusLabel = getStatusLabel(dayStatus);

          return (
            <View
              key={dateStr}
              style={[
                styles.dayColWrapper,
                isSelected && styles.dayColSelectedGlow,
              ]}
            >
              <AnimatedPressable
                style={[
                  styles.dayCell,
                  isSelected && styles.dayCellSelected,
                  !isSelected && isToday && styles.dayCellToday,
                  !isSelected && isFuture && styles.dayCellFuture,
                ]}
                onPress={() => handleSelect(dateStr)}
                disabled={isFuture}
                minScale={0.94}
                hitSlop={{ top: 4, bottom: 4, left: 2, right: 2 }}
                accessibilityRole="button"
                accessibilityLabel={`${fullDayName} ${dayNum}${isToday ? `, ${t('Today')}` : ''}${isSelected ? `, ${t('Selected')}` : ''}${statusLabel ? `, ${statusLabel}` : ''}`}
                accessibilityState={{ selected: isSelected, disabled: isFuture }}
              >
                {isSelected && (
                  <View style={styles.gradientBackdrop} pointerEvents="none">
                    <Svg
                      width="100%"
                      height="100%"
                      viewBox="0 0 100 100"
                      preserveAspectRatio="none"
                    >
                      <Defs>
                        <LinearGradient id={`selGrad_${dateStr}`} x1="0" y1="0" x2="1" y2="1">
                          <Stop offset="0" stopColor={theme.colors.calendarSelectedStart} />
                          <Stop offset="1" stopColor={theme.colors.calendarSelectedEnd} />
                        </LinearGradient>
                      </Defs>
                      <Rect
                        x="0"
                        y="0"
                        width="100"
                        height="100"
                        rx="16"
                        ry="16"
                        fill={`url(#selGrad_${dateStr})`}
                      />
                    </Svg>
                  </View>
                )}

                <Text
                  style={[
                    styles.dayAbbr,
                    language === 'ar' && styles.dayAbbrArabic,
                    isSelected && styles.dayAbbrSelected,
                    !isSelected && isToday && styles.dayAbbrToday,
                    !isSelected && isFuture && styles.dayAbbrFuture,
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.62}
                  maxFontSizeMultiplier={1.2}
                >
                  {dayAbbr}
                </Text>

                <Text
                  style={[
                    styles.dayNum,
                    isSelected && styles.dayNumSelected,
                    !isSelected && isToday && styles.dayNumToday,
                    !isSelected && isFuture && styles.dayNumFuture,
                  ]}
                  numberOfLines={1}
                  maxFontSizeMultiplier={1.2}
                >
                  {dayNum}
                </Text>

                {/* Status Indicator Slot (fixed height keeps all 7 date rows aligned) */}
                <View style={styles.statusDotSlot}>
                  {dayStatus !== 'none' ? (
                    <View
                      style={[
                        styles.statusDot,
                        dayStatus === 'on_target' && (isSelected ? styles.dotOnTargetSelected : styles.dotOnTarget),
                        dayStatus === 'partial' && styles.dotPartial,
                        dayStatus === 'over_limit' && styles.dotOverLimit,
                        isSelected && styles.statusDotSelectedBorder,
                      ]}
                    />
                  ) : isToday && !isSelected ? (
                    <View style={styles.dotTodayOutline} />
                  ) : null}
                </View>
              </AnimatedPressable>
            </View>
          );
        })}
      </View>
    </View>
  );
});
WeekDayRibbon.displayName = 'WeekDayRibbon';

const createStyles = (theme: ThemeType) =>
  StyleSheet.create({
    glassCard: {
      backgroundColor: theme.colors.glassCardBg,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.colors.glassCardBorder,
      paddingVertical: 10,
      paddingHorizontal: 10,
      marginTop: 2,
      marginBottom: 10,
      ...theme.shadow.subtle,
    },
    rowRtl: {
      flexDirection: 'row-reverse',
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
      gap: 8,
    },
    dateTriggerPill: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      minWidth: 0,
    },
    calendarIconBadge: {
      width: 30,
      height: 30,
      borderRadius: 10,
      backgroundColor: theme.colors.glassControlBg,
      borderWidth: 1,
      borderColor: theme.colors.glassControlBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dateTitleGroup: {
      flex: 1,
      minWidth: 0,
    },
    monthYearText: {
      fontFamily: theme.fonts.sans,
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.calendarDayText,
      includeFontPadding: false,
    },
    weekRangeText: {
      fontFamily: theme.fonts.sans,
      fontSize: 12,
      fontWeight: '500',
      color: theme.colors.calendarDaySubText,
      marginTop: 1,
      includeFontPadding: false,
    },
    topControlsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flexShrink: 0,
    },
    todayResetPill: {
      paddingHorizontal: 10,
      height: 30,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.budgetOnBg,
      borderWidth: 1,
      borderColor: theme.colors.budgetOnBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    todayResetText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.budgetOnText,
      includeFontPadding: false,
    },
    glassChevronBtn: {
      width: 30,
      height: 30,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.glassControlBg,
      borderWidth: 1,
      borderColor: theme.colors.glassControlBorder,
    },
    glassChevronBtnDisabled: {
      opacity: 0.45,
    },
    weekGrid: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 4,
    },
    dayColWrapper: {
      flex: 1,
      minWidth: 0,
      borderRadius: 14,
    },
    dayColSelectedGlow: {
      shadowColor: theme.colors.calendarSelectedGlow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.42,
      shadowRadius: 8,
      elevation: 6,
    },
    dayCell: {
      width: '100%',
      height: 60,
      borderRadius: 14,
      backgroundColor: theme.colors.calendarDayCellBg,
      borderWidth: 1,
      borderColor: theme.colors.calendarDayCellBorder,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 5,
      paddingHorizontal: 2,
      overflow: 'hidden',
      position: 'relative',
    },
    dayCellSelected: {
      borderColor: theme.colors.calendarSelectedStart,
      borderWidth: 1,
      backgroundColor: theme.colors.calendarSelectedEnd,
    },
    dayCellToday: {
      borderColor: theme.colors.emerald,
      borderWidth: 1.5,
    },
    dayCellFuture: {
      backgroundColor: theme.colors.calendarFutureBg,
      borderColor: theme.colors.calendarDayCellBorder,
      borderStyle: 'dashed',
    },
    gradientBackdrop: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      borderRadius: 14,
      overflow: 'hidden',
    },
    dayAbbr: {
      width: '100%',
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.calendarDaySubText,
      marginBottom: 2,
      textAlign: 'center',
      includeFontPadding: false,
    },
    dayAbbrArabic: {
      fontSize: 12,
    },
    dayAbbrSelected: {
      color: theme.colors.calendarSelectedText,
      fontWeight: '800',
    },
    dayAbbrToday: {
      color: theme.colors.emerald,
      fontWeight: '800',
    },
    dayAbbrFuture: {
      color: theme.colors.calendarFutureText,
    },
    dayNum: {
      fontSize: 15,
      fontWeight: '800',
      color: theme.colors.calendarDayText,
      textAlign: 'center',
      includeFontPadding: false,
    },
    dayNumSelected: {
      color: theme.colors.calendarSelectedText,
      fontWeight: '900',
    },
    dayNumToday: {
      color: theme.colors.calendarDayText,
      fontWeight: '900',
    },
    dayNumFuture: {
      color: theme.colors.calendarFutureText,
      fontWeight: '700',
    },
    statusDotSlot: {
      height: 7,
      marginTop: 3,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statusDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    statusDotSelectedBorder: {
      borderWidth: 1,
      borderColor: theme.colors.calendarSelectedText,
    },
    dotOnTarget: {
      backgroundColor: theme.colors.emerald,
    },
    dotOnTargetSelected: {
      backgroundColor: theme.colors.calendarSelectedText,
    },
    dotPartial: {
      backgroundColor: theme.colors.calorieOverflowAmber,
    },
    dotOverLimit: {
      backgroundColor: theme.colors.calorieOverflowRed,
    },
    dotTodayOutline: {
      width: 5,
      height: 5,
      borderRadius: 2.5,
      backgroundColor: theme.colors.emerald,
    },
  });
