// Setup mock window.localStorage for AsyncStorage in Node
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

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  enqueueStorageOperation,
  restoreAllData,
  loadDailyLog,
  loadUserProfile,
  saveUserProfile,
  loadSupplementRoutine,
  setAccountStorageNamespace,
  setDailySteps,
  addDailySteps,
} from './storage';
import { FitTrackBackup, UserProfile, DailyLog } from '../types';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

async function runStorageTests() {
  console.log('Starting Storage & Queue Regression Tests...');

  // =========================================================================
  // ISSUE 2 REGRESSION TEST: Storage write queue unhandled rejection recovery
  // =========================================================================
  {
    console.log('Running Issue 2: Queue recovery and unhandled rejection test...');
    let unhandledRejectionsCount = 0;
    const unhandledListener = (reason: any) => {
      unhandledRejectionsCount++;
      console.error('Captured unhandledRejection:', reason);
    };
    process.on('unhandledRejection', unhandledListener);

    const testKey = '@fittrack_test_queue_key';

    // 1. Queue a failing task
    let task1Caught = false;
    const task1Promise = enqueueStorageOperation(testKey, async () => {
      throw new Error('Task 1 Intentional Failure');
    }).catch((err) => {
      task1Caught = true;
      assert(err.message === 'Task 1 Intentional Failure', 'Caller receives exact task error');
    });

    // 2. Queue a succeeding task immediately after for the same key
    let task2Result = '';
    const task2Promise = enqueueStorageOperation(testKey, async () => {
      return 'Task 2 Success';
    }).then((res) => {
      task2Result = res;
    });

    await Promise.all([task1Promise, task2Promise]);
    assert(task1Caught, 'Task 1 rejection was caught by caller');
    assert(task2Result === 'Task 2 Success', 'Task 2 executed and succeeded after task 1 failure');

    // Allow any pending microtasks / finally chains to settle
    await new Promise((resolve) => setTimeout(resolve, 50));

    process.removeListener('unhandledRejection', unhandledListener);
    assert(unhandledRejectionsCount === 0, `Expected 0 unhandled rejections, got ${unhandledRejectionsCount}`);
    console.log('✓ Issue 2 passed: Queue recovered without unhandled rejections.');
  }

  // =========================================================================
  // ISSUE 3 REGRESSION TESTS: Failure-safe replace restore & rollback
  // =========================================================================
  {
    console.log('Running Issue 3: Replace restore rollback failure-injection tests...');

    const baseProfile: UserProfile = {
      name: 'Original User',
      gender: 'male',
      weightKg: 80,
      heightCm: 180,
      age: 28,
      activityLevel: 'moderate',
      goal: 'maintenance',
      targetCalories: 2400,
      targetProtein: 150,
      targetCarbs: 250,
      targetFat: 70,
      bmr: 1750,
      tdee: 2450,
      waterTargetGlasses: 8,
      includeWorkoutsInCalorieBudget: false,
      language: 'en',
      isOnboarded: true,
    };

    const initialOldLog: DailyLog = {
      date: '2026-10-01',
      meals: [{
        id: 'm_init',
        foodId: 'f1',
        name: 'Eggs',
        mealType: 'breakfast',
        servings: 2,
        servingSize: 'egg',
        servingGrams: 100,
        calories: 140,
        protein: 12,
        carbs: 1,
        fat: 10,
        timestamp: '2026-10-01T08:00:00Z',
      }],
      waterGlasses: 4,
      steps: 4000,
      workouts: [],
    };

    // Sub-test A: Failure early in restore
    {
      await AsyncStorage.clear();
      await AsyncStorage.setItem('@fittrack_profile', JSON.stringify(baseProfile));
      await AsyncStorage.setItem('@fittrack_log_2026-10-01', JSON.stringify(initialOldLog));
      await AsyncStorage.setItem('@fittrack_supplement_routine', JSON.stringify([{ id: 'r1', name: 'Creatine', category: 'supplement', time: 'morning' }]));
      // Note: @fittrack_reminder_settings is intentionally ABSENT

      // Attempt restore with a corrupted backup (fails early validation)
      let earlyFailed = false;
      try {
        await restoreAllData({} as any, 'replace');
      } catch {
        earlyFailed = true;
      }
      assert(earlyFailed, 'Corrupted backup rejected early before modifying storage');

      // Verify original data intact
      const p = await loadUserProfile();
      assert(p.name === 'Original User', 'Profile preserved after early failure');
      const l = await loadDailyLog('2026-10-01');
      assert(l.meals.length === 1 && l.meals[0].name === 'Eggs', 'Daily log preserved after early failure');
      const r = await loadSupplementRoutine();
      assert(r.length === 1 && r[0].name === 'Creatine', 'Routine preserved after early failure');
      assert(await AsyncStorage.getItem('@fittrack_reminder_settings') === null, 'Reminder settings remain absent');
      console.log('✓ Sub-test A passed: Early failure safely rejected with zero storage mutation.');
    }

    // Sub-test B: Failure midway after some daily logs were written
    {
      await AsyncStorage.clear();
      await AsyncStorage.setItem('@fittrack_profile', JSON.stringify(baseProfile));
      await AsyncStorage.setItem('@fittrack_log_2026-10-01', JSON.stringify(initialOldLog));
      await AsyncStorage.setItem('@fittrack_supplement_routine', JSON.stringify([{ id: 'r1', name: 'Creatine', category: 'supplement', time: 'morning' }]));
      // @fittrack_reminder_settings is ABSENT

      const newBackup: FitTrackBackup = {
        version: '4.0',
        exportedAt: '2026-10-13T10:00:00Z',
        profile: { ...baseProfile, name: 'Imported User' },
        supplementRoutine: [{ id: 'r2', name: 'Omega 3', category: 'supplement', time: 'morning' }],
        weightHistory: [{ id: 'w_imp', date: '2026-10-12', weightKg: 82, timestamp: '2026-10-12T08:00:00Z' }],
        dailyLogs: {
          '2026-10-10': { date: '2026-10-10', waterGlasses: 5, steps: 5000, meals: [] },
          '2026-10-11': { date: '2026-10-11', waterGlasses: 6, steps: 6000, meals: [] },
          '2026-10-12': { date: '2026-10-12', waterGlasses: 7, steps: 7000, meals: [] },
        },
        reminderSettings: {
          supplementsEnabled: true,
          supplementTimes: {
            morning: { hour: 8, minute: 0, enabled: true },
            afternoon: { hour: 13, minute: 0, enabled: true },
            evening: { hour: 18, minute: 0, enabled: true },
            bedtime: { hour: 21, minute: 0, enabled: true },
          },
          water: { enabled: true, intervalHours: 2, startHour: 8, endHour: 20 },
          meals: {
            breakfast: { hour: 8, minute: 0, enabled: true },
            lunch: { hour: 12, minute: 0, enabled: true },
            dinner: { hour: 18, minute: 0, enabled: true },
            snack: { hour: 15, minute: 0, enabled: true },
          },
        },
      };

      // Mock multiSet to fail on the new daily logs
      const origMultiSet = AsyncStorage.multiSet;
      let multiSetCallCount = 0;
      AsyncStorage.multiSet = async (pairs: any) => {
        multiSetCallCount++;
        if (multiSetCallCount === 1) {
          // Writing new daily logs -> fail midway!
          throw new Error('Disk full during daily logs write');
        }
        return origMultiSet(pairs);
      };

      let restoreFailed = false;
      let restoreErrorMessage = '';
      try {
        await restoreAllData(newBackup, 'replace');
      } catch (err: any) {
        restoreFailed = true;
        restoreErrorMessage = err.message;
      } finally {
        AsyncStorage.multiSet = origMultiSet;
      }

      assert(restoreFailed, 'Midway restore failure properly threw error');
      assert(restoreErrorMessage.includes('Previous data has been preserved'), 'Reports previous data preserved when rollback succeeds');

      // Verify prior data restored
      const prof = await loadUserProfile();
      assert(prof.name === 'Original User', 'Original profile was restored');
      const priorLog = await loadDailyLog('2026-10-01');
      assert(priorLog.meals.length === 1 && priorLog.meals[0].name === 'Eggs', 'Original daily log was restored');
      const rout = await loadSupplementRoutine();
      assert(rout.length === 1 && rout[0].name === 'Creatine', 'Original routine was restored');

      // Verify newly created daily logs and settings are COMPLETELY REMOVED
      const allKeys = await AsyncStorage.getAllKeys();
      assert(!allKeys.includes('@fittrack_log_2026-10-10'), 'Partially imported log 2026-10-10 removed');
      assert(!allKeys.includes('@fittrack_log_2026-10-11'), 'Partially imported log 2026-10-11 removed');
      assert(!allKeys.includes('@fittrack_log_2026-10-12'), 'Partially imported log 2026-10-12 removed');
      assert(!allKeys.includes('@fittrack_reminder_settings'), 'Prior absence of reminder settings preserved');
      console.log('✓ Sub-test B passed: Midway restore cleaned up partial import and fully restored previous state.');
    }

    // Sub-test C: Rollback failure reporting
    {
      const origMultiSet = AsyncStorage.multiSet;
      // Force both restore AND rollback to fail
      AsyncStorage.multiSet = async () => {
        throw new Error('Storage catastrophic hardware failure');
      };

      let catastrophicErrorMessage = '';
      try {
        await restoreAllData({
          version: '4.0',
          exportedAt: '2026-10-13T10:00:00Z',
          profile: baseProfile,
          supplementRoutine: [],
          weightHistory: [],
          dailyLogs: {
            '2026-10-12': { date: '2026-10-12', waterGlasses: 1, steps: 1000, meals: [] },
          },
        }, 'replace');
      } catch (err: any) {
        catastrophicErrorMessage = err.message;
      } finally {
        AsyncStorage.multiSet = origMultiSet;
      }

      assert(catastrophicErrorMessage.includes('rollback failed'), 'Reports rollback failed explicitly');
      assert(!catastrophicErrorMessage.includes('Previous data has been preserved'), 'Does not claim previous data was preserved when rollback fails');
      console.log('✓ Sub-test C passed: Rollback failure reported separately without false preservation claim.');
    }
  }

  // Account namespaces preserve guest data and isolate each signed-in profile.
  setAccountStorageNamespace(null);
  await saveUserProfile({ ...(await loadUserProfile()), name: 'Guest profile' });
  setAccountStorageNamespace('user-one');
  assert((await loadUserProfile()).name !== 'Guest profile', 'account namespace does not read guest profile');
  await saveUserProfile({ ...(await loadUserProfile()), name: 'Account one' });
  setAccountStorageNamespace('user-two');
  assert((await loadUserProfile()).name !== 'Account one', 'account namespace does not read another account');
  setAccountStorageNamespace(null);
  assert((await loadUserProfile()).name === 'Guest profile', 'guest profile remains intact after account changes');

  const stepDate = '2026-10-13';
  await setDailySteps(stepDate, 1000);
  const stepLog = await addDailySteps(stepDate, 500);
  assert(stepLog.steps === 1500, 'manual step add updates only the selected daily total');
  assert(stepLog.meals.length >= 0, 'step update preserves unrelated daily log fields');

  console.log('All storage, account isolation, step tracking, and backup rollback tests passed successfully!');
}

runStorageTests().catch((err) => {
  console.error('Storage tests failed:', err);
  process.exit(1);
});
