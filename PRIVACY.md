# FitTrack Privacy Policy

**Effective Date:** October 17, 2026  
**Application:** FitTrack (`fit_track_v4`)  
**Architecture:** Offline-First, Privacy-Preserving Health & Nutrition Tracking

FitTrack is designed with a fundamental principle: **your health, nutrition, workout, and biometric data belongs exclusively to you.** FitTrack operates on an offline-first architecture with zero third-party advertising trackers, no telemetry profiling, and no data broker monetization.

---

## 1. Local On-Device Storage & Offline Operation

### What We Store Locally
All personal tracking data is stored directly on your physical device:
- **Biometric Profile:** Age, gender, height, body weight, target calorie budget, and macronutrient targets (protein, carbs, fat).
- **Daily Nutritional Logs:** Logged meals, custom food items, portion sizes, calorie totals, and micronutrient details.
- **Hydration & Activity:** Daily water intake logs and workout sessions (duration, intensity, estimated calories burned).
- **Routines & Organization:** Supplement schedules, reminder intervals, custom foods, favorite foods, recent searches, and meal templates.
- **Progress Telemetry:** Day streaks, goal celebration states, and trend snapshots.

### Storage Technology & Security
- **Sandboxed Local Storage:** Application state is persisted using React Native AsyncStorage within your device's isolated application sandbox.
- **Secure Key Storage:** Sensitive credentials (such as your Google Gemini API key) are stored separately using `expo-secure-store`, backed by the Android KeyStore or iOS Keychain.
- **Guest Mode by Default:** FitTrack requires no account, email address, or sign-in to access 100% of core tracking, analysis, and custom food features.

---

## 2. Optional Firebase Authentication & Cloud Backup

Cloud synchronization is strictly **opt-in** and disabled by default. If you choose to enable cloud backups:
- **Authentication:** You may register an account using Firebase Authentication (Email/Password with email verification or Google Sign-In).
- **Isolated Storage:** Your backup data is stored in Google Cloud Firestore under a path scoped specifically to your unique user ID (`fitnessBackups/{userId}`).
- **Subcollection Chunking:** To guarantee reliable cloud synchronization and prevent exceeding Firestore's 1 MiB document limitation, large backups are automatically divided into subcollection documents under `fitnessBackups/{userId}/chunks/{chunkId}`.
- **Strict Access Control:** Cloud Firestore Security Rules enforce verified ownership (`request.auth.token.email_verified == true`). No other user can read, query, list, modify, or delete your backup. Global enumeration of the backup collection is blocked.
- **Exclusion of Sensitive Keys:** Your Gemini API key is explicitly excluded from cloud backup payloads and never leaves your local device's SecureStore.

---

## 3. Google Gemini AI Features (Text Queries & Photo Recognition)

FitTrack provides optional AI-assisted meal analysis and nutrition coaching powered by Google Gemini:
- **Direct Client-to-API Communication:** All AI interactions communicate directly from your device to Google Gemini's secure API endpoints. FitTrack does not operate an intermediate server that intercepts, inspects, or logs your queries.
- **Nutritional Inquiries & Daily Audits:** When using the AI Coach, your query and a summary of your day's macro totals are sent to Gemini to generate actionable educational feedback.
- **Meal Photo Recognition:** When you analyze a meal via camera or photo library, the image is processed to identify foods and estimate portion sizes.
- **Data Governance:** Requests are processed under the Google Cloud and Gemini API Terms of Service. Photos and prompts are not used by FitTrack for model training or retained on external servers.

---

## 4. Open Food Facts Barcode Search

- **Barcode Scanning:** When you scan a product barcode with the built-in camera scanner, the barcode digits (UPC/EAN) are queried against the open, crowd-sourced Open Food Facts API (`world.openfoodfacts.org`).
- **Zero Personal Identifiers:** No personal data, user identity, IP tracking profile, or device identifier is transmitted with the barcode query.
- **Local Caching:** Scanned product nutrition information is cached locally (`@fittrack_barcode_cache`) so subsequent lookups require no network requests.

---

## 5. Health Connect & Apple Health (Step Tracking)

- **Read-Only Access:** FitTrack requests permission to read daily step counts from **Android Health Connect** (Android) or **Apple HealthKit** (iOS, via `@appeeky/expo-healthkit`).
- **Purpose:** Step counts are used solely to compute active calorie expenditure and display your daily step goal ring.
- **Strict Privacy:** Health and step data is processed on-device and is never shared, sold, or synced with third parties.
- **User Control:** You can revoke Health Connect or HealthKit permissions at any time through your device's system settings.

---

## 6. Optional Anonymized Crash Reporting & Diagnostics

FitTrack includes an optional, privacy-first diagnostic reporting mechanism:
- **Strict Opt-In Consent:** Crash reporting is disabled by default (`enableCrashReporting: false`). It is only activated if you explicitly opt in during onboarding or toggle it on in **Profile -> Data & Storage**.
- **Deep Data Scrubbing:** Before any diagnostic report is created:
  - Personal biometrics (name, email, age, height, weight) are completely stripped.
  - All nutritional logs, meal names, custom recipes, calorie values, and macronutrients are scrubbed and replaced with `[health-data-scrubbed]`.
  - All API keys (including Google AI Studio Gemini keys and AIza tokens) are redacted with `[redacted-token]`.
  - Local file system paths are generalized to `app://`.
- **Diagnostic Scope:** Only technical stack traces, error class names, platform OS version, and application version are captured to resolve application crashes.
- **Immediate Revocation:** You can toggle crash reporting off at any time in Profile settings. Disabling it immediately stops all diagnostic collection.

---

## 7. Notifications & Reminders

- **Local Scheduling Only:** FitTrack schedules meal, hydration, and supplement reminders using `expo-notifications`.
- **No Remote Push Tokens:** All notifications are created, evaluated, and triggered locally on your device. We do not register push tokens with external Apple Push Notification (APNs) or Firebase Cloud Messaging (FCM) servers.

---

## 8. Data Retention, Portability & Deletion

You have complete authority over your data at all times:
- **Local Data Erasure:** You can erase all local tracking logs and settings at any time by clearing application data in device settings or uninstalling the app.
- **Cloud Account & Backup Deletion:** If you created a cloud account, you can permanently delete your account and all associated cloud backups with one tap in the **Account** screen ("Delete Account & Cloud Data"). This immediately deletes all Firestore backup documents, chunks, and purges your authentication record.
- **Data Export & Portability:** You can export your complete history at any time as a portable, standardized JSON backup file via the **Backup & Restore** screen.

---

## 9. Policy Hosting & Configuration

The live URL of this privacy policy is defined centrally in the application configuration:
- Source configuration: `src/constants/urls.ts` (`PRIVACY_POLICY_URL`)
- Accessible within the app via **Account -> Privacy Policy**.

---

## 10. Contact & Inquiries

For questions regarding this Privacy Policy, data protection practices, or deletion assistance, please contact:
- **Email:** `privacy@fittrack.app` *(or your hosting contact email)*
- **GitHub Repository Issues:** [https://github.com/sahand-git/fit_track_v4/issues](https://github.com/sahand-git/fit_track_v4/issues)
