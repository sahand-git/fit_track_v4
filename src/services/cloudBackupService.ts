import { deleteUser } from 'firebase/auth';
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, firestore, firebaseConfigured } from './firebaseApp';
import { FitTrackBackup } from '../types';
import { createBackupPayload, restoreBackup } from './backupService';
import { validateBackup } from '../utils/backupCore';
import { reauthenticateForAccountDeletion } from './authService';
import {
  CHUNK_SIZE,
  CHUNK_THRESHOLD,
  splitIntoChunks,
  reassembleChunks,
  createChunkedManifest,
} from '../utils/cloudBackupChunks';

export * from '../utils/cloudBackupChunks';

export const backupRef = (uid: string) => {
  if (!firestore) throw new Error('Firebase is not configured.');
  return doc(firestore, 'fitnessBackups', uid);
};

export const chunkRef = (uid: string, index: number) => {
  if (!firestore) throw new Error('Firebase is not configured.');
  return doc(firestore, 'fitnessBackups', uid, 'chunks', String(index));
};

function assertVerifiedOwner(uid: string): void {
  if (!firebaseConfigured || !auth?.currentUser) throw new Error('Sign in before using cloud backup.');
  if (auth.currentUser.uid !== uid) throw new Error('The signed-in account does not match this backup.');
  const hasPasswordProvider = auth.currentUser.providerData.some((provider) => provider.providerId === 'password');
  if (hasPasswordProvider && !auth.currentUser.emailVerified) throw new Error('Verify your email before using cloud backup.');
}

export async function createCloudBackup(uid: string): Promise<{ exportedAt: string; bytes: number; isChunked: boolean; chunksCount: number }> {
  assertVerifiedOwner(uid);
  const rawPayload = await createBackupPayload();
  const payload = validateBackup(rawPayload);
  const serialized = JSON.stringify(payload);
  const bytes = serialized.length * 2;

  // Check previous backup to clean up stale chunks if needed
  const previousSnap = await getDoc(backupRef(uid));
  const previousData = previousSnap.exists() ? previousSnap.data() : null;
  const previousChunkCount = (previousData?.isChunked && typeof previousData.chunkCount === 'number')
    ? previousData.chunkCount
    : 0;

  if (serialized.length <= CHUNK_THRESHOLD) {
    // Single document backup
    await setDoc(backupRef(uid), {
      version: payload.version,
      exportedAt: payload.exportedAt,
      isChunked: false,
      backup: payload,
      updatedAt: serverTimestamp(),
    });

    // Clean up any old chunks if previous backup was chunked
    if (previousChunkCount > 0) {
      const cleanupPromises = [];
      for (let i = 0; i < previousChunkCount; i++) {
        cleanupPromises.push(deleteDoc(chunkRef(uid, i)).catch(() => {}));
      }
      await Promise.all(cleanupPromises);
    }

    return { exportedAt: payload.exportedAt, bytes, isChunked: false, chunksCount: 1 };
  }

  // Chunked backup for larger payloads to beat Firestore's 1 MiB limit
  const chunks = splitIntoChunks(serialized, CHUNK_SIZE);

  // Write all chunks
  const chunkWrites = chunks.map((chunkStr, i) =>
    setDoc(chunkRef(uid, i), {
      index: i,
      totalChunks: chunks.length,
      chunk: chunkStr,
      updatedAt: serverTimestamp(),
    })
  );
  await Promise.all(chunkWrites);

  // Write manifest to main document
  await setDoc(
    backupRef(uid),
    createChunkedManifest(payload.version, payload.exportedAt, chunks.length, serialized.length, serverTimestamp())
  );

  // If previous backup had more chunks than current, clean up leftover chunk docs
  if (previousChunkCount > chunks.length) {
    const leftoverDeletes = [];
    for (let i = chunks.length; i < previousChunkCount; i++) {
      leftoverDeletes.push(deleteDoc(chunkRef(uid, i)).catch(() => {}));
    }
    await Promise.all(leftoverDeletes);
  }

  return { exportedAt: payload.exportedAt, bytes, isChunked: true, chunksCount: chunks.length };
}

