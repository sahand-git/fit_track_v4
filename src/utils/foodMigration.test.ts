import { FOOD_ID_MIGRATIONS, resolveCanonicalFoodId, migrateLoggedMeal } from './foodMigration';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

console.log('Starting Food ID Migration Map Unit Tests...');

// 0. Verify migration dictionary structure
assert(Object.keys(FOOD_ID_MIGRATIONS).length >= 10, 'Migrations map is populated with at least 10 legacy food mappings');

// 1. Verify exact duplicate mappings
assert(resolveCanonicalFoodId('pop_banana_medium') === 'food_banana', 'Banana resolves to canonical');
assert(resolveCanonicalFoodId('pop_olive_oil_extra_virgin') === 'food_olive_oil', 'Olive oil resolves to canonical');
assert(resolveCanonicalFoodId('food_lean_beef_93') === 'food_lean_beef', 'Lean beef 93 resolves to canonical');

// 2. Verify multi-place duplicates
assert(resolveCanonicalFoodId('pop_fresh_avocado_whole') === 'food_avocado', 'Avocado whole resolves');
assert(resolveCanonicalFoodId('pop_fresh_avocado_half') === 'food_avocado', 'Avocado half resolves');
assert(resolveCanonicalFoodId('pop_brown_rice_cooked') === 'food_brown_rice', 'Brown rice resolves');
assert(resolveCanonicalFoodId('pop_medjool_dates') === 'usda_sr28_09421', 'Medjool dates resolve');
assert(resolveCanonicalFoodId('pop_blueberries_fresh') === 'food_blueberries', 'Blueberries resolve');
assert(resolveCanonicalFoodId('food_hummus_tahini') === 'food_hummus', 'Hummus tahini resolves');
assert(resolveCanonicalFoodId('usda_sr28_16137') === 'food_hummus', 'USDA hummus resolves');
assert(resolveCanonicalFoodId('food_kurdish_yaprax') === 'regional_dolma_yaprax', 'Yaprax resolves');
assert(resolveCanonicalFoodId('food_lentil_soup') === 'regional_shorbat_adas', 'Lentil soup resolves');
assert(resolveCanonicalFoodId('food_shorba_nisk') === 'regional_shorbat_adas', 'Shorba nisk resolves');
assert(resolveCanonicalFoodId('food_coca_cola_zero') === 'pop_coca_cola_zero', 'Coke zero resolves');

// 3. Verify unmigrated IDs pass through untouched
assert(resolveCanonicalFoodId('food_apple') === 'food_apple', 'Apple remains unchanged');
assert(resolveCanonicalFoodId('pop_coca_cola') === 'pop_coca_cola', 'Coke original remains unchanged');

// 4. Verify migrateLoggedMeal helper
const legacyMeal = {
  id: 'meal_123',
  foodId: 'pop_fresh_avocado_whole',
  name: 'Fresh Avocado',
  servings: 1,
};
const migrated = migrateLoggedMeal(legacyMeal);
assert(migrated.foodId === 'food_avocado', 'Logged meal foodId migrated to canonical');
assert(migrated.id === 'meal_123', 'Meal id preserved');

console.log('✓ All Food ID Migration Map tests passed cleanly!');
