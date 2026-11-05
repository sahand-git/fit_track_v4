import {
  getDriTarget,
  getDriAgeBand,
  evaluateUpperLimit,
  calculateVitaminARAE,
  convertVitaminDToMcg,
  convertVitaminDToIU,
  calculateVitaminEAlphaTocopherol,
  calculateFolateDFE,
  calculateNiacinNE,
  convertMetricWeight,
} from '../data/driTargets';
import { calculateMicronutrientIntake } from './micronutrients';
import { calculateNutrientDayProgress } from './nutrientTotals';
import { UserProfile, LoggedMeal, LoggedDailySupplement } from '../types';

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

console.log('--- Starting DRI Targets & Bio-Equivalence Unit Tests ---');

// ============================================================================
// 1. Age & Gender Stratification (Adults 19+)
// ============================================================================
console.log('Testing Age Bands & Gender Stratification...');

// 1a. Under 19 (Minors) - Must NOT return adult targets
const minor16 = getDriTarget('vitaminD', 16, 'male');
assert(!minor16.isAdult, 'User age 16 is not an adult');
assert(minor16.target === undefined, 'No adult target returned for age 16');
assert(minor16.targetType === undefined, 'No target type for age 16');
assert(minor16.disclaimer.includes('adults 19+'), 'Minor disclaimer states targets are for adults 19+');

const minor18 = getDriTarget('calcium', 18, 'female');
assert(!minor18.isAdult, 'User age 18 is not an adult');
assert(minor18.target === undefined, 'No adult target returned for age 18');

// 1b. Age band classifications
assert(getDriAgeBand(18) === undefined, 'Age 18 has no adult age band');
assert(getDriAgeBand(19) === '19-30', 'Age 19 is 19-30');
assert(getDriAgeBand(30) === '19-30', 'Age 30 is 19-30');
assert(getDriAgeBand(31) === '31-50', 'Age 31 is 31-50');
assert(getDriAgeBand(50) === '31-50', 'Age 50 is 31-50');
assert(getDriAgeBand(51) === '51-70', 'Age 51 is 51-70');
assert(getDriAgeBand(70) === '51-70', 'Age 70 is 51-70');
assert(getDriAgeBand(71) === '71+', 'Age 71 is 71+');
assert(getDriAgeBand(85) === '71+', 'Age 85 is 71+');

// 1c. Gender-specific RDA targets (Young Adults 19-30)
const male25Iron = getDriTarget('iron', 25, 'male');
const female25Iron = getDriTarget('iron', 25, 'female');
assert(male25Iron.target === 8, 'Male 25 Iron RDA is 8 mg');
assert(female25Iron.target === 18, 'Female 25 Iron RDA is 18 mg (premenopausal)');

const male25VitA = getDriTarget('vitaminA', 25, 'male');
const female25VitA = getDriTarget('vitaminA', 25, 'female');
assert(male25VitA.target === 900, 'Male 25 Vitamin A RDA is 900 mcg RAE');
assert(female25VitA.target === 700, 'Female 25 Vitamin A RDA is 700 mcg RAE');

const male25VitC = getDriTarget('vitaminC', 25, 'male');
const female25VitC = getDriTarget('vitaminC', 25, 'female');
assert(male25VitC.target === 90, 'Male 25 Vitamin C RDA is 90 mg');
assert(female25VitC.target === 75, 'Female 25 Vitamin C RDA is 75 mg');

const male25Mg = getDriTarget('magnesium', 25, 'male');
const female25Mg = getDriTarget('magnesium', 25, 'female');
assert(male25Mg.target === 400, 'Male 19-30 Magnesium RDA is 400 mg');
assert(female25Mg.target === 310, 'Female 19-30 Magnesium RDA is 310 mg');

// 1d. Age-band shifts (31-50, 51-70, 71+)
// Magnesium increases at age 31
const male35Mg = getDriTarget('magnesium', 35, 'male');
const female35Mg = getDriTarget('magnesium', 35, 'female');
assert(male35Mg.target === 420, 'Male 31+ Magnesium RDA is 420 mg');
assert(female35Mg.target === 320, 'Female 31+ Magnesium RDA is 320 mg');

