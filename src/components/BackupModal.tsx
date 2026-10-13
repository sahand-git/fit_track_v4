import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { AppText as Text } from './AppText';
import {
  Download,
  Upload,
  AlertTriangle,
  CheckCircle2,
  X,
  FileText,
  Calendar,
  Utensils,
  Dumbbell,
  Scale,
  Pill,
} from 'lucide-react-native';
import { FitTrackBackup, BackupSummary } from '../types';
import {
  exportBackupFile,
  pickAndValidateBackupFile,
  restoreBackup,
} from '../services/backupService';
import { useLanguage } from '../i18n/I18nContext';
import { translate } from '../i18n/strings';
import { theme } from '../theme';
import { SaveSuccessOverlay } from './SaveSuccessOverlay';
import * as Haptics from 'expo-haptics';

interface BackupModalProps {
  visible: boolean;
  onClose: () => void;
  onRestoreComplete: () => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({
  visible,
  onClose,
  onRestoreComplete,
}) => {
  const language = useLanguage();
  const t = (str: string) => translate(language, str);

  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [pendingBackup, setPendingBackup] = useState<{
    backup: FitTrackBackup;
    summary: BackupSummary;
  } | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      await exportBackupFile();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setSuccessMessage(t('Backup Exported'));
      setTimeout(() => {
        setSuccessMessage(null);
      }, 1000);
    } catch (err: any) {
      if (!err?.message?.includes('cancel')) {
        Alert.alert(t('Export Failed'), err?.message || t('Could not export backup.'));
      }
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportPick = async () => {
    setIsImporting(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      const result = await pickAndValidateBackupFile();
      if (result) {
        setPendingBackup(result);
      }
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      Alert.alert(
        t('Invalid Backup File'),
        t('The selected file is not a valid FitTrack backup format.')
      );
    } finally {
      setIsImporting(false);
    }
  };

  const executeRestore = async (mode: 'merge' | 'replace') => {
    if (!pendingBackup) return;
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      await restoreBackup(pendingBackup.backup, mode);
      setPendingBackup(null);
      setSuccessMessage(t('Restore Completed'));
      setTimeout(() => {
        setSuccessMessage(null);
        onRestoreComplete();
        onClose();
      }, 700);
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      Alert.alert(
        t('Restore Failed'),
        err?.message || t('Could not restore backup safely. Existing data was left untouched.')
      );
    }
  };

