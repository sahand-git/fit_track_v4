import assert from 'node:assert';
import {
  calculateNutrientDayProgress,
  calculateNutrientProgress,
  formatIntakeBreakdown,
  SupportedNutrientKey,
} from './nutrientTotals';
import { calculateMicronutrientIntake, ORDERED_MICRONUTRIENT_KEYS } from './micronutrients';
import { LoggedMeal, UserProfile } from '../types';
import { translate } from '../i18n/strings';

console.log('--- Starting Nutrient Detail & Target Fixes Unit Tests ---');

const baseProfile: UserProfile = {
  name: 'Test User',
  age: 25,
  gender: 'female',
  weightKg: 60,
  heightCm: 165,
  activityLevel: 'moderate',
  goal: 'maintenance',
  targetCalories: 2000,
  targetProtein: 120,
  targetCarbs: 220,
  targetFat: 60,
  waterTargetGlasses: 8,
  bmr: 1350,
  tdee: 2000,
};

const profileAge15: UserProfile = { ...baseProfile, age: 15 };
const profileAge18: UserProfile = { ...baseProfile, age: 18 };
const profileAge19: UserProfile = { ...baseProfile, age: 19 };
const profileMissingAge: UserProfile = { ...baseProfile, age: undefined as unknown as number };

const sampleMeal: LoggedMeal = {
  id: 'meal_1',
  foodId: 'food_egg_boiled',
  name: 'Boiled Egg',
  calories: 78,
  protein: 6.3,
  carbs: 0.6,
  fat: 5.3,
  mealType: 'breakfast',
  servings: 1,
  servingSize: '1 large (50g)',
  servingGrams: 50,
  timestamp: new Date().toISOString(),
  vitaminA: 75,
  iron: 0.6,
  calcium: 25,
  potassium: 63,
  sodium: 62,
  zinc: 0.5,
};

// -----------------------------------------------------------------------------
// 1. Tests for hasTarget, percent, remaining across ages 15, 18, 19, missing age
// -----------------------------------------------------------------------------
console.log('Testing hasTarget across age bands (15, 18, 19, missing age)...');

const driNutrientKeys: SupportedNutrientKey[] = [
  'fiber',
  'sugar',
  'sodium',
  'vitaminA',
  'vitaminC',
  'vitaminD',
  'vitaminB12',
  'calcium',
  'iron',
  'potassium',
  'magnesium',
  'zinc',
];

for (const key of driNutrientKeys) {
  // Age 15 (< 19): No adult targets
  const p15 = calculateNutrientDayProgress(key, [sampleMeal], [], profileAge15);
  assert.strictEqual(p15.hasTarget, false, `[${key}] age 15 must have hasTarget = false`);
  assert.strictEqual(p15.noTargetReason, 'No daily target for under 19', `[${key}] age 15 reason`);
  assert.strictEqual(p15.target, 0, `[${key}] age 15 target must be 0`);
  assert.strictEqual(p15.percent, 0, `[${key}] age 15 percent must be 0`);
  assert.strictEqual(p15.remaining, 0, `[${key}] age 15 remaining must be 0`);

  // Age 18 (< 19): No adult targets
  const p18 = calculateNutrientDayProgress(key, [sampleMeal], [], profileAge18);
  assert.strictEqual(p18.hasTarget, false, `[${key}] age 18 must have hasTarget = false`);
  assert.strictEqual(p18.noTargetReason, 'No daily target for under 19', `[${key}] age 18 reason`);
  assert.strictEqual(p18.target, 0, `[${key}] age 18 target must be 0`);
  assert.strictEqual(p18.percent, 0, `[${key}] age 18 percent must be 0`);
  assert.strictEqual(p18.remaining, 0, `[${key}] age 18 remaining must be 0`);

  // Age 19 (Adult): Adult DRIs apply
  const p19 = calculateNutrientDayProgress(key, [sampleMeal], [], profileAge19);
  assert.strictEqual(p19.hasTarget, true, `[${key}] age 19 must have hasTarget = true`);
  assert.strictEqual(p19.noTargetReason, undefined, `[${key}] age 19 noTargetReason is undefined`);
  assert.ok(p19.target > 0, `[${key}] age 19 target must be > 0 (got ${p19.target})`);

  // Missing Age (undefined): General adult DRIs apply
  const pMissing = calculateNutrientDayProgress(key, [sampleMeal], [], profileMissingAge);
  assert.strictEqual(pMissing.hasTarget, true, `[${key}] missing age must have hasTarget = true`);
  assert.strictEqual(pMissing.noTargetReason, undefined, `[${key}] missing age noTargetReason is undefined`);
  assert.ok(pMissing.target > 0, `[${key}] missing age target must be > 0 (got ${pMissing.target})`);

  // Alias verification: calculateNutrientProgress === calculateNutrientDayProgress
  const pAlias = calculateNutrientProgress(key, [sampleMeal], [], profileAge15);
  assert.strictEqual(pAlias.hasTarget, false, `[${key}] calculateNutrientProgress alias must match`);
}

