import {
  getCalorieMilestoneStatus,
  getStepsMilestoneStatus,
  getWaterMilestoneStatus,
  evaluateDailyMilestones,
  getGoalMilestonesStorageKey,
  getMilestoneDisplayMessage,
} from './goalMilestonesCore';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runGoalMilestonesCoreTests() {
  console.log('Starting Goal Milestones Core State Machine Unit Tests...');

  // Test 1: Calorie tolerance and transitions (under -> reached -> over)
  {
    const target = 2000;
    // 2% of 2000 = 40 kcal (> 25 kcal floor)
    const resUnder = getCalorieMilestoneStatus(1959, target);
    assert(resUnder.status === 'under', '1959 kcal should be under for 2000 kcal target');
    assert(resUnder.tolerance === 40, 'Tolerance should be 40');

    const resReachedMin = getCalorieMilestoneStatus(1960, target);
    assert(resReachedMin.status === 'reached', '1960 kcal should be reached');

    const resReachedExact = getCalorieMilestoneStatus(2000, target);
    assert(resReachedExact.status === 'reached', '2000 kcal should be reached');

    const resReachedMax = getCalorieMilestoneStatus(2040, target);
    assert(resReachedMax.status === 'reached', '2040 kcal should be reached');

    const resOver = getCalorieMilestoneStatus(2041, target);
    assert(resOver.status === 'over', '2041 kcal should be over for 2000 kcal target');

    // Small target: 2% of 800 = 16 < 25 floor -> tolerance should be 25
    const resFloor = getCalorieMilestoneStatus(775, 800);
    assert(resFloor.tolerance === 25, 'Floor tolerance of 25 kcal should be enforced');
    assert(resFloor.status === 'reached', '775 kcal should be reached for 800 target with 25 kcal tolerance');

    console.log('✓ Test 1 passed: Calorie transitions (under -> reached -> over) & tolerance floor verified');
  }

  // Test 2: Steps transitions (under -> reached)
  {
    assert(getStepsMilestoneStatus(0, 10000) === 'under', '0 steps is under');
    assert(getStepsMilestoneStatus(9999, 10000) === 'under', '9999 steps is under');
    assert(getStepsMilestoneStatus(10000, 10000) === 'reached', '10000 steps is reached');
    assert(getStepsMilestoneStatus(15000, 10000) === 'reached', '15000 steps is reached');
    console.log('✓ Test 2 passed: Steps transitions verified');
  }

  // Test 3: Water transitions (under -> reached)
  {
    assert(getWaterMilestoneStatus(0, 8) === 'under', '0 glasses is under');
    assert(getWaterMilestoneStatus(7, 8) === 'under', '7 glasses is under');
    assert(getWaterMilestoneStatus(8, 8) === 'reached', '8 glasses is reached');
    assert(getWaterMilestoneStatus(10, 8) === 'reached', '10 glasses is reached');
    console.log('✓ Test 3 passed: Water transitions verified');
  }

  // Test 4: Once-per-date firing and persistence key format
  {
    const date = '2026-11-01';
    assert(
      getGoalMilestonesStorageKey(date) === '@fittrack_milestones_2026-11-01',
      'Storage key format matches specification'
    );

    // Initial evaluation when all goals met on fresh date
    const eval1 = evaluateDailyMilestones({
      date,
      consumedCalories: 2000,
      calorieTarget: 2000,
      steps: 10000,
      stepGoal: 10000,
      waterGlasses: 8,
      waterTargetGlasses: 8,
      celebrated: {},
    });

    assert(eval1.newlyReached.includes('calories'), 'Calories newly reached');
    assert(eval1.newlyReached.includes('steps'), 'Steps newly reached');
    assert(eval1.newlyReached.includes('water'), 'Water newly reached');
    assert(eval1.newlyReached.length === 3, 'All 3 milestones fired on first pass');

    // Subsequent evaluation on same date with updated history: should fire ZERO times
    const eval2 = evaluateDailyMilestones({
      date,
      consumedCalories: 2020,
      calorieTarget: 2000,
      steps: 11000,
      stepGoal: 10000,
      waterGlasses: 9,
      waterTargetGlasses: 8,
      celebrated: eval1.updatedCelebrated,
    });

    assert(eval2.newlyReached.length === 0, 'No repeat celebrations on same date when already celebrated');
    console.log('✓ Test 4 passed: Once-per-date firing and storage key format verified');
  }

  // Test 5: Neutral status only for calories vs praise for steps
  {
    const calorieMsg = getMilestoneDisplayMessage('calories', {}, (k) => k);
    assert(calorieMsg.isNeutralStatusOnly === true, 'Calorie milestone must be neutral status only');
    assert(!calorieMsg.message.toLowerCase().includes('congratulations'), 'No congratulations for calories');
    assert(calorieMsg.message === "You've reached today's calorie goal.", 'Calorie copy matches');

    const stepsMsg = getMilestoneDisplayMessage('steps', { steps: 10000, stepGoal: 10000 }, (k) => k);
    assert(stepsMsg.isNeutralStatusOnly === false, 'Steps milestone can celebrate achievement');
    assert(stepsMsg.message === 'Congratulations! You reached your daily step goal.', 'Steps copy matches');

    const waterMsg = getMilestoneDisplayMessage('water', {}, (k) => k);
    assert(waterMsg.isNeutralStatusOnly === false, 'Water milestone can congratulate hydration');
    assert(waterMsg.message === 'Well done! You reached your daily water goal.', 'Water copy matches');
    console.log('✓ Test 5 passed: Neutral calorie copy and celebratory steps/water copy verified');
  }

  console.log('All Goal Milestones Core State Machine Unit Tests PASSED Cleanly!');
}

runGoalMilestonesCoreTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
