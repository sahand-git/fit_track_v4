import React, { useMemo, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  PanResponder,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Trash2, X } from 'lucide-react-native';
import { LoggedMeal, AppLanguage } from '../types';
import { useTheme } from '../theme/ThemeContext';
import { ThemeType } from '../theme';
import { translate } from '../i18n/strings';
import { getLocalizedFoodName } from '../utils/foodLocalization';
import { getCompactFoodSourceBadgeInfo } from '../utils/foodSource';
import { formatServingWithGrams } from '../utils/formatServing';
import { getSpringConfig, getTimingConfig } from '../utils/reanimatedMotion';
import { isReducedMotion } from '../utils/motion';
import { FoodThumbnail } from './FoodThumbnail';

interface FoodLogSwipeableRowProps {
  item: LoggedMeal;
  language: AppLanguage;
  onPress?: (item: LoggedMeal) => void;
  onDelete: (id: string, viaSwipe?: boolean) => void;
  isRtl: boolean;
  disabled?: boolean;
}

const SWIPE_THRESHOLD = 72;
const MAX_SWIPE = 128;

const styleCache = new Map<ThemeType, ReturnType<typeof createStyles>>();

function getRowStyles(theme: ThemeType): ReturnType<typeof createStyles> {
  let cached = styleCache.get(theme);
  if (!cached) {
    cached = createStyles(theme);
    styleCache.set(theme, cached);
  }
  return cached;
}

