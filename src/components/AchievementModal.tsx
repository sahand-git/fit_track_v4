import React, { useMemo, useEffect } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { AppText as Text } from './AppText';
import { Award, Sparkles, X, Check } from 'lucide-react-native';
import { useLanguage } from '../i18n/I18nContext';
import { translate } from '../i18n/strings';
import { useTheme } from '../theme/ThemeContext';
import { ThemeType } from '../theme';
import * as Haptics from 'expo-haptics';
import { AchievementDefinition, ACHIEVEMENTS_CATALOG } from '../utils/achievements';
import { isReducedMotion } from '../utils/motion';
import { getSpringConfig } from '../utils/reanimatedMotion';

interface AchievementModalProps {
  visible: boolean;
  achievement: AchievementDefinition | null;
  unlockedCount: number;
  onClose: () => void;
}

export const AchievementModal: React.FC<AchievementModalProps> = ({
  visible,
  achievement,
  unlockedCount,
  onClose,
}) => {
  const language = useLanguage();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const t = (key: string) => translate(language, key);

  const scale = useSharedValue(0.7);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible && achievement) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      if (isReducedMotion()) {
        scale.value = 1;
        opacity.value = 1;
      } else {
        scale.value = withSpring(1, getSpringConfig('pop'));
        opacity.value = withTiming(1, { duration: 250 });
      }
    } else {
      scale.value = 0.7;
      opacity.value = 0;
    }
  }, [visible, achievement, scale, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  if (!visible || !achievement) return null;

  const totalAchievements = ACHIEVEMENTS_CATALOG.length;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Animated.View style={[styles.card, animatedStyle]}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={t('Close')}
          >
            <X size={18} color={theme.colors.textMuted} />
          </TouchableOpacity>

          {/* Laurel Emblem */}
          <View style={styles.emblemContainer}>
            <View style={styles.emblemGlow} />
            <View style={styles.emblemCircle}>
              <Award size={36} color={theme.colors.amber} />
            </View>
            <View style={styles.sparkle1}>
              <Sparkles size={16} color={theme.colors.amber} />
            </View>
            <View style={styles.sparkle2}>
              <Sparkles size={14} color={theme.colors.primary} />
            </View>
          </View>

          {/* Header */}
          <Text style={styles.unlockedTag}>{t('Achievement Unlocked!')}</Text>
          <Text style={styles.achievementTitle}>{t(achievement.titleKey)}</Text>
          <Text style={styles.achievementDesc}>{t(achievement.descKey)}</Text>

          {/* Progress */}
          <View style={styles.progressContainer}>
            <Text style={styles.progressLabel}>
              {unlockedCount} / {totalAchievements} {t('Achievements Unlocked')}
            </Text>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.min(100, (unlockedCount / totalAchievements) * 100)}%` },
                ]}
              />
            </View>
          </View>

          {/* Action button */}
          <TouchableOpacity
            style={styles.continueBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              onClose();
            }}
            accessibilityRole="button"
            accessibilityLabel={t('Awesome!')}
          >
            <Check size={16} color={theme.colors.white} strokeWidth={2.5} />
            <Text style={styles.continueBtnText}>{t('Awesome!')}</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

const createStyles = (theme: ThemeType) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: theme.colors.backdrop,
      alignItems: 'center',
      justifyContent: 'center',
      padding: theme.spacing.lg,
    },
    card: {
      width: '100%',
      maxWidth: 340,
      backgroundColor: theme.colors.surfaceElevated,
      borderRadius: theme.radius.xl,
      borderWidth: 1,
      borderColor: theme.colors.borderStrong,
      padding: theme.spacing.xl,
      alignItems: 'center',
      position: 'relative',
      ...theme.shadow.floating,
    },
    closeBtn: {
      position: 'absolute',
      top: 14,
      right: 14,
      padding: 4,
    },
    emblemContainer: {
      position: 'relative',
      width: 88,
      height: 88,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    emblemGlow: {
      position: 'absolute',
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: theme.colors.amberLight,
    },
    emblemCircle: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: theme.colors.surface,
      borderWidth: 2,
      borderColor: theme.colors.amber,
      alignItems: 'center',
      justifyContent: 'center',
      ...theme.shadow.subtle,
    },
    sparkle1: {
      position: 'absolute',
      top: 0,
      right: 4,
    },
    sparkle2: {
      position: 'absolute',
      bottom: 2,
      left: 6,
    },
    unlockedTag: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.amberDark,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: 4,
    },
    achievementTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.colors.textPrimary,
      fontFamily: theme.fonts.serif,
      textAlign: 'center',
      marginBottom: 6,
    },
    achievementDesc: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: 20,
      lineHeight: 20,
    },
    progressContainer: {
      width: '100%',
      marginBottom: 20,
      alignItems: 'center',
    },
    progressLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.textMuted,
      marginBottom: 6,
    },
    progressBar: {
      width: '100%',
      height: 6,
      borderRadius: 3,
      backgroundColor: theme.colors.surfaceSubtle,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      backgroundColor: theme.colors.emerald,
      borderRadius: 3,
    },
    continueBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      width: '100%',
      paddingVertical: 12,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.primary,
    },
    continueBtnText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.white,
    },
  });
