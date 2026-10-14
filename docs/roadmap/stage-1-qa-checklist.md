# Stage 1 — Measurable UX and reliability checklist

This is a verification checklist, not a redesign brief. Capture the requested screenshots before making broad visual changes; compare each screenshot with the matching pass criteria below.

## Evidence to collect

- Device model, OS version, screen width in dp, and app build/commit.
- Screenshots for Today, Meals/Add Food, AI Coach with the keyboard open, Vitamins, Workouts, Progress, Profile, and sign-in/backup.
- Repeat the screen captures in English (LTR), Arabic (RTL), and Sorani Kurdish (RTL).
- For each failed item, include a short screen recording when the issue is movement, keyboard behavior, or a modal transition.

## Pass/fail checklist

| Area | Measurable pass condition | Evidence |
|---|---|---|
| Layout and safe areas | On 320, 360, and 390 dp wide devices, no text, icon, button, FAB, or bottom-navigation item is clipped, overlapped, or behind system bars. | Screenshot per width; mark pass/fail |
| Primary tasks | From Today, a user can reach Add Food, Coach, Vitamins, Workouts, and Progress in at most 2 intentional taps; no primary action is hidden below the fold without a visible cue. | Screen recording/task count |
| Meal logging | Search, barcode, photo analysis, text description, quantity editing, and save each have visible loading, success, and recoverable error states. A saved meal appears in Today and Meals without reopening the app. | Screenshots + persistence check |
| AI Coach and keyboard | With the keyboard open, the message field and send button remain visible; sending a message scrolls the latest response into view; Android back first dismisses the keyboard and then exits the screen. | Android screen recording |
| Supplements | Daily checklist, routine load/save, schedule, completion progress, reminder permission and reminder scheduling have distinct working states; changing a past/future date does not alter today. | Screenshots + date/reminder checks |
| Workout logging | Exercise names and controls remain readable at 320 dp; adding, editing, and deleting a workout updates daily activity and calorie totals exactly once. | Screenshots + total comparison |
| Localization | Every visible user-facing string is translated in Arabic and Sorani, including errors, empty/loading states, accessibility labels, units, kcal and dates. No raw English labels remain except intentional brand/model names. | Three-language screenshot set + string audit |
| RTL | Layout order, back/forward affordances, charts, input alignment, and navigation mirror correctly; numbers and units remain legible and associated. | Arabic and Sorani screenshots |
| Motion | Animations complete within 150–400 ms, never delay taps, and honor system Reduce Motion. No visible jank when scrolling Today or Meals. | Slow-motion recording + Reduce Motion run |
| Accessibility | Primary controls have meaningful labels and roles; text remains readable at 1.3x font scale; touch targets are at least 44 dp. | Accessibility inspector/manual check |
| Accounts and backup | Guest mode works without Firebase. Sign-in errors are understandable. Backup and restore preserve the expected account data; failed restore leaves prior local data intact. | Test account run + before/after data summary |

## Completion rule

Mark a row pass only when the evidence is attached and the condition was reproduced on a real device or a representative emulator. Record the device/build and any known limitation beside every fail; do not claim store readiness from screenshots alone.
