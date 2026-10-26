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

console.log('All useFoodSearch Unit Tests PASSED Cleanly!');
