# FitTrack v4 — Android Release Build & Signing Guide

This guide details the end-to-end process for building, signing, verifying, and distributing standalone Android Release APKs for FitTrack v4.

---

## 1. Release Architecture Overview

FitTrack v4 uses an offline-first architecture built on Expo SDK 57 and React Native 0.86.
The release build process:
1. **Prebuild Generation**: `npx expo prebuild --platform android --clean` synthesizes the native Android Gradle project without requiring committed native code in the git repository.
2. **Release Signing Injection**: The `plugins/withReleaseSigning.js` Expo config plugin injects production release signing configuration into `android/app/build.gradle`.
3. **Standalone Compilation**: Hermes bytecode pre-compilation embeds all JavaScript, TypeScript, and local assets directly into `app-release.apk`.
4. **CI Automation**: GitHub Actions (`.github/workflows/build-apk.yml`) checks for repository signing secrets, decodes the release keystore, signs the release APK, verifies with `apksigner`, and publishes the release.

---

## 2. Version and versionCode Protocol

Android requires two distinct version identifiers configured in `app.json`:

```json
{
  "expo": {
    "version": "1.0.0",
    "android": {
      "package": "com.fittrack.expo",
      "versionCode": 1
    }
  }
}
```

- **`version` (String)**: Human-facing semantic version string (e.g., `1.0.0`, `1.0.1`, `1.1.0`). Shown in Profile settings and bug/feedback reports.
- **`versionCode` (Integer)**: Internal Android build number (e.g., `1`, `2`, `3`). Must strictly increase with every release uploaded to Google Play or distributed as an update.

### Version Bump Checklist
Before tagging or deploying a new release:
1. Increment `android.versionCode` by 1 in `app.json`.
2. Update `version` according to SemVer in `app.json` and `package.json`.
3. Run `npm test` and `npx tsc --noEmit` to verify type safety and test pass.

---

## 3. Generating a Production Release Keystore

The signing key authenticates your application and ensures update integrity.

> **CRITICAL SECURITY RULE**: Never commit `.keystore`, `.jks`, or credentials to Git. Keystore files and passwords must remain strictly local or in encrypted GitHub Secrets.

Generate a 2048-bit RSA keypair with 25+ years (10,000 days) validity:

```bash
keytool -genkeypair -v -storetype PKCS12 -keystore fittrack-release.keystore \
  -alias fittrack-key-alias -keyalg RSA -keysize 2048 -validity 10000
```

You will be prompted for:
- Keystore password (store securely in a password manager)
- Organization / Developer details
- Key password (or press enter to use the same password)

---

## 4. Configuring GitHub Repository Secrets

To enable signed release APK builds in GitHub Actions:

### Step 4.1: Convert Keystore to Base64
Encode the binary `.keystore` file to a single base64 string:

- **Linux / macOS**:
  ```bash
  base64 -w 0 fittrack-release.keystore > keystore-base64.txt
  ```

- **Windows PowerShell**:
  ```powershell
  [Convert]::ToBase64String([IO.File]::ReadAllBytes("fittrack-release.keystore")) | Set-Content keystore-base64.txt
  ```

### Step 4.2: Add Secrets to GitHub Repository
Go to your GitHub repository -> **Settings** -> **Secrets and variables** -> **Actions** -> **New repository secret**:

| Secret Name | Value Description |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | The complete text content from `keystore-base64.txt` |
| `ANDROID_KEYSTORE_PASSWORD` | The password you entered when creating the keystore |
| `ANDROID_KEY_ALIAS` | Key alias (e.g., `fittrack-key-alias`) |
| `ANDROID_KEY_PASSWORD` | Key password |

*Note: If these secrets are not configured in a fork, GitHub Actions automatically falls back to debug signing with a clear workflow warning, preventing build failure.*

---

## 5. Local Verification

### Step 5.1: Clean Prebuild Test
Verify that prebuild runs smoothly without manual intervention:
```bash
npx expo prebuild --platform android --no-install --clean
```
Expected output:
```
√ Finished prebuild
```

### Step 5.2: Local Signed Release Build
To test signed compilation locally:
1. Place `fittrack-release.keystore` in `android/app/release.keystore`.
2. Add the signing properties to `android/gradle.properties`:
   ```properties
   FITTRACK_RELEASE_STORE_FILE=release.keystore
   FITTRACK_RELEASE_STORE_PASSWORD=your_keystore_password
   FITTRACK_RELEASE_KEY_ALIAS=fittrack-key-alias
   FITTRACK_RELEASE_KEY_PASSWORD=your_key_password
   ```
3. Run:
   ```bash
   cd android
   ./gradlew assembleRelease --no-daemon
   ```
4. Output APK location:
   `android/app/build/outputs/apk/release/app-release.apk`

---

## 6. Verifying APK Signature (`apksigner`)

Verify that the output APK is signed with the expected certificate:

```bash
$ANDROID_HOME/build-tools/35.0.0/apksigner verify --verbose --print-certs app-release.apk
```

Expected verification output:
```
Verifies
Verified using v1 scheme (JAR signing): true
Verified using v2 scheme (APK Signature Scheme v2): true
Verified using v3 scheme (APK Signature Scheme v3): true
Number of signers: 1
Signer #1 certificate DN: CN=FitTrack Developer, ...
```

---

## 7. Clean-up Protocol

Generated `android/` and `ios/` folders are ignored by `.gitignore`.
If you generated them locally during verification, remove them prior to git staging:
```bash
# Windows PowerShell
Remove-Item -Recurse -Force android, ios -ErrorAction SilentlyContinue

# Unix / macOS
rm -rf android ios
```
