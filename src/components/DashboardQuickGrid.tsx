import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText as Text } from './AppText';
import {
  Camera,
  Sparkles,
  Barcode,
  Zap,
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
}

export const DashboardQuickGrid: React.FC<DashboardQuickGridProps> = ({
  onScanPlate,
  onDescribeMeal,
  onScanBarcode,
  onQuickAdd,
  onExploreFood,
}) => {
  const language = useLanguage();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const t = (key: string) => translate(language, key);

  const actions = [
    {
      id: 'scan',
      label: t('Scan Food'),
      icon: <Camera size={22} color={theme.colors.primary} />,
      iconBg: theme.colors.primaryLight,
      onPress: onScanPlate,
    },
    {
      id: 'describe',
      label: t('AI Describe'),
      icon: <Sparkles size={22} color={theme.colors.amber} />,
      iconBg: theme.colors.amberLight,
      onPress: onDescribeMeal,
    },
    {
      id: 'barcode',
      label: t('Barcode'),
      icon: <Barcode size={22} color={theme.colors.purple} />,
      iconBg: theme.colors.purpleLight,
      onPress: onScanBarcode,
    },
    {
      id: 'quick_add',
      label: t('Quick Add'),
      icon: <Zap size={22} color={theme.colors.water} />,
      iconBg: theme.colors.waterLight,
      onPress: onQuickAdd || onExploreFood || onScanPlate,
    },
  ];

  const handlePress = (fn: () => void) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    fn();
  };

  return (
    <View style={styles.container}>
      {actions.map((act) => (
        <AnimatedPressable
          key={act.id}
          style={styles.actionItem}
          onPress={() => handlePress(act.onPress)}
          minScale={0.93}
          accessibilityRole="button"
          accessibilityLabel={act.label}
        >
          <View style={[styles.circleButton, { backgroundColor: act.iconBg }]}>
            {act.icon}
          </View>
          <Text style={styles.actionLabel} numberOfLines={1}>
            {act.label}
          </Text>
        </AnimatedPressable>
      ))}
    </View>
  );
};

const createStyles = (theme: ThemeType) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.sm,
      marginVertical: theme.spacing.sm,
    },
    actionItem: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 2,
    },
    circleButton: {
      width: 52,
      height: 52,
      borderRadius: 26,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 6,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...theme.shadow.subtle,
    },
    actionLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.textPrimary,
      textAlign: 'center',
    },
  });
