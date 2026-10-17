# Firebase Firestore Security Rules Testing Guide

This document describes how to execute security rules testing for `fit_track_v4` against the real `firestore.rules` file using the Firebase Local Emulator Suite and `@firebase/rules-unit-testing`.

---

## 1. Overview & Architecture

FitTrack enforces strict database security on Cloud Firestore to protect user backups:
- **Verified Ownership:** Only authenticated users with verified emails (`request.auth.token.email_verified == true`) can read, write, or delete their own documents under `fitnessBackups/{userId}` and its subcollections.
- **Subcollection Isolation:** Chunked backups stored in `fitnessBackups/{userId}/chunks/{chunkId}` inherit the same strict ownership checks.
- **Anti-Enumeration:** Global collection listings and queries on `fitnessBackups` are completely disallowed.
- **Strict Schema Validation:**
  - Single-document backups validate explicit fields (`version`, `exportedAt`, `backup`, `updatedAt`, `isChunked`) and disallow any undeclared root keys.
  - Chunked backups validate chunk manifests and strict chunk payloads (`index`, `totalChunks`, `chunk`, `updatedAt`).

The real rules test suite (`firestore.rules.test.ts`) tests these boundaries against a live Firebase Firestore Emulator.

---

## 2. Prerequisites

1. **Java Runtime Environment (JRE):** The Firebase Emulator requires Java 11 or higher installed on your machine (`java -version`).
2. **Firebase CLI:** Installed globally (`npm install -g firebase-tools`) or executed on demand via `npx firebase-tools`.

---

## 3. Running the Test Suite

### Option A: One-Shot Execution (Recommended for CI / Local Validation)

Run the emulator and the test suite together. The emulator starts, runs the test script, and shuts down automatically:

```bash
npx firebase-tools emulators:exec --only firestore "npm run test:rules"
```

### Option B: Interactive / Continuous Development

1. **Start the Firestore Emulator** in a dedicated terminal:
   ```bash
   npx firebase-tools emulators:start --only firestore
   ```
   By default, this binds the Firestore emulator to `127.0.0.1:8080`.

2. **Run the Rules Suite** in your main terminal:
   ```bash
   npm run test:rules
   ```

### Custom Host / Port Configuration

If your emulator runs on a custom host or port, set the `FIRESTORE_EMULATOR_HOST` environment variable:

```bash
# Windows PowerShell
$env:FIRESTORE_EMULATOR_HOST="127.0.0.1:8080"
npm run test:rules

# Unix / macOS
FIRESTORE_EMULATOR_HOST="127.0.0.1:8080" npm run test:rules
```

---

## 4. Test Coverage Summary

The test suite in `firestore.rules.test.ts` executes 10 comprehensive security scenarios:

| # | Scenario | Expected Result |
|---|---|---|
| **1** | Unauthenticated read / write / delete | ❌ Denied (`assertFails`) |
| **2** | Unverified email user (`email_verified: false`) attempting read / write | ❌ Denied (`assertFails`) |
| **3** | Cross-user (non-owner) read, write, or delete on single doc or chunks | ❌ Denied (`assertFails`) |
| **4** | Global collection listing / query on `/fitnessBackups` | ❌ Denied (`assertFails`) |
| **5** | Verified owner write and read valid single-document backup | ✅ Allowed (`assertSucceeds`) |
| **6** | Malformed single-doc (undeclared root keys, wrong version, invalid schema) | ❌ Denied (`assertFails`) |
| **7** | Verified owner writing valid chunked manifest | ✅ Allowed (`assertSucceeds`) |
| **8** | Verified owner writing, reading, listing, and deleting chunk subcollection items | ✅ Allowed (`assertSucceeds`) |
| **9** | Malformed chunks (negative index, non-string payload, invalid manifest limits) | ❌ Denied (`assertFails`) |
| **10** | Verified owner account and backup deletion | ✅ Allowed (`assertSucceeds`) |

---

## 5. Keeping Fast Unit Tests Independent

The default test runner:
```bash
npm test
```
runs purely in-memory unit tests (id utilities, layout, streak, backup compression, mock services, translations scanner, and copy-yesterday idempotency). It does **not** require Java, network access, or the Firebase Emulator to be running.
