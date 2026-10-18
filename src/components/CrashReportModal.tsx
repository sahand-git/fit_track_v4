import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
  BackHandler,
  Share,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { AppText as Text } from './AppText';
import {
  FileText,
  Copy,
  Share2,
  Trash2,
  X,
  Check,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react-native';
import { useLanguage } from '../i18n/I18nContext';
import { translate } from '../i18n/strings';
import { theme } from '../theme';
import {
  ScrubbedCrashReport,
  clearStoredCrashes,
} from '../services/crashReportingService';
import * as Haptics from 'expo-haptics';

interface CrashReportModalProps {
  visible: boolean;
  onClose: () => void;
  report: ScrubbedCrashReport | null;
  onClear?: () => void;
}

export const CrashReportModal: React.FC<CrashReportModalProps> = ({
  visible,
  onClose,
  report,
  onClear,
}) => {
  const language = useLanguage();
  const t = (str: string) => translate(language, str);
  const isRTL = language === 'ar' || language === 'ckb';

  const [copied, setCopied] = useState(false);
  const [cleared, setCleared] = useState(false);
  const activeReport = cleared ? null : report;

  useEffect(() => {
    if (Platform.OS !== 'android' || !visible) return;
    const onBackPress = () => {
      onClose();
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [visible, onClose]);

  if (!visible) return null;

  const buildReportPayload = (rep: ScrubbedCrashReport): string => {
    const lines = [
      `FitTrack Crash Diagnostic Report`,
      `===============================`,
      `Timestamp: ${rep.timestamp}`,
      `App Version: ${rep.appVersion}`,
      `Platform: ${rep.platform}`,
      `Error Name: ${rep.errorName}`,
      `Error Message: ${rep.errorMessage}`,
      ``,
      `Component Stack / Trace:`,
      rep.componentStack || rep.stack || 'No stack trace captured',
      `===============================`,
      `[FitTrack diagnostic data is scrubbed of all health and personal data]`,
    ];
    return lines.join('\n');
  };

  const handleCopy = async () => {
    if (!activeReport) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const payload = buildReportPayload(activeReport);
    try {
      await Clipboard.setStringAsync(payload);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy crash report:', err);
    }
  };

  const handleShare = async () => {
    if (!activeReport) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const payload = buildReportPayload(activeReport);
    try {
      await Share.share({
        title: 'FitTrack Crash Diagnostic',
        message: payload,
      });
    } catch (err) {
      console.error('Failed to share crash report:', err);
    }
  };

  const handleClear = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    await clearStoredCrashes();
    setCleared(true);
    if (onClear) onClear();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t('Close')}
        />
        <View style={[styles.modalCard, { direction: isRTL ? 'rtl' : 'ltr' }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.iconCircle}>
                <FileText size={22} color={theme.colors.primary} />
              </View>
              <View style={styles.headerTitleContainer}>
                <Text style={styles.title}>{t('Last Crash Diagnostic')}</Text>
                <Text style={styles.subtitle}>
                  {t('Stored on this device only; zero external telemetry.')}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel={t('Close')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={20} color={theme.colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
            {!activeReport ? (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconCircle}>
                  <ShieldCheck size={36} color={theme.colors.primary} />
                </View>
                <Text style={styles.emptyTitle}>{t('No crash reports recorded')}</Text>
                <Text style={styles.emptySubtitle}>
                  {t('FitTrack has not recorded any crashes on this device.')}
                </Text>
              </View>
            ) : (
              <View style={styles.reportContainer}>
                <View style={styles.noticeBanner}>
                  <AlertTriangle size={16} color={theme.colors.accent} style={{ marginTop: 2 }} />
                  <Text style={styles.noticeText}>
                    {t('Health metrics, meal logs, and API keys are strictly scrubbed before saving on-device.')}
                  </Text>
                </View>

                {/* Metadata Row */}
                <View style={styles.metaCard}>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>{t('Timestamp')}:</Text>
                    <Text style={styles.metaValue}>{new Date(activeReport.timestamp).toLocaleString()}</Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>{t('App Version')}:</Text>
                    <Text style={styles.metaValue}>{activeReport.appVersion}</Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>{t('Platform')}:</Text>
                    <Text style={styles.metaValue}>{activeReport.platform}</Text>
                  </View>
                </View>

                {/* Error Details */}
                <View style={styles.detailCard}>
                  <Text style={styles.cardHeader}>{t('Error Details')}</Text>
                  <Text style={styles.errorText}>
                    {activeReport.errorName}: {activeReport.errorMessage}
                  </Text>
                </View>

                {/* Stack Trace */}
                {(activeReport.componentStack || activeReport.stack) && (
                  <View style={styles.detailCard}>
                    <Text style={styles.cardHeader}>{t('Component Stack')}</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <Text style={styles.stackText}>
                        {activeReport.componentStack || activeReport.stack}
                      </Text>
                    </ScrollView>
                  </View>
                )}
              </View>
            )}
          </ScrollView>

          {/* Footer Actions */}
          {activeReport ? (
            <View style={styles.footer}>
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.copyBtn]}
                  onPress={handleCopy}
                  accessibilityRole="button"
                  accessibilityLabel={copied ? t('Copied!') : t('Copy Report')}
                  activeOpacity={0.8}
                >
                  {copied ? (
                    <Check size={16} color={theme.colors.primary} />
                  ) : (
                    <Copy size={16} color={theme.colors.textPrimary} />
                  )}
                  <Text style={styles.actionBtnText}>
                    {copied ? t('Copied!') : t('Copy Report')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, styles.shareBtn]}
                  onPress={handleShare}
                  accessibilityRole="button"
                  accessibilityLabel={t('Share Report')}
                  activeOpacity={0.8}
                >
                  <Share2 size={16} color={theme.colors.textPrimary} />
                  <Text style={styles.actionBtnText}>{t('Share Report')}</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.clearBtn}
                onPress={handleClear}
                accessibilityRole="button"
                accessibilityLabel={t('Clear History')}
                activeOpacity={0.8}
              >
                <Trash2 size={15} color={theme.colors.danger} />
                <Text style={styles.clearBtnText}>{t('Clear History')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.footer}>
              <TouchableOpacity
                style={styles.closeFullBtn}
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel={t('Close')}
                activeOpacity={0.8}
              >
                <Text style={styles.closeFullBtnText}>{t('Close')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(28, 33, 28, 0.45)',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  modalCard: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    maxHeight: '85%',
    minHeight: '40%',
    ...theme.shadow.floating,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceSubtle,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
  },
  title: {
    fontFamily: theme.fonts.serif,
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 18,
    backgroundColor: theme.colors.surface,
  },
  scrollArea: {
    flexGrow: 1,
  },
  scrollContent: {
    padding: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.surfaceSubtle,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: theme.fonts.serif,
    fontSize: 17,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 18,
  },
  reportContainer: {
    gap: 14,
  },
  noticeBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: theme.colors.accentLight,
    padding: 12,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(217, 107, 79, 0.2)',
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 17,
  },
  metaCard: {
    backgroundColor: theme.colors.surface,
    padding: 14,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 8,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  metaValue: {
    fontSize: 13,
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
  detailCard: {
    backgroundColor: theme.colors.surface,
    padding: 14,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cardHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 13,
    color: theme.colors.danger,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    lineHeight: 18,
  },
  stackText: {
    fontSize: 11,
    color: theme.colors.textMuted,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    lineHeight: 16,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    gap: 10,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  copyBtn: {},
  shareBtn: {},
  actionBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  clearBtnText: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.danger,
  },
  closeFullBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    borderRadius: theme.radius.md,
  },
  closeFullBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textInverted,
  },
});
