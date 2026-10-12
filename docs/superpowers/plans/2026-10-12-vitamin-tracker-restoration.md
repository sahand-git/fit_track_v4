# Vitamin Tracker Restoration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore a detailed, localized vitamin and supplement routine manager, add a compact Today checklist, and fix bottom-system-bar overlap.

**Architecture:** Keep the existing AsyncStorage keys and daily check format. Extend routine records with optional category metadata, normalize old records on load, and put pure progress/normalization logic in a testable utility. Build on the existing screen and translation patterns; calculate dock spacing from safe-area insets instead of device-specific fixed offsets.

**Tech Stack:** Expo SDK 57, React Native 0.86, TypeScript, `react-native-safe-area-context`, AsyncStorage, existing custom i18n provider.

**Spec:** `docs/superpowers/specs/2026-10-12-vitamin-tracker-restoration-design.md`

## Global Constraints

- Reuse the current React Native/Expo stack, storage helpers, translation provider, and app theme. Do not introduce a new dependency for this feature.
- Keep the existing routine and date-log storage keys. Avoid destructive migration or rewriting user data unnecessarily.
- This change does not add medical recommendations, medication reminders/notifications, cloud sync, or a new backend.
- Future dates cannot be checked off or edited as if already taken.
- New doses are user-entered; names/categories may be suggested, but no suggested dose is shown.
- Translate every new visible and accessibility string into English, Arabic, and Sorani Kurdish.
- The bottom navigation contains exactly Today, Meals, Coach, Progress; Profile and Supplements remain non-tab screens reachable from Today.
- Preserve existing barcode/photo/manual food logging behind the Add food action; do not remove those capabilities.

## Review Focus

- Existing AsyncStorage items with missing category or unexpected legacy values must still load without dropping their names, dose text, IDs, or time.
- An item marked taken on a previous date must remain checked for that date after editing its category/name/dose or schedule.
- Empty schedule groups and a completely empty routine must render understandable localized states without creating misleading completion percentages.
- Future dates must never permit a toggle even if the screen is opened through an unusual navigation path.
- Arabic/Sorani long labels and RTL must not collide with numeric progress, actions, or Android system navigation controls on a small screen.

---

### Task 1: Add backward-compatible supplement metadata and progress utilities

**Files:**
- Modify: `src/types.ts`
- Modify: `src/storage/storage.ts`
- Create: `src/utils/supplementUtils.ts`
- Create: `src/utils/supplementUtils.test.ts`

**Interfaces:**
- `SupplementCategory = 'vitamin' | 'mineral' | 'supplement' | 'other'`.
- `SupplementRoutineItem.category?: SupplementCategory` remains optional so old AsyncStorage JSON remains valid.
- `normalizeSupplementRoutine(value: unknown): SupplementRoutineItem[]` returns valid existing records with a default category of `other`; preserve IDs, names, dose text, and valid schedule values. Invalid/incomplete records are skipped rather than crashing the entire routine.
- `getSupplementProgress(routine, checks)` returns `{ scheduled, completed, pending, percentage }`, with `percentage: 0` for an empty routine.

- [ ] **Step 1: Write utility checks first** for legacy records without a category, fully populated records, invalid JSON shapes, all-complete/partially-complete progress, and empty progress. Use local assertion helpers so the test needs no new package.
- [ ] **Step 2: Compile and run the checks to see them fail** because the utility module does not yet exist.

Run: `npx tsc --ignoreConfig --target ES2020 --module commonjs --strict --rootDir src --outDir .tmp-supplement-test src/utils/supplementUtils.test.ts`
Expected: TypeScript reports that `supplementUtils` cannot be resolved and the expected exports do not exist.

- [ ] **Step 3: Implement the typed normalization and progress helpers**, then call normalization from `loadSupplementRoutine()` while retaining `@fittrack_supplement_routine` and the existing log key/shape.
- [ ] **Step 4: Run the utility checks and typecheck.**

