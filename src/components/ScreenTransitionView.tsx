import React, { useEffect } from 'react';
import { StyleSheet, ViewStyle, StyleProp } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
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
 */
export const ScreenTransitionView: React.FC<ScreenTransitionViewProps> = ({
  children,
  style,
  transitionKey,
}) => {
  const language = useLanguage();
  const isRTL = language === 'ar' || language === 'ckb';

  const opacity = useSharedValue(isReducedMotion() ? 1 : 0);
  const translateX = useSharedValue(isReducedMotion() ? 0 : (isRTL ? -14 : 14));

  useEffect(() => {
    if (isReducedMotion()) {
      opacity.value = 1;
      translateX.value = 0;
      return;
    }

    opacity.value = 0;
    translateX.value = isRTL ? -14 : 14;

    opacity.value = withTiming(1, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    });
    translateX.value = withTiming(0, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    });
  }, [transitionKey, isRTL]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [{ translateX: translateX.value }],
    };
  });

  return (
    <Animated.View style={[styles.container, style, animatedStyle]}>
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
