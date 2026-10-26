import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { AppText as Text } from '../AppText';
import { Sparkles, AlertTriangle } from 'lucide-react-native';
import { PlateAnalysisResult } from '../../services/plateAnalysisService';
import { GeminiKeyManager } from '../GeminiKeyManager';
import { AiReview } from './AiReview';
import { MealType } from '../../types';
import { theme } from '../../theme';

export interface AddFoodAiDescribeSectionProps {
  hasApiKey: boolean;
  onKeyChanged: () => void;
  describeText: string;
  onDescribeTextChange: (text: string) => void;
  describeLoading: boolean;
  describeError: string | null;
  onEstimateDescribe: () => void;
  describeResult: PlateAnalysisResult | null;
  selectedMeal: MealType;
  targetDate: string;
  onLogAiItem: (item: any) => void;
  onLogAllAiItems: (items: any[]) => void;
  bottomInset: number;
  t: (key: string) => string;
}

export const AddFoodAiDescribeSection: React.FC<AddFoodAiDescribeSectionProps> = ({
  hasApiKey,
  onKeyChanged,
  describeText,
  onDescribeTextChange,
  describeLoading,
  describeError,
  onEstimateDescribe,
  describeResult,
  selectedMeal,
  targetDate,
  onLogAiItem,
  onLogAllAiItems,
  bottomInset,
  t,
}) => {
  return (
    <ScrollView
      contentContainerStyle={[
        styles.tabContentScroll,
        { paddingBottom: Math.max(48, bottomInset + 36) },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      {!hasApiKey && <GeminiKeyManager onKeyChanged={onKeyChanged} />}

      <View style={styles.describeCard}>
        <View style={styles.describeHeaderRow}>
          <Sparkles size={16} color={theme.colors.accent} />
          <Text style={styles.describeTitle}>{t('Describe what you ate')}</Text>
        </View>

        <Text style={styles.describeSub}>
          {t('Get an estimate, review portions, then log')}
        </Text>

        <TextInput
          style={styles.describeInput}
          value={describeText}
          onChangeText={onDescribeTextChange}
          placeholder={t('Describe what you ate')}
          placeholderTextColor={theme.colors.textMuted}
          multiline
          numberOfLines={3}
          maxLength={500}
          editable={!describeLoading}
        />

        <TouchableOpacity
          style={[
            styles.actionBtnPrimary,
            (!describeText.trim() || describeLoading) && styles.actionBtnDisabled,
          ]}
          onPress={onEstimateDescribe}
          disabled={!describeText.trim() || describeLoading}
          accessibilityRole="button"
          accessibilityLabel={t('Estimate nutrition')}
        >
          {describeLoading ? (
            <ActivityIndicator size="small" color={theme.colors.textInverted} />
          ) : (
            <>
              <Sparkles size={15} color={theme.colors.textInverted} />
              <Text style={styles.actionBtnPrimaryText}>{t('Estimate nutrition')}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {describeError && (
        <View style={styles.errorNotice}>
          <AlertTriangle size={16} color={theme.colors.danger} />
          <Text style={styles.errorNoticeText}>{describeError}</Text>
        </View>
      )}

      {describeResult && (
        <AiReview
          key={`describe_${describeResult.mealName}_${describeResult.totalCalories}_${describeResult.items.length}`}
          result={describeResult}
          mealType={selectedMeal}
          targetDate={targetDate}
          onLogItem={onLogAiItem}
          onLogAll={onLogAllAiItems}
        />
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  tabContentScroll: {
    paddingTop: 8,
    gap: 16,
  },
  describeCard: {
    backgroundColor: theme.colors.surfaceSubtle,
    padding: 16,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 10,
  },
  describeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  describeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  describeSub: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  describeInput: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: 12,
    fontSize: 14,
    color: theme.colors.textPrimary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  actionBtnPrimary: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: theme.radius.md,
    gap: 8,
    marginTop: 4,
  },
  actionBtnDisabled: {
    opacity: 0.5,
  },
  actionBtnPrimaryText: {
    color: theme.colors.textInverted,
    fontWeight: '700',
    fontSize: 14,
  },
  errorNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.dangerLight,
    padding: 12,
    borderRadius: theme.radius.md,
    gap: 8,
  },
  errorNoticeText: {
    fontSize: 13,
    color: theme.colors.danger,
    flex: 1,
  },
});
