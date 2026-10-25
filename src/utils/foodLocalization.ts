import { AppLanguage } from '../types';

export interface LocalizedFoodLike {
  name: string;
  nameAr?: string;
  nameCkb?: string;
}

/**
 * Returns the localized food name matching the user's active language.
 * Falls back gracefully to English name if no specific translation exists.
 */
export function getLocalizedFoodName(
  food?: LocalizedFoodLike | null,
  language: AppLanguage = 'en'
): string {
  if (!food) return '';
  if (language === 'ar' && food.nameAr && food.nameAr.trim().length > 0) {
    return food.nameAr.trim();
  }
  if (language === 'ckb' && food.nameCkb && food.nameCkb.trim().length > 0) {
    return food.nameCkb.trim();
  }
  return food.name;
}
