import {
  KEYBOARD_AVOIDING_BEHAVIOR,
  resolveKeyboardAvoidingBehavior,
  calculateBottomPaddingWithKeyboard,
} from './keyboardAvoidance';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

console.log('Testing keyboardAvoidance utility...');

// 1. Behavior must be 'padding' to guarantee Android edge-to-edge avoidance
assert(KEYBOARD_AVOIDING_BEHAVIOR === 'padding', 'Default behavior must be padding');
assert(resolveKeyboardAvoidingBehavior() === 'padding', 'Resolved behavior must be padding');

// 2. Container padding calculation
const normalDockClearance = 132;
const activeGap = 8;

// When keyboard is visible, padding collapses to active gap so KeyboardAvoidingView lifts input directly above keyboard
assert(
  calculateBottomPaddingWithKeyboard(true, normalDockClearance, activeGap) === activeGap,
  'When keyboard is visible, padding should be the active gap'
);

// When keyboard is hidden, padding returns to full dock clearance
assert(
  calculateBottomPaddingWithKeyboard(false, normalDockClearance, activeGap) === normalDockClearance,
  'When keyboard is hidden, padding must be normal clearance'
);

console.log('All keyboardAvoidance tests passed cleanly!');
