import { isValidBarcode } from './barcodeUtils';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

console.log('Testing isValidBarcode validator...');

// 1. Valid EAN-8
assert(isValidBarcode('96385074'), 'Valid EAN-8 (96385074) passes');
assert(isValidBarcode('73513537'), 'Valid EAN-8 (73513537) passes');
assert(isValidBarcode('55123457'), 'Valid EAN-8 (55123457) passes');

// 2. Valid UPC-A (12 digits)
assert(isValidBarcode('036000291452'), 'Valid UPC-A (036000291452) passes');
assert(isValidBarcode('012345678905'), 'Valid UPC-A (012345678905) passes');
assert(isValidBarcode('602652171680'), 'Valid UPC-A (602652171680 KIND) passes');
assert(isValidBarcode('888849000012'), 'Valid UPC-A (888849000012 Quest) passes');

// 3. Valid EAN-13 (13 digits)
assert(isValidBarcode('4006381333931'), 'Valid EAN-13 (4006381333931) passes');
assert(isValidBarcode('5449000000996'), 'Valid EAN-13 (5449000000996 Coca-Cola) passes');
assert(isValidBarcode('3017620422003'), 'Valid EAN-13 (3017620422003 Nutella) passes');
assert(isValidBarcode('4060800169457'), 'Valid EAN-13 (4060800169457 Pepsi Max) passes');

// 4. Invalid check digits
assert(!isValidBarcode('96385070'), 'Invalid check digit on EAN-8 fails');
assert(!isValidBarcode('036000291450'), 'Invalid check digit on UPC-A fails');
assert(!isValidBarcode('4006381333930'), 'Invalid check digit on EAN-13 fails');

// 5. Invalid lengths
assert(!isValidBarcode(''), 'Empty string fails');
assert(!isValidBarcode('123456'), '6 digits fails');
assert(!isValidBarcode('1234567'), '7 digits fails');
assert(!isValidBarcode('123456789'), '9 digits fails');
assert(!isValidBarcode('1234567890'), '10 digits fails');
assert(!isValidBarcode('12345678901'), '11 digits fails');
assert(!isValidBarcode('12345678901234'), '14 digits fails');

// 6. Non-digits and malformed types
assert(!isValidBarcode('12345678901a'), 'Alphanumeric barcode fails');
assert(!isValidBarcode('03600 291452'), 'Barcode with inner space fails');
assert(!isValidBarcode(null), 'null fails');
assert(!isValidBarcode(undefined), 'undefined fails');
assert(!isValidBarcode(12345678), 'Number type fails');

// 7. Verify the 9 known failing bundled barcodes
const knownFailingBarcodes = [
  '4060800100067', // pop_pepsi_max_zero
  '011110001010',  // food_chicken_breast
  '011110001027',  // food_eggs_large
  '093966001034',  // food_egg_whites
  '025484000108',  // food_tofu_firm
  '072220000000',  // food_whole_wheat_bread
  '602652171050',  // food_kind_bar
  '888849000000',  // food_quest_cookie_dough
  '025293000994',  // food_almond_milk_unsweetened
];

for (const code of knownFailingBarcodes) {
  assert(!isValidBarcode(code), `Known invalid bundled barcode ${code} must fail check`);
}

console.log('✓ All isValidBarcode unit tests passed successfully.');
