# FitTrack v4 — React Native & Expo

FitTrack v4 is a high-performance cross-platform fitness, nutrition, and calorie tracking mobile application rewritten from scratch using **React Native** and **Expo**.

---

## 🚀 Key Features

- **Metabolic Calorie Budget Engine**: Basal Metabolic Rate (BMR) and Total Daily Energy Expenditure (TDEE) calculated via the scientifically validated **Mifflin-St Jeor Equation**.
- **Interactive Calorie & Macro Ring**: Native SVG concentric progress rings for daily caloric target completion and protein goals with smooth gradients.
- **Consistent Macro Target Cards**: The standardized 4 target cards (*Daily Target*, *Protein*, *Carbohydrates*, *Fat*) in the *Label → Value → Unit* layout.
- **Offline Verified Food Database**: Instant search and logging for staples, proteins, grains, fruits, and Middle Eastern foods with customizable serving counts.
- **Hydration Tracker**: Interactive water glass logging with tactile haptic feedback.
- **Local Persistence**: Powered by `@react-native-async-storage/async-storage` for offline meal logging and profile preservation.
- **Theme**: Premium dark mode (`#090D16`) with emerald (`#10B981`) and amber (`#F59E0B`) accents.

---

## 📱 How to Run on Your Phone (Expo Go)

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Start Expo Development Server**:
   ```bash
   npx expo start
   ```

3. **Open on Device**:
   - **Android**: Open the **Expo Go** app on your phone and scan the QR code displayed in the terminal.
   - **iOS**: Scan the QR code using the iOS Camera app to open in **Expo Go**.
   - **Web**: Press `w` in the terminal to run in the web browser.

---

## 🛠 Tech Stack

- **Framework**: React Native 0.86 & Expo SDK 57
- **Language**: TypeScript
- **Icons**: Lucide React Native (`lucide-react-native`)
- **Graphics**: React Native SVG (`react-native-svg`)
- **Storage**: Async Storage (`@react-native-async-storage/async-storage`)
- **Haptics**: Expo Haptics (`expo-haptics`)