Run: `npx tsc --ignoreConfig --target ES2020 --module commonjs --strict --rootDir src --outDir .tmp-supplement-test src/utils/supplementUtils.test.ts; if ($LASTEXITCODE -eq 0) { node .tmp-supplement-test/utils/supplementUtils.test.js }; npx tsc --noEmit`
Expected: utility checks exit successfully and application typecheck reports no errors.

- [ ] **Step 5: Remove `.tmp-supplement-test` and commit** as `feat: preserve supplement metadata and progress`.

---

### Task 2: Restore the detailed routine manager

**Files:**
- Modify: `src/screens/SupplementsScreen.tsx`
- Modify: `src/types.ts` only if Task 1 reveals an interface mismatch; record any such change in the ledger before applying it.
- Modify: `src/i18n/strings.ts`
- Modify: `src/components/AppText.tsx` only if form controls need to adopt the established text direction pattern.

**Interfaces:**
- Consumes Task 1 `SupplementCategory`, `normalizeSupplementRoutine`, and `getSupplementProgress`.
- `SupplementsScreen` keeps its existing props (`selectedDate`, `routine`, `checks`, `onAdd`, `onRemove`, `onToggle`) and adds `onUpdate(item: SupplementRoutineItem): void` for edits.
- Add form saves a caller-generated ID for new items; edit form reuses the selected item ID.

- [ ] **Step 1: Add component-level manual cases to the implementation checklist**: empty routine, one item in each time group, incomplete dose, edit without ID change, no dose preset, and future-date lock.
- [ ] **Step 2: Implement localized progress summary** with scheduled/completed/pending/percentage and safe empty-state percentage.
- [ ] **Step 3: Render all four schedule groups** with item name, optional user-entered dose, category label, accessible taken checkbox, edit action, and remove action. Show a localized empty hint for groups without items.
- [ ] **Step 4: Add localized add/edit form** for name, category, dose text, and four schedule choices. Any name suggestions must leave dose blank. Validate name, preserve the ID during edit, and close/reset only after a successful save.
- [ ] **Step 5: Keep the tracking-only notice** and disable taken controls for future dates; keep routine edits available only when the selected date is not in the future.
- [ ] **Step 6: Typecheck and inspect all form/group states in the app at narrow mobile width** before committing as `feat: restore detailed vitamin routine manager`.

---

### Task 3: Connect Today summary and translate calorie labels

**Files:**
- Modify: `App.tsx`
- Modify: `src/screens/DashboardScreen.tsx`
- Modify: `src/components/CalorieRing.tsx`
- Modify: `src/i18n/strings.ts`

**Interfaces:**
- `DashboardScreen` accepts `supplementRoutine`, `supplementChecks`, and `onOpenSupplements` props.
- `App` passes the active date's `log.supplements`, opens the existing supplements screen, and handles item updates without changing check history.
- `CalorieRing` gets language from `useLanguage()` and resolves remaining/over-budget labels with `translate()`.

- [ ] **Step 1: Add the compact Today vitamin row below WaterTracker**. If routine items exist, show a small checklist for the selected date and Manage link; if empty, show one slim “Track vitamins & supplements” row.
- [ ] **Step 2: Connect Today toggles through the existing date-aware handler**, ensuring no future-date writes.
- [ ] **Step 3: Translate new Today copy and audit calorie-ring copy** (`kcal remaining`, `kcal over budget`, and the consumed/target ratio) in English, Arabic, and Sorani Kurdish.
- [ ] **Step 4: Typecheck and manually inspect all three languages** for raw English labels, RTL alignment, readable numeric values, and a routine that is both empty and populated.
- [ ] **Step 5: Commit** as `feat: add localized daily supplement checklist`.

---

### Task 4: Complete four-tab navigation, profile access, and language settings

**Files:**
- Modify: `App.tsx`
- Modify: `src/screens/DashboardScreen.tsx`
- Modify: `src/screens/ProfileScreen.tsx`
- Modify: `src/i18n/strings.ts`
- Delete: `src/screens/ToolsScreen.tsx` after no imports remain.

