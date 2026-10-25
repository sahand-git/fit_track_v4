/**
 * FitTrack v4 — Canonical Food ID Migration Map
 *
 * Resolves legacy or duplicate food IDs to their single canonical entries.
 * Ensures user logs, favorites, recent foods, and templates remain 100% intact.
 */

export const FOOD_ID_MIGRATIONS: Record<string, string> = {
  // Banana duplicate
  pop_banana_medium: 'food_banana',

  // Olive oil duplicate
  pop_olive_oil_extra_virgin: 'food_olive_oil',

  // Avocado duplicates (3 places -> food_avocado with variants)
  pop_fresh_avocado_whole: 'food_avocado',
  pop_fresh_avocado_half: 'food_avocado',

  // Brown rice duplicates (2 places -> food_brown_rice with variants)
  pop_brown_rice_cooked: 'food_brown_rice',

  // Lean beef 93/7 duplicates (2 places -> food_lean_beef)
  food_lean_beef_93: 'food_lean_beef',

  // Medjool dates duplicates (2 places -> usda_sr28_09421 with variants)
  pop_medjool_dates: 'usda_sr28_09421',

  // Blueberries duplicates (2 places -> food_blueberries with variants)
  pop_blueberries_fresh: 'food_blueberries',

  // Hummus duplicates (3 places -> food_hummus with variants)
  food_hummus_tahini: 'food_hummus',
  usda_sr28_16137: 'food_hummus',

  // Yaprax / Dolma duplicates (2 places -> regional_dolma_yaprax with variants)
  food_kurdish_yaprax: 'regional_dolma_yaprax',

  // Red lentil soup duplicates (4 places -> regional_shorbat_adas with variants)
  food_lentil_soup: 'regional_shorbat_adas',
  food_shorba_nisk: 'regional_shorbat_adas',

  // Coca-Cola Zero duplicates (2 places -> pop_coca_cola_zero with variants)
  food_coca_cola_zero: 'pop_coca_cola_zero',
};

/**
 * Returns the canonical food ID for any given food ID.
 * If the ID has been merged or migrated, returns the target canonical ID;
 * otherwise returns the original ID unchanged.
 */
export function resolveCanonicalFoodId(id: string): string {
  if (!id) return id;
  return FOOD_ID_MIGRATIONS[id] || id;
}

/**
 * Migrates a logged meal item in place or on retrieval.
 */
export function migrateLoggedMeal<T extends { foodId?: string; id?: string }>(item: T): T {
  if (!item) return item;
  if (item.foodId && FOOD_ID_MIGRATIONS[item.foodId]) {
    return {
      ...item,
      foodId: FOOD_ID_MIGRATIONS[item.foodId],
    };
  }
  return item;
}
