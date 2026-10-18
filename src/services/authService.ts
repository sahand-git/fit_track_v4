import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut,
  User,
} from 'firebase/auth';
import { auth, firebaseConfigured } from './firebaseApp';

import { AppLanguage } from '../types';
import { translate } from '../i18n/strings';

export type AuthIdentity = Pick<User, 'uid' | 'email' | 'displayName' | 'emailVerified' | 'isAnonymous'>;
export type AuthListener = (user: AuthIdentity | null) => void;

export interface AuthErrorDetails {
  message: string;
  code?: string;
}

const AUTH_ERROR_MAP: Record<string, string> = {
  // Google sign-in specific outcomes
  'DEVELOPER_ERROR_10': 'Google sign-in configuration error. Check SHA-1 fingerprint and client ID.',
  'PLAY_SERVICES_NOT_AVAILABLE': 'Google Play services are unavailable or need updating.',
  'SIGN_IN_CANCELLED': 'Google sign-in was cancelled.',
  'NO_SAVED_CREDENTIAL_FOUND': 'No saved Google credentials found on this device.',
  'MISSING_WEB_CLIENT_ID': 'Google Web Client ID is not configured.',
  'NETWORK_ERROR': 'Check your internet connection and try again.',

  // Firebase Auth codes
  'auth/invalid-email': 'Enter a valid email address.',
  'auth/missing-email': 'Enter a valid email address.',
  'auth/email-already-in-use': 'An account already exists with this email.',
  'auth/credential-already-in-use': 'An account already exists with this email.',
  'auth/weak-password': 'Use a password with at least six characters.',
  'auth/invalid-credential': 'Email or password is incorrect.',
  'auth/user-not-found': 'No account found with this email.',
  'auth/wrong-password': 'Email or password is incorrect.',
  'auth/user-disabled': 'This user account has been disabled.',
  'auth/too-many-requests': 'Too many attempts. Wait a little and try again.',
  'auth/network-request-failed': 'Check your internet connection and try again.',
  'auth/timeout': 'Check your internet connection and try again.',
  'auth/requires-recent-login': 'Sign in again to confirm this sensitive action.',
  'auth/popup-closed-by-user': 'Google sign-in was cancelled.',
  'auth/account-exists-with-different-credential': 'An account already exists with this email. Sign in using its original method.',
  'auth/operation-not-allowed': 'This sign-in provider is not enabled in Firebase Console.',
  'auth/expired-action-code': 'This verification link has expired. Request a new one.',
  'auth/invalid-action-code': 'This verification link is invalid or already used.',

  // Custom application auth states
  'EMAIL_NOT_VERIFIED': 'Email not verified yet. Cloud backup stays locked until verification.',
  'NO_BACKUP_EXISTS': 'No cloud backup exists for this account yet.',
  'BACKUP_TOO_LARGE': 'Cloud backup is too large. Export a local backup instead.',
  'AUTH_REQUIRED': 'Sign in to use cloud backup.',
  'ACCOUNT_CHANGED': 'Your account changed. Sign in again and retry.',
  'PASSWORD_REQUIRED_FOR_DELETION': 'Enter your current password to confirm account deletion.',
  'FIREBASE_NOT_CONFIGURED': 'Firebase is not configured.',
};

/**
 * Extracts normalized error code and friendly message.
 * Strict safety guarantee: tokens, keys, passwords, and sensitive strings are completely excluded.
 */
