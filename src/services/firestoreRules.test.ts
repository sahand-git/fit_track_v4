function assertStrictEqual<T>(actual: T, expected: T, message?: string): void {
  if (actual !== expected) {
    throw new Error(message || `Expected ${String(expected)}, got ${String(actual)}`);
  }
}

console.log('Starting Firestore Security Rules Evaluation Tests...');

// 1. Security Rules Simulation Engine matching firestore.rules
interface AuthContext {
  uid: string;
  token: {
    email_verified?: boolean;
    [key: string]: unknown;
  };
}

interface RequestContext {
  auth: AuthContext | null;
  resource?: { data: Record<string, unknown> };
}

class FirestoreRulesEvaluator {
  private isVerifiedOwner(auth: AuthContext | null, userId: string): boolean {
    return (
      auth !== null &&
      auth.uid === userId &&
      auth.token.email_verified === true
    );
  }

  private isValidSingleDocBackup(data: Record<string, unknown>): boolean {
    const allowedKeys = new Set(['version', 'exportedAt', 'backup', 'updatedAt', 'isChunked']);
    const keys = Object.keys(data);
    const hasOnly = keys.every((k) => allowedKeys.has(k));
    if (!hasOnly) return false;

    if ('isChunked' in data && data.isChunked !== false) return false;

    const backup = data.backup;
    if (!backup || typeof backup !== 'object' || Array.isArray(backup)) return false;

    const b = backup as Record<string, unknown>;
    return b.version === '4.0' && data.version === '4.0';
  }

  private isValidChunkedManifest(data: Record<string, unknown>): boolean {
    const allowedKeys = new Set(['version', 'exportedAt', 'isChunked', 'chunkCount', 'totalBytes', 'updatedAt']);
    const keys = Object.keys(data);
    const hasOnly = keys.every((k) => allowedKeys.has(k));
    if (!hasOnly) return false;

    return (
      data.isChunked === true &&
      typeof data.chunkCount === 'number' &&
      Number.isInteger(data.chunkCount) &&
      data.chunkCount > 0 &&
      typeof data.totalBytes === 'number' &&
      Number.isInteger(data.totalBytes) &&
      data.totalBytes > 0 &&
      data.version === '4.0'
    );
  }

  private isValidChunk(data: Record<string, unknown>): boolean {
    const allowedKeys = new Set(['index', 'totalChunks', 'chunk', 'updatedAt']);
    const keys = Object.keys(data);
    const hasOnly = keys.every((k) => allowedKeys.has(k));
    if (!hasOnly) return false;

    return (
      typeof data.index === 'number' &&
      Number.isInteger(data.index) &&
      data.index >= 0 &&
      typeof data.totalChunks === 'number' &&
      Number.isInteger(data.totalChunks) &&
      data.totalChunks > 0 &&
      typeof data.chunk === 'string'
    );
  }

  canGetBackup(req: RequestContext, userId: string): boolean {
    return this.isVerifiedOwner(req.auth, userId);
  }

  canListBackups(): boolean {
    return false; // allow list: if false;
  }

  canWriteBackup(req: RequestContext, userId: string, data: Record<string, unknown>): boolean {
    if (!this.isVerifiedOwner(req.auth, userId)) return false;
    return this.isValidSingleDocBackup(data) || this.isValidChunkedManifest(data);
  }

  canDeleteBackup(req: RequestContext, userId: string): boolean {
    return this.isVerifiedOwner(req.auth, userId);
  }

  canGetOrListChunk(req: RequestContext, userId: string): boolean {
    return this.isVerifiedOwner(req.auth, userId);
  }

  canWriteChunk(req: RequestContext, userId: string, data: Record<string, unknown>): boolean {
    if (!this.isVerifiedOwner(req.auth, userId)) return false;
    return this.isValidChunk(data);
  }

  canDeleteChunk(req: RequestContext, userId: string): boolean {
    return this.isVerifiedOwner(req.auth, userId);
  }
}

const evaluator = new FirestoreRulesEvaluator();

const verifiedSaif: AuthContext = { uid: 'saif-123', token: { email_verified: true } };
const unverifiedSaif: AuthContext = { uid: 'saif-123', token: { email_verified: false } };
const attackerBob: AuthContext = { uid: 'attacker-bob', token: { email_verified: true } };

// Test 1: Unauthenticated requests
assertStrictEqual(evaluator.canGetBackup({ auth: null }, 'saif-123'), false);
assertStrictEqual(evaluator.canWriteBackup({ auth: null }, 'saif-123', {}), false);
assertStrictEqual(evaluator.canDeleteBackup({ auth: null }, 'saif-123'), false);
console.log('✓ Scenario 1: Unauthenticated operations are strictly denied.');

