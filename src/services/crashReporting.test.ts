import {
  scrubCrashText,
  sanitizeCrashReport,
  getCrashReportingConsent,
  setCrashReportingConsent,
  recordCrash,
  clearStoredCrashes,
  getLastStoredCrash,
  getStoredCrashes,
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

    assert(report.appVersion.length > 0, 'App version must be populated');
    assert(!report.errorMessage.includes(customKey), 'API key must not appear in errorMessage');
    assert(report.errorMessage.includes('[redacted-key]'), 'Expected redacted placeholder');
    assert(report.stack !== undefined && !report.stack.includes('C:\\Users'), 'Local path must not appear in stack');
    assert(report.stack !== undefined && report.stack.includes('app://'), 'Stack should use app://');

    console.log('✓ Test 2 passed: sanitizeCrashReport creates clean, scrubbed telemetry payload.');
  }

  // 3. Unconditional On-Device Ring Buffer (last 5 crashes, zero external transmission)
  {
    await AsyncStorage.clear();
    await clearStoredCrashes();

    const initial = await getLastStoredCrash();
    assert(initial === null, 'Initial crash report should be null');

    // Record crash 1
    const rep1 = await recordCrash(new Error('Sample test crash 1'));
    assert(rep1 !== null, 'recordCrash must return report');
    const storedAfter1 = await getStoredCrashes();
    assert(storedAfter1.length === 1, 'Expected 1 stored crash');
    const last1 = await getLastStoredCrash();
    assert(last1?.errorMessage.includes('Sample test crash 1') === true, 'Last stored crash must match rep1');

    // Record 5 more crashes (total 6) to verify ring buffer capped at 5
    for (let i = 2; i <= 6; i++) {
      await recordCrash(new Error(`Sample test crash ${i}`));
    }

    const storedAfter6 = await getStoredCrashes();
    assert(storedAfter6.length === 5, 'Ring buffer must cap at MAX_STORED_CRASHES (5)');
    const latest = await getLastStoredCrash();
    assert(latest?.errorMessage.includes('Sample test crash 6') === true, 'Latest crash must be the most recent one');

    // Clear crashes
    await clearStoredCrashes();
    const afterClear = await getStoredCrashes();
    assert(afterClear.length === 0, 'Crashes should be cleared');
    assert(await getLastStoredCrash() === null, 'Last crash should be null after clearing');

    // Consent flag verification for backward compatibility
    await setCrashReportingConsent(true);
    assert((await getCrashReportingConsent()) === true, 'Consent getter/setter works');
    await setCrashReportingConsent(false);
    assert((await getCrashReportingConsent()) === false, 'Consent reset works');

    console.log('✓ Test 3 passed: Unconditional on-device ring buffer stores up to 5 scrubbed crashes and clears cleanly.');
  }

  // 4. Localization check for crash reporting and diagnostics strings
  {
    const requiredStrings = [
      'Copy error details',
      'View last crash report',
      'Inspect scrubbed on-device diagnostic log from the most recent crash.',
      'Last Crash Diagnostic',
      'Stored on this device only; zero external telemetry.',
      'No crash reports recorded',
      'FitTrack has not recorded any crashes on this device.',
      'Health metrics, meal logs, and API keys are strictly scrubbed before saving on-device.',
      'App Version',
      'Copy Report',
      'Share Report',
      'Clear History',
      'Local On-Device Diagnostics',
      'FitTrack transmits zero crash or health telemetry to remote servers. All crash diagnostics are scrubbed and stored locally on your device only.',
      'Component Stack',
      'Error Details',
      'Timestamp',
      'Platform',
      'Copied!',
    ];

    for (const key of requiredStrings) {
      assert(Boolean((translations.ar as Record<string, string>)[key]), `Missing Arabic translation for: "${key}"`);
      assert(Boolean((translations.ckb as Record<string, string>)[key]), `Missing Kurdish translation for: "${key}"`);
    }

    console.log('✓ Test 4 passed: All crash reporting and diagnostic strings localized in Arabic and Kurdish.');
  }

  console.log('====================================================');
  console.log('All Crash Reporting Service Tests Passed Cleanly!');
  console.log('====================================================');
}

runCrashReportingTests().catch((err) => {
  console.error('Crash reporting test failure:', err);
  process.exit(1);
});
