import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet
} from 'react-native';
import { AppText as Text } from './AppText';
import { Droplet, Plus, Minus } from 'lucide-react-native';
import { useLanguage } from '../i18n/I18nContext';
import { translate } from '../i18n/strings';
import { theme } from '../theme';
import * as Haptics from 'expo-haptics';

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
  const t = (key: string) => translate(language, key);

  const currentLiters = ((glasses * 250) / 1000).toFixed(1);
  const targetLiters = ((target * 250) / 1000).toFixed(1);

  const handleAdd = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onUpdate(1);
  };

  const handleSubtract = () => {
    if (glasses <= 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onUpdate(-1);
  };

  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <View style={styles.iconCircle}>
          <Droplet size={18} color={theme.colors.water} />
        </View>
        <View>
          <Text style={styles.title}>{t('Water Intake')}</Text>
          <Text style={styles.subtitle}>
            {glasses} {t('of')} {target} {t('glasses')} ({currentLiters}L / {targetLiters}L)
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
          style={[styles.btn, styles.btnAdd]}
          onPress={handleAdd}
          accessibilityLabel={t('Add 1 glass of water')}
          accessibilityRole="button"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Plus size={15} color={theme.colors.textInverted} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
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
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.waterLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
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
  btnDisabled: {
    opacity: 0.4,
  },
});
