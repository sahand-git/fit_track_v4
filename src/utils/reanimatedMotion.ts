import {
  Easing,
  WithSpringConfig,
  WithTimingConfig,
  LinearTransition,
  FadeIn,
  FadeOut,
  FadeInDown,
  FadeOutUp,
  ReduceMotion,
} from 'react-native-reanimated';
import { isReducedMotion } from './motion';

/**
 * Editorial Ledger Motion Configurations
 * Restrained, calm, and responsive (150-400ms)
 */
export const MOTION = {
  duration: {
    instant: 0,
    quick: 180,
    base: 260,
    deliberate: 350,
  },
  easing: {
    outCubic: Easing.out(Easing.cubic),
    outQuad: Easing.out(Easing.quad),
    inOutQuad: Easing.inOut(Easing.quad),
    spring: Easing.bezier(0.25, 1, 0.5, 1),
  },
  spring: {
    tactile: {
      damping: 18,
      stiffness: 190,
      mass: 0.8,
      overshootClamping: false,
    } as const,
    pop: {
      damping: 14,
      stiffness: 240,
      mass: 0.6,
      overshootClamping: false,
    } as const,
    sheet: {
      damping: 24,
      stiffness: 220,
      mass: 0.9,
      overshootClamping: true,
    } as const,
  },
};

/**
 * Default timing options respecting accessibility reduced motion
 */
export function getTimingConfig(duration = MOTION.duration.base): WithTimingConfig {
  if (isReducedMotion()) {
    return {
      duration: 0,
      reduceMotion: ReduceMotion.Always,
    };
  }
  return {
    duration,
    easing: MOTION.easing.outCubic,
    reduceMotion: ReduceMotion.System,
  };
}

/**
 * Default spring options respecting accessibility reduced motion
 */
export function getSpringConfig(preset: keyof typeof MOTION.spring = 'tactile'): WithSpringConfig {
  const cfg = MOTION.spring[preset];
  if (isReducedMotion()) {
    return {
      damping: 50,
      stiffness: 500,
      reduceMotion: ReduceMotion.Always,
    };
  }
  return {
    ...cfg,
    reduceMotion: ReduceMotion.System,
  };
}

/**
 * Returns horizontal slide distance mirrored for RTL
 */
export function getRtlSlideOffset(distance: number, isRTL: boolean): number {
  return isRTL ? -distance : distance;
}

/**
 * Standard card staggered entry transition
 */
export function getStaggeredCardEntry(index: number, baseDelay = 50) {
  if (isReducedMotion()) {
    return FadeIn.duration(0);
  }
  return FadeInDown.duration(MOTION.duration.base)
    .delay(index * baseDelay)
    .easing(MOTION.easing.outCubic);
}

/**
 * Smooth row layout transition for lists (adding/deleting foods/workouts)
 */
export function getListLayoutTransition() {
  if (isReducedMotion()) {
    return undefined;
  }
  return LinearTransition.duration(MOTION.duration.base).easing(MOTION.easing.outCubic);
}

/**
 * Standard item enter animation
 */
export function getItemEnterAnimation() {
  if (isReducedMotion()) {
    return FadeIn.duration(0);
  }
  return FadeInDown.duration(MOTION.duration.base).easing(MOTION.easing.outCubic);
}

/**
 * Standard item exit animation
 */
export function getItemExitAnimation() {
  if (isReducedMotion()) {
    return FadeOut.duration(0);
  }
  return FadeOutUp.duration(MOTION.duration.quick).easing(MOTION.easing.outCubic);
}