// -----------------------------------------------------------------------------
// 2. Custom Goal Override for Minor
// -----------------------------------------------------------------------------
console.log('Testing custom goal override for minors (<19)...');

const profileMinorCustomGoal: UserProfile = {
  ...profileAge15,
  customNutrientGoals: {
    iron: 25,
    vitaminC: 100,
  },
};

const customIronProgress = calculateNutrientDayProgress('iron', [sampleMeal], [], profileMinorCustomGoal);
assert.strictEqual(customIronProgress.hasTarget, true, 'Custom goal gives minor hasTarget = true');
assert.strictEqual(customIronProgress.isCustomTarget, true, 'Marked as isCustomTarget = true');
assert.strictEqual(customIronProgress.target, 25, 'Target is custom 25 mg');
assert.ok(customIronProgress.remaining > 0, 'Remaining is calculated from custom target');

// -----------------------------------------------------------------------------
// 3. Sodium & Limit Nutrients (CDRR 2,300 mg) - Neutral Wording & No "Remaining"
// -----------------------------------------------------------------------------
console.log('Testing Sodium & limit nutrients behavior...');

const sodiumProgress = calculateNutrientDayProgress('sodium', [sampleMeal], [], profileAge19);
assert.strictEqual(sodiumProgress.isLimitNutrient, true, 'Sodium is marked as isLimitNutrient');
assert.strictEqual(sodiumProgress.hasTarget, true, 'Adult sodium hasTarget = true');
assert.strictEqual(sodiumProgress.target, 2300, 'Adult sodium limit target is 2300 mg');
assert.strictEqual(sodiumProgress.remaining, 0, 'Sodium remaining MUST be 0 (never show remaining toward limit)');

const sugarProgress = calculateNutrientDayProgress('sugar', [sampleMeal], [], profileAge19);
assert.strictEqual(sugarProgress.label, 'Total Sugar', 'Sugar is clearly labeled as Total Sugar');
assert.strictEqual(sugarProgress.isLimitNutrient, true, 'Sugar is marked as isLimitNutrient');
assert.strictEqual(sugarProgress.remaining, 0, 'Sugar remaining MUST be 0');
assert.strictEqual(sugarProgress.target, 50, 'Sugar upper limit reference is 50g');
assert.ok(
  sugarProgress.description?.includes('Total sugars') && sugarProgress.description?.includes('natural sugars'),
  'Sugar description clearly explains total sugars including natural sugars'
);
assert.ok(
  sugarProgress.disclaimer?.includes('Reliable added-sugar data is not separately available'),
  'Sugar disclaimer honestly handles lack of separate added sugar data'
);
assert.strictEqual(
  translate('ar', 'Total Sugar'),
  'إجمالي السكر',
  'Arabic translation for Total Sugar is correct'
);
assert.strictEqual(
  translate('ckb', 'Total Sugar'),
  'کۆی شەکر',
  'Kurdish translation for Total Sugar is correct'
);

