import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { AppText as Text } from '../AppText';
import { Sparkles, Plus, Check, Minus } from 'lucide-react-native';
import { PlateAnalysisResult, PlateAnalysisItem } from '../../services/plateAnalysisService';
import { LoggedMeal, MealType } from '../../types';
import { useLanguage } from '../../i18n/I18nContext';
import { translate } from '../../i18n/strings';
import { theme } from '../../theme';
import * as Haptics from 'expo-haptics';

interface AiReviewProps {
  result: PlateAnalysisResult;
  mealType: MealType;
  targetDate: string;
  onLogItem: (meal: LoggedMeal) => void;
  onLogAll: (meals: LoggedMeal[]) => void;
}

interface EditableItemState {
  item: PlateAnalysisItem;
  currentGrams: number;
  isLogged: boolean;
}

export const AiReview: React.FC<AiReviewProps> = ({
  result,
  mealType,
  targetDate,
  onLogItem,
  onLogAll,
}) => {
  const language = useLanguage();
  const t = (str: string) => translate(language, str);

  const currentResultKey = result
    ? `${result.mealName}_${result.totalCalories}_${result.items.length}_${result.items.map((i) => `${i.name}:${i.grams}`).join('|')}`
    : '';
  const [prevResultKey, setPrevResultKey] = useState(currentResultKey);
  const [items, setItems] = useState<EditableItemState[]>(() =>
    result.items.map((it) => ({
      item: it,
      currentGrams: it.grams || 100,
      isLogged: false,
    }))
  );

  if (currentResultKey !== prevResultKey) {
    setPrevResultKey(currentResultKey);
    setItems(
      result.items.map((it) => ({
        item: it,
        currentGrams: it.grams || 100,
        isLogged: false,
      }))
    );
  }

  const handleUpdateGrams = (index: number, newGrams: number) => {
    const val = Math.max(5, Math.min(2000, newGrams));
    setItems((prev) =>
      prev.map((el, idx) => (idx === index ? { ...el, currentGrams: val } : el))
    );
  };

  const calculateItemNutrients = (baseItem: PlateAnalysisItem, currentGrams: number) => {
    const baseG = baseItem.grams > 0 ? baseItem.grams : 100;
    const ratio = currentGrams / baseG;
    return {
      calories: Math.round(baseItem.calories * ratio),
      protein: Math.round(baseItem.protein * ratio * 10) / 10,
      carbs: Math.round(baseItem.carbs * ratio * 10) / 10,
      fat: Math.round(baseItem.fat * ratio * 10) / 10,
    };
  };

  const totalCalories = items.reduce((sum, it) => {
    const n = calculateItemNutrients(it.item, it.currentGrams);
    return sum + n.calories;
  }, 0);

  const totalProtein = Math.round(
    items.reduce((sum, it) => sum + calculateItemNutrients(it.item, it.currentGrams).protein, 0) * 10
  ) / 10;
  const totalCarbs = Math.round(
    items.reduce((sum, it) => sum + calculateItemNutrients(it.item, it.currentGrams).carbs, 0) * 10
  ) / 10;
  const totalFat = Math.round(
    items.reduce((sum, it) => sum + calculateItemNutrients(it.item, it.currentGrams).fat, 0) * 10
  ) / 10;

  const handleLogSingle = (index: number) => {
    const it = items[index];
    if (it.isLogged) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    const nut = calculateItemNutrients(it.item, it.currentGrams);
    const meal: LoggedMeal = {
      id: `ai_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      foodId: 'ai-estimate',
      name: it.item.name,
      mealType,
      servings: 1,
      servingSize: `${it.currentGrams}g`,
      servingGrams: it.currentGrams,
      calories: nut.calories,
      protein: nut.protein,
      carbs: nut.carbs,
      fat: nut.fat,
      isEstimate: true,
      source: 'gemini',
      timestamp: new Date().toISOString(),
    };

    setItems((prev) =>
      prev.map((el, idx) => (idx === index ? { ...el, isLogged: true } : el))
    );
    onLogItem(meal);
  };

  const handleLogAll = () => {
    const unlogged = items.filter((it) => !it.isLogged);
    if (unlogged.length === 0) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    const meals: LoggedMeal[] = unlogged.map((it, idx) => {
      const nut = calculateItemNutrients(it.item, it.currentGrams);
      return {
        id: `ai_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
        foodId: 'ai-estimate',
        name: it.item.name,
        mealType,
        servings: 1,
        servingSize: `${it.currentGrams}g`,
        servingGrams: it.currentGrams,
        calories: nut.calories,
        protein: nut.protein,
        carbs: nut.carbs,
        fat: nut.fat,
        isEstimate: true,
        source: 'gemini',
        timestamp: new Date().toISOString(),
      };
    });

    setItems((prev) => prev.map((el) => ({ ...el, isLogged: true })));
    onLogAll(meals);
  };

  const getConfidenceBadgeColor = (confidence: string) => {
    if (confidence === 'high') {
      return { bg: theme.colors.primaryLight, text: theme.colors.primary };
    }
    if (confidence === 'low') {
      return { bg: '#FDECEC', text: theme.colors.danger };
    }
    return { bg: theme.colors.accentLight, text: theme.colors.accent };
  };

  const allLogged = items.every((it) => it.isLogged);

  return (
    <View style={styles.container}>
      {/* Header Banner */}
      <View style={styles.headerCard}>
        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <Sparkles size={12} color={theme.colors.accent} />
            <Text style={styles.badgeText}>{t('AI meal estimate')}</Text>
          </View>
        </View>

        <Text style={styles.mealName}>{result.mealName}</Text>

        <View style={styles.totalsRow}>
          <Text style={styles.totalKcal}>{totalCalories} kcal</Text>
          <Text style={styles.totalMacros}>
            P: {totalProtein}g • C: {totalCarbs}g • F: {totalFat}g
          </Text>
        </View>

        <View style={styles.disclaimerBox}>
          <Text style={styles.disclaimerText}>
            {t('These are estimates, not measurements. Adjust portions to improve accuracy.')}
          </Text>
        </View>
      </View>

      {/* Items List */}
      <View style={styles.itemsList}>
        {items.map((entry, idx) => {
          const nut = calculateItemNutrients(entry.item, entry.currentGrams);
          const badgeColors = getConfidenceBadgeColor(entry.item.confidence);

          return (
            <View key={idx} style={[styles.itemCard, entry.isLogged && styles.itemCardLogged]}>
              <View style={styles.itemHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{entry.item.name}</Text>
                  <Text style={styles.itemPortionSub}>{entry.item.portionEstimate}</Text>
                </View>
                <View style={styles.itemRight}>
                  <Text style={styles.itemKcal}>{nut.calories} kcal</Text>
                  <View style={[styles.confBadge, { backgroundColor: badgeColors.bg }]}>
                    <Text style={[styles.confBadgeText, { color: badgeColors.text }]}>
                      {t(entry.item.confidence)}
                    </Text>
                  </View>
                </View>
              </View>

              <Text style={styles.macroSub}>
                P: {nut.protein}g • C: {nut.carbs}g • F: {nut.fat}g
              </Text>

              {/* Portion adjustment controls */}
              <View style={styles.adjustRow}>
                <Text style={styles.portionLabel}>{t('Portion (g)')}:</Text>
                <View style={styles.portionControls}>
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => handleUpdateGrams(idx, entry.currentGrams - 25)}
                    disabled={entry.isLogged}
                    accessibilityRole="button"
                    accessibilityLabel={t('Decrease portion')}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Minus size={13} color={theme.colors.textPrimary} />
                  </TouchableOpacity>
                  <TextInput
                    style={styles.gramsInput}
                    value={String(entry.currentGrams)}
                    keyboardType="numeric"
                    editable={!entry.isLogged}
                    onChangeText={(val) => {
                      const num = parseInt(val, 10);
                      if (!isNaN(num)) handleUpdateGrams(idx, num);
                    }}
                  />
                  <Text style={styles.unitText}>g</Text>
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => handleUpdateGrams(idx, entry.currentGrams + 25)}
                    disabled={entry.isLogged}
                    accessibilityRole="button"
                    accessibilityLabel={t('Increase portion')}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Plus size={13} color={theme.colors.textPrimary} />
                  </TouchableOpacity>
                </View>

                {/* Per-item log button */}
                <TouchableOpacity
                  style={[styles.singleLogBtn, entry.isLogged && styles.singleLogBtnDone]}
                  onPress={() => handleLogSingle(idx)}
                  disabled={entry.isLogged}
                  accessibilityRole="button"
                  accessibilityLabel={entry.isLogged ? t('All foods added to diary.') : t('Add')}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  {entry.isLogged ? (
                    <Check size={14} color={theme.colors.primary} />
                  ) : (
                    <>
                      <Plus size={13} color={theme.colors.textInverted} />
                      <Text style={styles.singleLogBtnText}>{t('Add')}</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </View>

      {/* Log All Action Button */}
      <TouchableOpacity
        style={[styles.logAllBtn, allLogged && styles.logAllBtnDisabled]}
        onPress={handleLogAll}
        disabled={allLogged}
        accessibilityRole="button"
        accessibilityLabel={allLogged ? t('All foods added to diary.') : `${t('Log to Diary')} (${items.length})`}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Check size={16} color={theme.colors.textInverted} />
        <Text style={styles.logAllText}>
          {allLogged ? t('All foods added to diary.') : `${t('Log to Diary')} (${items.length})`}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  headerCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    gap: 6,
    ...theme.shadow.subtle,
  },
  badgeRow: {
    flexDirection: 'row',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: theme.colors.accentLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.full,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.accent,
  },
  mealName: {
    fontFamily: theme.fonts.serif,
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginTop: 2,
  },
  totalsRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
    marginTop: 2,
  },
  totalKcal: {
    fontFamily: theme.fonts.sans,
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  totalMacros: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  disclaimerBox: {
    backgroundColor: theme.colors.surfaceSubtle,
    padding: 8,
    borderRadius: theme.radius.sm,
    marginTop: 4,
  },
  disclaimerText: {
    fontSize: 11,
    lineHeight: 15,
    color: theme.colors.textMuted,
  },
  itemsList: {
    gap: 10,
  },
  itemCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    gap: 6,
  },
  itemCardLogged: {
    opacity: 0.65,
    borderColor: theme.colors.primaryBorder,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  itemName: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  itemPortionSub: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 1,
  },
  itemRight: {
    alignItems: 'flex-end',
    gap: 3,
  },
  itemKcal: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  confBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.radius.full,
  },
  confBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  macroSub: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  adjustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  portionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  portionControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stepBtn: {
    width: 28,
    height: 28,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gramsInput: {
    minWidth: 42,
    height: 28,
    paddingHorizontal: 6,
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  unitText: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginRight: 2,
  },
  singleLogBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radius.sm,
  },
  singleLogBtnDone: {
    backgroundColor: theme.colors.primaryLight,
  },
  singleLogBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textInverted,
  },
  logAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    borderRadius: theme.radius.md,
    marginTop: 4,
    ...theme.shadow.subtle,
  },
  logAllBtnDisabled: {
    backgroundColor: theme.colors.borderStrong,
  },
  logAllText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textInverted,
  },
});
