# Core Activity and Accounts Restoration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore useful step tracking, a dedicated workout history, Firebase accounts, and per-user cloud backup in FitTrack v4 without breaking offline use or existing local data.

**Architecture:** Keep the existing four-tab state navigation and AsyncStorage-first model. Add testable activity calculations and date-scoped storage operations, a step tracker and workout history reachable from existing screens, and an auth/backup service boundary that keeps guest records separate from authenticated account records. Use Firebase Authentication and Firestore only after the current Expo SDK 57 documentation and package compatibility are verified. Keep explicit backup/restore user-initiated.

**Tech Stack:** Expo SDK 57, React Native 0.86, TypeScript, AsyncStorage, existing i18n/theme/components, Expo-compatible health APIs, Firebase JS SDK or another documented Expo-compatible Firebase path, and existing lightweight test conventions.

**Spec:** `docs/superpowers/specs/2026-10-13-restore-core-activity-and-accounts-design.md`

## Global Constraints

- Preserve state navigation and exactly four bottom tabs: Today, Meals, Coach, Progress.
- Preserve existing AsyncStorage keys, daily logs, supplements, and JSON backup compatibility.
- Do not port Capacitor or web-only code from the previous app.
- Do not add or expose Firebase Admin keys, service-account credentials, Gemini keys, or private backend secrets in the client.
- Keep guest/offline use. Never silently merge, overwrite, or expose local/account data during auth transitions.
- Firebase cloud operations are explicit backup/restore; do not implement always-on cloud sync in this scope.
- Activity and calorie outputs are estimates. Prevent workout/step/activity-multiplier double-counting.
- Localize every new visible and accessibility string in English, Arabic, and Sorani Kurdish; verify RTL and narrow screens.
- Before using Expo/native APIs, check Expo SDK 57 docs and `https://docs.expo.dev/llms.txt`. Use `npx expo install` for Expo-compatible dependencies.
- Run targeted checks after each task, then `npx tsc --noEmit`, `npx expo lint`, the full test suite, and `npx expo-doctor` before declaring completion.

## Review Focus

- Existing logs and profiles missing new optional fields must load without losing meals, steps, supplements, or workouts.
- Health provider sync repeated for the same date must replace/safely reconcile readings instead of adding the total again; denied permissions or empty reads must retain the saved count.
- Activity level, logged workouts, and steps must not inflate the food budget twice; fixed and adaptive models must remain distinguishable.
- Guest records must survive sign-in/sign-out, while account switching must never display or upload another account's records.
- Missing Firebase configuration, offline state, or unavailable native health support must show a clear state and must not prevent guest use or corrupt local data.

---

### Task 1: Confirm Expo/native integrations and establish test harness

**Files:**
- Read: `package.json`, `app.json`, `AGENTS.md`, `src/types.ts`, `src/storage/storage.ts`
- Modify: `package.json` to add local `tsx` test execution and later verified SDK-compatible libraries
- Modify: `app.json` only for documented permission/config-plugin requirements
- Create: `docs/native-health-setup.md`
- Test: dependency compatibility via Expo Doctor

**Interfaces:**
- Record exact Expo SDK 57 versioned docs and API paths for `expo-sensors` pedometer, Health Connect, HealthKit, Firebase Auth/Firestore, and Google sign-in.
- Select the least complex compatible implementation that provides real selected-date history. The documented `expo-sensors` Pedometer supports live counts, but Android updates stop in the background; do not claim background/history support based on it alone.
- Use explicit platform capability results in the eventual health service, not assumptions based only on OS name.

- [ ] **Step 1: Read official docs before selecting packages.** Check `https://docs.expo.dev/versions/v57.0.0/`, `https://docs.expo.dev/llms.txt`, Expo Pedometer, Firebase, and Google-auth guides. Confirm what works in Expo Go versus a development build.
- [ ] **Step 2: Record chosen libraries, versions, config changes, limitations, and required device build in `docs/native-health-setup.md`.** Do not install an unverified health package.
- [ ] **Step 3: Add the local test runner** with `npm install --save-dev tsx`; add an `npm test` script that runs the existing self-executing utility tests through the local dependency. Append each new test file to this script in its owning task so no test uses a network-downloaded runner.
- [ ] **Step 4: Install only selected Expo/native dependencies** using `npx expo install` where supported. Keep Firebase and auth choices compatible with the documented Expo Go/dev-build constraints.
- [ ] **Step 5: Run the baseline suite, Expo Doctor, and TypeScript before feature work.**

