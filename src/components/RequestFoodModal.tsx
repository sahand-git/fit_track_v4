import React, { useState } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Linking,
  Share,
} from 'react-native';
import { AppText as Text } from './AppText';
import { X, Send, Mail, Share2, AlertCircle, CheckCircle, Info } from 'lucide-react-native';
import { useLanguage } from '../i18n/I18nContext';
import { translate } from '../i18n/strings';
import {
  submitFoodRequest,
  createFoodRequestMailtoUrl,
  formatFoodRequestShareMessage,
} from '../services/foodRequestService';
import { theme } from '../theme';

export interface RequestFoodModalProps {
  visible: boolean;
  onClose: () => void;
  initialFoodName?: string;
  initialBarcode?: string;
}

export const RequestFoodModal: React.FC<RequestFoodModalProps> = ({
  visible,
  onClose,
  initialFoodName = '',
  initialBarcode = '',
}) => {
  const language = useLanguage();
  const t = (str: string) => translate(language, str);

  const [foodName, setFoodName] = useState(initialFoodName);
  const [brand, setBrand] = useState('');
  const [barcode, setBarcode] = useState(initialBarcode);
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fallbackMode, setFallbackMode] = useState<'signed_out' | 'unverified' | 'rate_limited' | null>(null);
  const [rateLimitWait, setRateLimitWait] = useState<number>(0);
  const [prevVisible, setPrevVisible] = useState(visible);

  if (visible !== prevVisible) {
    setPrevVisible(visible);
    if (visible) {
      setFoodName(initialFoodName);
      setBarcode(initialBarcode);
      setBrand('');
      setNotes('');
      setSubmitting(false);
      setSuccess(false);
      setErrorMessage(null);
      setFallbackMode(null);
      setRateLimitWait(0);
    }
  }

  const handleSubmit = async () => {
    if (!foodName.trim()) {
      setErrorMessage(t('Food name is required.'));
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await submitFoodRequest({
        foodName,
        brand,
        barcode,
        notes,
      });

      if (res.status === 'success') {
        setSuccess(true);
        setTimeout(() => {
          onClose();
        }, 1600);
      } else if (res.status === 'rate_limited') {
        setFallbackMode('rate_limited');
        setRateLimitWait(res.waitMinutes);
      } else if (res.status === 'signed_out') {
        setFallbackMode('signed_out');
      } else if (res.status === 'unverified') {
        setFallbackMode('unverified');
      } else if (res.status === 'error') {
        setErrorMessage(res.message);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || t('Something went wrong. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEmailFallback = async () => {
    if (!foodName.trim()) {
      setErrorMessage(t('Food name is required.'));
      return;
    }
    const url = createFoodRequestMailtoUrl({ foodName, brand, barcode, notes });
    try {
      await Linking.openURL(url);
    } catch {
      setErrorMessage(t('Something went wrong. Please try again.'));
    }
  };

  const handleShareFallback = async () => {
    if (!foodName.trim()) {
      setErrorMessage(t('Food name is required.'));
      return;
    }
    const message = formatFoodRequestShareMessage({ foodName, brand, barcode, notes });
    try {
      await Share.share({
        title: `FitTrack Food Request: ${foodName.trim()}`,
        message,
      });
    } catch {
      setErrorMessage(t('Something went wrong. Please try again.'));
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{t('Request a Food')}</Text>
              <Text style={styles.subtitle}>
                {t("Can't find a food in the database? Request it here and we will verify and add it.")}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel={t('Cancel')}
            >
              <X size={18} color={theme.colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {success ? (
              <View style={styles.successBox}>
                <CheckCircle size={32} color={theme.colors.primary} />
                <Text style={styles.successTitle}>{t('Request submitted successfully!')}</Text>
              </View>
            ) : (
              <>
                {/* Fallback & Notice Banners */}
                {fallbackMode === 'signed_out' && (
                  <View style={styles.noticeBanner}>
                    <Info size={16} color={theme.colors.accent} />
                    <Text style={styles.noticeText}>
                      {t('You are in guest mode. Sign in to submit directly, or send via email / share.')}
                    </Text>
                  </View>
                )}

                {fallbackMode === 'unverified' && (
                  <View style={styles.noticeBanner}>
                    <AlertCircle size={16} color={theme.colors.accent} />
                    <Text style={styles.noticeText}>
                      {t('Please verify your email address to submit directly, or send via email / share.')}
                    </Text>
                  </View>
                )}

                {fallbackMode === 'rate_limited' && (
                  <View style={[styles.noticeBanner, { borderColor: theme.colors.warning }]}>
                    <AlertCircle size={16} color={theme.colors.warning} />
                    <Text style={styles.noticeText}>
                      {`${t('Rate limit reached. Please wait')} ${rateLimitWait} ${t('minutes before submitting another request.')}`}
                    </Text>
                  </View>
                )}

                {errorMessage && (
                  <View style={styles.errorBanner}>
                    <AlertCircle size={15} color={theme.colors.danger} />
                    <Text style={styles.errorText}>{errorMessage}</Text>
                  </View>
                )}

                {/* Form Fields */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>{t('Food name *')}</Text>
                  <TextInput
                    style={styles.input}
                    value={foodName}
                    onChangeText={setFoodName}
                    placeholder={t('e.g. Kurdish Biryani, Almond Milk')}
                    placeholderTextColor={theme.colors.textMuted}
                    maxLength={200}
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>{t('Brand or restaurant (optional)')}</Text>
                  <TextInput
                    style={styles.input}
                    value={brand}
                    onChangeText={setBrand}
                    placeholder={t('e.g. Al-Mansour Bakeries, Homemade')}
                    placeholderTextColor={theme.colors.textMuted}
                    maxLength={200}
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>{t('Barcode (optional)')}</Text>
                  <TextInput
                    style={styles.input}
                    value={barcode}
                    onChangeText={setBarcode}
                    placeholder="123456789012"
                    placeholderTextColor={theme.colors.textMuted}
                    keyboardType="number-pad"
                    maxLength={50}
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>{t('Notes or serving details (optional)')}</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={notes}
                    onChangeText={setNotes}
                    placeholder={t('e.g. Sold in 250g packs, approx 150 kcal per 100g')}
                    placeholderTextColor={theme.colors.textMuted}
                    multiline
                    numberOfLines={3}
                    maxLength={500}
                  />
                </View>

                {/* Primary Submit Button */}
                <TouchableOpacity
                  style={[styles.submitBtn, submitting && styles.btnDisabled]}
                  onPress={handleSubmit}
                  disabled={submitting}
                  accessibilityRole="button"
                  accessibilityLabel={t('Submit Request')}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color={theme.colors.textInverted} />
                  ) : (
                    <>
                      <Send size={15} color={theme.colors.textInverted} />
                      <Text style={styles.submitBtnText}>{t('Submit Request')}</Text>
                    </>
                  )}
                </TouchableOpacity>

                {/* Fallback Options (Shown prominently if signed out, unverified, or rate limited) */}
                <View style={styles.fallbackRow}>
                  <TouchableOpacity
                    style={styles.fallbackBtn}
                    onPress={handleEmailFallback}
                    accessibilityRole="button"
                    accessibilityLabel={t('Email Request')}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Mail size={14} color={theme.colors.primary} />
                    <Text style={styles.fallbackBtnText}>{t('Email Request')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.fallbackBtn}
                    onPress={handleShareFallback}
                    accessibilityRole="button"
                    accessibilityLabel={t('Share Request')}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Share2 size={14} color={theme.colors.primary} />
                    <Text style={styles.fallbackBtnText}>{t('Share Request')}</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(31, 36, 33, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  sheetContainer: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '90%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.serif,
  },
  subtitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 16,
    marginTop: 4,
  },
  closeBtn: {
    padding: 6,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.surfaceSubtle,
    marginStart: 8,
  },
  scrollContent: {
    paddingBottom: 8,
  },
  noticeBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: theme.colors.accentLight,
    borderWidth: 1,
    borderColor: theme.colors.accentBorder,
    borderRadius: theme.radius.md,
    padding: 10,
    marginBottom: 14,
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    color: theme.colors.accent,
    lineHeight: 16,
    fontWeight: '500',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.dangerLight,
    borderWidth: 1,
    borderColor: theme.colors.danger,
    borderRadius: theme.radius.md,
    padding: 10,
    marginBottom: 14,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: theme.colors.danger,
    fontWeight: '600',
  },
  successBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    gap: 12,
  },
  successTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.primary,
    textAlign: 'center',
  },
  fieldGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: theme.colors.textPrimary,
  },
  textArea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    borderRadius: theme.radius.md,
    marginTop: 6,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textInverted,
  },
  fallbackRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  fallbackBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  fallbackBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
  },
});
