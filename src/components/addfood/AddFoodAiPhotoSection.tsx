import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppText as Text } from '../AppText';
import {
  Camera as CameraIcon,
  Image as ImageIcon,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  Plus,
  HelpCircle,
  X,
} from 'lucide-react-native';
import { PlateAnalysisResult } from '../../services/plateAnalysisService';
import { GeminiKeyManager } from '../GeminiKeyManager';
import { AiReview } from './AiReview';
import { MealType } from '../../types';
import { useTheme } from '../../theme/ThemeContext';
import { ThemeType } from '../../theme';
import * as Haptics from 'expo-haptics';
import { isReducedMotion } from '../../utils/motion';

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

const COACHING_STORAGE_KEY = 'fittrack_hide_camera_coaching';

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
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [showCoaching, setShowCoaching] = useState(true);
  const [secondPhotoUri, setSecondPhotoUri] = useState<string | null>(null);
  const [contextNote, setContextNote] = useState('');
  const [activeStep, setActiveStep] = useState(1);
  const [disambiguationVisible, setDisambiguationVisible] = useState(false);
  const [disambiguationAnswer, setDisambiguationAnswer] = useState<string | null>(null);

  // Check coaching preference
  useEffect(() => {
    AsyncStorage.getItem(COACHING_STORAGE_KEY).then((val) => {
      if (val === 'true') {
        setShowCoaching(false);
      }
    }).catch(() => {});
  }, []);

  const handleDismissCoaching = async (dontShowAgain: boolean) => {
    setShowCoaching(false);
    if (dontShowAgain) {
      await AsyncStorage.setItem(COACHING_STORAGE_KEY, 'true').catch(() => {});
    }
  };

  // Reanimated Laser Scanning Line
  const laserTranslateX = useSharedValue(0);

  useEffect(() => {
    if (photoLoading) {
      const step1Timer = setTimeout(() => setActiveStep(1), 0);
      const step2Timer = setTimeout(() => setActiveStep(2), 1200);
      const step3Timer = setTimeout(() => setActiveStep(3), 2400);

      if (!isReducedMotion()) {
        laserTranslateX.value = withRepeat(
          withSequence(
            withTiming(280, { duration: 1400, easing: Easing.inOut(Easing.quad) }),
            withTiming(0, { duration: 1400, easing: Easing.inOut(Easing.quad) })
          ),
          -1,
          true
        );
      }
      return () => {
        clearTimeout(step1Timer);
        clearTimeout(step2Timer);
        clearTimeout(step3Timer);
      };
    } else {
      laserTranslateX.value = 0;
    }
  }, [photoLoading, laserTranslateX]);

  const laserAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: laserTranslateX.value }],
  }));

  // Disambiguation check on result
  useEffect(() => {
    if (photoResult && photoResult.items.length > 0 && !disambiguationAnswer) {
      // If dish contains ambiguous components like muffins, rice with butter, etc.
      const hasAmbiguity = photoResult.items.some(
        (it) => /muffin|curry|soup|pasta|dressing|bread/i.test(it.name)
      );
      if (hasAmbiguity) {
        const timer = setTimeout(() => setDisambiguationVisible(true), 100);
        return () => clearTimeout(timer);
      }
    }
  }, [photoResult, disambiguationAnswer]);

  return (
    <ScrollView
      contentContainerStyle={[
        styles.tabContentScroll,
        { paddingBottom: Math.max(76, bottomInset + 64) },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      {!hasApiKey && <GeminiKeyManager onKeyChanged={onKeyChanged} />}

      {/* 2.1 Camera Coaching Tooltip */}
      {showCoaching && (
        <View style={styles.coachingCard}>
          <View style={styles.coachingTop}>
            <Lightbulb size={18} color={theme.colors.amber} />
            <Text style={styles.coachingTitle}>{t('Photo Analysis Tip')}</Text>
            <TouchableOpacity
              onPress={() => handleDismissCoaching(false)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel={t('Dismiss')}
            >
              <X size={15} color={theme.colors.textMuted} />
            </TouchableOpacity>
          </View>
          <Text style={styles.coachingText}>
            {t('Place your hand or a spoon next to the food for better portion estimation.')}
          </Text>
          <TouchableOpacity
            style={styles.dontShowBtn}
            onPress={() => handleDismissCoaching(true)}
            accessibilityRole="button"
            accessibilityLabel={t('Don’t show again')}
          >
            <Text style={styles.dontShowText}>{t('Don’t show again')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Photo Actions Card */}
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

      {/* 2.2 Multi-Angle Capture Staging Screen */}
      {photoUri && (
        <View style={styles.stagingContainer}>
          <View style={styles.photosRow}>
            {/* Main Angle */}
            <View style={styles.photoSlot}>
              <Image source={{ uri: photoUri }} style={styles.slotImage} />
              <View style={styles.slotBadge}>
                <Text style={styles.slotBadgeText}>{t('Angle 1')}</Text>
              </View>
            </View>

            {/* Optional 2nd Angle Slot */}
            <TouchableOpacity
              style={[styles.photoSlot, styles.photoSlotDashed]}
              onPress={() => {
                if (secondPhotoUri) {
                  setSecondPhotoUri(null);
                } else {
                  onPickPhoto(true);
                }
              }}
              accessibilityRole="button"
              accessibilityLabel={t('Add second angle (optional)')}
            >
              {secondPhotoUri ? (
                <>
                  <Image source={{ uri: secondPhotoUri }} style={styles.slotImage} />
                  <View style={styles.slotBadge}>
                    <Text style={styles.slotBadgeText}>{t('Angle 2')}</Text>
                  </View>
                </>
              ) : (
                <View style={styles.addSlotContent}>
                  <Plus size={20} color={theme.colors.textMuted} />
                  <Text style={styles.addSlotText}>{t('Add second angle (optional)')}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* 2.3 Context Injection Input */}
          <View style={styles.contextInputBox}>
            <TextInput
              style={styles.contextInput}
              placeholder={t('Tell FitTrack more about this meal (optional)')}
              placeholderTextColor={theme.colors.textMuted}
              value={contextNote}
              onChangeText={setContextNote}
            />
            <Text style={styles.contextHintText}>
              {t('e.g., rice with butter, no salt added, homemade bread')}
            </Text>
          </View>
        </View>
      )}

      {/* 2.4 Animated Analysis Progress */}
      {photoLoading && (
        <View style={styles.loadingProgressContainer}>
          {photoUri && (
            <View style={styles.scanBox}>
              <Image source={{ uri: photoUri }} style={styles.scanImage} />
              <Animated.View style={[styles.laserLine, laserAnimatedStyle]} />
            </View>
          )}

          {/* Sequential Checklist */}
          <View style={styles.checklistContainer}>
            <View style={styles.checkItem}>
              {activeStep >= 1 ? (
                <CheckCircle2 size={16} color={theme.colors.emerald} />
              ) : (
                <View style={styles.checkCirclePending} />
              )}
              <Text style={[styles.checkText, activeStep >= 1 && styles.checkTextDone]}>
                {t('Identifying foods...')}
              </Text>
            </View>

            <View style={styles.checkItem}>
              {activeStep >= 2 ? (
                <CheckCircle2 size={16} color={theme.colors.emerald} />
              ) : (
                <View style={styles.checkCirclePending} />
              )}
              <Text style={[styles.checkText, activeStep >= 2 && styles.checkTextDone]}>
                {t('Estimating portions...')}
              </Text>
            </View>

            <View style={styles.checkItem}>
              {activeStep >= 3 ? (
                <CheckCircle2 size={16} color={theme.colors.emerald} />
              ) : (
                <View style={styles.checkCirclePending} />
              )}
              <Text style={[styles.checkText, activeStep >= 3 && styles.checkTextDone]}>
                {t('Calculating nutrients...')}
              </Text>
            </View>
          </View>
        </View>
      )}

      {photoError && (
        <View style={styles.errorNotice}>
          <AlertTriangle size={16} color={theme.colors.danger} />
          <Text style={styles.errorNoticeText}>{photoError}</Text>
        </View>
      )}

      {/* 2.5 AI Disambiguation Sheet */}
      {disambiguationVisible && (
        <View style={styles.disambiguationCard}>
          <View style={styles.disambiguationHeader}>
            <HelpCircle size={16} color={theme.colors.primary} />
            <Text style={styles.disambiguationTitle}>{t('FitTrack needs a detail:')}</Text>
          </View>
          <Text style={styles.disambiguationPrompt}>
            {t('How was this dish prepared?')}
          </Text>

          <View style={styles.optionsList}>
            <TouchableOpacity
              style={styles.optionRow}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                setDisambiguationAnswer('standard');
                setDisambiguationVisible(false);
              }}
            >
              <Text style={styles.optionLabel}>{t('Standard / plain')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionRow}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                setDisambiguationAnswer('rich');
                setDisambiguationVisible(false);
              }}
            >
              <Text style={styles.optionLabel}>{t('With butter / oil (+50 kcal)')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionRow}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                setDisambiguationAnswer('unknown');
                setDisambiguationVisible(false);
              }}
            >
              <Text style={styles.optionLabelMuted}>{t('I don’t know')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 2.6 Component-Level Editing */}
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

const createStyles = (theme: ThemeType) =>
  StyleSheet.create({
    tabContentScroll: {
      paddingTop: 8,
      gap: 16,
    },
    coachingCard: {
      backgroundColor: theme.colors.amberLight,
      borderRadius: theme.radius.md,
      padding: 12,
      borderWidth: 1,
      borderColor: theme.colors.amberBorder,
    },
    coachingTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    coachingTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.amberDark,
      flex: 1,
      marginLeft: 6,
    },
    coachingText: {
      fontSize: 12,
      color: theme.colors.textPrimary,
      lineHeight: 18,
    },
    dontShowBtn: {
      marginTop: 6,
      alignSelf: 'flex-start',
    },
    dontShowText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.amberDark,
      textDecorationLine: 'underline',
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
    stagingContainer: {
      gap: 12,
    },
    photosRow: {
      flexDirection: 'row',
      gap: 10,
      width: '100%',
    },
    photoSlot: {
      flex: 1,
      height: 140,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.surfaceSubtle,
      overflow: 'hidden',
      position: 'relative',
    },
    photoSlotDashed: {
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: theme.colors.borderStrong,
      alignItems: 'center',
      justifyContent: 'center',
    },
    slotImage: {
      width: '100%',
      height: '100%',
      borderRadius: theme.radius.md,
    },
    slotBadge: {
      position: 'absolute',
      bottom: 6,
      left: 6,
      backgroundColor: theme.colors.backdrop,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: theme.radius.xs,
    },
    slotBadgeText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.white,
    },
    addSlotContent: {
      alignItems: 'center',
      gap: 6,
      padding: 8,
    },
    addSlotText: {
      fontSize: 12,
      fontWeight: '500',
      color: theme.colors.textMuted,
      textAlign: 'center',
    },
    contextInputBox: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 10,
    },
    contextInput: {
      fontSize: 13,
      color: theme.colors.textPrimary,
      padding: 0,
    },
    contextHintText: {
      fontSize: 12,
      color: theme.colors.textMuted,
      marginTop: 4,
    },
    loadingProgressContainer: {
      padding: 16,
      alignItems: 'center',
      gap: 14,
    },
    scanBox: {
      width: 280,
      height: 160,
      borderRadius: theme.radius.md,
      overflow: 'hidden',
      position: 'relative',
    },
    scanImage: {
      width: '100%',
      height: '100%',
    },
    laserLine: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      width: 3,
      backgroundColor: theme.colors.emerald,
      shadowColor: theme.colors.emerald,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.9,
      shadowRadius: 8,
    },
    checklistContainer: {
      width: '100%',
      gap: 8,
      paddingHorizontal: 16,
    },
    checkItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    checkCirclePending: {
      width: 16,
      height: 16,
      borderRadius: 8,
      borderWidth: 1.5,
      borderColor: theme.colors.borderStrong,
    },
    checkText: {
      fontSize: 13,
      color: theme.colors.textSecondary,
    },
    checkTextDone: {
      color: theme.colors.textPrimary,
      fontWeight: '600',
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
    disambiguationCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.borderStrong,
      padding: 14,
      gap: 8,
    },
    disambiguationHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    disambiguationTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.textPrimary,
    },
    disambiguationPrompt: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    optionsList: {
      gap: 6,
      marginTop: 4,
    },
    optionRow: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.surfaceSubtle,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    optionLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.textPrimary,
    },
    optionLabelMuted: {
      fontSize: 13,
      color: theme.colors.textMuted,
    },
  });
