import React from 'react';
import { ViewProps } from 'react-native';
import Animated, {
  FadeInDown,
  FadeOutLeft,
  FadeOut,
  LinearTransition,
  ReduceMotion,
} from 'react-native-reanimated';
import { MOTION } from '../utils/reanimatedMotion';
import { isReducedMotion } from '../utils/motion';

interface AnimatedFoodRowProps extends ViewProps {
  children: React.ReactNode;
  isNew?: boolean;
  index?: number;
}

export const AnimatedFoodRow: React.FC<AnimatedFoodRowProps> = ({
  children,
  isNew = false,
  index = 0,
  style,
  ...rest
}) => {
  const reduced = isReducedMotion();

  const enteringAnimation =
    isNew && !reduced
      ? FadeInDown.duration(MOTION.duration.base)
          .delay(Math.min(index, 5) * 35)
          .easing(MOTION.easing.outCubic)
          .reduceMotion(ReduceMotion.System)
      : undefined;

  const exitingAnimation = !reduced
    ? FadeOutLeft.duration(MOTION.duration.quick)
        .easing(MOTION.easing.outCubic)
        .reduceMotion(ReduceMotion.System)
    : FadeOut.duration(0);

  const layoutTransition = !reduced
    ? LinearTransition.springify()
        .damping(MOTION.spring.tactile.damping)
        .stiffness(MOTION.spring.tactile.stiffness)
        .mass(MOTION.spring.tactile.mass)
        .reduceMotion(ReduceMotion.System)
    : undefined;

  return (
    <Animated.View
      entering={enteringAnimation}
      exiting={exitingAnimation}
      layout={layoutTransition}
      style={style}
      {...rest}
    >
      {children}
    </Animated.View>
  );
};
