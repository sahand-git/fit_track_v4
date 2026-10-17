/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore';

const projectId = 'demo-fittrack';
const ownerId = 'rules-test-owner';
const otherId = 'rules-test-other';
const backupPath = `fitnessBackups/${ownerId}`;

function backupDocument() {
  const now = new Date().toISOString();
  return {
    version: 1,
    exportedAt: now,
    updatedAt: now,
    backup: { version: '4.0' },
  };
}

async function run(): Promise<void> {
  const env: RulesTestEnvironment = await initializeTestEnvironment({
    projectId,
    firestore: {
      host: '127.0.0.1',
      port: 8080,
      rules: readFileSync('firestore.rules', 'utf8'),
    },
  });

  try {
    await env.clearFirestore();

    const owner = env.authenticatedContext(ownerId, { email_verified: true }).firestore();
    const unverifiedOwner = env.authenticatedContext(ownerId, { email_verified: false }).firestore();
    const otherUser = env.authenticatedContext(otherId, { email_verified: true }).firestore();
    const anonymous = env.unauthenticatedContext().firestore();
    const ownerDoc = doc(owner, backupPath);

    await assertSucceeds(setDoc(ownerDoc, backupDocument()));
    await assertSucceeds(getDoc(ownerDoc));
    await assertSucceeds(deleteDoc(ownerDoc));

    await assertFails(setDoc(doc(anonymous, backupPath), backupDocument()));
    await assertFails(getDoc(doc(anonymous, backupPath)));
    await assertFails(setDoc(doc(unverifiedOwner, backupPath), backupDocument()));
    await assertFails(getDoc(doc(otherUser, backupPath)));
    await assertFails(setDoc(doc(owner, backupPath), { ...backupDocument(), unexpected: true }));
    await assertFails(setDoc(doc(owner, backupPath), { ...backupDocument(), backup: { version: '5.0' } }));

    assert.ok(true, 'Firestore backup rules permit only a verified owner and valid backup documents');
    console.log('Firestore rules tests passed.');
  } finally {
    await env.cleanup();
  }
}

run().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
