import AsyncStorage from '@react-native-async-storage/async-storage';

export const CRASH_CONSENT_STORAGE_KEY = '@fittrack_crash_reporting_consent';
export const CRASH_LOGS_STORAGE_KEY = '@fittrack_recent_crashes';
const APP_VERSION = '1.0.0';
const MAX_STORED_CRASHES = 5;

export interface RawCrashPayload {
  errorName?: string;
  errorMessage?: string;
  stack?: string;
  componentStack?: string;
  platform?: string;
  context?: Record<string, unknown>;
}

export interface ScrubbedCrashReport {
  id: string;
  timestamp: string;
  appVersion: string;
  platform: string;
  errorName: string;
  errorMessage: string;
  stack?: string;
  componentStack?: string;
}

/**
 * Redacts API keys, local file paths, email addresses, and potential meal/health text.
 */
export function scrubCrashText(input: string, customApiKey?: string): string {
  if (!input) return '';

  let cleaned = input;

  // 1. Redact custom API key if provided
  if (customApiKey && customApiKey.trim().length > 0) {
    cleaned = cleaned.split(customApiKey.trim()).join('[redacted-key]');
  }

  // 2. Redact any Google AIza tokens
  cleaned = cleaned.replace(/AIza[0-9A-Za-z-_]{20,}/g, '[redacted-token]');

  // 3. Redact email addresses
  cleaned = cleaned.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[redacted-email]');

  // 4. Scrub local disk file paths (Windows & Unix)
  cleaned = cleaned.replace(/[A-Za-z]:\\[^:\s"'`]+[/\\]/g, 'app://');
  cleaned = cleaned.replace(/\/Users\/[^/\s"'`]+[/\\]/g, 'app://');
  cleaned = cleaned.replace(/\/home\/[^/\s"'`]+[/\\]/g, 'app://');

  // 5. Scrub meal / food keywords if logged accidentally in error messages
  cleaned = cleaned.replace(
    /(?:meal|food|dish|recipe|calories|protein|carbs|fat|weight|grams|samoon|biryani|dolma|burger|pizza|apple):\s*[^,\n;]+/gi,
    '[health-data-scrubbed]'
  );

  return cleaned.slice(0, 500);
}

/**
 * Sanitizes an entire crash report, completely stripping any sensitive personal or health data.
 */
export function sanitizeCrashReport(
  payload: RawCrashPayload,
  customApiKey?: string
): ScrubbedCrashReport {
  const errorName = scrubCrashText(payload.errorName || 'Error', customApiKey);
  const errorMessage = scrubCrashText(payload.errorMessage || 'An unexpected error occurred', customApiKey);

  let stack: string | undefined;
  if (payload.stack) {
    stack = scrubCrashText(payload.stack, customApiKey).slice(0, 800);
  }

  let componentStack: string | undefined;
  if (payload.componentStack) {
    componentStack = scrubCrashText(payload.componentStack, customApiKey).slice(0, 800);
  }

  return {
    id: `crash_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    appVersion: APP_VERSION,
    platform: payload.platform || 'android',
    errorName,
    errorMessage,
    stack,
    componentStack,
  };
}

/**
 * Retrieves the current crash reporting consent status.
 * Defaults to false (strict opt-in).
 */
export async function getCrashReportingConsent(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(CRASH_CONSENT_STORAGE_KEY);
    return value === 'true';
  } catch {
    return false;
  }
}

/**
 * Saves user consent for anonymized crash reporting.
 */
export async function setCrashReportingConsent(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(CRASH_CONSENT_STORAGE_KEY, enabled ? 'true' : 'false');
  } catch (err) {
    console.error('Failed to save crash reporting consent:', err);
  }
}

/**
 * Records a crash report only if the user has given explicit consent.
 * Never transmits or stores data when consent is disabled.
 */
export async function recordCrash(
  error: unknown,
  errorInfo?: { componentStack?: string | null },
  customApiKey?: string
): Promise<ScrubbedCrashReport | null> {
  try {
    const isConsentGiven = await getCrashReportingConsent();
    if (!isConsentGiven) {
      return null;
    }

    const rawError = error instanceof Error ? error : new Error(String(error || 'Unknown error'));
    const payload: RawCrashPayload = {
      errorName: rawError.name,
      errorMessage: rawError.message,
      stack: rawError.stack,
      componentStack: errorInfo?.componentStack || undefined,
    };

    const sanitized = sanitizeCrashReport(payload, customApiKey);

    // Save to local ring buffer for inspection / diagnostics
    const existingRaw = await AsyncStorage.getItem(CRASH_LOGS_STORAGE_KEY);
    const existing: ScrubbedCrashReport[] = existingRaw ? JSON.parse(existingRaw) : [];
    const updated = [sanitized, ...existing].slice(0, MAX_STORED_CRASHES);
    await AsyncStorage.setItem(CRASH_LOGS_STORAGE_KEY, JSON.stringify(updated));

    return sanitized;
  } catch (err) {
    console.error('Error while recording sanitized crash:', err);
    return null;
  }
}

/**
 * Purges all stored crash diagnostics from the device.
 */
export async function clearStoredCrashes(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CRASH_LOGS_STORAGE_KEY);
  } catch (err) {
    console.error('Failed to clear stored crashes:', err);
  }
}