// Iron drops for postmenopausal women (51+)
const female55Iron = getDriTarget('iron', 55, 'female');
assert(female55Iron.target === 8, 'Female 51+ Iron RDA drops to 8 mg');

// Calcium increases for women 51+ and men 71+
const female55Calcium = getDriTarget('calcium', 55, 'female');
const male55Calcium = getDriTarget('calcium', 55, 'male');
const male75Calcium = getDriTarget('calcium', 75, 'male');
assert(female55Calcium.target === 1200, 'Female 51+ Calcium RDA is 1200 mg');
assert(male55Calcium.target === 1000, 'Male 51-70 Calcium RDA is 1000 mg');
assert(male75Calcium.target === 1200, 'Male 71+ Calcium RDA is 1200 mg');

// Vitamin D increases at 71+
const adult40VitD = getDriTarget('vitaminD', 40, 'male');
const adult75VitD = getDriTarget('vitaminD', 75, 'male');
assert(adult40VitD.target === 15, 'Adult 19-70 Vitamin D RDA is 15 mcg');
assert(adult75VitD.target === 20, 'Adult 71+ Vitamin D RDA is 20 mcg');

// Vitamin B6 increases at 51+
const male25B6 = getDriTarget('vitaminB6', 25, 'male');
const male55B6 = getDriTarget('vitaminB6', 55, 'male');
const female55B6 = getDriTarget('vitaminB6', 55, 'female');
assert(male25B6.target === 1.3, 'Male 19-50 Vitamin B6 RDA is 1.3 mg');
assert(male55B6.target === 1.7, 'Male 51+ Vitamin B6 RDA is 1.7 mg');
assert(female55B6.target === 1.5, 'Female 51+ Vitamin B6 RDA is 1.5 mg');

// Fiber shifts at 51+
const male25Fiber = getDriTarget('fiber', 25, 'male');
const male55Fiber = getDriTarget('fiber', 55, 'male');
const female25Fiber = getDriTarget('fiber', 25, 'female');
const female55Fiber = getDriTarget('fiber', 55, 'female');
assert(male25Fiber.target === 38, 'Male 19-50 Fiber AI is 38 g');
assert(male55Fiber.target === 30, 'Male 51+ Fiber AI is 30 g');
assert(female25Fiber.target === 25, 'Female 19-50 Fiber AI is 25 g');
assert(female55Fiber.target === 21, 'Female 51+ Fiber AI is 21 g');

// 1e. General adult fallback for gender 'other' or missing gender
const generalAdultVitA = getDriTarget('vitaminA', 25, 'other');
assert(generalAdultVitA.genderApplied === 'general_adult', 'Gender other maps to general_adult');
assert(generalAdultVitA.target === 900, 'General adult Vitamin A target is 900 mcg RAE');

const unstatedGenderVitC = getDriTarget('vitaminC', 25, undefined);
assert(unstatedGenderVitC.genderApplied === 'general_adult', 'Undefined gender maps to general_adult');
assert(unstatedGenderVitC.target === 90, 'General adult Vitamin C target is 90 mg');

// 1f. Check medical disclaimer
assert(male25Iron.disclaimer.includes('Pregnancy, lactation'), 'Disclaimer states pregnancy/lactation not handled');

console.log('✓ Age & Gender Stratification tests passed.');

// ============================================================================
// 2. RDA / AI vs. Tolerable Upper Intake Levels (UL)
// ============================================================================
console.log('Testing RDA/AI vs Tolerable Upper Intake Levels (UL)...');

