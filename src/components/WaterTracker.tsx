import React, { useMemo, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import Svg, { Path, Rect, Defs, ClipPath } from 'react-native-svg';
import { AppText as Text } from './AppText';
import { Droplet, Plus, Minus, Check, Sparkles } from 'lucide-react-native';
import { useLanguage } from '../i18n/I18nContext';
import { translate } from '../i18n/strings';
import { useTheme } from '../theme/ThemeContext';
import { ThemeType } from '../theme';
import * as Haptics from 'expo-haptics';
import { useAppDialog } from './dialogs/AppDialogProvider';
import { AnimatedPressable } from './AnimatedPressable';
import { isReducedMotion } from '../utils/motion';
import { getSpringConfig } from '../utils/reanimatedMotion';

interface WaterTrackerProps {
  glasses: number;
  target: number;
  onUpdate: (delta: number) => void;
}

const PRESETS = [
  { label: '180ml', ml: 180 },
  { label: '200ml', ml: 200 },
  { label: '330ml', ml: 330 },
  { label: '500ml', ml: 500 },
] as const;

export const WaterTracker: React.FC<WaterTrackerProps> = ({
  glasses,
  target,
  onUpdate,
}) => {
  const language = useLanguage();
  const { theme } = useTheme();
  const dialog = useAppDialog();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const t = (key: string) => translate(language, key);

  const currentMl = Math.round(glasses * 250);
  const targetMl = Math.round(target * 250);
  const currentLiters = (currentMl / 1000).toFixed(1);
  const targetLiters = (targetMl / 1000).toFixed(1);
  const isGoalReached = target > 0 && glasses >= target;
  const progressRatio = target > 0 ? Math.min(1.0, currentMl / targetMl) : 0;
  const percentText = `${Math.round(progressRatio * 100)}%`;

  // Reanimated fill height (0 to 76)
  const fillHeight = useSharedValue(progressRatio * 76);
  const splashOpacity = useSharedValue(0);
  const splashScale = useSharedValue(0.8);

  useEffect(() => {
    if (isReducedMotion()) {
      fillHeight.value = progressRatio * 76;
    } else {
      fillHeight.value = withSpring(progressRatio * 76, getSpringConfig('tactile'));
    }
  }, [progressRatio, fillHeight]);

  // Celebration splash on reaching goal
  useEffect(() => {
    if (isGoalReached && !isReducedMotion()) {
      splashOpacity.value = withSequence(
        withTiming(1, { duration: 150 }),
        withTiming(0, { duration: 800, easing: Easing.out(Easing.cubic) })
      );
      splashScale.value = withSequence(
        withTiming(1.2, { duration: 300, easing: Easing.out(Easing.back(2)) }),
        withTiming(1.0, { duration: 400 })
      );
    }
  }, [isGoalReached, splashOpacity, splashScale]);

  const splashAnimatedStyle = useAnimatedStyle(() => ({
    opacity: splashOpacity.value,
    transform: [{ scale: splashScale.value }],
  }));

  const handleAddMl = async (ml: number) => {
    const deltaGlasses = Math.round((ml / 250) * 100) / 100;
    if (target > 0 && (glasses + deltaGlasses) >= Math.round(target * 1.5)) {
      const confirmed = await dialog.confirm({
        title: t('High Water Intake'),
        message: t('You have logged over 150% of your daily water goal. Add another glass?'),
        confirmText: t('Add'),
        cancelText: t('Cancel'),
      });
      if (!confirmed) return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onUpdate(deltaGlasses);
  };

  const handleSubtractMl = (ml: number) => {
    if (glasses <= 0) return;
    const deltaGlasses = Math.round((ml / 250) * 100) / 100;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onUpdate(-deltaGlasses);
  };

  return (
    <View style={[styles.container, isGoalReached && styles.containerGoalReached]}>
      <View style={styles.topRow}>
        {/* Animated SVG Glass */}
        <View style={styles.glassContainer}>
          <Svg width={54} height={76} viewBox="0 0 54 76">
            <Defs>
              <ClipPath id="glassClip">
                <Path d="M 5 4 L 49 4 L 42 70 Q 42 74 38 74 L 16 74 Q 12 74 12 70 Z" />
              </ClipPath>
            </Defs>

            {/* Glass Background Track */}
            <Path
              d="M 5 4 L 49 4 L 42 70 Q 42 74 38 74 L 16 74 Q 12 74 12 70 Z"
              fill={theme.colors.surfaceSubtle}
              stroke={isGoalReached ? theme.colors.emeraldBorder : theme.colors.borderStrong}
              strokeWidth={1.5}
            />

            {/* Rising Liquid Fill */}
            <Rect
              x={0}
              y={74 - progressRatio * 70}
              width={54}
              height={progressRatio * 70}
              clipPath="url(#glassClip)"
              fill={isGoalReached ? theme.colors.emerald : theme.colors.water}
            />

            {/* Glass Top Rim */}
            <Path
              d="M 5 4 L 49 4"
              stroke={isGoalReached ? theme.colors.emerald : theme.colors.borderStrong}
              strokeWidth={2}
              strokeLinecap="round"
            />
          </Svg>

          {/* Percentage Overlay */}
          <View style={styles.glassPercentOverlay}>
            <Text
              style={[
                styles.glassPercentText,
                progressRatio > 0.5 && styles.glassPercentTextHigh,
              ]}
            >
              {percentText}
            </Text>
          </View>

          {/* Celebration Splash Particles */}
          <Animated.View style={[styles.splashBox, splashAnimatedStyle]} pointerEvents="none">
            <Sparkles size={16} color={theme.colors.amber} />
          </Animated.View>
        </View>

        {/* Info & Status */}
        <View style={styles.textContainer}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{t('Water Intake')}</Text>
            {isGoalReached && (
              <View style={styles.goalReachedBadge}>
                <Check size={12} color={theme.colors.emeraldDark} strokeWidth={2.5} />
                <Text style={styles.goalReachedText}>{t('Goal reached')}</Text>
              </View>
            )}
          </View>

          <Text style={[styles.subtitle, isGoalReached && styles.subtitleGoalReached]}>
            {isGoalReached
              ? `${currentMl}ml / ${targetMl}ml (${currentLiters}L / ${targetLiters}L) · ${t('Goal reached!')}`
              : `${currentMl}ml / ${targetMl}ml (${currentLiters}L / ${targetLiters}L)`}
          </Text>

          {/* ±50ml Stepper for Fine-Tuning */}
          <View style={styles.stepperRow}>
            <AnimatedPressable
              style={[styles.stepperBtn, glasses === 0 && styles.btnDisabled]}
              onPress={() => handleSubtractMl(50)}
              disabled={glasses === 0}
              accessibilityLabel={`${t('Remove')} 50ml`}
              accessibilityRole="button"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Minus size={13} color={glasses === 0 ? theme.colors.textMuted : theme.colors.textPrimary} />
              <Text style={styles.stepperLabel}>-50ml</Text>
            </AnimatedPressable>

            <AnimatedPressable
              style={[styles.stepperBtn, isGoalReached ? styles.stepperBtnGoal : styles.stepperBtnAdd]}
              onPress={() => handleAddMl(50)}
              accessibilityLabel={`${t('Add')} 50ml`}
              accessibilityRole="button"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Plus size={13} color={isGoalReached ? theme.colors.textPrimary : theme.colors.textInverted} />
              <Text
                style={[
                  styles.stepperLabel,
                  isGoalReached ? styles.stepperLabelGoal : styles.stepperLabelInverted,
                ]}
              >
                +50ml
              </Text>
            </AnimatedPressable>
          </View>
        </View>
      </View>

      {/* Quick-add Container Preset Buttons */}
      <View style={styles.presetsRow}>
        {PRESETS.map((p) => (
          <TouchableOpacity
            key={p.label}
            style={styles.presetChip}
            onPress={() => handleAddMl(p.ml)}
            accessibilityRole="button"
            accessibilityLabel={`${t('Add')} ${p.label}`}
            activeOpacity={0.75}
          >
            <Droplet size={12} color={theme.colors.water} />
            <Text style={styles.presetText}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const createStyles = (theme: ThemeType) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 14,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    containerGoalReached: {
      borderColor: theme.colors.emeraldBorder,
      backgroundColor: theme.colors.surface,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    glassContainer: {
      width: 54,
      height: 76,
      marginRight: theme.spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    glassPercentOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: 'center',
      justifyContent: 'center',
    },
    glassPercentText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.textPrimary,
    },
    glassPercentTextHigh: {
      color: theme.colors.white,
    },
    splashBox: {
      position: 'absolute',
      top: -6,
      right: -4,
    },
    textContainer: {
      flex: 1,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    title: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.textPrimary,
    },
    subtitle: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    subtitleGoalReached: {
      color: theme.colors.emeraldDark,
      fontWeight: '500',
    },
    goalReachedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: theme.colors.emeraldLight,
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: theme.radius.full,
    },
    goalReachedText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.emeraldDark,
    },
    stepperRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 8,
    },
    stepperBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.surfaceSubtle,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    stepperBtnAdd: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    stepperBtnGoal: {
      backgroundColor: theme.colors.emeraldLight,
      borderColor: theme.colors.emeraldBorder,
    },
    btnDisabled: {
      opacity: 0.4,
    },
    stepperLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.textPrimary,
    },
    stepperLabelInverted: {
      color: theme.colors.textInverted,
    },
    stepperLabelGoal: {
      color: theme.colors.emeraldDark,
    },
    presetsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
      marginTop: 12,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    presetChip: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      paddingVertical: 7,
      paddingHorizontal: 4,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.surfaceSubtle,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    presetText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.textPrimary,
    },
  });
