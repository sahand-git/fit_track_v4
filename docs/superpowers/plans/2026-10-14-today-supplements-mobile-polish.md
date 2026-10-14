# Today, Supplements, and Mobile Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the Today action overlap, improve calorie-ring sizing at narrow and wide widths, and make the existing supplement routine/reminder flow reliable and testable.

**Architecture:** Keep the existing state-based navigation, storage keys, theme, and screen APIs. Add small pure helpers for responsive ring sizing and supplement list transformations so production code and tests share the same behavior. Persist a routine successfully before publishing it to React state; keep notification scheduling as a follow-up to a successful save.

**Tech Stack:** Expo SDK 57, React Native 0.86, TypeScript, Reanimated, AsyncStorage, Expo Notifications, `tsx` test scripts.

**Spec:** `docs/superpowers/specs/2026-10-14-today-supplements-mobile-polish-design.md`

## Global Constraints

- Preserve the four tabs and do not migrate to Expo Router.
- Preserve AsyncStorage keys and current serialized data shapes.
- Preserve the ivory/forest-green visual identity and English, Arabic, and Sorani localization.
- Do not add dependencies or make live Gemini requests.
- Keep notification permission prompts user initiated.
- Do not claim native-device behavior is verified through the web preview.

## Review Focus

- Fixed bottom actions must not obscure scroll content, Water Intake controls, the dock, or the last list item.
- Calorie-ring sizing must remain usable on narrow cards and not stay undersized on wide cards.
- Re-loading a repeating supplement routine must not duplicate a date's checklist or reset existing taken items.
- A failed routine storage write must not publish unsaved state or schedule reminders from it.
- Supplement notifications must only schedule enabled time slots that have routine items.

---

### Task 1: Reserve space for Today action and size the ring responsively

**Files:**
- Create: `src/utils/dashboardLayout.ts`
- Create: `src/utils/dashboardLayout.test.ts`
- Modify: `src/screens/DashboardScreen.tsx`
- Modify: `src/components/CalorieRing.tsx`
- Modify: `package.json` (include the new test in the existing test command)

**Interfaces:**
- Produces `getCalorieRingSize(availableWidth: number): number`, returning a width-proportional size clamped to 172–280 px; Dashboard passes it as the existing `CalorieRing.size` prop.
- Dashboard renders Add Food in a normal-flow reserved footer above the dock rather than as an absolute overlay. The scroll view reserves only ordinary end spacing; the footer owns the dock/safe-area gap.

- [ ] **Step 1: Add failing ring-size tests** for widths 180, 320, 375, and 1280: result stays within 172–280, scales for narrow widths, and caps at 280 for wide widths.
- [ ] **Step 2: Run `npx tsx src/utils/dashboardLayout.test.ts`** and confirm it fails because the helper is absent.
- [ ] **Step 3: Implement `getCalorieRingSize`** with finite-width validation and the specified clamp; use it from Dashboard's hero `onLayout` measurement.
- [ ] **Step 4: Run the focused test and confirm it passes.**
- [ ] **Step 5: Move Add Food into a reserved footer in normal layout flow.** Account for `useSafeAreaInsets` and the existing dock placement; remove absolute positioning and avoid hard-coded overlay bottom offsets.
- [ ] **Step 6: Run `npx tsc --noEmit` and the full `npm test` suite.**
- [ ] **Step 7: Inspect Today at desktop and phone-like widths in the preview; verify the water controls and final scroll content are reachable and the CTA remains above the dock.**
- [ ] **Step 8: Commit only `src/utils/dashboardLayout.ts`, `src/utils/dashboardLayout.test.ts`, `src/screens/DashboardScreen.tsx`, `src/components/CalorieRing.tsx`, `package.json`, and the test command's required config changes.**

### Task 2: Use production supplement transforms and make saves failure-safe

**Files:**
- Create: `src/utils/supplementRoutine.ts`
- Create: `src/utils/supplementRoutine.test.ts`
- Modify: `src/screens/SupplementsScreen.tsx`
- Modify: `src/services/notificationService.ts`
- Modify: `App.tsx`
- Modify: `package.json` (include the new test in the existing test command)

**Interfaces:**
- `mergeRoutineIntoDay(activeItems, routine, createId)` returns a checklist with missing routine entries appended, preserving current entries and taken state; deduplication uses normalized name plus time slot.
- `buildRoutineFromDay(activeItems)` returns a name/time-deduplicated routine and preserves IDs and supplement metadata.
- `getEnabledSupplementReminderSlots(settings, routine)` returns only enabled time slots that contain routine items; the notification service schedules from this result.
- Routine updates persist before `setSupplementRoutine`; notification resync runs only after persistence succeeds.

- [ ] **Step 1: Write tests against the new production helpers** covering duplicate routines, whitespace/case normalization, retained taken state, metadata and ID preservation, empty lists, and reminder-slot filtering.
- [ ] **Step 2: Run `npx tsx src/utils/supplementRoutine.test.ts`** and confirm failure because the helpers do not exist.
- [ ] **Step 3: Implement the pure helpers** in `src/utils/supplementRoutine.ts` and make the existing screen and notification service call them.
- [ ] **Step 4: Run the focused test and confirm it passes.**
- [ ] **Step 5: Update `App.tsx` so a routine is persisted before React state is updated.** Keep notification rescheduling after the successful write; notification failures must not discard a saved routine.
- [ ] **Step 6: Add user-visible failure feedback to supplement add/edit and load-routine save paths.** Keep the form open on write failure and show success feedback only after writes finish; use existing localized strings where possible and add translations in English, Arabic, and Sorani only if necessary.
- [ ] **Step 7: Run supplement-specific tests, then `npx tsc --noEmit` and the complete `npm test` suite.**
- [ ] **Step 8: In an isolated preview profile, add an item to both day and routine, reload the routine, mark it taken, reload again, and confirm there is no duplicate and the taken state remains. Verify reminders are user-enabled and only scheduled for populated enabled slots on a native device if available.**
- [ ] **Step 9: Commit only the supplement helper, test, screen/service/App changes, and the test command change.**

### Task 3: Audit existing AI, keyboard, safe-area, and localization behavior

**Files:**
- Inspect: `src/screens/CoachScreen.tsx`
- Inspect: `src/components/addfood/AddFoodSheet.tsx`
- Inspect: `src/components/ReminderSettingsModal.tsx`
- Inspect: `src/screens/SupplementsScreen.tsx`
- Modify only when a clipping or localization issue is reproducible; add a focused test before any behavior change.

- [ ] **Step 1: Confirm Add Food still exposes Search, Analyze meal photo, Describe with AI, and Barcode scanning; do not request camera permission or call Gemini as part of automated checks.**
- [ ] **Step 2: Inspect existing KeyboardAvoidingView and safe-area calculations** for Coach composer, Add Food sheet actions, supplement form save button, and reminder settings footer.
- [ ] **Step 3: If a reproducible clipping issue exists, add a regression test first, then make the smallest layout change and run the focused test.** Do not add another keyboard-avoidance wrapper if the existing one is sufficient.
- [ ] **Step 4: Inspect touched strings for English, Arabic, and Sorani coverage and RTL layout.**
- [ ] **Step 5: Run `npx tsc --noEmit` and `npm test`; report native-only checks that remain unavailable.**
