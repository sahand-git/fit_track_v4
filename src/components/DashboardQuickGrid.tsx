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
}

export const DashboardQuickGrid: React.FC<DashboardQuickGridProps> = ({
  onScanPlate,
  onDescribeMeal,
  onScanBarcode,
}) => {
  const language = useLanguage();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const t = (key: string) => translate(language, key);

  const actions = [
    {
      id: 'scan',
      label: t('Scan Food'),
      icon: <Camera size={26} color={theme.colors.primary} strokeWidth={2.3} />,
      iconBg: theme.colors.primaryLight,
      borderColor: theme.colors.primary,
      onPress: onScanPlate,
    },
    {
      id: 'describe',
      label: t('AI Describe'),
      icon: <Sparkles size={26} color={theme.colors.amber} strokeWidth={2.3} />,
      iconBg: theme.colors.amberLight,
      borderColor: theme.colors.amber,
      onPress: onDescribeMeal,
    },
    {
      id: 'barcode',
      label: t('Barcode'),
      icon: <Barcode size={26} color={theme.colors.purple} strokeWidth={2.3} />,
      iconBg: theme.colors.purpleLight,
      borderColor: theme.colors.purple,
      onPress: onScanBarcode,
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
            <Text style={styles.actionLabel} numberOfLines={2}>
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
      paddingHorizontal: theme.spacing.md,
      marginVertical: theme.spacing.sm,
    },
    grid: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-around',
    },
    actionItem: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'flex-start',
      paddingVertical: 4,
      paddingHorizontal: 4,
    },
    circleButton: {
      width: 58,
      height: 58,
      borderRadius: 29,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
      borderWidth: 1.5,
      ...theme.shadow.subtle,
    },
    actionLabel: {
      fontSize: 12,
      lineHeight: 16,
      minHeight: 34,
      fontWeight: '600',
      color: theme.colors.textPrimary,
      textAlign: 'center',
      includeFontPadding: false,
    },
  });
