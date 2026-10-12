# Vitamin Tracker Restoration and Mobile Layout — Design

## Goal

Make FitTrack’s vitamin and supplement feature useful for everyday routine tracking, restore the richer schedule and progress view from the earlier app, and ensure the bottom navigation and floating food action stay clear of Android system controls. Keep all user-facing text complete in English, Arabic, and Sorani Kurdish.

## Current state

- The current supplement routine stores an item ID, name, dose text, and one of four times of day. Daily logs store whether each routine item was taken.
- The Manage screen is a basic add form and checklist. The earlier app grouped items by morning, afternoon, evening, and bedtime and showed completion/adherence details.
- Today’s screen has a compact supplement entry point/checklist.
- The screenshot shows the app dock sharing space with Android’s system navigation controls. Current layout uses a fixed dock offset, which does not reliably account for the device’s bottom safe area.
- Arabic and Sorani translations exist, but new or overlooked calorie and supplement labels must be checked in all supported languages, including “kcal remaining.”

## Design

### 1. Today and navigation layout

- Use the bottom safe-area inset when positioning the app dock and any floating “Add food” action. Keep the system navigation region clear on Android and preserve correct spacing on iOS and web.
- Keep the app dock visible on the main tabs. The floating action, when shown, sits above the dock and does not cover scroll content or controls.
- Keep Today’s vitamin summary compact: show the items scheduled for the selected day, completion state, and a clear Manage action. An empty routine gets a single slim “Track vitamins & supplements” row.
- Date restrictions remain consistent: future dates cannot be checked off or edited as if already taken.

### 2. Vitamin and supplement management

- Restore a dedicated, detailed Manage screen with a clear header, selected date, and daily progress summary: scheduled count, completed count, pending count, and completion percentage.
- Group the routine into morning, afternoon, evening, and bedtime sections. Each item shows its name, user-entered dose/serving details, and taken/pending state; users can mark items taken for the selected date, edit routine details, or remove an item.
- Provide an add flow for a user’s own vitamin, mineral, supplement, or other item. Capture name, category, dose/serving text, and schedule. Presets may help with common names/categories, but must not prescribe or imply a recommended dose.
- Keep the visible safety note that this feature tracks a user-provided routine and does not recommend supplements or doses.
- Keep the interface practical on small screens: accessible touch targets, scrollable sections, keyboard-safe add/edit form, and clear empty/loading/saved states.

### 3. Stored data and compatibility

- Preserve existing routine items and date-specific taken checks. Add any new fields as optional with safe defaults so existing AsyncStorage data loads unchanged.
- Retain item IDs when editing. Removing an item must remove it from the active routine without changing the history of other items or dates.
- Continue to associate taken state with the selected date; changing schedule details must not silently mark an item taken or clear prior check history.

### 4. Localization and right-to-left layout

- Translate every new title, action, category, schedule name, progress label, input label, helper message, and accessibility label into Arabic and Sorani Kurdish.
- Audit the existing calorie ring and dashboard strings as part of this work. “kcal remaining,” “kcal over budget,” and all accompanying units/status text must display translated copy in Arabic and Sorani, not raw English keys.
- Verify right-to-left alignment, icon placement, progress layout, numbers/units, and text wrapping. Keep numeric calorie/dose values readable and do not reverse the digits themselves.

## Implementation boundaries

- Reuse the current React Native/Expo stack, storage helpers, translation provider, and app theme. Do not introduce a new dependency for this feature.
- Keep the existing routine and date-log storage keys. Avoid destructive migration or rewriting user data unnecessarily.
- This change does not add medical recommendations, medication reminders/notifications, cloud sync, or a new backend.

## Acceptance criteria

1. Android’s system navigation controls do not overlap the FitTrack dock, and the dock does not cover the final scrollable content. The food action does not overlap the dock.
2. Today’s compact supplement summary remains quick to scan and opens the detailed Manage screen.
3. The detailed screen shows progress and all four schedule groups; users can add, edit, remove, and mark their own routine items as taken.
4. Existing routine items and completed checks load with the same names, doses, schedule, and completion state after the update.
5. Future dates cannot be marked as taken.
6. No new visible English strings remain in Arabic or Sorani mode, including calorie remaining/over-budget labels.
7. RTL layout remains legible, and key controls have accessible labels and touch targets.
8. Typecheck and the repository’s configured lint command pass. Validate the latest UI in the running app; note that a web preview cannot prove physical Android system-bar spacing, which requires checking on an Android device or emulator.

## Open implementation details

- Confirm the exact existing Today summary presentation and dock/FAB positioning before editing; preserve the current approved navigation structure while fixing safe-area math.
- If the app has no existing edit interaction, use a compact edit form/modal consistent with the existing styling rather than introducing a separate navigation route.
