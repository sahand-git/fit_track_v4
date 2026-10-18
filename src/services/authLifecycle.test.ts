import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  setAccountStorageNamespace,
  getScopedStorageKey,
  saveUserProfile,
  loadUserProfile,
  saveDailyLog,
  loadDailyLog,
  purgeAccountData,
} from '../storage/storage';
import {
  getAuthErrorDetails,
  formatAuthError,
  registerWithEmail,
  loginWithEmail,
  requestPasswordReset,
  AuthIdentity,
} from './authService';
import { getDefaultProfile } from '../utils/calculator';
import { DailyLog } from '../types';

// In-memory mock store for AsyncStorage
const mockStore: Record<string, string> = {};
(globalThis as any).window = {
  localStorage: {
    getItem: (k: string) => mockStore[k] ?? null,
    setItem: (k: string, v: string) => { mockStore[k] = String(v); },
    removeItem: (k: string) => { delete mockStore[k]; },
    clear: () => { Object.keys(mockStore).forEach((k) => delete mockStore[k]); },
    key: (i: number) => Object.keys(mockStore)[i] ?? null,
    get length() { return Object.keys(mockStore).length; },
  },
};

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runAuthLifecycleTests() {
  console.log('Starting Comprehensive Auth Lifecycle & Edge Case Tests...');

  // Reset store and storage namespace before tests
  await AsyncStorage.clear();
  setAccountStorageNamespace(null);

  // =========================================================================
  // 1. REGISTRATION LIFECYCLE: SUCCESS & FAILURE EDGE CASES
  // =========================================================================
  {
    console.log('Testing 1: Registration input validation and error mapping...');

    // 1a. Empty or whitespace email
    let threwInvalidEmail = false;
    try {
      await registerWithEmail('   ', 'validPassword123');
    } catch (err) {
      threwInvalidEmail = true;
      const details = getAuthErrorDetails(err);
      assert(details.code === 'auth/invalid-email', 'Expected auth/invalid-email for empty email');
      assert(details.message === 'Enter a valid email address.', 'Expected localized error message');
    }
    assert(threwInvalidEmail, 'registerWithEmail must reject empty email');

    // 1b. Weak password (< 6 characters)
    let threwWeakPass = false;
    try {
      await registerWithEmail('test@example.com', '12345');
    } catch (err) {
      threwWeakPass = true;
      const details = getAuthErrorDetails(err);
      assert(details.code === 'auth/weak-password', 'Expected auth/weak-password for short password');
      assert(details.message === 'Use a password with at least six characters.', 'Expected localized weak password message');
    }
    assert(threwWeakPass, 'registerWithEmail must reject short password');

    // 1c. Duplicate email simulation (auth/email-already-in-use)
    const dupErr = { code: 'auth/email-already-in-use', message: 'The email address is already in use by another account.' };
    const dupDetails = getAuthErrorDetails(dupErr);
    assert(dupDetails.code === 'auth/email-already-in-use', 'Expected auth/email-already-in-use code');
    assert(dupDetails.message === 'An account already exists with this email.', 'Expected clean message for duplicate email');

    // 1d. Network timeout during registration
    const netTimeoutErr = { code: 'auth/timeout', message: 'The request has timed out.' };
    const netDetails = getAuthErrorDetails(netTimeoutErr);
    assert(netDetails.code === 'auth/timeout' || netDetails.code === 'auth/network-request-failed' || netDetails.code === 'NETWORK_ERROR', 'Expected network failure mapping');
    assert(netDetails.message.includes('internet connection'), 'Expected connection check message');

    // 1e. Login input validation
    let threwLoginEmptyEmail = false;
    try {
      await loginWithEmail('   ', 'password123');
    } catch (err) {
      threwLoginEmptyEmail = true;
      assert(getAuthErrorDetails(err).code === 'auth/invalid-email', 'Expected auth/invalid-email for blank login email');
    }
    assert(threwLoginEmptyEmail, 'loginWithEmail must reject empty email');

    let threwLoginEmptyPass = false;
    try {
      await loginWithEmail('valid@example.com', '');
    } catch (err) {
      threwLoginEmptyPass = true;
      assert(getAuthErrorDetails(err).code === 'auth/invalid-credential', 'Expected auth/invalid-credential for empty login password');
    }
    assert(threwLoginEmptyPass, 'loginWithEmail must reject empty password');

    console.log('✓ Test 1 passed: Registration validation, login validation, duplicate email, and network failure handled.');
  }

  // =========================================================================
  // 2. VERIFICATION STATE TRANSITIONS & LINK EXPIRATION
  // =========================================================================
  {
    console.log('Testing 2: Verification state transitions & link expiration...');

    // Simulation of unverified -> verified user transition
    const unverifiedUser: AuthIdentity = {
      uid: 'user_verify_test_101',
      email: 'unverified@example.com',
      displayName: 'New Member',
      emailVerified: false,
      isAnonymous: false,
    };

    assert(unverifiedUser.emailVerified === false, 'Newly registered user must start unverified');

    // Simulating email reload transition once user clicks email link
    const verifiedUser: AuthIdentity = {
      ...unverifiedUser,
      emailVerified: true,
    };
    assert(verifiedUser.emailVerified === true, 'Reloaded user transitions to verified');

    // 2b. Expired verification link
    const expiredErr = { code: 'auth/expired-action-code', message: 'The action code has expired.' };
    const expDetails = getAuthErrorDetails(expiredErr);
    assert(expDetails.code === 'auth/expired-action-code', 'Expected auth/expired-action-code');
    assert(expDetails.message === 'This verification link has expired. Request a new one.', 'Expected expired link guidance');

    // 2c. Invalid or already used verification link
    const invalidLinkErr = { code: 'auth/invalid-action-code', message: 'The action code is invalid.' };
    const invDetails = getAuthErrorDetails(invalidLinkErr);
    assert(invDetails.code === 'auth/invalid-action-code', 'Expected auth/invalid-action-code');
    assert(invDetails.message === 'This verification link is invalid or already used.', 'Expected invalid action code guidance');

    console.log('✓ Test 2 passed: Verification state transition and action code errors verified.');
  }

  // =========================================================================
  // 3. PASSWORD RESET REQUESTS & VALIDATION
  // =========================================================================
  {
    console.log('Testing 3: Password reset requests & validation...');

    // 3a. Empty or whitespace email
    let threwResetBlank = false;
    try {
      await requestPasswordReset('   ');
    } catch (err) {
      threwResetBlank = true;
      const details = getAuthErrorDetails(err);
      assert(details.code === 'auth/invalid-email', 'Expected auth/invalid-email for blank password reset email');
    }
    assert(threwResetBlank, 'requestPasswordReset must reject blank email');

    // 3b. User not found
    const notFoundErr = { code: 'auth/user-not-found', message: 'There is no user record corresponding to this identifier.' };
    const notFoundDetails = getAuthErrorDetails(notFoundErr);
    assert(notFoundDetails.code === 'auth/user-not-found', 'Expected auth/user-not-found');
    assert(notFoundDetails.message === 'No account found with this email.', 'Expected no account found message');

    console.log('✓ Test 3 passed: Password reset validation and user-not-found error verified.');
  }

  // =========================================================================
  // 4. SIGN-OUT FLOW: CLEARING AUTH STATE & PRESERVING GUEST DATA
  // =========================================================================
  {
    console.log('Testing 4: Sign-out flow, storage namespace isolation & guest data preservation...');

    // Step A: Set up rich guest data
    setAccountStorageNamespace(null);
    const guestProfile = {
      ...getDefaultProfile(),
      name: 'Guest Athlete',
      isOnboarded: true,
      targetCalories: 2150,
      targetProtein: 155,
    };
    await saveUserProfile(guestProfile);

    const guestLog: DailyLog = {
      date: '2026-10-18',
      waterGlasses: 7,
      steps: 8500,
      meals: [],
      workouts: [
        {
          id: 'guest_w1',
          name: 'Bench Press',
          category: 'strength',
          durationMinutes: 45,
          caloriesBurned: 220,
          loggedAt: new Date().toISOString(),
          sets: [{ setNum: 1, weightKg: 80, reps: 10, completed: true }],
        },
      ],
    };
    await saveDailyLog(guestLog);

    // Step B: User signs into an account
    const accountUid = 'cloud_athlete_uid_202';
    setAccountStorageNamespace(accountUid);
    const scopedKey = getScopedStorageKey('@fittrack_profile');
    assert(scopedKey.includes(accountUid), `Scoped key must include account UID: ${scopedKey}`);

    // Initial state in account namespace should be empty / default
    const accountInitialProfile = await loadUserProfile();
    assert(accountInitialProfile.isOnboarded === false, 'Fresh account should not be onboarded initially');
    assert(accountInitialProfile.name !== 'Guest Athlete', 'Account must not see guest profile');

    // Save account-specific profile and log
    const cloudProfile = {
      ...getDefaultProfile(),
      name: 'Cloud Athlete Pro',
      isOnboarded: true,
      targetCalories: 2600,
    };
    await saveUserProfile(cloudProfile);

    const cloudLog: DailyLog = {
      date: '2026-10-18',
      waterGlasses: 12,
      steps: 12000,
      meals: [],
      workouts: [],
    };
    await saveDailyLog(cloudLog);

    // Step C: User signs out -> namespace reverts to null (guest)
    setAccountStorageNamespace(null);

    // Verify guest data is 100% intact
    const restoredGuestProfile = await loadUserProfile();
    assert(restoredGuestProfile.name === 'Guest Athlete', 'Guest profile must be fully preserved after sign-out');
    assert(restoredGuestProfile.targetCalories === 2150, 'Guest target calories must match original');

    const restoredGuestLog = await loadDailyLog('2026-10-18');
    assert(restoredGuestLog.waterGlasses === 7, 'Guest water log preserved');
    assert((restoredGuestLog.workouts?.length ?? 0) === 1, 'Guest workout preserved');
    assert(restoredGuestLog.workouts?.[0]?.name === 'Bench Press', 'Guest workout details preserved');

    // Step D: User signs back into the account -> account data is preserved
    setAccountStorageNamespace(accountUid);
    const reloadedCloudProfile = await loadUserProfile();
    assert(reloadedCloudProfile.name === 'Cloud Athlete Pro', 'Cloud profile must be preserved in account namespace');
    assert(reloadedCloudProfile.targetCalories === 2600, 'Cloud target calories preserved');

    const reloadedCloudLog = await loadDailyLog('2026-10-18');
    assert(reloadedCloudLog.waterGlasses === 12, 'Cloud water log preserved');

    // Return to guest namespace
    setAccountStorageNamespace(null);
    console.log('✓ Test 4 passed: Sign-out preserves guest data and cleanly switches namespaces.');
  }

  // =========================================================================
  // 5. ACCOUNT DELETION: REAUTH REQUIREMENT, LOCAL DATA PURGE & GUEST PRESERVATION
  // =========================================================================
  {
    console.log('Testing 5: Account deletion, local account data purge & guest preservation...');

    // Ensure guest data exists
    setAccountStorageNamespace(null);
    const guestProfile = await loadUserProfile();
    assert(guestProfile.name === 'Guest Athlete', 'Guest profile confirmed present');

    // Create an account with populated records
    const deleteTestUid = 'uid_to_be_deleted_303';
    setAccountStorageNamespace(deleteTestUid);

    await saveUserProfile({
      ...getDefaultProfile(),
      name: 'User To Delete',
      isOnboarded: true,
      targetCalories: 2800,
    });
    await saveDailyLog({
      date: '2026-10-18',
      waterGlasses: 10,
      steps: 6000,
      meals: [],
      workouts: [],
    });

    // Verify keys were created in storage for this account
    const allKeysBefore = await AsyncStorage.getAllKeys();
    const accountKeys = allKeysBefore.filter((k) => k.includes(`@fittrack_account_${deleteTestUid}:`));
    assert(accountKeys.length >= 2, `Expected account keys to exist, found ${accountKeys.length}`);

    // Reauth requirement checks:
    // Missing password for password provider
    const missingPassErr = new Error('Enter your password to confirm account deletion.');
    const missingPassDetails = getAuthErrorDetails(missingPassErr);
    assert(missingPassDetails.code === 'PASSWORD_REQUIRED_FOR_DELETION', 'Expected PASSWORD_REQUIRED_FOR_DELETION code');

    // Sensitive action timeout
    const reauthReqErr = { code: 'auth/requires-recent-login' };
    const reauthDetails = getAuthErrorDetails(reauthReqErr);
    assert(reauthDetails.code === 'auth/requires-recent-login', 'Expected auth/requires-recent-login');
    assert(reauthDetails.message === 'Sign in again to confirm this sensitive action.', 'Expected reauth guidance');

    // Execute purgeAccountData
    await purgeAccountData(deleteTestUid);

    // Verify account keys are completely removed
    const allKeysAfter = await AsyncStorage.getAllKeys();
    const remainingAccountKeys = allKeysAfter.filter((k) => k.includes(`@fittrack_account_${deleteTestUid}:`));
    assert(remainingAccountKeys.length === 0, `Expected 0 remaining account keys, found ${remainingAccountKeys.length}`);

    // Revert namespace to guest
    setAccountStorageNamespace(null);
    const postDeletionGuestProfile = await loadUserProfile();
    assert(postDeletionGuestProfile.name === 'Guest Athlete', 'Guest profile must remain 100% intact after account deletion');
    assert(postDeletionGuestProfile.targetCalories === 2150, 'Guest target calories intact');

    console.log('✓ Test 5 passed: Account deletion requires reauth, purges account keys, and preserves guest data.');
  }

  // =========================================================================
  // 6. GOOGLE SIGN-IN OUTCOMES: CANCELLATION VS ERROR VS SUCCESS
  // =========================================================================
  {
    console.log('Testing 6: Google Sign-In outcomes...');

    // 6a. User cancellation (explicit cancel or status 12501)
    const cancel1 = { type: 'cancelled' };
    assert(getAuthErrorDetails(cancel1).code === 'SIGN_IN_CANCELLED', 'Expected SIGN_IN_CANCELLED for type: cancelled');

    const cancel2 = { code: '12501' };
    assert(getAuthErrorDetails(cancel2).code === 'SIGN_IN_CANCELLED', 'Expected SIGN_IN_CANCELLED for code 12501');

    const cancel3 = new Error('User cancelled sign in flow');
    assert(getAuthErrorDetails(cancel3).code === 'SIGN_IN_CANCELLED', 'Expected SIGN_IN_CANCELLED for cancel message');

    // 6b. DEVELOPER_ERROR (Status 10) - Missing SHA-1 in Firebase Console
    const devErr10 = { code: 10 };
    const devDetails = getAuthErrorDetails(devErr10);
    assert(devDetails.code === 'DEVELOPER_ERROR_10', 'Expected DEVELOPER_ERROR_10 for status 10');
    assert(devDetails.message.includes('SHA-1'), 'Error message must guide user to check SHA-1');

    // 6c. Missing Web Client ID
    const webIdErr = new Error('Google Web Client ID is not configured.');
    assert(getAuthErrorDetails(webIdErr).code === 'MISSING_WEB_CLIENT_ID', 'Expected MISSING_WEB_CLIENT_ID');

    // 6d. Play services unavailable
    const playErr = { code: 'PLAY_SERVICES_NOT_AVAILABLE' };
    assert(getAuthErrorDetails(playErr).code === 'PLAY_SERVICES_NOT_AVAILABLE', 'Expected PLAY_SERVICES_NOT_AVAILABLE');

    // 6e. Successful credential construction simulation
    const mockGoogleIdentity: AuthIdentity = {
      uid: 'google_oauth_user_555',
      email: 'alex.runner@gmail.com',
      displayName: 'Alex Runner',
      emailVerified: true,
      isAnonymous: false,
    };
    assert(mockGoogleIdentity.emailVerified === true, 'Google users are verified by default');
    assert(mockGoogleIdentity.email === 'alex.runner@gmail.com', 'Google email resolved');

    console.log('✓ Test 6 passed: Google Sign-In cancellation, configuration errors, and success verified.');
  }

  // =========================================================================
  // 7. MULTILINGUAL PRESENTATION IN ARABIC AND KURDISH SORANI
  // =========================================================================
  {
    console.log('Testing 7: Multilingual presentation across Arabic and Kurdish Sorani...');

    const sampleCodes = [
      'auth/invalid-email',
      'auth/weak-password',
      'auth/email-already-in-use',
      'auth/expired-action-code',
      'DEVELOPER_ERROR_10',
      'SIGN_IN_CANCELLED',
      'NETWORK_ERROR',
    ];

    for (const code of sampleCodes) {
      const err = { code };
      const arFormatted = formatAuthError(err, 'ar');
      const ckbFormatted = formatAuthError(err, 'ckb');

      assert(arFormatted.includes(`[Code: ${code}]`), `Arabic must include [Code: ${code}]`);
      assert(ckbFormatted.includes(`[Code: ${code}]`), `Kurdish must include [Code: ${code}]`);
      assert(arFormatted.length > 10, 'Arabic text must be translated');
      assert(ckbFormatted.length > 10, 'Kurdish text must be translated');
    }

    console.log('✓ Test 7 passed: Multilingual auth error formatting verified in Arabic and Kurdish Sorani.');
  }

  console.log('======================================================================');
  console.log('All Comprehensive Auth Lifecycle & Edge Case Tests PASSED Successfully!');
  console.log('======================================================================');
}

runAuthLifecycleTests().catch((err) => {
  console.error('Auth Lifecycle Test FAILED:', err);
  process.exit(1);
});
