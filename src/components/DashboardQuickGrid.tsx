import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText as Text } from './AppText';
import {
  Camera,
  Sparkles,
  Barcode,
  Compass,
} from 'lucide-react-native';
import { useLanguage } from '../i18n/I18nContext';
import { translate } from '../i18n/strings';
import { useTheme } from '../theme/ThemeContext';
import { ThemeType } from '../theme';
import * as Haptics from 'expo-haptics';
import { AnimatedPressable } from './AnimatedPressable';
import { useIsRTL } from '../hooks/useIsRTL';

interface DashboardQuickGridProps {
  onScanPlate: () => void;
  onDescribeMeal: () => void;
  onScanBarcode: () => void;
  onExploreFood: () => void;
}

export const DashboardQuickGrid: React.FC<DashboardQuickGridProps> = ({
  onScanPlate,
  onDescribeMeal,
  onScanBarcode,
  onExploreFood,
}) => {
  const language = useLanguage();
  const { theme } = useTheme();
  const isRtl = useIsRTL();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const t = (key: string) => translate(language, key);

  const actions = [
    {
      id: 'scan',
      label: t('Scan Plate'),
      sub: t('AI Camera'),
      icon: <Camera size={19} color={theme.colors.primary} />,
      iconBg: theme.colors.primaryLight,
      onPress: onScanPlate,
    },
    {
      id: 'describe',
      label: t('Describe'),
      sub: t('Voice & Text'),
      icon: <Sparkles size={19} color={theme.colors.amber} />,
      iconBg: theme.colors.amberLight,
      onPress: onDescribeMeal,
    },
    {
      id: 'barcode',
      label: t('Barcode'),
      sub: t('Instant Scan'),
      icon: <Barcode size={19} color={theme.colors.purple} />,
      iconBg: theme.colors.purpleLight,
      onPress: onScanBarcode,
    },
    {
      id: 'explore',
      label: t('Explore'),
      sub: t('Food Catalog'),
      icon: <Compass size={19} color={theme.colors.water} />,
      iconBg: theme.colors.waterLight,
      onPress: onExploreFood,
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
          style={[styles.card, isRtl && styles.cardRtl]}
          onPress={() => handlePress(act.onPress)}
          minScale={0.96}
          accessibilityRole="button"
          accessibilityLabel={`${act.label}, ${act.sub}`}
        >
          <View style={[styles.iconContainer, { backgroundColor: act.iconBg }]}>
            {act.icon}
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.cardLabel} numberOfLines={1}>
              {act.label}
            </Text>
            <Text style={styles.cardSub} numberOfLines={1}>
              {act.sub}
            </Text>
          </View>
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
      width: '48.5%',
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingVertical: 12,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    cardRtl: {
      flexDirection: 'row-reverse',
    },
    iconContainer: {
      width: 40,
      height: 40,
      borderRadius: theme.radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    textContainer: {
      flex: 1,
      justifyContent: 'center',
    },
    cardLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.textPrimary,
    },
    cardSub: {
      fontSize: 12,
      fontWeight: '400',
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
  });
