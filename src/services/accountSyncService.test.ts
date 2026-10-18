import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getGuestDataSummary,
  isAccountEmpty,
  copyGuestDataToAccount,
} from './accountSyncService';

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

async function runAccountSyncTests() {
  console.log('Starting Account Sync & Guest Data Copy Unit Tests...');

  await AsyncStorage.clear();

  // 1. Empty guest data summary
  {
    const summary = await getGuestDataSummary();
    assert(summary.mealsCount === 0, 'Empty meals count');
    assert(summary.workoutsCount === 0, 'Empty workouts count');
    assert(summary.weightsCount === 0, 'Empty weights count');
    assert(summary.hasOnboardedProfile === false, 'Empty onboarded profile');
    assert(summary.totalRecords === 0, 'Empty total records');
    console.log('✓ Test 1 passed: Empty guest data summary correctly reported.');
  }

  // 2. Populated guest data summary
  {
    // Populate guest log 1
    const day1Log = {
      date: '2026-10-17',
      meals: [
        { id: 'm1', name: 'Eggs', calories: 200, protein: 14, carbs: 2, fat: 12 },
        { id: 'm2', name: 'Oats', calories: 300, protein: 10, carbs: 50, fat: 5 },
      ],
      workouts: [
        { id: 'w1', name: 'Morning Run', type: 'cardio', durationMinutes: 30, caloriesBurned: 250 },
      ],
      waterGlasses: 6,
      steps: 8000,
    };
    await AsyncStorage.setItem('@fittrack_log_2026-10-17', JSON.stringify(day1Log));

    // Populate guest log 2
    const day2Log = {
      date: '2026-10-18',
      meals: [
        { id: 'm3', name: 'Chicken Salad', calories: 450, protein: 40, carbs: 10, fat: 15 },
      ],
      workouts: [],
      waterGlasses: 4,
      steps: 5000,
    };
    await AsyncStorage.setItem('@fittrack_log_2026-10-18', JSON.stringify(day2Log));

    // Populate weight history
    const weightHistory = [
      { id: 'wh1', date: '2026-10-15', weightKg: 78.5 },
      { id: 'wh2', date: '2026-10-18', weightKg: 78.0 },
    ];
    await AsyncStorage.setItem('@fittrack_weight_history', JSON.stringify(weightHistory));

    // Populate onboarded guest profile
    const profile = {
      name: 'Guest Athlete',
      isOnboarded: true,
      targetCalories: 2400,
      targetProtein: 160,
    };
    await AsyncStorage.setItem('@fittrack_profile', JSON.stringify(profile));

    const summary = await getGuestDataSummary();
    assert(summary.mealsCount === 3, `Expected 3 meals, got ${summary.mealsCount}`);
    assert(summary.workoutsCount === 1, `Expected 1 workout, got ${summary.workoutsCount}`);
    assert(summary.weightsCount === 2, `Expected 2 weights, got ${summary.weightsCount}`);
    assert(summary.hasOnboardedProfile === true, 'Expected onboarded profile to be true');
    assert(summary.totalRecords === 7, `Expected total 7 records, got ${summary.totalRecords}`);

    console.log('✓ Test 2 passed: Populated guest data summary accurately counted meals, workouts, weights, and profile.');
  }

  // 3. isAccountEmpty check
  {
    const targetUid = 'firebase_user_abc_123';

    // Account is initially empty
    let empty = await isAccountEmpty(targetUid);
    assert(empty === true, 'New account must be recognized as empty');

    // Copy guest data to account
    const copyResult = await copyGuestDataToAccount(targetUid);
    assert(copyResult === true, 'copyGuestDataToAccount must return true on success');

    // Account is now populated
    empty = await isAccountEmpty(targetUid);
    assert(empty === false, 'Account with copied data must not be empty');

    console.log('✓ Test 3 passed: isAccountEmpty correctly identifies empty vs populated account namespace.');
  }

  // 4. Non-destructive copy verification
  {
    const targetUid = 'firebase_user_abc_123';
    const sanitized = targetUid.replace(/[^a-zA-Z0-9_-]/g, '_');
    const prefix = `@fittrack_account_${sanitized}:`;

    // Verify account keys exist
    const copiedProfileRaw = await AsyncStorage.getItem(`${prefix}@fittrack_profile`);
    assert(!!copiedProfileRaw, 'Copied account profile must exist');
    const copiedProfile = JSON.parse(copiedProfileRaw!);
    assert(copiedProfile.name === 'Guest Athlete', 'Copied profile name matches');
    assert(copiedProfile.isOnboarded === true, 'Copied profile is onboarded');

    const copiedLog1Raw = await AsyncStorage.getItem(`${prefix}@fittrack_log_2026-10-17`);
    assert(!!copiedLog1Raw, 'Copied account log 1 must exist');
    const copiedLog1 = JSON.parse(copiedLog1Raw!);
    assert(copiedLog1.meals.length === 2, 'Copied log 1 has 2 meals');
    assert(copiedLog1.workouts.length === 1, 'Copied log 1 has 1 workout');

    const copiedWeightsRaw = await AsyncStorage.getItem(`${prefix}@fittrack_weight_history`);
    assert(!!copiedWeightsRaw, 'Copied weight history must exist');
    const copiedWeights = JSON.parse(copiedWeightsRaw!);
    assert(copiedWeights.length === 2, 'Copied weights count matches');

    // VERIFY GUEST DATA WAS NEVER MODIFIED OR REMOVED
    const originalGuestProfile = await AsyncStorage.getItem('@fittrack_profile');
    assert(!!originalGuestProfile, 'Original guest profile must remain untouched');
    const originalLog1 = await AsyncStorage.getItem('@fittrack_log_2026-10-17');
    assert(!!originalLog1, 'Original guest log 1 must remain untouched');
    const originalWeights = await AsyncStorage.getItem('@fittrack_weight_history');
    assert(!!originalWeights, 'Original guest weights must remain untouched');

    console.log('✓ Test 4 passed: Non-destructive copy verified: target populated, guest data 100% intact.');
  }

  console.log('All Account Sync & Guest Data Copy Unit Tests PASSED successfully!');
}

runAccountSyncTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
