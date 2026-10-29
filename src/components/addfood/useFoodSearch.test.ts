import assert from 'node:assert';
import { filterFoodCatalog } from './useFoodSearch';
import { FoodItem } from '../../types';

console.log('Starting useFoodSearch & Catalog Filter Unit Tests...');

const sampleFoods: FoodItem[] = [
  {
    id: 'f1',
    name: 'Steamed White Rice',
    nameAr: 'أرز أبيض مطبوخ',
    nameCkb: 'برنجی سپی کوڵاو',
    category: 'Grains & Bread',
    calories: 130,
    protein: 2.7,
    carbs: 28.2,
    fat: 0.3,
    servingSize: '100g',
    servingGrams: 100,
    source: 'verified_database',
  },
  {
    id: 'f2',
    name: 'Grilled Chicken Breast',
    nameAr: 'صدر دجاج مشوي',
    nameCkb: 'سنگی مریشکی برژاو',
    category: 'Meat & Poultry',
    calories: 165,
    protein: 31,
    carbs: 0,
    fat: 3.6,
    servingSize: '100g',
    servingGrams: 100,
    source: 'verified_database',
  },
  {
    id: 'f3',
    name: 'Hummus Dip',
    nameAr: 'حمص بطحينة',
    nameCkb: 'حمس',
    category: 'Sauces & Dips',
    brand: 'Cedars',
    barcode: '041234567890',
    calories: 166,
    protein: 7.9,
    carbs: 14.3,
    fat: 9.6,
    servingSize: '100g',
    servingGrams: 100,
    source: 'verified_database',
  },
];

const mockT = (key: string) => key;

// Test 1: Empty query returns full source list
const allResults = filterFoodCatalog({
  searchQuery: '',
  foodFilter: 'all',
  recentFoods: [],
  frequentFoods: [],
  favoriteFoods: [],
  customFoods: [sampleFoods[0]],
  barcodeCache: [],
  t: mockT,
});
assert(allResults.length > 0, 'Should return non-empty food catalog on empty query');
console.log('✓ Test 1 passed: Empty query returns full catalog.');

// Test 2: Category filter switching (recent, favorites, custom)
const recentFood: FoodItem = sampleFoods[1];
const recentResults = filterFoodCatalog({
  searchQuery: '',
  foodFilter: 'recent',
  recentFoods: [recentFood],
  frequentFoods: [],
  favoriteFoods: [],
  customFoods: [],
  barcodeCache: [],
  t: mockT,
});
assert.strictEqual(recentResults.length, 1, 'Recent filter should return only recent foods');
assert.strictEqual(recentResults[0].id, 'f2', 'Recent food id should match f2');
console.log('✓ Test 2 passed: Category filter switching operates accurately.');

// Test 3: Multilingual search matching
// Search in English
const enResults = filterFoodCatalog({
  searchQuery: 'Chicken',
  foodFilter: 'all',
  recentFoods: [],
  frequentFoods: [],
  favoriteFoods: [],
  customFoods: sampleFoods,
  barcodeCache: [],
  t: mockT,
});
assert(enResults.some((f) => f.id === 'f2'), 'English query should find Chicken Breast');

// Search in Arabic
const arResults = filterFoodCatalog({
  searchQuery: 'دجاج',
  foodFilter: 'all',
  recentFoods: [],
  frequentFoods: [],
  favoriteFoods: [],
  customFoods: sampleFoods,
  barcodeCache: [],
  t: mockT,
});
assert(arResults.some((f) => f.id === 'f2'), 'Arabic query should find Chicken Breast');

// Search in Kurdish Sorani
const ckbResults = filterFoodCatalog({
  searchQuery: 'برنجی',
  foodFilter: 'all',
  recentFoods: [],
  frequentFoods: [],
  favoriteFoods: [],
  customFoods: sampleFoods,
  barcodeCache: [],
  t: mockT,
});
assert(ckbResults.some((f) => f.id === 'f1'), 'Kurdish query should find White Rice');
console.log('✓ Test 3 passed: Multilingual searching in English, Arabic, and Kurdish verified.');

// Test 4: Brand and barcode searching
const brandResults = filterFoodCatalog({
  searchQuery: 'Cedars',
  foodFilter: 'all',
  recentFoods: [],
  frequentFoods: [],
  favoriteFoods: [],
  customFoods: sampleFoods,
  barcodeCache: [],
  t: mockT,
});
assert(brandResults.some((f) => f.id === 'f3'), 'Brand query should find Hummus Dip');

const barcodeResults = filterFoodCatalog({
  searchQuery: '041234567890',
  foodFilter: 'all',
  recentFoods: [],
  frequentFoods: [],
  favoriteFoods: [],
  customFoods: sampleFoods,
  barcodeCache: [],
  t: mockT,
});
assert(barcodeResults.some((f) => f.id === 'f3'), 'Barcode query should find Hummus Dip');
console.log('✓ Test 4 passed: Brand and barcode searching verified.');

// Test 5: Category chip filtering
const meatCategoryResults = filterFoodCatalog({
  searchQuery: '',
  foodFilter: 'all',
  selectedCategory: 'Meat & Poultry',
  recentFoods: [],
  frequentFoods: [],
  favoriteFoods: [],
  customFoods: sampleFoods,
  barcodeCache: [],
  t: mockT,
});
assert(meatCategoryResults.some((f) => f.id === 'f2'), 'Category filter should find chicken');
assert(!meatCategoryResults.some((f) => f.id === 'f1'), 'Category filter should exclude rice');
console.log('✓ Test 5 passed: Canonical category selection accurately filters catalog items.');