// 2a. Separate RDA vs AI classification
assert(getDriTarget('vitaminA', 30, 'male').targetType === 'RDA', 'Vitamin A is RDA');
assert(getDriTarget('vitaminC', 30, 'male').targetType === 'RDA', 'Vitamin C is RDA');
assert(getDriTarget('calcium', 30, 'male').targetType === 'RDA', 'Calcium is RDA');
assert(getDriTarget('iron', 30, 'male').targetType === 'RDA', 'Iron is RDA');

assert(getDriTarget('vitaminK', 30, 'male').targetType === 'AI', 'Vitamin K is AI');
assert(getDriTarget('potassium', 30, 'male').targetType === 'AI', 'Potassium is AI');
assert(getDriTarget('choline', 30, 'male').targetType === 'AI', 'Choline is AI');
assert(getDriTarget('fiber', 30, 'male').targetType === 'AI', 'Fiber is AI');

// 2b. Upper limit scopes: All Sources vs Supplement-only
const magDri = getDriTarget('magnesium', 30, 'male');
assert(magDri.upperLimit === 350, 'Magnesium UL is 350 mg');
assert(magDri.upperLimitScope === 'supplements_only', 'Magnesium UL applies strictly to supplements');

const vitEDri = getDriTarget('vitaminE', 30, 'male');
assert(vitEDri.upperLimit === 1000, 'Vitamin E UL is 1000 mg');
assert(vitEDri.upperLimitScope === 'supplements_only', 'Vitamin E UL applies strictly to supplements');

const niacinDri = getDriTarget('niacin', 30, 'male');
assert(niacinDri.upperLimit === 35, 'Niacin UL is 35 mg');
assert(niacinDri.upperLimitScope === 'supplements_only', 'Niacin UL applies strictly to supplements/synthetic');

const folateDri = getDriTarget('folate', 30, 'male');
assert(folateDri.upperLimit === 1000, 'Folate UL is 1000 mcg');
assert(folateDri.upperLimitScope === 'synthetic_only', 'Folate UL applies strictly to synthetic folic acid');

const calciumDri = getDriTarget('calcium', 30, 'male');
assert(calciumDri.upperLimit === 2500, 'Calcium 19-50 UL is 2500 mg');
assert(calciumDri.upperLimitScope === 'all_sources', 'Calcium UL applies to all sources');

// 2c. evaluateUpperLimit clinical logic
// Magnesium: 500 mg from food, 0 mg from supplements -> MUST NOT EXCEED
const magFoodOnly = evaluateUpperLimit('magnesium', 500, 0, 30, 'male');
assert(!magFoodOnly.exceeds, 'Food magnesium (500mg) does NOT exceed supplement-only UL');
assert(magFoodOnly.applicableIntake === 0, 'Applicable intake for supplement-only UL is 0');

// Magnesium: 100 mg from food, 400 mg from supplements -> EXCEEDS 350 mg
const magWithSupp = evaluateUpperLimit('magnesium', 100, 400, 30, 'male');
assert(magWithSupp.exceeds, 'Supplemental magnesium (400mg) EXCEEDS 350mg UL');
assert(magWithSupp.applicableIntake === 400, 'Applicable intake is supplemental amount');
assert(magWithSupp.warning !== undefined, 'Warning text generated for exceeded UL');

// Calcium: 1800 mg food + 1000 mg supp = 2800 mg -> EXCEEDS 2500 mg (all_sources)
const calciumTotal = evaluateUpperLimit('calcium', 1800, 1000, 30, 'male');
assert(calciumTotal.exceeds, 'Total calcium (2800mg) exceeds 2500mg UL');
assert(calciumTotal.applicableIntake === 2800, 'Applicable intake is total food + supplement');

// Nutrients with no established UL (e.g. Vitamin K, B12)
const vitKUl = evaluateUpperLimit('vitaminK', 500, 200, 30, 'male');
assert(!vitKUl.exceeds, 'Vitamin K has no established UL');

console.log('✓ RDA/AI vs Tolerable Upper Intake Levels tests passed.');

// ============================================================================
// 3. Units & Bio-Equivalence Conversions
// ============================================================================
console.log('Testing Units & Bio-Equivalence Conversions...');

