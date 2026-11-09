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

  // Row 1: Scan Food, AI Describe, Barcode (Picture 3 Reference)
  const row1: QuickActionItem[] = useMemo(() => [
    {
      id: 'scan',
      label: t('Scan Food'),
      icon: <Camera size={26} color={theme.colors.textPrimary} strokeWidth={1.8} />,
      onPress: onScanPlate,
    },
    {
      id: 'describe',
      label: t('AI Describe'),
      icon: <Sparkles size={26} color={theme.colors.textPrimary} strokeWidth={1.8} />,
      onPress: onDescribeMeal,
    },
    {
      id: 'barcode',
      label: t('Barcode'),
      icon: <Barcode size={26} color={theme.colors.textPrimary} strokeWidth={1.8} />,
      onPress: onScanBarcode,
    },
  ], [t, theme.colors.textPrimary, onScanPlate, onDescribeMeal, onScanBarcode]);

  // Row 2: Vitamins, Workouts, Steps (Picture 3 Reference)
  const row2: QuickActionItem[] = useMemo(() => [
    {
      id: 'supplements',
      label: t('Vitamins'),
      icon: <Pill size={26} color={theme.colors.textPrimary} strokeWidth={1.8} />,
      onPress: () => onOpenSupplements?.(),
    },
    {
      id: 'workouts',
      label: t('Workouts'),
      icon: <Dumbbell size={26} color={theme.colors.textPrimary} strokeWidth={1.8} />,
      onPress: () => onOpenWorkouts?.(),
    },
    {
      id: 'steps',
      label: t('Steps'),
      icon: <Footprints size={26} color={theme.colors.textPrimary} strokeWidth={1.8} />,
      onPress: () => onOpenSteps?.(),
    },
  ], [t, theme.colors.textPrimary, onOpenSupplements, onOpenWorkouts, onOpenSteps]);

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
        minScale={0.93}
        accessibilityRole="button"
        accessibilityLabel={act.label}
      >
        <Text
          style={styles.actionLabel}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
        >
          {act.label}
        </Text>
        <View style={styles.iconContainer}>
          {act.icon}
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
      height: 82,
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 6,
      paddingVertical: 10,
      ...theme.shadow.subtle,
    },
    actionLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: 6,
      includeFontPadding: false,
    },
    iconContainer: {
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
