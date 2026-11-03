import React, { useEffect } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  AccessibilityInfo,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { Check } from 'lucide-react-native';
import { AppText as Text } from '../AppText';
import { useTheme } from '../../theme/ThemeContext';
import { ThemeType } from '../../theme';
import { isReducedMotion } from '../../utils/motion';
import { getSpringConfig } from '../../utils/reanimatedMotion';

export interface AddFoodToastProps {
  visible: boolean;
  message: string;
  onUndo: () => void;
  onDismiss: () => void;
  durationMs?: number;
  t: (key: string) => string;
}

export const AddFoodToast: React.FC<AddFoodToastProps> = ({
  visible,
  message,
  onUndo,
  onDismiss,
  durationMs = 5000,
  t,
}) => {
  const { theme } = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const reduced = isReducedMotion();

  const opacity = useSharedValue(0);
  const translateY = useSharedValue(reduced ? 0 : 20);

  useEffect(() => {
    if (visible) {
      AccessibilityInfo.announceForAccessibility(message);
      if (reduced) {
        opacity.value = withTiming(1, { duration: 150 });
        translateY.value = 0;
      } else {
        opacity.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.ease) });
        translateY.value = withSpring(0, getSpringConfig());
      }

      const timer = setTimeout(() => {
        onDismiss();
      }, durationMs);

      return () => clearTimeout(timer);
    } else {
      if (reduced) {
        opacity.value = withTiming(0, { duration: 100 });
      } else {
        opacity.value = withTiming(0, { duration: 180, easing: Easing.in(Easing.ease) });
        translateY.value = withTiming(15, { duration: 180 });
      }
    }
  }, [visible, message, durationMs, onDismiss, reduced, opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (!visible) return null;

  return (
    <Animated.View
      style={[styles.container, animatedStyle]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      pointerEvents="box-none"
    >
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Check size={16} color={theme.colors.surface} strokeWidth={2.5} />
        </View>

        <Text style={styles.messageText} numberOfLines={2}>
          {message}
        </Text>

        <TouchableOpacity
          style={styles.undoButton}
          onPress={onUndo}
          accessibilityRole="button"
          accessibilityLabel={t('Undo')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.undoText}>{t('Undo')}</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const createStyles = (theme: ThemeType) =>
  StyleSheet.create({
    container: {
      position: 'absolute',
      bottom: 60,
      left: theme.spacing.md,
      right: theme.spacing.md,
      zIndex: 9999,
      alignItems: 'center',
    },
    content: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surfaceElevated || theme.colors.surface,
      borderColor: theme.colors.border,
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: theme.radius.full,
      paddingVertical: theme.spacing.xs,
      paddingLeft: theme.spacing.sm,
      paddingRight: theme.spacing.xs,
      minHeight: 48,
      shadowColor: theme.colors.textPrimary,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 6,
      maxWidth: '100%',
    },
    iconCircle: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: theme.colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: theme.spacing.sm,
    },
    messageText: {
      flex: 1,
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.textPrimary,
      paddingRight: theme.spacing.xs,
    },
    undoButton: {
      minHeight: 44,
      minWidth: 44,
      paddingHorizontal: theme.spacing.md,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.surfaceSubtle || theme.colors.surface,
      borderRadius: theme.radius.full,
    },
    undoText: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.primary,
    },
  });