// 3a. Vitamin A: Retinol Activity Equivalents (RAE)
// 1 mcg retinol = 1 mcg RAE
assert(calculateVitaminARAE({ retinolMcg: 500 }) === 500, '500 mcg retinol = 500 mcg RAE');
// 3000 IU retinol = 900 mcg RAE (3000 * 0.3)
assert(calculateVitaminARAE({ retinolIU: 3000 }) === 900, '3000 IU retinol = 900 mcg RAE');
// 2 mcg supplemental beta-carotene = 1 mcg RAE
assert(calculateVitaminARAE({ supplementalBetaCaroteneMcg: 1000 }) === 500, '1000 mcg supp beta-carotene = 500 mcg RAE');
// 12 mcg dietary beta-carotene = 1 mcg RAE
assert(calculateVitaminARAE({ foodBetaCaroteneMcg: 1200 }) === 100, '1200 mcg dietary beta-carotene = 100 mcg RAE');

// 3b. Vitamin D: mcg <-> IU
assert(convertVitaminDToMcg(600) === 15, '600 IU Vitamin D = 15 mcg');
assert(convertVitaminDToMcg(800) === 20, '800 IU Vitamin D = 20 mcg');
assert(convertVitaminDToMcg(4000) === 100, '4000 IU Vitamin D = 100 mcg');
assert(convertVitaminDToIU(15) === 600, '15 mcg Vitamin D = 600 IU');
assert(convertVitaminDToIU(20) === 800, '20 mcg Vitamin D = 800 IU');

// 3c. Vitamin E: alpha-tocopherol
// 100 IU natural (d-alpha) * 0.67 = 67 mg
assert(calculateVitaminEAlphaTocopherol({ iuNatural: 100 }) === 67, '100 IU natural Vit E = 67 mg');
// 100 IU synthetic (dl-alpha) * 0.45 = 45 mg
assert(calculateVitaminEAlphaTocopherol({ iuSynthetic: 100 }) === 45, '100 IU synthetic Vit E = 45 mg');

// 3d. Folate: Dietary Folate Equivalents (DFE)
// 200 mcg food folate + 100 mcg synthetic folic acid with food (1.7 factor) = 200 + 170 = 370 mcg DFE
assert(
  calculateFolateDFE({ foodFolateMcg: 200, syntheticFolicAcidMcg: 100, onEmptyStomach: false }) === 370,
  '200 food + 100 synthetic with food = 370 mcg DFE'
);
// 100 mcg synthetic folic acid on empty stomach (2.0 factor) = 200 mcg DFE
assert(
  calculateFolateDFE({ foodFolateMcg: 0, syntheticFolicAcidMcg: 100, onEmptyStomach: true }) === 200,
  '100 synthetic on empty stomach = 200 mcg DFE'
);

// 3e. Niacin: Niacin Equivalents (NE)
// 10 mg niacin + 600 mg tryptophan (60:1 factor) = 10 + 10 = 20 mg NE
assert(calculateNiacinNE({ niacinMg: 10, tryptophanMg: 600 }) === 20, '10 mg niacin + 600 mg tryptophan = 20 mg NE');

// 3f. Metric weight conversions (mcg vs mg vs g)
assert(convertMetricWeight(1, 'g', 'mg') === 1000, '1 g = 1000 mg');
assert(convertMetricWeight(1, 'g', 'mcg') === 1_000_000, '1 g = 1,000,000 mcg');
assert(convertMetricWeight(5000, 'mcg', 'mg') === 5, '5000 mcg = 5 mg');
assert(convertMetricWeight(0.5, 'mg', 'mcg') === 500, '0.5 mg = 500 mcg');
assert(convertMetricWeight(250, 'mg', 'mg') === 250, 'Same unit preserves value');

console.log('✓ Units & Bio-Equivalence Conversions tests passed.');

// ============================================================================
// 4. Integration with calculateMicronutrientIntake & calculateNutrientDayProgress
// ============================================================================
console.log('Testing Profile Integration in Intake & Progress...');

