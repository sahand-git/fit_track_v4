import React, { useMemo } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { AppText as Text } from './AppText';
import { Plus } from 'lucide-react-native';
import { FoodItem, MealType } from '../types';
import { FoodThumbnail } from './FoodThumbnail';
import { useLanguage } from '../i18n/I18nContext';
import { translate } from '../i18n/strings';
import { getLocalizedFoodName } from '../utils/foodLocalization';
import { useTheme } from '../theme/ThemeContext';
import { ThemeType } from '../theme';
import * as Haptics from 'expo-haptics';
import { AnimatedPressable } from './AnimatedPressable';

interface MealQuickLogCarouselProps {
  mealType: MealType;
  recentFoods: FoodItem[];
  onQuickLog: (food: FoodItem) => void;
}

export const MealQuickLogCarousel: React.FC<MealQuickLogCarouselProps> = ({
  mealType,
  recentFoods,
  onQuickLog,
}) => {
  const language = useLanguage();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const t = (key: string) => translate(language, key);

  if (!recentFoods || recentFoods.length === 0) {
    return null;
  }

  const handleQuickLog = (food: FoodItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onQuickLog(food);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>{t('Quick Log')}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {recentFoods.slice(0, 8).map((food) => {
          const localizedName = getLocalizedFoodName(food, language);
          return (
            <AnimatedPressable
              key={food.id}
              style={styles.itemCard}
              onPress={() => handleQuickLog(food)}
              minScale={0.92}
              accessibilityRole="button"
              accessibilityLabel={`${t('Quick Log')} ${localizedName}`}
            >
              <View style={styles.thumbnailWrapper}>
                <FoodThumbnail
                  name={food.name}
                  category={food.category}
                  imageUrl={food.imageUrl}
                  size="small"
                />
                <View style={styles.addBadge}>
                  <Plus size={12} color={theme.colors.white} strokeWidth={2.5} />
                </View>
              </View>
              <Text style={styles.foodName} numberOfLines={1}>
                {localizedName}
              </Text>
              <Text style={styles.foodKcal}>
                {food.calories} {t('kcal')}
              </Text>
            </AnimatedPressable>
          );
        })}
      </ScrollView>
    </View>
  );
};

const createStyles = (theme: ThemeType) =>
  StyleSheet.create({
    container: {
      paddingVertical: 8,
      paddingHorizontal: 4,
    },
    sectionTitle: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 6,
      paddingHorizontal: 6,
    },
    scrollContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 4,
    },
    itemCard: {
      width: 72,
      alignItems: 'center',
      justifyContent: 'center',
    },
    thumbnailWrapper: {
      width: 48,
      height: 48,
      borderRadius: theme.radius.full,
      position: 'relative',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 4,
    },
    addBadge: {
      position: 'absolute',
      bottom: -2,
      right: -2,
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: theme.colors.emerald,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: theme.colors.surface,
    },
    foodName: {
      fontSize: 12,
      fontWeight: '500',
      color: theme.colors.textPrimary,
      textAlign: 'center',
      width: '100%',
    },
    foodKcal: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginTop: 1,
    },
  });
