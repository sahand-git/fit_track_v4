import React, { useEffect, useMemo } from 'react';
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
import { useTheme } from '../theme/ThemeContext';
import { ThemeType } from '../theme';
import { isReducedMotion } from '../utils/motion';
import { getSpringConfig } from '../utils/reanimatedMotion';
import { getStreakDayUnit, getStreakAccessibilityLabel } from '../utils/streak';

interface StreakBadgeProps {
  streak: number;
  style?: StyleProp<ViewStyle>;
}

export const StreakBadge: React.FC<StreakBadgeProps> = ({ streak, style }) => {
  const language = useLanguage();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

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

  const dayUnit = getStreakDayUnit(streak, language);
  const accessibilityLabel = getStreakAccessibilityLabel(streak, language);

  return (
    <Animated.View
      style={[styles.badge, style, animatedStyle]}
      accessibilityLabel={accessibilityLabel}
    >
      <Flame size={14} color={theme.colors.terracottaWarm} />
      <Text style={styles.text}>
        {streak} {dayUnit}
      </Text>
    </Animated.View>
  );
};

const createStyles = (theme: ThemeType) => StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.terracottaWarmLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.full,
    gap: 4,
    borderWidth: 1,
    borderColor: theme.colors.terracottaWarmBorder,
  },
  text: {
    fontFamily: theme.fonts.sans,
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.terracottaWarm,
  },
});
