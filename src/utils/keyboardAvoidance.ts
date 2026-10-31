/**
 * Soft keyboard avoidance constants and utilities for FitTrack v4.
 *
 * App.tsx applies a standard top offset:
 *   Math.max(insets.top, Platform.OS === 'android' ? 24 : 0)
 *
 * React Native's KeyboardAvoidingView with behavior="padding" computes:
 *   bottomPadding = Math.max(frame.y + frame.height - (keyboardFrame.screenY - keyboardVerticalOffset), 0)
 *
 * When keyboardVerticalOffset is 0 on Android, the padding is underestimated by the
 * screen's top offset (24dp to 45dp+ with camera cutouts/notches), leaving the bottom
 * of text inputs occluded behind the soft keyboard or 3-button navigation bar.
 * Providing the shared top offset to KeyboardAvoidingView on Android guarantees that
 * inputs lift fully and cleanly into view.
 */

export const KEYBOARD_AVOIDING_BEHAVIOR = 'padding' as const;
export const ANDROID_MIN_STATUS_BAR_HEIGHT = 24;

/**
 * Resolves KeyboardAvoidingView behavior.
 * On Android, `app.json` sets `softwareKeyboardLayoutMode: "resize"`, so Android natively
 * adjusts the window height when the keyboard opens. Returning `undefined` prevents
 * KeyboardAvoidingView from applying redundant bottom padding that creates huge blank/black spaces.
 * On iOS, returns `'padding'` so inputs lift above the keyboard.
 */
export function resolveKeyboardAvoidingBehavior(platform: string = 'android'): 'padding' | undefined {
  return platform === 'ios' ? 'padding' : undefined;
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
 * Calculates keyboardVerticalOffset for KeyboardAvoidingView across Android and iOS.
 * Because App.tsx pushes every screen container down by getScreenTopOffset(insets.top),
 * KeyboardAvoidingView on both Android and iOS must be given this exact offset so it
 * lifts inputs fully above the soft keyboard and navigation bar.
 */
export function getKeyboardVerticalOffset(
  insetsTop: number = 0,
  extraOffset: number = 0,
  platform: string = 'android'
): number {
  return getScreenTopOffset(insetsTop, platform) + extraOffset;
}

/**
 * Calculates container bottom padding taking keyboard visibility into account.
 * When keyboard is visible, padding collapses to a small gap (e.g. 8px) because
 * KeyboardAvoidingView provides the keyboard height offset on iOS or window resizing handles it on Android.
 * When keyboard is hidden, container maintains full clearance above bottom dock/insets.
 */
export function calculateBottomPaddingWithKeyboard(
  isKeyboardVisible: boolean,
  defaultBottomClearance: number,
  activeKeyboardPadding: number = 8,
  _platform: string = 'android'
): number {
  return isKeyboardVisible ? activeKeyboardPadding : defaultBottomClearance;
}

/**
 * Calculates modal content bottom padding when keyboard is open.
 * Guarantees that on Android, where window resize is active, we do not add redundant
 * keyboardHeight + extraOffset padding that pushes contentContainerStyle hundreds of
 * pixels below the last button ("Save & Finish").
 */
export function calculateModalContentPadding(
  isKeyboardVisible: boolean,
  basePaddingBottom: number = 24,
  platform: string = 'android'
): number {
  if (isKeyboardVisible && platform === 'android') {
    return Math.min(basePaddingBottom, 16);
  }
  return basePaddingBottom;
}

/**
 * Calculates any residual overlap between a measured input frame in window coordinates
 * and the soft keyboard's top coordinate (endCoordinates.screenY).
 * Returns > 0 if the input bottom is occluded by the keyboard.
 */
export function calculateKeyboardOverlap(
  inputBottomY: number,
  keyboardScreenY: number,
  safetyMargin: number = 8
): number {
  if (keyboardScreenY <= 0 || inputBottomY <= 0) return 0;
  const overlap = inputBottomY - keyboardScreenY;
  return overlap > 0 ? overlap + safetyMargin : 0;
}
