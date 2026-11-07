import { formatServingWithGrams } from './formatServing';
import assert from 'assert';

console.log('Starting formatServingWithGrams Unit Tests...');

// Case 1: Already has grams in parentheses (e.g. Masgouf Wood-Fired Carp)
assert.strictEqual(
  formatServingWithGrams('1 plate (250g)', 250, 1),
  '1 plate (250g)',
  'Must not duplicate (250g) when servings is 1'
);

// Case 2: No grams in base size
assert.strictEqual(
  formatServingWithGrams('1 medium apple', 182, 1),
  '1 medium apple (182g)',
  'Must append (182g) when missing in base size'
);

// Case 3: Empty base size
assert.strictEqual(
  formatServingWithGrams(undefined, 150, 1),
  '1 serving (150g)',
  'Must default to 1 serving (150g)'
);

// Case 4: Multiple servings with existing grams
assert.strictEqual(
  formatServingWithGrams('1 plate (250g)', 250, 2),
  '2 × 1 plate (500g)',
  'Must scale total grams cleanly for multi servings'
);

// Case 5: Multiple servings without existing grams
assert.strictEqual(
  formatServingWithGrams('1 slice', 30, 3),
  '3 × 1 slice (90g)',
  'Must scale total grams cleanly for slices'
);

console.log('✓ All formatServingWithGrams Unit Tests PASSED Cleanly!');
