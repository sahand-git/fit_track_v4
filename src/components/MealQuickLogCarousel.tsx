import React, { useCallback } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Plus } from 'lucide-react-native';
import { AppLanguage, FoodItem } from '../types';
import { useTheme } from '../theme/ThemeContext';
import { ThemeType } from '../theme';
import { getLocalizedFoodName } from '../utils/foodLocalization';
import { getFoodEmoji } from '../utils/foodCategories';
import { translate } from '../i18n/strings';
import { AnimatedPressable } from './AnimatedPressable';

interface MealQuickLogCarouselProps {
  foods: FoodItem[];
  onQuickLog: (food: FoodItem) => void;
  disabled?: boolean;
  language: AppLanguage;
  isRtl?: boolean;
}

const styleCache = new Map<ThemeType, ReturnType<typeof createStyles>>();

function getQuickLogStyles(theme: ThemeType): ReturnType<typeof createStyles> {
  let cached = styleCache.get(theme);
  if (!cached) {
    cached = createStyles(theme);
    styleCache.set(theme, cached);
  }
  return cached;
}

export const MealQuickLogCarousel: React.FC<MealQuickLogCarouselProps> = React.memo(({
  foods,
  onQuickLog,
  disabled = false,
  language,
  isRtl = false,
}) => {
  const { theme } = useTheme();
  const styles = getQuickLogStyles(theme);
  const t = useCallback((value: string) => translate(language, value), [language]);

  const handlePress = useCallback(
    (food: FoodItem) => {
      if (disabled) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      onQuickLog(food);
    },
    [disabled, onQuickLog],
  );

  const renderChip = useCallback(
    ({ item }: { item: FoodItem }) => {
      const displayName = getLocalizedFoodName(item, language);
      const emoji = getFoodEmoji(item.name, item.category);
      const kcalRounded = Math.round(item.calories);

      return (
        <AnimatedPressable
          style={[
            styles.chipCard,
            isRtl && styles.rowRtl,
            disabled && styles.chipDisabled,
          ]}
          onPress={() => handlePress(item)}
          disabled={disabled}
          minScale={0.94}
          hitSlop={{ top: 6, bottom: 6, left: 2, right: 2 }}
          accessibilityRole="button"
          accessibilityLabel={`${t('Quick Log')}: ${displayName}, ${kcalRounded} ${t('kcal')}`}
        >
          <View style={styles.emojiBadge}>
            <Text style={styles.emojiText}>{emoji}</Text>
          </View>
          <Text
            style={[styles.chipName, isRtl && styles.rtlText]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {displayName}
          </Text>
          <Text style={styles.chipMeta} numberOfLines={1}>
            • {kcalRounded} {t('kcal')}
          </Text>
          <View style={styles.plusBadge}>
            <Plus size={13} color={theme.colors.emeraldDark} strokeWidth={2.75} />
          </View>
        </AnimatedPressable>
      );
    },
    [disabled, handlePress, isRtl, language, styles, t, theme.colors.emeraldDark],
  );

  const keyExtractor = useCallback((item: FoodItem) => item.id, []);

  if (!foods.length) return null;

  return (
    <View style={styles.container}>
      <FlatList
        data={foods}
        renderItem={renderChip}
        keyExtractor={keyExtractor}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
      />
    </View>
  );
});

MealQuickLogCarousel.displayName = 'MealQuickLogCarousel';

function createStyles(theme: ThemeType) {
  return StyleSheet.create({
    container: {
      paddingVertical: 4,
    },
    listContent: {
      paddingHorizontal: 14,
      gap: 8,
      alignItems: 'center',
    },
    rowRtl: {
      flexDirection: 'row-reverse',
    },
    rtlText: {
      textAlign: 'right',
      writingDirection: 'rtl',
    },
    chipCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      backgroundColor: theme.colors.diaryQuickChipBg,
      borderColor: theme.colors.diaryQuickChipBorder,
      borderWidth: 1,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 7,
      maxWidth: 270,
    },
    chipDisabled: {
      opacity: 0.48,
    },
    emojiBadge: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: theme.colors.glassSubCardBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emojiText: {
      fontSize: 14,
    },
    chipName: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.textPrimary,
      maxWidth: 138,
      flexShrink: 1,
    },
    chipMeta: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.textSecondary,
      fontVariant: ['tabular-nums'],
    },
    plusBadge: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: theme.colors.emeraldLight,
      borderWidth: 1,
      borderColor: theme.colors.emeraldBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
