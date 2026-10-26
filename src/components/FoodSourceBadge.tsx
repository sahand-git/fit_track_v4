import React, { useMemo } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { AppText as Text } from './AppText';
import { FoodItem } from '../types';
import { getFoodSourceBadgeInfo, FoodSourceBadgeType } from '../utils/foodSource';
import { useLanguage } from '../i18n/I18nContext';
import { translate } from '../i18n/strings';
import { useTheme } from '../theme/ThemeContext';
import { ThemeType } from '../theme';

interface FoodSourceBadgeProps {
  source?: FoodItem['source'] | string;
  sourceRef?: string;
  size?: 'small' | 'medium';
  style?: StyleProp<ViewStyle>;
}

export const FoodSourceBadge: React.FC<FoodSourceBadgeProps> = ({
  source,
  sourceRef,
  size = 'small',
  style,
}) => {
  const language = useLanguage();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const t = (k: string) => translate(language, k);

  // Only show the Verified badge when sourceRef exists.
  if ((source === 'verified_database' || source === 'usda_sr28') && (!sourceRef || sourceRef.trim() === '')) {
    return null;
  }

  const info = getFoodSourceBadgeInfo(source, sourceRef, t);

  if (!info) return null;

  const isSmall = size === 'small';

  const typeBadgeStyles: Record<FoodSourceBadgeType, ViewStyle> = {
    verified: styles.type_verified,
    estimate: styles.type_estimate,
    off: styles.type_off,
    custom: styles.type_custom,
  };

  const typeTextStyles: Record<FoodSourceBadgeType, TextStyle> = {
    verified: styles.text_verified,
    estimate: styles.text_estimate,
    off: styles.text_off,
    custom: styles.text_custom,
  };

  const badgeStyle: StyleProp<ViewStyle> = [
    styles.baseBadge,
    isSmall ? styles.smallBadge : styles.mediumBadge,
    info.isEstimate ? styles.estimateBadge : typeBadgeStyles[info.type],
    style,
  ];

  const textStyle: StyleProp<TextStyle> = [
    styles.baseText,
    isSmall ? styles.smallText : styles.mediumText,
    info.isEstimate ? styles.estimateText : typeTextStyles[info.type],
  ];

  return (
    <View style={badgeStyle} accessibilityLabel={info.label}>
      <Text style={textStyle}>{info.label}</Text>
    </View>
  );
};

const createStyles = (theme: ThemeType) => StyleSheet.create({
  baseBadge: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
  },
  mediumBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  baseText: {
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  smallText: {
    fontSize: 12,
    lineHeight: 15,
  },
  mediumText: {
    fontSize: 12,
    lineHeight: 16,
  },
  estimateBadge: {
    backgroundColor: theme.colors.terracottaLightWash,
    borderColor: theme.colors.terracottaWashBorder,
    borderStyle: 'dashed',
  },
  estimateText: {
    color: theme.colors.terracottaBadge,
  },
  type_verified: {
    backgroundColor: theme.colors.primaryLight,
    borderColor: theme.colors.primaryBorder,
  },
  text_verified: {
    color: theme.colors.primary,
  },
  type_estimate: {
    backgroundColor: theme.colors.terracottaLightWash,
    borderColor: theme.colors.terracottaWashBorder,
    borderStyle: 'dashed',
  },
  text_estimate: {
    color: theme.colors.terracottaBadge,
  },
  type_off: {
    backgroundColor: theme.colors.graySubtle,
    borderColor: theme.colors.grayBorder,
  },
  text_off: {
    color: theme.colors.slateDark,
  },
  type_custom: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderColor: theme.colors.border,
  },
  text_custom: {
    color: theme.colors.textSecondary,
  },
});
