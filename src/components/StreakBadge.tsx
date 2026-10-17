import React, { useEffect } from 'react';
import { StyleSheet, ViewStyle, StyleProp } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { Flame } from 'lucide-react-native';
import { AppText as Text } from './AppText';
import { useLanguage } from '../i18n/I18nContext';
import { translate } from '../i18n/strings';
import { isReducedMotion } from '../utils/motion';
import { getSpringConfig } from '../utils/reanimatedMotion';
import { theme } from '../theme';

interface StreakBadgeProps {
  streak: number;
  style?: StyleProp<ViewStyle>;
}

export const StreakBadge: React.FC<StreakBadgeProps> = ({ streak, style }) => {
  const language = useLanguage();
  const t = (str: string) => translate(language, str);

  const scale = useSharedValue(1);

  useEffect(() => {
    if (isReducedMotion() || streak <= 0) return;

    // Subtle tactile pop on mount or streak increment
    scale.value = withSequence(
      withTiming(1.18, { duration: 160 }),
      withSpring(1, getSpringConfig('pop'))
    );
  }, [streak, scale]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  return (
    <Animated.View
      style={[styles.badge, style, animatedStyle]}
      accessibilityLabel={`${streak} ${t('day streak')}`}
    >
      <Flame size={14} color="#D45D3B" />
      <Text style={styles.text}>
        {streak} {t('days')}
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDF3EE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.full,
    gap: 4,
    borderWidth: 1,
    borderColor: '#F8DFD4',
  },
  text: {
    fontFamily: theme.fonts.sans,
    fontSize: 12,
    fontWeight: '600',
    color: '#D45D3B',
  },
});
