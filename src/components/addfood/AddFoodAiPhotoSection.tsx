import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { AppText as Text } from '../AppText';
import {
  Camera as CameraIcon,
  Image as ImageIcon,
  AlertTriangle,
} from 'lucide-react-native';
import { PlateAnalysisResult } from '../../services/plateAnalysisService';
import { GeminiKeyManager } from '../GeminiKeyManager';
import { AiReview } from './AiReview';
import { MealType } from '../../types';
import { theme } from '../../theme';

export interface AddFoodAiPhotoSectionProps {
  hasApiKey: boolean;
  onKeyChanged: () => void;
  onPickPhoto: (useCamera: boolean) => void;
  photoUri: string | null;
  photoLoading: boolean;
  photoError: string | null;
  photoResult: PlateAnalysisResult | null;
  selectedMeal: MealType;
  targetDate: string;
  onLogAiItem: (item: any) => void;
  onLogAllAiItems: (items: any[]) => void;
  bottomInset: number;
  t: (key: string) => string;
}

export const AddFoodAiPhotoSection: React.FC<AddFoodAiPhotoSectionProps> = ({
  hasApiKey,
  onKeyChanged,
  onPickPhoto,
  photoUri,
  photoLoading,
  photoError,
  photoResult,
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

      <View style={styles.photoActionsCard}>
        <Text style={styles.photoCardTitle}>{t('Analyze meal photo')}</Text>
        <Text style={styles.photoCardSub}>
          {t('Estimate nutrition from a photo of home-cooked plates or restaurant dishes.')}
        </Text>

        <View style={styles.photoBtnRow}>
          <TouchableOpacity
            style={styles.photoPickBtn}
            onPress={() => onPickPhoto(true)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={t('Take plate photo')}
          >
            <CameraIcon size={16} color={theme.colors.textInverted} />
            <Text style={styles.photoPickBtnText}>{t('Take plate photo')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.photoPickBtnSecondary}
            onPress={() => onPickPhoto(false)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={t('From gallery')}
          >
            <ImageIcon size={16} color={theme.colors.textPrimary} />
            <Text style={styles.photoPickBtnSecondaryText}>{t('From gallery')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {photoUri && <Image source={{ uri: photoUri }} style={styles.platePreviewImage} />}

      {photoLoading && (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={styles.loadingText}>
            {t('Analyzing meal components and portions...')}
          </Text>
        </View>
      )}

      {photoError && (
        <View style={styles.errorNotice}>
          <AlertTriangle size={16} color={theme.colors.danger} />
          <Text style={styles.errorNoticeText}>{photoError}</Text>
        </View>
      )}

      {photoResult && (
        <AiReview
          key={`photo_${photoResult.mealName}_${photoResult.totalCalories}_${photoResult.items.length}`}
          result={photoResult}
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
  photoActionsCard: {
    backgroundColor: theme.colors.surfaceSubtle,
    padding: 16,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    gap: 8,
  },
  photoCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  photoCardSub: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  photoBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
    width: '100%',
  },
  photoPickBtn: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: theme.radius.md,
    gap: 8,
  },
  photoPickBtnText: {
    color: theme.colors.textInverted,
    fontSize: 13,
    fontWeight: '700',
  },
  photoPickBtnSecondary: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: theme.radius.md,
    gap: 8,
  },
  photoPickBtnSecondaryText: {
    color: theme.colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  platePreviewImage: {
    width: '100%',
    height: 200,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceSubtle,
  },
  loadingBox: {
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
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
