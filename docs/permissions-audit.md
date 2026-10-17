# FitTrack v4 — Android Permissions Audit & Manifest Security Report

This document details the complete audit of all Android permissions in FitTrack v4 (`com.fittrack.expo`), including justification for active permissions and verification of blocked/removed permissions.

---

## 1. Active Android Permissions

| Permission | Source / Plugin | Purpose & Justification | Scope & Protection Level |
|---|---|---|---|
| `android.permission.CAMERA` | `expo-camera` | Required for scanning barcode UPC/EAN labels on packaged foods and taking meal photos for AI analysis. | Dangerous (Runtime prompt requested only when user opens camera). |
| `android.permission.INTERNET` | React Native Core | Required for Open Food Facts barcode lookup, optional Google Gemini API calls, and optional encrypted cloud backup. | Normal (Granted at install time). Offline tracking works without it. |
| `android.permission.RECEIVE_BOOT_COMPLETED` | `app.json` (`permissions`) | Re-registers scheduled local notifications (meal log reminders and hydration reminders) when the device boots. | Normal. |
| `android.permission.VIBRATE` | `expo-haptics` | Delivers subtle tactile feedback upon successful barcode recognition, goal milestones, and user actions. | Normal. |
| `android.permission.READ_EXTERNAL_STORAGE` | `expo-image-picker` | Allows picking existing meal photos from the photo gallery on Android 12 (API 32) and older. | Scoped with `maxSdkVersion="32" tools:replace="android:maxSdkVersion"`. Android 13+ uses system Photo Picker with zero permissions. |
| `android.permission.WRITE_EXTERNAL_STORAGE` | `expo-file-system` | Enables saving manual JSON backup export files on Android 12 (API 32) and older. | Scoped with `maxSdkVersion="32" tools:replace="android:maxSdkVersion"`. |
| `android.permission.health.READ_STEPS` | `@appeeky/expo-healthkit` | Reads daily step count from Android Health Connect to compute active calorie burn and dynamic energy budget. | Dangerous / Health Connect Permission. Read-only (no write permissions requested). |

---

## 2. Blocked & Removed Permissions

The following permissions were evaluated and explicitly removed using `android.blockedPermissions` in `app.json` (`tools:node="remove"` in merged manifest):

| Permission | Originating Source | Reason for Removal | Enforcement Mechanism |
|---|---|---|---|
| `android.permission.RECORD_AUDIO` | Default transitive dependency of `expo-camera` | FitTrack only uses the camera for still photography and barcode reading. Microphone access is never needed. | `"microphonePermission": false` in `expo-camera` plugin and `android.permission.RECORD_AUDIO` in `blockedPermissions`. |
| `android.permission.SYSTEM_ALERT_WINDOW` | React Native debug tools | Used only for developer overlay menus during development. Unneeded and risky for release APKs. | `android.permission.SYSTEM_ALERT_WINDOW` in `blockedPermissions`. |

---

## 3. Manifest Verification Output

Generated manifest snippet (`android/app/src/main/AndroidManifest.xml`):

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android" xmlns:tools="http://schemas.android.com/tools">
  <uses-permission android:name="android.permission.CAMERA"/>
  <uses-permission android:name="android.permission.INTERNET"/>
  <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" tools:replace="android:maxSdkVersion"/>
  <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED"/>
  <uses-permission android:name="android.permission.RECORD_AUDIO" tools:node="remove"/>
  <uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" tools:node="remove"/>
  <uses-permission android:name="android.permission.VIBRATE"/>
  <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="32" tools:replace="android:maxSdkVersion"/>
  <uses-permission android:name="android.permission.health.READ_STEPS"/>
```

---

## 4. Privacy Alignment

- Zero location permissions (`ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`).
- Zero background audio permissions.
- Zero telephony or SMS permissions.
- Zero contact or calendar access permissions.
- Health Connect access is strictly limited to `READ_STEPS`.
