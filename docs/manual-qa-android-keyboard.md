# Manual QA Checklist: Android Keyboard & Edge-to-Edge Layout

> **Status Notice:** This checklist documents the required manual verification procedure for Android keyboard interactions. As automated test suites cannot simulate native Android IME (Input Method Editor) window insets or `adjustResize` transitions, **these tests must be performed on a physical Android device or official Android emulator**. Do not claim these items are verified without manual execution.

---

## 1. Technical Context (Expo SDK 57 & React Native 0.86.3)

In `app.json`, FitTrack configures:
```json
"android": {
  "softwareKeyboardLayoutMode": "resize"
}
```
In Android, `"resize"` maps to `android:windowSoftInputMode="adjustResize"`. Under this configuration:
- The Android OS window frame automatically shrinks when the virtual keyboard appears.
- Using `behavior="padding"` or `behavior="height"` on Android causes **double resizing** (the native OS window shrinks *and* React Native adds padding), resulting in large blank gaps, jarring layout jumps, or pushed-off-screen buttons.
- Therefore, all form views across the app implement:
  ```tsx
  behavior={Platform.OS === 'ios' ? 'padding' : undefined}
  ```
  This allows Android's native window resize to cleanly manage keyboard offsets while preserving iOS padding behavior.

---

## 2. Test Environment Setup

- **Target OS:** Android 13, Android 14, or Android 15.
- **Navigation Modes to test:**
  - Gesture Navigation (default on modern Android).
  - 3-button Navigation (Back, Home, Recents).
- **Virtual Keyboards to test:**
  - Gboard (default Google keyboard).
  - Samsung Keyboard (if testing on Samsung hardware).

---

## 3. Screen-by-Screen QA Test Matrix

### A. Coach Screen (`src/screens/CoachScreen.tsx`)
1. **Focus Chat Composer:**
   - Tap the "Ask a nutrition question" text field at the bottom.
   - **Verify:** Keyboard opens smoothly; the chat input bar and Send button remain fully visible directly above the keyboard. No gap or extra padding appears below the composer.
2. **Scroll Interaction:**
   - While the keyboard is open, scroll the chat history upwards and downwards.
   - **Verify:** Tapping outside the input or dragging the chat list dismisses the keyboard (`keyboardShouldPersistTaps="handled"`).
3. **Multiline Input & Send:**
   - Enter a multi-line query (3-4 lines of text).
   - Tap the Send button.
   - **Verify:** Keyboard stays open or closes as expected, input resets to single-line height, and the skeleton/response bubble renders without layout clipping.

### B. Add Food Sheet (`src/components/addfood/AddFoodSheet.tsx`)
1. **Search Input:**
   - Open the Add Food bottom sheet.
   - Tap the food search input field.
   - **Verify:** The sheet remains grounded, the search input is not pushed off top of screen, and search suggestions remain visible and scrollable.
2. **Custom Food Modal:**
   - Switch filter to "Custom" -> tap "Create Custom Food".
   - Tap into "Food Name", then "Serving size", "Calories", "Protein", "Carbs", "Fat".
   - **Verify:** The modal card centers or shifts upward without clipping the save/cancel buttons; tapping "Next" on keyboard moves focus between fields without jumping.
3. **Save as Template Modal:**
   - Select meals -> tap "Save as Template".
   - Tap template name input.
   - **Verify:** The modal dialog stays centered above the soft keyboard; no double offset.

### C. Add Workout Sheet (`src/components/AddWorkoutSheet.tsx`)
1. **Field Traversal:**
   - Tap "Log Workout".
   - Tap "Workout Title" -> "Duration (minutes)" -> "Calories Burned" -> "Notes".
   - **Verify:** Each field is focused cleanly; numeric keyboard appears for duration and calories; the "Save Workout" button remains reachable by scrolling.
2. **Keyboard Dismissal:**
   - Tap outside the input or swipe down.
   - **Verify:** Soft keyboard closes cleanly without leaving an empty blank window space at the bottom.

### D. Supplements Screen (`src/screens/SupplementsScreen.tsx`)
1. **Add/Edit Supplement Modal:**
   - Tap "+ Add Supplement" (or edit an existing one).
   - Focus "Supplement Name", "Dosage", and "Notes".
   - **Verify:** Modal card adjusts to keyboard height; dosage and unit fields stay visible; action buttons ("Save" / "Cancel") remain accessible.

---

## 4. Verification Sign-Off Table

| Device Model | Android Version | Navigation Bar Type | Tester Name | Date | Result (Pass/Fail) | Notes |
|---|---|---|---|---|---|---|
| *Pixel 7 / 8* | *Android 14* | *Gesture* | *Pending physical QA* | *Unverified* | ⏳ Pending | Awaiting physical device test |
| *Galaxy S23* | *Android 14* | *3-Button* | *Pending physical QA* | *Unverified* | ⏳ Pending | Awaiting physical device test |