// Test 2: Attacker cannot access or tamper with another user's backup
assertStrictEqual(evaluator.canGetBackup({ auth: attackerBob }, 'saif-123'), false);
assertStrictEqual(evaluator.canWriteBackup({ auth: attackerBob }, 'saif-123', {}), false);
assertStrictEqual(evaluator.canDeleteBackup({ auth: attackerBob }, 'saif-123'), false);
console.log('✓ Scenario 2: Cross-user backup access is strictly denied.');

// Test 3: Unverified email cannot read, write, or delete backups
assertStrictEqual(evaluator.canGetBackup({ auth: unverifiedSaif }, 'saif-123'), false);
assertStrictEqual(evaluator.canWriteBackup({ auth: unverifiedSaif }, 'saif-123', {}), false);
console.log('✓ Scenario 3: Unverified email access is locked out.');

// Test 4: Root list enumeration is permanently disabled
assertStrictEqual(evaluator.canListBackups(), false);
console.log('✓ Scenario 4: Global collection enumeration is denied.');

// Test 5: Valid single-doc backup by verified owner
const validSingleBackup = {
  version: '4.0',
  exportedAt: '2026-10-15T12:00:00.000Z',
  isChunked: false,
  backup: { version: '4.0', profile: {}, dailyLogs: {} },
  updatedAt: 'timestamp',
};
assertStrictEqual(evaluator.canWriteBackup({ auth: verifiedSaif }, 'saif-123', validSingleBackup), true);
console.log('✓ Scenario 5: Verified owner can write valid single-doc backup.');

// Test 6: Single-doc backup with injected malicious fields is blocked
const taintedSingleBackup = {
  ...validSingleBackup,
  adminRole: true,
};
assertStrictEqual(evaluator.canWriteBackup({ auth: verifiedSaif }, 'saif-123', taintedSingleBackup), false);
console.log('✓ Scenario 6: Backup documents with unauthorized extra keys are rejected.');

// Test 7: Valid chunked manifest by verified owner
const validManifest = {
  version: '4.0',
  exportedAt: '2026-10-15T12:00:00.000Z',
  isChunked: true,
  chunkCount: 4,
  totalBytes: 1_250_000,
  updatedAt: 'timestamp',
};
assertStrictEqual(evaluator.canWriteBackup({ auth: verifiedSaif }, 'saif-123', validManifest), true);
console.log('✓ Scenario 7: Verified owner can write valid chunked manifest.');

// Test 8: Invalid chunked manifest (chunkCount <= 0 or non-integer) is blocked
const invalidManifest = {
  ...validManifest,
  chunkCount: 0,
};
assertStrictEqual(evaluator.canWriteBackup({ auth: verifiedSaif }, 'saif-123', invalidManifest), false);
console.log('✓ Scenario 8: Malformed chunk count manifest is rejected.');

// Test 9: Subcollection /chunks/{chunkId} by verified owner
const validChunkData = {
  index: 0,
  totalChunks: 4,
  chunk: '{"version":"4.0",...sample...}',
  updatedAt: 'timestamp',
};
assertStrictEqual(evaluator.canWriteChunk({ auth: verifiedSaif }, 'saif-123', validChunkData), true);
assertStrictEqual(evaluator.canGetOrListChunk({ auth: verifiedSaif }, 'saif-123'), true);
assertStrictEqual(evaluator.canDeleteChunk({ auth: verifiedSaif }, 'saif-123'), true);
console.log('✓ Scenario 9: Verified owner can read, write, and delete chunk subcollection docs.');

// Test 10: Subcollection /chunks/{chunkId} unauthorized or invalid
assertStrictEqual(evaluator.canWriteChunk({ auth: attackerBob }, 'saif-123', validChunkData), false);
assertStrictEqual(evaluator.canGetOrListChunk({ auth: attackerBob }, 'saif-123'), false);

// Invalid chunk payload (negative index or non-string chunk)
const invalidChunk = {
  index: -1,
  totalChunks: 4,
  chunk: 'sample',
  updatedAt: 'timestamp',
};
assertStrictEqual(evaluator.canWriteChunk({ auth: verifiedSaif }, 'saif-123', invalidChunk), false);
console.log('✓ Scenario 10: Attacker and invalid chunk schemas are strictly rejected.');

console.log('All 10 Firestore Security Rules Scenarios Evaluated and Passed Successfully!');
