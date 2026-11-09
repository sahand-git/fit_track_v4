import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText as Text } from './AppText';
import {
  Camera,
  Sparkles,
  Barcode,
  Dumbbell,
  Pill,
  Footprints,
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
  onOpenSupplements?: () => void;
  onOpenWorkouts?: () => void;
  onOpenSteps?: () => void;
}

export const DashboardQuickGrid: React.FC<DashboardQuickGridProps> = ({
  onScanPlate,
  onDescribeMeal,
  onScanBarcode,
  onOpenSupplements,
  onOpenWorkouts,
  onOpenSteps,
}) => {
  const language = useLanguage();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const t = (key: string) => translate(language, key);

  const actions = useMemo(() => [
    {
      id: 'scan',
      label: t('Scan Food'),
      icon: <Camera size={20} color={theme.colors.primary} strokeWidth={2.2} />,
      iconBg: theme.colors.primaryLight,
      borderColor: theme.colors.primary,
      onPress: onScanPlate,
    },
    {
      id: 'describe',
      label: t('AI Describe'),
      icon: <Sparkles size={20} color={theme.colors.amber} strokeWidth={2.2} />,
      iconBg: theme.colors.amberLight,
      borderColor: theme.colors.amber,
      onPress: onDescribeMeal,
    },
    {
      id: 'barcode',
      label: t('Barcode'),
      icon: <Barcode size={20} color={theme.colors.purple} strokeWidth={2.2} />,
      iconBg: theme.colors.purpleLight,
      borderColor: theme.colors.purple,
      onPress: onScanBarcode,
    },
    {
      id: 'supplements',
      label: t('Vitamins'),
      icon: <Pill size={20} color={theme.colors.crimson} strokeWidth={2.2} />,
      iconBg: theme.colors.crimsonLight,
      borderColor: theme.colors.crimson,
      onPress: onOpenSupplements,
    },
    {
      id: 'workouts',
      label: t('Workouts'),
      icon: <Dumbbell size={20} color={theme.colors.accent} strokeWidth={2.2} />,
      iconBg: `${theme.colors.accent}18`,
      borderColor: theme.colors.accent,
      onPress: onOpenWorkouts,
    },
    {
      id: 'steps',
      label: t('Steps'),
      icon: <Footprints size={20} color={theme.colors.water} strokeWidth={2.2} />,
      iconBg: theme.colors.waterLight,
      borderColor: theme.colors.water,
      onPress: onOpenSteps,
    },
  ], [t, theme, onScanPlate, onDescribeMeal, onScanBarcode, onOpenSupplements, onOpenWorkouts, onOpenSteps]);

  const handlePress = (fn?: () => void) => {
    if (!fn) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    fn();
  };

  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        {actions.map((act) => (
          <AnimatedPressable
            key={act.id}
            style={styles.actionTile}
            onPress={() => handlePress(act.onPress)}
            minScale={0.95}
            accessibilityRole="button"
            accessibilityLabel={act.label}
          >
            <View
              style={[
                styles.iconBadge,
                { backgroundColor: act.iconBg, borderColor: act.borderColor },
              ]}
            >
              {act.icon}
            </View>
            <View style={styles.labelContainer}>
              <Text style={styles.actionLabel} numberOfLines={2}>
                {act.label}
              </Text>
            </View>
          </AnimatedPressable>
        ))}
      </View>
    </View>
  );
};

const createStyles = (theme: ThemeType) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: theme.spacing.md,
      marginVertical: 10,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      rowGap: 8,
    },
    actionTile: {
      width: '31.5%',
      height: 82,
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
      paddingVertical: 6,
      ...theme.shadow.subtle,
    },
    iconBadge: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 4,
      borderWidth: 1.2,
    },
    labelContainer: {
      height: 26,
      justifyContent: 'center',
      alignItems: 'center',
      width: '100%',
    },
    actionLabel: {
      fontSize: 11,
      lineHeight: 13,
      fontWeight: '700',
      color: theme.colors.textPrimary,
      textAlign: 'center',
      includeFontPadding: false,
    },
  });
