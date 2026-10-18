# Google Services and Google Sign-In Setup Guide

This guide details how to configure Firebase, Google Cloud, and Google Sign-In (`react-native-nitro-google-signin`) for FitTrack v4 release builds (`com.fittrack.expo`).

---

## 1. Where to Get `google-services.json`

1. Open the [Firebase Console](https://console.firebase.google.com/) and select your project (e.g. `fit-track-v4`).
2. Navigate to **Project settings** (gear icon next to Project Overview) → **General** tab.
3. Scroll down to the **Your apps** section:
   - If you have not created an Android app yet:
     - Click **Add app** → Select the **Android** platform icon.
     - Enter the Android package name: **`com.fittrack.expo`** (must match `app.json` exactly).
     - Enter an app nickname (e.g. `FitTrack Android`).
     - Click **Register app**.
   - If your Android app already exists, select **`com.fittrack.expo`**.
4. Click **Download google-services.json** to save the file to your computer.

---

## 2. How to Base64-Encode `google-services.json`

For GitHub Actions CI builds, the `google-services.json` file is passed as a repository secret (`GOOGLE_ANDROID_SERVICES_JSON_BASE64`).

### On macOS / Linux:
```bash
# macOS
base64 -i google-services.json -o google-services.b64.txt

# Linux (Ubuntu / Debian / WSL)
base64 -w 0 google-services.json > google-services.b64.txt
```

### On Windows (PowerShell):
```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("google-services.json")) | Set-Content google-services.b64.txt
```

### Add to GitHub Secrets:
1. Go to your GitHub repository → **Settings** → **Secrets and variables** → **Actions**.
2. Click **New repository secret**.
3. Name: `GOOGLE_ANDROID_SERVICES_JSON_BASE64`
4. Value: Paste the entire base64 string from `google-services.b64.txt`.
5. Click **Add secret**.

---

## 3. Registering the SHA-1 Fingerprint (Preventing `DEVELOPER_ERROR` 10)

### Why Status 10 (`DEVELOPER_ERROR`) Happens:
Google Sign-In on Android uses Google Play Services / Android Credential Manager. Before releasing an OAuth token to the application, Google Play Services computes the SHA-1 hash of the certificate used to sign the APK and validates it against the registered Android OAuth 2.0 clients in your Google Cloud / Firebase project.

If the SHA-1 of the signing keystore is **not** registered in the Firebase Console:
- Google Play Services aborts the request immediately.
- The Nitro module / Google API returns error code **10** (`CommonStatusCodes.DEVELOPER_ERROR`).
- The app displays: `Google sign-in developer configuration mismatch (Code 10). Ensure release keystore SHA-1 is registered in Firebase Console.`

### Obtaining the SHA-1 Fingerprint:

#### Option A: From GitHub Actions Build Logs
When GitHub Actions runs the `Build FitTrack v4 Android APK` workflow, the step **Configure Production Release Signing Keys** automatically runs `keytool` and outputs the certificate fingerprints into the workflow log:
```
=== RELEASE KEYSTORE SIGNING CERTIFICATE FINGERPRINTS ===
Certificate fingerprints:
  SHA1: AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD
  SHA256: 01:23:45:67:89:AB:CD:EF:...
```

#### Option B: From your Local Keystore
If you have the `release.keystore` locally:
```bash
keytool -list -v -keystore release.keystore -alias fittrack-release-key
```
Look for `SHA1:` under `Certificate fingerprints:`.

### Adding the SHA-1 to Firebase Console:
1. In [Firebase Console](https://console.firebase.google.com/), open **Project settings** → **General**.
2. Under **Your apps**, click on the **`com.fittrack.expo`** Android app.
3. Under **SHA certificate fingerprints**, click **Add fingerprint**.
4. Paste the **SHA-1** fingerprint and click **Save**.
5. *(Recommended)* Click **Add fingerprint** again and add the **SHA-256** fingerprint as well.
6. **Important:** If you use Google Play App Signing (Play Store internal/closed/production tracks), you must also copy the **App signing key certificate SHA-1** from Google Play Console (**Setup** → **App Integrity**) into the Firebase Console fingerprints list.

> [!NOTE]
> After adding a new SHA-1 fingerprint in Firebase Console, download an updated `google-services.json` and update `GOOGLE_ANDROID_SERVICES_JSON_BASE64` in GitHub Secrets so the native configuration file includes the new client entry.

---

## 4. Setting `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`

### Why a Web Client ID is Required:
Even though the app runs on Android, Firebase Authentication uses Google One Tap / Credential Manager to verify the user with the backend. The native sign-in client needs the OAuth 2.0 **Web application (server) client ID** to exchange the Google ID token with Firebase Auth (`GoogleAuthProvider.credential(idToken)`).

If `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` is missing:
- Google One Tap / Nitro sign-in will fail with `Missing Google Web Client ID`.

### Where to Find the Web Client ID:
1. **From Firebase Console:**
   - Go to **Authentication** → **Sign-in method** → click on the **Google** provider.
   - Expand the **Web SDK configuration** accordion.
   - Copy the value from the **Web client ID** field (ends with `.apps.googleusercontent.com`).
2. **From `google-services.json`:**
   - Open `google-services.json`.
   - Look inside `client[0].oauth_client` array for an entry with `"client_type": 3`.
   - Copy the `"client_id"` string:
     ```json
     {
       "client_type": 3,
       "client_id": "1234567890-abcdefg123456.apps.googleusercontent.com"
     }
     ```

### Configuring the Web Client ID:
- **In local development (`.env`):**
  ```env
  EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=1234567890-abcdefg123456.apps.googleusercontent.com
  ```
- **In GitHub Actions (Repository Secrets):**
  - Name: `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
  - Value: `1234567890-abcdefg123456.apps.googleusercontent.com`

---

## 5. In-App Setup Verification

FitTrack includes an on-device diagnostic check to help you verify configuration before attempting sign-in:

1. Open FitTrack and navigate to **Profile** → **Account**.
2. Tap **Account setup check** to expand the diagnostic panel.
3. Verify that:
   - **Firebase configured:** `Yes`
   - **Google Web Client ID:** `Configured`
   - **Nitro Google module:** `Loaded`
   - **Play Services:** `Available`
   - **Package name:** `com.fittrack.expo`
4. Tap **Copy diagnostics** to copy the scrubbed diagnostic details to the clipboard if needed for debugging.
