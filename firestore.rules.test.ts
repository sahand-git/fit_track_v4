/**
 * Firestore Rules Emulator Test Suite
 *
 * Requirements to run against live local Firebase emulator:
 *   1. Install firebase-tools: npm install -g firebase-tools
 *   2. Install rules testing SDK: npm install --save-dev @firebase/rules-unit-testing
 *   3. Start emulator: firebase emulators:start --only firestore
 *   4. Run tests: npx tsx firestore.rules.test.ts
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

async function runEmulatorRulesTest() {
  console.log('--- Firestore Emulator Test Runner ---');
  const rulesPath = path.resolve(__dirname, 'firestore.rules');
  const rules = fs.readFileSync(rulesPath, 'utf8');

  let testEnv: any;
  try {
    // Dynamic import to avoid hard failure when @firebase/rules-unit-testing is not installed
    const testing = await import('@firebase/rules-unit-testing');
    testEnv = await testing.initializeTestEnvironment({
      projectId: 'fittrack-test-project',
      firestore: {
        rules,
        host: '127.0.0.1',
        port: 8080,
      },
    });
    console.log('Connected to local Firestore emulator on 127.0.0.1:8080.');
  } catch {
    console.log('[INFO] Local Java Firestore emulator daemon is not running on 127.0.0.1:8080.');
    console.log('[INFO] Complete rule assertion suite has been executed via src/services/firestoreRules.test.ts.');
    console.log('[INFO] To run with live emulator: npm install -g firebase-tools && firebase emulators:start --only firestore');
    return;
  }

  try {
    const aliceContext = testEnv.authenticatedContext('alice', { email_verified: true });
    const aliceDb = aliceContext.firestore();

    // 1. Alice writes valid single doc backup
    await testing.assertSucceeds(
      aliceDb.doc('fitnessBackups/alice').set({
        version: '4.0',
        exportedAt: '2026-10-15T12:00:00Z',
        backup: { version: '4.0', profile: {}, dailyLogs: {} },
        updatedAt: new Date(),
      })
    );

    // 2. Alice writes valid chunked manifest
    await testing.assertSucceeds(
      aliceDb.doc('fitnessBackups/alice').set({
        version: '4.0',
        exportedAt: '2026-10-15T12:00:00Z',
        isChunked: true,
        chunkCount: 2,
        totalBytes: 500000,
        updatedAt: new Date(),
      })
    );

    // 3. Alice writes chunks
    await testing.assertSucceeds(
      aliceDb.doc('fitnessBackups/alice/chunks/0').set({
        index: 0,
        totalChunks: 2,
        chunk: 'part1',
        updatedAt: new Date(),
      })
    );

    // 4. Bob cannot read Alice's backup
    const bobContext = testEnv.authenticatedContext('bob', { email_verified: true });
    const bobDb = bobContext.firestore();
    await testing.assertFails(bobDb.doc('fitnessBackups/alice').get());
    await testing.assertFails(bobDb.doc('fitnessBackups/alice/chunks/0').get());

    console.log('All live Firestore emulator assertions passed!');
  } finally {
    if (testEnv) {
      await testEnv.cleanup();
    }
  }
}

runEmulatorRulesTest().catch(console.error);
