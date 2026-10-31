/**
 * Soft keyboard layout and insets utilities for FitTrack v4.
 *
 * Integrated with react-native-keyboard-controller for edge-to-edge Android
 * and iOS keyboard avoidance.
 */

export const KEYBOARD_AVOIDING_BEHAVIOR = 'padding' as const;
export const ANDROID_MIN_STATUS_BAR_HEIGHT = 24;

/**
 * Resolves KeyboardAvoidingView behavior.
 * With react-native-keyboard-controller, 'padding' is used on both iOS and Android.
 */
export function resolveKeyboardAvoidingBehavior(_platform: string = 'android'): 'padding' {
  return 'padding';
}

/**
 * Calculates standard top padding / offset applied to screens and headers in App.tsx.
 * On Android, guarantees at least 24dp for the status bar if insets.top is 0 or less.
 * On iOS, uses insets.top.
 */
export function getScreenTopOffset(insetsTop: number = 0, platform: string = 'android'): number {
  return Math.max(insetsTop, platform === 'android' ? ANDROID_MIN_STATUS_BAR_HEIGHT : 0);
}

/**
 * Calculates keyboardVerticalOffset for screens that need offset compensation.
 */
export function getKeyboardVerticalOffset(
  insetsTop: number = 0,
  extraOffset: number = 0,
  platform: string = 'android'
): number {
  return getScreenTopOffset(insetsTop, platform) + extraOffset;
}