Run: `npm test; npx expo-doctor; npx tsc --noEmit`
Expected: no new dependency/config errors; record any pre-existing findings verbatim.

- [ ] **Step 6: Commit** as `chore: verify native health and firebase integrations`.

---

### Task 2: Add activity calculations and backward-compatible workout storage

**Files:**
- Modify: `src/types.ts`
- Modify: `src/utils/calculator.ts`
- Create: `src/utils/activity.ts`
- Create: `src/utils/activity.test.ts`
- Modify: `src/storage/storage.ts`
- Test: `src/storage/storage.test.ts` using the repository's established mock/assertion pattern

**Interfaces:**
- `WorkoutEntry` contains stable ID, name, category, duration, calorie value and source, optional note, and optional strength sets.
- `calculateActivityBudget(profile, workouts, steps)` returns a typed breakdown with base target, gross/net workout estimates, gross/net step estimates, steps attributed to workouts, eligible active calories, effective target, and selected model.
- `addWorkoutToDay(date, entry)`, `updateWorkoutInDay(date, entry)`, and `removeWorkoutFromDay(date, id)` return the updated `DailyLog` and preserve all unrelated date fields.
- Optional new profile settings default to the current safe v4 behavior when absent.

- [ ] **Step 1: Add failing pure-function tests** for zero/negative input clamping, step estimates, non-ambulatory workout exclusion, workout step deduplication, fixed versus adaptive budgets, and activity multiplier no-double-counting.
- [ ] **Step 2: Run tests to confirm failure.**

Run: `npx tsx src/utils/activity.test.ts`
Expected: fail because the new calculation exports are absent.

- [ ] **Step 3: Implement calculation helpers** with explicit gross/net labels and documented estimates. Keep calculation functions independent of React Native and storage.
- [ ] **Step 4: Add workout types and date-scoped storage functions.** Ensure daily log defaults include `workouts: []` and existing JSON without `workouts` still loads. Keep current storage key format.
- [ ] **Step 5: Add workout data-transform tests** for add/update/remove preserving meals, water, steps, supplements, selected date, and legacy records; add the test file to `npm test`.
- [ ] **Step 6: Run utility tests and typecheck.**

Run: `npm test; npx tsc --noEmit`
Expected: all activity assertions pass and the app typechecks.

- [ ] **Step 7: Commit** as `feat: add safe activity budget calculations and workout storage`.

---

### Task 3: Add date-scoped step tracking and health-provider service

**Files:**
- Create: `src/services/stepTrackingService.ts`
- Create: `src/screens/StepsScreen.tsx`
- Modify: `App.tsx`
- Modify: `src/screens/DashboardScreen.tsx`
- Modify: `src/types.ts` only if a platform/source field is needed to make replacement semantics explicit
- Modify: `src/i18n/strings.ts`
- Test: `src/services/stepTrackingService.test.ts` with mocked provider results

**Interfaces:**
- `readStepsForDate(date): Promise<{ steps: number; source: 'health'; } | null>` returns `null` when unavailable/no data and does not mutate storage.
- `saveManualSteps(date, value, mode: 'set' | 'add')` rejects invalid/future dates and updates only that date.
- `StepsScreen` receives selected date, daily count, goal, profile weight, provider availability, and callbacks; it does not directly access AsyncStorage.
- Today opens Steps as an internal screen/sheet; dock remains visible and highlights Today.

- [ ] **Step 1: Write service tests** for permission denied, unsupported platform, no data, valid health reading, repeated sync, manual set/add, past/current/future date, and preservation of a previous value after failed sync.
- [ ] **Step 2: Implement adapter(s) selected in Task 1.** Do not add accelerometer-based fake step detection. If only foreground pedometer is supported on a platform, label that limitation and retain manual totals.
- [ ] **Step 3: Build the Steps UI** with goal editor, progress, estimated calories/distance/active minutes, manual set/add, health connect/sync, clear errors, and no-data state.
- [ ] **Step 4: Wire selected-date navigation and update Today's step card/link.** Keep all writes guarded by date and provider result; prevent repeated sync from adding totals.
- [ ] **Step 5: Add English/Arabic/Sorani translations and RTL-aware layout.** Test long translations and numeric layout.
- [ ] **Step 6: Run service tests and typecheck; inspect web preview for graceful unsupported-provider behavior.** Record native behavior for later device testing.
- [ ] **Step 7: Commit** as `feat: restore date-aware step tracking`.

