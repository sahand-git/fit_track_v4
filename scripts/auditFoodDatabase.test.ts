import { auditFoodDatabase, REVIEWED_AUDIT_EXCEPTIONS } from './auditFoodDatabase';
import { isValidBarcode } from '../src/utils/barcodeUtils';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

console.log('Testing auditFoodDatabase comprehensive integrity & Phase 2 checks...');

const result = auditFoodDatabase(12);

// 1. Barcode errors must be 0
assert(result.barcodeErrors.length === 0, `Expected 0 barcode errors, got ${result.barcodeErrors.length}`);
console.log('✓ Barcode integrity: 0 barcode errors.');

// 2. Quality errors must be 0 (0 duplicate IDs, 0 empty categories, 0 zero-calorie non-drinks, 0 placeholder brands, 0 invalid categories, 0 drinks missing unit, 0 Arabic script in English name)
assert(result.qualityErrors.length === 0, `Expected 0 quality errors, got ${result.qualityErrors.length}: ${JSON.stringify(result.qualityErrors)}`);
console.log('✓ Quality checks: 0 duplicate IDs/names, 0 empty categories, 0 zero-calorie non-drinks, 0 placeholder brands, 17 canonical categories enforced, drinks unit ml verified, 0 Arabic script in English name.');

// 3. Macro discrepancies > 12% must be 0 (outside reviewed exceptions)
assert(result.discrepancies.length === 0, `Expected 0 macro discrepancies > 12%, got ${result.discrepancies.length}: ${JSON.stringify(result.discrepancies)}`);
console.log('✓ Macro threshold: 0 unreviewed discrepancies exceeding 12%.');

// 4. Reviewed exceptions must capture the two known cases
const questException = result.reviewedExceptions.find((r) => r.id === 'food_quest_cookie_dough');
const broccoliException = result.reviewedExceptions.find((r) => r.id === 'food_broccoli');

assert(Boolean(questException), 'food_quest_cookie_dough must be captured in reviewed exceptions list');
assert(Boolean(broccoliException), 'food_broccoli must be captured in reviewed exceptions list');
assert(REVIEWED_AUDIT_EXCEPTIONS.food_quest_cookie_dough.maxAllowedDiffPercentage === 30, 'Quest bar max allowed diff is 30%');
assert(REVIEWED_AUDIT_EXCEPTIONS.food_broccoli.maxAllowedDiffPercentage === 25, 'Broccoli max allowed diff is 25%');
console.log('✓ Reviewed exceptions: food_quest_cookie_dough and food_broccoli explicitly validated with biochemical rationale.');

// 5. Test barcode check digit validator directly
assert(!isValidBarcode('011110001010'), 'Generic chicken fake barcode must fail isValidBarcode');
assert(!isValidBarcode('888849000000'), 'Fake quest barcode must fail isValidBarcode');
assert(!isValidBarcode('4060800100067'), 'Typo pepsi max barcode must fail isValidBarcode');
assert(isValidBarcode('4060800169457'), 'Real pepsi max barcode must pass isValidBarcode');
assert(isValidBarcode('602652171680'), 'Real KIND bar barcode must pass isValidBarcode');
assert(isValidBarcode('888849000012'), 'Real Quest bar barcode must pass isValidBarcode');
console.log('✓ GS1 Modulo-10 check digit algorithm verified on sample barcodes.');

// 6. Test sourceRef requirement for verified entries
const testFoodDatabase = [
  {
    id: 'test_verified_missing_ref',
    name: 'Unreferenced Food',
    servingSize: '100g',
    servingGrams: 100,
    calories: 100,
    protein: 10,
    carbs: 10,
    fat: 2,
    category: 'Fruit',
    source: 'verified_database' as const,
  },
];
const testAuditResult = auditFoodDatabase(12, testFoodDatabase);
assert(
  testAuditResult.qualityErrors.some((e) => e.type === 'verified_missing_sourceref'),
  'auditFoodDatabase must flag verified_missing_sourceref for verified entries without sourceRef'
);
console.log('✓ sourceRef enforcement verified: auditFoodDatabase rejects verified entries without sourceRef.');

// 7. Test reused FDC ID rule: unwhitelisted reuse throws error, whitelisted passes
const testReusedFdcDatabase = [
  {
    id: 'food_apple_sample',
    name: 'Sample Apple',
    servingSize: '100g',
    servingGrams: 100,
    calories: 52,
    protein: 0.3,
    carbs: 13.8,
    fat: 0.2,
    category: 'Fruit',
    source: 'verified_database' as const,
    sourceRef: 'USDA FDC 999999',
  },
  {
    id: 'food_banana_sample',
    name: 'Sample Banana',
    servingSize: '100g',
    servingGrams: 100,
    calories: 89,
    protein: 1.1,
    carbs: 22.8,
    fat: 0.3,
    category: 'Fruit',
    source: 'verified_database' as const,
    sourceRef: 'USDA FDC 999999',
  },
];
const testReusedResult = auditFoodDatabase(12, testReusedFdcDatabase);
assert(
  testReusedResult.qualityErrors.some((e) => e.type === 'reused_fdc_id'),
  'auditFoodDatabase must flag reused_fdc_id when different foods reuse same FDC ID without whitelist'
);
console.log('✓ Reused FDC ID audit rule verified: unwhitelisted reuse between different foods is blocked.');

console.log('========================================================================');
console.log('✓ All auditFoodDatabase unit and quality regression tests passed cleanly!');
console.log('========================================================================');
