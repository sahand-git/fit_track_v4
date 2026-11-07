import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText as Text } from '../components/AppText';
import {
  Award,
  Flame,
  CheckCircle2,
  Lock,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react-native';
import { useLanguage } from '../i18n/I18nContext';
import { translate } from '../i18n/strings';
import { useTheme } from '../theme/ThemeContext';
import { ThemeType } from '../theme';
import * as Haptics from 'expo-haptics';
import {
  ACHIEVEMENTS_CATALOG,
  AchievementCategory,
  getUnlockedAchievementIds,
  calculateStreakFreezes,
} from '../utils/achievements';
import { UserProfile } from '../types';
import { useIsRTL } from '../hooks/useIsRTL';

interface AchievementsScreenProps {
  profile: UserProfile;
  streak?: number;
  onBack: () => void;
}

const CATEGORIES: { key: AchievementCategory; labelKey: string }[] = [
  { key: 'consistency', labelKey: 'Consistency' },
  { key: 'nutrition', labelKey: 'Nutrition' },
  { key: 'fitness', labelKey: 'Fitness' },
  { key: 'exploration', labelKey: 'Exploration' },
];

export const AchievementsScreen: React.FC<AchievementsScreenProps> = ({
  profile,
  streak = 0,
  onBack,
}) => {
  const language = useLanguage();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const isRtl = useIsRTL();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const t = (key: string) => translate(language, key);

  const [unlockedIds, setUnlockedIds] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<AchievementCategory>('consistency');

  useEffect(() => {
    getUnlockedAchievementIds().then(setUnlockedIds).catch(() => {});
  }, []);

  const availableFreezes = calculateStreakFreezes(streak);

  const filteredAchievements = useMemo(
    () => ACHIEVEMENTS_CATALOG.filter((a) => a.category === selectedCategory),
    [selectedCategory]
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            onBack();
          }}
          accessibilityRole="button"
          accessibilityLabel={t('Back')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          {isRtl ? <ChevronRight size={22} color={theme.colors.textPrimary} /> : <ChevronLeft size={22} color={theme.colors.textPrimary} />}
        </TouchableOpacity>
        <Text style={styles.screenTitle}>{t('Achievements')}</Text>
        <View style={styles.backPlaceholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Streak & Freeze Status Card (Section 5.4) */}
        <View style={styles.streakFreezeCard}>
          <View style={styles.streakFreezeTop}>
            <View style={styles.streakInfo}>
              <View style={styles.flameIconBox}>
                <Flame size={20} color={theme.colors.orange} />
              </View>
              <View>
                <Text style={styles.streakCountText}>
                  {streak} {t('Day Streak')}
                </Text>
                <Text style={styles.streakSubText}>
                  {t('1 freeze earned every 7 days (max 5)')}
                </Text>
              </View>
            </View>
          </View>

          {/* Flame Token Slots */}
          <View style={styles.slotsRow}>
            {[1, 2, 3, 4, 5].map((slotIndex) => {
              const isFilled = slotIndex <= availableFreezes;
              return (
                <View
                  key={slotIndex}
                  style={[
                    styles.freezeSlot,
                    isFilled ? styles.freezeSlotFilled : styles.freezeSlotEmpty,
                  ]}
                >
                  <Flame
                    size={16}
                    color={isFilled ? theme.colors.orange : theme.colors.textMuted}
                  />
                </View>
              );
            })}
          </View>
          <Text style={styles.freezesAvailableText}>
            {availableFreezes} / 5 {t('Streak Freezes Available')}
          </Text>
        </View>

        {/* Category Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryRow}
        >
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.key;
            return (
              <TouchableOpacity
                key={cat.key}
                style={[styles.categoryPill, isSelected && styles.categoryPillActive]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                  setSelectedCategory(cat.key);
                }}
                accessibilityRole="button"
                accessibilityLabel={t(cat.labelKey)}
              >
                <Text
                  style={[
                    styles.categoryPillText,
                    isSelected && styles.categoryPillTextActive,
                  ]}
                >
                  {t(cat.labelKey)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Achievements List */}
        <View style={styles.achievementsList}>
          {filteredAchievements.map((item) => {
            const isUnlocked = unlockedIds.includes(item.id);
            return (
              <View
                key={item.id}
                style={[styles.achievementRow, isUnlocked && styles.achievementRowUnlocked]}
              >
                <View
                  style={[
                    styles.badgeIconCircle,
                    isUnlocked ? styles.badgeIconCircleUnlocked : styles.badgeIconCircleLocked,
                  ]}
                >
                  {isUnlocked ? (
                    <Award size={22} color={theme.colors.amber} />
                  ) : (
                    <Lock size={18} color={theme.colors.textMuted} />
                  )}
                </View>

                <View style={styles.achievementInfo}>
                  <View style={styles.achievementTitleRow}>
                    <Text
                      style={[
                        styles.achievementItemTitle,
                        !isUnlocked && styles.achievementItemTitleLocked,
                      ]}
                    >
                      {t(item.titleKey)}
                    </Text>
                    {isUnlocked && (
                      <View style={styles.unlockedCheck}>
                        <CheckCircle2 size={14} color={theme.colors.emerald} />
                      </View>
                    )}
                  </View>
                  <Text style={styles.achievementItemDesc}>{t(item.descKey)}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
};

const createStyles = (theme: ThemeType) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    backBtn: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    screenTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.textPrimary,
      fontFamily: theme.fonts.serif,
    },
    backPlaceholder: {
      width: 40,
    },
    scrollContent: {
      padding: theme.spacing.md,
    },
    streakFreezeCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.lg,
    },
    streakFreezeTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    streakInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    flameIconBox: {
      width: 40,
      height: 40,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.orangeWarmLight || theme.colors.surfaceSubtle,
      alignItems: 'center',
      justifyContent: 'center',
    },
    streakCountText: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.textPrimary,
      fontFamily: theme.fonts.serif,
    },
    streakSubText: {
      fontSize: 12,
      color: theme.colors.textMuted,
      marginTop: 2,
    },
    slotsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
      marginVertical: 8,
    },
    freezeSlot: {
      flex: 1,
      height: 40,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    freezeSlotFilled: {
      backgroundColor: theme.colors.amberLight,
      borderColor: theme.colors.amberBorder,
    },
    freezeSlotEmpty: {
      backgroundColor: theme.colors.surfaceSubtle,
      borderColor: theme.colors.border,
      opacity: 0.6,
    },
    freezesAvailableText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginTop: 6,
    },
    categoryRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: theme.spacing.md,
    },
    categoryPill: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    categoryPillActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    categoryPillText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.textSecondary,
    },
    categoryPillTextActive: {
      color: theme.colors.textInverted,
    },
    achievementsList: {
      gap: 10,
    },
    achievementRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 14,
    },
    achievementRowUnlocked: {
      borderColor: theme.colors.borderStrong,
    },
    badgeIconCircle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeIconCircleUnlocked: {
      backgroundColor: theme.colors.amberLight,
      borderWidth: 1,
      borderColor: theme.colors.amberBorder,
    },
    badgeIconCircleLocked: {
      backgroundColor: theme.colors.surfaceSubtle,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    achievementInfo: {
      flex: 1,
    },
    achievementTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    achievementItemTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.textPrimary,
    },
    achievementItemTitleLocked: {
      color: theme.colors.textMuted,
    },
    achievementItemDesc: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    unlockedCheck: {
      marginLeft: 6,
    },
  });