export async function restoreCloudBackup(uid: string): Promise<void> {
  assertVerifiedOwner(uid);
  const snapshot = await getDoc(backupRef(uid));
  if (!snapshot.exists()) throw new Error('No cloud backup exists for this account yet.');
  const data = snapshot.data();

  let payload: FitTrackBackup;

  if (data.isChunked) {
    const chunkCount = typeof data.chunkCount === 'number' ? data.chunkCount : 0;
    if (chunkCount <= 0) {
      throw new Error('Cloud backup manifest is missing chunk metadata.');
    }

    const chunkPromises = [];
    for (let i = 0; i < chunkCount; i++) {
      chunkPromises.push(getDoc(chunkRef(uid, i)));
    }
    const chunkDocs = await Promise.all(chunkPromises);
    const chunkStrings: string[] = [];

    for (let i = 0; i < chunkCount; i++) {
      const cDoc = chunkDocs[i];
      if (!cDoc.exists()) {
        throw new Error(`Cloud backup chunk ${i} of ${chunkCount} is missing.`);
      }
      const cData = cDoc.data();
      if (typeof cData?.chunk !== 'string') {
        throw new Error(`Cloud backup chunk ${i} is corrupted.`);
      }
      chunkStrings.push(cData.chunk);
    }

    const assembled = reassembleChunks(chunkStrings);
    try {
      const parsed = JSON.parse(assembled);
      payload = validateBackup(parsed);
    } catch (err) {
      throw new Error(`Cloud backup payload could not be parsed: ${err instanceof Error ? err.message : String(err)}`);
    }
  } else {
    payload = validateBackup(data.backup);
  }

  await restoreBackup(payload, 'replace');
}

export async function deleteAccountAndBackup(uid: string, password?: string): Promise<void> {
  assertVerifiedOwner(uid);
  if (!auth?.currentUser || auth.currentUser.uid !== uid) throw new Error('The signed-in account changed. Sign in again.');
  await reauthenticateForAccountDeletion(password);

  const reference = backupRef(uid);
  const snapshot = await getDoc(reference);
  const previous = snapshot.exists() ? snapshot.data() : null;

  // Snapshot chunks in memory for rollback if needed
  let previousChunks: { id: number; data: Record<string, unknown> }[] = [];
  if (previous?.isChunked && typeof previous.chunkCount === 'number') {
    try {
      const chunkReads = [];
      for (let i = 0; i < previous.chunkCount; i++) {
        chunkReads.push(getDoc(chunkRef(uid, i)));
      }
      const cDocs = await Promise.all(chunkReads);
      previousChunks = cDocs
        .filter((d) => d.exists())
        .map((d, index) => ({ id: index, data: d.data() as Record<string, unknown> }));
    } catch (e) {
      console.warn('Could not read existing chunks before deletion:', e);
    }
  }

  // Delete main doc
  await deleteDoc(reference);

  // Delete all chunks
  if (previous?.isChunked && typeof previous.chunkCount === 'number') {
    const deletePromises = [];
    for (let i = 0; i < previous.chunkCount; i++) {
      deletePromises.push(deleteDoc(chunkRef(uid, i)).catch(() => {}));
    }
    await Promise.all(deletePromises);
  }

  try {
    await deleteUser(auth.currentUser);
  } catch (error) {
    if (previous) {
      try {
        await setDoc(reference, previous);
        if (previousChunks.length > 0) {
          const restoreChunkPromises = previousChunks.map((c) =>
            setDoc(chunkRef(uid, c.id), c.data)
          );
          await Promise.all(restoreChunkPromises);
        }
      } catch {
        throw new Error('Account deletion failed and the cloud backup could not be restored. Contact support before trying again.');
      }
    }
    throw new Error(`Account deletion failed. Your cloud backup was preserved. Sign in again and retry. ${error instanceof Error ? error.message : ''}`);
  }
}

/**
 * Checks whether an existing cloud backup is present in Firestore without throwing.
 */
export async function getCloudBackupMetadata(uid: string): Promise<{ exists: boolean; exportedAt?: string } | null> {
  try {
    if (!firebaseConfigured || !firestore) return null;
    const snap = await getDoc(backupRef(uid));
    if (!snap.exists()) return { exists: false };
    const data = snap.data();
    return {
      exists: true,
      exportedAt: data?.exportedAt || data?.backup?.exportedAt,
    };
  } catch (err) {
    console.warn('Failed to inspect cloud backup metadata:', err);
    return null;
  }
}
