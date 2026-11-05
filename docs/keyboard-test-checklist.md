# Android Edge-to-Edge Keyboard Test Checklist

This checklist documents the manual testing procedures required to verify edge-to-edge soft keyboard handling across FitTrack v4 on physical Android devices.

Tested with `react-native-keyboard-controller` under Android 15/14/13 edge-to-edge layout, status bar translucency, and navigation bar translucency.

---

## 1. Physical Device Test Configurations

Verify on at least two Android device configurations:
1. **3-Button Navigation Bar** (Settings -> System -> Navigation Mode -> 3-button navigation). This is the most error-prone layout for keyboard inset calculation.
2. **Gesture Navigation** (Settings -> System -> Navigation Mode -> Gesture navigation).
3. **Display Modes**:
   - Dark Theme & Light Theme.
   - RTL Layout (Arabic `ar` or Kurdish Sorani `ckb`).

---

## 2. Interactive Verification Matrix

| # | Screen / Modal | Component File | Target Input | Expected Behavior | Manual Verification Steps |
|---|---|---|---|---|---|
| 1 | **Coach Screen** | `src/screens/CoachScreen.tsx` | Message Composer TextInput at bottom | Input floats cleanly above the keyboard without covering the text field or Send button. | 1. Open Coach tab.<br>2. Switch to Chat subview.<br>3. Tap message composer input.<br>4. Verify the input remains fully visible and doesn't bounce into infinite space.<br>5. Type multi-line message and verify Send button is pressable. |
| 2 | **AI Setup Wizard** | `src/components/AiSetupWizardModal.tsx` | Gemini API Key TextInput | `KeyboardAwareScrollView` adjusts scroll offset without creating infinite black scroll space below "Save & Finish". | 1. Open Profile -> AI Coach Settings (or First-Run Onboarding Step 4).<br>2. Tap the API key input.<br>3. Scroll down to bottom.<br>4. Confirm the scroll stops immediately after the action buttons ("Save & Finish" / "Use without AI") with standard padding, and does NOT permit scrolling hundreds of pixels into empty black space. |
| 3 | **First-Run Onboarding** | `src/components/OnboardingModal.tsx` | Height, Weight, Age, Custom Goals | Input fields smoothly elevate above keyboard; Next/Back buttons remain accessible. | 1. Clear app data or test fresh install.<br>2. At Step 2 (Metrics), tap Weight or Height input.<br>3. Confirm active input is focused and visible.<br>4. Tap "Next" and verify smooth transition. |
| 4 | **Add Food Sheet** | `src/components/addfood/AddFoodSheet.tsx` | Food Search Bar & Custom Quantity Input | Search bar remains visible; search results scroll comfortably above keyboard. | 1. Tap (+) on Dashboard or Diary.<br>2. Tap the search bar.<br>3. Type a query (e.g. "chicken").<br>4. Tap a food item to open portion selector.<br>5. Tap custom gram input; verify keyboard does not conceal input. |
| 5 | **Add Custom Food Modal** | `src/components/addfood/AddFoodCustomModal.tsx` | Food name, kcal, protein, carbs, fat | Card stays centered and shifts upward; all macro inputs are accessible. | 1. In Add Food Sheet, tap "Custom".<br>2. Tap each nutrition input (Kcal, Protein, Carbs, Fat).<br>3. Verify modal remains visible and Save button can be tapped. |
| 6 | **Quick Add Modal** | `src/components/addfood/AddFoodQuickAddModal.tsx` | Quick Calories, Carbs, Protein, Fat | Modal elevates above keyboard; numpad input doesn't obscure action buttons. | 1. In Add Food Sheet, tap "Quick Add".<br>2. Tap Calories input.<br>3. Verify keypad does not overlap Save button. |
| 7 | **Meal Template Modal** | `src/components/addfood/AddFoodTemplateModal.tsx` | Template Name TextInput | Input stays in view; keyboard dismisses on save or outside tap. | 1. In Add Food Sheet, tap "Save Template".<br>2. Tap Template Name input.<br>3. Enter name and tap "Save". |
| 8 | **Add Workout Sheet** | `src/components/AddWorkoutSheet.tsx` | Exercise Search, Duration, Calories Burned | Duration and Calorie inputs shift above keyboard; Save button remains pressable. | 1. From Diary or Dashboard, tap Add Workout.<br>2. Select a workout or enter custom.<br>3. Focus duration and calories inputs.<br>4. Verify keyboard avoidance avoids clipping. |
| 9 | **Supplement Modal** | `src/components/supplements/SupplementModal.tsx` | Supplement Search, Dosage, Notes | Dosage input and category selectors remain fully scrollable and visible. | 1. Open Supplements screen or sheet.<br>2. Tap "Add Supplement".<br>3. Tap "Dosage" or "Notes" input.<br>4. Verify sheet elevates and avoids keyboard clipping. |
| 10 | **Nutrient Detail Goal Edit** | `src/components/NutrientDetailModal.tsx` | Custom Nutrient Target Input | Input row shifts up smoothly; "Save Target" button remains accessible. | 1. In Diary, tap any nutrient breakdown (e.g. Protein, Fiber, Sodium).<br>2. Tap "Edit Target".<br>3. Tap numeric target input.<br>4. Check that keyboard does not cover Save button. |
| 11 | **Weigh-in Record Modal** | `src/screens/ProgressScreen.tsx` | Weight (kg/lb) and Notes Input | Weigh-in card elevates smoothly; Save Weigh-in button is fully visible. | 1. Open Progress tab.<br>2. Tap "+ Record Weigh-in".<br>3. Tap Weight input.<br>4. Tap Notes input.<br>5. Confirm Save button is visible above keyboard. |
| 12 | **Request Food Modal** | `src/components/RequestFoodModal.tsx` | Food Name, Brand, Details Input | Sheet raises above keyboard with full multi-line input visibility. | 1. In Add Food Sheet, scroll to bottom and tap "Request a food".<br>2. Tap Food Name, then Details textarea.<br>3. Verify submit buttons remain visible. |
| 13 | **Account / Backup Screen** | `src/screens/AccountScreen.tsx` | Email & Password TextInputs | Form fields scroll cleanly; "Sign In" / "Create Account" buttons stay reachable. | 1. Open Profile -> Account.<br>2. Tap Email input, then Password input.<br>3. Confirm form scrolls and keyboard doesn't obstruct submit button. |
| 14 | **Steps Screen** | `src/screens/StepsScreen.tsx` | Manual Step Count & Step Goal Input | Inputs elevate above navigation bar and soft keyboard. | 1. Open Steps screen from Dashboard.<br>2. Tap "Log Steps" or "Edit Goal".<br>3. Enter number; confirm save button accessibility. |
| 15 | **Profile Screen** | `src/screens/ProfileScreen.tsx` | Weight, Height, Target Calorie Inputs | Scroll position adjusts smoothly; no jitter or blank areas. | 1. Open Profile screen.<br>2. Tap Weight, Height, or Calorie Goal fields.<br>3. Check smooth keyboard appearance and absence of infinite blank space. |

---

## 3. Specific Regression Checks

- [ ] **No Infinite Black Scroll Space**: Ensure that in `AiSetupWizardModal` and `OnboardingModal`, dragging downwards past the last button stops at normal padding (48dp) and does NOT reveal a massive empty black viewport.
- [ ] **Edge-to-Edge Navigation Bar**: On devices with 3-button navigation, ensure the bottom row of inputs or buttons is NOT concealed behind the translucent navigation bar when the keyboard opens and closes.
- [ ] **Hardware Back Button**: Pressing the Android hardware back button when the keyboard is open should dismiss the keyboard first; a second press should dismiss or navigate back.
- [ ] **RTL Mirroring**: Test in Arabic or Kurdish Sorani; verify keyboard push does not cause layout flipping or misalignment.
