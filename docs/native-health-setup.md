# Step tracking and health data setup

FitTrack stores a daily step total locally and supports manually setting it. On a compatible device, users can explicitly sync a selected date from Apple Health (iOS) or Health Connect (Android). A successful sync **replaces** that date's total, so repeated sync does not add duplicates. Permission denial, unavailable providers, or empty results leave the saved total unchanged.

The adapter is `@appeeky/expo-healthkit` and uses only the step-count read permission. Its web implementation reports unavailable. Expo Go does not contain this custom native code; use a development build or store build. Health Connect requires Android API 26 or later and must be installed/available on the device. iOS needs HealthKit capability and the permission copy configured in `app.json`.

Expo SDK 57's `expo-sensors` Pedometer can watch steps while the app is open, but Expo documents that updates stop in the background and historical reads are iOS-only (Apple keeps only seven days of Pedometer history). FitTrack therefore does not pretend a foreground sensor stream is all-day history. Health-provider sync and manual entry are the reliable totals shown in the app.

## Build and device checklist

1. Run `npx expo prebuild` only in a configured native build environment, then build a development client or store build. Do not use Expo Go to test these health APIs.
2. On Android, install/update Health Connect, launch the app, choose **Sync Apple Health / Health Connect**, and allow step-count read access. Test dates with data and dates without data.
3. On iOS, install on a physical device, allow step-count read access in the Health permission sheet, then test today's and historical dates.
4. Confirm a repeated sync leaves the same total, manual edits survive failed/denied sync, and future dates remain read-only.
5. Confirm the operating system health dashboard shows only the requested step read permission; the app does not write workouts or calories into health records.

Native permissions, store provisioning, real device readings, and Health Connect installation cannot be proven in the browser preview or unit tests.
