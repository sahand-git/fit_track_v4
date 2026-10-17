# FitTrack v4 — End-to-End Onboarding Flow & First-Run Review

This document specifies the complete first-run journey for FitTrack v4, verifying screen ordering, navigation paths, user privacy consent, back/skip behavior, and hardware back button handling.

---

## Architecture & Gate Order

When FitTrack launches on a fresh install or clean state, `App.tsx` evaluates two sequential gating flags:

```
App Launch
   │
   ▼
[ Medical Disclaimer Accepted? ]
   ├─ NO ──► Screen 0: Medical Disclaimer & Scientific References
   └─ YES ─► [ Is Onboarded? ]
               ├─ NO ──► Screen 1 to 4: 4-Step Onboarding Modal
               └─ YES ─► Main 4-Tab Navigation (Today Dashboard)
```

---

## Screen Sequence & Detailed Breakdown

### Screen 0: Medical Disclaimer & Scientific References
- **Trigger**: `!profile.hasAcceptedMedicalDisclaimer`
- **Purpose**: Establishes that FitTrack is an educational, self-directed wellness tool and does not provide medical or clinical advice.
- **Components**:
  - Educational notice emphasizing evidence-based nutrition principles.
  - Link to **Scientific References Modal** citing WHO, EFSA, USDA FoodData Central, Mifflin-St Jeor, and ISSN consensus guidelines.
  - Interactive "Scientific References" view:
    - Back action returns directly to the disclaimer modal with no state loss.
  - "I Understand & Accept" button:
    - Stores persistent acceptance in `@fittrack_disclaimer_accepted`.
    - Updates `profile.hasAcceptedMedicalDisclaimer = true`.
    - Automatically advances to Screen 1.

---

### Screen 1: Baseline Measurements (Step 1 of 4)
- **Title**: *Let’s set your baseline*
- **Subtitle**: *We use the Mifflin-St Jeor equation to estimate your basal metabolic rate and daily calorie needs.*
- **Header Controls**:
  - Dynamic language selector: English (`en`), Arabic (`ar`), and Kurdish Sorani (`ckb`). Tapping switches the entire UI and RTL/LTR layout instantly.
  - Progress badge: *Step 1 of 4*.
- **Inputs & Validation**:
  - **Name**: User display name (defaults to "Champion" if left blank).
  - **Biological Sex**: Radio chips (`Male` / `Female`).
  - **Weight (kg)**: Numeric input (bounded between 30 kg and 300 kg, default: 75 kg).
  - **Height (cm)**: Numeric input (bounded between 100 cm and 250 cm, default: 178 cm).
  - **Age**: Numeric input (bounded between 14 and 100, default: 26).
- **Navigation**:
  - Forward: "Continue" button transitions to Step 2.
  - Hardware Back (Android): Ignored at Step 1 (`return false`), delegating to system root without crashing or dead-ending.

---

### Screen 2: Routine & Fitness Goal (Step 2 of 4)
- **Title**: *Your Routine & Goal*
- **Subtitle**: *Activity determines your total energy expenditure. Goals shape your caloric budget.*
- **Inputs**:
  - **Activity Level** (Single Select with description cards):
    - *Sedentary*: Desk job, little to no exercise (1.2× BMR multiplier).
    - *Lightly Active*: Light exercise 1–3 days/week (1.375× BMR multiplier).
    - *Moderately Active*: Moderate training 3–5 days/week (1.55× BMR multiplier).
    - *Very Active*: Intense training 6–7 days/week (1.725× BMR multiplier).
  - **Fitness Goal** (Single Select with delta badges):
    - *Aggressive Fat Loss*: −500 kcal daily deficit.
    - *Steady Fat Loss*: −300 kcal sustainable deficit.
    - *Maintain Weight*: Energy balance & recomposition (0 kcal delta).
    - *Lean Bulk*: +250 kcal controlled surplus.
    - *Muscle Gain*: +450 kcal muscle building.
- **Navigation**:
  - Back: "Back" button transitions to Step 1.
  - Hardware Back (Android): `BackHandler` captures and returns to Step 1.
  - Forward: "Review Plan" button transitions to Step 3.

---