**Interfaces:**
- Bottom tabs are exactly `today`, `diary`, `coach`, `progress` (display labels Today, Meals, Coach, Progress); `profile`, `supplements`, and `scan` remain internal screen states.
- `ProfileScreen` accepts `language: AppLanguage`, `onLanguageChange(language)`, and `onBack()`; language change saves immediately without requiring profile form submission.
- `DashboardScreen` accepts `onOpenProfile()`; its header uses the profile button while food entry moves to the app-level floating action.

- [ ] **Step 1: Replace the bottom dock controls with the four specified tabs**, use translated Meals/Coach labels and icons, and make Coach a direct tab.
- [ ] **Step 2: Add Profile access to Today**, map the Today tab as active while Profile or Supplements is open, and make each screen return to Today.
- [ ] **Step 3: Move the language selector into Profile**, persist the selected language through the existing handler, and remove ToolsScreen/imports.
- [ ] **Step 4: Confirm existing camera/photo/barcode/manual food logging remains reachable from the Add food flow** and meal quick-add remembers its requested meal type.
- [ ] **Step 5: Typecheck and manually inspect the four-tab/profile/language flow** in English, Arabic, and Sorani; commit as `feat: simplify navigation and profile access`.

---

### Task 5: Fix dock and floating action safe-area spacing

**Files:**
- Modify: `App.tsx`
- Modify: `src/screens/DashboardScreen.tsx`
- Modify: `src/screens/FoodLogScreen.tsx`
- Modify: `src/screens/SupplementsScreen.tsx` only if its scroll content is obscured by the app dock.

**Interfaces:**
- Use `SafeAreaProvider` and `useSafeAreaInsets` from the installed `react-native-safe-area-context` package, following the Expo SDK 57 documentation.
- Pass computed bottom spacing to screen content or keep it within the shared app shell; do not use fixed Android status/navigation-bar guesses.

- [x] **Step 1: Check the Expo SDK 57 safe-area guidance** before editing Expo/React Native behavior.
- [x] **Step 2: Add provider/inset-aware layout** so the app dock sits above Android system navigation and has sensible iOS/web behavior.
- [x] **Step 3: Add a floating “Add food” action to Today and Meals**, above the dock; hide it for future selected dates. Keep the scan/manual-add flow reachable and do not let the action cover the last scroll row.
- [x] **Step 4: Set scroll bottom padding** to clear the visible dock and floating action on Today and Meals.
- [x] **Step 5: Run typecheck and inspect the running app** against the supplied screenshot at mobile dimensions, including Arabic and Sorani. The TypeScript and web export checks passed; the preview browser could not reach the running app, so physical Android spacing remains unverified on-device.
- [x] **Step 6: Commit** implementation as `8f4500a` (`feat: restore supplement tracking and simplify navigation`).

## Final Verification

- [x] Run the standalone supplement and ID utility checks and `npx tsc --noEmit`.
- [x] Run the repository lint command from `AGENTS.md` (`npx expo lint`) and report its exact outcome; 11 existing errors and 5 warnings remain in legacy components/screens/services. Changed feature files have 0 errors; App reports one missing dependency warning and Coach reports two duplicate-import warnings.
- [x] Export the web bundle successfully.
- [ ] Open/run the app preview and verify Today, Meals, supplement manager, empty/populated routine, future-date state, and English/Arabic/Sorani layouts. Browser preview was unreachable from this environment.
- [ ] Compare the Android screenshot geometry on a device/emulator: system buttons below the app dock; final content scrolls above the dock; Today vitamin summary appears after Water.

## Plan Self-Review

- Spec coverage: storage compatibility and progress are Task 1; detailed schedule/editor and safety note Task 2; Today and calorie localization Task 3; safe areas and food action Task 4.
- No new package is required. Utility checks use the installed TypeScript compiler and Node runtime.
- The key historical invariant is that edits retain item IDs and do not rewrite date-log checks; removal only affects the active routine.
- RTL/long-copy, invalid legacy records, empty routines, and future dates are called out in Review Focus and the relevant task checks.
