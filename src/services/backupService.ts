import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { FitTrackBackup, BackupSummary } from '../types';
import {
  parseBackup,
  serializeBackup,
  computeBackupSummary,
} from '../utils/backupCore';
import {
  isV2BackupPayload,
  validateAndMigrateV2Backup,
} from '../utils/v2Importer';
import {
  loadUserProfile,
  getAllDailyLogs,
  loadSupplementRoutine,
  loadWeightHistory,
  loadReminderSettings,
  loadRecentFoods,
  loadFavoriteFoods,
  loadCustomFoods,
  loadBarcodeCache,
  restoreAllData,
} from '../storage/storage';

export interface BackupTransport {
  writeFile?: (path: string, contents: string) => Promise<string>;
  share?: (uri: string, title: string) => Promise<void>;
}

/**
 * Builds a validated, complete FitTrackBackup payload from current local storage.
 * Strips all secrets, API keys, and temporary tokens.
 */
export async function createBackupPayload(): Promise<FitTrackBackup> {
  const [
    profile,
    dailyLogs,
    supplementRoutine,
    weightHistory,
    reminderSettings,
    recentFoods,
    favoriteFoods,
    customFoods,
    barcodeCache,
  ] = await Promise.all([
    loadUserProfile(),
    getAllDailyLogs(),
    loadSupplementRoutine(),
    loadWeightHistory(),
    loadReminderSettings(),
    loadRecentFoods(),
    loadFavoriteFoods(),
    loadCustomFoods(),
    loadBarcodeCache(),
  ]);

  const raw = {
    version: '4.0',
    exportedAt: new Date().toISOString(),
    profile,
    dailyLogs,
    supplementRoutine,
    weightHistory,
    reminderSettings,
    recentFoods,
    favoriteFoods,
    customFoods,
    barcodeCache,
  };

  // Run through allowlist serialization and parser to ensure 100% schema compliance and secret stripping
  const serialized = serializeBackup(raw);
  return parseBackup(serialized);
}

/**
 * Exports the backup JSON file and triggers the native share sheet.
 * If user cancels or sharing fails, the operation throws or returns appropriately;
 * cancellation is NEVER reported as a successful save.
 */
export async function exportBackupFile(
  payloadJson?: string,
  transport: BackupTransport = {}
): Promise<'share' | 'saved'> {
  const json = payloadJson ?? serializeBackup(await createBackupPayload());
  // Pre-validate before writing
  parseBackup(json);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `fittrack_backup_${timestamp}.json`;

  if (transport.writeFile && transport.share) {
    const fileUri = await transport.writeFile(filename, json);
    await transport.share(fileUri, 'FitTrack Backup');
    return 'share';
  }

  const dir = `${FileSystem.cacheDirectory || ''}backups/`;
  try {
    const dirInfo = await FileSystem.getInfoAsync(dir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    }
  } catch {}

  const fileUri = `${dir}${filename}`;
  await FileSystem.writeAsStringAsync(fileUri, json, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error('Native sharing is unavailable on this device.');
  }

  await Sharing.shareAsync(fileUri, {
    mimeType: 'application/json',
    dialogTitle: 'Save your FitTrack backup',
    UTI: 'public.json',
  });

  return 'share';
}

/**
 * Opens document picker, reads the selected backup file, and validates it.
 * Everything is validated BEFORE any storage mutation occurs.
 */
export async function pickAndValidateBackupFile(): Promise<{
  backup: FitTrackBackup;
  summary: BackupSummary;
  sourceVersion: '4.0' | '2.0';
} | null> {
  const pickerResult = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
    copyToCacheDirectory: true,
  });

  if (pickerResult.canceled || !pickerResult.assets || pickerResult.assets.length === 0) {
    return null;
  }

  const asset = pickerResult.assets[0];
  const content = await FileSystem.readAsStringAsync(asset.uri, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  // Validate everything BEFORE touching storage
  try {
    const backup = parseBackup(content);
    const summary = computeBackupSummary(backup);
    return { backup, summary, sourceVersion: '4.0' };
  } catch {
    if (isV2BackupPayload(content)) {
      const migrated = validateAndMigrateV2Backup(content);
      return {
        backup: migrated.backup,
        summary: migrated.summary,
        sourceVersion: '2.0',
      };
    }
    throw new Error('Invalid backup file format.');
  }
}

/**
 * Restores a validated backup into local storage.
 * If any error occurs during restoration, storage is preserved safely.
 */
export async function restoreBackup(
  backup: FitTrackBackup,
  mode: 'merge' | 'replace'
): Promise<void> {
  // Re-verify backup structure
  const verified = parseBackup(serializeBackup(backup));
  await restoreAllData(verified, mode);
}
