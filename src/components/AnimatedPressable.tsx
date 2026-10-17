import React, { useState } from 'react';
import {
  Animated,
  TouchableOpacityProps,
  TouchableOpacity,
  GestureResponderEvent,
} from 'react-native';
import { isReducedMotion } from '../utils/motion';

interface AnimatedPressableProps extends TouchableOpacityProps {
  minScale?: number;
}

export const AnimatedPressable: React.FC<AnimatedPressableProps> = ({
  children,
  style,
  onPressIn,
  onPressOut,
  minScale = 0.975,
  ...rest
}) => {
  const [scale] = useState(() => new Animated.Value(1));

  const handlePressIn = (e: GestureResponderEvent) => {
    if (!isReducedMotion()) {
      Animated.spring(scale, {
        toValue: minScale,
        useNativeDriver: true,
        speed: 40,
        bounciness: 0,
      }).start();
    }
    onPressIn?.(e);
  };

  const handlePressOut = (e: GestureResponderEvent) => {
    if (!isReducedMotion()) {
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 40,
        bounciness: 0,
      }).start();
    }
    onPressOut?.(e);
  };

  return (
    <TouchableOpacity
      accessibilityRole={rest.accessibilityRole ?? 'button'}
      accessibilityLabel={rest.accessibilityLabel}
      hitSlop={rest.hitSlop ?? { top: 8, bottom: 8, left: 8, right: 8 }}
      {...rest}
      activeOpacity={rest.activeOpacity ?? 0.85}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View style={[{ transform: [{ scale }] }, style]}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
};
