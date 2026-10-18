import { shouldResetFoodSelection, resolveSelectedVariantId } from './addFoodSelectionGuard';

console.log('Starting AddFoodSheet Selection Guard & Re-Render Loop Regression Tests...');

// Flawed logic prior to fix:
function oldBuggyGuard(prevFoodId: string | null, selectedFood: any): boolean {
  return selectedFood?.id !== prevFoodId;
}

// 1. Prove the bug existed in the old logic:
// When initial prevFoodId is null and selectedFood is null:
// selectedFood?.id produces `undefined`.
// `undefined !== null` evaluates to TRUE!
const oldResultOnInitialRender = oldBuggyGuard(null, null);
if (oldResultOnInitialRender !== true) {
  console.error('Expected oldBuggyGuard(null, null) to be true due to undefined !== null');
  process.exit(1);
}
console.log('✓ Verified: Old logic returns true on initial render (undefined !== null), causing infinite loop.');

// 2. Verify the new logic fixes the null-versus-undefined trap on initial render:
const newResultOnInitialRender = shouldResetFoodSelection(null, null);
if (newResultOnInitialRender !== false) {
  console.error('FAILED: shouldResetFoodSelection(null, null) must be false to prevent render loop!');
  process.exit(1);
}
console.log('✓ Test 1 passed: shouldResetFoodSelection(null, null) is false (infinite re-render loop PREVENTED).');

// 3. Verify undefined selectedFood is also normalized safely:
if (shouldResetFoodSelection(null, undefined) !== false) {
  console.error('FAILED: shouldResetFoodSelection(null, undefined) must be false!');
  process.exit(1);
}
console.log('✓ Test 2 passed: shouldResetFoodSelection(null, undefined) is false.');

// 4. Verify selection transitions:
// A) Selecting a food from nothing -> should trigger reset
const selectedApple = { id: 'food_apple', variants: [{ id: 'variant_100g' }] };
if (shouldResetFoodSelection(null, selectedApple) !== true) {
  console.error('FAILED: selecting a food from null must trigger reset!');
  process.exit(1);
}
console.log('✓ Test 3 passed: Selecting food (null -> "food_apple") triggers reset (true).');

// B) Re-rendering with the same selected food -> must NOT trigger reset
if (shouldResetFoodSelection('food_apple', selectedApple) !== false) {
  console.error('FAILED: re-rendering with same food ID must NOT trigger reset!');
  process.exit(1);
}
console.log('✓ Test 4 passed: Same food ID ("food_apple" -> "food_apple") does not trigger reset (false).');

// C) Selecting a different food -> must trigger reset
const selectedBanana = { id: 'food_banana', variants: [{ id: 'variant_1medium' }] };
if (shouldResetFoodSelection('food_apple', selectedBanana) !== true) {
  console.error('FAILED: selecting a different food must trigger reset!');
  process.exit(1);
}
console.log('✓ Test 5 passed: Different food ID ("food_apple" -> "food_banana") triggers reset (true).');

// D) Deselecting food -> must trigger reset
if (shouldResetFoodSelection('food_banana', null) !== true) {
  console.error('FAILED: deselecting food ("food_banana" -> null) must trigger reset!');
  process.exit(1);
}
console.log('✓ Test 6 passed: Deselecting food ("food_banana" -> null) triggers reset (true).');

// E) Subsequent render after deselection -> must NOT trigger reset (loop prevention)
if (shouldResetFoodSelection(null, null) !== false) {
  console.error('FAILED: subsequent render after deselection must NOT trigger reset!');
  process.exit(1);
}
console.log('✓ Test 7 passed: Subsequent idle render (null -> null) does not trigger reset (false).');

// 5. Verify resolveSelectedVariantId:
if (resolveSelectedVariantId(selectedApple) !== 'variant_100g') {
  console.error('FAILED: resolveSelectedVariantId with variants failed');
  process.exit(1);
}
if (resolveSelectedVariantId(null) !== null) {
  console.error('FAILED: resolveSelectedVariantId with null must be null');
  process.exit(1);
}
if (resolveSelectedVariantId({ variants: [] }) !== null) {
  console.error('FAILED: resolveSelectedVariantId with empty variants must be null');
  process.exit(1);
}
console.log('✓ Test 8 passed: resolveSelectedVariantId handles variants, null, and empty lists cleanly.');

console.log('======================================================================');
console.log('All AddFoodSheet Selection Guard & Regression Unit Tests PASSED Cleanly!');
console.log('======================================================================');
