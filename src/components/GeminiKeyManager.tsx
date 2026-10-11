import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { AppText as Text } from './AppText';
import { Key, Check, Trash2, ExternalLink } from 'lucide-react-native';
import { getStoredGeminiApiKey, setStoredGeminiApiKey, clearGeminiApiKey } from '../services/plateAnalysisService';
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

  const [key, setKey] = useState('');
  const [hasSavedKey, setHasSavedKey] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    checkKey();
  }, []);

  const checkKey = async () => {
    const stored = await getStoredGeminiApiKey();
    if (stored) {
      setKey(stored);
      setHasSavedKey(true);
    } else {
      setKey('');
      setHasSavedKey(false);
    }
  };

  const handleSave = async () => {
    if (!key.trim()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    await setStoredGeminiApiKey(key.trim());
    setHasSavedKey(true);
    setIsEditing(false);
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
    setStatusMessage(t('Remove API key'));
    setTimeout(() => setStatusMessage(null), 3000);
    if (onKeyChanged) onKeyChanged();
  };

  return (
    <View style={[styles.card, compact && styles.compactCard]}>
      <View style={styles.headerRow}>
        <View style={styles.iconCircle}>
          <Key size={16} color={theme.colors.accent} />
        </View>
        <View style={styles.titleCol}>
          <Text style={styles.title}>{t('Google Gemini API Key')}</Text>
          <Text style={styles.subtitle}>
            {hasSavedKey ? t('API key saved') : t('Connect a Gemini API key in Profile to use AI features.')}
          </Text>
        </View>
      </View>

      {!compact && (
        <Text style={styles.description}>
          {t('A Gemini API key enables text meal estimates, plate scanning, and AI Coach. Requests send your prompt and the relevant meal or goal context to Google. Google usage limits and billing apply.')}
        </Text>
      )}

      {hasSavedKey && !isEditing ? (
        <View style={styles.savedRow}>
          <View style={styles.savedBadge}>
            <Check size={14} color={theme.colors.primary} />
            <Text style={styles.savedBadgeText}>{t('API key saved')}</Text>
          </View>
          <View style={styles.savedActions}>
            <TouchableOpacity
              style={styles.actionBtnSmall}
              onPress={() => setIsEditing(true)}
              accessibilityRole="button"
            >
              <Text style={styles.actionBtnSmallText}>{t('Configure Gemini API Key')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtnSmall, styles.actionBtnDanger]}
              onPress={handleRemove}
              accessibilityRole="button"
            >
              <Trash2 size={13} color={theme.colors.danger} />
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={key}
            onChangeText={setKey}
            placeholder={t('Gemini API key')}
            placeholderTextColor={theme.colors.textMuted}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />
          <View style={styles.btnRow}>
            {isEditing && (
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  setIsEditing(false);
                  checkKey();
                }}
              >
                <Text style={styles.cancelBtnText}>{t('Cancel')}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.saveBtn, !key.trim() && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={!key.trim()}
              accessibilityRole="button"
            >
              <Text style={styles.saveBtnText}>{t('Save API key')}</Text>
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
  savedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
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
    gap: 8,
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
    gap: 8,
  },
  cancelBtn: {
    paddingHorizontal: 14,
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
  statusToast: {
    fontSize: 11,
    color: theme.colors.primary,
    fontWeight: '600',
    textAlign: 'center',
  },
});
