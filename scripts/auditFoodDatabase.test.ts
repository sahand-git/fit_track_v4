import { auditFoodDatabase } from './auditFoodDatabase';
import { isValidBarcode } from '../src/utils/barcodeUtils';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

console.log('Testing auditFoodDatabase barcode integrity checks...');

const result = auditFoodDatabase();
assert(result.barcodeErrors.length === 0, `Expected 0 barcode errors in current verified database, got ${result.barcodeErrors.length}`);
console.log('✓ Verified food database currently has 0 barcode errors.');

// Test check digit algorithm directly on sample invalid and duplicate barcodes
assert(!isValidBarcode('011110001010'), 'Generic chicken fake barcode must fail isValidBarcode');
assert(!isValidBarcode('888849000000'), 'Fake quest barcode must fail isValidBarcode');
assert(!isValidBarcode('4060800100067'), 'Typo pepsi max barcode must fail isValidBarcode');
assert(isValidBarcode('4060800169457'), 'Real pepsi max barcode must pass isValidBarcode');
assert(isValidBarcode('602652171680'), 'Real KIND bar barcode must pass isValidBarcode');
assert(isValidBarcode('888849000012'), 'Real Quest bar barcode must pass isValidBarcode');

console.log('✓ All auditFoodDatabase tests passed successfully.');
