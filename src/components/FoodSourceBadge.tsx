import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { AppText as Text } from './AppText';
import { FoodItem } from '../types';
import { getFoodSourceBadgeInfo, FoodSourceBadgeType } from '../utils/foodSource';
import { useLanguage } from '../i18n/I18nContext';
import { translate } from '../i18n/strings';

interface FoodSourceBadgeProps {
  source?: FoodItem['source'] | string;
  size?: 'small' | 'medium';
  style?: StyleProp<ViewStyle>;
}

const TYPE_STYLES: Record<FoodSourceBadgeType, ViewStyle> = {
  verified: {
    backgroundColor: 'rgba(30, 58, 47, 0.08)',
    borderColor: 'rgba(30, 58, 47, 0.2)',
  },
  estimate: {
    backgroundColor: '#FFF7ED',
    borderColor: 'rgba(200, 90, 50, 0.35)',
    borderStyle: 'dashed',
  },
  off: {
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
  },
  custom: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
  },
};

const TYPE_TEXT_STYLES: Record<FoodSourceBadgeType, TextStyle> = {
  verified: {
    color: '#1E3A2F', // Forest Green
  },
  estimate: {
    color: '#C85A32', // Terracotta
  },
  off: {
    color: '#475569',
  },
  custom: {
    color: '#4B5563',
  },
};

export const FoodSourceBadge: React.FC<FoodSourceBadgeProps> = ({
  source,
  size = 'small',
  style,
}) => {
  const language = useLanguage();
  const t = (k: string) => translate(language, k);
  const info = getFoodSourceBadgeInfo(source, t);

  if (!info) return null;

  const isSmall = size === 'small';

  const badgeStyle: StyleProp<ViewStyle> = [
    styles.baseBadge,
    isSmall ? styles.smallBadge : styles.mediumBadge,
    info.isEstimate ? styles.estimateBadge : TYPE_STYLES[info.type],
    style,
  ];

  const textStyle: StyleProp<TextStyle> = [
    styles.baseText,
    isSmall ? styles.smallText : styles.mediumText,
    info.isEstimate ? styles.estimateText : TYPE_TEXT_STYLES[info.type],
  ];

  return (
    <View style={badgeStyle} accessibilityLabel={info.label}>
      <Text style={textStyle}>{info.label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
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
    fontSize: 10,
    lineHeight: 13,
  },
  mediumText: {
    fontSize: 12,
    lineHeight: 16,
  },
  // Distinct "estimate" look for generic_estimate, regional_culinary_estimate, and ai_estimated
  estimateBadge: {
    backgroundColor: '#FFF7ED',
    borderColor: 'rgba(200, 90, 50, 0.35)',
    borderStyle: 'dashed',
  },
  estimateText: {
    color: '#C85A32', // terracotta
  },
});
