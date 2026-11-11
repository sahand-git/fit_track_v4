import React, { useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { X } from 'lucide-react-native';
import { LoggedMeal, AppLanguage } from '../types';
import { useTheme } from '../theme/ThemeContext';
import { ThemeType } from '../theme';
import { translate } from '../i18n/strings';
import { getLocalizedFoodName } from '../utils/foodLocalization';
import { formatServingWithGrams } from '../utils/formatServing';
import { FoodThumbnail } from './FoodThumbnail';

interface FoodLogSwipeableRowProps {
  item: LoggedMeal;
  language: AppLanguage;
  onPress?: (item: LoggedMeal) => void;
  onDelete: (id: string) => void;
  isRtl: boolean;
  disabled?: boolean;
  isLast?: boolean;
}

const styleCache = new Map<ThemeType, ReturnType<typeof createStyles>>();

function getRowStyles(theme: ThemeType): ReturnType<typeof createStyles> {
  let cached = styleCache.get(theme);
  if (!cached) {
    cached = createStyles(theme);
    styleCache.set(theme, cached);
  }
  return cached;
}

function isEstimatedSource(item: LoggedMeal): boolean {
  if (item.isEstimate) return true;
  return (
    item.source === 'ai_estimated' ||
    item.source === 'gemini' ||
    item.source === 'regional_culinary_estimate' ||
    item.source === 'generic_estimate'
  );
}

export const FoodLogSwipeableRow: React.FC<FoodLogSwipeableRowProps> = React.memo(({
  item,
  language,
  onPress,
  onDelete,
  isRtl,
  disabled = false,
  isLast = false,
}) => {
  const { theme } = useTheme();
  const styles = getRowStyles(theme);
  const t = useCallback((value: string) => translate(language, value), [language]);

  const displayName = getLocalizedFoodName(item, language);
  const portionLabel = formatServingWithGrams(
    item.servingSize,
    item.servingGrams,
    item.servings,
  );
  const showEstimateDot = isEstimatedSource(item);

  const roundedKcal = Math.round(item.calories);
  const roundedP = Math.round(item.protein);
  const roundedC = Math.round(item.carbs);
  const roundedF = Math.round(item.fat);
  const gramUnit = t('g');

  return (
    <View style={[styles.rowOuter, !isLast && styles.rowHairline]}>
      <View style={[styles.rowFlex, isRtl && styles.rowRtl]}>
        <Pressable
          onPress={() => onPress?.(item)}
          style={({ pressed }) => [
            styles.mainTouchArea,
            isRtl && styles.rowRtl,
            pressed && styles.rowPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={`${displayName}, ${portionLabel}, ${roundedKcal} ${t('kcal')}, ${t('P')} ${roundedP}${gramUnit}, ${t('C')} ${roundedC}${gramUnit}, ${t('F')} ${roundedF}${gramUnit}`}
        >
          {/* Left Column (42x42): Soft dark obsidian squircle */}
          <FoodThumbnail
            name={displayName}
            englishName={item.name}
            foodId={item.foodId}
            category={item.category}
            imageUrl={item.imageUrl}
            size="lux"
            style={styles.thumbSquircle}
          />

          {/* Center Column */}
          <View style={styles.centerColumn}>
            {/* Line 1: Food Name + subtle 6px dot only if estimated */}
            <View style={[styles.titleRow, isRtl && styles.rowRtl]}>
              <Text
                style={[styles.foodTitle, isRtl && styles.rtlText]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {displayName}
              </Text>
              {showEstimateDot && <View style={styles.estimateDot} />}
            </View>

            {/* Line 2: Portion size */}
            {portionLabel ? (
              <Text
                style={[styles.portionText, isRtl && styles.rtlText]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {portionLabel}
              </Text>
            ) : null}

            {/* Line 3: Whisper-quiet inline macro typography */}
            <View style={[styles.macroLine, isRtl && styles.rowRtl]}>
              <Text style={[styles.macroText, styles.proteinText]}>
                {t('P')} {roundedP}
                {gramUnit}
              </Text>
              <Text style={styles.macroSeparator}>·</Text>
              <Text style={[styles.macroText, styles.carbsText]}>
                {t('C')} {roundedC}
                {gramUnit}
              </Text>
              <Text style={styles.macroSeparator}>·</Text>
              <Text style={[styles.macroText, styles.fatText]}>
                {t('F')} {roundedF}
                {gramUnit}
              </Text>
            </View>
          </View>

          {/* Right Calorie Stack inside dedicated >=72px right column */}
          <View style={[styles.calorieColumn, isRtl && styles.calorieColumnRtl]}>
            <Text style={styles.kcalValue} numberOfLines={1}>
              {roundedKcal}
            </Text>
            <Text style={styles.kcalUnit} numberOfLines={1}>
              {t('kcal')}
            </Text>
          </View>
        </Pressable>

        {/* Dedicated Right Delete Icon Button (never overlaps calorie number) */}
        {!disabled && (
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              onDelete(item.id);
            }}
            style={({ pressed }) => [
              styles.deleteBtn,
              isRtl ? styles.deleteBtnRtl : styles.deleteBtnLtr,
              pressed && styles.deleteBtnPressed,
            ]}
            hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
            accessibilityRole="button"
            accessibilityLabel={`${t('Delete')} ${displayName}`}
          >
            {({ pressed }) => (
              <X
                size={16}
                color={pressed ? theme.colors.calorieOverflowRed : theme.colors.diarySubtleSlate}
                strokeWidth={2.2}
              />
            )}
          </Pressable>
        )}
      </View>
    </View>
  );
});

FoodLogSwipeableRow.displayName = 'FoodLogSwipeableRow';

function createStyles(theme: ThemeType) {
  return StyleSheet.create({
    rowOuter: {
      backgroundColor: theme.colors.diaryLoggedRowBg,
    },
    rowHairline: {
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.diaryHairlineDivider,
    },
    rowFlex: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 11,
      paddingHorizontal: 12,
    },
    mainTouchArea: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      minWidth: 0,
    },
    rowPressed: {
      opacity: 0.78,
    },
    rowRtl: {
      flexDirection: 'row-reverse',
    },
    rtlText: {
      textAlign: 'right',
      writingDirection: 'rtl',
    },
    thumbSquircle: {
      backgroundColor: theme.colors.diaryFoodIconBg,
      borderWidth: 0,
      flexShrink: 0,
    },
    centerColumn: {
      flex: 1,
      minWidth: 0,
      marginHorizontal: 12,
      gap: 2,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    foodTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.diaryBodyLight,
      flexShrink: 1,
    },
    estimateDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: theme.colors.diarySubtleSlate,
      flexShrink: 0,
    },
    portionText: {
      fontSize: 12,
      fontWeight: '400',
      color: theme.colors.diarySubtleSlate,
    },
    macroLine: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 5,
      marginTop: 2,
    },
    macroText: {
      fontSize: 12,
      fontWeight: '500',
      fontVariant: ['tabular-nums'],
    },
    macroSeparator: {
      fontSize: 12,
      color: theme.colors.diarySubtleSlate,
    },
    proteinText: {
      color: theme.colors.macroPillProteinText,
    },
    carbsText: {
      color: theme.colors.macroPillCarbsText,
    },
    fatText: {
      color: theme.colors.macroPillFatText,
    },
    calorieColumn: {
      minWidth: 44,
      alignItems: 'flex-end',
      justifyContent: 'center',
      flexShrink: 0,
    },
    calorieColumnRtl: {
      alignItems: 'flex-start',
    },
    kcalValue: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.diaryHeadingText,
      fontVariant: ['tabular-nums'],
    },
    kcalUnit: {
      fontSize: 12,
      fontWeight: '500',
      color: theme.colors.diarySubtleSlate,
    },
    deleteBtn: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    deleteBtnLtr: {
      marginLeft: 10,
    },
    deleteBtnRtl: {
      marginRight: 10,
    },
    deleteBtnPressed: {
      backgroundColor: theme.colors.diarySquircleBg,
    },
  });
}