  const handleApplyRestore = async (mode: 'merge' | 'replace') => {
    if (!pendingBackup) return;
    if (mode === 'replace') {
      Alert.alert(
        t('Replace All Data?'),
        t('This will replace your current fitness history with this backup file. Are you sure you want to proceed?'),
        [
          { text: t('Cancel'), style: 'cancel' },
          {
            text: t('Replace'),
            style: 'destructive',
            onPress: () => executeRestore(mode),
          },
        ]
      );
      return;
    }
    await executeRestore(mode);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.modalCard}>
          <SaveSuccessOverlay visible={Boolean(successMessage)} message={successMessage || ''} />
          <View style={styles.header}>
            <Text style={styles.title}>{t('Backup & Restore')}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={18} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* If a backup file has been picked and validated, show confirmation summary */}
          {pendingBackup ? (
            <View style={styles.summaryContainer}>
              <View style={styles.summaryBadge}>
                <CheckCircle2 size={18} color={theme.colors.primary} />
                <Text style={styles.summaryTitle}>{t('Valid Backup Detected')}</Text>
              </View>

              <Text style={styles.summarySubtitle}>
                {t('Exported')}: {new Date(pendingBackup.backup.exportedAt).toLocaleDateString()}
              </Text>

              <View style={styles.summaryGrid}>
                <View style={styles.summaryItem}>
                  <Calendar size={15} color={theme.colors.primary} />
                  <Text style={styles.summaryItemText}>
                    {pendingBackup.summary.daysCount} {t('days logged')}
                  </Text>
                </View>
                <View style={styles.summaryItem}>
                  <Utensils size={15} color={theme.colors.primary} />
                  <Text style={styles.summaryItemText}>
                    {pendingBackup.summary.mealsCount} {t('meals recorded')}
                  </Text>
                </View>
                <View style={styles.summaryItem}>
                  <Dumbbell size={15} color={theme.colors.primary} />
                  <Text style={styles.summaryItemText}>
                    {pendingBackup.summary.workoutsCount} {t('workouts recorded')}
                  </Text>
                </View>
                <View style={styles.summaryItem}>
                  <Scale size={15} color={theme.colors.primary} />
                  <Text style={styles.summaryItemText}>
                    {pendingBackup.summary.weightsCount} {t('weight records')}
                  </Text>
                </View>
                <View style={styles.summaryItem}>
                  <Pill size={15} color={theme.colors.primary} />
                  <Text style={styles.summaryItemText}>
                    {pendingBackup.summary.routineItemsCount} {t('routine items')}
                  </Text>
                </View>
              </View>

              <Text style={styles.choicePrompt}>
                {t('Choose how you want to restore this data:')}
              </Text>

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.mergeBtn}
                  onPress={() => handleApplyRestore('merge')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.mergeBtnText}>{t('Merge with current data')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.replaceBtn}
                  onPress={() => handleApplyRestore('replace')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.replaceBtnText}>{t('Replace current data')}</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.cancelPendingBtn}
                onPress={() => setPendingBackup(null)}
              >
                <Text style={styles.cancelPendingText}>{t('Cancel file')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Main Export/Import actions */
            <View style={styles.body}>
              <Text style={styles.description}>
                {t('FitTrack saves all your data locally on your device. Export a backup JSON file to keep a personal offline copy or transfer to another device.')}
              </Text>

              <View style={styles.buttonList}>
                {/* Export Button */}
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={handleExport}
                  disabled={isExporting}
                  activeOpacity={0.8}
                >
                  <View style={styles.actionBtnLeft}>
                    <Download size={20} color={theme.colors.primary} />
                    <View>
                      <Text style={styles.actionBtnTitle}>{t('Export Backup')}</Text>
                      <Text style={styles.actionBtnDesc}>
                        {t('Save or share full fitness records JSON')}
                      </Text>
                    </View>
                  </View>
                  {isExporting && <ActivityIndicator size="small" color={theme.colors.primary} />}
                </TouchableOpacity>

                {/* Import Button */}
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={handleImportPick}
                  disabled={isImporting}
                  activeOpacity={0.8}
                >
                  <View style={styles.actionBtnLeft}>
                    <Upload size={20} color={theme.colors.primary} />
                    <View>
                      <Text style={styles.actionBtnTitle}>{t('Import Backup')}</Text>
                      <Text style={styles.actionBtnDesc}>
                        {t('Restore records from a saved JSON file')}
                      </Text>
                    </View>
                  </View>
                  {isImporting && <ActivityIndicator size="small" color={theme.colors.primary} />}
                </TouchableOpacity>
              </View>

              <View style={styles.noteBox}>
                <AlertTriangle size={15} color={theme.colors.textMuted} />
                <Text style={styles.noteText}>
                  {t('Backups include meals, workouts, weight history, routine items, and preferences. API keys and passwords are never exported.')}
                </Text>
              </View>
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
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  modalCard: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.lg,
    width: '100%',
    maxWidth: 440,
    padding: 20,
    ...theme.shadow.floating,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    fontFamily: theme.fonts.serif,
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  closeBtn: {
    padding: 6,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.surface,
  },
  body: {
    gap: 16,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    color: theme.colors.textSecondary,
  },
  buttonList: {
    gap: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  actionBtnLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  actionBtnTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  actionBtnDesc: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  noteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 10,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  noteText: {
    flex: 1,
    fontSize: 11,
    color: theme.colors.textMuted,
    lineHeight: 15,
  },
  summaryContainer: {
    gap: 14,
  },
  summaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radius.sm,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  summarySubtitle: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  summaryGrid: {
    gap: 8,
    backgroundColor: theme.colors.surface,
    padding: 12,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryItemText: {
    fontSize: 13,
    color: theme.colors.textPrimary,
  },
  choicePrompt: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginTop: 4,
  },
  actionRow: {
    gap: 10,
  },
  mergeBtn: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    borderRadius: theme.radius.md,
    alignItems: 'center',
  },
  mergeBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textInverted,
  },
  replaceBtn: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.danger,
    paddingVertical: 12,
    borderRadius: theme.radius.md,
    alignItems: 'center',
  },
  replaceBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.danger,
  },
  cancelPendingBtn: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  cancelPendingText: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
});
