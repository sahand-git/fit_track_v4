import { getAuthErrorDetails, getAuthErrorMessage, formatAuthError } from './authService';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runAuthErrorMappingTests() {
  console.log('Starting Auth Error Mapping & Localization Unit Tests...');

  // 1. Google Sign-In specific outcomes
  {
    // Status 10 / DEVELOPER_ERROR
    const devErrObj = { code: 10 };
    const devErrDetails = getAuthErrorDetails(devErrObj);
    assert(devErrDetails.code === 'DEVELOPER_ERROR_10', 'Expected DEVELOPER_ERROR_10 for numeric code 10');
    assert(devErrDetails.message.includes('SHA-1'), 'Expected SHA-1 in developer error message');

    const devErrStr = new Error('ApiException: 10: [Status{statusCode=DEVELOPER_ERROR, resolution=null}]');
    assert(getAuthErrorDetails(devErrStr).code === 'DEVELOPER_ERROR_10', 'Expected DEVELOPER_ERROR_10 from status message');

    // Cancelled (12501 / user cancelled)
    const cancelObj = { type: 'cancelled' };
    const cancelDetails = getAuthErrorDetails(cancelObj);
    assert(cancelDetails.code === 'SIGN_IN_CANCELLED', 'Expected SIGN_IN_CANCELLED for type: cancelled');
    assert(cancelDetails.message === 'Google sign-in was cancelled.', 'Expected cancelled message');

    const cancel12501 = { code: '12501' };
    assert(getAuthErrorDetails(cancel12501).code === 'SIGN_IN_CANCELLED', 'Expected SIGN_IN_CANCELLED for 12501');

    // No saved credential found (16 / noSavedCredentialFound)
    const noCredObj = { type: 'noSavedCredentialFound' };
    const noCredDetails = getAuthErrorDetails(noCredObj);
    assert(noCredDetails.code === 'NO_SAVED_CREDENTIAL_FOUND', 'Expected NO_SAVED_CREDENTIAL_FOUND');
    assert(noCredDetails.message.includes('No saved Google credentials'), 'Expected no saved credentials message');

    // Play services unavailable (1, 2, 3, PLAY_SERVICES_NOT_AVAILABLE)
    const playErr = { code: 'PLAY_SERVICES_NOT_AVAILABLE' };
    const playDetails = getAuthErrorDetails(playErr);
    assert(playDetails.code === 'PLAY_SERVICES_NOT_AVAILABLE', 'Expected PLAY_SERVICES_NOT_AVAILABLE');
    assert(playDetails.message.includes('Google Play services'), 'Expected play services message');

    // Missing web client ID
    const webIdErr = new Error('Google Web Client ID is not configured.');
    assert(getAuthErrorDetails(webIdErr).code === 'MISSING_WEB_CLIENT_ID', 'Expected MISSING_WEB_CLIENT_ID from message');

    // Network error (7 / NETWORK_ERROR)
    const netErr = { code: 7 };
    assert(getAuthErrorDetails(netErr).code === 'NETWORK_ERROR', 'Expected NETWORK_ERROR for code 7');

    console.log('✓ Test 1 passed: All Google Sign-In outcome states correctly mapped.');
  }

  // 2. Firebase Auth codes
  {
    const firebaseCases = [
      { code: 'auth/invalid-email', expectedSub: 'valid email' },
      { code: 'auth/email-already-in-use', expectedSub: 'already exists' },
      { code: 'auth/weak-password', expectedSub: 'at least six' },
      { code: 'auth/invalid-credential', expectedSub: 'incorrect' },
      { code: 'auth/user-not-found', expectedSub: 'No account found' },
      { code: 'auth/wrong-password', expectedSub: 'incorrect' },
      { code: 'auth/user-disabled', expectedSub: 'disabled' },
      { code: 'auth/too-many-requests', expectedSub: 'Too many attempts' },
      { code: 'auth/network-request-failed', expectedSub: 'internet connection' },
      { code: 'auth/requires-recent-login', expectedSub: 'Sign in again' },
      { code: 'auth/popup-closed-by-user', expectedSub: 'cancelled' },
      { code: 'auth/account-exists-with-different-credential', expectedSub: 'original method' },
      { code: 'auth/operation-not-allowed', expectedSub: 'Firebase Console' },
    ];

    for (const item of firebaseCases) {
      const err = { code: item.code };
      const details = getAuthErrorDetails(err);
      assert(details.code === item.code, `Expected code ${item.code}`);
      assert(details.message.toLowerCase().includes(item.expectedSub.toLowerCase()), `Message for ${item.code} must include "${item.expectedSub}" (got: "${details.message}")`);
    }

    console.log('✓ Test 2 passed: All 13 Firebase Auth codes mapped to clear user messages.');
  }

  // 3. Application custom auth states
  {
    const appStates = [
      { msg: 'Email not verified yet. Cloud backup stays locked until verification.', expectedCode: 'EMAIL_NOT_VERIFIED' },
      { msg: 'Firebase is not configured yet.', expectedCode: 'FIREBASE_NOT_CONFIGURED' },
      { msg: 'No cloud backup exists for this account yet.', expectedCode: 'NO_BACKUP_EXISTS' },
      { msg: 'Cloud backup is too large. Export a local backup instead.', expectedCode: 'BACKUP_TOO_LARGE' },
      { msg: 'Sign in before using cloud backup.', expectedCode: 'AUTH_REQUIRED' },
      { msg: 'Your account changed. Sign in again and retry.', expectedCode: 'ACCOUNT_CHANGED' },
      { msg: 'Enter your current password to confirm account deletion.', expectedCode: 'PASSWORD_REQUIRED_FOR_DELETION' },
    ];

    for (const item of appStates) {
      const details = getAuthErrorDetails(new Error(item.msg));
      assert(details.code === item.expectedCode, `Expected ${item.expectedCode} for message "${item.msg}"`);
    }

    console.log('✓ Test 3 passed: Application-level auth states correctly mapped.');
  }

  // 4. Token, API key, and secret scrubbing guarantees
  {
    const leakyErr1 = { code: 'AIzaSySensitiveGoogleApiKey123456789' };
    const details1 = getAuthErrorDetails(leakyErr1);
    assert(!details1.code?.includes('AIzaSy'), 'Raw API key must never be reflected as technical code');
    assert(!details1.message.includes('AIzaSy'), 'Raw API key must never be in error message');

    const leakyErr2 = { code: 'auth_token_eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' };
    const details2 = getAuthErrorDetails(leakyErr2);
    assert(!details2.code?.includes('eyJ'), 'Raw JWT token must never be reflected as technical code');

    console.log('✓ Test 4 passed: Zero API key or token leakage in error code or message.');
  }

  // 5. Technical-code line formatting & multilingual localization
  {
    const err = { code: 'auth/user-not-found' };

    // Default formatting
    const formatted = getAuthErrorMessage(err);
    assert(formatted === 'No account found with this email.\n[Code: auth/user-not-found]', 'getAuthErrorMessage must append [Code: code]');

    // English localization
    const en = formatAuthError(err, 'en');
    assert(en === 'No account found with this email.\n[Code: auth/user-not-found]', 'formatAuthError English must match');

    // Arabic localization
    const ar = formatAuthError(err, 'ar');
    assert(ar.includes('لم يتم العثور على حساب بهذا البريد الإلكتروني.'), 'formatAuthError Arabic must be translated');
    assert(ar.includes('[Code: auth/user-not-found]'), 'formatAuthError Arabic must retain [Code: auth/user-not-found]');

    // Kurdish Sorani localization
    const ckb = formatAuthError(err, 'ckb');
    assert(ckb.includes('هیچ هەژمارێک بەم ئیمەیڵە نەدۆزرایەوە.'), 'formatAuthError Kurdish must be translated');
    assert(ckb.includes('[Code: auth/user-not-found]'), 'formatAuthError Kurdish must retain [Code: auth/user-not-found]');

    // Google DEVELOPER_ERROR_10 localization
    const devErr = { code: 'DEVELOPER_ERROR_10' };
    const arDev = formatAuthError(devErr, 'ar');
    assert(arDev.includes('SHA-1') && arDev.includes('[Code: DEVELOPER_ERROR_10]'), 'Arabic developer error with code');

    const ckbDev = formatAuthError(devErr, 'ckb');
    assert(ckbDev.includes('SHA-1') && ckbDev.includes('[Code: DEVELOPER_ERROR_10]'), 'Kurdish developer error with code');

    console.log('✓ Test 5 passed: Multilingual localization and technical-code formatting verified.');
  }

  console.log('All Auth Error Mapping & Localization Unit Tests PASSED successfully!');
}

runAuthErrorMappingTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