export const FoodLogSwipeableRow: React.FC<FoodLogSwipeableRowProps> = React.memo(({
  item,
  language,
  onPress,
  onDelete,
  isRtl,
  disabled = false,
}) => {
  const { theme } = useTheme();
  const styles = getRowStyles(theme);
  const t = useCallback((value: string) => translate(language, value), [language]);

  const translateX = useSharedValue(0);
  const isDeletingRef = useRef(false);
  const isRtlRef = useRef(isRtl);
  const disabledRef = useRef(disabled);
  const onDeleteRef = useRef(onDelete);
  const itemIdRef = useRef(item.id);

  useEffect(() => {
    isRtlRef.current = isRtl;
    disabledRef.current = disabled;
    onDeleteRef.current = onDelete;
    itemIdRef.current = item.id;
  }, [disabled, isRtl, item.id, onDelete]);

  useEffect(() => {
    isDeletingRef.current = false;
    translateX.value = 0;
  }, [item.id, translateX]);

  const triggerSwipeDelete = () => {
    if (isDeletingRef.current) return;
    isDeletingRef.current = true;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onDeleteRef.current(itemIdRef.current, true);
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponderCapture: (_, gs) => {
          if (disabledRef.current || isDeletingRef.current) return false;
          const isHorizontal =
            Math.abs(gs.dx) > 10 && Math.abs(gs.dx) > Math.abs(gs.dy) * 1.4;
          if (!isHorizontal) return false;
          // LTR deletes on swipe-left (dx < 0); RTL deletes on swipe-right (dx > 0)
          return isRtlRef.current ? gs.dx > 8 : gs.dx < -8;
        },
        onPanResponderMove: (_, gs) => {
          if (disabledRef.current || isDeletingRef.current) return;
          const clamped = isRtlRef.current
            ? Math.max(0, Math.min(MAX_SWIPE, gs.dx))
            : Math.min(0, Math.max(-MAX_SWIPE, gs.dx));
          translateX.value = clamped;
        },
        onPanResponderTerminationRequest: () => false,
        onPanResponderRelease: (_, gs) => {
          if (disabledRef.current || isDeletingRef.current) return;
          const swipedEnough = isRtlRef.current
            ? gs.dx > SWIPE_THRESHOLD || gs.vx > 0.65
            : gs.dx < -SWIPE_THRESHOLD || gs.vx < -0.65;

          if (swipedEnough) {
            const targetOffset = isRtlRef.current ? 180 : -180;
            translateX.value = withTiming(
              targetOffset,
              getTimingConfig(isReducedMotion() ? 0 : 150),
              (finished) => {
                if (finished) {
                  runOnJS(triggerSwipeDelete)();
                }
              },
            );
          } else {
            translateX.value = withSpring(0, getSpringConfig('tactile'));
          }
        },
        onPanResponderTerminate: () => {
          if (!isDeletingRef.current) {
            translateX.value = withSpring(0, getSpringConfig('tactile'));
          }
        },
      }),
    [translateX],
  );

  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const displayName = getLocalizedFoodName(item, language);
  const portionLabel = formatServingWithGrams(
    item.servingSize,
    item.servingGrams,
    item.servings,
  );
  const compactBadge = getCompactFoodSourceBadgeInfo(item.source, item.sourceRef, t);

  const badgeDotColor = compactBadge
    ? compactBadge.type === 'verified'
      ? theme.colors.emeraldDark
      : compactBadge.type === 'estimate'
        ? theme.colors.amberText
        : compactBadge.type === 'off'
          ? theme.colors.stepsAccent
          : theme.colors.textSecondary
    : theme.colors.textMuted;

  const badgeTextColor = compactBadge
    ? compactBadge.type === 'verified'
      ? theme.colors.macroPillProteinText
      : compactBadge.type === 'estimate'
        ? theme.colors.macroPillCarbsText
        : compactBadge.type === 'off'
          ? theme.colors.stepsAccent
          : theme.colors.textSecondary
    : theme.colors.textMuted;

  const roundedKcal = Math.round(item.calories);
  const roundedP = Math.round(item.protein);
  const roundedC = Math.round(item.carbs);
  const roundedF = Math.round(item.fat);
  const gramUnit = t('g');

  return (
    <View style={styles.swipeWrapper}>
      {/* Swipe-to-Delete Crimson Underlay */}
      <View
        style={[
          styles.deleteBackdrop,
          isRtl ? styles.deleteBackdropRtl : styles.deleteBackdropLtr,
        ]}
        pointerEvents="none"
      >
        <View style={[styles.deleteBackdropContent, isRtl && styles.rowRtl]}>
          <Trash2 size={17} color={theme.colors.white} strokeWidth={2.2} />
          <Text style={styles.deleteBackdropText}>{t('Delete')}</Text>
        </View>
      </View>

      {/* Foreground Compact 2-Row Card */}
      <Animated.View style={animatedCardStyle} {...panResponder.panHandlers}>
        <TouchableOpacity
          activeOpacity={0.82}
          onPress={() => onPress?.(item)}
          style={[styles.cardContainer, isRtl && styles.rowRtl]}
          accessibilityRole="button"
          accessibilityLabel={`${displayName}, ${portionLabel}, ${roundedKcal} ${t('kcal')}, ${t('P')} ${roundedP}${gramUnit}, ${t('C')} ${roundedC}${gramUnit}, ${t('F')} ${roundedF}${gramUnit}`}
        >
          <FoodThumbnail
            name={displayName}
            englishName={item.name}
            foodId={item.foodId}
            category={item.category}
            imageUrl={item.imageUrl}
            size="compact"
          />

          <View style={styles.centerColumn}>
            {/* Row 1: Full Food Title + Compact Source Tag */}
            <View style={[styles.titleRow, isRtl && styles.rowRtl]}>
              <Text
                style={[styles.foodTitle, isRtl && styles.rtlText]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.86}
              >
                {displayName}
              </Text>
              {compactBadge && (
                <View style={[styles.sourceTag, isRtl && styles.rowRtl]}>
                  <View style={[styles.sourceDot, { backgroundColor: badgeDotColor }]} />
                  <Text style={[styles.sourceTagText, { color: badgeTextColor }]} numberOfLines={1}>
                    {compactBadge.label}
                  </Text>
                </View>
              )}
            </View>

            {/* Row 2: Portion Text + Color-Coded Macro Pills (never truncated) */}
            <View style={[styles.metaRow, isRtl && styles.rowRtl]}>
              {portionLabel ? (
                <Text style={[styles.portionText, isRtl && styles.rtlText]} numberOfLines={1}>
                  {portionLabel}
                </Text>
              ) : null}

              <View style={[styles.macroPillsRow, isRtl && styles.rowRtl]}>
                <View style={[styles.macroPill, styles.proteinPill]}>
                  <Text style={[styles.macroPillText, styles.proteinText]}>
                    {t('P')} {roundedP}
                    {gramUnit}
                  </Text>
                </View>
                <View style={[styles.macroPill, styles.carbsPill]}>
                  <Text style={[styles.macroPillText, styles.carbsText]}>
                    {t('C')} {roundedC}
                    {gramUnit}
                  </Text>
                </View>
                <View style={[styles.macroPill, styles.fatPill]}>
                  <Text style={[styles.macroPillText, styles.fatText]}>
                    {t('F')} {roundedF}
                    {gramUnit}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Trailing Stacked Calorie Readout + Subtle Quick-Remove */}
          <View style={[styles.trailingColumn, isRtl && styles.trailingColumnRtl]}>
            <View style={[styles.kcalTopRow, isRtl && styles.rowRtl]}>
              <Text style={styles.kcalValue} numberOfLines={1}>
                {roundedKcal}
              </Text>
              {!disabled && (
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                    onDelete(item.id, false);
                  }}
                  style={styles.quickDeleteBtn}
                  hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel={`${t('Delete')} ${displayName}`}
                >
                  <X size={13} color={theme.colors.textMuted} strokeWidth={2.3} />
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.kcalUnit} numberOfLines={1}>
              {t('kcal')}
            </Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
});

