import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { AppText as Text } from './AppText';
import { Trash2 } from 'lucide-react-native';
import { LoggedMeal, AppLanguage } from '../types';
import { FoodThumbnail } from './FoodThumbnail';
import { FoodSourceBadge } from './FoodSourceBadge';
import { getLocalizedFoodName } from '../utils/foodLocalization';
import { formatKcal } from '../utils/formatKcal';
import { ThemeType } from '../theme';
import * as Haptics from 'expo-haptics';

interface FoodLogSwipeableRowProps {
  item: LoggedMeal;
  language: AppLanguage;
  t: (key: string) => string;
  theme: ThemeType;
  isRtl: boolean;
  onInspect: (item: LoggedMeal) => void;
  onDelete: (mealId: string) => void;
  idx?: number;
}

export const FoodLogSwipeableRow: React.FC<FoodLogSwipeableRowProps> = React.memo(({
  item,
  language,
  t,
  theme,
  isRtl,
  onInspect,
  onDelete,
}) => {
  const styles = createStyles(theme);

  const handleCardPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onInspect(item);
  };

  const handleDeletePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onDelete(item.id);
  };

  const displayName = getLocalizedFoodName(item, language);
  const macroText = `${t('Protein')} ${item.protein}g · ${t('Carbs')} ${item.carbs}g · ${t('Fat')} ${item.fat}g`;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.cardContent}
        onPress={handleCardPress}
        activeOpacity={0.88}
        accessibilityRole="button"
        accessibilityLabel={`${displayName}, ${formatKcal(item.calories, t)}`}
      >
        {/* 48dp Medium Thumbnail */}
        <FoodThumbnail
          name={displayName}
          englishName={item.name}
          foodId={item.foodId}
          category={item.category}
          imageUrl={item.imageUrl}
          size="medium"
          style={{ marginEnd: 12 }}
        />

        <View style={styles.infoCol}>
          <View style={styles.titleRow}>
            <Text style={styles.foodName} numberOfLines={2}>
              {displayName}
            </Text>
            {item.source && (
              <FoodSourceBadge
                source={item.source}
                sourceRef={item.sourceRef}
                size="small"
              />
            )}
          </View>

          <Text style={styles.foodPortion} numberOfLines={1}>
            {item.servings} × {item.servingSize}
          </Text>

          {/* Clean Labeled Macro Text */}
          <Text style={styles.foodMacros} numberOfLines={1}>
            {macroText}
          </Text>
        </View>

        {/* Right Action Cluster: Calorie Pill + Explicit Delete Button */}
        <View style={styles.rightActions}>
          <View style={styles.kcalPill}>
            <Text style={styles.kcalValue}>{Math.round(item.calories)}</Text>
            <Text style={styles.kcalUnit}>{t('kcal')}</Text>
          </View>

          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={handleDeletePress}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`${t('Delete')} ${displayName}`}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Trash2 size={16} color={theme.colors.danger} strokeWidth={2.2} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </View>
  );
});

FoodLogSwipeableRow.displayName = 'FoodLogSwipeableRow';

const createStyles = (theme: ThemeType) =>
  StyleSheet.create({
    container: {
      marginVertical: 4,
      borderRadius: theme.radius.lg,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...theme.shadow.subtle,
      overflow: 'hidden',
    },
    cardContent: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 12,
    },
    infoCol: {
      flex: 1,
      marginEnd: 8,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 5,
    },
    foodName: {
      fontFamily: theme.fonts.sans,
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.textPrimary,
      lineHeight: 20,
    },
    foodPortion: {
      fontFamily: theme.fonts.sans,
      fontSize: 12,
      color: theme.colors.textMuted,
      marginTop: 1,
    },
    foodMacros: {
      fontFamily: theme.fonts.sans,
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginTop: 2,
      fontWeight: '500',
    },
    rightActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    kcalPill: {
      backgroundColor: theme.colors.surfaceSubtle,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 14,
      paddingVertical: 6,
      paddingHorizontal: 10,
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 54,
    },
    kcalValue: {
      fontFamily: theme.fonts.sans,
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.textPrimary,
      lineHeight: 17,
    },
    kcalUnit: {
      fontFamily: theme.fonts.sans,
      fontSize: 12,
      fontWeight: '500',
      color: theme.colors.textMuted,
      lineHeight: 14,
    },
    deleteBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: theme.colors.crimsonLight,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
