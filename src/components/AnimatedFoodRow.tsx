import React, { useEffect, useRef } from 'react';
import { Animated, ViewProps } from 'react-native';
import { isReducedMotion } from '../utils/motion';

interface AnimatedFoodRowProps extends ViewProps {
  children: React.ReactNode;
  delay?: number;
}

export const AnimatedFoodRow: React.FC<AnimatedFoodRowProps> = ({
  children,
  style,
  delay = 0,
  ...rest
}) => {
  const animatedOpacity = useRef(new Animated.Value(isReducedMotion() ? 1 : 0)).current;
  const animatedTranslateY = useRef(new Animated.Value(isReducedMotion() ? 0 : 6)).current;

  useEffect(() => {
    if (isReducedMotion()) return;

    Animated.parallel([
      Animated.timing(animatedOpacity, {
        toValue: 1,
        duration: 220,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(animatedTranslateY, {
        toValue: 0,
        duration: 220,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [delay]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: animatedOpacity,
          transform: [{ translateY: animatedTranslateY }],
        },
      ]}
      {...rest}
    >
      {children}
    </Animated.View>
  );
};
