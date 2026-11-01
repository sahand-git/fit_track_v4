import assert from 'node:assert';
import { categoryLabels, timeLabels, getSlotStats } from './supplementTypes';
import { LoggedDailySupplement, SupplementCategory, SupplementTime } from '../../types';
import { resolveSupplementNutrientContribution, calculateMicronutrientIntake } from '../../utils/micronutrients';
import { calculateNutrientDayProgress } from '../../utils/nutrientTotals';

console.log('Starting Supplement Component & Flow Unit Tests...');

// Test 1: Category labels completeness
const categories: SupplementCategory[] = ['vitamin', 'mineral', 'supplement', 'other'];
categories.forEach((cat) => {
  assert(categoryLabels[cat], `Missing label mapping for category ${cat}`);
});
console.log('✓ Test 1 passed: All 4 supplement categories properly mapped.');

// Test 2: Time labels completeness
const slots: SupplementTime[] = ['morning', 'afternoon', 'evening', 'bedtime'];
slots.forEach((slot) => {
  assert(timeLabels[slot], `Missing label mapping for time slot ${slot}`);
});
console.log('✓ Test 2 passed: All 4 supplement time slots properly mapped.');

// Test 3: Slot item aggregation and taken count computation
const mockSupplements: LoggedDailySupplement[] = [
  {
    id: 'sup_1',
    name: 'Vitamin D3',
    time: 'morning',
    taken: true,
    amount: 2000,
    unit: 'IU',
  },
  {
    id: 'sup_2',
    name: 'Omega 3 Fish Oil',
    time: 'morning',
    taken: false,
    amount: 1000,
    unit: 'mg',
  },
  {
    id: 'sup_3',
    name: 'Magnesium Glycinate',
    time: 'bedtime',
    taken: true,
    amount: 400,
    unit: 'mg',
  },
];

const morningStats = getSlotStats(mockSupplements, 'morning');
assert.strictEqual(morningStats.total, 2, 'Morning slot should have 2 items');
assert.strictEqual(morningStats.taken, 1, 'Morning slot should have 1 taken item');

const bedtimeStats = getSlotStats(mockSupplements, 'bedtime');
assert.strictEqual(bedtimeStats.total, 1, 'Bedtime slot should have 1 item');
assert.strictEqual(bedtimeStats.taken, 1, 'Bedtime slot should have 1 taken item');
console.log('✓ Test 3 passed: Slot aggregation and completion calculation verified.');

// Test 4: Explicit unit conversion (Vitamin D IU->mcg, Vitamin A IU->mcg RAE, mg, mcg, g)
{
  // 1. Vitamin D3 in IU: 2000 IU * 0.025 = 50 mcg
  const d3Contrib = resolveSupplementNutrientContribution({
    name: 'Vitamin D3',
    amount: 2000,
    unit: 'IU',
  });
  assert(d3Contrib !== null);
  assert.strictEqual(d3Contrib.nutrientKey, 'vitaminD');
  assert.strictEqual(d3Contrib.amountInCanonicalUnit, 50);
  assert.strictEqual(d3Contrib.isCompatibleUnit, true);
  assert.strictEqual(d3Contrib.unitStatus, 'valid');

  // 2. Vitamin A in IU: 5000 IU * 0.3 = 1500 mcg RAE
  const aContrib = resolveSupplementNutrientContribution({
    name: 'Vitamin A',
    amount: 5000,
    unit: 'IU',
  });
  assert(aContrib !== null);
  assert.strictEqual(aContrib.nutrientKey, 'vitaminA');
  assert.strictEqual(aContrib.amountInCanonicalUnit, 1500);
  assert.strictEqual(aContrib.isCompatibleUnit, true);

  // 3. Vitamin C in grams: 1 g -> 1000 mg
  const cContrib = resolveSupplementNutrientContribution({
    name: 'Vitamin C',
    amount: 1,
    unit: 'g',
  });
  assert(cContrib !== null);
  assert.strictEqual(cContrib.nutrientKey, 'vitaminC');
  assert.strictEqual(cContrib.amountInCanonicalUnit, 1000);
  assert.strictEqual(cContrib.isCompatibleUnit, true);

  // 4. Zinc in mcg: 15000 mcg -> 15 mg
  const znContrib = resolveSupplementNutrientContribution({
    name: 'Zinc Picolinate',
    amount: 15000,
    unit: 'mcg',
  });
  assert(znContrib !== null);
  assert.strictEqual(znContrib.nutrientKey, 'zinc');
  assert.strictEqual(znContrib.amountInCanonicalUnit, 15);
  assert.strictEqual(znContrib.isCompatibleUnit, true);

  // 5. Incompatible unit: Magnesium with IU (minerals do not use IU) -> check unit
  const mgIncompatible = resolveSupplementNutrientContribution({
    name: 'Magnesium Glycinate',
    amount: 400,
    unit: 'IU',
  });
  assert(mgIncompatible !== null);
  assert.strictEqual(mgIncompatible.isCompatibleUnit, false);
  assert.strictEqual(mgIncompatible.unitStatus, 'incompatible');
  assert.strictEqual(mgIncompatible.unitWarning, 'Check unit');
  assert.strictEqual(mgIncompatible.amountInCanonicalUnit, 0);

  // 6. Unknown unit: Vitamin D with drops -> check unit
  const unknownUnit = resolveSupplementNutrientContribution({
    name: 'Vitamin D3',
    amount: 5,
    unit: 'drops',
  });
  assert(unknownUnit !== null);
  assert.strictEqual(unknownUnit.isCompatibleUnit, false);
  assert.strictEqual(unknownUnit.unitStatus, 'unknown');
  assert.strictEqual(unknownUnit.unitWarning, 'Check unit');
  assert.strictEqual(unknownUnit.amountInCanonicalUnit, 0);
}
console.log('✓ Test 4 passed: Explicit unit handling & conversions verified.');

