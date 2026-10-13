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
import { Platform } from 'react-native';
import { auth, firebaseConfigured } from './firebaseApp';

export type AuthIdentity = Pick<User, 'uid' | 'email' | 'displayName' | 'emailVerified' | 'isAnonymous'>;
export type AuthListener = (user: AuthIdentity | null) => void;

const AUTH_ERROR_TRANSLATIONS: Record<string, string> = {
  'auth/invalid-email': 'Enter a valid email address.',
  'auth/email-already-in-use': 'An account already exists with this email.',
  'auth/weak-password': 'Use a password with at least six characters.',
  'auth/invalid-credential': 'Email or password is incorrect.',
  'auth/user-not-found': 'Email or password is incorrect.',
  'auth/wrong-password': 'Email or password is incorrect.',
  'auth/too-many-requests': 'Too many attempts. Wait a little and try again.',
  'auth/network-request-failed': 'Check your internet connection and try again.',
  'auth/requires-recent-login': 'Sign in again to confirm this sensitive action.',
  'auth/popup-closed-by-user': 'Google sign-in was cancelled.',
  'auth/account-exists-with-different-credential': 'An account already exists with this email. Sign in using its original method.',
};

export function getAuthErrorMessage(error: unknown): string {
  const code = error && typeof error === 'object' && 'code' in error ? String((error as { code: unknown }).code) : '';
  if (AUTH_ERROR_TRANSLATIONS[code]) return AUTH_ERROR_TRANSLATIONS[code];
  if (error instanceof Error && /Email not verified/i.test(error.message)) return 'Email not verified yet. Cloud backup stays locked until verification.';
  if (error instanceof Error && /No cloud backup exists/i.test(error.message)) return 'No cloud backup exists for this account yet.';
  if (error instanceof Error && /Backup is too large/i.test(error.message)) return 'Cloud backup is too large. Export a local backup instead.';
  if (error instanceof Error && /Sign in before using cloud backup|Sign in first/i.test(error.message)) return 'Sign in to use cloud backup.';
  if (error instanceof Error && /account changed/i.test(error.message)) return 'Your account changed. Sign in again and retry.';
  if (error instanceof Error && /Enter your password/i.test(error.message)) return 'Enter your current password to confirm account deletion.';
  if (error instanceof Error && /Google sign-in was cancelled/i.test(error.message)) return 'Google sign-in was cancelled.';
  if (error instanceof Error && /Firebase is not configured/i.test(error.message)) return 'Firebase is not configured.';
  if (error instanceof Error && error.message.includes('Firebase is not configured')) return 'Firebase is not configured.';
  if (error instanceof Error && error.message.includes('network')) return 'Check your internet connection and try again.';
  return 'Something went wrong. Please try again.';
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
  const result = await createUserWithEmailAndPassword(requireAuth(), email.trim(), password);
  await sendEmailVerification(result.user);
  return result.user;
}

export async function loginWithEmail(email: string, password: string): Promise<AuthIdentity> {
  const result = await signInWithEmailAndPassword(requireAuth(), email.trim(), password);
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
  await sendPasswordResetEmail(requireAuth(), email.trim());
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
  const { GoogleOneTapSignIn, isSuccessResponse } = await import('react-native-nitro-google-signin');
  GoogleOneTapSignIn.configure({ webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || 'autoDetect' });
  const response = await GoogleOneTapSignIn.signIn();
  if (!isSuccessResponse(response) || !response.data.idToken) throw new Error('Confirm your Google account again to delete this account.');
  await reauthenticateWithCredential(user, GoogleAuthProvider.credential(response.data.idToken));
}

export async function loginWithGoogle(): Promise<AuthIdentity> {
  const currentAuth = requireAuth();
  if (Platform.OS === 'web') {
    throw new Error('Use the mobile app build for Google sign-in.');
  }
  const { GoogleOneTapSignIn, isSuccessResponse } = await import('react-native-nitro-google-signin');
  GoogleOneTapSignIn.configure({ webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || 'autoDetect' });
  await GoogleOneTapSignIn.checkPlayServices();
  let response = await GoogleOneTapSignIn.signIn();
  if (response.type === 'noSavedCredentialFound') response = await GoogleOneTapSignIn.createAccount();
  if (response.type === 'noSavedCredentialFound') response = await GoogleOneTapSignIn.presentExplicitSignIn();
  if (!isSuccessResponse(response) || !response.data.idToken) throw new Error('Google sign-in was cancelled or returned no identity token.');
  const credential = GoogleAuthProvider.credential(response.data.idToken);
  return (await signInWithCredential(currentAuth, credential)).user;
}
