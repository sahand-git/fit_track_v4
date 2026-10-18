import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  setAccountStorageNamespace,
  getScopedStorageKey,
  loadMedicalDisclaimerAccepted,
  saveMedicalDisclaimerAccepted,
  loadUserProfile,
  saveUserProfile,
} from './storage';
import { getDefaultProfile } from '../utils/calculator';

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

async function runNamespaceTransitionTests() {
  console.log('Starting Auth Namespace Transition & Storage Isolation Unit Tests...');

  // Reset store
  AsyncStorage.clear();
  setAccountStorageNamespace(null);

  // 1. Scoped keys formatting and UID sanitization
  {
    setAccountStorageNamespace(null);
    assert(getScopedStorageKey('@fittrack_profile') === '@fittrack_profile', 'Guest key must remain unadorned');

    setAccountStorageNamespace('user:abc.123');
    const scoped = getScopedStorageKey('@fittrack_profile');
    assert(scoped === '@fittrack_account_user_abc_123:@fittrack_profile', `Special characters must be sanitized, got ${scoped}`);

    setAccountStorageNamespace(null);
    console.log('✓ Test 1 passed: Storage keys scoped and sanitized correctly.');
  }

  // 2. Medical disclaimer acceptance persists across namespace transitions
  {
    // In guest mode, user accepts disclaimer
    await saveMedicalDisclaimerAccepted(true);
    let accepted = await loadMedicalDisclaimerAccepted();
    assert(accepted === true, 'Guest disclaimer must be accepted');

    // Switch to new account namespace
    setAccountStorageNamespace('uid_fresh_account_456');
    // Newly scoped key does not exist yet, but device root key must satisfy disclaimer check
    accepted = await loadMedicalDisclaimerAccepted();
    assert(accepted === true, 'Medical disclaimer acceptance must hold across account sign-in');

    // Switch back to guest
    setAccountStorageNamespace(null);
    accepted = await loadMedicalDisclaimerAccepted();
    assert(accepted === true, 'Guest disclaimer remains true');

    console.log('✓ Test 2 passed: Medical disclaimer acceptance safely persists across auth namespaces.');
  }

  // 3. Data isolation between guest and account namespaces
  {
    // Set guest profile
    const guestProfile = {
      ...getDefaultProfile(),
      name: 'Guest User',
      isOnboarded: true,
      targetCalories: 2200,
    };
    await saveUserProfile(guestProfile);

    // Switch to account namespace
    setAccountStorageNamespace('uid_account_789');
    const accountProfileInitial = await loadUserProfile();
    assert(accountProfileInitial.isOnboarded === false, 'Fresh account namespace must start not onboarded');
    assert(accountProfileInitial.name !== 'Guest User', 'Account namespace must not read guest profile data directly');

    // Save account profile
    const accountProfile = {
      ...getDefaultProfile(),
      name: 'Cloud User',
      isOnboarded: true,
      targetCalories: 2500,
    };
    await saveUserProfile(accountProfile);

    const loadedAccount = await loadUserProfile();
    assert(loadedAccount.name === 'Cloud User', 'Account profile saved and loaded');
    assert(loadedAccount.targetCalories === 2500, 'Account targetCalories matches');

    // Switch back to guest: guest profile must remain untouched
    setAccountStorageNamespace(null);
    const loadedGuest = await loadUserProfile();
    assert(loadedGuest.name === 'Guest User', 'Guest profile preserved without overwrite');
    assert(loadedGuest.targetCalories === 2200, 'Guest targetCalories preserved');

    console.log('✓ Test 3 passed: Guest and Account namespaces are 100% isolated.');
  }

  console.log('All Auth Namespace Transition & Storage Isolation Tests PASSED successfully!');
}

runNamespaceTransitionTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
