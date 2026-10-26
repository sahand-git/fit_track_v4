import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Linking,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText as Text } from './AppText';
import {
  Sparkles,
  ShieldCheck,
  ExternalLink,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  X,
  ArrowRight,
} from 'lucide-react-native';
import { testGeminiConnection, GeminiError, getDefaultMessageForKind, sanitizeGeminiString } from '../utils/geminiModels';
import { setStoredGeminiApiKey, getStoredGeminiApiKey } from '../services/plateAnalysisService';
import { useLanguage } from '../i18n/I18nContext';
import { translate } from '../i18n/strings';
import { theme } from '../theme';
import * as Haptics from 'expo-haptics';

export interface AiSetupWizardProps {
  visible?: boolean;
  onClose?: () => void;
  onComplete: (savedKey?: string) => void;
  onSkip?: () => void;
  isModal?: boolean;
  isSkippable?: boolean;
}

export const AiSetupWizard: React.FC<AiSetupWizardProps> = ({
  visible = true,
  onClose,
  onComplete,
  onSkip,
  isModal = true,
  isSkippable = true,
}) => {
  const language = useLanguage();
  const t = (str: string) => translate(language, str);
  const isRTL = language !== 'en';

  const [inputKey, setInputKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [testState, setTestState] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');
  const [verifiedModel, setVerifiedModel] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [providerDetail, setProviderDetail] = useState<string | null>(null);

  // Load existing key on open if available
  React.useEffect(() => {
    let isMounted = true;
    getStoredGeminiApiKey().then((existing) => {
      if (isMounted && existing) {
        setInputKey(existing);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const openGoogleAIStudio = () => {
    Linking.openURL('https://aistudio.google.com/app/apikey').catch(() => {});
  };

  const handleTestConnection = async () => {
    const keyToTest = inputKey.trim();
    if (!keyToTest) {
      setErrorMessage(t('Key cannot be empty to test connection.'));
      setTestState('failed');
      return;
    }
    if (testState === 'testing') return;

    setTestState('testing');
    setErrorMessage(null);
    setProviderDetail(null);
    setVerifiedModel(null);

    try {
      const model = await testGeminiConnection(keyToTest);
      setTestState('success');
      setVerifiedModel(model);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (err: any) {
      setTestState('failed');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});

      if (err instanceof GeminiError) {
        setErrorMessage(t(getDefaultMessageForKind(err.kind)));
        if (err.providerMessage && err.providerMessage.trim().length > 0) {
          // Sanitized: Never leak the key
          setProviderDetail(sanitizeGeminiString(err.providerMessage, keyToTest));
        }
      } else {
        const sanitizedErr = sanitizeGeminiString(err?.message || 'Connection failed', keyToTest);
        setErrorMessage(sanitizedErr);
      }
    }
  };

  const handleSaveAndFinish = async () => {
    const trimmed = inputKey.trim();
    if (trimmed.length > 0) {
      await setStoredGeminiApiKey(trimmed);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      onComplete(trimmed);
    } else {
      onComplete(undefined);
    }
  };

  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (onSkip) {
      onSkip();
    } else {
      onComplete(undefined);
    }
  };

  const content = (
    <SafeAreaView style={[styles.container, { direction: isRTL ? 'rtl' : 'ltr' }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Header Bar */}
        <View style={[styles.headerBar, isRTL && styles.rowRTL]}>
          <View style={[styles.titleGroup, isRTL && styles.rowRTL]}>
            <View style={styles.sparkleCircle}>
              <Sparkles size={20} color={theme.colors.accent} />
            </View>
            <View>
              <Text style={[styles.wizardBadge, isRTL && styles.textRTL]}>{t('AI Setup Wizard')}</Text>
              <Text style={[styles.mainTitle, isRTL && styles.textRTL]}>{t('Bring Your Own Gemini Key')}</Text>
            </View>
          </View>
          {isModal && onClose && (
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={t('Close')}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <X size={20} color={theme.colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* 1. Optional Callout */}
        <View style={styles.cardInfo}>
          <Text style={[styles.cardInfoTitle, isRTL && styles.textRTL]}>
            {t('AI is Completely Optional')}
          </Text>
          <Text style={[styles.cardInfoText, isRTL && styles.textRTL]}>
            {t('FitTrack is 100% functional offline without AI. Core nutrition tracking, barcode scanning, custom recipes, and progress charts never require AI.')}
          </Text>
        </View>

        {/* 2. What it is */}
        <View style={styles.section}>
          <Text style={[styles.sectionHeading, isRTL && styles.textRTL]}>
            {t('What is this key?')}
          </Text>
          <Text style={[styles.sectionBody, isRTL && styles.textRTL]}>
            {t('Google Gemini powers optional AI features like photographic meal analysis, voice/text descriptions, and daily nutrition coaching.')}
          </Text>
        </View>

        {/* 3. Security guarantee */}
        <View style={styles.securityCard}>
          <View style={[styles.securityRow, isRTL && styles.rowRTL]}>
            <ShieldCheck size={20} color={theme.colors.primary} style={{ marginTop: 2 }} />
            <View style={{ flex: 1, marginStart: 10 }}>
              <Text style={[styles.securityTitle, isRTL && styles.textRTL]}>
                {t('Security & Privacy Guarantee')}
              </Text>
              <Text style={[styles.securityText, isRTL && styles.textRTL]}>
                {t('Your key stays strictly on this device in secure encrypted storage. FitTrack never uploads your key to any server or shares it with anyone.')}
              </Text>
            </View>
          </View>
        </View>

        {/* 4. Link to Google AI Studio */}
        <TouchableOpacity
          style={[styles.studioBtn, isRTL && styles.rowRTL]}
          onPress={openGoogleAIStudio}
          accessibilityRole="link"
          accessibilityLabel={t('Get Free Key from Google AI Studio')}
        >
          <Text style={styles.studioBtnText}>{t('Get Free Key from Google AI Studio')}</Text>
          <ExternalLink size={15} color={theme.colors.primary} style={{ marginStart: 8 }} />
        </TouchableOpacity>

        {/* 5. Key Input & Test */}
        <View style={styles.inputContainer}>
          <Text style={[styles.inputLabel, isRTL && styles.textRTL]}>
            {t('Paste your Gemini API key')}
          </Text>
          <View style={[styles.inputWrap, isRTL && styles.rowRTL]}>
            <TextInput
              style={[styles.textInput, isRTL && styles.textRTL]}
              value={inputKey}
              onChangeText={(text) => {
                setInputKey(text);
                setTestState('idle');
                setErrorMessage(null);
                setProviderDetail(null);
              }}
              placeholder="AIzaSy..."
              placeholderTextColor={theme.colors.textMuted}
              secureTextEntry={!showKey}
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel={t('Paste your Gemini API key')}
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setShowKey(!showKey)}
              accessibilityRole="button"
              accessibilityLabel={showKey ? t('Hide') : t('Show')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              {showKey ? (
                <EyeOff size={18} color={theme.colors.textMuted} />
              ) : (
                <Eye size={18} color={theme.colors.textMuted} />
              )}
            </TouchableOpacity>
          </View>

          {/* Test Connection Button */}
          <TouchableOpacity
            style={[
              styles.testBtn,
              (!inputKey.trim() || testState === 'testing') && styles.testBtnDisabled,
              isRTL && styles.rowRTL,
            ]}
            onPress={handleTestConnection}
            disabled={!inputKey.trim() || testState === 'testing'}
            accessibilityRole="button"
            accessibilityLabel={t('Test connection')}
            accessibilityState={{ busy: testState === 'testing' }}
          >
            {testState === 'testing' ? (
              <View style={[styles.testingRow, isRTL && styles.rowRTL]}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text style={styles.testBtnText}>{t('Testing connection…')}</Text>
              </View>
            ) : (
              <Text style={styles.testBtnText}>{t('Test connection')}</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* 6. Success State */}
        {testState === 'success' && (
          <View style={styles.successBox}>
            <View style={[styles.feedbackRow, isRTL && styles.rowRTL]}>
              <View style={styles.successIconCircle}>
                <Check size={16} color={theme.colors.primary} />
              </View>
              <View style={{ flex: 1, marginStart: 10 }}>
                <Text style={[styles.successTitle, isRTL && styles.textRTL]}>
                  {t('Connection successful')}
                </Text>
                {verifiedModel && (
                  <Text style={[styles.modelBadgeText, isRTL && styles.textRTL]}>
                    {t('Connected Model: ')}{verifiedModel}
                  </Text>
                )}
              </View>
            </View>
          </View>
        )}

        {/* 7. Failure State */}
        {testState === 'failed' && (
          <View style={styles.errorBox}>
            <View style={[styles.feedbackRow, isRTL && styles.rowRTL]}>
              <View style={styles.errorIconCircle}>
                <AlertCircle size={16} color={theme.colors.danger} />
              </View>
              <View style={{ flex: 1, marginStart: 10 }}>
                <Text style={[styles.errorTitle, isRTL && styles.textRTL]}>
                  {t('Connection failed')}
                </Text>
                {errorMessage && (
                  <Text style={[styles.errorBody, isRTL && styles.textRTL]}>
                    {errorMessage}
                  </Text>
                )}
                {providerDetail && (
                  <Text style={[styles.providerDetail, isRTL && styles.textRTL]}>
                    {providerDetail}
                  </Text>
                )}
              </View>
            </View>
            <TouchableOpacity
              style={[styles.errorStudioLink, isRTL && styles.rowRTL]}
              onPress={openGoogleAIStudio}
              accessibilityRole="link"
              accessibilityLabel={t('Check your API key permissions and billing status at Google AI Studio.')}
            >
              <Text style={styles.errorStudioText}>
                {t('Check your API key permissions and billing status at Google AI Studio.')}
              </Text>
              <ExternalLink size={12} color={theme.colors.primary} style={{ marginStart: 6 }} />
            </TouchableOpacity>
          </View>
        )}

        {/* 8. Bottom Action Buttons */}
        <View style={styles.actionRow}>
          {isSkippable && (
            <TouchableOpacity
              style={styles.skipBtn}
              onPress={handleSkip}
              accessibilityRole="button"
              accessibilityLabel={t('Skip for Now')}
            >
              <Text style={styles.skipBtnText}>{t('Skip for Now')}</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.finishBtn,
              !inputKey.trim() && isSkippable && styles.finishBtnMuted,
              isRTL && styles.rowRTL,
            ]}
            onPress={handleSaveAndFinish}
            accessibilityRole="button"
            accessibilityLabel={inputKey.trim() ? t('Save & Finish') : t('Use FitTrack without AI')}
          >
            <Text style={styles.finishBtnText}>
              {inputKey.trim() ? t('Save & Finish') : t('Use FitTrack without AI')}
            </Text>
            <ArrowRight size={16} color={theme.colors.textInverted} style={{ marginStart: 8 }} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );

  if (!isModal) {
    return content;
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      {content}
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: theme.spacing.lg,
    paddingBottom: 48,
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sparkleCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${theme.colors.accent}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: 12,
  },
  wizardBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  mainTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    backgroundColor: `${theme.colors.secondary}20`,
    borderWidth: 1,
    borderColor: `${theme.colors.secondary}40`,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: 16,
  },
  cardInfoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.primary,
    marginBottom: 4,
  },
  cardInfoText: {
    fontSize: 13,
    color: theme.colors.textPrimary,
    lineHeight: 18,
  },
  section: {
    marginBottom: 16,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  sectionBody: {
    fontSize: 13,
    color: theme.colors.textMuted,
    lineHeight: 18,
  },
  securityCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 16,
  },
  securityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  securityTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.primary,
    marginBottom: 4,
  },
  securityText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    lineHeight: 17,
  },
  studioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${theme.colors.primary}12`,
    borderWidth: 1,
    borderColor: `${theme.colors.primary}30`,
    borderRadius: theme.radius.md,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 20,
    minHeight: 48,
  },
  studioBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  inputContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.background,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  textInput: {
    flex: 1,
    height: 48,
    fontSize: 14,
    color: theme.colors.textPrimary,
  },
  eyeBtn: {
    padding: 8,
  },
  testBtn: {
    backgroundColor: `${theme.colors.primary}15`,
    borderRadius: theme.radius.sm,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  testBtnDisabled: {
    opacity: 0.5,
  },
  testBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  testingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  successBox: {
    backgroundColor: theme.colors.forestWash,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.forestBorder,
    padding: theme.spacing.md,
    marginBottom: 16,
  },
  feedbackRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  successIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.forestBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.primary,
    marginBottom: 2,
  },
  modelBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.forestDeep,
  },
  errorBox: {
    backgroundColor: theme.colors.dangerBannerBg,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.dangerOutline,
    padding: theme.spacing.md,
    marginBottom: 16,
  },
  errorIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.dangerOutline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.danger,
    marginBottom: 2,
  },
  errorBody: {
    fontSize: 12,
    color: theme.colors.textPrimary,
    lineHeight: 16,
    marginBottom: 4,
  },
  providerDetail: {
    fontSize: 12,
    color: theme.colors.textMuted,
    lineHeight: 15,
  },
  errorStudioLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.dangerOutline,
  },
  errorStudioText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
    flex: 1,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
  },
  skipBtn: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  skipBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  finishBtn: {
    flex: 2,
    flexDirection: 'row',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  finishBtnMuted: {
    backgroundColor: theme.colors.accent,
  },
  finishBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textInverted,
  },
  rowRTL: {
    flexDirection: 'row-reverse',
  },
  textRTL: {
    textAlign: 'right',
  },
});
