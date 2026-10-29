import React from 'react';
import { ViewProps } from 'react-native';
import Animated, { FadeInDown, FadeOutRight } from 'react-native-reanimated';
import { isReducedMotion } from '../utils/motion';
import { MOTION } from '../utils/reanimatedMotion';

interface AnimatedFoodRowProps extends ViewProps {
  children: React.ReactNode;
  delay?: number;
}

/**
 * Editorial Ledger Animated Food Row
 * Smooth Reanimated entry and exit transitions for adding and deleting meal items.
 * Layout transition removed to prevent Android initial height calculation clipping.
 */
export const AnimatedFoodRow: React.FC<AnimatedFoodRowProps> = ({
  children,
  style,
  delay = 0,
  ...rest
}) => {
  const enterAnim = isReducedMotion()
    ? undefined
    : FadeInDown.duration(MOTION.duration.base)
        .delay(delay)
        .easing(MOTION.easing.outCubic);

  const exitAnim = isReducedMotion()
    ? undefined
    : FadeOutRight.duration(MOTION.duration.quick)
        .easing(MOTION.easing.outCubic);

  return (
    <Animated.View
      entering={enterAnim}
      exiting={exitAnim}
      style={style}
      {...rest}
    >
      {children}
    </Animated.View>
  );
};
