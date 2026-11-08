import { AppLanguage } from '../types';
import { VERIFIED_FOOD_DATABASE } from '../data/foodDatabase';

export interface LocalizedFoodLike {
  name: string;
  nameAr?: string;
  nameCkb?: string;
  foodId?: string;
  id?: string;
}

let verifiedIdMap: Map<string, { nameAr?: string; nameCkb?: string }> | null = null;
let verifiedNameMap: Map<string, { nameAr?: string; nameCkb?: string }> | null = null;

function ensureVerifiedMaps() {
  if (!verifiedIdMap) {
    verifiedIdMap = new Map();
    verifiedNameMap = new Map();
    for (const f of VERIFIED_FOOD_DATABASE) {
      verifiedIdMap.set(f.id, f);
      if (f.name) {
        verifiedNameMap.set(f.name.toLowerCase().trim(), f);
      }
    }
  }
}

/**
 * Returns the localized food name matching the user's active language.
 * Falls back gracefully to English name if no specific translation exists.
 * Dynamically resolves through VERIFIED_FOOD_DATABASE if the logged food record
 * was created without explicit nameAr/nameCkb fields.
 */
export function getLocalizedFoodName(
  food?: LocalizedFoodLike | null,
  language: AppLanguage = 'en'
): string {
  if (!food) return '';

  if (language === 'ar') {
    if (food.nameAr && food.nameAr.trim().length > 0) {
      return food.nameAr.trim();
    }
    ensureVerifiedMaps();
    const id = food.foodId || food.id;
    if (id && verifiedIdMap?.has(id)) {
      const match = verifiedIdMap.get(id);
      if (match?.nameAr && match.nameAr.trim().length > 0) return match.nameAr.trim();
    }
    const nameKey = (food.name || '').toLowerCase().trim();
    if (nameKey && verifiedNameMap?.has(nameKey)) {
      const match = verifiedNameMap.get(nameKey);
      if (match?.nameAr && match.nameAr.trim().length > 0) return match.nameAr.trim();
    }
  }

  if (language === 'ckb') {
    if (food.nameCkb && food.nameCkb.trim().length > 0) {
      return food.nameCkb.trim();
    }
    ensureVerifiedMaps();
    const id = food.foodId || food.id;
    if (id && verifiedIdMap?.has(id)) {
      const match = verifiedIdMap.get(id);
      if (match?.nameCkb && match.nameCkb.trim().length > 0) return match.nameCkb.trim();
    }
    const nameKey = (food.name || '').toLowerCase().trim();
    if (nameKey && verifiedNameMap?.has(nameKey)) {
      const match = verifiedNameMap.get(nameKey);
      if (match?.nameCkb && match.nameCkb.trim().length > 0) return match.nameCkb.trim();
    }
  }

  return food.name;
}
