import React, { useMemo, useCallback } from 'react';
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
import { useIsRTL } from '../hooks/useIsRTL';
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

interface QuickActionItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  iconBg: string;
  borderColor: string;
  onPress: () => void;
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
  const isRtl = useIsRTL();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const t = useCallback((key: string) => translate(language, key), [language]);

  // Row 1: Scan Food, AI Describe, Barcode (3 on top)
  const row1: QuickActionItem[] = useMemo(() => [
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
  ], [t, theme, onScanPlate, onDescribeMeal, onScanBarcode]);

  // Row 2: Vitamins, Workouts, Steps (3 on the other 3)
  const row2: QuickActionItem[] = useMemo(() => [
    {
      id: 'supplements',
      label: t('Vitamins'),
      icon: <Pill size={20} color={theme.colors.crimson} strokeWidth={2.2} />,
      iconBg: theme.colors.crimsonLight,
      borderColor: theme.colors.crimson,
      onPress: () => onOpenSupplements?.(),
    },
    {
      id: 'workouts',
      label: t('Workouts'),
      icon: <Dumbbell size={20} color={theme.colors.accent} strokeWidth={2.2} />,
      iconBg: `${theme.colors.accent}18`,
      borderColor: theme.colors.accent,
      onPress: () => onOpenWorkouts?.(),
    },
    {
      id: 'steps',
      label: t('Steps'),
      icon: <Footprints size={20} color={theme.colors.water} strokeWidth={2.2} />,
      iconBg: theme.colors.waterLight,
      borderColor: theme.colors.water,
      onPress: () => onOpenSteps?.(),
    },
  ], [t, theme, onOpenSupplements, onOpenWorkouts, onOpenSteps]);

  const handlePress = (fn?: () => void) => {
    if (!fn) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    fn();
  };

  const renderTile = (act: QuickActionItem) => (
    <View key={act.id} style={styles.tileWrapper}>
      <AnimatedPressable
        style={styles.actionTile}
        onPress={() => handlePress(act.onPress)}
        minScale={0.92}
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
          <Text
            style={styles.actionLabel}
            numberOfLines={2}
            adjustsFontSizeToFit
            minimumFontScale={0.78}
          >
            {act.label}
          </Text>
        </View>
      </AnimatedPressable>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.row, isRtl && styles.rowRtl]}>
        {row1.map(renderTile)}
      </View>
      <View style={[styles.row, isRtl && styles.rowRtl]}>
        {row2.map(renderTile)}
      </View>
    </View>
  );
};

const createStyles = (theme: ThemeType) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: theme.spacing.md,
      marginVertical: 8,
      gap: 8,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    rowRtl: {
      flexDirection: 'row-reverse',
    },
    tileWrapper: {
      flex: 1,
    },
    actionTile: {
      width: '100%',
      height: 84,
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 6,
      paddingVertical: 8,
      ...theme.shadow.subtle,
    },
    iconBadge: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 6,
      borderWidth: 1.5,
      ...theme.shadow.subtle,
    },
    labelContainer: {
      height: 24,
      justifyContent: 'center',
      alignItems: 'center',
      width: '100%',
      paddingHorizontal: 2,
    },
    actionLabel: {
      fontSize: 11.5,
      lineHeight: 14,
      fontWeight: '700',
      color: theme.colors.textPrimary,
      textAlign: 'center',
      includeFontPadding: false,
    },
  });
