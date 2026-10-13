import React, { useEffect } from 'react';
import { StyleSheet, View, ViewStyle, StyleProp, DimensionValue } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { isReducedMotion } from '../utils/motion';
import { theme } from '../theme';

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Editorial Ledger Skeleton Placeholder
 * Calm parchment-tinted pulse for content loading states.
 */
export const SkeletonLoader: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 16,
  borderRadius = theme.radius.sm,
  style,
}) => {
  const opacity = useSharedValue(isReducedMotion() ? 0.6 : 0.45);

  useEffect(() => {
    if (isReducedMotion()) {
      opacity.value = 0.6;
      return;
    }

    opacity.value = withRepeat(
      withSequence(
        withTiming(0.85, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.4, { duration: 700, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
    };
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
        },
        style,
        animatedStyle,
      ]}
    />
  );
};

/**
 * Pre-configured skeleton card for loading states
 */
export const SkeletonCard: React.FC<{ height?: number; style?: StyleProp<ViewStyle> }> = ({
  height = 100,
  style,
}) => {
  return (
    <View style={[styles.cardContainer, style]}>
      <SkeletonLoader width="40%" height={18} borderRadius={4} />
      <SkeletonLoader width="85%" height={14} borderRadius={4} style={{ marginTop: 10 }} />
      <SkeletonLoader width="65%" height={14} borderRadius={4} style={{ marginTop: 6 }} />
    </View>
  );
};

/**
 * Pre-configured skeleton for AI Coach / chat responses
 */
export const SkeletonCoachBubble: React.FC = () => {
  return (
    <View style={styles.bubbleContainer}>
      <View style={styles.bubbleHeader}>
        <SkeletonLoader width={24} height={24} borderRadius={12} />
        <SkeletonLoader width={90} height={14} borderRadius={4} />
      </View>
      <SkeletonLoader width="92%" height={14} borderRadius={4} style={{ marginTop: 10 }} />
      <SkeletonLoader width="80%" height={14} borderRadius={4} style={{ marginTop: 6 }} />
      <SkeletonLoader width="60%" height={14} borderRadius={4} style={{ marginTop: 6 }} />
    </View>
  );
};

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#EBE5D8',
  },
  cardContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginVertical: 6,
  },
  bubbleContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignSelf: 'flex-start',
    maxWidth: '85%',
    marginVertical: 8,
  },
  bubbleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
