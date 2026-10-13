# FitTrack Core Activity and Accounts Restoration

## Purpose

Restore the high-value step, workout, authentication, and cloud-backup capabilities from the previous FitTrack app in the current Expo / React Native app. Make activity tracking useful without double-counting calories, keep the app usable offline, and protect data when users sign in or switch accounts.

## User and success criteria

The target user wants to track meals, steps, workouts, and progress in one app; can continue without an account or network connection; can connect supported phone health services; can sign in with email or Google; and can manually back up and restore their own data on another device. English, Arabic, and Sorani Kurdish remain supported, including correct RTL behavior.

Success means:

- Users can view and update date-scoped steps, use manual entry when native health access is unavailable, and sync health totals without adding duplicates.
- A user can review, add, edit, and remove detailed workouts, including strength sets.
- Food calorie targets respond only to a clear user-selected expenditure model and do not count a workout or its steps twice.
- Guest records remain available offline. Signed-in users can access only their own account data and explicitly run a validated cloud backup or restore.
- Existing v4 local data and backup files remain readable.

## Current and previous app context

- Current app: Expo SDK 57, React Native 0.86, TypeScript, state-based navigation in `App.tsx`, four bottom tabs (Today, Meals, Coach, Progress), and local AsyncStorage persistence. `DailyLog.steps` exists, but the current app has no step-tracking screen or health-provider integration. Today can log a workout, but there is no dedicated workout history page. A profile option can add logged workout calories directly to its calorie target.
- Previous app: Capacitor-based. It included manual and health-provider step sync, step-derived estimates, workout logging with category/presets and strength sets, Firebase email/Google authentication, and per-user Firestore backup/restore. Its native/web implementation is not reusable as Expo code.
- The previous Firebase documentation describes user authentication and explicitly initiated cloud backup/restore. This project will not assume continuous synchronization of every record.

## Scope and decisions

### 1. Steps and expenditure

- Add an accessible step-tracking screen or sheet from Today without changing the four primary tabs.
- Show the selected date's total, configurable daily goal, progress, estimated distance, estimated active minutes, and estimated step calories. Label estimates clearly.
- Support setting/replacing a total and adding a manual amount. Future dates cannot be changed.
- Add platform health-history integration only after verifying Expo SDK 57 documentation and native-library compatibility. Android uses Health Connect where available; iOS uses Apple Health/HealthKit. Explain required permissions and development builds. Browser preview must not claim to provide native health data.
- Health sync replaces the total for the selected date and must be idempotent. If the provider returns no data or permission is denied, retain the stored total and allow manual tracking.
- Preserve a coherent choice between a fixed lifestyle target (activity is tracked but does not inflate the food target) and an adaptive target (sedentary baseline plus eligible activity). Defaults must not silently raise the user's food target.
- Where activity affects the budget, use net workout expenditure and avoid counting pedometer steps attributed to logged ambulatory workouts twice. Avoid adding workout burn again when the selected activity multiplier already accounts for workouts. Show the active model and budget breakdown.
- Keep calculations deterministic and unit-tested. Do not characterize activity calorie estimates as exact or medical advice.

### 2. Workout experience

- Add a dedicated workout history screen reachable from Today and/or Progress while preserving the current four-tab dock.
- Reuse the current `WorkoutEntry` data where possible and keep old saved entries readable.
- Provide search and category filters, activity presets, custom activity names, duration, and a clearly sourced MET-based calorie estimate with optional user override.
- Strength workouts support multiple sets with weight, reps, and completion state. Allow adding and removing sets.
- Provide date-aware history and summaries; support viewing, editing, and deleting with confirmation or undo. Future dates are read-only.
- Calorie-budget effects must use the expenditure decision above and never silently double-count activity.
- Make the page usable on narrow screens and in RTL.

### 3. Authentication and cloud backup

- Add guest/offline use, email/password registration and login, email verification, password reset, sign-out, and Google sign-in through Firebase Authentication.
- Google sign-in is identity authentication only. It does not access Gmail and does not authorize Gemini usage.
- Keep guest data intact and define an explicit, understandable policy when a user signs in, signs out, or switches account. Never expose one account's records to another account. Do not silently merge or overwrite data.
- Implement explicit per-user Firestore backup and restore, with loading/success/failure states, payload validation, conflict handling, ownership checks, and offline local operation. Firebase security rules must restrict access to the authenticated user's own backup and require verification for email/password accounts.
- Add account deletion and corresponding cloud backup deletion, with confirmation and clear consequences. Support local export/import without including Gemini credentials.
- Never place Firebase Admin credentials, service-account keys, or private server secrets in the mobile app. Keep Firebase identity and Gemini/server authorization separate. Use configuration placeholders and documentation; do not invent project IDs or OAuth secrets.
- Firebase Console setup, OAuth client IDs, platform fingerprints, and native provider verification remain environment-specific owner configuration unless credentials/configuration are provided securely through the repo's established mechanism.

## Data compatibility and migration

- Preserve existing v4 AsyncStorage keys and backup version compatibility unless an explicit, tested migration is required.
- Extend daily logs/profile with defaults that are safe for existing data. Missing new fields must not block app startup.
- Preserve existing workout records and step counts. Never delete or replace local guest records merely because authentication is introduced.
- Validate imported and restored payloads before applying them. Stage restore data so a failed restore cannot leave partially replaced local data.
- Never upload Gemini keys, API tokens, or other secrets as part of fitness backups.

## Localization, accessibility, and UX

- Translate every new visible string into English, Arabic, and Sorani Kurdish.
- Correctly mirror layout and directional icons/actions for Arabic and Sorani; do not mirror numeric values or non-directional symbols incorrectly.
- Provide accessible labels/roles, permission explanations, and clear empty, loading, error, and success states.
- Preserve the existing editorial light theme and compact four-tab navigation.

## Testing and verification

- Unit tests: step calorie estimates and goal progress; date scoping; repeated provider sync; workout CRUD and strength-set fields; fixed/adaptive budget behavior; workout/step double-counting; old backup/log parsing; backup payload validation and restore failure safety.
- Auth/data tests: guest preservation, account isolation, sign-out/account-switch behavior, and Firestore ownership rules where the test environment supports them.
- Run `npx tsc --noEmit`, the full project test suite, Expo lint, and Expo Doctor. Do not report commands as passed without their actual output.
- Native Health Connect, HealthKit, and Google account selection require a compatible development build/emulator or physical device; label any unverified native behavior.
- Read the Expo SDK 57 versioned documentation and `https://docs.expo.dev/llms.txt` before using Expo, health, or native APIs. Confirm the SDK-compatible native library and development-build requirements before selecting dependencies.

## Out of scope

- Changing or expanding the four primary bottom tabs.
- Rewriting all app persistence as a live cloud database.
- Accessing Gmail inbox data.
- Making clinical, supplement, or exact calorie-burn recommendations.
- Redesigning the existing visual identity.
