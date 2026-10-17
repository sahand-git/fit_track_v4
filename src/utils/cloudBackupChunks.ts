/**
 * FitTrack Cloud Backup Chunking Engine
 *
 * Firestore documents have a strict 1,048,576 byte (1 MiB) ceiling.
 * Long-term user data (multiple months or years of meals, workouts, weight history)
 * can exceed this limit.
 *
 * To guarantee cloud backups never fail due to document size limits:
 * - Backups under 400,000 characters are saved directly in `fitnessBackups/{userId}`.
 * - Backups over 400,000 characters are automatically split into 350,000-character chunks
 *   saved under `fitnessBackups/{userId}/chunks/{index}`, with a manifest saved at
 *   `fitnessBackups/{userId}`.
 */

export const CHUNK_SIZE = 350_000;
export const CHUNK_THRESHOLD = 400_000;

export interface ChunkDocument {
  index: number;
  totalChunks: number;
  chunk: string;
  updatedAt?: unknown;
}

export interface ChunkedManifest {
  version: string;
  exportedAt: string;
  isChunked: true;
  chunkCount: number;
  totalBytes: number;
  updatedAt?: unknown;
}

export interface SingleDocBackup {
  version: string;
  exportedAt: string;
  isChunked: false;
  backup: unknown;
  updatedAt?: unknown;
}

/**
 * Splits serialized backup JSON into bounded chunks.
 */
export function splitIntoChunks(serialized: string, chunkSize = CHUNK_SIZE): string[] {
  if (!serialized) return [];
  const chunks: string[] = [];
  for (let i = 0; i < serialized.length; i += chunkSize) {
    chunks.push(serialized.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Reassembles array of ordered string chunks back into original serialized string.
 */
export function reassembleChunks(chunks: string[]): string {
  return chunks.join('');
}

/**
 * Creates manifest object for chunked backup.
 */
export function createChunkedManifest(
  version: string,
  exportedAt: string,
  chunkCount: number,
  totalBytes: number,
  updatedAt?: unknown
): ChunkedManifest {
  return {
    version,
    exportedAt,
    isChunked: true,
    chunkCount,
    totalBytes,
    ...(updatedAt !== undefined ? { updatedAt } : {}),
  };
}

/**
 * Type guard for chunked manifest document.
 */
export function isChunkedManifest(data: unknown): data is ChunkedManifest {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return (
    d.isChunked === true &&
    typeof d.chunkCount === 'number' &&
    d.chunkCount > 0 &&
    typeof d.totalBytes === 'number' &&
    typeof d.version === 'string'
  );
}
