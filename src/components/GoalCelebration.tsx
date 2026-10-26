import React, { useEffect, useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
  FadeIn,
  FadeOut,
  SharedValue,
} from 'react-native-reanimated';
import { Award, Sparkles } from 'lucide-react-native';
import { AppText as Text } from './AppText';
import { useLanguage } from '../i18n/I18nContext';
import { translate } from '../i18n/strings';
import { useTheme } from '../theme/ThemeContext';
import { ThemeType } from '../theme';
import { isReducedMotion } from '../utils/motion';
import { getSpringConfig } from '../utils/reanimatedMotion';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ParticleData {
  id: number;
  angle: number;
  velocity: number;
  color: string;
  size: number;
  isPill: boolean;
}

interface GoalCelebrationProps {
  visible: boolean;
  onDismiss: () => void;
}

const SingleParticle: React.FC<{
  particle: ParticleData;
  progress: SharedValue<number>;
}> = ({ particle, progress }) => {
  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    const p = progress.value;
    const distance = particle.velocity * p;
    // Gravity pulls downwards as progress advances
    const gravity = 220 * (p * p);
    const x = Math.cos(particle.angle) * distance;
    const y = Math.sin(particle.angle) * distance + gravity;
    const opacity = Math.max(0, 1 - p * 1.15);
    const scale = 1 - p * 0.4;
    const rotate = `${p * 360}deg`;

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

  return (
    <Animated.View
      style={[
        { position: 'absolute' },
        {
          width: particle.isPill ? particle.size * 2 : particle.size,
          height: particle.size,
          borderRadius: particle.size / 2,
          backgroundColor: particle.color,
        },
        animatedStyle,
      ]}
    />
  );
};

export const GoalCelebration: React.FC<GoalCelebrationProps> = ({
  visible,
  onDismiss,
}) => {
  const language = useLanguage();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const t = (str: string) => translate(language, str);

  const [particles] = useState<ParticleData[]>(() => {
    const particleColors = [
      theme.colors.primary,   // Forest green
      theme.colors.accent,    // Terracotta
      theme.colors.secondary, // Muted sage
      theme.colors.gold,      // Warm gold
      theme.colors.water,     // Slate cyan
    ];
    return Array.from({ length: 24 }).map((_, i) => ({
      id: i,
      // Angles spray mostly upwards (-PI to 0) with spread
      angle: -Math.PI / 2 + (Math.random() - 0.5) * (Math.PI * 0.8),
      velocity: 140 + Math.random() * 160,
      color: particleColors[i % particleColors.length],
      size: 6 + Math.random() * 6,
      isPill: i % 3 === 0,
    }));
  });

  const progress = useSharedValue(0);
  const cardScale = useSharedValue(0.85);

  useEffect(() => {
    if (!visible) return;

    if (isReducedMotion()) {
      progress.value = 1;
      cardScale.value = 1;
      const timer = setTimeout(onDismiss, 3000);
      return () => clearTimeout(timer);
    }

    progress.value = 0;
    cardScale.value = 0.85;

    // Run particle burst
    progress.value = withTiming(1, {
      duration: 2000,
      easing: Easing.out(Easing.cubic),
    });

    // Card pop
    cardScale.value = withSpring(1, getSpringConfig('pop'));

    // Auto dismiss after 3.2 seconds
    const timer = setTimeout(() => {
      onDismiss();
    }, 3200);

    return () => clearTimeout(timer);
  }, [visible, onDismiss, cardScale, progress]);

  const animatedCardStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: cardScale.value }],
    };
  });

  if (!visible) return null;

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(250)}
      style={styles.overlay}
      pointerEvents="box-none"
    >
      {/* Particle emitter centered above card */}
      {!isReducedMotion() && (
        <View style={styles.emitterPoint} pointerEvents="none">
          {particles.map((p) => (
            <SingleParticle key={p.id} particle={p} progress={progress} />
          ))}
        </View>
      )}

      {/* Celebratory Ledger Banner */}
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onDismiss}
        style={styles.touchArea}
        accessibilityRole="button"
        accessibilityLabel="Dismiss celebration"
      >
        <Animated.View style={[styles.card, animatedCardStyle]}>
          <View style={styles.iconCircle}>
            <Award size={22} color={theme.colors.surface} />
          </View>

          <View style={styles.textContainer}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>{t('Daily Goal Reached!')}</Text>
              <Sparkles size={14} color={theme.colors.gold} />
            </View>
            <Text style={styles.message}>
              {t('You hit your calorie target for today.')}
            </Text>
          </View>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const createStyles = (theme: ThemeType) => StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 70,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 999,
  },
  touchArea: {
    width: '90%',
    maxWidth: 380,
  },
  emitterPoint: {
    position: 'absolute',
    top: 25,
    left: SCREEN_WIDTH / 2,
    width: 0,
    height: 0,
  },
  particle: {
    position: 'absolute',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: theme.radius.lg,
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    ...theme.shadow.floating,
    gap: 12,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontFamily: theme.fonts.serif,
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  message: {
    fontFamily: theme.fonts.sans,
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
});
