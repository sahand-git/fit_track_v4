# FitTrack Privacy Policy

**Effective Date:** October 15, 2026  
**App Name:** FitTrack (fit_track_v4)

FitTrack is built on an **offline-first, zero-surveillance architecture**. We believe your personal health, nutrition, workout, and biometric records belong exclusively to you.

---

## 1. Local Storage & Zero Data Brokers
- **On-Device Storage:** All daily meal logs, calorie records, macronutrients, water intake, body weight, exercise sessions, and custom food items are stored locally on your device via encrypted/sandboxed AsyncStorage and SecureStore.
- **No Third-Party Ad Trackers:** FitTrack contains no advertising SDKs, tracking pixels, behavioral profilers, or data brokers.
- **Guest Mode by Default:** FitTrack does not require account creation. You can use 100% of the app's nutrition, workout, and analysis tools as a guest without providing an email address or personal identity.

---

## 2. Optional Firebase Cloud Backup
- **Explicit Opt-In:** Cloud backup is strictly optional. If you choose to create an account, backups are triggered only when you explicitly press "Back up now".
- **Strict Data Segregation:** Backups are stored in your own isolated Firestore document path (`fitnessBackups/{userId}`). Security rules enforce that only your authenticated, email-verified identity can read, write, or delete your backup.
- **Never Includes API Keys:** Your personal Google Gemini API keys are explicitly excluded from cloud backups and stay on your device in SecureStore.
- **Full Deletion Control:** You can permanently delete your Firebase account and cloud backup at any time directly in the Account screen.

---

## 3. Optional Gemini AI Food Recognition & Coaching
- **Direct Client-to-API:** When you analyze meal photos or chat with the AI Coach, requests are sent directly to Google Gemini's API endpoints using your provided API key or app configuration.
- **No Intermediate Logging:** FitTrack does not operate an intermediate logging server. Photos and audio are not retained on our servers.
- **Google Privacy Terms:** Requests sent to Gemini are governed by Google's API Data Governance and Terms of Service.

---

## 4. Device Permissions
- **Camera (`CAMERA`):** Used solely when you scan a food barcode or take a photo of your plate for nutritional analysis.
- **Photo Library (`READ_MEDIA_IMAGES`):** Used solely when you choose an existing meal image from your gallery.
- **Notifications (`POST_NOTIFICATIONS`):** Used solely for local, scheduled meal and water reminders on your device.
- **No Background Location or Microphone Access:** FitTrack never accesses your GPS location or records ambient audio.

---

## 5. Contact & Inquiries
For questions regarding your privacy rights or to request manual account removal assistance, open an issue on the repository or contact the project maintainers.
