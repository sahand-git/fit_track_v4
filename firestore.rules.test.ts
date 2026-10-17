/**
 * Real Firestore Security Rules Test Suite
 *
 * Runs against the REAL `firestore.rules` file using `@firebase/rules-unit-testing`.
 * This validates security rules in the actual Firebase Firestore Emulator environment.
 *
 * To run:
 *   1. Start the emulator in another terminal:
 *        npx firebase-tools emulators:start --only firestore
 *   2. Run this suite:
 *        npm run test:rules
 *
 * Or run self-contained in one command:
 *   npx firebase-tools emulators:exec --only firestore "npm run test:rules"
 */

import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import * as fs from 'fs';
import * as path from 'path';

const PROJECT_ID = process.env.GCLOUD_PROJECT || 'fittrack-rules-test';

async function runRulesTestSuite() {
  console.log('====================================================');
  console.log('Starting Real Firestore Security Rules Emulator Tests');
  console.log('====================================================');

  const rulesPath = path.resolve(__dirname, 'firestore.rules');
  if (!fs.existsSync(rulesPath)) {
    throw new Error(`firestore.rules not found at: ${rulesPath}`);
  }
  const rules = fs.readFileSync(rulesPath, 'utf8');

  // Emulator host configuration (defaults to 127.0.0.1:8080 if FIRESTORE_EMULATOR_HOST not set)
  const hostAndPort = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
  const [host, portStr] = hostAndPort.split(':');
  const port = parseInt(portStr || '8080', 10);

  let testEnv: RulesTestEnvironment;
  try {
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules,
        host,
        port,
      },
    });
  } catch (err: any) {
    console.error('\n[ERROR] Failed to connect to Firebase Firestore emulator:');
    console.error(`  Host: ${host}:${port}`);
    console.error(`  Details: ${err?.message || err}`);
    console.error('\nTo run this test suite, the Firebase emulator must be running:');
    console.error('  npx firebase-tools emulators:start --only firestore');
    console.error('Or run via exec wrapper:');
    console.error('  npx firebase-tools emulators:exec --only firestore "npm run test:rules"\n');
    process.exit(1);
  }

  try {
    // Clear data before running
    await testEnv.clearFirestore();

    const aliceAuth = testEnv.authenticatedContext('alice', { email_verified: true });
    const aliceDb = aliceAuth.firestore();

    const unverifiedAlice = testEnv.authenticatedContext('alice', { email_verified: false });
    const unverifiedDb = unverifiedAlice.firestore();

    const bobAuth = testEnv.authenticatedContext('bob', { email_verified: true });
    const bobDb = bobAuth.firestore();

    const unauth = testEnv.unauthenticatedContext();
    const unauthDb = unauth.firestore();

    // ----------------------------------------------------
    // 1. Unauthenticated & Unverified Denials
    // ----------------------------------------------------
    console.log('Test 1: Unauthenticated operations are strictly denied...');
    await assertFails(unauthDb.doc('fitnessBackups/alice').get());
    await assertFails(
      unauthDb.doc('fitnessBackups/alice').set({
        version: '4.0',
        exportedAt: '2026-10-15T12:00:00Z',
        backup: { version: '4.0' },
        updatedAt: new Date(),
      })
    );
    await assertFails(unauthDb.doc('fitnessBackups/alice/chunks/0').get());
    console.log('✓ Test 1 passed: Unauthenticated access denied.');

    console.log('Test 2: Unverified email accounts are locked out...');
    await assertFails(unverifiedDb.doc('fitnessBackups/alice').get());
    await assertFails(
      unverifiedDb.doc('fitnessBackups/alice').set({
        version: '4.0',
        exportedAt: '2026-10-15T12:00:00Z',
        backup: { version: '4.0' },
        updatedAt: new Date(),
      })
    );
    console.log('✓ Test 2 passed: Unverified email locked out.');

    // ----------------------------------------------------
    // 2. Cross-User Access Denials (Non-Owner)
    // ----------------------------------------------------
    console.log('Test 3: Non-owner access is strictly denied...');
    await assertFails(bobDb.doc('fitnessBackups/alice').get());
    await assertFails(
      bobDb.doc('fitnessBackups/alice').set({
        version: '4.0',
        exportedAt: '2026-10-15T12:00:00Z',
        backup: { version: '4.0' },
        updatedAt: new Date(),
      })
    );
    await assertFails(bobDb.doc('fitnessBackups/alice/chunks/0').get());
    await assertFails(
      bobDb.doc('fitnessBackups/alice/chunks/0').set({
        index: 0,
        totalChunks: 1,
        chunk: 'fake',
        updatedAt: new Date(),
      })
    );
    await assertFails(bobDb.doc('fitnessBackups/alice').delete());
    console.log('✓ Test 3 passed: Cross-user access rejected.');

    // ----------------------------------------------------
    // 3. Collection Enumeration Denied
    // ----------------------------------------------------
    console.log('Test 4: Global collection enumeration is denied...');
    await assertFails(aliceDb.collection('fitnessBackups').get());
    await assertFails(bobDb.collection('fitnessBackups').get());
    console.log('✓ Test 4 passed: Collection listing denied.');

    // ----------------------------------------------------
    // 4. Verified Owner Single-Doc Backup
    // ----------------------------------------------------
    console.log('Test 5: Verified owner can write and read valid single-doc backup...');
    const validSingleDoc = {
      version: '4.0',
      exportedAt: '2026-10-15T12:00:00Z',
      backup: { version: '4.0', profile: {}, dailyLogs: {} },
      updatedAt: new Date(),
      isChunked: false,
    };
    await assertSucceeds(aliceDb.doc('fitnessBackups/alice').set(validSingleDoc));
    await assertSucceeds(aliceDb.doc('fitnessBackups/alice').get());
    console.log('✓ Test 5 passed: Single-doc backup read/write succeeded.');

    // ----------------------------------------------------
    // 5. Malformed Single-Doc Backups
    // ----------------------------------------------------
    console.log('Test 6: Malformed single-doc backups are rejected...');
    // Extra root key
    await assertFails(
      aliceDb.doc('fitnessBackups/alice').set({
        ...validSingleDoc,
        unauthorizedField: 'malicious_payload',
      })
    );
    // Outdated or wrong version
    await assertFails(
      aliceDb.doc('fitnessBackups/alice').set({
        ...validSingleDoc,
        version: '3.0',
      })
    );
    // Non-map backup
    await assertFails(
      aliceDb.doc('fitnessBackups/alice').set({
        ...validSingleDoc,
        backup: 'not_a_map',
      })
    );
    // backup.version mismatch
    await assertFails(
      aliceDb.doc('fitnessBackups/alice').set({
        ...validSingleDoc,
        backup: { version: '1.0' },
      })
    );
    console.log('✓ Test 6 passed: Malformed single-doc variations rejected.');

    // ----------------------------------------------------
    // 6. Verified Owner Chunked Manifest & Subcollection
    // ----------------------------------------------------
    console.log('Test 7: Verified owner can write valid chunked manifest...');
    const validManifest = {
      version: '4.0',
      exportedAt: '2026-10-15T12:00:00Z',
      isChunked: true,
      chunkCount: 2,
      totalBytes: 1500000,
      updatedAt: new Date(),
    };
    await assertSucceeds(aliceDb.doc('fitnessBackups/alice').set(validManifest));
    console.log('✓ Test 7 passed: Valid chunked manifest succeeded.');

    console.log('Test 8: Chunked subcollection read/write/list/delete...');
    const chunk0 = {
      index: 0,
      totalChunks: 2,
      chunk: 'abcdef1234567890',
      updatedAt: new Date(),
    };
    const chunk1 = {
      index: 1,
      totalChunks: 2,
      chunk: '0987654321fedcba',
      updatedAt: new Date(),
    };
    await assertSucceeds(aliceDb.doc('fitnessBackups/alice/chunks/0').set(chunk0));
    await assertSucceeds(aliceDb.doc('fitnessBackups/alice/chunks/1').set(chunk1));
    await assertSucceeds(aliceDb.collection('fitnessBackups/alice/chunks').get());
    await assertSucceeds(aliceDb.doc('fitnessBackups/alice/chunks/0').get());
    await assertSucceeds(aliceDb.doc('fitnessBackups/alice/chunks/0').delete());
    console.log('✓ Test 8 passed: Chunk subcollection operations succeeded.');

    // ----------------------------------------------------
    // 7. Malformed Chunks & Manifests
    // ----------------------------------------------------
    console.log('Test 9: Malformed chunk documents are rejected...');
    // Negative chunk index
    await assertFails(
      aliceDb.doc('fitnessBackups/alice/chunks/bad_idx').set({
        index: -1,
        totalChunks: 2,
        chunk: 'data',
        updatedAt: new Date(),
      })
    );
    // Non-string chunk data
    await assertFails(
      aliceDb.doc('fitnessBackups/alice/chunks/bad_data').set({
        index: 0,
        totalChunks: 2,
        chunk: 12345,
        updatedAt: new Date(),
      })
    );
    // Extra unauthorized field in chunk
    await assertFails(
      aliceDb.doc('fitnessBackups/alice/chunks/bad_extra').set({
        index: 0,
        totalChunks: 2,
        chunk: 'data',
        updatedAt: new Date(),
        hackerField: true,
      })
    );
    // Zero or negative totalChunks in manifest
    await assertFails(
      aliceDb.doc('fitnessBackups/alice').set({
        ...validManifest,
        chunkCount: 0,
      })
    );
    // Zero or negative totalBytes in manifest
    await assertFails(
      aliceDb.doc('fitnessBackups/alice').set({
        ...validManifest,
        totalBytes: -50,
      })
    );
    console.log('✓ Test 9 passed: Malformed chunk schemas rejected.');

    // ----------------------------------------------------
    // 8. Delete operations
    // ----------------------------------------------------
    console.log('Test 10: Verified owner can delete account backup...');
    await assertSucceeds(aliceDb.doc('fitnessBackups/alice').delete());
    console.log('✓ Test 10 passed: Verified owner delete succeeded.');

    // ----------------------------------------------------
    // 9. Food Requests Collection (Item 5)
    // ----------------------------------------------------
    console.log('Test 11: Verified user can create their own food request...');
    const validRequest = {
      userId: 'alice',
      foodName: 'Iraqi Kleicha (كليجة عراقية)',
      brand: 'Homemade Baghdad Tradition',
      notes: 'Date and walnut spiced pastry, request standard serving size',
      barcode: '123456789012',
      createdAt: new Date().toISOString(),
      status: 'pending',
    };
    await assertSucceeds(aliceDb.doc('foodRequests/req_alice_1').set(validRequest));
    console.log('✓ Test 11 passed: Verified user food request creation succeeded.');

    console.log('Test 12: Unauthenticated and unverified users cannot create food requests...');
    await assertFails(unauthDb.doc('foodRequests/req_unauth').set(validRequest));
    await assertFails(unverifiedDb.doc('foodRequests/req_unverified').set(validRequest));
    console.log('✓ Test 12 passed: Unauthenticated and unverified food requests blocked.');

    console.log('Test 13: User cannot create request under another user\'s ID...');
    await assertFails(
      aliceDb.doc('foodRequests/req_spoof').set({
        ...validRequest,
        userId: 'bob',
      })
    );
    console.log('✓ Test 13 passed: Cross-user spoofing blocked.');

    console.log('Test 14: Food requests exceeding size limits or malformed are rejected...');
    // Empty foodName
    await assertFails(
      aliceDb.doc('foodRequests/req_bad_name').set({
        ...validRequest,
        foodName: '',
      })
    );
    // Over 200 chars foodName
    await assertFails(
      aliceDb.doc('foodRequests/req_long_name').set({
        ...validRequest,
        foodName: 'A'.repeat(201),
      })
    );
    // Over 500 chars notes
    await assertFails(
      aliceDb.doc('foodRequests/req_long_notes').set({
        ...validRequest,
        notes: 'N'.repeat(501),
      })
    );
    // Disallowed extra field
    await assertFails(
      aliceDb.doc('foodRequests/req_extra_field').set({
        ...validRequest,
        maliciousPayload: true,
      })
    );
    console.log('✓ Test 14 passed: Schema and size limit violations rejected.');

    console.log('Test 15: Client updates, deletes, and listing are denied on foodRequests...');
    await assertFails(aliceDb.doc('foodRequests/req_alice_1').update({ notes: 'Updated notes' }));
    await assertFails(aliceDb.doc('foodRequests/req_alice_1').delete());
    await assertFails(aliceDb.collection('foodRequests').get());
    console.log('✓ Test 15 passed: Updates, deletes, and collection listing strictly denied.');

    console.log('Test 16: Owner can read their own request; non-owner is denied...');
    await assertSucceeds(aliceDb.doc('foodRequests/req_alice_1').get());
    await assertFails(bobDb.doc('foodRequests/req_alice_1').get());
    console.log('✓ Test 16 passed: Owner-only read access verified.');

    console.log('\n====================================================');
    console.log('ALL 16 REAL FIRESTORE SECURITY RULES TESTS PASSED!');
    console.log('====================================================\n');
  } finally {
    await testEnv.cleanup();
  }
}

runRulesTestSuite().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
