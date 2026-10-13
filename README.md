# FitTrack v4

FitTrack is an offline-first Expo / React Native app for meals, calorie and macro tracking, hydration, supplements, step totals, workouts, progress, and an AI nutrition coach. It supports English, Arabic, and Sorani Kurdish, including RTL layouts.

## Activity features

- **Steps:** Set a daily goal, edit date-specific totals, view estimated distance / active time / calories, and explicitly sync Apple Health or Android Health Connect when supported.
- **Workouts:** Log activity presets, duration, MET estimates or a calorie override, and strength sets. A dedicated history screen supports date navigation, search, category filters, edit, and delete.
- **Calorie budget:** Fixed targets are the default. The optional adaptive setting uses a sedentary baseline plus net logged activity and avoids adding workout-attributed steps twice. Calories and distance are estimates.
- **Data ownership:** Existing records remain available in guest mode. Signed-in accounts have a separate local namespace; data is not silently merged or uploaded.

## Install and run

```bash
npm ci
npm start
```

Web and Expo Go can preview most screens. Health Connect / HealthKit and native Google sign-in need a custom development or store build. See [docs/native-health-setup.md](docs/native-health-setup.md).

## Accounts and cloud backups

Guest mode works without Firebase. For email/password accounts, Google identity sign-in, and account-owned Firestore backups, follow [docs/firebase-setup.md](docs/firebase-setup.md), fill `.env` from `.env.example`, and publish `firestore.rules`. Google sign-in does not grant Gmail or Gemini access.

Backups are user-initiated. Restore validates and replaces data only in the active account namespace. Local backup export/import remains available.

## Checks

```bash
npm test
npx tsc --noEmit
npx expo lint
npx expo-doctor
```

## Stack

- Expo SDK 57, React Native 0.86, TypeScript
- Firebase JS SDK for Authentication and Firestore
- AsyncStorage for local records and session persistence
- `@appeeky/expo-healthkit` for Apple Health / Health Connect step totals
- Expo SecureStore for AI credential storage
