import React, { useRef } from 'react';
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
  const scale = useRef(new Animated.Value(1)).current;

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
