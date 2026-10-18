# Google Play Data Safety Questionnaire Responses

This document provides exact, verified answers for the Google Play Console **Data safety** form for FitTrack (`fit_track_v4`), fully aligned with [`PRIVACY.md`](../PRIVACY.md) and [`docs/permissions-audit.md`](permissions-audit.md).

---

## 1. Overview Questions

### Does your app collect or share any of the required user data types?
- **Answer:** **Yes**  
  *(FitTrack processes user-entered profile data, health & fitness logs locally, and provides optional opt-in cloud backup and optional diagnostics).*

### Is all of the user data collected by your app encrypted in transit?
- **Answer:** **Yes**  
  *(All network communications—including optional Firebase Cloud Backup, Google Gemini AI API calls, and Open Food Facts barcode lookups—occur exclusively over secure HTTPS/TLS 1.3 connections).*

### Do you provide a way for users to request that their data be deleted?
- **Answer:** **Yes**  
  *(Users can permanently delete their cloud account and all associated backup chunks directly inside the app via **Account -> Delete Account & Cloud Data**. Local data can be wiped at any time via device settings or by uninstalling the app).*

---

## 2. Data Types & Declarations

### Category: Personal Info

#### 1. Name
- **Collected?**: Yes (Optional, user-entered display name).
- **Shared?**: **No** (0 third-party sharing).
- **Ephemeral processing?**: No (Stored locally in sandboxed AsyncStorage).
- **Required or optional?**: **Optional** (Users can leave this empty; defaults to "Champion").
- **Purposes**:
  - [x] App functionality (personalizes greeting and target calculations).

#### 2. Email Address
- **Collected?**: Yes (Optional, only when user registers for Firebase Cloud Backup).
- **Shared?**: **No** (0 third-party sharing).
- **Ephemeral processing?**: No (Managed by Firebase Authentication).
- **Required or optional?**: **Optional** (FitTrack functions 100% in Guest mode without an account).
- **Purposes**:
  - [x] Account management (identifies user account for cross-device cloud backup).

---

### Category: Health and Fitness

#### 1. Fitness Info
*(Workout sessions, duration, intensity, exercise sets, active calories burned, step counts read from Android Health Connect).*
- **Collected?**: Yes (Processed on-device).
- **Shared?**: **No** (0 third-party sharing).
- **Ephemeral processing?**: No (Stored locally in sandboxed AsyncStorage; synced to user's private cloud document only if cloud backup is enabled).
- **Required or optional?**: **Optional** (Step tracking and workout logging can be bypassed).
- **Purposes**:
  - [x] App functionality (calculates energy balance and displays workout history).

#### 2. Health Info
*(Dietary nutrition intake, meal logs, food portions, macronutrients, micronutrients, body weight history, hydration logs, supplement routines).*
- **Collected?**: Yes (Stored locally in user's device sandbox).
- **Shared?**: **No** (0 third-party sharing).
- **Ephemeral processing?**: No (Stored locally; included in encrypted cloud backup only if user opts in).
- **Required or optional?**: **Optional** (Users log whatever meals or biometric values they choose).
- **Purposes**:
  - [x] App functionality (daily caloric tracking, RDA micronutrient progress, and weight trend graphs).

---

### Category: Photos and Videos

#### 1. Photos
*(Meal plate photos taken with camera or selected from gallery for AI nutrition analysis).*
- **Collected?**: Yes (Optional, only when using the AI Plate Photo feature).
- **Shared?**: **No** (0 third-party sharing).
- **Ephemeral processing?**: **Yes**  
  *(Meal photos are transmitted directly to the Google Gemini API over HTTPS to detect food components and estimate portions. Photos are processed in memory and are **never** stored in cloud databases, never shared with third parties, and never included in backups).*
- **Required or optional?**: **Optional** (AI features are completely optional; manual food search and barcode lookup require zero photos).
- **Purposes**:
  - [x] App functionality (identifying meal components from a plate photo).

---

### Category: App Info and Performance

#### 1. Crash Logs & Diagnostics
*(Application stack traces, unhandled exceptions, operating system version).*
- **Collected?**: **No** (FitTrack transmits zero crash logs or performance telemetry to remote servers).
- **Shared?**: **No** (0 third-party sharing).
- **On-Device Storage Only**: Up to 5 scrubbed technical error reports are retained strictly on-device in sandboxed storage for user troubleshooting; zero remote transmission.
- **Data Scrubbing**:
  - Personal biometric data (name, email, age, weight) is completely stripped.
  - All nutritional logs, food names, recipes, and calories are redacted (`[health-data-scrubbed]`).
  - All API keys and authentication tokens are redacted (`[redacted-token]`).
- **User Control**: Users can view, copy, share, or clear all on-device crash logs inside Profile -> Data & Storage.

---

### Category: Device or Other Identifiers
- **Collected?**: **No**
- **Shared?**: **No**
- *(FitTrack does not collect, track, or share Android Advertising ID, IMEI, MAC address, or hardware serial numbers).*

---

## 3. Data Sharing Summary

| Question | Console Answer | Verification |
|---|---|---|
| Does your app share user data with other companies or organizations? | **No** | Zero third-party ad networks, tracking SDKs, or data brokers are integrated. |
| Is data sold to data brokers? | **No** | Absolute zero data monetization. |
| Is data used for third-party advertising? | **No** | FitTrack contains zero ads and zero ad trackers. |
| Is data used for tracking across other apps/websites? | **No** | No cross-app tracking. |

---

## 4. Security Practices Summary

1. **Encryption in Transit**: All data transmitted to Google Gemini API (AI analysis), Firebase Authentication/Firestore (cloud backup), or Open Food Facts (barcode lookup) is encrypted using industry-standard TLS/HTTPS protocols.
2. **Local Key Storage**: API keys provided by the user are stored in hardware-backed secure storage (`expo-secure-store` / Android KeyStore) and are excluded from backups.
3. **Data Deletion Mechanism**:
   - Cloud account & cloud backups: 1-tap complete deletion inside **Account -> Delete Account & Cloud Data**.
   - Local data: Erased via Android App Settings -> Clear Storage or app uninstallation.
4. **Child Safety Compliance**: FitTrack is designed for general audiences aged 14 and older; no targeted marketing to children.