// -----------------------------------------------------------------------------
// 3b. General Adult Target Explanations for Gender "other" or Unspecified
// -----------------------------------------------------------------------------
console.log('Testing general adult target explanation for gender "other" or missing...');

const profileAdultOtherGender: UserProfile = { ...profileAge19, gender: 'other' };
const profileAdultNoGender: UserProfile = { ...profileAge19, gender: undefined as unknown as 'female' };
const profileAdultMale: UserProfile = { ...profileAge19, gender: 'male' };
const profileAdultFemale: UserProfile = { ...profileAge19, gender: 'female' };

const progressOther = calculateNutrientDayProgress('iron', [sampleMeal], [], profileAdultOtherGender);
assert.strictEqual(progressOther.isGeneralAdultTarget, true, 'Gender "other" triggers isGeneralAdultTarget');
assert.strictEqual(progressOther.genderApplied, 'general_adult', 'genderApplied is general_adult');

const progressNoGender = calculateNutrientDayProgress('iron', [sampleMeal], [], profileAdultNoGender);
assert.strictEqual(progressNoGender.isGeneralAdultTarget, true, 'Missing gender triggers isGeneralAdultTarget');
assert.strictEqual(progressNoGender.genderApplied, 'general_adult', 'genderApplied is general_adult');

const progressMale = calculateNutrientDayProgress('iron', [sampleMeal], [], profileAdultMale);
assert.strictEqual(progressMale.isGeneralAdultTarget, false, 'Male gender does NOT trigger isGeneralAdultTarget');
assert.strictEqual(progressMale.genderApplied, 'male', 'genderApplied is male');

const progressFemale = calculateNutrientDayProgress('iron', [sampleMeal], [], profileAdultFemale);
assert.strictEqual(progressFemale.isGeneralAdultTarget, false, 'Female gender does NOT trigger isGeneralAdultTarget');
assert.strictEqual(progressFemale.genderApplied, 'female', 'genderApplied is female');

// Minors should never be flagged as general adult target
const progressMinorOther = calculateNutrientDayProgress('iron', [sampleMeal], [], { ...profileAge15, gender: 'other' });
assert.strictEqual(progressMinorOther.isGeneralAdultTarget, false, 'Minors do not have isGeneralAdultTarget');

// Custom targets should not be flagged as general adult target
const progressCustomOther = calculateNutrientDayProgress('iron', [sampleMeal], [], {
  ...profileAdultOtherGender,
  customNutrientGoals: { iron: 30 },
});
assert.strictEqual(progressCustomOther.isGeneralAdultTarget, false, 'Custom targets do not have isGeneralAdultTarget');

// Check localization of general adult notice strings
assert.ok(translate('en', 'General adult reference target').length > 0);
assert.strictEqual(
  translate('ar', 'General adult reference target'),
  'الهدف المرجعي العام للبالغين',
  'Arabic translation for General adult reference target'
);
assert.strictEqual(
  translate('ckb', 'General adult reference target'),
  'ئامانجی گشتی بۆ پێگەیشتوان',
  'Kurdish translation for General adult reference target'
);
assert.ok(
  translate(
    'ar',
    'General adult reference values are applied when gender is not specified or is other. These values may differ from sex-specific recommendations.'
  ).includes('القيم المرجعية العامة للبالغين')
);
assert.ok(
  translate(
    'ckb',
    'General adult reference values are applied when gender is not specified or is other. These values may differ from sex-specific recommendations.'
  ).includes('بەهاکانی ئاماژەی گشتیی پێگەیشتوان')
);

// -----------------------------------------------------------------------------
// 4. Intake Breakdown Formatter (no nested brackets)
// -----------------------------------------------------------------------------
console.log('Testing formatIntakeBreakdown (no nested brackets)...');

// Food only
const bd1 = formatIntakeBreakdown(
  { foodAmount: 870.3, supplementAmount: 0, missingCount: 0, unit: 'mg', totalMealsCount: 3 },
  (k) => translate('en', k)
);
assert.strictEqual(bd1, '870.3 mg from foods', 'Food only formatted correctly');

