/**
 * FitTrack v4 — Canonical Food ID Migration Map
 *
 * Resolves legacy or duplicate food IDs to their single canonical entries.
 * Ensures user logs, favorites, recent foods, and templates remain 100% intact.
 */

export const FOOD_ID_MIGRATIONS: Record<string, string> = {
  // Pita bread duplicate -> USDA SR28 canonical entry
  food_pita_bread: 'usda_sr28_18042',

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

  // Pizza duplicates -> canonical pizzas with variants
  pop_pizza_cheese_slice: 'pizza_cheese_margherita',
  pop_pizza_cheese_whole: 'pizza_cheese_margherita',
  pop_pizza_pepperoni_slice: 'pizza_pepperoni_classic',
  pop_pizza_pepperoni_whole: 'pizza_pepperoni_classic',
  pop_pizza_veggie_slice: 'pizza_vegetable_supreme',
  pop_pizza_bbq_chicken_slice: 'pizza_chicken_grilled',
  pop_pizza_meat_lovers_slice: 'pizza_pepperoni_classic',

  // Regional dishes duplicates -> recipe-based canonical entries
  food_kurdish_chicken_biryani: 'regional_biryani_chicken',
  food_kebab_shish: 'regional_iraqi_kebab',
  food_chicken_tikka_skewer: 'regional_chicken_tikka_kebab',
  food_kubba_sawar: 'regional_kubba_sawar',
  food_kubba_halab: 'regional_kubba_halab',
  food_tepsi_baytinjan: 'regional_tepsi_baytinjan',
  food_samoon_bread: 'regional_stone_samoon',
  food_kurdish_do: 'regional_shenina_ayran',
  food_doogh_salted_ayran: 'regional_shenina_ayran',
  food_bamya_stew: 'regional_bamya_lamb',
  food_kleicha_pastry: 'regional_kleicha_dates',
  food_tahini_dibis: 'regional_tahin_debs',
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
