import React, { useCallback, useEffect, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { Flame, Footprints, Dumbbell, Plus, Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { AppText as Text } from './AppText';
import { AnimatedPressable } from './AnimatedPressable';
import { useLanguage } from '../i18n/I18nContext';
import { translate } from '../i18n/strings';
import { useTheme } from '../theme/ThemeContext';
import { ThemeType } from '../theme';
import { useIsRTL } from '../hooks/useIsRTL';
import { WorkoutEntry } from '../types';
import { isReducedMotion } from '../utils/motion';
import { getSpringConfig } from '../utils/reanimatedMotion';
import {
  calculateStepTelemetry,
  summarizeWorkoutsTelemetry,
} from '../utils/activeBurnCore';

interface ActiveBurnCardProps {
  steps: number;
  nonWorkoutSteps: number;
  stepGoal: number;
  weightKg: number;
  stepCalories: number;
  workoutCalories: number;
  workouts: WorkoutEntry[];
  includeInBudget: boolean;
  canToggleBudget: boolean;
  onToggleBudget: () => void;
  onOpenSteps: () => void;
  onOpenWorkouts: () => void;
  onQuickLogWorkout: () => void;
}

export const ActiveBurnCard: React.FC<ActiveBurnCardProps> = React.memo(({
  steps,
  nonWorkoutSteps,
  stepGoal,
  weightKg,
  stepCalories,
  workoutCalories,
  workouts,
  includeInBudget,
  canToggleBudget,
  onToggleBudget,
  onOpenSteps,
  onOpenWorkouts,
  onQuickLogWorkout,
}) => {
  const language = useLanguage();
  const isRtl = useIsRTL();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const t = useCallback((key: string) => translate(language, key), [language]);

  const stepSummary = useMemo(
    () => calculateStepTelemetry(steps, nonWorkoutSteps, weightKg, stepGoal, t),
    [steps, nonWorkoutSteps, weightKg, stepGoal, t]
  );

  const workoutSummary = useMemo(
    () => summarizeWorkoutsTelemetry(workouts, workoutCalories),
    [workouts, workoutCalories]
  );

  const totalBurnKcal = workoutCalories + stepCalories;

  // Animated progress bar width for Steps
  const stepBarProgress = useSharedValue(stepSummary.progressRatio);
  useEffect(() => {
    if (isReducedMotion()) {
      stepBarProgress.value = stepSummary.progressRatio;
    } else {
      stepBarProgress.value = withTiming(stepSummary.progressRatio, {
        duration: 700,
        easing: Easing.out(Easing.cubic),
      });
    }
  }, [stepSummary.progressRatio, stepBarProgress]);

  const stepBarFillStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      width: `${Math.max(0, Math.min(100, stepBarProgress.value * 100))}%`,
    };
  });

  // Animated thumb position for the "In Budget" pill switch
  const switchVal = useSharedValue(includeInBudget ? 1 : 0);
  const rtlSign = useSharedValue(isRtl ? -1 : 1);
  useEffect(() => {
    rtlSign.value = isRtl ? -1 : 1;
  }, [isRtl, rtlSign]);

  useEffect(() => {
    if (isReducedMotion()) {
      switchVal.value = includeInBudget ? 1 : 0;
    } else {
      switchVal.value = withSpring(includeInBudget ? 1 : 0, getSpringConfig('tactile'));
    }
  }, [includeInBudget, switchVal]);

  const switchThumbStyle = useAnimatedStyle(() => {
    'worklet';
    const travel = 12;
    return {
      transform: [{ translateX: rtlSign.value * switchVal.value * travel }],
    };
  });

  const handleOpenSteps = () => {
    Haptics.selectionAsync().catch(() => {});
    onOpenSteps();
  };

  const handleOpenWorkouts = () => {
    Haptics.selectionAsync().catch(() => {});
    onOpenWorkouts();
  };

  const handleQuickLog = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onQuickLogWorkout();
  };

  return (
    <View style={styles.card}>
      {/* Header Row: Glowing Flame Badge + Total Kcal + Redesigned Interactive In-Budget Pill Switch */}
      <View style={[styles.headerRow, isRtl && styles.rowRtl]}>
        <View style={[styles.headerLeft, isRtl && styles.rowRtl]}>
          <View style={styles.flameGlowBadge}>
            <Flame size={17} color={theme.colors.calorieOverflowAmber} />
          </View>
          <View style={styles.titleBlock}>
            <Text style={styles.eyebrowTitle} numberOfLines={1}>
              {t('Active Burn')}
            </Text>
            <Text style={styles.totalKcalText} numberOfLines={1}>
              {totalBurnKcal.toLocaleString()}{' '}
              <Text style={styles.totalKcalUnit}>{t('kcal total')}</Text>
            </Text>
          </View>
        </View>

        {canToggleBudget && (
          <TouchableOpacity
            style={[
              styles.budgetPillBtn,
              includeInBudget ? styles.budgetPillOn : styles.budgetPillOff,
              isRtl && styles.rowRtl,
            ]}
            onPress={onToggleBudget}
            activeOpacity={0.8}
            accessibilityRole="switch"
            accessibilityLabel={t('Include activity burn in calorie budget')}
            accessibilityState={{ checked: includeInBudget }}
            hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
          >
            <View
              style={[
                styles.switchTrack,
                includeInBudget ? styles.switchTrackOn : styles.switchTrackOff,
                isRtl && styles.rowRtl,
              ]}
            >
              <Animated.View
                style={[
                  styles.switchThumb,
                  includeInBudget ? styles.switchThumbOn : styles.switchThumbOff,
                  switchThumbStyle,
                ]}
              />
            </View>
            <Text
              style={[
                styles.budgetPillText,
                includeInBudget ? styles.budgetPillTextOn : styles.budgetPillTextOff,
              ]}
              numberOfLines={1}
            >
              {includeInBudget ? t('In Budget: ON') : t('In Budget: OFF')}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Steps Telemetry Sub-Card (Full-width row placed above Workouts so it stays clear of FAB) */}
      <AnimatedPressable
        style={styles.subCard}
        onPress={handleOpenSteps}
        minScale={0.98}
        hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
        accessibilityRole="button"
        accessibilityLabel={`${t('Steps')}: ${stepSummary.steps.toLocaleString()} / ${stepSummary.stepGoal.toLocaleString()}, ${stepCalories} ${t('kcal')}`}
      >
        <View style={[styles.subCardTopRow, isRtl && styles.rowRtl]}>
          <View style={[styles.subCardTitleGroup, isRtl && styles.rowRtl]}>
            <View style={[styles.subIconPill, styles.stepsIconPill]}>
              <Footprints size={13} color={theme.colors.stepsAccent} />
            </View>
            <Text style={styles.subCardLabel} numberOfLines={1}>
              {t('Steps')}
            </Text>
            <View style={[styles.pctBadge, stepSummary.isGoalMet && styles.pctBadgeMet, isRtl && styles.rowRtl]}>
              {stepSummary.isGoalMet && (
                <Check size={10} color={theme.colors.emerald} strokeWidth={3} />
              )}
              <Text style={[styles.pctBadgeText, stepSummary.isGoalMet && styles.pctBadgeTextMet]}>
                {`${stepSummary.completionPercent}%`}
              </Text>
            </View>
          </View>

          <View style={[styles.subCardRightMetrics, isRtl && styles.rowRtl]}>
            <Text style={styles.subKcalValue}>
              {stepCalories.toLocaleString()} <Text style={styles.subKcalUnit}>{t('kcal')}</Text>
            </Text>
          </View>
        </View>

        <View style={[styles.progressRow, isRtl && styles.rowRtl]}>
          <View style={[styles.progressTrack, isRtl && styles.rowRtl]}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  backgroundColor: stepSummary.isGoalMet
                    ? theme.colors.emerald
                    : theme.colors.stepsAccent,
                },
                stepBarFillStyle,
              ]}
            />
          </View>
          <Text style={styles.stepsFractionText} numberOfLines={1}>
            {`${stepSummary.steps.toLocaleString()} / ${stepSummary.stepGoal.toLocaleString()}`}
          </Text>
        </View>
      </AnimatedPressable>

      {/* Workouts Telemetry Sub-Card with summary badge and quick "+ Log" action */}
      <View style={styles.subCard}>
        <View style={[styles.subCardTopRow, isRtl && styles.rowRtl]}>
          <TouchableOpacity
            style={[styles.subCardTitleGroup, isRtl && styles.rowRtl]}
            onPress={handleOpenWorkouts}
            activeOpacity={0.75}
            hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
            accessibilityRole="button"
            accessibilityLabel={`${t('Workouts')}: ${workoutCalories} ${t('kcal')}, ${workoutSummary.count} ${t('logged')}`}
          >
            <View style={[styles.subIconPill, styles.workoutsIconPill]}>
              <Dumbbell size={13} color={theme.colors.workoutsAccent} />
            </View>
            <Text style={styles.subCardLabel} numberOfLines={1}>
              {t('Workouts')}
            </Text>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText} numberOfLines={1}>
                {workoutSummary.count > 0
                  ? `${workoutSummary.count} ${t('logged')}`
                  : t('0 logged')}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickLogChip, isRtl && styles.rowRtl]}
            onPress={handleQuickLog}
            activeOpacity={0.75}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={`${t('Log')} ${t('Workouts')}`}
          >
            <Plus size={12} color={theme.colors.emerald} strokeWidth={2.8} />
            <Text style={styles.quickLogText} numberOfLines={1}>
              {t('Log')}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.workoutBottomRow, isRtl && styles.rowRtl]}
          onPress={handleOpenWorkouts}
          activeOpacity={0.75}
          hitSlop={{ top: 4, bottom: 6, left: 4, right: 4 }}
          accessibilityRole="button"
          accessibilityLabel={`${t('Workouts')}: ${workoutCalories} ${t('kcal')}`}
        >
          <Text style={styles.subKcalValue}>
            {workoutCalories.toLocaleString()} <Text style={styles.subKcalUnit}>{t('kcal')}</Text>
          </Text>

          <View style={styles.summaryMetaBadge}>
            <Text style={styles.summaryMetaText} numberOfLines={1}>
              {workoutSummary.count > 0 && workoutSummary.primaryCategoryKey
                ? `${workoutSummary.totalMinutes} ${t('min')} · ${t(workoutSummary.primaryCategoryKey)}`
                : t('Tap to log')}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Budget Explanation Footer (padded on trailing edge to clear floating green + FAB corner) */}
      <View style={[styles.footerBanner, isRtl && styles.rowRtl]}>
        <Text style={styles.footerText} numberOfLines={2}>
          {includeInBudget
            ? `${t('Active burn added to food budget')}: +${totalBurnKcal} ${t('kcal')} (${workoutCalories} ${t('Workouts')} + ${stepCalories} ${t('Steps')})`
            : `${totalBurnKcal} ${t('kcal burned')} · ${t('tracked as burn, not in food budget')}`}
        </Text>
      </View>
    </View>
  );
});
ActiveBurnCard.displayName = 'ActiveBurnCard';

