import { AccessibilityInfo } from 'react-native';

let reduceMotionEnabled = false;

// Initialize accessibility reduced motion preference
AccessibilityInfo.isReduceMotionEnabled()
  .then((enabled) => {
    reduceMotionEnabled = Boolean(enabled);
  })
  .catch(() => {});

try {
  AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled: boolean) => {
    reduceMotionEnabled = Boolean(enabled);
  });
} catch {
  // Graceful fallback for platforms or test environments where listener is unavailable
}

/**
 * Returns true if the user has requested reduced motion in system accessibility settings.
 */
export function isReducedMotion(): boolean {
  return reduceMotionEnabled;
}
