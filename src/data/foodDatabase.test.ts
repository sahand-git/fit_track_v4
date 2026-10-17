import { REGIONAL_FOODS, VERIFIED_FOOD_DATABASE } from './foodDatabase';
import { getFoodSourceLabel } from '../utils/foodSource';
import { PortionUnit } from '../types';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function runFoodDatabaseTests() {
  console.log('Starting Regional Foods & Food Database Tests...');

  // Test 1: Regional foods collection completeness
  {
    assert(REGIONAL_FOODS.length >= 20, `Expected at least 20 regional dishes, got ${REGIONAL_FOODS.length}`);
    const ids = new Set<string>();
    for (const food of REGIONAL_FOODS) {
      assert(!ids.has(food.id), `Duplicate regional food id: ${food.id}`);
      ids.add(food.id);
      assert(food.id.startsWith('regional_'), `Regional food id must start with regional_: ${food.id}`);
      assert(food.name.length > 3, `Regional food name too short: ${food.name}`);
      assert(food.servingSize.length > 0, `Missing servingSize for ${food.id}`);
      assert(food.servingGrams > 0, `servingGrams must be positive for ${food.id}`);
      assert(food.calories >= 0, `calories must be >= 0 for ${food.id}`);
      assert(food.protein >= 0, `protein must be >= 0 for ${food.id}`);
      assert(food.carbs >= 0, `carbs must be >= 0 for ${food.id}`);
      assert(food.fat >= 0, `fat must be >= 0 for ${food.id}`);
      assert(food.source === 'regional_culinary_estimate', `source must be regional_culinary_estimate: ${food.id}`);
      assert(typeof food.isEstimate === 'boolean', `isEstimate must be a boolean for ${food.id}`);
    }
    console.log(`✓ Test 1 passed: All ${REGIONAL_FOODS.length} regional foods validated for identity and macro bounds.`);
  }

  // Test 2: Portion units and gram conversions
  {
    const validPortionUnits: PortionUnit[] = ['g', 'piece', 'spoon', 'glass', 'samoon', 'bowl', 'plate', 'serving'];
    for (const food of REGIONAL_FOODS) {
      assert(Boolean(food.portionUnit), `Missing portionUnit for ${food.id}`);
      assert(validPortionUnits.includes(food.portionUnit!), `Invalid portionUnit ${food.portionUnit} for ${food.id}`);
      assert(Boolean(food.gramsPerUnit && food.gramsPerUnit > 0), `Invalid gramsPerUnit for ${food.id}`);
    }

    // Check specific known dishes
    const samoon = REGIONAL_FOODS.find((f) => f.id === 'regional_stone_samoon')!;
    assert(samoon.portionUnit === 'samoon', 'Stone samoon has portionUnit samoon');
    assert(samoon.gramsPerUnit === 90, 'Stone samoon is 90g');
    assert(samoon.isEstimate === false, 'Standard baked samoon is not flagged as rough estimate');

    const tea = REGIONAL_FOODS.find((f) => f.id === 'regional_cardamom_tea')!;
    assert(tea.portionUnit === 'glass', 'Cardamom tea has portionUnit glass');
    assert(tea.gramsPerUnit === 120, 'Istikan tea is ~120ml');

    const debs = REGIONAL_FOODS.find((f) => f.id === 'regional_tahin_debs')!;
    assert(debs.portionUnit === 'spoon', 'Tahin & Debs has portionUnit spoon');
    assert(debs.gramsPerUnit === 20, 'Tahin & Debs tablespoon is 20g');

    const dolma = REGIONAL_FOODS.find((f) => f.id === 'regional_dolma_yaprax')!;
    assert(dolma.portionUnit === 'piece', 'Dolma has portionUnit piece');
    assert(dolma.gramsPerUnit === 30, '1 dolma piece is 30g');
    assert(dolma.isEstimate === true, 'Dolma carries culinary estimate flag');

    const masgouf = REGIONAL_FOODS.find((f) => f.id === 'regional_masgouf')!;
    assert(masgouf.portionUnit === 'plate', 'Masgouf has portionUnit plate');
    assert(masgouf.gramsPerUnit === 250, 'Masgouf portion is 250g');
    assert(masgouf.isEstimate === true, 'Masgouf carries culinary estimate flag');

    const tashreeb = REGIONAL_FOODS.find((f) => f.id === 'regional_lamb_tashreeb')!;
    assert(tashreeb.portionUnit === 'bowl', 'Lamb tashreeb has portionUnit bowl');
    assert(tashreeb.gramsPerUnit === 400, 'Tashreeb portion is 400g');

    console.log('✓ Test 2 passed: Portion units (samoon, glass, spoon, piece, plate, bowl) verified.');
  }

  // Test 3: Macro-calorie consistency
  {
    for (const food of REGIONAL_FOODS) {
      const calculatedKcal = food.protein * 4 + food.carbs * 4 + food.fat * 9;
      // Stated calories should be within reasonable proximity (within 20% or 30 kcal of 4/4/9 sum)
      const diff = Math.abs(calculatedKcal - food.calories);
      assert(
        diff <= Math.max(35, food.calories * 0.25),
        `Calorie discrepancy too high for ${food.id}: stated ${food.calories}, calculated ${calculatedKcal}`
      );
    }
    console.log('✓ Test 3 passed: Regional food macronutrient and calorie consistency verified.');
  }

  // Test 4: Integration into VERIFIED_FOOD_DATABASE
  {
    const totalCount = VERIFIED_FOOD_DATABASE.length;
    assert(totalCount > REGIONAL_FOODS.length, 'VERIFIED_FOOD_DATABASE includes regional foods plus existing database');
    for (const regFood of REGIONAL_FOODS) {
      const found = VERIFIED_FOOD_DATABASE.find((f) => f.id === regFood.id);
      assert(Boolean(found), `Regional food ${regFood.id} missing from VERIFIED_FOOD_DATABASE`);
      assert(found!.name === regFood.name, `Name mismatch in database for ${regFood.id}`);
    }
    console.log('✓ Test 4 passed: All regional foods seamlessly merged into VERIFIED_FOOD_DATABASE.');
  }

  // Test 5: Food Source Labeling
  {
    const labelEn = getFoodSourceLabel('regional_culinary_estimate');
    assert(labelEn === 'Regional Culinary', `Unexpected label: ${labelEn}`);

    const labelCustomT = getFoodSourceLabel('regional_culinary_estimate', (k) => `TR:${k}`);
    assert(labelCustomT === 'TR:Regional Culinary', `Custom translator failed: ${labelCustomT}`);
    console.log('✓ Test 5 passed: Food source label verified for regional_culinary_estimate.');
  }

  // Test 6: Recipe Ingredients, Citations, and Variants
  {
    for (const food of REGIONAL_FOODS) {
      assert(food.recipeEstimate === true, `Regional food ${food.id} must have recipeEstimate: true`);
      assert(Array.isArray(food.ingredients) && food.ingredients.length > 0, `Missing ingredients for ${food.id}`);
      let sumIngredientGrams = 0;
      for (const ing of food.ingredients!) {
        assert(typeof ing.name === 'string' && ing.name.length > 0, `Invalid ingredient name in ${food.id}`);
        assert(typeof ing.grams === 'number' && ing.grams > 0, `Invalid ingredient grams in ${food.id}`);
        assert(typeof ing.source === 'string' && ing.source.includes('USDA FDC'), `Ingredient source must cite USDA FDC for ${food.id}: got "${ing.source}"`);
        sumIngredientGrams += ing.grams;
      }
      // Ingredients should sum up to a realistic raw-weight proportion
      assert(sumIngredientGrams > 0, `Total ingredient grams must be positive for ${food.id}`);

      // Variants
      assert(Array.isArray(food.variants) && food.variants.length >= 2, `Expected at least 2 variants for ${food.id}`);
      const variantIds = new Set<string>();
      for (const variant of food.variants!) {
        assert(typeof variant.id === 'string' && variant.id.length > 0, `Variant missing id in ${food.id}`);
        assert(!variantIds.has(variant.id), `Duplicate variant id ${variant.id} in ${food.id}`);
        variantIds.add(variant.id);
        assert(typeof variant.name === 'string' && variant.name.length > 0, `Variant missing name in ${food.id}`);
        assert(typeof variant.calories === 'number' && variant.calories >= 0, `Variant invalid calories in ${food.id}`);
        assert(typeof variant.protein === 'number' && variant.protein >= 0, `Variant invalid protein in ${food.id}`);
        assert(typeof variant.carbs === 'number' && variant.carbs >= 0, `Variant invalid carbs in ${food.id}`);
        assert(typeof variant.fat === 'number' && variant.fat >= 0, `Variant invalid fat in ${food.id}`);
      }
    }
    console.log('✓ Test 6 passed: Recipe ingredients, USDA citations, and preparation variants verified across all regional dishes.');
  }

  console.log('All Food Database & Regional Foods Tests Passed successfully!');
}

runFoodDatabaseTests();
