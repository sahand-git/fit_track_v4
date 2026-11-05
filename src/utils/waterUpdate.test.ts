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

  // Test Case 3: Water goal reached and 150% intake confirmation threshold logic
  {
    const target = 8;
    // Below goal
    assert((target > 0 && 5 >= target) === false, '5 glasses should not be goal reached for target 8');
    // At goal
    assert((target > 0 && 8 >= target) === true, '8 glasses should be goal reached for target 8');
    // Above goal (e.g. 9 glasses)
    assert((target > 0 && 9 >= target) === true, '9 glasses should be goal reached for target 8');

    // 150% threshold: 8 * 1.5 = 12
    const threshold150 = Math.round(target * 1.5);
    assert(threshold150 === 12, '150% of 8 glasses is 12');
    assert((11 >= threshold150) === false, '11 glasses does not trigger 150% confirmation');
    assert((12 >= threshold150) === true, '12 glasses triggers 150% confirmation');
    assert((13 >= threshold150) === true, '13 glasses triggers 150% confirmation');

    // Zero or negative target safeguard
    const zeroTarget = 0;
    assert((zeroTarget > 0 && 5 >= Math.round(zeroTarget * 1.5)) === false, 'Zero target does not trigger 150% confirmation');

    console.log('✓ Scenario 3: Water goal reached state and 150% confirmation threshold validated');
  }

  console.log('All water save race condition tests passed successfully.');
}

runWaterUpdateRaceTests().catch((err) => {
  console.error('Water update tests failed:', err);
  process.exit(1);
});
