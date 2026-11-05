/**
 * GS1 Barcode Integrity and Check Digit Validator
 * Supports:
 *  - EAN-8  (8 digits)
 *  - UPC-A  (12 digits)
 *  - EAN-13 (13 digits)
 *
 * Uses the GS1 Modulo-10 checksum algorithm.
 */

export function isValidBarcode(barcode: unknown): boolean {
  if (typeof barcode !== 'string') return false;
  const clean = barcode.trim();
  if (!/^\d{8}$|^\d{12}$|^\d{13}$/.test(clean)) {
    return false;
  }

  const digits = clean.split('').map(Number);
  const checkDigit = digits[digits.length - 1];

  let sum = 0;
  // Starting from the digit immediately to the left of the check digit,
  // alternate weights 3 and 1 moving right-to-left.
  for (let i = digits.length - 2, weight = 3; i >= 0; i--, weight = weight === 3 ? 1 : 3) {
    sum += digits[i] * weight;
  }

  const expected = (10 - (sum % 10)) % 10;
  return checkDigit === expected;
}
