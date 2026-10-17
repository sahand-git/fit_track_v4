import {
  scrubCrashText,
  sanitizeCrashReport,
  getCrashReportingConsent,
  setCrashReportingConsent,
  recordCrash,
  clearStoredCrashes,
  CRASH_LOGS_STORAGE_KEY,
} from './crashReportingService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations } from '../i18n/strings';

const mockStore: Record<string, string> = {};
(globalThis as any).window = {
  localStorage: {
    getItem: (k: string) => mockStore[k] ?? null,
    setItem: (k: string, v: string) => { mockStore[k] = String(v); },
    removeItem: (k: string) => { delete mockStore[k]; },
    clear: () => { Object.keys(mockStore).forEach((k) => delete mockStore[k]); },
    key: (i: number) => Object.keys(mockStore)[i] ?? null,
    get length() { return Object.keys(mockStore).length; },
  },
};

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runCrashReportingTests() {
  console.log('Starting Crash Reporting & Privacy Scrubbing Unit Tests...');

  // 1. Text scrubbing tests
  {
    const secretKey = 'AIzaSySecretCustomDeveloperKey999';
    const textWithSecrets = `Failed to fetch from Gemini API. Key used: ${secretKey} and backup token AIzaSyAnotherTokenForTesting1234567890. User email: test.user@example.com. Path: C:\\Users\\Developer\\FitTrack\\src\\App.tsx:42. Logged meal: Chicken Biryani with 650 calories and 40g protein.`;

    const scrubbed = scrubCrashText(textWithSecrets, secretKey);

    assert(!scrubbed.includes(secretKey), 'Custom API key must be scrubbed');
    assert(scrubbed.includes('[redacted-key]'), 'Expected [redacted-key] placeholder');
    assert(!scrubbed.includes('AIzaSyAnotherTokenForTesting1234567890'), 'Generic AIza token must be scrubbed');
    assert(scrubbed.includes('[redacted-token]'), 'Expected [redacted-token] placeholder');
    assert(!scrubbed.includes('test.user@example.com'), 'Email must be scrubbed');
    assert(scrubbed.includes('[redacted-email]'), 'Expected [redacted-email] placeholder');
    assert(!scrubbed.includes('C:\\Users\\Developer'), 'Local disk path must be scrubbed');
    assert(scrubbed.includes('app://'), 'Expected app:// file path placeholder');
    assert(!scrubbed.includes('Chicken Biryani'), 'Food names must be scrubbed');
    assert(scrubbed.includes('[health-data-scrubbed]'), 'Expected [health-data-scrubbed] placeholder');

    console.log('✓ Test 1 passed: Deep privacy scrubbing removes keys, tokens, emails, paths, and health data.');
  }

  // 2. Full report payload sanitization
  {
    const customKey = 'AIzaSyMyCustomSecretKey888';
    const report = sanitizeCrashReport(
      {
        errorName: 'TypeError in App.tsx',
        errorMessage: `Network error with key ${customKey}`,
        stack: 'at Object.invoke (C:\\Users\\SAIF\\fittrack\\App.tsx:50:10)',
        componentStack: '\n    in DashboardScreen\n    in ErrorBoundary',
      },
      customKey
    );

    assert(report.appVersion === '1.0.0', 'App version must be 1.0.0');
    assert(!report.errorMessage.includes(customKey), 'API key must not appear in errorMessage');
    assert(report.errorMessage.includes('[redacted-key]'), 'Expected redacted placeholder');
    assert(report.stack !== undefined && !report.stack.includes('C:\\Users'), 'Local path must not appear in stack');
    assert(report.stack !== undefined && report.stack.includes('app://'), 'Stack should use app://');

    console.log('✓ Test 2 passed: sanitizeCrashReport creates clean, scrubbed telemetry payload.');
  }

  // 3. Strict Consent Gating (Opt-in)
  {
    await AsyncStorage.clear();
    await clearStoredCrashes();

    // Default consent must be false
    const defaultConsent = await getCrashReportingConsent();
    assert(defaultConsent === false, 'Default consent must be false');

    // Recording crash while consent is false must return null and write nothing
    const unconsented = await recordCrash(new Error('Sample crash while disabled'));
    assert(unconsented === null, 'recordCrash must return null when consent is false');
    const logsWhenDisabled = await AsyncStorage.getItem(CRASH_LOGS_STORAGE_KEY);
    assert(logsWhenDisabled === null, 'No logs must be written when consent is false');

    // Enable consent
    await setCrashReportingConsent(true);
    const updatedConsent = await getCrashReportingConsent();
    assert(updatedConsent === true, 'Consent must update to true');

    // Recording crash while consent is true must succeed
    const consented = await recordCrash(new Error('Sample crash while enabled'));
    assert(consented !== null, 'recordCrash must return report when consent is true');
    if (!consented) throw new Error('Unreachable');
    assert(consented.errorMessage.includes('Sample crash while enabled'), 'Error message preserved');

    const logsWhenEnabled = await AsyncStorage.getItem(CRASH_LOGS_STORAGE_KEY);
    assert(logsWhenEnabled !== null, 'Logs must be saved in storage');
    if (!logsWhenEnabled) throw new Error('Unreachable');
    const parsedLogs = JSON.parse(logsWhenEnabled);
    assert(Array.isArray(parsedLogs) && parsedLogs.length === 1, 'Exactly 1 crash log should be stored');

    // Disabling consent stops recording
    await setCrashReportingConsent(false);
    const stopped = await recordCrash(new Error('Should not be recorded'));
    assert(stopped === null, 'Subsequent crash must not be recorded after consent revocation');

    console.log('✓ Test 3 passed: Consent gating strictly controls telemetry capture and storage.');
  }

  // 4. Localization check for crash reporting strings
  {
    const requiredStrings = [
      'Anonymous Crash Reporting',
      'Help improve stability by sharing anonymized error stacks. Meals, foods, and keys are strictly excluded.',
      'Privacy & Diagnostics',
    ];

    for (const key of requiredStrings) {
      assert(Boolean((translations.ar as Record<string, string>)[key]), `Missing Arabic translation for: "${key}"`);
      assert(Boolean((translations.ckb as Record<string, string>)[key]), `Missing Kurdish translation for: "${key}"`);
    }

    console.log('✓ Test 4 passed: All crash reporting strings localized in Arabic and Kurdish.');
  }

  console.log('====================================================');
  console.log('All Crash Reporting Service Tests Passed Cleanly!');
  console.log('====================================================');
}

runCrashReportingTests().catch((err) => {
  console.error('Crash reporting test failure:', err);
  process.exit(1);
});
