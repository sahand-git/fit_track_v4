import React, { useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { AppText as Text } from '../AppText';
import {
  X,
  Plus,
  Minus,
  Check,
  Sparkles,
  Info,
  Barcode as BarcodeIcon,
  Utensils,
  AlertTriangle,
  Edit3,
} from 'lucide-react-native';
import { FoodItem, FoodVariant, AppLanguage } from '../../types';
import { FoodThumbnail } from '../FoodThumbnail';
import { FoodSourceBadge } from '../FoodSourceBadge';
import { getLocalizedFoodName } from '../../utils/foodLocalization';
import { formatKcal } from '../../utils/formatKcal';
import { useTheme } from '../../theme/ThemeContext';
import { ThemeType } from '../../theme';
import { calculatePortionMacros, PortionCalculations } from './portionCalculation';

export type { PortionCalculations };
export { calculatePortionMacros };

export interface AddFoodPortionPickerProps {
  food: FoodItem;
  servingsCount: number;
  onServingsChange: (updater: (prev: number) => number) => void;
  activeVariant?: FoodVariant;
  onSelectVariant: (variantId: string) => void;
  showIngredients: boolean;
  onToggleIngredients: () => void;
  onCustomizeRecipe: () => void;
  onCancel: () => void;
  onConfirm: () => void;
  language: AppLanguage;
  t: (key: string) => string;
}

export const AddFoodPortionPicker: React.FC<AddFoodPortionPickerProps> = ({
  food,
  servingsCount,
  onServingsChange,
  activeVariant,
  onSelectVariant,
  showIngredients,
  onToggleIngredients,
  onCustomizeRecipe,
  onCancel,
  onConfirm,
  language,
  t,
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const {
    activeCalories,
    activeProtein,
    activeCarbs,
    activeFat,
    totalGrams,
    scaleRatio,
  } = calculatePortionMacros(food, servingsCount, activeVariant);

  const isIncompleteFood = Boolean(
    food.isIncomplete ||
    (food.source === 'open_food_facts' && (food.calories === 0 || (food.protein === 0 && food.carbs === 0 && food.fat === 0)))
  );

  return (
    <View style={styles.selectedFoodCard}>
      <View style={styles.selectedHeaderRow}>
        <View style={styles.selectedBadgesRow}>
          {food.source ? <FoodSourceBadge source={food.source} size="small" /> : null}
          {isIncompleteFood ? (
            <View style={styles.incompleteBadge}>
              <AlertTriangle size={11} color={theme.colors.orangeDeep} />
              <Text style={styles.incompleteBadgeText}>{t('Incomplete Data')}</Text>
            </View>
          ) : null}
          {food.recipeEstimate ? (
            <View style={styles.recipeEstimateBadge}>
              <Sparkles size={11} color={theme.colors.orangeDeep} />
              <Text style={styles.recipeEstimateBadgeText}>{t('Recipe estimate')}</Text>
            </View>
          ) : food.isEstimate ? (
            <View style={styles.estimateBadge}>
              <Info size={11} color={theme.colors.amberDark} />
              <Text style={styles.estimateBadgeText}>{t('Culinary Estimate')}</Text>
            </View>
          ) : null}
          {food.barcode ? (
            <View style={styles.barcodeBadge}>
              <BarcodeIcon size={11} color={theme.colors.textMuted} />
              <Text style={styles.barcodeBadgeText}>{food.barcode}</Text>
            </View>
          ) : null}
        </View>
        <TouchableOpacity
          onPress={onCancel}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel={t('Cancel')}
          accessibilityRole="button"
        >
          <X size={16} color={theme.colors.textMuted} />
        </TouchableOpacity>
      </View>

      <View style={styles.selectedTop}>
        <FoodThumbnail
          name={food.name}
          category={food.category}
          imageUrl={food.imageUrl}
          size="medium"
          style={{ marginEnd: 12 }}
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.selectedName}>{getLocalizedFoodName(food, language)}</Text>
          {food.brand ? <Text style={styles.selectedBrand}>{food.brand}</Text> : null}
          <Text style={styles.selectedPortion}>
            {food.portionUnit
              ? `${servingsCount} ${t(food.portionUnit)} (${totalGrams}g)`
              : `${activeVariant?.servingSize ?? food.servingSize} (${totalGrams}g)`}
          </Text>
          <Text style={styles.selectedMacrosPreview}>
            {`P: ${(activeProtein * scaleRatio).toFixed(1)}g • C: ${(activeCarbs * scaleRatio).toFixed(1)}g • F: ${(activeFat * scaleRatio).toFixed(1)}g`}
          </Text>
        </View>
        <Text style={styles.selectedKcal}>
          {formatKcal(activeCalories * scaleRatio, t)}
        </Text>
      </View>

      {/* Variants Selector */}
      {food.variants && food.variants.length > 0 ? (
        <View style={styles.variantSection}>
          <Text style={styles.variantSectionTitle}>{t('Preparation / Variant:')}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.variantChipsRow}
          >
            {food.variants.map((v) => {
              const isSelected = activeVariant?.id === v.id;
              return (
                <TouchableOpacity
                  key={v.id}
                  style={[styles.variantChip, isSelected && styles.variantChipActive]}
                  onPress={() => onSelectVariant(v.id)}
                  accessibilityRole="button"
                  accessibilityLabel={v.name}
                >
                  <Text
                    style={[
                      styles.variantChipText,
                      isSelected && styles.variantChipTextActive,
                    ]}
                  >
                    {v.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      {/* Recipe Ingredients Breakdown */}
      {food.ingredients && food.ingredients.length > 0 ? (
        <View style={styles.ingredientsSection}>
          <TouchableOpacity
            style={styles.ingredientsToggleBtn}
            onPress={onToggleIngredients}
            accessibilityRole="button"
            accessibilityLabel={t('Recipe ingredients & USDA sources')}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Utensils size={14} color={theme.colors.primary} />
              <Text style={styles.ingredientsToggleText}>
                {t('Recipe ingredients & USDA sources')} ({food.ingredients.length})
              </Text>
            </View>
            <Text style={styles.ingredientsToggleAction}>
              {showIngredients ? t('Hide ingredients') : t('Show ingredients')}
            </Text>
          </TouchableOpacity>

          {showIngredients ? (
            <View style={styles.ingredientsListCard}>
              {food.ingredients.map((ing, idx) => (
                <View key={idx} style={styles.ingredientRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.ingredientName}>{ing.name}</Text>
                    <Text style={styles.ingredientSource}>
                      {t('Source:')} {ing.source}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', marginStart: 8 }}>
                    <Text style={styles.ingredientGrams}>{ing.grams}g</Text>
                    {ing.calories !== undefined ? (
                      <Text style={styles.ingredientKcal}>{formatKcal(ing.calories, t)}</Text>
                    ) : null}
                  </View>
                </View>
              ))}
              <TouchableOpacity
                style={styles.customizeRecipeBtn}
                onPress={onCustomizeRecipe}
                accessibilityRole="button"
                accessibilityLabel={t('Customize recipe')}
              >
                <Text style={styles.customizeRecipeBtnText}>{t('Customize recipe')}</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Incomplete Nutrition Warning Notice */}
      {isIncompleteFood ? (
        <View style={styles.incompleteNoticeCard}>
          <View style={styles.incompleteNoticeHeader}>
            <AlertTriangle size={15} color={theme.colors.orangeDeep} />
            <Text style={styles.incompleteNoticeTitle}>{t('Incomplete Nutrition Data')}</Text>
          </View>
          <Text style={styles.incompleteNoticeBody}>
            {t('This entry is missing complete nutritional values on Open Food Facts. You can adjust the calories and macros before logging.')}
          </Text>
          <TouchableOpacity
            style={styles.incompleteAdjustBtn}
            onPress={onCustomizeRecipe}
            accessibilityRole="button"
            accessibilityLabel={t('Adjust Macros')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Edit3 size={13} color={theme.colors.primary} />
            <Text style={styles.incompleteAdjustBtnText}>{t('Adjust Macros')}</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={styles.stepperRow}>
        <Text style={styles.stepperLabel}>
          {food.portionUnit
            ? `${t('Portions')} (${t(food.portionUnit)}):`
            : t('Servings:')}
        </Text>
        <View style={styles.stepper}>
          <TouchableOpacity
            style={styles.stepBtn}
            onPress={() => onServingsChange((c) => Math.max(0.5, c - 0.5))}
            accessibilityRole="button"
            accessibilityLabel={t('Decrease')}
          >
            <Minus size={13} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.stepVal}>{servingsCount}</Text>
          <TouchableOpacity
            style={styles.stepBtn}
            onPress={() => onServingsChange((c) => c + 0.5)}
            accessibilityRole="button"
            accessibilityLabel={t('Increase')}
          >
            <Plus size={13} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.selectedActionButtonsRow}>
        <TouchableOpacity
          style={styles.cancelSelectedBtn}
          onPress={onCancel}
          accessibilityRole="button"
          accessibilityLabel={t('Cancel')}
        >
          <Text style={styles.cancelSelectedBtnText}>{t('Cancel')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.confirmAddBtn, { flex: 1, marginTop: 0 }]}
          onPress={onConfirm}
          accessibilityRole="button"
          accessibilityLabel={t('Log to Diary')}
        >
          <Check size={16} color={theme.colors.textInverted} />
          <Text style={styles.confirmAddBtnText}>{t('Log to Diary')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const createStyles = (theme: ThemeType) => StyleSheet.create({
  selectedFoodCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    ...theme.shadow.subtle,
  },
  selectedHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  selectedBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  incompleteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.orangeLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.orangeBorder,
  },
  incompleteBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.orangeDeep,
  },
  incompleteNoticeCard: {
    backgroundColor: theme.colors.orangeLight,
    borderWidth: 1,
    borderColor: theme.colors.orangeBorder,
    borderRadius: theme.radius.md,
    padding: 12,
    marginTop: 10,
    marginBottom: 6,
    gap: 6,
  },
  incompleteNoticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  incompleteNoticeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.orangeDeep,
  },
  incompleteNoticeBody: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 16,
  },
  incompleteAdjustBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginTop: 4,
  },
  incompleteAdjustBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  recipeEstimateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.surfaceSubtle,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.orangeDeep,
  },
  recipeEstimateBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.orangeDeep,
  },
  estimateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.surfaceSubtle,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.amberDark,
  },
  estimateBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.amberDark,
  },
  barcodeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.surfaceSubtle,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.full,
  },
  barcodeBadgeText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.sans,
  },
  selectedTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedName: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  selectedBrand: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 1,
  },
  selectedPortion: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  selectedMacrosPreview: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  selectedKcal: {
    fontFamily: theme.fonts.serif,
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.primary,
    marginStart: 12,
  },
  variantSection: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  variantSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    marginBottom: 6,
  },
  variantChipsRow: {
    gap: 6,
  },
  variantChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  variantChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  variantChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  variantChipTextActive: {
    color: theme.colors.textInverted,
  },
  ingredientsSection: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  ingredientsToggleBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  ingredientsToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  ingredientsToggleAction: {
    fontSize: 12,
    color: theme.colors.secondary,
    fontWeight: '600',
  },
  ingredientsListCard: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.radius.sm,
    padding: 10,
    marginTop: 8,
    gap: 6,
  },
  ingredientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  ingredientName: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  ingredientSource: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  ingredientGrams: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  ingredientKcal: {
    fontSize: 12,
    color: theme.colors.primary,
  },
  customizeRecipeBtn: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: theme.radius.xs,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  customizeRecipeBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  stepperRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  stepperLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.radius.full,
    padding: 3,
  },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadow.subtle,
  },
  stepVal: {
    paddingHorizontal: 12,
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  selectedActionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  cancelSelectedBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
  },
  cancelSelectedBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  confirmAddBtn: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: theme.radius.md,
    gap: 8,
    ...theme.shadow.subtle,
  },
  confirmAddBtnText: {
    color: theme.colors.textInverted,
    fontSize: 13,
    fontWeight: '700',
  },
});
