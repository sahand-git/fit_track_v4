import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText as Text } from './AppText';
import {
  Camera,
  Pill,
  Dumbbell,
  Sparkles,
  Compass,
  TrendingUp,
} from 'lucide-react-native';
import { useLanguage } from '../i18n/I18nContext';
import { translate } from '../i18n/strings';
import { useTheme } from '../theme/ThemeContext';
import { ThemeType } from '../theme';
import * as Haptics from 'expo-haptics';
import { AnimatedPressable } from './AnimatedPressable';

interface DashboardQuickGridProps {
  onScanPlate: () => void;
  onOpenSupplements: () => void;
  onOpenWorkouts: () => void;
  onDescribeMeal: () => void;
  onExploreFood: () => void;
  onOpenAnalytics: () => void;
  uncheckedSupplementsCount?: number;
  hasWorkoutsToday?: boolean;
}

export const DashboardQuickGrid: React.FC<DashboardQuickGridProps> = ({
  onScanPlate,
  onOpenSupplements,
  onOpenWorkouts,
  onDescribeMeal,
  onExploreFood,
  onOpenAnalytics,
  uncheckedSupplementsCount = 0,
  hasWorkoutsToday = false,
}) => {
  const language = useLanguage();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const t = (key: string) => translate(language, key);

  const actions = [
    {
      id: 'scan',
      label: t('Scan Plate'),
      icon: <Camera size={20} color={theme.colors.primary} />,
      onPress: onScanPlate,
      badge: null,
    },
    {
      id: 'supplements',
      label: t('Supplements'),
      icon: <Pill size={20} color={theme.colors.macroFat} />,
      onPress: onOpenSupplements,
      badge: uncheckedSupplementsCount > 0 ? `${uncheckedSupplementsCount}` : null,
    },
    {
      id: 'workout',
      label: t('Workouts'),
      icon: <Dumbbell size={20} color={theme.colors.accent} />,
      onPress: onOpenWorkouts,
      badgeDot: !hasWorkoutsToday,
    },
    {
      id: 'describe',
      label: t('Describe'),
      icon: <Sparkles size={20} color={theme.colors.amber} />,
      onPress: onDescribeMeal,
      badge: null,
    },
    {
      id: 'explore',
      label: t('Explore'),
      icon: <Compass size={20} color={theme.colors.water} />,
      onPress: onExploreFood,
      badge: null,
    },
    {
      id: 'analytics',
      label: t('Analytics'),
      icon: <TrendingUp size={20} color={theme.colors.emeraldDark} />,
      onPress: onOpenAnalytics,
      badge: null,
    },
  ];

  const handlePress = (fn: () => void) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    fn();
  };

  return (
    <View style={styles.grid}>
      {actions.map((act) => (
        <AnimatedPressable
          key={act.id}
          style={styles.card}
          onPress={() => handlePress(act.onPress)}
          minScale={0.94}
          accessibilityRole="button"
          accessibilityLabel={act.label}
        >
          <View style={styles.iconContainer}>
            {act.icon}
            {act.badge ? (
              <View style={styles.badgePill}>
                <Text style={styles.badgeText}>{act.badge}</Text>
              </View>
            ) : act.badgeDot ? (
              <View style={styles.badgeDot} />
            ) : null}
          </View>
          <Text style={styles.cardLabel} numberOfLines={1}>
            {act.label}
          </Text>
        </AnimatedPressable>
      ))}
    </View>
  );
};

const createStyles = (theme: ThemeType) =>
  StyleSheet.create({
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      gap: theme.spacing.sm,
      marginVertical: theme.spacing.sm,
    },
    card: {
      width: '31%',
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingVertical: 14,
      paddingHorizontal: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconContainer: {
      width: 40,
      height: 40,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.surfaceSubtle,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 6,
      position: 'relative',
    },
    cardLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.textPrimary,
      textAlign: 'center',
    },
    badgePill: {
      position: 'absolute',
      top: -4,
      right: -6,
      backgroundColor: theme.colors.amber,
      paddingHorizontal: 5,
      paddingVertical: 1,
      borderRadius: theme.radius.full,
    },
    badgeText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.white,
    },
    badgeDot: {
      position: 'absolute',
      top: -2,
      right: -2,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.colors.accent,
    },
  });
