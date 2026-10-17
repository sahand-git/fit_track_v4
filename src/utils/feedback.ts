import { Linking, Platform, Share } from 'react-native';
import {
  buildFeedbackEmailUrl,
  buildFeedbackShareMessage,
  FEEDBACK_SUPPORT_EMAIL,
  FeedbackDeviceMeta,
} from './feedbackCore';

export { FEEDBACK_SUPPORT_EMAIL, buildFeedbackEmailUrl, buildFeedbackShareMessage };

export async function sendFeedback(language: string): Promise<{ success: boolean; method: 'mailto' | 'share' }> {
  const meta: FeedbackDeviceMeta = {
    platform: Platform.OS,
    osVersion: Platform.Version,
    language,
    supportEmail: FEEDBACK_SUPPORT_EMAIL,
  };

  const mailtoUrl = buildFeedbackEmailUrl(meta);

  try {
    const canOpen = await Linking.canOpenURL(mailtoUrl);
    if (canOpen) {
      await Linking.openURL(mailtoUrl);
      return { success: true, method: 'mailto' };
    }
  } catch {
    // If canOpenURL or openURL fails, fallback to Share sheet
  }

  try {
    const message = buildFeedbackShareMessage(meta);
    await Share.share({
      title: 'FitTrack Feedback',
      message,
    });
    return { success: true, method: 'share' };
  } catch (err) {
    console.error('Failed to trigger feedback share sheet:', err);
    return { success: false, method: 'share' };
  }
}