// Food + missing foods
const bd2 = formatIntakeBreakdown(
  { foodAmount: 870.3, supplementAmount: 0, missingCount: 2, unit: 'mg', totalMealsCount: 4 },
  (k) => translate('en', k)
);
assert.strictEqual(bd2, '870.3 mg from foods · no data for 2 foods', 'Food + missing formatted correctly');
assert.ok(!bd2.includes('((') && !bd2.includes('))'), 'No nested brackets in food + missing');

// Food + supplements + missing
const bd3 = formatIntakeBreakdown(
  { foodAmount: 870.3, supplementAmount: 50, missingCount: 1, unit: 'mg', totalMealsCount: 3 },
  (k) => translate('en', k)
);
assert.strictEqual(bd3, '870.3 mg from foods · 50 mg from supplements · no data for 1 food', 'Food + supp + missing');

// Supplements only + missing
const bd4 = formatIntakeBreakdown(
  { foodAmount: 0, supplementAmount: 20, missingCount: 3, unit: 'mcg', totalMealsCount: 3 },
  (k) => translate('en', k)
);
assert.strictEqual(bd4, '20 mcg from supplements · no data for 3 foods', 'Supplements only + missing');

// Arabic localization test
const bdAr = formatIntakeBreakdown(
  { foodAmount: 870.3, supplementAmount: 0, missingCount: 2, unit: 'mg', totalMealsCount: 4 },
  (k) => translate('ar', k)
);
assert.strictEqual(bdAr, '870.3 mg من الأطعمة · لا تتوفر بيانات لـ 2 أطعمة', 'Arabic breakdown formatted correctly');

// Kurdish Sorani localization test
const bdCkb = formatIntakeBreakdown(
  { foodAmount: 870.3, supplementAmount: 0, missingCount: 2, unit: 'mg', totalMealsCount: 4 },
  (k) => translate('ckb', k)
);
assert.strictEqual(bdCkb, '870.3 mg لە خۆراکەکانەوە · زانیاری نییە بۆ 2 خۆراکەکان', 'Kurdish breakdown formatted correctly');

// -----------------------------------------------------------------------------
// 5. calculateMicronutrientIntake Integration
// -----------------------------------------------------------------------------
console.log('Testing calculateMicronutrientIntake hasTarget & minor handling...');

const minorAnalysis = calculateMicronutrientIntake([sampleMeal], [], profileAge15);
for (const key of ORDERED_MICRONUTRIENT_KEYS) {
  const item = minorAnalysis.nutrients[key];
  assert.ok(item, `Nutrient ${key} exists in analysis`);
  assert.strictEqual(item.hasTarget, false, `[${key}] minor hasTarget = false`);
  assert.strictEqual(item.noTargetReason, 'No daily target for under 19', `[${key}] minor noTargetReason`);
  assert.strictEqual(item.target, undefined, `[${key}] minor target is undefined`);
  assert.strictEqual(item.percent, 0, `[${key}] minor percent is 0`);
  assert.strictEqual(item.remaining, 0, `[${key}] minor remaining is 0`);
}

const adultAnalysis = calculateMicronutrientIntake([sampleMeal], [], profileAge19);
for (const key of ORDERED_MICRONUTRIENT_KEYS) {
  const item = adultAnalysis.nutrients[key];
  assert.ok(item, `Nutrient ${key} exists in adult analysis`);
  assert.strictEqual(item.hasTarget, true, `[${key}] adult hasTarget = true`);
  assert.strictEqual(item.noTargetReason, undefined, `[${key}] adult noTargetReason is undefined`);
  assert.ok(typeof item.target === 'number' && item.target > 0, `[${key}] adult target > 0`);
}

console.log('\n======================================================');
console.log('✓ All Phase 3 Nutrient Detail & Target Unit Tests Passed Cleanly!');
console.log('======================================================\n');
