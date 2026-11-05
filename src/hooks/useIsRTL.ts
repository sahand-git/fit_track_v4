import { useLanguage } from '../i18n/I18nContext';
import { AppLanguage } from '../types';

/**
 * Determines whether a given language is Right-To-Left (Arabic or Kurdish Sorani).
 */
export function isRTL(language: AppLanguage | string | undefined | null): boolean {
  return language === 'ar' || language === 'ckb';
}

/**
 * Shared React hook returning whether the active application language is RTL.
 */
export function useIsRTL(): boolean {
  const language = useLanguage();
  return isRTL(language);
}
