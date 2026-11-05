import React from 'react';
import {
  TouchableOpacityProps,
  TouchableOpacity,
  GestureResponderEvent,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { isReducedMotion } from '../utils/motion';
import { getSpringConfig } from '../utils/reanimatedMotion';

export interface AnimatedPressableProps extends TouchableOpacityProps {
  minScale?: number;
}

export const AnimatedPressable: React.FC<AnimatedPressableProps> = ({
  children,
  style,
  onPressIn,
  onPressOut,
  minScale = 0.96,
  ...rest
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const handlePressIn = (e: GestureResponderEvent) => {
    if (!isReducedMotion()) {
      // eslint-disable-next-line react-hooks/immutability
      scale.value = withSpring(minScale, getSpringConfig('tactile'));
    }
    onPressIn?.(e);
  };

  const handlePressOut = (e: GestureResponderEvent) => {
    if (!isReducedMotion()) {
      // eslint-disable-next-line react-hooks/immutability
      scale.value = withSpring(1, getSpringConfig('pop'));
    }
    onPressOut?.(e);
  };

  return (
    <TouchableOpacity
      accessibilityRole={rest.accessibilityRole ?? 'button'}
      accessibilityLabel={rest.accessibilityLabel}
      hitSlop={rest.hitSlop ?? { top: 8, bottom: 8, left: 8, right: 8 }}
      {...rest}
      activeOpacity={rest.activeOpacity ?? 0.88}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View style={[animatedStyle, style]}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
};
