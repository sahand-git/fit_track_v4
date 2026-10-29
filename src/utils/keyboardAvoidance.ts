/**
 * Cross-platform soft keyboard avoidance utilities for FitTrack v4.
 *
 * On modern Android with edge-to-edge / 3-button navigation (and iOS),
 * `behavior="padding"` ensures inputs lift cleanly above the keyboard
 * rather than being occluded.
 */

export const KEYBOARD_AVOIDING_BEHAVIOR = 'padding' as const;

export function resolveKeyboardAvoidingBehavior(): 'padding' {
  return KEYBOARD_AVOIDING_BEHAVIOR;
}

/**
 * Calculates container bottom padding taking keyboard visibility into account.
 * When keyboard is visible, padding collapses to a small gap (e.g. 8px) because
 * KeyboardAvoidingView provides the keyboard height offset.
 * When keyboard is hidden, container maintains full clearance above bottom dock/insets.
 */
export function calculateBottomPaddingWithKeyboard(
  isKeyboardVisible: boolean,
  defaultBottomClearance: number,
  activeKeyboardPadding: number = 8
): number {
  return isKeyboardVisible ? activeKeyboardPadding : defaultBottomClearance;
}
