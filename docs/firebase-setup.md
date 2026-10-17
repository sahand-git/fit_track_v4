# Firebase accounts and cloud backups

FitTrack remains usable as a guest with no Firebase project. Firebase is used for email/password accounts, Google identity sign-in, and a manually started per-account Firestore backup. The app does not continuously upload meal or health data. Google sign-in requests identity only; it does not request Gmail access or configure Gemini.

## Configure Firebase

1. Create a Firebase project and register a **web app** in Project settings.
2. In Authentication, enable Email/Password and Google providers. Configure authorized domains and the support email.
3. Copy the web app's public Firebase config into an untracked `.env` using `.env.example` as a template. `EXPO_PUBLIC_*` Firebase client configuration is public app configuration, not an Admin credential. Never add service-account JSON, Admin SDK credentials, Gemini keys, or private server secrets to the app.
4. Enable Cloud Firestore in the project. Publish this repository's `firestore.rules` before enabling cloud backup.
5. In Authentication, configure the email verification and password reset templates. Use the project's intended production sender/domain before release.

The app refuses cloud backup for an email/password user until Firebase reports the email as verified. Firestore writes are owner-only, require verified identity, and the app validates the backup payload and enforces a 750 KB client limit before upload.

## Google sign-in on native builds

Google sign-in uses `react-native-nitro-google-signin`, which needs a custom development/store build and does not run in Expo Go. Configure the OAuth consent screen, Android OAuth client with the package name and SHA-1 fingerprints, and iOS OAuth client with `com.fittrack.expo`. Add the generated web client ID as `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`.

For EAS or local native builds, make the platform service files available as ignored files or build secrets and set `GOOGLE_ANDROID_SERVICES_FILE`, `GOOGLE_IOS_SERVICES_FILE`, and `GOOGLE_IOS_URL_SCHEME` as needed. `app.config.ts` adds the paths and iOS URL scheme to the native config. The iOS URL scheme is the reversed iOS client ID beginning with `com.googleusercontent.apps.`. Rebuild the native app after changing these values. Do not commit platform config files unless you intentionally treat them as public Firebase client configuration and have reviewed them.

### GitHub Actions APK configuration

The Android workflow reads these repository Actions secrets (Settings → Secrets and variables → Actions):

- `EXPO_PUBLIC_FIREBASE_API_KEY`
- `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
- `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `EXPO_PUBLIC_FIREBASE_APP_ID`
- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
- `GOOGLE_ANDROID_SERVICES_JSON_BASE64` (the base64-encoded contents of `google-services.json`; the workflow recreates the ignored file for the build)

Firebase web configuration and the Android service file are client configuration embedded in the app; they are not Firebase Admin credentials. Never add a service-account key, Gemini key, or other server credential to the app or workflow. The workflow remains able to build a guest-mode APK if Firebase secrets are not set, but Firebase sign-in and Google sign-in will not work in that build.

## Data boundaries

- Existing v4 AsyncStorage keys remain the guest namespace without migration.
- A Firebase UID receives a separate local key namespace. Signing out returns to guest records and does not delete account records.
- Signing in never silently merges or uploads guest data. To move it, export a local JSON backup while in guest mode, sign in, then import that file intentionally.
- Cloud backup and restore happen only after the user presses the corresponding button. Restore replaces this device's records in the active account namespace after validation and storage rollback staging.
- Deleting an account requires recent authentication. It removes the cloud backup and Firebase account; local records stay on device as guest data. If Firebase rejects account deletion after recent reauthentication, the service attempts to restore the cloud backup and reports failure.

## Manual release checks

- Test email registration, verification, sign-in, password reset, sign-out, and account switching on Android and iOS.
- Test Google account selection using a development build signed with the configured SHA fingerprints.
- Test Firestore read/write/delete rules with the Firebase Emulator or a non-production Firebase project before launch.
- Test backup, restore, oversized payload errors, offline operation, and account deletion after recent authentication.
- Set a real privacy policy, support email, data deletion process, and store disclosures before publishing.

The repository contains the privacy policy draft at `docs/privacy.md`. Enable GitHub Pages from the `main` branch and `/docs` folder, then check that `https://sahand-git.github.io/fit_track_v4/privacy/` loads before releasing. The account screen links to this URL.

## Test Firestore rules locally

Install a supported JDK, then run `npm run test:rules`. The command starts the Firestore emulator using the checked-in `firebase.json`, executes the isolated rules tests, and shuts the emulator down. The test project is `demo-fittrack`; it cannot reach production Firebase data.
