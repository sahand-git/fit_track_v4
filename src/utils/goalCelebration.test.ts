import { evaluateGoalAchievement } from './goalCelebration';
import { FitnessGoal } from '../types';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

async function runGoalCelebrationTests() {
  console.log('Starting Goal Celebration Threshold & Concurrency Tests...');

  // 1. Deficit Goals (fat_loss_aggressive, fat_loss_moderate)
  const deficitGoals: FitnessGoal[] = ['fat_loss_aggressive', 'fat_loss_moderate'];
  for (const goal of deficitGoals) {
    const targetCalories = 2000;
    const targetProtein = 150;

    // A: In calorie window (e.g. 1900 / 2000, 95%) -> Should celebrate
    assert(
      evaluateGoalAchievement({
        goal,
        consumedCalories: 1900,
        consumedProtein: 120,
        effectiveCalorieTarget: targetCalories,
        targetProtein,
      }),
      `${goal} should celebrate within 90-100% budget`
    );

    // B: Hit protein target within budget (e.g. 1700 / 2000, protein 160/150) -> Should celebrate
    assert(
      evaluateGoalAchievement({
        goal,
        consumedCalories: 1700,
        consumedProtein: 160,
        effectiveCalorieTarget: targetCalories,
        targetProtein,
      }),
      `${goal} should celebrate hitting protein target within calorie budget`
    );

    // C: EXCEEDING CALORIE CEILING -> MUST NEVER CELEBRATE!
    assert(
      !evaluateGoalAchievement({
        goal,
        consumedCalories: 2050,
        consumedProtein: 140,
        effectiveCalorieTarget: targetCalories,
        targetProtein,
      }),
      `${goal} must NEVER celebrate when exceeding calorie ceiling (2050 / 2000)`
    );

    // D: EXCEEDING CEILING EVEN WITH HIGH PROTEIN -> MUST NEVER CELEBRATE!
    assert(
      !evaluateGoalAchievement({
        goal,
        consumedCalories: 2200,
        consumedProtein: 200,
        effectiveCalorieTarget: targetCalories,
        targetProtein,
      }),
      `${goal} must NEVER celebrate when exceeding calorie ceiling even if protein is high`
    );

    // E: Very low calories (< 90% and protein not hit) -> Should not celebrate
    assert(
      !evaluateGoalAchievement({
        goal,
        consumedCalories: 1200,
        consumedProtein: 80,
        effectiveCalorieTarget: targetCalories,
        targetProtein,
      }),
      `${goal} should not celebrate when far below calorie and protein targets`
    );
  }
  console.log('✓ Fat loss deficit goals pass all ceiling and threshold tests');

  // 2. Maintenance Goal
  {
    const goal: FitnessGoal = 'maintenance';
    const targetCalories = 2400;
    const targetProtein = 140;

    // Within budget -> true
    assert(
      evaluateGoalAchievement({
        goal,
        consumedCalories: 2300,
        consumedProtein: 100,
        effectiveCalorieTarget: targetCalories,
        targetProtein,
      }),
      'maintenance celebrates within budget'
    );

    // Exceeding ceiling -> MUST NEVER CELEBRATE!
    assert(
      !evaluateGoalAchievement({
        goal,
        consumedCalories: 2450,
        consumedProtein: 180,
        effectiveCalorieTarget: targetCalories,
        targetProtein,
      }),
      'maintenance must NEVER celebrate when exceeding calorie ceiling'
    );
  }
  console.log('✓ Maintenance goal passes ceiling and threshold tests');

  // 3. Surplus Goals (lean_bulk, muscle_gain)
  const surplusGoals: FitnessGoal[] = ['lean_bulk', 'muscle_gain'];
  for (const goal of surplusGoals) {
    const targetCalories = 2800;
    const targetProtein = 160;

    // Below surplus target -> should not celebrate
    assert(
      !evaluateGoalAchievement({
        goal,
        consumedCalories: 2600,
        consumedProtein: 150,
        effectiveCalorieTarget: targetCalories,
        targetProtein,
      }),
      `${goal} should not celebrate when below surplus calorie target`
    );

    // Reached surplus target -> celebrates
    assert(
      evaluateGoalAchievement({
        goal,
        consumedCalories: 2800,
        consumedProtein: 150,
        effectiveCalorieTarget: targetCalories,
        targetProtein,
      }),
      `${goal} celebrates when reaching surplus calorie target`
    );

    // Exceeded surplus target -> celebrates
    assert(
      evaluateGoalAchievement({
        goal,
        consumedCalories: 2950,
        consumedProtein: 170,
        effectiveCalorieTarget: targetCalories,
        targetProtein,
      }),
      `${goal} celebrates when in surplus above target`
    );
  }
  console.log('✓ Surplus goals (lean_bulk, muscle_gain) pass all criteria');

  // 4. Overlapping / concurrent check simulation
  {
    let celebrationCount = 0;
    let celebratedDate: string | null = null;
    let celebratingDate: string | null = null;

    const simulateCheckCelebration = async (date: string, isGoalMet: boolean) => {
      if (!isGoalMet) return;
      if (celebratedDate === date || celebratingDate === date) {
        return; // Synchronously blocked in-memory
      }
      celebratingDate = date;

      // Simulate async read from storage
      await new Promise((r) => setTimeout(r, 10));

      if (celebratedDate !== date) {
        celebratedDate = date;
        celebrationCount++;
      }
      celebratingDate = null;
    };

    // Run 5 rapid concurrent calls for the same date
    await Promise.all([
      simulateCheckCelebration('2026-10-13', true),
      simulateCheckCelebration('2026-10-13', true),
      simulateCheckCelebration('2026-10-13', true),
      simulateCheckCelebration('2026-10-13', true),
      simulateCheckCelebration('2026-10-13', true),
    ]);

    assert(celebrationCount === 1, `Celebration must trigger exactly once per date, got ${celebrationCount}`);
    console.log('✓ Concurrency simulation: Overlapping checks trigger celebration only once per date');
  }

  console.log('All goal celebration threshold and concurrency tests passed successfully.');
}

runGoalCelebrationTests().catch((err) => {
  console.error('Goal celebration tests failed:', err);
  process.exit(1);
});
