import { translate } from './strings';

const addedKeys = [
  'Steps', 'steps today', 'steps', 'Daily goal', 'Estimated active calories', 'Estimated distance',
  'Estimated active minutes', 'Update steps', 'Set the total for this date, or add steps to the saved total.',
  'Save total', 'Save goal', 'Sync Apple Health / Health Connect', 'Syncing health data…', 'Health steps synced',
  'Activity calories, distance, and minutes are estimates. Health sync replaces the total for this date; it does not add a duplicate.',
  'Future dates are read-only.', 'Enter a valid step count.', 'Step goal must be between 500 and 100000.',
  'Could not save steps. Please try again.', 'Health Connect or Apple Health is not available on this device.',
  'No step data was found for this date. Your saved total was kept.', 'Could not read health steps. Check permissions or enter steps manually.',
  'Remove 500 steps', 'Add 500 steps', 'Step count', 'Daily step goal', 'Tap to view activity details',
  'Account', 'Sign in & backup', 'Account services need setup',
  'Firebase is not configured yet. Guest mode and local data continue to work. Add your Firebase app values and publish the Firestore rules using docs/firebase-setup.md.',
  'Verified account', 'Email not verified yet. Cloud backup stays locked until verification.', 'Resend verification email',
  'Verification email sent.', 'Cloud backup', 'Backups are manual and account-owned. Gemini credentials are never included.',
  'Back up now', 'Restore cloud backup', 'Restore cloud backup?',
  'This replaces the fitness data stored on this device with the backup in your account. Export a local copy first if you need both.',
  'Cloud backup restored', 'Cloud backup saved', 'Guest data on this device',
  'Signing in does not merge or upload previous guest records. To keep them, export a local backup before signing in, then import it after sign-in.',
  'Current password, for account deletion', 'Sign out', 'Signed out. Your local and account records are preserved.', 'Delete account',
  'Delete account and cloud backup?', 'This permanently deletes your Firebase account and its cloud backup. Local records on this device remain available as guest data.',
  'Account deleted', 'Create your account', 'Welcome back', 'You can keep using FitTrack as a guest. An account is only needed for cross-device cloud backup.',
  'Email', 'Password', 'Create account', 'Sign in', 'Already have an account? Sign in', 'New to FitTrack? Create an account',
  'Forgot password?', 'Password reset email sent.', 'or', 'Continue with Google',
  'Google sign-in needs a configured mobile development build. It uses your Google identity only, not Gmail or Gemini.',
  'Account created. Check your email to verify it.', 'Signed in successfully.', 'Something went wrong. Please try again.',
  'Sign in to use cloud backup.', 'Please wait…', 'Account & cloud backup',
  'Sign in, verify your account, and back up to your own cloud space.', 'Activity history', 'Duration', 'Estimated burn', 'Search workouts',
  'No workouts for this day', 'Log exercise to build your activity history.', 'Edit workout', 'completed',
  'Custom workout name (optional)', 'Use preset name or enter your own', 'Update workout', 'History', 'Net activity added', 'Added to food budget',
  'Enter a valid email address.', 'An account already exists with this email.', 'Use a password with at least six characters.',
  'Email or password is incorrect.', 'Too many attempts. Wait a little and try again.', 'Check your internet connection and try again.',
  'Sign in again to confirm this sensitive action.',
  'Activity calorie budget', 'Use adaptive activity budget',
  'Off keeps your current target. When on, FitTrack uses a sedentary baseline plus net logged workouts and steps above a daily baseline, without double-counting workout steps.',
  'Steps to add', 'Add steps', 'Enter an amount from 1 to 100000.',
  'Check verification status', 'Email verified. Cloud backup is ready.', 'No cloud backup exists for this account yet.',
  'Cloud backup is too large. Export a local backup instead.', 'Your account changed. Sign in again and retry.',
  'Failed to start FitTrack', 'Unable to load app data. Please try again.', 'Retry',
];

for (const key of addedKeys) {
  for (const language of ['ar', 'ckb'] as const) {
    if (translate(language, key) === key) throw new Error(`Missing ${language} translation for: ${key}`);
  }
}
console.log(`Activity/account localization coverage passed (${addedKeys.length} strings).`);
