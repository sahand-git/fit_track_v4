import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { Check } from 'lucide-react-native';
import { AppText as Text } from './AppText';
import { useLanguage } from '../i18n/I18nContext';
import { translate } from '../i18n/strings';
import { isReducedMotion } from '../utils/motion';
import { getSpringConfig } from '../utils/reanimatedMotion';
import { theme } from '../theme';

interface SaveSuccessOverlayProps {
  visible: boolean;
  message?: string;
}

/**
 * Editorial Ledger Save Success Overlay
 * Displays a tactile spring checkmark before sheet dismissal.
 */
export const SaveSuccessOverlay: React.FC<SaveSuccessOverlayProps> = ({
  visible,
  message,
}) => {
  const language = useLanguage();
  const t = (str: string) => translate(language, str);

  const scale = useSharedValue(isReducedMotion() ? 1 : 0.4);

  useEffect(() => {
    if (!visible) {
      scale.value = isReducedMotion() ? 1 : 0.4;
      return;
    }

    if (isReducedMotion()) {
      scale.value = 1;
      return;
    }

    scale.value = withSpring(1, getSpringConfig('pop'));
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  if (!visible) return null;

  return (
    <Animated.View
      entering={FadeIn.duration(150)}
      exiting={FadeOut.duration(150)}
      style={styles.overlay}
      pointerEvents="auto"
    >
      <Animated.View style={[styles.card, animatedStyle]}>
        <View style={styles.iconCircle}>
          <Check size={28} color="#FFFFFF" strokeWidth={3} />
        </View>
        <Text style={styles.text}>{message || t('Saved')}</Text>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(250, 247, 242, 0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  card: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 28,
    paddingVertical: 22,
    borderRadius: theme.radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    ...theme.shadow.floating,
    gap: 12,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontFamily: theme.fonts.serif,
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.primary,
    letterSpacing: -0.3,
  },
});
