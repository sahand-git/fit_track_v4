import { isRTL } from './useIsRTL';

function assertEqual<T>(actual: T, expected: T, message?: string): void {
  if (actual !== expected) {
    throw new Error(`${message ? message + ': ' : ''}Expected ${expected}, got ${actual}`);
  }
}

console.log('Testing isRTL shared utility...');

// English is LTR
assertEqual(isRTL('en'), false, 'English must be LTR');

// Arabic is RTL
assertEqual(isRTL('ar'), true, 'Arabic must be RTL');

// Kurdish Sorani is RTL
assertEqual(isRTL('ckb'), true, 'Kurdish Sorani must be RTL');

// Edge cases
assertEqual(isRTL(null), false, 'null must default to false');
assertEqual(isRTL(undefined), false, 'undefined must default to false');
assertEqual(isRTL('fr'), false, 'Unknown languages default to false');

console.log('All isRTL tests passed cleanly!');