const femaleProfile: UserProfile = {
  name: 'Sara',
  age: 26,
  gender: 'female',
  weightKg: 60,
  heightCm: 165,
  activityLevel: 'moderate',
  goal: 'maintenance',
  bmr: 1400,
  tdee: 1900,
  targetCalories: 1900,
  targetProtein: 110,
  targetCarbs: 210,
  targetFat: 55,
  waterTargetGlasses: 8,
  language: 'en',
  isOnboarded: true,
};

const maleSeniorProfile: UserProfile = {
  ...femaleProfile,
  name: 'Ahmed',
  age: 72,
  gender: 'male',
};

const minorProfile: UserProfile = {
  ...femaleProfile,
  name: 'Youth',
  age: 15,
};

const mealIron: LoggedMeal = {
  id: 'm_iron_1',
  foodId: 'food_spinach',
  name: 'Spinach Salad',
  mealType: 'lunch',
  servings: 1,
  servingSize: '100g',
  servingGrams: 100,
  calories: 23,
  protein: 2.9,
  carbs: 3.6,
  fat: 0.4,
  iron: 9, // 9 mg iron
  timestamp: '2026-11-01T12:00:00Z',
};

// 4a. Female 26 vs Male 72 Iron Target
const femaleIntake = calculateMicronutrientIntake([mealIron], [], femaleProfile);
assert(femaleIntake.nutrients.iron.target === 18, 'Female 26 Iron target is 18 mg');
assert(femaleIntake.nutrients.iron.percent === 50, '9 mg / 18 mg = 50% for female 26');

const maleIntake = calculateMicronutrientIntake([mealIron], [], maleSeniorProfile);
assert(maleIntake.nutrients.iron.target === 8, 'Male 72 Iron target is 8 mg');
assert(maleIntake.nutrients.iron.percent === 113, '9 mg / 8 mg = 113% for male 72');

// 4b. Senior 72 Vitamin D Target (20 mcg vs 15 mcg)
assert(maleIntake.nutrients.vitaminD.target === 20, 'Senior 72 Vitamin D target is 20 mcg');
assert(femaleIntake.nutrients.vitaminD.target === 15, 'Adult 26 Vitamin D target is 15 mcg');

// 4c. Minor (<19) handling in calculateMicronutrientIntake
const minorIntake = calculateMicronutrientIntake([mealIron], [], minorProfile);
assert(minorIntake.isMinor === true, 'Minor intake is marked as minor');
assert(minorIntake.nutrients.iron.target === undefined, 'Minor has no adult iron target');
assert(minorIntake.nutrients.iron.isDeficient === false, 'Minor is not flagged as deficient against adult RDA');
assert(minorIntake.targetsMetCount === 0, 'Minor targetsMetCount is 0');

// 4d. calculateNutrientDayProgress with minor profile
const minorProgress = calculateNutrientDayProgress('iron', [mealIron], [], minorProfile);
assert(minorProgress.isMinor === true, 'Progress is marked as minor');
assert(minorProgress.target === 0, 'Target is 0 for minor');
assert(minorProgress.minorNotice !== undefined, 'Minor notice is displayed');

// 4e. Magnesium supplement-only upper limit in intake
const suppMagHigh: LoggedDailySupplement = {
  id: 'supp_mag_high',
  name: 'Magnesium Glycinate',
  amount: 400,
  unit: 'mg',
  time: 'bedtime',
  taken: true,
};
const magIntakeResult = calculateMicronutrientIntake([], [suppMagHigh], femaleProfile);
assert(magIntakeResult.nutrients.magnesium.upperLimitWarning !== undefined, 'Supplemental magnesium exceeding 350mg triggers warning');

console.log('✓ Profile Integration tests passed.');

console.log('\n======================================================');
console.log('✓ All Phase 3 DRI Targets & Conversions tests passed with 100% success!');
console.log('======================================================');