FoodLogSwipeableRow.displayName = 'FoodLogSwipeableRow';

function createStyles(theme: ThemeType) {
  return StyleSheet.create({
    swipeWrapper: {
      position: 'relative',
      borderRadius: 14,
      overflow: 'hidden',
    },
    deleteBackdrop: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      backgroundColor: theme.colors.danger,
      borderRadius: 14,
      justifyContent: 'center',
      paddingHorizontal: 18,
    },
    deleteBackdropLtr: {
      alignItems: 'flex-end',
    },
    deleteBackdropRtl: {
      alignItems: 'flex-start',
    },
    deleteBackdropContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    deleteBackdropText: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.white,
    },
    cardContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: theme.colors.diaryLoggedRowBg,
      borderWidth: 1,
      borderColor: theme.colors.diaryLoggedRowBorder,
      borderRadius: 14,
      paddingHorizontal: 11,
      paddingVertical: 10,
    },
    rowRtl: {
      flexDirection: 'row-reverse',
    },
    rtlText: {
      textAlign: 'right',
      writingDirection: 'rtl',
    },
    centerColumn: {
      flex: 1,
      minWidth: 0,
      gap: 5,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    foodTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.colors.textPrimary,
      flexShrink: 1,
    },
    sourceTag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: theme.colors.glassControlBg,
      borderRadius: 6,
      paddingHorizontal: 5,
      paddingVertical: 2,
      flexShrink: 0,
    },
    sourceDot: {
      width: 5,
      height: 5,
      borderRadius: 3,
    },
    sourceTagText: {
      fontSize: 12,
      fontWeight: '600',
    },
    metaRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 5,
    },
    portionText: {
      fontSize: 12,
      fontWeight: '500',
      color: theme.colors.textSecondary,
    },
    macroPillsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      flexWrap: 'wrap',
    },
    macroPill: {
      borderRadius: 6,
      borderWidth: 1,
      paddingHorizontal: 6,
      paddingVertical: 1,
    },
    macroPillText: {
      fontSize: 12,
      fontWeight: '700',
      fontVariant: ['tabular-nums'],
    },
    proteinPill: {
      backgroundColor: theme.colors.macroPillProteinBg,
      borderColor: theme.colors.macroPillProteinBorder,
    },
    proteinText: {
      color: theme.colors.macroPillProteinText,
    },
    carbsPill: {
      backgroundColor: theme.colors.macroPillCarbsBg,
      borderColor: theme.colors.macroPillCarbsBorder,
    },
    carbsText: {
      color: theme.colors.macroPillCarbsText,
    },
    fatPill: {
      backgroundColor: theme.colors.macroPillFatBg,
      borderColor: theme.colors.macroPillFatBorder,
    },
    fatText: {
      color: theme.colors.macroPillFatText,
    },
    trailingColumn: {
      alignItems: 'flex-end',
      justifyContent: 'center',
      flexShrink: 0,
      marginStart: 2,
    },
    trailingColumnRtl: {
      alignItems: 'flex-start',
    },
    kcalTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    kcalValue: {
      fontSize: 16,
      fontWeight: '800',
      color: theme.colors.textPrimary,
      fontVariant: ['tabular-nums'],
    },
    kcalUnit: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.textMuted,
      marginTop: 1,
    },
    quickDeleteBtn: {
      width: 22,
      height: 22,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.glassControlBg,
    },
  });
}