export function getAuthErrorDetails(error: unknown): AuthErrorDetails {
  if (!error) {
    return { message: 'Something went wrong. Please try again.' };
  }

  // 1. Extract raw code or type from error object
  let rawCode = '';
  if (typeof error === 'object' && error !== null) {
    if ('code' in error && (error as { code: unknown }).code !== undefined) {
      rawCode = String((error as { code: unknown }).code).trim();
    } else if ('type' in error && (error as { type: unknown }).type !== undefined) {
      rawCode = String((error as { type: unknown }).type).trim();
    }
  }

  const rawMessage = error instanceof Error ? error.message : typeof error === 'string' ? error : '';

  // 2. Normalize Google and native error codes
  let normalizedCode: string | undefined = undefined;

  if (
    rawCode === '10' ||
    rawCode === 'DEVELOPER_ERROR' ||
    rawCode === 'DEVELOPER_ERROR_10' ||
    /status\s*10|developer_error|statuscode=10/i.test(rawMessage)
  ) {
    normalizedCode = 'DEVELOPER_ERROR_10';
  } else if (
    rawCode === '12501' ||
    rawCode === 'SIGN_IN_CANCELLED' ||
    rawCode === 'cancelled' ||
    /sign-in was cancelled|signin cancelled|user cancelled|user canceled/i.test(rawMessage)
  ) {
    normalizedCode = 'SIGN_IN_CANCELLED';
  } else if (
    rawCode === '16' ||
    rawCode === 'NO_SAVED_CREDENTIAL_FOUND' ||
    rawCode === 'noSavedCredentialFound' ||
    /no saved credential|no credential found/i.test(rawMessage)
  ) {
    normalizedCode = 'NO_SAVED_CREDENTIAL_FOUND';
  } else if (
    rawCode === 'PLAY_SERVICES_NOT_AVAILABLE' ||
    rawCode === '1' ||
    rawCode === '2' ||
    rawCode === '3' ||
    /play services|service_missing|service_version_update_required|service_disabled/i.test(rawMessage)
  ) {
    normalizedCode = 'PLAY_SERVICES_NOT_AVAILABLE';
  } else if (
    rawCode === 'MISSING_WEB_CLIENT_ID' ||
    /web client id|expo_public_google_web_client_id/i.test(rawMessage)
  ) {
    normalizedCode = 'MISSING_WEB_CLIENT_ID';
  } else if (
    rawCode === 'auth/timeout' ||
    rawCode === 'ETIMEDOUT' ||
    /timeout|timed out/i.test(rawMessage)
  ) {
    normalizedCode = 'auth/timeout';
  } else if (
    rawCode === '7' ||
    rawCode === 'NETWORK_ERROR' ||
    rawCode === 'auth/network-request-failed' ||
    /network|failed to connect|network-request-failed/i.test(rawMessage)
  ) {
    normalizedCode = rawCode === 'auth/network-request-failed' ? 'auth/network-request-failed' : 'NETWORK_ERROR';
  } else if (
    rawCode === 'auth/expired-action-code' ||
    /expired.*action.*code|expired.*verification|verification.*expired/i.test(rawMessage)
  ) {
    normalizedCode = 'auth/expired-action-code';
  } else if (
    rawCode === 'auth/invalid-action-code' ||
    /invalid.*action.*code/i.test(rawMessage)
  ) {
    normalizedCode = 'auth/invalid-action-code';
  } else if (
    rawCode === 'auth/missing-email' ||
    /missing.*email/i.test(rawMessage)
  ) {
    normalizedCode = 'auth/missing-email';
  } else if (rawCode && AUTH_ERROR_MAP[rawCode]) {
    normalizedCode = rawCode;
  } else if (/email not verified/i.test(rawMessage)) {
    normalizedCode = 'EMAIL_NOT_VERIFIED';
  } else if (/firebase is not configured/i.test(rawMessage)) {
    normalizedCode = 'FIREBASE_NOT_CONFIGURED';
  } else if (/no cloud backup exists/i.test(rawMessage)) {
    normalizedCode = 'NO_BACKUP_EXISTS';
  } else if (/backup is too large/i.test(rawMessage)) {
    normalizedCode = 'BACKUP_TOO_LARGE';
  } else if (/sign in before using cloud backup|sign in first/i.test(rawMessage)) {
    normalizedCode = 'AUTH_REQUIRED';
  } else if (/account changed/i.test(rawMessage)) {
    normalizedCode = 'ACCOUNT_CHANGED';
  } else if (/enter your.*password.*confirm account deletion/i.test(rawMessage)) {
    normalizedCode = 'PASSWORD_REQUIRED_FOR_DELETION';
  } else if (rawCode) {
    // Sanitize any unrecognized code: alphanumerics, dash, slash only (max 40 chars)
    const cleaned = rawCode.replace(/[^a-zA-Z0-9_\-\/]/g, '').slice(0, 40);
    if (cleaned && !/aiza|token|key|secret/i.test(cleaned)) {
      normalizedCode = cleaned;
    }
  }

  const message = normalizedCode && AUTH_ERROR_MAP[normalizedCode]
    ? AUTH_ERROR_MAP[normalizedCode]
    : 'Something went wrong. Please try again.';

  return {
    message,
    code: normalizedCode,
  };
}

/**
 * Returns mapped friendly error message plus technical-code line.
 */
export function getAuthErrorMessage(error: unknown): string {
  const details = getAuthErrorDetails(error);
  return details.code ? `${details.message}\n[Code: ${details.code}]` : details.message;
}

/**
 * Formats auth errors for localized UI presentation in AccountScreen.
 */
export function formatAuthError(error: unknown, language: AppLanguage): string {
  const details = getAuthErrorDetails(error);
  const localized = translate(language, details.message);
  return details.code ? `${localized}\n[Code: ${details.code}]` : localized;
}

function requireAuth() {
  if (!firebaseConfigured || !auth) throw new Error('Firebase is not configured.');
  return auth;
}

export function watchAuthState(listener: AuthListener): () => void {
  if (!firebaseConfigured || !auth) { listener(null); return () => {}; }
  return onAuthStateChanged(auth, listener);
}

export async function registerWithEmail(email: string, password: string): Promise<AuthIdentity> {
  const trimmed = email ? email.trim() : '';
  if (!trimmed) {
    const err = new Error('Enter a valid email address.');
    (err as { code?: string }).code = 'auth/invalid-email';
    throw err;
  }
  if (!password || password.length < 6) {
    const err = new Error('Use a password with at least six characters.');
    (err as { code?: string }).code = 'auth/weak-password';
    throw err;
  }
  const result = await createUserWithEmailAndPassword(requireAuth(), trimmed, password);
  await sendEmailVerification(result.user);
  return result.user;
}

