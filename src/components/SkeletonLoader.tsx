import React, { useEffect, useMemo } from 'react';
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
import { useTheme } from '../theme/ThemeContext';
import { ThemeType } from '../theme';

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
  borderRadius,
  style,
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const finalRadius = borderRadius !== undefined ? borderRadius : theme.radius.sm;
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
  }, [opacity]);

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
          borderRadius: finalRadius,
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
  style,
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
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
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
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

/**
 * Skeleton placeholder for Today screen
 */
export const TodaySkeleton: React.FC = () => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={styles.screenContainer}>
      {/* Header Skeleton */}
      <View style={styles.todayHeader}>
        <View style={{ flex: 1, gap: 8 }}>
          <SkeletonLoader width={110} height={14} borderRadius={4} />
          <SkeletonLoader width={140} height={28} borderRadius={6} />
        </View>
        <SkeletonLoader width={38} height={38} borderRadius={19} />
      </View>

      {/* Hero Calorie Ring Area */}
      <View style={styles.todayHero}>
        <SkeletonLoader width={180} height={180} borderRadius={90} />
        <SkeletonLoader width={130} height={16} borderRadius={4} style={{ marginTop: 18 }} />
      </View>

      {/* Macro cards row */}
      <View style={styles.macroRow}>
        <View style={{ flex: 1 }}><SkeletonLoader height={76} borderRadius={12} /></View>
        <View style={{ flex: 1 }}><SkeletonLoader height={76} borderRadius={12} /></View>
        <View style={{ flex: 1 }}><SkeletonLoader height={76} borderRadius={12} /></View>
      </View>

      {/* Activity & Supplement Placeholders */}
      <View style={{ marginTop: 20, gap: 12 }}>
        <SkeletonCard height={88} />
        <SkeletonCard height={88} />
        <SkeletonCard height={88} />
      </View>
    </View>
  );
};

/**
 * Skeleton placeholder for Meals screen
 */
export const MealsSkeleton: React.FC = () => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={styles.screenContainer}>
      {/* Date Header Strip */}
      <View style={styles.mealsDateHeader}>
        <SkeletonLoader width={32} height={32} borderRadius={16} />
        <SkeletonLoader width={160} height={20} borderRadius={6} />
        <SkeletonLoader width={32} height={32} borderRadius={16} />
      </View>

      {/* Summary Bar */}
      <View style={styles.mealsSummaryBar}>
        <SkeletonLoader width={48} height={26} borderRadius={4} />
        <SkeletonLoader width={48} height={26} borderRadius={4} />
        <SkeletonLoader width={48} height={26} borderRadius={4} />
        <SkeletonLoader width={48} height={26} borderRadius={4} />
      </View>

      {/* Meal Group Sections */}
      <View style={{ marginTop: 16, gap: 14 }}>
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={styles.mealGroupSection}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <SkeletonLoader width={90} height={18} borderRadius={4} />
              <SkeletonLoader width={50} height={16} borderRadius={4} />
            </View>
            <SkeletonCard height={68} />
          </View>
        ))}
      </View>
    </View>
  );
};

/**
 * Skeleton placeholder for Progress screen
 */
export const ProgressSkeleton: React.FC = () => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={styles.screenContainer}>
      {/* Segment Bar */}
      <View style={styles.progressSegmentBar}>
        <SkeletonLoader width="90%" height={36} borderRadius={8} />
      </View>

      {/* Metric Cards */}
      <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
        <View style={{ flex: 1 }}><SkeletonLoader height={88} borderRadius={14} /></View>
        <View style={{ flex: 1 }}><SkeletonLoader height={88} borderRadius={14} /></View>
      </View>

      {/* Chart Card */}
      <View style={styles.progressChartCard}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 }}>
          <SkeletonLoader width={130} height={18} borderRadius={4} />
          <SkeletonLoader width={80} height={14} borderRadius={4} />
        </View>
        <SkeletonLoader width="100%" height={120} borderRadius={12} />
      </View>

      {/* History Items */}
      <View style={{ marginTop: 20, gap: 10 }}>
        <SkeletonLoader width={110} height={16} borderRadius={4} />
        <SkeletonCard height={56} />
        <SkeletonCard height={56} />
        <SkeletonCard height={56} />
      </View>
    </View>
  );
};

const createStyles = (theme: ThemeType) => StyleSheet.create({
  skeleton: {
    backgroundColor: theme.colors.parchmentSkeleton,
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
  screenContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
  },
  todayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  todayHero: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.subtle,
  },
  macroRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  mealsDateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  mealsSummaryBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginVertical: 10,
  },
  mealGroupSection: {
    marginBottom: 6,
  },
  progressSegmentBar: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  progressChartCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginTop: 16,
    ...theme.shadow.subtle,
  },
});
