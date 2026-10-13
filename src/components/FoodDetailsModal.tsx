import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView
} from 'react-native';
import { AppText as Text } from './AppText';
import {
  X,
  Plus,
  Minus,
  Check,
  Trash2,
} from 'lucide-react-native';
import { LoggedMeal, FoodItem } from '../types';
import { useLanguage } from '../i18n/I18nContext';
import { translate } from '../i18n/strings';
import { theme } from '../theme';
import * as Haptics from 'expo-haptics';

interface FoodDetailsModalProps {
  visible: boolean;
  item: LoggedMeal | FoodItem | null;
  isLogged?: boolean;
  onClose: () => void;
  onSave?: (servings: number) => void;
  onDelete?: () => void;
}

export const FoodDetailsModal: React.FC<FoodDetailsModalProps> = ({
  visible,
  item,
  isLogged = false,
  onClose,
  onSave,
  onDelete,
}) => {
  const language = useLanguage();
  const t = (key: string) => translate(language, key);
  const [servings, setServings] = useState(1);

  useEffect(() => {
    if (item && 'servings' in item) {
      setServings(item.servings || 1);
    } else {
      setServings(1);
    }
  }, [item, visible]);

  if (!item) return null;

  const baseKcal = 'servings' in item && item.servings > 0
    ? Math.round(item.calories / item.servings)
    : item.calories;
  const baseProtein = 'servings' in item && item.servings > 0
    ? Math.round((item.protein / item.servings) * 10) / 10
    : item.protein;
  const baseCarbs = 'servings' in item && item.servings > 0
    ? Math.round((item.carbs / item.servings) * 10) / 10
    : item.carbs;
  const baseFat = 'servings' in item && item.servings > 0
    ? Math.round((item.fat / item.servings) * 10) / 10
    : item.fat;

  const currentKcal = Math.round(baseKcal * servings);
  const currentProtein = Math.round(baseProtein * servings * 10) / 10;
  const currentCarbs = Math.round(baseCarbs * servings * 10) / 10;
  const currentFat = Math.round(baseFat * servings * 10) / 10;
  const currentGrams = Math.round((item.servingGrams || 100) * servings);

  const handleMinus = () => {
    if (servings > 0.5) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      setServings((prev) => Math.max(0.5, Math.round((prev - 0.5) * 10) / 10));
    }
  };

  const handlePlus = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setServings((prev) => Math.round((prev + 0.5) * 10) / 10);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={[styles.backdrop, { direction: language === 'en' ? 'ltr' : 'rtl' }]}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.foodName}>{item.name}</Text>
              {item.brand && <Text style={styles.brand}>{item.brand}</Text>}
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} accessibilityLabel={t('Close')}>
              <X size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            {/* Energy Overview */}
            <View style={styles.energyCard}>
              <View>
                <Text style={styles.kcalValue}>{currentKcal}</Text>
                <Text style={styles.kcalLabel}>{t('Total Calories (kcal)')}</Text>
              </View>
              <Text style={styles.portionLabel}>
                {servings} × {item.servingSize} ({currentGrams}g)
              </Text>
            </View>

            {/* Macronutrients Row */}
            <View style={styles.macroRow}>
              <View style={styles.macroCard}>
                <Text style={styles.macroTitle}>{t('Protein')}</Text>
                <Text style={[styles.macroValue, { color: theme.colors.macroProtein }]}>
                  {currentProtein}g
                </Text>
              </View>
              <View style={styles.macroCard}>
                <Text style={styles.macroTitle}>{t('Carbs')}</Text>
                <Text style={[styles.macroValue, { color: theme.colors.macroCarbs }]}>
                  {currentCarbs}g
                </Text>
              </View>
              <View style={styles.macroCard}>
                <Text style={styles.macroTitle}>{t('Fat')}</Text>
                <Text style={[styles.macroValue, { color: theme.colors.macroFat }]}>
                  {currentFat}g
                </Text>
              </View>
            </View>

            {/* Servings Stepper */}
            <View style={styles.stepperContainer}>
              <Text style={styles.stepperLabel}>{t('Portion Multiplier')}</Text>
              <View style={styles.stepper}>
                <TouchableOpacity style={styles.stepperBtn} onPress={handleMinus}>
                  <Minus size={16} color={theme.colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.servingsText}>{servings} {t('servings')}</Text>
                <TouchableOpacity style={styles.stepperBtn} onPress={handlePlus}>
                  <Plus size={16} color={theme.colors.textPrimary} />
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

          {/* Actions Bottom Bar */}
          <View style={styles.footer}>
            {isLogged && onDelete && (
              <TouchableOpacity style={styles.deleteBtn} onPress={onDelete} accessibilityLabel={t('Delete')}>
                <Trash2 size={18} color={theme.colors.danger} />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.saveBtn}
              onPress={() => {
                if (onSave) onSave(servings);
                onClose();
              }}
            >
              <Check size={16} color={theme.colors.textInverted} />
              <Text style={styles.saveBtnText}>
                {isLogged ? t('Update Portion') : t('Confirm')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: theme.colors.backdrop,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    maxHeight: '80%',
    padding: theme.spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  foodName: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  brand: {
    fontSize: 13,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  content: {
    gap: 14,
    paddingBottom: 20,
  },
  energyCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
  },
  kcalValue: {
    fontSize: 30,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  kcalLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  portionLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  macroRow: {
    flexDirection: 'row',
    gap: 8,
  },
  macroCard: {
    flex: 1,
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.radius.md,
    padding: 12,
    alignItems: 'center',
  },
  macroTitle: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginBottom: 4,
  },
  macroValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  stepperContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  stepperLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.radius.sm,
    gap: 8,
    padding: 4,
  },
  stepperBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  servingsText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    minWidth: 70,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  deleteBtn: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.dangerLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtn: {
    flex: 1,
    height: 44,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    ...theme.shadow.subtle,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textInverted,
  },
});