export async function loginWithEmail(email: string, password: string): Promise<AuthIdentity> {
  const trimmed = email ? email.trim() : '';
  if (!trimmed) {
    const err = new Error('Enter a valid email address.');
    (err as { code?: string }).code = 'auth/invalid-email';
    throw err;
  }
  if (!password) {
    const err = new Error('Email or password is incorrect.');
    (err as { code?: string }).code = 'auth/invalid-credential';
    throw err;
  }
  const result = await signInWithEmailAndPassword(requireAuth(), trimmed, password);
  return result.user;
}

export async function resendVerification(): Promise<void> {
  const user = requireAuth().currentUser;
  if (!user) throw new Error('Sign in first.');
  await sendEmailVerification(user);
}

export async function refreshVerificationStatus(): Promise<AuthIdentity | null> {
  const user = requireAuth().currentUser;
  if (!user) return null;
  await reload(user);
  return user;
}

export async function requestPasswordReset(email: string): Promise<void> {
  const trimmed = email ? email.trim() : '';
  if (!trimmed) {
    const err = new Error('Enter a valid email address.');
    (err as { code?: string }).code = 'auth/invalid-email';
    throw err;
  }
  await sendPasswordResetEmail(requireAuth(), trimmed);
}

export async function logout(): Promise<void> {
  if (auth) await signOut(auth);
}

export async function reauthenticateForAccountDeletion(password?: string): Promise<void> {
  const user = requireAuth().currentUser;
  if (!user) throw new Error('Sign in first.');
  const passwordProvider = user.providerData.some((provider) => provider.providerId === 'password');
  if (passwordProvider) {
    if (!password || !user.email) throw new Error('Enter your password to confirm account deletion.');
    await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password));
    return;
  }
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  if (!webClientId || webClientId.trim() === '') {
    const err = new Error('Google Web Client ID is not configured.');
    (err as { code?: string }).code = 'MISSING_WEB_CLIENT_ID';
    throw err;
  }
  const { GoogleOneTapSignIn, isSuccessResponse } = await import('react-native-nitro-google-signin');
  GoogleOneTapSignIn.configure({ webClientId });
  const response = await GoogleOneTapSignIn.signIn();
  if (!response || !isSuccessResponse(response) || !response.data?.idToken) throw new Error('Confirm your Google account again to delete this account.');
  await reauthenticateWithCredential(user, GoogleAuthProvider.credential(response.data.idToken));
}

export async function loginWithGoogle(): Promise<AuthIdentity> {
  const currentAuth = requireAuth();
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const rn = require('react-native');
    if (rn?.Platform?.OS === 'web') {
      throw new Error('Use the mobile app build for Google sign-in.');
    }
  } catch (platErr: any) {
    if (platErr?.message?.includes('mobile app build')) throw platErr;
  }

  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  if (!webClientId || webClientId.trim() === '') {
    const err = new Error('Google Web Client ID is not configured.');
    (err as { code?: string }).code = 'MISSING_WEB_CLIENT_ID';
    throw err;
  }

  const { GoogleOneTapSignIn, isSuccessResponse } = await import('react-native-nitro-google-signin');
  GoogleOneTapSignIn.configure({ webClientId });

  try {
    await GoogleOneTapSignIn.checkPlayServices();
  } catch {
    const err = new Error('Google Play services are unavailable or need updating.');
    (err as { code?: string }).code = 'PLAY_SERVICES_NOT_AVAILABLE';
    throw err;
  }

  let response: any;
  try {
    response = await GoogleOneTapSignIn.signIn();
    if (response?.type === 'noSavedCredentialFound') response = await GoogleOneTapSignIn.createAccount();
    if (response?.type === 'noSavedCredentialFound') response = await GoogleOneTapSignIn.presentExplicitSignIn();
  } catch (signErr) {
    throw signErr;
  }

  if (!response) {
    const err = new Error('Google sign-in was cancelled.');
    (err as { code?: string }).code = 'SIGN_IN_CANCELLED';
    throw err;
  }

  if (response.type === 'cancelled') {
    const err = new Error('Google sign-in was cancelled.');
    (err as { code?: string }).code = 'SIGN_IN_CANCELLED';
    throw err;
  }

  if (response.type === 'noSavedCredentialFound') {
    const err = new Error('No saved Google credentials found on this device.');
    (err as { code?: string }).code = 'NO_SAVED_CREDENTIAL_FOUND';
    throw err;
  }

  if (!isSuccessResponse(response) || !response.data?.idToken) {
    const err = new Error('Google sign-in was cancelled or returned no identity token.');
    (err as { code?: string }).code = 'SIGN_IN_CANCELLED';
    throw err;
  }

  const credential = GoogleAuthProvider.credential(response.data.idToken);
  return (await signInWithCredential(currentAuth, credential)).user;
}