// Test 5: Plausible dose warnings
{
  // Vitamin D3 > 100 mcg (4000 IU) UL: 10000 IU = 250 mcg
  const d3High = resolveSupplementNutrientContribution({
    name: 'Vitamin D3',
    amount: 10000,
    unit: 'IU',
  });
  assert(d3High !== null);
  assert(Boolean(d3High.doseWarning), 'Should have plausible dose warning for 10000 IU Vitamin D');
  assert.strictEqual(d3High.doseWarning, 'Higher than typical daily guidance. Verify label.');

  // Normal dose: Vitamin D3 2000 IU -> no warning
  const d3Normal = resolveSupplementNutrientContribution({
    name: 'Vitamin D3',
    amount: 2000,
    unit: 'IU',
  });
  assert(d3Normal !== null);
  assert.strictEqual(d3Normal.doseWarning, undefined);

  // Magnesium > 350 mg UL for supplements: 500 mg
  const mgHigh = resolveSupplementNutrientContribution({
    name: 'Magnesium Glycinate',
    amount: 500,
    unit: 'mg',
  });
  assert(mgHigh !== null);
  assert(Boolean(mgHigh.doseWarning), 'Should have plausible dose warning for 500 mg Magnesium');

  // Zinc > 40 mg UL: 50 mg
  const znHigh = resolveSupplementNutrientContribution({
    name: 'Zinc Picolinate',
    amount: 50,
    unit: 'mg',
  });
  assert(znHigh !== null);
  assert(Boolean(znHigh.doseWarning), 'Should have plausible dose warning for 50 mg Zinc');
}
console.log('✓ Test 5 passed: Plausible dose warnings verified.');

// Test 6: Integration flow: Today & Supplements screen marking/unmarking and RDA/modal updates
{
  let dailySupplements: LoggedDailySupplement[] = [
    {
      id: 'sup_d3',
      name: 'Vitamin D3',
      time: 'morning',
      taken: false,
      amount: 2000,
      unit: 'IU',
    },
    {
      id: 'sup_mg',
      name: 'Magnesium Glycinate',
      time: 'bedtime',
      taken: false,
      amount: 200,
      unit: 'mg',
    },
  ];

  // 1. Initial untaken state: Both contribute 0 to intake
  let rda = calculateMicronutrientIntake([], dailySupplements);
  assert.strictEqual(rda.nutrients.vitaminD.supplementAmount, 0);
  assert.strictEqual(rda.nutrients.magnesium.supplementAmount, 0);

  let dProgress = calculateNutrientDayProgress('vitaminD', [], dailySupplements);
  assert.strictEqual(dProgress.current, 0);
  assert.strictEqual(dProgress.contributors.length, 0);

  // 2. User marks Vitamin D3 as taken on Today / Supplements screen
  dailySupplements = dailySupplements.map((s) => (s.id === 'sup_d3' ? { ...s, taken: true } : s));

  rda = calculateMicronutrientIntake([], dailySupplements);
  assert.strictEqual(rda.nutrients.vitaminD.supplementAmount, 50); // 2000 IU = 50 mcg
  assert.strictEqual(rda.nutrients.vitaminD.current, 50);
  assert.strictEqual(rda.nutrients.vitaminD.percent, 250); // 50 / 20 = 250% RDA
  assert.strictEqual(rda.nutrients.magnesium.supplementAmount, 0); // Still untaken

  dProgress = calculateNutrientDayProgress('vitaminD', [], dailySupplements);
  assert.strictEqual(dProgress.current, 50);
  assert.strictEqual(dProgress.contributors.length, 1);
  assert.strictEqual(dProgress.contributors[0].name, 'Vitamin D3');
  assert.strictEqual(dProgress.contributors[0].isSupplement, true);
  assert.strictEqual(dProgress.contributors[0].amount, 50);

  // 3. User unmarks Vitamin D3
  dailySupplements = dailySupplements.map((s) => (s.id === 'sup_d3' ? { ...s, taken: false } : s));

  rda = calculateMicronutrientIntake([], dailySupplements);
  assert.strictEqual(rda.nutrients.vitaminD.supplementAmount, 0);
  assert.strictEqual(rda.nutrients.vitaminD.current, 0);

  dProgress = calculateNutrientDayProgress('vitaminD', [], dailySupplements);
  assert.strictEqual(dProgress.current, 0);
  assert.strictEqual(dProgress.contributors.length, 0);

  // 4. Incompatible unit supplement marked taken: does NOT corrupt total
  dailySupplements.push({
    id: 'sup_bad',
    name: 'Magnesium Citrate',
    time: 'morning',
    taken: true,
    amount: 500,
    unit: 'IU', // incompatible unit for magnesium!
  });

  rda = calculateMicronutrientIntake([], dailySupplements);
  assert.strictEqual(rda.nutrients.magnesium.supplementAmount, 0, 'Incompatible unit must not add to total');

  let mgProgress = calculateNutrientDayProgress('magnesium', [], dailySupplements);
  assert.strictEqual(mgProgress.current, 0);
  assert(mgProgress.missingItems.some((item) => item.name.includes('Magnesium Citrate')), 'Should appear in missing/attention items');
}
console.log('✓ Test 6 passed: Marking/unmarking integration flow and modal updates verified.');

console.log('All Supplement Component & Flow Unit Tests PASSED Cleanly!');
