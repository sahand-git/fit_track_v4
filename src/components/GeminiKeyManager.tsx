import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Linking } from 'react-native';
import { AppText as Text } from './AppText';
import { Key, Check, Trash2, ExternalLink, AlertCircle, RefreshCw } from 'lucide-react-native';
import { getStoredGeminiApiKey, setStoredGeminiApiKey, clearGeminiApiKey } from '../services/plateAnalysisService';
import { testGeminiConnection, GeminiError, getDefaultMessageForKind } from '../utils/geminiModels';
import { useLanguage } from '../i18n/I18nContext';
import { translate } from '../i18n/strings';
import { theme } from '../theme';
import * as Haptics from 'expo-haptics';

interface GeminiKeyManagerProps {
  onKeyChanged?: () => void;
  compact?: boolean;
}

export const GeminiKeyManager: React.FC<GeminiKeyManagerProps> = ({ onKeyChanged, compact = false }) => {
  const language = useLanguage();
  const t = (str: string) => translate(language, str);
  const isRTL = language !== 'en';

  const [key, setKey] = useState('');
  const [hasSavedKey, setHasSavedKey] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Connection testing state: idle | testing | success | failed
  const [testState, setTestState] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');
  const [activeModel, setActiveModel] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [providerDetail, setProviderDetail] = useState<string | null>(null);

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
          <Text style={[styles.subtitle, isRTL && styles.textRTL]}>
            {hasSavedKey ? t('API key saved') : t('Connect a Gemini API key in Profile to use AI features.')}
          </Text>
        </View>
      </View>

      {!compact && (
        <Text style={[styles.description, isRTL && styles.textRTL]}>
          {t('A Gemini API key enables text meal estimates, plate scanning, and AI Coach. Requests send your prompt and the relevant meal or goal context to Google. Google usage limits and billing apply.')}
        </Text>
      )}

      {hasSavedKey && !isEditing ? (
        <View style={styles.savedSection}>
          <View style={[styles.savedRow, isRTL && styles.rowRTL]}>
            <View style={[styles.savedBadge, isRTL && styles.rowRTL]}>
              <Check size={14} color={theme.colors.primary} />
              <Text style={styles.savedBadgeText}>{t('API key saved')}</Text>
            </View>
            <View style={[styles.savedActions, isRTL && styles.rowRTL]}>
              <TouchableOpacity
                style={[styles.actionBtnSmall, testState === 'testing' && styles.btnDisabled]}
                onPress={handleTestConnection}
                disabled={testState === 'testing'}
                accessibilityRole="button"
                accessibilityLabel={t('Test connection')}
                accessibilityState={{ busy: testState === 'testing' }}
              >
                {testState === 'testing' ? (
                  <View style={[styles.inlineTestingRow, isRTL && styles.rowRTL]}>
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                    <Text style={styles.actionBtnSmallText}>{t('Testing connection…')}</Text>
                  </View>
                ) : (
                  <Text style={styles.actionBtnSmallText}>{t('Test connection')}</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionBtnSmall}
                onPress={() => {
                  setIsEditing(true);
                  resetTestState();
                }}
                accessibilityRole="button"
                accessibilityLabel={t('Configure Gemini API Key')}
              >
                <Text style={styles.actionBtnSmallText}>{t('Configure Gemini API Key')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtnSmall, styles.actionBtnDanger]}
                onPress={handleRemove}
                accessibilityRole="button"
                accessibilityLabel={t('Remove API key')}
              >
                <Trash2 size={13} color={theme.colors.danger} />
              </TouchableOpacity>
            </View>
          </View>
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
              <Check size={14} color="#1E3A2F" />
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
    </View>
  );
};

const styles = StyleSheet.create({
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
    fontSize: 11,
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
  },
  savedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
    flexWrap: 'wrap',
    gap: 8,
  },
  savedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.radius.full,
  },
  savedBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  savedActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionBtnSmall: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  actionBtnSmallText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  actionBtnDanger: {
    backgroundColor: '#FDECEC',
    borderColor: '#FACDCD',
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
    fontSize: 11,
    color: theme.colors.primary,
    fontWeight: '600',
    textAlign: 'center',
  },
  successBox: {
    backgroundColor: '#EEF6F2',
    borderWidth: 1,
    borderColor: '#C7E4D4',
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
    backgroundColor: '#D1EBDC',
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
    color: '#1E3A2F',
  },
  activeModelText: {
    fontSize: 11,
    color: '#2C5A48',
    marginTop: 2,
    fontWeight: '500',
  },
  errorBox: {
    backgroundColor: '#FDF3F2',
    borderWidth: 1,
    borderColor: '#FACBC8',
    borderRadius: theme.radius.md,
    padding: 10,
    gap: 8,
    marginTop: 4,
  },
  errorIconCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FDE2E0',
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
    fontSize: 11,
    color: '#7A221F',
    marginTop: 2,
    lineHeight: 16,
  },
  providerDetailText: {
    fontSize: 10,
    color: '#9C3A36',
    marginTop: 3,
    fontStyle: 'italic',
  },
  hintContainer: {
    borderTopWidth: 1,
    borderTopColor: '#F5D3D1',
    paddingTop: 6,
    gap: 4,
  },
  hintText: {
    fontSize: 10,
    color: theme.colors.textMuted,
    lineHeight: 14,
  },
  studioLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingVertical: 2,
  },
  studioLinkText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.primary,
    textDecorationLine: 'underline',
  },
});
