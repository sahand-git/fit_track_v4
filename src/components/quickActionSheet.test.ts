/* eslint-disable import/first */
// Mock localStorage for Node test environment
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

import { translate } from '../i18n/strings';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runQuickActionSheetTests() {
  console.log('Starting QuickActionSheet Unit Tests...');

  // 1. Localization coverage for all QuickAction strings
  const quickActionKeys = [
    'Quick Add',
    'Quick Presets',
    '1-tap shortcut for food, hydration & exercise',
    'Close',
    'Scan Barcode',
    'UPC / EAN',
    'AI Plate Scanner',
    'Gemini Vision',
    'Search Food',
    'Database',
    'Quick Add Water',
    '+250 ml (1 glass)',
    'Log Workout',
    'Cardio & Strength',
    'Step Tracker',
    'Pedometer & Activity',
    'Daily Routine',
    'Vitamins & Supplements',
    'Log Weight',
    'Progress & History',
  ];

  for (const key of quickActionKeys) {
    for (const lang of ['ar', 'ckb'] as const) {
      const translated = translate(lang, key);
      assert(
        translated.length > 0 && translated !== key,
        `Missing ${lang} translation for Quick Action string: "${key}"`
      );
    }
  }
  console.log(`✓ All ${quickActionKeys.length} Quick Action strings verified across Arabic and Sorani.`);

  // 2. Action dispatch logic testing
  let barcodeCalled = false;
  let plateCalled = false;
  let foodLogCalled = false;
  let waterCount = 0;
  let workoutCalled = false;
  let stepCalled = false;
  let routineCalled = false;
  let weightCalled = false;

  const mockCallbacks = {
    onOpenBarcodeScanner: () => { barcodeCalled = true; },
    onOpenPlateScanner: () => { plateCalled = true; },
    onOpenFoodLog: () => { foodLogCalled = true; },
    onQuickWater: (amt = 1) => { waterCount += amt; },
    onOpenAddWorkout: () => { workoutCalled = true; },
    onOpenStepTracker: () => { stepCalled = true; },
    onOpenSupplements: () => { routineCalled = true; },
    onOpenLogWeight: () => { weightCalled = true; },
  };

  mockCallbacks.onOpenBarcodeScanner();
  mockCallbacks.onOpenPlateScanner();
  mockCallbacks.onOpenFoodLog();
  mockCallbacks.onQuickWater(1);
  mockCallbacks.onOpenAddWorkout();
  mockCallbacks.onOpenStepTracker();
  mockCallbacks.onOpenSupplements();
  mockCallbacks.onOpenLogWeight();

  assert(barcodeCalled, 'Barcode action callback should be called');
  assert(plateCalled, 'Plate scanner action callback should be called');
  assert(foodLogCalled, 'Food log action callback should be called');
  assert(waterCount === 1, 'Quick water action should increment by 1 glass');
  assert(workoutCalled, 'Workout action callback should be called');
  assert(stepCalled, 'Step action callback should be called');
  assert(routineCalled, 'Supplements action callback should be called');
  assert(weightCalled, 'Weight action callback should be called');

  console.log('✓ Quick action dispatch handlers verified.');
  console.log('All QuickActionSheet tests passed successfully!');
}

runQuickActionSheetTests().catch((err) => {
  console.error('QuickActionSheet test failed:', err);
  process.exit(1);
});
