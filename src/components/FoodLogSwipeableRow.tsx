import React, { useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  PanResponder,
  Animated,
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

const SWIPE_THRESHOLD = 76;

export const FoodLogSwipeableRow: React.FC<FoodLogSwipeableRowProps> = React.memo(({
  item,
  language,
  t,
  theme,
  isRtl,
  onInspect,
  onDelete,
}) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const [isOpen, setIsOpen] = useState(false);
  const styles = createStyles(theme);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
      },
      onPanResponderMove: (_, gestureState) => {
        const rawDx = isRtl ? gestureState.dx : -gestureState.dx;
        if (rawDx > 0) {
          const clamped = Math.min(rawDx, SWIPE_THRESHOLD + 15);
          translateX.setValue(isRtl ? clamped : -clamped);
        } else {
          translateX.setValue(0);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const rawDx = isRtl ? gestureState.dx : -gestureState.dx;
        if (rawDx > SWIPE_THRESHOLD / 2) {
          Animated.spring(translateX, {
            toValue: isRtl ? SWIPE_THRESHOLD : -SWIPE_THRESHOLD,
            useNativeDriver: true,
            bounciness: 4,
          }).start(() => setIsOpen(true));
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 4,
          }).start(() => setIsOpen(false));
        }
      },
    })
  ).current;

  const handleCardPress = () => {
    if (isOpen) {
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 4,
      }).start(() => setIsOpen(false));
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      onInspect(item);
    }
  };

  const handleDeletePress = () => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 0,
    }).start(() => {
      setIsOpen(false);
      onDelete(item.id);
    });
  };

  const displayName = getLocalizedFoodName(item, language);
  const macroText = `${t('Protein')} ${item.protein}g · ${t('Carbs')} ${item.carbs}g · ${t('Fat')} ${item.fat}g`;

  return (
    <View style={styles.container}>
      {/* Background iOS-style Swipe-to-Delete Action */}
      <View
        style={[
          styles.deleteActionContainer,
          isRtl ? styles.deleteActionLeft : styles.deleteActionRight,
        ]}
      >
        <TouchableOpacity
          style={styles.deleteActionBtn}
          onPress={handleDeletePress}
          activeOpacity={0.85}
          accessibilityLabel={`${t('Delete')} ${displayName}`}
          accessibilityRole="button"
        >
          <Trash2 size={20} color={theme.colors.white} strokeWidth={2.2} />
          <Text style={styles.deleteActionText}>{t('Delete')}</Text>
        </TouchableOpacity>
      </View>

      {/* Foreground Interactive Card */}
      <Animated.View
        style={[
          styles.cardForeground,
          { transform: [{ translateX }] },
        ]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          style={styles.cardContent}
          onPress={handleCardPress}
          activeOpacity={0.92}
          accessibilityRole="button"
          accessibilityLabel={`${displayName}, ${formatKcal(item.calories, t)}`}
        >
          {/* 48dp Medium Thumbnail */}
          <FoodThumbnail
            name={displayName}
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

          {/* Calorie Pill Bubble */}
          <View style={styles.kcalPill}>
            <Text style={styles.kcalValue}>{Math.round(item.calories)}</Text>
            <Text style={styles.kcalUnit}>{t('kcal')}</Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
});

FoodLogSwipeableRow.displayName = 'FoodLogSwipeableRow';

const createStyles = (theme: ThemeType) =>
  StyleSheet.create({
    container: {
      position: 'relative',
      marginVertical: 4,
      borderRadius: theme.radius.lg,
      overflow: 'hidden',
    },
    deleteActionContainer: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      width: SWIPE_THRESHOLD,
      backgroundColor: theme.colors.danger,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: theme.radius.lg,
      zIndex: 1,
    },
    deleteActionRight: {
      right: 0,
    },
    deleteActionLeft: {
      left: 0,
    },
    deleteActionBtn: {
      width: '100%',
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 3,
    },
    deleteActionText: {
      fontFamily: theme.fonts.sans,
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.white,
    },
    cardForeground: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...theme.shadow.subtle,
      zIndex: 2,
    },
    cardContent: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 14,
    },
    infoCol: {
      flex: 1,
      marginEnd: 10,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 6,
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
      marginTop: 2,
    },
    foodMacros: {
      fontFamily: theme.fonts.sans,
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginTop: 3,
      fontWeight: '500',
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
  });
