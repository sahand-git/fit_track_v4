import { deleteUser } from 'firebase/auth';
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, firestore, firebaseConfigured } from './firebaseApp';
import { FitTrackBackup } from '../types';
import { createBackupPayload, restoreBackup } from './backupService';
import { validateBackup } from '../utils/backupCore';
import { reauthenticateForAccountDeletion } from './authService';

const MAX_BACKUP_BYTES = 750_000;
const backupRef = (uid: string) => {
  if (!firestore) throw new Error('Firebase is not configured.');
  return doc(firestore, 'fitnessBackups', uid);
};

function assertVerifiedOwner(uid: string): void {
  if (!firebaseConfigured || !auth?.currentUser) throw new Error('Sign in before using cloud backup.');
  if (auth.currentUser.uid !== uid) throw new Error('The signed-in account does not match this backup.');
  const hasPasswordProvider = auth.currentUser.providerData.some((provider) => provider.providerId === 'password');
  if (hasPasswordProvider && !auth.currentUser.emailVerified) throw new Error('Verify your email before using cloud backup.');
}

function validateSize(value: unknown): FitTrackBackup {
  const serialized = JSON.stringify(value);
  if (serialized.length * 2 > MAX_BACKUP_BYTES) throw new Error('Backup is too large. Export a local backup and reduce the stored history.');
  return validateBackup(value);
}

export async function createCloudBackup(uid: string): Promise<{ exportedAt: string; bytes: number }> {
  assertVerifiedOwner(uid);
  const payload = validateSize(await createBackupPayload());
  const encoded = JSON.stringify(payload);
  await setDoc(backupRef(uid), { version: payload.version, exportedAt: payload.exportedAt, backup: payload, updatedAt: serverTimestamp() });
  return { exportedAt: payload.exportedAt, bytes: encoded.length * 2 };
}

export async function restoreCloudBackup(uid: string): Promise<void> {
  assertVerifiedOwner(uid);
  const snapshot = await getDoc(backupRef(uid));
  if (!snapshot.exists()) throw new Error('No cloud backup exists for this account yet.');
  const backup = validateSize(snapshot.data().backup);
  await restoreBackup(backup, 'replace');
}

export async function deleteAccountAndBackup(uid: string, password?: string): Promise<void> {
  assertVerifiedOwner(uid);
  if (!auth?.currentUser || auth.currentUser.uid !== uid) throw new Error('The signed-in account changed. Sign in again.');
  await reauthenticateForAccountDeletion(password);
  const reference = backupRef(uid);
  const snapshot = await getDoc(reference);
  const previous = snapshot.exists() ? snapshot.data() : null;
  await deleteDoc(reference);
  try {
    await deleteUser(auth.currentUser);
  } catch (error) {
    if (previous) {
      try {
        await setDoc(reference, previous);
      } catch {
        throw new Error('Account deletion failed and the cloud backup could not be restored. Contact support before trying again.');
      }
    }
    throw new Error(`Account deletion failed. Your cloud backup was preserved. Sign in again and retry. ${error instanceof Error ? error.message : ''}`);
  }
}
