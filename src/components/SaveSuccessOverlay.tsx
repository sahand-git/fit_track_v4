import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
  FadeIn,
  FadeOut,
  SharedValue,
} from 'react-native-reanimated';
import { Check, Sparkles } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
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

interface ConfettiPiece {
  id: number;
  angle: number;
  velocity: number;
  gravity: number;
  color: string;
  size: number;
  shape: 'ribbon' | 'sequin' | 'diamond';
  spinSpeed: number;
}

const LUXURY_CONFETTI_COLORS = [
  '#D4AF37', // Imperial Gold
  '#F5E6C8', // Champagne Pearl
  '#1E3A2F', // Forest Emerald
  '#2D6A4F', // Lush Jade
  '#C1664C', // Terracotta Sienna
  '#3B6B78', // Slate Cyan
  '#E8B86D', // Warm Amber
  '#FFFFFF', // Diamond White
];

const CONFETTI_COUNT = 32;

function generateParticles(): ConfettiPiece[] {
  return Array.from({ length: CONFETTI_COUNT }).map((_, i) => {
    // Biased mostly upward (-PI to 0) with a 360-degree radial bloom
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * (Math.PI * 1.5);
    const shapeType: 'ribbon' | 'sequin' | 'diamond' =
      i % 3 === 0 ? 'ribbon' : i % 3 === 1 ? 'sequin' : 'diamond';

    return {
      id: i,
      angle,
      velocity: 130 + Math.random() * 160,
      gravity: 190 + Math.random() * 80,
      color: LUXURY_CONFETTI_COLORS[i % LUXURY_CONFETTI_COLORS.length],
      size: shapeType === 'ribbon' ? 7 : shapeType === 'sequin' ? 6 : 8,
      shape: shapeType,
      spinSpeed: (Math.random() > 0.5 ? 1 : -1) * (360 + Math.random() * 540),
    };
  });
}

const ConfettiParticle: React.FC<{
  piece: ConfettiPiece;
  progress: SharedValue<number>;
}> = ({ piece, progress }) => {
  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    const p = progress.value;
    const distance = piece.velocity * p;
    // Gravitational acceleration downwards
    const gravity = piece.gravity * (p * p);
    const x = Math.cos(piece.angle) * distance;
    const y = Math.sin(piece.angle) * distance + gravity - (40 * p); // initial upwards kick
    const opacity = p < 0.1 ? p * 10 : Math.max(0, 1 - p * 1.12);
    const scale = p < 0.15 ? p / 0.15 : Math.max(0, 1 - (p - 0.15) * 0.45);
    const rotate = `${p * piece.spinSpeed}deg`;

    return {
      transform: [
        { translateX: x },
        { translateY: y },
        { rotate },
        { scale },
      ],
      opacity,
    };
  });

  const width = piece.shape === 'ribbon' ? piece.size * 2 : piece.size;
  const height = piece.size;
  const borderRadius =
    piece.shape === 'sequin' ? piece.size / 2 : piece.shape === 'diamond' ? 1.5 : 2;

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          width,
          height,
          borderRadius,
          backgroundColor: piece.color,
          transform: piece.shape === 'diamond' ? [{ rotate: '45deg' }] : undefined,
        },
        animatedStyle,
      ]}
    />
  );
};

/**
 * Editorial Luxury Save & Done Celebration Overlay
 * Features an explosive 32-piece Reanimated confetti cannon burst,
 * double gold/emerald medal emblem, and prestigious serif typography.
 */
