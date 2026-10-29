import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Linking, useWindowDimensions } from 'react-native';
import { AppText as Text } from './AppText';
import { Key, Check, Trash2, ExternalLink, AlertCircle, Sparkles } from 'lucide-react-native';
import { getStoredGeminiApiKey, setStoredGeminiApiKey, clearGeminiApiKey } from '../services/plateAnalysisService';
import { testGeminiConnection, GeminiError, getDefaultMessageForKind } from '../utils/geminiModels';
import { useLanguage } from '../i18n/I18nContext';
import { translate } from '../i18n/strings';
import { useTheme } from '../theme/ThemeContext';
import { ThemeType } from '../theme';
import { useIsRTL } from '../hooks/useIsRTL';
import * as Haptics from 'expo-haptics';
import { AiSetupWizard } from './AiSetupWizardModal';

interface GeminiKeyManagerProps {
  onKeyChanged?: () => void;
  compact?: boolean;
}

export const GeminiKeyManager: React.FC<GeminiKeyManagerProps> = ({ onKeyChanged, compact = false }) => {
  const language = useLanguage();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const t = (str: string) => translate(language, str);
  const isRTL = useIsRTL();

  const [key, setKey] = useState('');
  const [hasSavedKey, setHasSavedKey] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Connection testing state: idle | testing | success | failed
  const [testState, setTestState] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');
  const [activeModel, setActiveModel] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [providerDetail, setProviderDetail] = useState<string | null>(null);
  const [showWizardModal, setShowWizardModal] = useState(false);
  const { fontScale } = useWindowDimensions();
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [textOverflowed, setTextOverflowed] = useState(false);

  const shouldStack =
    fontScale > 1.15 ||
    textOverflowed ||
    (language === 'ckb' && containerWidth > 0 && containerWidth < 330) ||
    (containerWidth > 0 && containerWidth < 280);

  const checkKey = useCallback(() => {
    let isMounted = true;
    getStoredGeminiApiKey().then((stored) => {
      if (!isMounted) return;
      if (stored) {
        setKey(stored);
        setHasSavedKey(true);
      } else {
        setKey('');
        setHasSavedKey(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    return checkKey();
  }, [checkKey]);

  const resetTestState = () => {
    setTestState('idle');
    setActiveModel(null);
    setErrorMessage(null);
    setProviderDetail(null);
  };

  const handleTestConnection = async () => {
    const keyToTest = key.trim();
    if (!keyToTest || testState === 'testing') return;

    setTestState('testing');
    setErrorMessage(null);
    setProviderDetail(null);
    setActiveModel(null);

    try {
      const model = await testGeminiConnection(keyToTest);
      setTestState('success');
      setActiveModel(model);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (err: any) {
      setTestState('failed');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});

      if (err instanceof GeminiError) {
        setErrorMessage(t(getDefaultMessageForKind(err.kind)));
        if (err.providerMessage && err.providerMessage.trim().length > 0) {
          setProviderDetail(err.providerMessage);
        }
      } else {
        setErrorMessage(err?.message || t('Connection failed'));
      }
    }
  };

  const handleSave = async () => {
    if (!key.trim()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    await setStoredGeminiApiKey(key.trim());
    setHasSavedKey(true);
    setIsEditing(false);
    resetTestState();
    setStatusMessage(t('API key saved'));
    setTimeout(() => setStatusMessage(null), 3000);
    if (onKeyChanged) onKeyChanged();
  };

  const handleRemove = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    await clearGeminiApiKey();
    setKey('');
    setHasSavedKey(false);
    setIsEditing(false);
    resetTestState();
    setStatusMessage(t('Remove API key'));
    setTimeout(() => setStatusMessage(null), 3000);
    if (onKeyChanged) onKeyChanged();
  };

  const openGoogleAIStudio = () => {
    Linking.openURL('https://aistudio.google.com/app/apikey').catch(() => {});
  };

  return (
    <View style={[styles.card, compact && styles.compactCard, { direction: isRTL ? 'rtl' : 'ltr' }]}>
      <View style={[styles.headerRow, isRTL && styles.rowRTL]}>
        <View style={styles.iconCircle}>
          <Key size={16} color={theme.colors.accent} />
        </View>
        <View style={styles.titleCol}>
          <Text style={[styles.title, isRTL && styles.textRTL]}>{t('Google Gemini API Key')}</Text>
          {!hasSavedKey && (
            <Text style={[styles.subtitle, isRTL && styles.textRTL]}>
              {t('Connect a Gemini API key in Profile to use AI features.')}
            </Text>
          )}
        </View>
      </View>

      {!compact && (
        <Text style={[styles.description, isRTL && styles.textRTL]}>
          {t('A Gemini API key enables text meal estimates, plate scanning, and AI Coach. Requests send your prompt and the relevant meal or goal context to Google. Google usage limits and billing apply.')}
        </Text>
      )}

      <TouchableOpacity
        style={[styles.wizardLaunchBtn, isRTL && styles.rowRTL]}
        onPress={() => setShowWizardModal(true)}
        accessibilityRole="button"
        accessibilityLabel={t('Guided Setup Wizard')}
      >
        <Sparkles size={14} color={theme.colors.accent} />
        <Text style={styles.wizardLaunchBtnText}>{t('Guided Setup Wizard')}</Text>
      </TouchableOpacity>

      {hasSavedKey && !isEditing ? (
        <View style={styles.savedSection}>
          <View style={[styles.statusPillRow, isRTL && styles.rowRTL]}>
            <View style={[styles.savedBadge, isRTL && styles.rowRTL]}>
              <Check size={14} color={theme.colors.primary} />
              <Text style={styles.savedBadgeText}>{t('API key saved')}</Text>
            </View>
          </View>

          {shouldStack ? (
            <View
              style={styles.savedActionsStacked}
              onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
            >
              <TouchableOpacity
                style={[styles.actionBtnFull, testState === 'testing' && styles.btnDisabled]}
                onPress={handleTestConnection}
                disabled={testState === 'testing'}
                accessibilityRole="button"
                accessibilityLabel={t('Test connection')}
                accessibilityState={{ busy: testState === 'testing' }}
              >
                {testState === 'testing' ? (
                  <View style={[styles.inlineTestingRow, isRTL && styles.rowRTL]}>
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                    <Text style={styles.actionBtnText}>{t('Testing connection…')}</Text>
                  </View>
                ) : (
                  <Text style={styles.actionBtnText}>{t('Test connection')}</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionBtnFull}
                onPress={() => {
                  setIsEditing(true);
                  resetTestState();
                }}
                accessibilityRole="button"
                accessibilityLabel={t('Change key')}
              >
                <Text style={styles.actionBtnText}>{t('Change key')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtnFull, styles.actionBtnDanger, styles.trashBtnFull, isRTL && styles.rowRTL]}
                onPress={handleRemove}
                accessibilityRole="button"
                accessibilityLabel={t('Remove API key')}
              >
                <Trash2 size={16} color={theme.colors.danger} />
                <Text style={styles.trashBtnFullText}>{t('Remove API key')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View
              style={[styles.savedActionsRow, isRTL && styles.rowRTL]}
              onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
            >
              <TouchableOpacity
                style={[styles.actionBtnFlex, testState === 'testing' && styles.btnDisabled]}
                onPress={handleTestConnection}
                disabled={testState === 'testing'}
                accessibilityRole="button"
                accessibilityLabel={t('Test connection')}
                accessibilityState={{ busy: testState === 'testing' }}
              >
                {testState === 'testing' ? (
                  <View style={[styles.inlineTestingRow, isRTL && styles.rowRTL]}>
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                    <Text
                      style={styles.actionBtnText}
                      numberOfLines={2}
                      onTextLayout={(e) => {
                        if (e.nativeEvent.lines.length > 2) setTextOverflowed(true);
                      }}
                    >
                      {t('Testing connection…')}
                    </Text>
                  </View>
                ) : (
                  <Text
                    style={styles.actionBtnText}
                    numberOfLines={2}
                    onTextLayout={(e) => {
                      if (e.nativeEvent.lines.length > 2) setTextOverflowed(true);
                    }}
                  >
                    {t('Test connection')}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionBtnFlex}
                onPress={() => {
                  setIsEditing(true);
                  resetTestState();
                }}
                accessibilityRole="button"
                accessibilityLabel={t('Change key')}
              >
                <Text
                  style={styles.actionBtnText}
                  numberOfLines={2}
                  onTextLayout={(e) => {
                    if (e.nativeEvent.lines.length > 2) setTextOverflowed(true);
                  }}
                >
                  {t('Change key')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.trashBtnSquare, styles.actionBtnDanger]}
                onPress={handleRemove}
                accessibilityRole="button"
                accessibilityLabel={t('Remove API key')}
              >
                <Trash2 size={16} color={theme.colors.danger} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.input, isRTL && styles.inputRTL]}
            value={key}
            onChangeText={(v) => {
              setKey(v);
              resetTestState();
            }}
            placeholder={t('Gemini API key')}
            placeholderTextColor={theme.colors.textMuted}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />
          <View style={[styles.btnRow, isRTL && styles.rowRTL]}>
            {key.trim().length > 0 && (
              <TouchableOpacity
                style={[styles.testBtn, testState === 'testing' && styles.btnDisabled]}
                onPress={handleTestConnection}
                disabled={testState === 'testing'}
                accessibilityRole="button"
                accessibilityLabel={t('Test connection')}
                accessibilityState={{ busy: testState === 'testing' }}
              >
                {testState === 'testing' ? (
                  <View style={[styles.inlineTestingRow, isRTL && styles.rowRTL]}>
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                    <Text style={styles.testBtnText}>{t('Testing connection…')}</Text>
                  </View>
                ) : (
                  <Text style={styles.testBtnText}>{t('Test connection')}</Text>
                )}
              </TouchableOpacity>
            )}
            {isEditing && (
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  setIsEditing(false);
                  resetTestState();
                  checkKey();
                }}
                accessibilityRole="button"
                accessibilityLabel={t('Cancel')}
              >
                <Text style={styles.cancelBtnText}>{t('Cancel')}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.saveBtn, !key.trim() && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={!key.trim()}
              accessibilityRole="button"
              accessibilityLabel={t('Save API key')}
            >
              <Text style={styles.saveBtnText}>{t('Save API key')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Connection Test Results */}
      {testState === 'success' && (
        <View style={styles.successBox}>
          <View style={[styles.feedbackHeaderRow, isRTL && styles.rowRTL]}>
            <View style={styles.successIconCircle}>
              <Check size={14} color={theme.colors.primary} />
            </View>
            <View style={styles.feedbackTitleCol}>
              <Text style={[styles.successTitle, isRTL && styles.textRTL]}>{t('Connection successful')}</Text>
              {activeModel && (
                <Text style={[styles.activeModelText, isRTL && styles.textRTL]}>
                  {t('Connected: ')}{activeModel}
                </Text>
              )}
            </View>
          </View>
        </View>
      )}

      {testState === 'failed' && (
        <View style={styles.errorBox}>
          <View style={[styles.feedbackHeaderRow, isRTL && styles.rowRTL]}>
            <View style={styles.errorIconCircle}>
              <AlertCircle size={15} color={theme.colors.danger} />
            </View>
            <View style={styles.feedbackTitleCol}>
              <Text style={[styles.errorTitle, isRTL && styles.textRTL]}>{t('Connection failed')}</Text>
              {errorMessage && (
                <Text style={[styles.errorBody, isRTL && styles.textRTL]}>{errorMessage}</Text>
              )}
              {providerDetail && providerDetail !== errorMessage && (
                <Text style={[styles.providerDetailText, isRTL && styles.textRTL]}>
                  {providerDetail}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.hintContainer}>
            <Text style={[styles.hintText, isRTL && styles.textRTL]}>
              {t('Check your API key permissions and billing status at Google AI Studio.')}
            </Text>
            <TouchableOpacity
              style={[styles.studioLinkBtn, isRTL && styles.rowRTL]}
              onPress={openGoogleAIStudio}
              accessibilityRole="link"
              accessibilityLabel={t('Open Google AI Studio')}
            >
              <Text style={styles.studioLinkText}>{t('Open Google AI Studio')}</Text>
              <ExternalLink size={12} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {statusMessage && (
        <Text style={styles.statusToast}>{statusMessage}</Text>
      )}

      <AiSetupWizard
        visible={showWizardModal}
        onClose={() => setShowWizardModal(false)}
        onComplete={() => {
          setShowWizardModal(false);
          checkKey();
          if (onKeyChanged) onKeyChanged();
        }}
        onSkip={() => setShowWizardModal(false)}
      />
    </View>
  );
};

const createStyles = (theme: ThemeType) =>
  StyleSheet.create({
  wizardLaunchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: `${theme.colors.accent}12`,
    borderWidth: 1,
    borderColor: `${theme.colors.accent}30`,
    borderRadius: theme.radius.sm,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
    minHeight: 36,
  },
  wizardLaunchBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.accent,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    gap: 10,
    ...theme.shadow.subtle,
  },
  compactCard: {
    padding: 12,
    gap: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rowRTL: {
    flexDirection: 'row-reverse',
  },
  textRTL: {
    textAlign: 'right',
  },
  inputRTL: {
    textAlign: 'right',
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleCol: {
    flex: 1,
  },
  title: {
    fontFamily: theme.fonts.sans,
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 1,
  },
  description: {
    fontSize: 12,
    lineHeight: 18,
    color: theme.colors.textSecondary,
  },
  savedSection: {
    gap: 8,
    marginTop: 4,
  },
  statusPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  savedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radius.full,
    alignSelf: 'flex-start',
  },
  savedBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  savedActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
  },
  savedActionsStacked: {
    flexDirection: 'column',
    gap: 8,
    width: '100%',
  },
  actionBtnFlex: {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnFull: {
    width: '100%',
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  trashBtnSquare: {
    width: 44,
    height: 44,
    minWidth: 44,
    minHeight: 44,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trashBtnFull: {
    flexDirection: 'row',
    gap: 8,
  },
  trashBtnFullText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.danger,
  },
  actionBtnDanger: {
    backgroundColor: theme.colors.crimsonLight,
    borderColor: theme.colors.crimsonBorder,
  },
  inputContainer: {
    gap: 8,
    marginTop: 4,
  },
  input: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: theme.colors.textPrimary,
  },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  inlineTestingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  testBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.primaryBorder,
  },
  testBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  cancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radius.md,
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  saveBtn: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: theme.radius.md,
    justifyContent: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textInverted,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  statusToast: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '600',
    textAlign: 'center',
  },
  successBox: {
    backgroundColor: theme.colors.forestKeyLight,
    borderWidth: 1,
    borderColor: theme.colors.forestKeyBorder,
    borderRadius: theme.radius.md,
    padding: 10,
    gap: 4,
    marginTop: 4,
  },
  feedbackHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  successIconCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: theme.colors.forestKeyPill,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  feedbackTitleCol: {
    flex: 1,
  },
  successTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  activeModelText: {
    fontSize: 12,
    color: theme.colors.forestKeyText,
    marginTop: 2,
    fontWeight: '500',
  },
  errorBox: {
    backgroundColor: theme.colors.dangerLightWash,
    borderWidth: 1,
    borderColor: theme.colors.dangerWashBorder,
    borderRadius: theme.radius.md,
    padding: 10,
    gap: 8,
    marginTop: 4,
  },
  errorIconCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: theme.colors.dangerSoftLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  errorTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.danger,
  },
  errorBody: {
    fontSize: 12,
    color: theme.colors.dangerMuted,
    marginTop: 2,
    lineHeight: 16,
  },
  providerDetailText: {
    fontSize: 12,
    color: theme.colors.dangerDeep,
    marginTop: 3,
    fontStyle: 'italic',
  },
  hintContainer: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.dangerSubtleBorder,
    paddingTop: 6,
    gap: 4,
  },
  hintText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    lineHeight: 16,
  },
  studioLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingVertical: 2,
  },
  studioLinkText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
    textDecorationLine: 'underline',
  },
});
