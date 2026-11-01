import { AppLanguage, AICoachReport } from '../types';

/**
 * Unicode ranges for Arabic script:
 * - \u0600-\u06FF: Arabic
 * - \u0750-\u077F: Arabic Supplement
 * - \u08A0-\u08FF: Arabic Extended-A
 * - \uFB50-\uFDFF: Arabic Presentation Forms-A
 * - \uFE70-\uFEFF: Arabic Presentation Forms-B
 */
export const ARABIC_SCRIPT_REGEX = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/gu;

export const MIN_ARABIC_SCRIPT_RATIO = 0.70;

/**
 * Validates that text intended for Arabic or Kurdish Sorani is predominantly written
 * in the Arabic script block (at least ~70% of all alphabetic characters).
 */
export function validateLanguageScript(
  text: string,
  language: AppLanguage | string
): { isValid: boolean; ratio: number; totalLetters: number; scriptLetters: number } {
  if (language !== 'ar' && language !== 'ckb') {
    return { isValid: true, ratio: 1.0, totalLetters: 0, scriptLetters: 0 };
  }

  if (!text || typeof text !== 'string') {
    return { isValid: false, ratio: 0, totalLetters: 0, scriptLetters: 0 };
  }

  // Extract all letters across all scripts (Unicode property \p{L})
  const allLetters = text.match(/\p{L}/gu) || [];
  if (allLetters.length === 0) {
    return { isValid: true, ratio: 1.0, totalLetters: 0, scriptLetters: 0 };
  }

  const arabicScriptLetters = text.match(ARABIC_SCRIPT_REGEX) || [];
  const ratio = arabicScriptLetters.length / allLetters.length;

  return {
    isValid: ratio >= MIN_ARABIC_SCRIPT_RATIO,
    ratio,
    totalLetters: allLetters.length,
    scriptLetters: arabicScriptLetters.length,
  };
}

/**
 * Validates that all user-facing fields in an AICoachReport conform to the expected script.
 */
export function validateReportLanguage(
  report: Omit<AICoachReport, 'generatedAt'>,
  language: AppLanguage | string
): { isValid: boolean; ratio: number } {
  if (language !== 'ar' && language !== 'ckb') {
    return { isValid: true, ratio: 1.0 };
  }

  const combined = [
    report.headline,
    report.caloricBalance,
    report.macroBreakdown,
    ...(Array.isArray(report.mistakesAndBlindSpots) ? report.mistakesAndBlindSpots : []),
    ...(Array.isArray(report.actionableTomorrowFixes) ? report.actionableTomorrowFixes : []),
    report.customMealSuggestion,
    report.coachNote,
  ].filter(Boolean).join(' ');

  return validateLanguageScript(combined, language);
}

/**
 * Returns strict system instructions for LLM prompt headers.
 */
export function getLanguageSystemInstruction(language: AppLanguage | string): string {
  switch (language) {
    case 'ckb':
      return 'CRITICAL LANGUAGE REQUIREMENT: You must respond exclusively in Sorani Kurdish (Central Kurdish, Arabic script; not Kurmanji; not Arabic). Do not output English or Latin words. Keep numbers and unit symbols (e.g. kcal, g, P, C, F) standard. Keep JSON keys in English.';
    case 'ar':
      return 'CRITICAL LANGUAGE REQUIREMENT: You must respond exclusively in Modern Standard Arabic (العربية). Do not output English words. Keep numbers and unit symbols (e.g. kcal, g, P, C, F) standard. Keep JSON keys in English.';
    default:
      return 'You are an evidence-based nutrition and fitness coach. Provide clear, supportive guidance in English. Keep JSON keys in English.';
  }
}
