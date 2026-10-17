/**
 * FitTrack v4 — Feedback Utility Core
 *
 * Implements privacy-compliant feedback payload generation.
 * Attaches exclusively app version, platform, OS version, and language.
 * Strictly guarantees that no health metrics, meal logs, weights, or API keys are included.
 */

/**
 * Clearly marked placeholder support email constant.
 * Replace with your team's support inbox prior to public production distribution.
 */
export const FEEDBACK_SUPPORT_EMAIL = 'support-placeholder@fittrack.local';

export const APP_VERSION = '1.0.0';

export interface FeedbackDeviceMeta {
  appVersion?: string;
  platform?: string;
  osVersion?: string | number;
  language?: string;
  supportEmail?: string;
}

/**
 * Generates a pre-filled mailto URI containing only basic diagnostic environment metadata.
 * Never includes meals, foods, biometrics, or credentials.
 */
export function buildFeedbackEmailUrl(meta: FeedbackDeviceMeta = {}): string {
  const email = meta.supportEmail || FEEDBACK_SUPPORT_EMAIL;
  const version = meta.appVersion || APP_VERSION;
  const platform = meta.platform || 'android';
  const os = meta.osVersion !== undefined ? String(meta.osVersion) : 'unknown';
  const lang = meta.language || 'en';

  const subject = encodeURIComponent(`FitTrack Feedback (${platform} v${version})`);
  const bodyText =
    `FitTrack Feedback & Support\n` +
    `----------------------------\n` +
    `App Version: ${version}\n` +
    `Platform: ${platform} (OS ${os})\n` +
    `Language: ${lang}\n` +
    `----------------------------\n\n` +
    `[Write your feedback, feature suggestion, or issue description here]\n\n` +
    `[Privacy Notice: Please do not include passwords, API keys, or personal health logs.]\n`;

  const body = encodeURIComponent(bodyText);
  return `mailto:${email}?subject=${subject}&body=${body}`;
}

/**
 * Generates plain-text feedback diagnostic summary for native share sheet fallback.
 */
export function buildFeedbackShareMessage(meta: FeedbackDeviceMeta = {}): string {
  const version = meta.appVersion || APP_VERSION;
  const platform = meta.platform || 'android';
  const os = meta.osVersion !== undefined ? String(meta.osVersion) : 'unknown';
  const lang = meta.language || 'en';
  const email = meta.supportEmail || FEEDBACK_SUPPORT_EMAIL;

  return (
    `FitTrack Feedback\n` +
    `App Version: ${version}\n` +
    `Platform: ${platform} (OS ${os})\n` +
    `Language: ${lang}\n` +
    `Support: ${email}`
  );
}

/**
 * Verifies that a feedback payload does not contain sensitive health data or API keys.
 */
export function assertSafeFeedbackPayload(payload: string): boolean {
  if (/AIza[0-9A-Za-z-_]{20,}/.test(payload)) return false;
  if (/(?:calories|protein|carbs|fat|weightKg|heightCm|bmr|tdee):\s*\d+/i.test(payload)) return false;
  return true;
}
