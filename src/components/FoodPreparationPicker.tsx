import React, { useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { AppText as Text } from './AppText';
import { Flame, Droplet, Sparkles } from 'lucide-react-native';
import { useLanguage } from '../i18n/I18nContext';
import { translate } from '../i18n/strings';
import { useTheme } from '../theme/ThemeContext';
import { ThemeType } from '../theme';
import * as Haptics from 'expo-haptics';

export interface CookingMethodOption {
  key: string;
  labelKey: string;
  calorieMultiplier: number;
  fatDelta: number;
}

export interface OilModifierOption {
  key: string;
  labelKey: string;
  caloriesAdded: number;
  fatAdded: number;
}

export const COOKING_METHODS: CookingMethodOption[] = [
  { key: 'raw', labelKey: 'Raw', calorieMultiplier: 1.0, fatDelta: 0 },
  { key: 'boiled', labelKey: 'Boiled', calorieMultiplier: 1.0, fatDelta: 0 },
  { key: 'steamed', labelKey: 'Steamed', calorieMultiplier: 1.0, fatDelta: 0 },
  { key: 'grilled', labelKey: 'Grilled', calorieMultiplier: 1.05, fatDelta: 1 },
  { key: 'fried', labelKey: 'Fried', calorieMultiplier: 1.35, fatDelta: 8 },
  { key: 'baked', labelKey: 'Baked', calorieMultiplier: 1.08, fatDelta: 2 },
  { key: 'roasted', labelKey: 'Roasted', calorieMultiplier: 1.12, fatDelta: 3 },
];

export const OIL_MODIFIERS: OilModifierOption[] = [
  { key: 'no_oil', labelKey: 'No oil', caloriesAdded: 0, fatAdded: 0 },
  { key: 'with_oil', labelKey: 'With oil', caloriesAdded: 72, fatAdded: 8 },
  { key: 'with_butter', labelKey: 'With butter', caloriesAdded: 75, fatAdded: 8.5 },
  { key: 'with_ghee', labelKey: 'With ghee', caloriesAdded: 90, fatAdded: 10 },
];

interface FoodPreparationPickerProps {
  baseCalories: number;
  baseFat: number;
  selectedMethod: string;
  selectedOil: string;
  onSelectMethod: (methodKey: string) => void;
  onSelectOil: (oilKey: string) => void;
}

export function calculateAdjustedPreparationMacros(
  baseCalories: number,
  baseProtein: number,
  baseCarbs: number,
  baseFat: number,
  methodKey: string,
  oilKey: string
) {
  const method = COOKING_METHODS.find((m) => m.key === methodKey) || COOKING_METHODS[0];
  const oil = OIL_MODIFIERS.find((o) => o.key === oilKey) || OIL_MODIFIERS[0];

  const methodCals = Math.round(baseCalories * method.calorieMultiplier);
  const totalCalories = methodCals + oil.caloriesAdded;

  const totalFat = Math.round((baseFat + method.fatDelta + oil.fatAdded) * 10) / 10;
  const deltaCalories = totalCalories - baseCalories;

  return {
    totalCalories,
    totalFat,
    deltaCalories,
    method,
    oil,
  };
}

export const FoodPreparationPicker: React.FC<FoodPreparationPickerProps> = ({
  baseCalories,
  baseFat,
  selectedMethod,
  selectedOil,
  onSelectMethod,
  onSelectOil,
}) => {
  const language = useLanguage();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const t = (key: string) => translate(language, key);

  const { deltaCalories, method, oil } = calculateAdjustedPreparationMacros(
    baseCalories,
    0,
    0,
    baseFat,
    selectedMethod,
    selectedOil
  );

  return (
    <View style={styles.container}>
      {/* Cooking Method Row */}
      <View style={styles.sectionHeader}>
        <Flame size={14} color={theme.colors.orange} />
        <Text style={styles.sectionTitle}>{t('Cooking Method')}</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
      >
        {COOKING_METHODS.map((m) => {
          const isSelected = selectedMethod === m.key;
          return (
            <TouchableOpacity
              key={m.key}
              style={[styles.chip, isSelected && styles.chipActive]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                onSelectMethod(m.key);
              }}
              accessibilityRole="button"
              accessibilityLabel={t(m.labelKey)}
            >
              <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                {t(m.labelKey)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Fat / Oil Modifier Row */}
      <View style={[styles.sectionHeader, { marginTop: 12 }]}>
        <Droplet size={14} color={theme.colors.water} />
        <Text style={styles.sectionTitle}>{t('Oil / Fat Modifier')}</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
      >
        {OIL_MODIFIERS.map((o) => {
          const isSelected = selectedOil === o.key;
          return (
            <TouchableOpacity
              key={o.key}
              style={[styles.chip, isSelected && styles.chipActive]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                onSelectOil(o.key);
              }}
              accessibilityRole="button"
              accessibilityLabel={t(o.labelKey)}
            >
              <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                {t(o.labelKey)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Delta Feedback */}
      {deltaCalories !== 0 && (
        <View style={styles.deltaBox}>
          <Sparkles size={13} color={theme.colors.amber} />
          <Text style={styles.deltaText}>
            {deltaCalories > 0 ? `+${deltaCalories}` : `${deltaCalories}`} {t('kcal from preparation')} ({t(method.labelKey)}, {t(oil.labelKey)})
          </Text>
        </View>
      )}
    </View>
  );
};

const createStyles = (theme: ThemeType) =>
  StyleSheet.create({
    container: {
      marginVertical: 10,
      padding: 12,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.surfaceSubtle,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 8,
    },
    sectionTitle: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    chipsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 2,
    },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    chipActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    chipText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.textSecondary,
    },
    chipTextActive: {
      color: theme.colors.textInverted,
    },
    deltaBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 10,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    deltaText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.textPrimary,
    },
  });