### Screen 3: Plan Review & Telemetry Consent (Step 3 of 4)
- **Title**: *Your Daily Budget*
- **Subtitle**: *Here is your calculated nutrition estimate based on your measurements.*
- **Displays**:
  - **Estimated Daily Target**: Total calculated daily kcal based on Mifflin-St Jeor formula.
  - **Energy Balance Summary**: Explicit breakdown of Basal Metabolic Rate (BMR) and Total Daily Energy Expenditure (TDEE).
  - **Target Macronutrient Split**:
    - Protein target (g) based on 1.8–2.2 g/kg lean mass recommendation.
    - Carbs target (g) based on remaining energy balance.
    - Fat target (g) based on essential fatty acid floor (0.8–1.0 g/kg).
- **Privacy & Telemetry Consent**:
  - **Anonymous Crash Reporting Toggle**:
    - Clearly marked as strictly opt-in (default: OFF).
    - Explains that only anonymous stack traces are collected to diagnose crashes; meal logs, health entries, and keys are strictly excluded.
- **Navigation**:
  - Back: "Back" button transitions to Step 2.
  - Hardware Back (Android): `BackHandler` captures and returns to Step 2.
  - Forward: "Next: AI Setup (Optional)" button transitions to Step 4.

---

### Screen 4: Optional Gemini AI Setup Wizard (Step 4 of 4)
- **Title**: *Bring Your Own Gemini Key (Optional)*
- **Subtitle**: *Enhance FitTrack with AI-powered meal photo analysis and natural language logging. 100% private and stored locally.*
- **Security & Privacy Guarantee**:
  - Explicit explanation in English, Arabic, and Kurdish that FitTrack never charges for AI features.
  - API keys are stored in hardware-backed secure storage (`expo-secure-store`) and never sent to any intermediary server or logged in telemetry.
- **Interactive Controls**:
  - **Get an API Key**: Button opens Google AI Studio (`https://aistudio.google.com/app/apikey`) directly in browser.
  - **Key Input**: Obscured text field with clipboard paste support.
  - **Test Connection Button**:
    - Verifies connectivity directly against Google Gemini endpoints.
    - Displays active model (`gemini-2.5-flash`) on success.
    - Displays kind-specific friendly troubleshooting on failure (Quota Exceeded, Invalid Key, Region Unsupported, Network Offline).
- **Navigation & Zero Dead-Ends**:
  - **Skip Button**: Allows immediate progression without setting an API key. FitTrack remains 100% operational in offline mode.
  - **Done / Complete Button**: Saves valid key and finishes onboarding.
  - **Back Button**: Returns to Step 3 with all previous selections preserved.
  - **Hardware Back (Android)**: `BackHandler` captures and returns to Step 3.

---

## Onboarding Completion & State Handoff

When the user taps "Skip" or "Done" on Step 4:
1. `handleFinish()` builds the complete `UserProfile`:
   - Name, age, gender, height, weight.
   - Activity level, fitness goal.
   - Mifflin-St Jeor target calories, target protein, carbs, fat.
   - Daily water target glasses (calculated as `Math.round(weightKg * 35 / 250)`).
   - Selected app language (`en`, `ar`, or `ckb`).
   - Crash reporting consent boolean (`enableCrashReporting`).
   - Flag `isOnboarded: true`.
2. Triggers light success haptic feedback.
3. Saves the profile to `@fittrack_profile` via `saveUserProfile()`.
4. Saves crash reporting consent state to `@fittrack_crash_reporting_consent`.
5. Transitions smoothly into the main 4-tab app with the Today dashboard fully populated.

---

## Verification & Safety Checklist

| Requirement | Implementation Status | Verification |
|---|---|---|
| Medical Disclaimer first-run gate | Gated before step 1 in `App.tsx` | Verified |
| 3-language switcher | Instant RTL/LTR toggle on Step 1 | Verified (`localizationScanner.test.ts` passes) |
| Non-destructive back navigation | Back buttons on Steps 2, 3, 4 | Verified (preserves all inputs) |
| Android Hardware Back navigation | `BackHandler.addEventListener` on steps 2–4 | Verified (steps decrement cleanly) |
| Zero dead-ends on optional AI | Skippable button and Done button | Verified |
| Touch target compliance | All buttons have 48dp minimum hitSlop | Verified (`scripts/auditAccessibility.ts` 0 issues) |
| Contrast compliance | All text/surface pairs meet WCAG AA | Verified (10/10 contrast tests pass) |
