# Today, Supplements, and Mobile Polish Design

## Goal

Fix the verified visual obstruction on Today and improve the responsive presentation of the calorie summary. Audit the existing vitamin routine, reminder, AI, keyboard, and safe-area flows; fix only reproducible defects while preserving current behavior and saved user data.

## Confirmed context

- The app uses state-based navigation with Today, Meals, Coach, and Progress tabs. Keep this navigation; do not migrate to Expo Router.
- Today currently renders a floating Add Food control above the bottom dock. In the live 1280×720 preview it overlaps the Water Intake card.
- `CalorieRing` accepts a fixed default size of 200. In the same wide preview it appears small inside a much larger summary card.
- Supplements already has daily and repeating routine actions, a catalog/form, and reminder settings. Existing unit tests cover portions of routine and notification-slot behavior. The preview session began with no configured routine, so it did not establish whether saved routines and reminders work end to end.
- Coach, Add Food, and the supplement form already use `KeyboardAvoidingView`. Verify spacing and behavior; do not add a second keyboard-avoidance layer without evidence.
- AI photo analysis, text estimation, barcode scanning, and Coach are implemented. Live AI calls require a user key and network/provider access; do not enter or log a real key as part of this work.
- Languages are English, Arabic, and Sorani Kurdish. Keep all new or changed UI text localized and RTL-safe.

## Design

### Today action placement

Keep Add Food prominent and available above the persistent dock, but place it in a reserved action area so it never obscures Water Intake, supplements, workouts, or meal controls. Account for safe-area insets and dock height. Ensure the scroll content can reach its final item without being hidden behind fixed controls.

### Calorie summary responsiveness

Keep the existing ivory/forest-green visual identity and calorie-ring behavior. Size the ring from the available card width with sensible minimum and maximum values, and adjust card spacing so the summary does not look sparse at wide sizes or cramped on phones. Preserve current calorie math and accessible labels.

### Supplements and reminders

Trace add, edit, delete, load-routine, save-day-as-routine, daily checkoff, and reminder scheduling paths. Use existing storage formats and APIs. Fix only defects demonstrated by code or tests; maintain the distinction between a date-specific checklist and the repeating routine. Keep notification permission requests user-initiated, preserve existing reminder preferences, and localize any added feedback.

### Existing AI and keyboard flows

Verify that the current UI exposes the AI photo, text estimate, barcode, and Coach paths in the intended states. Review existing keyboard avoidance and dock/safe-area spacing for clipped composers or buttons. Do not redesign these screens, change Gemini model selection, or make live provider calls.

## Implementation boundaries

- Preserve existing AsyncStorage keys and serialized data shapes.
- Preserve the four-tab navigation, theme palette, and current app identity.
- Do not add dependencies unless a concrete defect cannot be fixed with existing packages.
- Avoid changing user data during verification; use isolated test data or mocked storage.
- Do not claim physical-device behavior is verified by a web preview.

## Verification and acceptance

- Add focused regression coverage for action placement calculations and any routine/reminder defects fixed.
- Run `npx tsc --noEmit` and the complete `npm test` suite.
- Run the web preview where available and inspect Today, Supplements, Coach, and Add Food at a phone-sized and desktop-sized viewport.
- Confirm English, Arabic, and Sorani labels remain present and directionally correct for touched UI.
- Report that camera, native notification delivery, Health Connect/Apple Health, Android keyboard resizing, and iOS safe areas require native-device verification if no device build is available.

## Risks and open verification limits

- The running user tunnel serves the original checkout; code in this worktree will need its own preview/build to verify the changed branch.
- Local notification behavior cannot be fully validated in a web session.
- Gemini features cannot be end-to-end tested without a user-provided key; tests must mock provider responses.