---

### Task 4: Add dedicated workout history and editing

**Files:**
- Create: `src/screens/WorkoutsScreen.tsx`
- Create: `src/components/WorkoutEditorSheet.tsx` (or adapt existing `AddWorkoutSheet` after inspection)
- Modify: `App.tsx`
- Modify: `src/screens/DashboardScreen.tsx`
- Modify: `src/i18n/strings.ts`
- Test: `src/utils/workout.test.ts`

**Interfaces:**
- Internal screen route is `'workouts'`; bottom tabs remain exactly Today, Meals, Coach, Progress.
- `WorkoutsScreen` receives selected date, workout entries, profile, and add/update/remove/date-navigation callbacks.
- Workout CRUD uses Task 2 storage functions and the selected date.

- [ ] **Step 1: Inspect the current `AddWorkoutSheet` and write failing screen-data tests** for presets, custom names, strength sets, estimate source, edit identity, deletion, and future date lock.
- [ ] **Step 2: Build searchable category/preset selection** for strength, cardio, HIIT, sports, and flexibility, plus custom title and duration.
- [ ] **Step 3: Add strength set rows** with weight, reps, completion state, add/remove controls, and validated numeric input.
- [ ] **Step 4: Add dedicated date history** with summaries and edit/delete paths; destructive delete requires confirmation or undo. Preserve current Today quick-log access.
- [ ] **Step 5: Connect the selected calorie model.** Mark MET/user-entered sources and display estimates; do not add calories twice or treat estimates as measured.
- [ ] **Step 6: Localize and verify English/Arabic/Sorani, RTL, safe-area spacing, narrow-screen and empty states.**
- [ ] **Step 7: Run workout/activity tests and typecheck; commit** as `feat: add workout history and strength sets`.

---

### Task 5: Introduce Firebase configuration and guest-safe authentication

**Files:**
- Create: `src/services/firebaseApp.ts`
- Create: `src/services/authService.ts`
- Create: `src/screens/AuthScreen.tsx`
- Create: `.env.example`
- Modify: `.gitignore`
- Modify: `App.tsx`
- Modify: `src/storage/storage.ts` and create `src/storage/accountStorage.ts` only after specifying namespacing and migration rules
- Modify: `src/types.ts`
- Modify: `src/i18n/strings.ts`
- Test: `src/services/authService.test.ts`, `src/storage/accountStorage.test.ts`

**Interfaces:**
- `AuthState` is `guest | signedOut | signedIn` with a typed user identity.
- Auth methods expose email registration, email/password sign-in, verification resend, password reset, Google sign-in, and sign-out with typed error categories.
- Local storage identifies guest and signed-in namespaces explicitly. Existing v4 keys remain readable as guest data until a deliberate, tested migration is defined.
- Missing Firebase config is a supported `not_configured` state; app starts in guest mode.

- [ ] **Step 1: Add failing tests** for guest startup with no config, signed-in/out state transitions, email validation/error mapping, guest data preservation, namespace isolation, and account switching without data leakage.
- [ ] **Step 2: Confirm current official Firebase/Expo docs and select supported Firebase SDK/auth persistence and Google sign-in path.** Require development build if docs say native code is needed. Do not use a fabricated client ID or owner config.
- [ ] **Step 3: Implement Firebase initialization from public app config placeholders** and graceful unconfigured behavior. Do not include privileged secrets.
- [ ] **Step 4: Implement email account flows** with verification gate and password reset; add accessible localized form states.
- [ ] **Step 5: Implement Google identity sign-in** through the selected supported flow. Verify auth result belongs to Firebase Authentication; request no Gmail scopes and do not touch Gemini credentials.
- [ ] **Step 6: Implement guest/account local data boundaries.** Never copy guest records silently; provide explicit reviewed migration/import action only if needed. Ensure sign-out does not erase guest or account records.
- [ ] **Step 7: Add English/Arabic/Sorani translations and run auth/storage tests plus typecheck.** Document required Firebase Console values in `docs/firebase-setup.md`.
- [ ] **Step 8: Commit** as `feat: add guest-safe firebase authentication`.

---

### Task 6: Add secure Firestore backup/restore and account deletion