export const SaveSuccessOverlay: React.FC<SaveSuccessOverlayProps> = ({
  visible,
  message,
}) => {
  const language = useLanguage();
  const t = (str: string) => translate(language, str);

  const [particles, setParticles] = useState<ConfettiPiece[]>([]);
  const cardScale = useSharedValue(isReducedMotion() ? 1 : 0.6);
  const ringScale = useSharedValue(1);
  const progress = useSharedValue(0);

  useEffect(() => {
    if (!visible) {
      cardScale.value = isReducedMotion() ? 1 : 0.6;
      ringScale.value = 1;
      progress.value = 0;
      return;
    }

    // Trigger immediate tactile sensation
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    if (isReducedMotion()) {
      cardScale.value = 1;
      progress.value = 1;
      return;
    }

    // Re-seed confetti cannon trajectories for variety each popup
    setParticles(generateParticles());

    cardScale.value = 0.6;
    cardScale.value = withSpring(1, getSpringConfig('pop'));

    ringScale.value = 0.9;
    ringScale.value = withSpring(1.06, { damping: 10, stiffness: 120 });

    progress.value = 0;
    progress.value = withTiming(1, {
      duration: 900,
      easing: Easing.out(Easing.cubic),
    });
  }, [visible, cardScale, ringScale, progress]);

  const animatedCardStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: cardScale.value }],
    };
  });

  const animatedRingStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: ringScale.value }],
    };
  });

  if (!visible) return null;

  return (
    <Animated.View
      entering={FadeIn.duration(160)}
      exiting={FadeOut.duration(200)}
      style={styles.overlay}
      pointerEvents="auto"
    >
      {/* Confetti Cannon Burst Emitter Positioned at Center Badge */}
      <View style={styles.emitterContainer} pointerEvents="none">
        {particles.map((piece) => (
          <ConfettiParticle key={piece.id} piece={piece} progress={progress} />
        ))}
      </View>

      {/* Luxury Center Celebration Plaque */}
      <Animated.View style={[styles.card, animatedCardStyle]}>
        {/* Double Gold-Emerald Concentric Medal */}
        <View style={styles.medalWrapper}>
          <Animated.View style={[styles.haloRing, animatedRingStyle]} />
          <View style={styles.goldBezel}>
            <View style={styles.innerDisc}>
              <Check size={32} color="#FFFFFF" strokeWidth={3.5} />
            </View>
          </View>
          <View style={styles.sparkleBadge}>
            <Sparkles size={14} color="#D4AF37" strokeWidth={2.4} />
          </View>
        </View>

        {/* Text Presentation */}
        <View style={styles.textContainer}>
          <Text style={styles.doneTitle}>{t('Done')}</Text>
          <Text style={styles.subtitle} numberOfLines={2}>
            {message || t('Saved')}
          </Text>
        </View>
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
    backgroundColor: 'rgba(26, 32, 28, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  emitterContainer: {
    position: 'absolute',
    top: '46%',
    left: '50%',
    width: 0,
    height: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
  },
  particle: {
    position: 'absolute',
  },
  card: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 36,
    paddingTop: 28,
    paddingBottom: 24,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(212, 175, 55, 0.45)', // Imperial Gold subtle hairline
    ...theme.shadow.floating,
    shadowColor: '#1E3A2F',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
    minWidth: 200,
    maxWidth: 290,
    gap: 16,
    zIndex: 10001,
  },
  medalWrapper: {
    width: 84,
    height: 84,
    alignItems: 'center',
    justifyContent: 'center',
  },
  haloRing: {
    position: 'absolute',
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(212, 175, 55, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.35)',
  },
  goldBezel: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#D4AF37',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2.5,
    ...theme.shadow.subtle,
  },
  innerDisc: {
    width: '100%',
    height: '100%',
    borderRadius: 32,
    backgroundColor: theme.colors.primary, // Rich Forest Green #1E3A2F
    alignItems: 'center',
    justifyContent: 'center',
  },
  sparkleBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: 'rgba(212, 175, 55, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadow.subtle,
  },
  textContainer: {
    alignItems: 'center',
    gap: 4,
  },
  doneTitle: {
    fontFamily: theme.fonts.serif,
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.primary,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: theme.fonts.sans,
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    textAlign: 'center',
    letterSpacing: 0.1,
    paddingHorizontal: 4,
  },
});
