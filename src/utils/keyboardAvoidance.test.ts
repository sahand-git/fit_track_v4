import {
  KEYBOARD_AVOIDING_BEHAVIOR,
  ANDROID_MIN_STATUS_BAR_HEIGHT,
  resolveKeyboardAvoidingBehavior,
  getScreenTopOffset,
  getKeyboardVerticalOffset,
} from './keyboardAvoidance';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

console.log('Testing keyboardAvoidance utility...');

// 1. Behavior resolution: 'padding' across both iOS and Android with react-native-keyboard-controller
assert(KEYBOARD_AVOIDING_BEHAVIOR === 'padding', 'Default behavior constant must be padding');
assert(resolveKeyboardAvoidingBehavior('ios') === 'padding', 'iOS behavior must be padding');
assert(
  resolveKeyboardAvoidingBehavior('android') === 'padding',
  'Android behavior with keyboard-controller must be padding'
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

console.log('All keyboardAvoidance tests passed cleanly!');
