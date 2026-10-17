import React from 'react';
import { StyleSheet, ViewStyle, StyleProp } from 'react-native';
import Animated, {
  FadeInLeft,
  FadeInRight,
  Easing,
} from 'react-native-reanimated';
import { useLanguage } from '../i18n/I18nContext';
import { isReducedMotion } from '../utils/motion';

interface ScreenTransitionViewProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  transitionKey: string;
}

/**
 * Editorial Ledger Screen Transition Container
 * Provides a gentle fade + subtle horizontal slide (mirrored in RTL).
 * Never blocks touches and respects reduce-motion.
 * Uses keyed remount with entering animations so the new screen
 * never paints fully visible before animating (eliminating first-frame flash).
 */
export const ScreenTransitionView: React.FC<ScreenTransitionViewProps> = ({
  children,
  style,
  transitionKey,
}) => {
  const language = useLanguage();
  const isRTL = language === 'ar' || language === 'ckb';

  const enteringAnimation = isReducedMotion()
    ? undefined
    : isRTL
      ? FadeInLeft.duration(220)
          .easing(Easing.out(Easing.cubic))
          .withInitialValues({ transform: [{ translateX: -14 }] })
      : FadeInRight.duration(220)
          .easing(Easing.out(Easing.cubic))
          .withInitialValues({ transform: [{ translateX: 14 }] });

  return (
    <Animated.View
      key={transitionKey}
      entering={enteringAnimation}
      style={[styles.container, style]}
    >
      {children}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
});