**Files:**
- Create: `src/services/cloudBackupService.ts`
- Create: `src/utils/backupValidation.ts`
- Create: `src/utils/backupValidation.test.ts`
- Create: `firestore.rules`
- Create: `docs/firebase-setup.md`
- Modify: `src/screens/ProfileScreen.tsx`
- Modify: `src/storage/storage.ts`
- Modify: `src/i18n/strings.ts`
- Modify: `src/types.ts` for typed backup status only when required

**Interfaces:**
- `validateBackup(value: unknown)` returns a validated, versioned `FitTrackBackup` or structured validation errors before local mutation.
- `createCloudBackup(userId)` writes one document under that user's own backup path after authentication/verification checks.
- `restoreCloudBackup(userId)` downloads, validates, stages, and applies the user's backup; failed writes leave local state intact.
- `deleteAccountAndBackup()` requires recent authentication where Firebase requires it, deletes that user's cloud backup and Firebase account, and clearly reports partial failure.

- [ ] **Step 1: Add validation tests** for malformed JSON shapes, invalid dates/IDs/numbers, size limits, old backup versions, and secrets/tokens accidentally present in exported data.
- [ ] **Step 2: Implement backup normalization and staging** using current backup types/keys; preserve existing import/export compatibility and rollback on restore failure.
- [ ] **Step 3: Add Firestore user-owned backup service** with explicit user actions, loading/error/success states, and conflict choice. Do not implement background continuous sync.
- [ ] **Step 4: Add Firestore security rules** restricting each document to its authenticated owner and requiring verified email where applicable. Add emulator rules tests if Firebase tooling is available; otherwise document the exact manual verification needed.
- [ ] **Step 5: Add Profile backup/restore/delete UI** with confirmation, explanation, and localized success/failure copy. Ensure Gemini/API credentials are excluded.
- [ ] **Step 6: Run backup/auth tests and typecheck.** Record that live cloud access cannot be verified until owner config and credentials are set.
- [ ] **Step 7: Commit** as `feat: add per-user firestore backup and restore`.

---

### Task 7: Localization, release checks, and integration review

**Files:**
- Modify: `src/i18n/strings.ts`
- Modify: `README.md`
- Modify: `docs/native-health-setup.md`
- Modify: `docs/firebase-setup.md`
- Modify: `package.json` for deterministic test/lint scripts if needed
- Test: all existing and new tests

- [ ] **Step 1: Search all changed UI for untranslated literals and add a localization coverage test** for English, Arabic, and Sorani keys.
- [ ] **Step 2: Test RTL direction, readable numbers, accessibility labels, and safe-area/floating-dock interaction** on every changed screen.
- [ ] **Step 3: Run all tests, TypeScript, lint, Expo Doctor, and Expo export.** Save exact outputs and fix issues introduced by this work; clearly identify pre-existing failures.
- [ ] **Step 4: Run the app in web preview** for guest/offline, steps unsupported/manual, workouts, auth-not-configured, and backup unavailable states.
- [ ] **Step 5: Prepare a physical-device checklist** for Health Connect, HealthKit, native Google account selection, email verification delivery, and Firestore rules. Do not claim these passed without testing them.
- [ ] **Step 6: Update README** with guest, native-build, Firebase setup, privacy, and backup boundaries.
- [ ] **Step 7: Commit** as `docs: document activity and account setup`.

## Integration and GitHub delivery

- [ ] Review the complete branch diff and ensure it contains only this spec's implementation plus the related design/plan documents.
- [ ] Fetch and inspect the latest `origin/main`; rebase the isolated feature branch onto it, preserving its commits and resolving any conflicts without discarding unrelated main-branch work.
- [ ] Run final verification on the rebased result, confirm the remote `main` has not advanced unexpectedly, then push the completed, verified changes to `origin/main` as previously authorized by the user.
- [ ] Report the resulting main-branch commit, checks, and any owner/device configuration that remains.

## Plan Self-Review

- Spec coverage: Tasks 2–3 cover date-scoped steps and calorie models; Task 4 covers the dedicated workout experience; Tasks 5–6 cover guest-safe Firebase auth and per-user manual backup/restore; Task 7 covers translations and release checks.
- No third-party health or auth package is selected from memory; Task 1 verifies official Expo SDK 57 compatibility first.
- Legacy log defaults, repeated health sync, double-counting, account isolation, Firebase-unconfigured mode, offline behavior, and safe restore all have explicit tests/review points.
- No subagents are planned; implementation will be done in this session on the existing isolated feature branch.
