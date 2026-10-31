import {
  KEYBOARD_AVOIDING_BEHAVIOR,
  ANDROID_MIN_STATUS_BAR_HEIGHT,
  resolveKeyboardAvoidingBehavior,
  getScreenTopOffset,
  getKeyboardVerticalOffset,
  calculateBottomPaddingWithKeyboard,
  calculateModalContentPadding,
  calculateKeyboardOverlap,
} from './keyboardAvoidance';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

console.log('Testing keyboardAvoidance utility...');

// 1. Behavior resolution: undefined on Android to respect native window resizing; padding on iOS
assert(KEYBOARD_AVOIDING_BEHAVIOR === 'padding', 'Default behavior constant must be padding');
assert(resolveKeyboardAvoidingBehavior('ios') === 'padding', 'iOS behavior must be padding');
assert(
  resolveKeyboardAvoidingBehavior('android') === undefined,
  'Android behavior must be undefined so native window resize handles it without double padding'
);
assert(ANDROID_MIN_STATUS_BAR_HEIGHT === 24, 'Minimum Android status bar height must be 24dp');

// 2. getScreenTopOffset and getKeyboardVerticalOffset
// On Android with 0 insets (e.g. standard status bar)
assert(
  getScreenTopOffset(0, 'android') === 24,
  'Android with insets.top = 0 should default to 24dp'
);
assert(
  getKeyboardVerticalOffset(0, 0, 'android') === 24,
  'Android keyboard offset with insets.top = 0 should be 24dp'
);

// On Android with camera cutout (e.g. 45dp)
assert(
  getScreenTopOffset(45, 'android') === 45,
  'Android with insets.top = 45 should be 45dp'
);
assert(
  getKeyboardVerticalOffset(45, 0, 'android') === 45,
  'Android keyboard offset with insets.top = 45 should be 45dp'
);
assert(
  getKeyboardVerticalOffset(45, 10, 'android') === 55,
  'Android keyboard offset with extra 10dp should be 55dp'
);

// On iOS
assert(
  getScreenTopOffset(47, 'ios') === 47,
  'iOS top offset should match insets.top (47dp)'
);
assert(
  getKeyboardVerticalOffset(47, 0, 'ios') === 47,
  'iOS keyboard offset should match insets.top (47dp)'
);
assert(
  getScreenTopOffset(0, 'ios') === 0,
  'iOS with insets.top = 0 should be 0'
);

// 3. calculateBottomPaddingWithKeyboard
const normalDockClearance = 132;
const activeGap = 8;
assert(
  calculateBottomPaddingWithKeyboard(true, normalDockClearance, activeGap) === activeGap,
  'When keyboard is visible, padding should be the active gap'
);
assert(
  calculateBottomPaddingWithKeyboard(false, normalDockClearance, activeGap) === normalDockClearance,
  'When keyboard is hidden, padding must be normal clearance'
);

// 4. calculateKeyboardOverlap (measureInWindow safeguard)
// Input bottom at 820dp, keyboard top at 780dp -> occluded by 40dp + 8dp safety margin = 48dp
assert(
  calculateKeyboardOverlap(820, 780, 8) === 48,
  'Input occluded by 40dp should produce 48dp padding with safety margin'
);

// Input bottom at 750dp, keyboard top at 780dp -> not occluded, returns 0
assert(
  calculateKeyboardOverlap(750, 780, 8) === 0,
  'Input fully above keyboard should return 0 overlap'
);

// Keyboard hidden or invalid coordinates
assert(
  calculateKeyboardOverlap(800, 0, 8) === 0,
  'Hidden keyboard should return 0 overlap'
);

// 5. calculateModalContentPadding (avoids infinite/excessive scroll space)
assert(
  calculateModalContentPadding(true, 48, 'android') === 16,
  'When keyboard is visible on Android, modal bottom padding collapses to <= 16dp'
);
assert(
  calculateModalContentPadding(false, 48, 'android') === 48,
  'When keyboard is hidden on Android, modal bottom padding maintains base clearance'
);
assert(
  calculateModalContentPadding(true, 48, 'ios') === 48,
  'On iOS, base padding is preserved because KAV pads the container'
);

console.log('All keyboardAvoidance tests passed cleanly!');
