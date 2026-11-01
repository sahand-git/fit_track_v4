import React, { useMemo } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet
} from 'react-native';
import { AppText as Text } from './AppText';
import { Droplet, Plus, Minus, Check } from 'lucide-react-native';
import { useLanguage } from '../i18n/I18nContext';
import { translate } from '../i18n/strings';
import { useTheme } from '../theme/ThemeContext';
import { ThemeType } from '../theme';
import * as Haptics from 'expo-haptics';
import { useAppDialog } from './dialogs/AppDialogProvider';

interface WaterTrackerProps {
  glasses: number;
  target: number;
  onUpdate: (delta: number) => void;
}

export const WaterTracker: React.FC<WaterTrackerProps> = ({
  glasses,
  target,
  onUpdate,
}) => {
  const language = useLanguage();
  const { theme } = useTheme();
  const dialog = useAppDialog();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const t = (key: string) => translate(language, key);

  const currentLiters = ((glasses * 250) / 1000).toFixed(1);
  const targetLiters = ((target * 250) / 1000).toFixed(1);
  const isGoalReached = target > 0 && glasses >= target;

  const handleAdd = async () => {
    if (target > 0 && glasses >= Math.round(target * 1.5)) {
      const confirmed = await dialog.confirm({
        title: t('High Water Intake'),
        message: t('You have logged over 150% of your daily water goal. Add another glass?'),
        confirmText: t('Add'),
        cancelText: t('Cancel'),
      });
      if (!confirmed) return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onUpdate(1);
  };

  const handleSubtract = () => {
    if (glasses <= 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onUpdate(-1);
  };

  return (
    <View style={[styles.container, isGoalReached && styles.containerGoalReached]}>
      <View style={styles.left}>
        <View style={[styles.iconCircle, isGoalReached && styles.iconCircleGoalReached]}>
          <Droplet size={18} color={isGoalReached ? theme.colors.emeraldDark : theme.colors.water} />
        </View>
        <View style={styles.textContainer}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{t('Water Intake')}</Text>
            {isGoalReached && (
              <View style={styles.goalReachedBadge}>
                <Check size={11} color={theme.colors.emeraldDark} strokeWidth={2.5} />
                <Text style={styles.goalReachedText}>{t('Goal reached')}</Text>
              </View>
            )}
          </View>
          <Text style={[styles.subtitle, isGoalReached && styles.subtitleGoalReached]}>
            {isGoalReached
              ? `${glasses} ${t('of')} ${target} ${t('glasses')} (${currentLiters}L / ${targetLiters}L) · ${t('Goal reached!')}`
              : `${glasses} ${t('of')} ${target} ${t('glasses')} (${currentLiters}L / ${targetLiters}L)`}
          </Text>
        </View>
      </View>

      <View style={styles.stepper}>
        <TouchableOpacity
          style={[styles.btn, glasses === 0 && styles.btnDisabled]}
          onPress={handleSubtract}
          disabled={glasses === 0}
          accessibilityLabel={t('Remove 1 glass of water')}
          accessibilityRole="button"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Minus size={15} color={glasses === 0 ? theme.colors.textMuted : theme.colors.textPrimary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, isGoalReached ? styles.btnAddGoalReached : styles.btnAdd]}
          onPress={handleAdd}
          accessibilityLabel={t('Add 1 glass of water')}
          accessibilityRole="button"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Plus size={15} color={isGoalReached ? theme.colors.textPrimary : theme.colors.textInverted} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const createStyles = (theme: ThemeType) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginVertical: 6,
    ...theme.shadow.subtle,
  },
  containerGoalReached: {
    borderColor: theme.colors.emeraldBorder,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  textContainer: {
    flex: 1,
    minWidth: 0,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.waterLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleGoalReached: {
    backgroundColor: theme.colors.emeraldLight,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  goalReachedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.emeraldLight,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: theme.radius.full,
  },
  goalReachedText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.emeraldDark,
  },
  subtitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  subtitleGoalReached: {
    color: theme.colors.textPrimary,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnAdd: {
    backgroundColor: theme.colors.primary,
  },
  btnAddGoalReached: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  btnDisabled: {
    opacity: 0.4,
  },
});
