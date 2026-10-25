import { getLocalizedFoodName } from './foodLocalization';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

console.log('Starting Food Localization Name Tests...');

const food = {
  name: 'Masgouf Wood-Fired Carp',
  nameAr: 'سمك مسكوف',
  nameCkb: 'ماسی مەسکوف',
};

assert(getLocalizedFoodName(food, 'en') === 'Masgouf Wood-Fired Carp', 'English resolves name');
assert(getLocalizedFoodName(food, 'ar') === 'سمك مسكوف', 'Arabic resolves nameAr');
assert(getLocalizedFoodName(food, 'ckb') === 'ماسی مەسکوف', 'Kurdish resolves nameCkb');

const englishOnly = {
  name: 'Grilled Chicken Breast',
};

assert(getLocalizedFoodName(englishOnly, 'en') === 'Grilled Chicken Breast', 'English fallback');
assert(getLocalizedFoodName(englishOnly, 'ar') === 'Grilled Chicken Breast', 'Arabic falls back to English');
assert(getLocalizedFoodName(englishOnly, 'ckb') === 'Grilled Chicken Breast', 'Kurdish falls back to English');

console.log('✓ All food localization name tests passed cleanly!');
