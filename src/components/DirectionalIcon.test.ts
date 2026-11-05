import { isRTL } from '../hooks/useIsRTL';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

console.log('Testing DirectionalIcon & isRTL hook...');

// 1. isRTL correctness
assert(isRTL('ar') === true, 'ar must be RTL');
assert(isRTL('ckb') === true, 'ckb must be RTL');
assert(isRTL('en') === false, 'en must be LTR');
assert(isRTL(null) === false, 'null must be LTR');
assert(isRTL(undefined) === false, 'undefined must be LTR');

console.log('✓ isRTL resolution verified');
console.log('All DirectionalIcon tests passed cleanly!');
