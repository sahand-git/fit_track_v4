import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, addDoc } from 'firebase/firestore';
import { auth, firestore, firebaseConfigured } from './firebaseApp';

export const FOOD_REQUESTS_RATE_LIMIT_KEY = '@fittrack_food_request_timestamps';
export const MAX_REQUESTS_PER_HOUR = 5;
export const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

export interface FoodRequestParams {
  foodName: string;
  brand?: string;
  notes?: string;
  barcode?: string;
}

export type FoodRequestResult =
  | { status: 'success'; id: string }
  | { status: 'rate_limited'; waitMinutes: number }
  | { status: 'signed_out' }
  | { status: 'unverified' }
  | { status: 'error'; message: string };

/**
 * Checks client rate limit against an array of recent request timestamps.
 * Returns { allowed: true } or { allowed: false, waitMinutes: N }.
 */
export async function checkRateLimit(): Promise<{ allowed: boolean; waitMinutes: number }> {
  try {
    const raw = await AsyncStorage.getItem(FOOD_REQUESTS_RATE_LIMIT_KEY);
    const timestamps: number[] = raw ? JSON.parse(raw) : [];
    const now = Date.now();
    const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

    if (recent.length >= MAX_REQUESTS_PER_HOUR) {
      const oldestInWindow = Math.min(...recent);
      const remainingMs = RATE_LIMIT_WINDOW_MS - (now - oldestInWindow);
      const waitMinutes = Math.max(1, Math.ceil(remainingMs / (60 * 1000)));
      return { allowed: false, waitMinutes };
    }
    return { allowed: true, waitMinutes: 0 };
  } catch {
    return { allowed: true, waitMinutes: 0 };
  }
}

/**
 * Records a successful request timestamp into local storage for rate limiting.
 */
export async function recordRequestTimestamp(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(FOOD_REQUESTS_RATE_LIMIT_KEY);
    const timestamps: number[] = raw ? JSON.parse(raw) : [];
    const now = Date.now();
    const updated = [...timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS), now];
    await AsyncStorage.setItem(FOOD_REQUESTS_RATE_LIMIT_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Failed to record food request timestamp:', err);
  }
}

/**
 * Submits a new food request to Firestore if the user is authenticated and email-verified.
 * If signed out or unverified, returns appropriate status so the UI can offer email/share fallback.
 */
export async function submitFoodRequest(params: FoodRequestParams): Promise<FoodRequestResult> {
  const trimmedName = params.foodName.trim();
  if (!trimmedName) {
    return { status: 'error', message: 'Food name cannot be empty.' };
  }

  // 1. Client-side Rate Limit Check
  const rateLimit = await checkRateLimit();
  if (!rateLimit.allowed) {
    return { status: 'rate_limited', waitMinutes: rateLimit.waitMinutes };
  }

  // 2. Auth State Verification
  if (!firebaseConfigured || !firestore || !auth || !auth.currentUser) {
    return { status: 'signed_out' };
  }

  if (!auth.currentUser.emailVerified) {
    return { status: 'unverified' };
  }

  // 3. Firestore Document Creation
  try {
    const payload = {
      userId: auth.currentUser.uid,
      foodName: trimmedName.slice(0, 200),
      brand: params.brand?.trim().slice(0, 200) || '',
      notes: params.notes?.trim().slice(0, 500) || '',
      barcode: params.barcode?.trim().slice(0, 50) || '',
      createdAt: new Date().toISOString(),
      status: 'pending',
    };

    const docRef = await addDoc(collection(firestore, 'foodRequests'), payload);
    await recordRequestTimestamp();
    return { status: 'success', id: docRef.id };
  } catch (err: any) {
    console.error('Failed to submit food request to Firestore:', err);
    return { status: 'error', message: err?.message || 'Failed to submit food request.' };
  }
}

/**
 * Generates a pre-filled mailto URL for requesting a food item via email.
 */
export function createFoodRequestMailtoUrl(params: FoodRequestParams): string {
  const subject = encodeURIComponent(`FitTrack Food Request: ${params.foodName.trim()}`);
  const body = encodeURIComponent(
    `FitTrack Food Catalog Request\n\n` +
    `• Food Name: ${params.foodName.trim()}\n` +
    (params.brand?.trim() ? `• Brand / Restaurant: ${params.brand.trim()}\n` : '') +
    (params.barcode?.trim() ? `• Barcode: ${params.barcode.trim()}\n` : '') +
    (params.notes?.trim() ? `• Serving size & notes: ${params.notes.trim()}\n` : '') +
    `\nSubmitted from FitTrack App`
  );
  return `mailto:support@fittrack.app?subject=${subject}&body=${body}`;
}

/**
 * Formats a plain text share message summarizing the requested food item.
 */
export function formatFoodRequestShareMessage(params: FoodRequestParams): string {
  return (
    `FitTrack Food Request:\n` +
    `• Food: ${params.foodName.trim()}\n` +
    (params.brand?.trim() ? `• Brand: ${params.brand.trim()}\n` : '') +
    (params.barcode?.trim() ? `• Barcode: ${params.barcode.trim()}\n` : '') +
    (params.notes?.trim() ? `• Notes: ${params.notes.trim()}\n` : '')
  );
}