const createStyles = (theme: ThemeType) =>
  StyleSheet.create({
    card: {
      backgroundColor: theme.colors.glassCardBg,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.colors.glassCardBorder,
      padding: 12,
      marginTop: 10,
      marginBottom: 14,
      gap: 8,
      ...theme.shadow.subtle,
    },
    rowRtl: {
      flexDirection: 'row-reverse',
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    headerLeft: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      minWidth: 0,
    },
    flameGlowBadge: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: theme.colors.flameGlowBg,
      borderWidth: 1,
      borderColor: theme.colors.flameGlowBorder,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: theme.colors.calorieOverflowAmber,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.35,
      shadowRadius: 6,
      elevation: 4,
    },
    titleBlock: {
      flex: 1,
      minWidth: 0,
    },
    eyebrowTitle: {
      fontFamily: theme.fonts.sans,
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.calendarDaySubText,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      includeFontPadding: false,
    },
    totalKcalText: {
      fontFamily: theme.fonts.serif,
      fontSize: 19,
      fontWeight: '800',
      color: theme.colors.calendarDayText,
      includeFontPadding: false,
      marginTop: 1,
    },
    totalKcalUnit: {
      fontFamily: theme.fonts.sans,
      fontSize: 12,
      fontWeight: '500',
      color: theme.colors.calendarDaySubText,
    },
    budgetPillBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      height: 30,
      paddingHorizontal: 9,
      borderRadius: theme.radius.full,
      borderWidth: 1,
      flexShrink: 0,
    },
    budgetPillOn: {
      backgroundColor: theme.colors.budgetOnBg,
      borderColor: theme.colors.budgetOnBorder,
    },
    budgetPillOff: {
      backgroundColor: theme.colors.budgetOffBg,
      borderColor: theme.colors.budgetOffBorder,
    },
    switchTrack: {
      width: 26,
      height: 14,
      borderRadius: 7,
      padding: 2,
      flexDirection: 'row',
      alignItems: 'center',
    },
    switchTrackOn: {
      backgroundColor: theme.colors.emerald,
    },
    switchTrackOff: {
      backgroundColor: theme.colors.glassControlBorder,
    },
    switchThumb: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    switchThumbOn: {
      backgroundColor: theme.colors.white,
    },
    switchThumbOff: {
      backgroundColor: theme.colors.calendarDaySubText,
    },
    budgetPillText: {
      fontSize: 12,
      fontWeight: '700',
      includeFontPadding: false,
    },
    budgetPillTextOn: {
      color: theme.colors.budgetOnText,
    },
    budgetPillTextOff: {
      color: theme.colors.budgetOffText,
    },
    subCard: {
      backgroundColor: theme.colors.glassSubCardBg,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.colors.glassSubCardBorder,
      paddingVertical: 10,
      paddingHorizontal: 12,
      gap: 7,
    },
    subCardTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    subCardTitleGroup: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      minWidth: 0,
    },
    subIconPill: {
      width: 24,
      height: 24,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.glassControlBg,
    },
    stepsIconPill: {
      borderWidth: 1,
      borderColor: theme.colors.glassSubCardBorder,
    },
    workoutsIconPill: {
      borderWidth: 1,
      borderColor: theme.colors.glassSubCardBorder,
    },
    subCardLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.calendarDayText,
      includeFontPadding: false,
    },
    pctBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.glassControlBg,
    },
    pctBadgeMet: {
      backgroundColor: theme.colors.budgetOnBg,
      borderWidth: 1,
      borderColor: theme.colors.budgetOnBorder,
    },
    pctBadgeText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.calendarDaySubText,
      includeFontPadding: false,
    },
    pctBadgeTextMet: {
      color: theme.colors.emerald,
    },
    subCardRightMetrics: {
      flexDirection: 'row',
      alignItems: 'center',
      flexShrink: 0,
    },
    subKcalValue: {
      fontSize: 14,
      fontWeight: '800',
      color: theme.colors.calendarDayText,
      includeFontPadding: false,
    },
    subKcalUnit: {
      fontSize: 12,
      fontWeight: '500',
      color: theme.colors.calendarDaySubText,
    },
    progressRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    progressTrack: {
      flex: 1,
      height: 6,
      borderRadius: 3,
      backgroundColor: theme.colors.glassControlBg,
      overflow: 'hidden',
      flexDirection: 'row',
    },
    progressFill: {
      height: '100%',
      borderRadius: 3,
    },
    stepsFractionText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.calendarDaySubText,
      includeFontPadding: false,
      flexShrink: 0,
    },
    countBadge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.glassControlBg,
    },
    countBadgeText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.calendarDaySubText,
      includeFontPadding: false,
    },
    quickLogChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.budgetOnBg,
      borderWidth: 1,
      borderColor: theme.colors.budgetOnBorder,
      flexShrink: 0,
    },
    quickLogText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.emerald,
      includeFontPadding: false,
    },
    workoutBottomRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    summaryMetaBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
      backgroundColor: theme.colors.glassControlBg,
      flexShrink: 1,
    },
    summaryMetaText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.calendarDaySubText,
      includeFontPadding: false,
    },
    footerBanner: {
      paddingTop: 6,
      paddingEnd: 60,
      borderTopWidth: 1,
      borderTopColor: theme.colors.glassSubCardBorder,
      minHeight: 34,
      justifyContent: 'center',
    },
    footerText: {
      fontSize: 12,
      fontWeight: '500',
      color: theme.colors.calendarDaySubText,
      lineHeight: 16,
    },
  });
