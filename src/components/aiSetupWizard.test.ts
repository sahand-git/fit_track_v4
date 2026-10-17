import { sanitizeGeminiString, GeminiError, getDefaultMessageForKind } from '../utils/geminiModels';
import { translations } from '../i18n/strings';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function runAiSetupWizardTests() {
  console.log('Starting AI Setup Wizard & Key Security Tests...');

  // 1. Key Leak Prevention
  {
    const secretKey = 'AIzaSySecretApiKey1234567890TestKey';
    const rawError = `Failed to connect to https://generativelanguage.googleapis.com/v1beta/models?key=${secretKey}: 403 Forbidden with token ${secretKey}`;
    const sanitized = sanitizeGeminiString(rawError, secretKey);

    assert(!sanitized.includes(secretKey), 'API key must never appear in sanitized output');
    assert(!sanitized.includes('AIzaSySecretApiKey1234567890TestKey'), 'AIza token must be redacted');
    assert(sanitized.includes('[redacted]'), 'Expected [redacted] token in place of key');
    console.log('✓ Test 1 passed: API key strictly sanitized and never leaked in error output.');
  }

  // 2. Kind-Specific Error Guidance
  {
    const kinds: { kind: GeminiError['kind']; expectedSubstr: string }[] = [
      { kind: 'invalid_key', expectedSubstr: 'rejected this API key' },
      { kind: 'permission', expectedSubstr: 'Permission denied' },
      { kind: 'quota', expectedSubstr: 'quota exceeded' },
      { kind: 'rate_limit', expectedSubstr: 'rate limit' },
      { kind: 'model_unavailable', expectedSubstr: 'unavailable' },
      { kind: 'network', expectedSubstr: 'Network error' },
    ];

    for (const { kind, expectedSubstr } of kinds) {
      const msg = getDefaultMessageForKind(kind);
      assert(
        msg.toLowerCase().includes(expectedSubstr.toLowerCase()),
        `Expected ${kind} to include "${expectedSubstr}", got "${msg}"`
      );
    }
    console.log('✓ Test 2 passed: Kind-specific failure messages verified for all Gemini error categories.');
  }

  // 3. Localization Completeness across EN, AR, and CKB
  {
    const wizardKeys = [
      'AI Setup Wizard',
      'Bring Your Own Gemini Key',
      'AI is Completely Optional',
      'FitTrack is 100% functional offline without AI. Core nutrition tracking, barcode scanning, custom recipes, and progress charts never require AI.',
      'What is this key?',
      'Google Gemini powers optional AI features like photographic meal analysis, voice/text descriptions, and daily nutrition coaching.',
      'Security & Privacy Guarantee',
      'Your key stays strictly on this device in secure encrypted storage. FitTrack never uploads your key to any server or shares it with anyone.',
      'Get Free Key from Google AI Studio',
      'Paste your Gemini API key',
      'Key cannot be empty to test connection.',
      'Connected Model: ',
      'Skip for Now',
      'Use FitTrack without AI',
      'Save & Finish',
      'Guided Setup Wizard',
      'Next: AI Setup (Optional)',
      'Optional AI Setup',
    ];

    for (const key of wizardKeys) {
      assert(
        Boolean((translations.ar as any)[key]),
        `Missing Arabic translation for AI wizard string: "${key}"`
      );
      assert(
        Boolean((translations.ckb as any)[key]),
        `Missing Kurdish translation for AI wizard string: "${key}"`
      );
    }
    console.log(`✓ Test 3 passed: All ${wizardKeys.length} AI wizard strings fully translated in Arabic and Kurdish Sorani.`);
  }

  console.log('All AI Setup Wizard Tests Passed successfully!');
}

runAiSetupWizardTests();
