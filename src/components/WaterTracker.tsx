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
  target?: number;
  onUpdate: (delta: number) => void;
}

export const WaterTracker: React.FC<WaterTrackerProps> = ({
  glasses = 0,
  target = 8,
  onUpdate,
}) => {
  const language = useLanguage();
  const t = (str: string) => translate(language, str);

  const handleAdd = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onUpdate(1);
  };

  const handleSubtract = () => {
    if (glasses > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      onUpdate(-1);
    }
  };

  const currentLiters = (glasses * 0.25).toFixed(1);
  const targetLiters = (target * 0.25).toFixed(1);

  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <View style={styles.iconCircle}>
          <Droplet size={18} color={theme.colors.water} fill={theme.colors.water} />
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
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Minus size={16} color={glasses === 0 ? theme.colors.textMuted : theme.colors.textPrimary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, styles.btnAdd]}
          onPress={handleAdd}
          accessibilityLabel={t('Add 1 glass of water')}
          accessibilityRole="button"
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Plus size={16} color={theme.colors.textInverted} />
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
    padding: 16,
    borderRadius: theme.radius.lg,
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.waterLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: theme.typography.bodyMedium.fontSize,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  subtitle: {
    fontSize: theme.typography.callout.fontSize,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btn: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
