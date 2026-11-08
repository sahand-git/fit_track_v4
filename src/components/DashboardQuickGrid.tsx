import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText as Text } from './AppText';
import {
  Camera,
  Sparkles,
  Barcode,
  Zap,
  Dumbbell,
  Pill,
} from 'lucide-react-native';
import { useLanguage } from '../i18n/I18nContext';
import { translate } from '../i18n/strings';
import { useTheme } from '../theme/ThemeContext';
import { ThemeType } from '../theme';
import * as Haptics from 'expo-haptics';
import { AnimatedPressable } from './AnimatedPressable';

interface DashboardQuickGridProps {
  onScanPlate: () => void;
  onDescribeMeal: () => void;
  onScanBarcode: () => void;
  onQuickAdd?: () => void;
  onExploreFood?: () => void;
  onOpenWorkout?: () => void;
  onOpenSupplements?: () => void;
}

export const DashboardQuickGrid: React.FC<DashboardQuickGridProps> = ({
  onScanPlate,
  onDescribeMeal,
  onScanBarcode,
  onQuickAdd,
  onExploreFood,
  onOpenWorkout,
  onOpenSupplements,
}) => {
  const language = useLanguage();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const t = (key: string) => translate(language, key);

  const actions = [
    {
      id: 'scan',
      label: t('Scan Food'),
      icon: <Camera size={24} color={theme.colors.primary} strokeWidth={2.2} />,
      iconBg: theme.colors.primaryLight,
      borderColor: theme.colors.primary,
      onPress: onScanPlate,
    },
    {
      id: 'describe',
      label: t('AI Describe'),
      icon: <Sparkles size={24} color={theme.colors.amber} strokeWidth={2.2} />,
      iconBg: theme.colors.amberLight,
      borderColor: theme.colors.amber,
      onPress: onDescribeMeal,
    },
    {
      id: 'barcode',
      label: t('Barcode'),
      icon: <Barcode size={24} color={theme.colors.purple} strokeWidth={2.2} />,
      iconBg: theme.colors.purpleLight,
      borderColor: theme.colors.purple,
      onPress: onScanBarcode,
    },
    {
      id: 'quick_add',
      label: t('Quick Add'),
      icon: <Zap size={24} color={theme.colors.water} strokeWidth={2.2} fill={theme.colors.waterLight} />,
      iconBg: theme.colors.waterLight,
      borderColor: theme.colors.water,
      onPress: onQuickAdd || onExploreFood || onScanPlate,
    },
    {
      id: 'workout',
      label: t('Workouts'),
      icon: <Dumbbell size={24} color={theme.colors.accent} strokeWidth={2.2} />,
      iconBg: theme.colors.accentLight,
      borderColor: theme.colors.accent,
      onPress: onOpenWorkout || onScanPlate,
    },
    {
      id: 'vitamins',
      label: t('Vitamins'),
      icon: <Pill size={24} color={theme.colors.rose} strokeWidth={2.2} />,
      iconBg: theme.colors.roseLight,
      borderColor: theme.colors.rose,
      onPress: onOpenSupplements || onScanPlate,
    },
  ];

  const handlePress = (fn: () => void) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    fn();
  };

  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        {actions.map((act) => (
          <AnimatedPressable
            key={act.id}
            style={styles.actionItem}
            onPress={() => handlePress(act.onPress)}
            minScale={0.92}
            accessibilityRole="button"
            accessibilityLabel={act.label}
          >
            <View
              style={[
                styles.circleButton,
                { backgroundColor: act.iconBg, borderColor: act.borderColor },
              ]}
            >
              {act.icon}
            </View>
            <Text style={styles.actionLabel} numberOfLines={1}>
              {act.label}
            </Text>
          </AnimatedPressable>
        ))}
      </View>
    </View>
  );
};

const createStyles = (theme: ThemeType) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: theme.spacing.sm,
      marginVertical: theme.spacing.xs,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    actionItem: {
      width: '33.33%',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      paddingHorizontal: 4,
    },
    circleButton: {
      width: 52,
      height: 52,
      borderRadius: 26,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 6,
      borderWidth: 1.5,
      ...theme.shadow.subtle,
    },
    actionLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.textPrimary,
      textAlign: 'center',
      includeFontPadding: false,
    },
  });