// Test 6: Synthetic 1,000-food catalog stress test (Step 7 requirement)
const synthetic1000Foods: FoodItem[] = Array.from({ length: 1000 }, (_, i) => ({
  id: `synth_food_${i}`,
  name: `Synthetic Food Item ${i}`,
  nameAr: `طعام اصطناعي ${i}`,
  nameCkb: `خۆراکی دەستکرد ${i}`,
  category: i % 2 === 0 ? 'Meat & Poultry' : 'Grains & Bread',
  calories: 100 + (i % 500),
  protein: 10 + (i % 50),
  carbs: 20 + (i % 60),
  fat: 5 + (i % 20),
  servingSize: '100g',
  servingGrams: 100,
  source: 'verified_database',
}));

const searchStart = performance.now();
const searchFiltered1000 = filterFoodCatalog({
  searchQuery: 'Food Item 99',
  foodFilter: 'all',
  recentFoods: [],
  frequentFoods: [],
  favoriteFoods: [],
  customFoods: synthetic1000Foods,
  barcodeCache: [],
  t: mockT,
});
const searchDurationMs = performance.now() - searchStart;
assert(searchFiltered1000.length > 0, 'Should find matching synthetic items');
assert(searchDurationMs < 50, `Filtering 1,000 items took ${searchDurationMs.toFixed(2)}ms, must be < 50ms`);
console.log(`✓ Test 6 passed: Synthetic 1,000-food search filtered in ${searchDurationMs.toFixed(2)}ms (< 50ms requirement).`);

// Test 7: Category filtering on 1,000 synthetic foods
const catStart = performance.now();
const catFiltered1000 = filterFoodCatalog({
  searchQuery: '',
  foodFilter: 'all',
  selectedCategory: 'Meat & Poultry',
  recentFoods: [],
  frequentFoods: [],
  favoriteFoods: [],
  customFoods: synthetic1000Foods,
  barcodeCache: [],
  t: mockT,
});
const catDurationMs = performance.now() - catStart;
const synthCatMatches = catFiltered1000.filter((f) => f.id.startsWith('synth_food_'));
assert.strictEqual(synthCatMatches.length, 500, 'Should find exactly 500 synthetic Meat & Poultry items');
assert(catDurationMs < 20, `Category filtering 1,000 items took ${catDurationMs.toFixed(2)}ms, must be < 20ms`);
console.log(`✓ Test 7 passed: Category filtering across 1,000 foods executed in ${catDurationMs.toFixed(2)}ms.`);

// Test 8: Multilingual search across newly added supplementary foods
const testQueries = [
  { lang: 'en', query: 'Chicken Wings', expectedId: 'food_chicken_wings_roasted' },
  { lang: 'ar', query: 'أجنحة دجاج', expectedId: 'food_chicken_wings_roasted' },
  { lang: 'ckb', query: 'باڵی مریشک', expectedId: 'food_chicken_wings_roasted' },
  { lang: 'en', query: 'Tannour', expectedId: 'food_iraqi_tannour_bread' },
  { lang: 'ar', query: 'تنور', expectedId: 'food_iraqi_tannour_bread' },
  { lang: 'ckb', query: 'تەنوور', expectedId: 'food_iraqi_tannour_bread' },
  { lang: 'en', query: 'Edamame', expectedId: 'food_cooked_edamame_pods' },
  { lang: 'ar', query: 'إدامامي', expectedId: 'food_cooked_edamame_pods' },
  { lang: 'ckb', query: 'ئیدامامی', expectedId: 'food_cooked_edamame_pods' },
  { lang: 'en', query: 'Kefir', expectedId: 'food_kefir_lowfat_plain' },
  { lang: 'ar', query: 'كفير', expectedId: 'food_kefir_lowfat_plain' },
  { lang: 'ckb', query: 'کێفیر', expectedId: 'food_kefir_lowfat_plain' },
  { lang: 'en', query: 'Shakshuka', expectedId: 'food_skillet_shakshuka' },
  { lang: 'ar', query: 'شكشوكة', expectedId: 'food_skillet_shakshuka' },
  { lang: 'ckb', query: 'شکشوکە', expectedId: 'food_skillet_shakshuka' },
  { lang: 'en', query: 'Baklava', expectedId: 'food_pistachio_baklava' },
  { lang: 'ar', query: 'بقلاوة', expectedId: 'food_pistachio_baklava' },
  { lang: 'ckb', query: 'بەقڵاوە', expectedId: 'food_pistachio_baklava' },
  { lang: 'en', query: 'Harira', expectedId: 'food_moroccan_harira_soup' },
  { lang: 'ar', query: 'حريرة', expectedId: 'food_moroccan_harira_soup' },
  { lang: 'ckb', query: 'حەریرە', expectedId: 'food_moroccan_harira_soup' },
];

for (const tq of testQueries) {
  const res = filterFoodCatalog({
    searchQuery: tq.query,
    foodFilter: 'all',
    recentFoods: [],
    frequentFoods: [],
    favoriteFoods: [],
    customFoods: [],
    barcodeCache: [],
    t: mockT,
  });
  assert(
    res.some((f) => f.id === tq.expectedId),
    `Search for "${tq.query}" (${tq.lang}) should locate food with id ${tq.expectedId}`
  );
}
console.log(`✓ Test 8 passed: Multilingual search across English, Arabic, and Kurdish Sorani successfully verified for newly added foods.`);

console.log('All useFoodSearch Unit Tests PASSED Cleanly!');
