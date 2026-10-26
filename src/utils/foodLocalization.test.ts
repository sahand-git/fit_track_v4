import { getLocalizedFoodName } from './foodLocalization';
import { VERIFIED_FOOD_DATABASE } from '../data/foodDatabase';

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

// Verify that all 285 database foods have both nameAr and nameCkb populated
for (const item of VERIFIED_FOOD_DATABASE) {
  assert(
    Boolean(item.nameAr && item.nameAr.trim().length > 0),
    `Food "${item.name}" (${item.id}) must have non-empty nameAr`
  );
  assert(
    Boolean(item.nameCkb && item.nameCkb.trim().length > 0),
    `Food "${item.name}" (${item.id}) must have non-empty nameCkb`
  );
  assert(
    getLocalizedFoodName(item, 'ar') === item.nameAr,
    `Arabic localization for ${item.id} must return nameAr`
  );
  assert(
    getLocalizedFoodName(item, 'ckb') === item.nameCkb,
    `Kurdish localization for ${item.id} must return nameCkb`
  );
}
console.log(`✓ All ${VERIFIED_FOOD_DATABASE.length} foods verified to have Arabic and Kurdish names.`);

console.log('✓ All food localization name tests passed cleanly!');
