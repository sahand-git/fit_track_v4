# FitTrack v4 — Crash Reporting Evaluation: Sentry vs Firebase Crashlytics

This document evaluates crash reporting solutions for FitTrack v4 on **Expo SDK 57** (React Native 0.86, React 19, New Architecture / Hermes).

---

## 1. Architectural & Ecosystem Comparison

| Dimension | Sentry (`@sentry/react-native`) | Firebase Crashlytics (`@react-native-firebase/crashlytics`) |
|---|---|---|
| **Official Expo Support** | **First-class Expo Config Plugin**. Expo officially recommends `@sentry/react-native`. | Community-supported via `@react-native-firebase/app` config plugin. Requires native Google Services gradle plugin. |
| **Native Dependency Weight** | **Lighter** (~4–5 MB binary impact). Self-contained Sentry native SDK. | **Heavier** (~9–12 MB binary impact). Requires Google Play Services, Firebase Core, Firebase Installations, and Google Services Gradle plugin. |
| **Configuration Complexity** | Simple single config plugin in `app.json`. DSN can be passed via environment or configuration without committing credentials. | Requires committing or generating `google-services.json` (Android) and `GoogleService-Info.plist` (iOS). Build will fail in clean CI without mock/valid config files. |
| **Offline-First Resilience** | Native offline caching queue that flushes upon network reconnection. | Offline caching queue via Firebase Core. |
| **Data Privacy & Control** | Supports `beforeSend` callback on client to redact all PII, health, and API key data before payloads leave the device. | Supports custom keys/logs, but automatic breadcrumb collection requires deep disabling to prevent screen/touch logging. |
| **Account / Vendor Lock-in** | Can be self-hosted (open source Sentry server) or used with sentry.io. | Hard-locked to Google Cloud / Firebase console. |

---

## 2. Recommendation & Decision

### Selected Approach: Sentry Architecture with Privacy-First Scrubbing
For Expo SDK 57, **Sentry is the lighter, cleaner, and better-aligned option**:
1. It does not force inclusion of Google Play Services or Firebase Core native modules into an offline-first app.
2. It does not require `google-services.json` at build time, preventing CI breaks on clean open-source checkouts.
3. It has direct native integration with Expo Prebuild via `expo-module` architecture.

### FitTrack Privacy Isolation Layer
Regardless of the remote transport, health applications must guarantee that sensitive biometric and nutritional logs are never uploaded. FitTrack introduces an abstraction layer (`src/services/crashReportingService.ts`) with:
1. **Strict User Consent**: Disabled by default (`enableCrashReporting: false`). Can be enabled during first-run or toggled in Profile settings.
2. **Deep Privacy Sanitization**:
   - Strips all API keys (`AIza...`, custom tokens).
   - Strips all food item names, portion sizes, calorie values, macronutrients, and micronutrient totals.
   - Strips user email, name, and biometric measurements (height, weight, age).
   - Preserves only generic technical diagnostics: Error class, sanitized message, component stack, OS name, and app version.
