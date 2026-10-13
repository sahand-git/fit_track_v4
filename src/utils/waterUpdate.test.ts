import { DailyLog } from '../types';
import { shouldUpdateVisibleDate } from './dateSync';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

async function runWaterUpdateRaceTests() {
  console.log('Starting Water Save Date Race Regression Tests...');

  // Simulate user state in App.tsx
  let selectedDate = '2026-10-13';
  let visibleLog: DailyLog = {
    date: '2026-10-13',
    meals: [],
    waterGlasses: 2,
    steps: 1000,
  };

  // Mock async water save with artificial delay
  const mockDelayedUpdateWater = async (date: string, delta: number, delayMs: number = 30): Promise<DailyLog> => {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return {
      date,
      meals: [],
      waterGlasses: 3,
      steps: 1000,
    };
  };

  // Test Case 1: User stays on the same date while save completes
  {
    const targetDate = selectedDate;
    const savePromise = mockDelayedUpdateWater(targetDate, 1, 20);

    const updatedLog = await savePromise;
    if (shouldUpdateVisibleDate(targetDate, selectedDate)) {
      visibleLog = updatedLog;
    }

    assert(visibleLog.date === '2026-10-13', 'Visible log date is 2026-10-13');
    assert(visibleLog.waterGlasses === 3, 'Water glasses updated to 3');
    console.log('✓ Scenario 1: Same date save properly updates visible state');
  }

  // Test Case 2: User changes dates before save finishes
  {
    // Start save on 2026-10-13
    const targetDate = selectedDate; // 2026-10-13
    const pendingSave = mockDelayedUpdateWater(targetDate, 1, 50);

    // User navigates to previous day immediately while save is pending
    selectedDate = '2026-10-12';
    visibleLog = {
      date: '2026-10-12',
      meals: [],
      waterGlasses: 5,
      steps: 3000,
    };

    // Save for 2026-10-13 completes
    const completedLog = await pendingSave;

    // Check guard
    if (shouldUpdateVisibleDate(targetDate, selectedDate)) {
      visibleLog = completedLog;
    }

    // Verify visibleLog was NOT overwritten with 2026-10-13
    assert(visibleLog.date === '2026-10-12', `Visible date must remain 2026-10-12, got ${visibleLog.date}`);
    assert(visibleLog.waterGlasses === 5, `Visible water glasses must remain 5, got ${visibleLog.waterGlasses}`);
    console.log('✓ Scenario 2: Date change while save pending does NOT overwrite visible date log');
  }

  console.log('All water save race condition tests passed successfully.');
}

runWaterUpdateRaceTests().catch((err) => {
  console.error('Water update tests failed:', err);
  process.exit(1);
});
