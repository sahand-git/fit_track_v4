import React, { useState, useMemo } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText as Text } from './AppText';
import {
  X,
  Plus,
  Minus,
  Check,
  Trash2,
} from 'lucide-react-native';
import { LoggedMeal, FoodItem } from '../types';
import { resolveMealNutrient } from '../utils/mealNutrients';
import { AllNutrientKey } from '../data/nutrientRegistry';
import { useLanguage } from '../i18n/I18nContext';
import { translate } from '../i18n/strings';
import { useTheme } from '../theme/ThemeContext';
import { ThemeType } from '../theme';
import { useIsRTL } from '../hooks/useIsRTL';
import * as Haptics from 'expo-haptics';
import { FoodSourceBadge } from './FoodSourceBadge';
import { getLocalizedFoodName } from '../utils/foodLocalization';
import { formatServingWithGrams } from '../utils/formatServing';

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
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const isRtl = useIsRTL();
  const t = (key: string) => translate(language, key);
  const [servings, setServings] = useState(1);
  const currentItemId = item?.id ?? null;
  const currentVisible = Boolean(visible);
  const [prevItemId, setPrevItemId] = useState<string | null>(currentItemId);
  const [prevVisible, setPrevVisible] = useState(currentVisible);

  if (currentItemId !== prevItemId || (currentVisible && !prevVisible)) {
    setPrevItemId(currentItemId);
    setPrevVisible(currentVisible);
    if (item && 'servings' in item) {
      setServings(item.servings || 1);
    } else {
      setServings(1);
    }
  } else if (currentVisible !== prevVisible) {
    setPrevVisible(currentVisible);
  }

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

  const baseGrams = 'servings' in item && item.servings > 0
    ? item.servingGrams / item.servings
    : (item.servingGrams || 100);

  const currentKcal = Math.round(baseKcal * servings);
  const currentProtein = Math.round(baseProtein * servings * 10) / 10;
  const currentCarbs = Math.round(baseCarbs * servings * 10) / 10;
  const currentFat = Math.round(baseFat * servings * 10) / 10;
  const currentGrams = Math.round(baseGrams * servings);

  const simulatedMeal: LoggedMeal = (() => {
    const isLoggedMeal = 'mealType' in item;
    const foodId = 'foodId' in item && item.foodId ? item.foodId : item.id;
    let scaledSnapshot: Partial<Record<AllNutrientKey, number>> | undefined;

    if ('nutrientsSnapshot' in item && item.nutrientsSnapshot) {
      scaledSnapshot = {};
      const origServings = isLoggedMeal && typeof (item as LoggedMeal).servings === 'number' && (item as LoggedMeal).servings > 0 ? (item as LoggedMeal).servings : 1;
      const ratio = servings / origServings;
      for (const [k, v] of Object.entries(item.nutrientsSnapshot)) {
        if (typeof v === 'number') {
          scaledSnapshot[k as AllNutrientKey] = Math.round(v * ratio * 10) / 10;
        }
      }
    }

    return {
      id: item.id,
      foodId,
      name: item.name,
      mealType: isLoggedMeal ? (item as LoggedMeal).mealType : 'snack',
      servings,
      servingSize: item.servingSize,
      servingGrams: currentGrams,
      calories: currentKcal,
      protein: currentProtein,
      carbs: currentCarbs,
      fat: currentFat,
      nutrientsSnapshot: scaledSnapshot,
      timestamp: new Date().toISOString(),
    };
  })();

  const getScaledNutrient = (key: string): number | undefined => {
    const dynamicVal = resolveMealNutrient(simulatedMeal, key);
    if (dynamicVal !== undefined) return dynamicVal;
    const raw = (item as unknown as Record<string, unknown>)[key];
    if (typeof raw === 'number' && !isNaN(raw)) {
      const base = 'servings' in item && item.servings > 0 ? raw / item.servings : raw;
      return Math.round(base * servings * 10) / 10;
    }
    return undefined;
  };

  const detailedNutrients = [
    { label: 'Fiber', value: getScaledNutrient('fiber'), unit: 'g' },
    { label: 'Total Sugar', value: getScaledNutrient('sugar'), unit: 'g' },
    { label: 'Sodium', value: getScaledNutrient('sodium'), unit: 'mg' },
    { label: 'Potassium', value: getScaledNutrient('potassium'), unit: 'mg' },
    { label: 'Calcium', value: getScaledNutrient('calcium'), unit: 'mg' },
    { label: 'Iron', value: getScaledNutrient('iron'), unit: 'mg' },
    { label: 'Magnesium', value: getScaledNutrient('magnesium'), unit: 'mg' },
    { label: 'Phosphorus', value: getScaledNutrient('phosphorus'), unit: 'mg' },
    { label: 'Zinc', value: getScaledNutrient('zinc'), unit: 'mg' },
    { label: 'Copper', value: getScaledNutrient('copper'), unit: 'mg' },
    { label: 'Manganese', value: getScaledNutrient('manganese'), unit: 'mg' },
    { label: 'Selenium', value: getScaledNutrient('selenium'), unit: 'mcg' },
    { label: 'Vitamin A', value: getScaledNutrient('vitaminA'), unit: 'mcg' },
    { label: 'Vitamin C', value: getScaledNutrient('vitaminC'), unit: 'mg' },
    { label: 'Vitamin D', value: getScaledNutrient('vitaminD'), unit: 'mcg' },
    { label: 'Vitamin E', value: getScaledNutrient('vitaminE'), unit: 'mg' },
    { label: 'Vitamin K', value: getScaledNutrient('vitaminK'), unit: 'mcg' },
    { label: 'Thiamin', value: getScaledNutrient('thiamin'), unit: 'mg' },
    { label: 'Riboflavin', value: getScaledNutrient('riboflavin'), unit: 'mg' },
    { label: 'Niacin', value: getScaledNutrient('niacin'), unit: 'mg' },
    { label: 'Vitamin B6', value: getScaledNutrient('vitaminB6'), unit: 'mg' },
    { label: 'Folate', value: getScaledNutrient('folate'), unit: 'mcg' },
    { label: 'Vitamin B12', value: getScaledNutrient('vitaminB12'), unit: 'mcg' },
    { label: 'Pantothenic Acid', value: getScaledNutrient('pantothenicAcid'), unit: 'mg' },
    { label: 'Choline', value: getScaledNutrient('choline'), unit: 'mg' },
  ];

  const availableNutrients = detailedNutrients.filter(
    (n): n is { label: string; value: number; unit: string } =>
      typeof n.value === 'number' && !isNaN(n.value) && n.value > 0
  );

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
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <View style={[styles.backdrop, { direction: isRtl ? 'rtl' : 'ltr' }]}>
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom + 16, 28) }]}>
          {/* Top Close Row with prominent X button (replaced minus handle) */}
          <View style={styles.topCloseRow}>
            <TouchableOpacity
              onPress={onClose}
              style={styles.largeCloseBtn}
              accessibilityRole="button"
              accessibilityLabel={t('Close')}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <X size={20} color={theme.colors.textPrimary} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.foodName}>{getLocalizedFoodName(item, language)}</Text>
              {item.brand && <Text style={styles.brand}>{item.brand}</Text>}
              {item.source && (
                <View style={{ marginTop: 4 }}>
                  <FoodSourceBadge source={item.source} sourceRef={item.sourceRef} size="small" />
                </View>
              )}
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {/* Energy Overview */}
            <View style={styles.energyCard}>
              <View>
                <Text style={styles.kcalValue}>{currentKcal}</Text>
                <Text style={styles.kcalLabel}>{t('Total Calories (kcal)')}</Text>
              </View>
              <Text style={styles.portionLabel} numberOfLines={2}>
                {formatServingWithGrams(item.servingSize, item.servingGrams, servings)}
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
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={handleMinus}
                  accessibilityRole="button"
                  accessibilityLabel={t('Decrease servings')}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Minus size={16} color={theme.colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.servingsText}>{servings} {t('servings')}</Text>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={handlePlus}
                  accessibilityRole="button"
                  accessibilityLabel={t('Increase servings')}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Plus size={16} color={theme.colors.textPrimary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Micronutrients & Detailed Breakdown (Only show available nutrients) */}
            <View style={styles.detailsCard}>
              <Text style={styles.detailsSectionTitle}>
                {t('Micronutrients & Vitamins')}
              </Text>
              {availableNutrients.length > 0 ? (
                <View style={styles.nutrientsGrid}>
                  {availableNutrients.map((n) => (
                    <View key={n.label} style={styles.nutrientRowItem}>
                      <Text style={styles.nutrientItemLabel}>{t(n.label)}</Text>
                      <Text style={styles.nutrientItemValue}>
                        {n.value} {n.unit}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.noNutrientsText}>
                  {t('No additional micronutrient data recorded for this item.')}
                </Text>
              )}
            </View>
          </ScrollView>

          {/* Actions Bottom Bar */}
          <View style={styles.footer}>
            {isLogged && onDelete && (
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={onDelete}
                accessibilityRole="button"
                accessibilityLabel={t('Delete')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Trash2 size={18} color={theme.colors.danger} />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.saveBtn}
              onPress={() => {
                if (onSave) onSave(servings);
                onClose();
              }}
              accessibilityRole="button"
              accessibilityLabel={isLogged ? t('Update Portion') : t('Confirm')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
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

const createStyles = (theme: ThemeType) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: theme.colors.backdrop,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    maxHeight: '85%',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xs,
  },
  topCloseRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: 8,
    paddingBottom: 6,
  },
  largeCloseBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  rowRtl: {
    flexDirection: 'row-reverse',
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
    flexShrink: 1,
    maxWidth: '55%',
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
    fontSize: 12,
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
  detailsCard: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 10,
  },
  detailsSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  nutrientsGrid: {
    gap: 8,
  },
  noNutrientsText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  nutrientRowItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  nutrientItemLabel: {
    fontSize: 13,
    color: theme.colors.textPrimary,
  },
  nutrientItemValue: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  notAvailPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  notAvailText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
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
