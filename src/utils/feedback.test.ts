import {
  FEEDBACK_SUPPORT_EMAIL,
  APP_VERSION,
  buildFeedbackEmailUrl,
  buildFeedbackShareMessage,
  assertSafeFeedbackPayload,
} from './feedbackCore';
import { translations } from '../i18n/strings';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function runFeedbackTests() {
  console.log('Starting Feedback & Metadata Sanitation Unit Tests...');

  // 1. Placeholder constant check
  {
    assert(typeof FEEDBACK_SUPPORT_EMAIL === 'string', 'Support email must be a string');
    assert(FEEDBACK_SUPPORT_EMAIL.includes('@'), 'Support email must contain @');
    assert(FEEDBACK_SUPPORT_EMAIL.includes('placeholder') || FEEDBACK_SUPPORT_EMAIL.includes('.local'), 'Support email must be a clearly marked placeholder');
    console.log(`✓ Test 1 passed: Clearly marked placeholder email verified (${FEEDBACK_SUPPORT_EMAIL}).`);
  }

  // 2. buildFeedbackEmailUrl formatting & safety
  {
    const mailto = buildFeedbackEmailUrl({
      language: 'ar',
      platform: 'android',
      osVersion: 34,
      appVersion: '1.0.0',
    });

    assert(mailto.startsWith('mailto:'), 'Must start with mailto:');
    assert(mailto.includes(FEEDBACK_SUPPORT_EMAIL), 'Must target placeholder support email');

    const decoded = decodeURIComponent(mailto);
    assert(decoded.includes(`App Version: ${APP_VERSION}`), 'Must include app version');
    assert(decoded.includes('Platform: android (OS 34)'), 'Must include platform and OS version');
    assert(decoded.includes('Language: ar'), 'Must include active language');

    // Strict privacy checks: must NEVER contain health data or keys
    assert(!decoded.includes('calories:'), 'Health data (calories) must never be in mailto');
    assert(!decoded.includes('protein:'), 'Health data (protein) must never be in mailto');
    assert(!decoded.includes('weightKg:'), 'Health data (weightKg) must never be in mailto');
    assert(assertSafeFeedbackPayload(decoded), 'assertSafeFeedbackPayload must validate true');

    console.log('✓ Test 2 passed: Pre-filled mailto generated with only device metadata; zero health data.');
  }

  // 3. Share sheet message generation & safety
  {
    const shareText = buildFeedbackShareMessage({
      language: 'ckb',
      platform: 'ios',
      osVersion: '18.1',
      appVersion: '1.0.0',
    });

    assert(shareText.includes('Platform: ios (OS 18.1)'), 'Must include device metadata');
    assert(shareText.includes('Language: ckb'), 'Must include language');
    assert(shareText.includes(`Support: ${FEEDBACK_SUPPORT_EMAIL}`), 'Must include support email');
    assert(assertSafeFeedbackPayload(shareText), 'Share text must pass health payload safety check');

    console.log('✓ Test 3 passed: Native share sheet fallback message contains strictly non-health metadata.');
  }

  // 4. Localization check
  {
    const requiredStrings = [
      'Send Feedback',
      'Share suggestions or report bugs. App version and device model are attached; health data is never included.',
    ];

    for (const key of requiredStrings) {
      assert(Boolean((translations.ar as Record<string, string>)[key]), `Missing Arabic translation for: "${key}"`);
      assert(Boolean((translations.ckb as Record<string, string>)[key]), `Missing Kurdish translation for: "${key}"`);
    }

    console.log('✓ Test 4 passed: All feedback UI strings localized in Arabic and Kurdish.');
  }

  console.log('====================================================');
  console.log('All In-App Feedback Unit Tests Passed Cleanly!');
  console.log('====================================================');
}

runFeedbackTests();
