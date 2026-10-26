import {
  searchOnlineFoodDatabase,
  searchOnlineFood,
  setCachedOnlineSearchResults,
  getCachedOnlineSearchResults,
  clearOnlineSearchCache,
  getOnlineSearchCache,
} from './onlineFoodSearchService';
import { normalizeOpenFoodFactsProduct } from './barcodeService';
import { FoodItem } from '../types';

// Setup mock window.localStorage for AsyncStorage in Node
const mockStore: Record<string, string> = {};
(globalThis as any).window = {
  localStorage: {
    getItem: (k: string) => mockStore[k] ?? null,
    setItem: (k: string, v: string) => {
      mockStore[k] = String(v);
    },
    removeItem: (k: string) => {
      delete mockStore[k];
    },
    clear: () => {
      Object.keys(mockStore).forEach((k) => delete mockStore[k]);
    },
    key: (i: number) => Object.keys(mockStore)[i] ?? null,
    get length() {
      return Object.keys(mockStore).length;
    },
  },
};

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const sampleItemComplete: FoodItem = {
  id: 'off_sample1',
  name: 'Whole Grain Cereal',
  brand: 'Nature First',
  calories: 360,
  protein: 10,
  carbs: 72,
  fat: 3,
  servingSize: '100g',
  servingGrams: 100,
  source: 'open_food_facts',
};

const sampleItemIncomplete: FoodItem = {
  id: 'off_sample2',
  name: 'Mystery Snack',
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  servingSize: '1 package',
  servingGrams: 50,
  source: 'open_food_facts',
  isIncomplete: true,
  incompleteReason: 'Open Food Facts entry lacks full calorie or macronutrient values',
};

async function runOnlineFoodSearchTests() {
  console.log('Starting Comprehensive Online Food Search & Caching Tests...');

  // Reset caches
  await clearOnlineSearchCache();

  // Test 1: Empty or short queries return immediately
  const emptyRes = await searchOnlineFoodDatabase('');
  assert(emptyRes.foods.length === 0, 'Empty query must return empty foods array');
  assert(emptyRes.totalMatches === 0, 'Empty query must report 0 total matches');

  const shortRes = await searchOnlineFoodDatabase('a');
  assert(shortRes.foods.length === 0, 'Single character query must return empty foods array');
  console.log('✓ Test 1 passed: Short/empty queries handled cleanly without network calls.');

  // Test 2: Local Cache Operations (set, get, normalize, clear)
  await setCachedOnlineSearchResults('Cereal', [sampleItemComplete]);
  const cached = await getCachedOnlineSearchResults('cereal');
  assert(cached !== null, 'Cache must return stored results');
  assert(cached.length === 1, 'Cache must contain 1 stored item');
  assert(cached[0].name === 'Whole Grain Cereal', 'Cached item name must match');

  // Normalized query lookup (trim + casing)
  const cachedCaseInsensitive = await getCachedOnlineSearchResults('   CEREAL   ');
  assert(cachedCaseInsensitive !== null && cachedCaseInsensitive.length === 1, 'Cache lookup must be case and whitespace insensitive');

  const cacheMap = await getOnlineSearchCache();
  assert(Boolean(cacheMap['cereal']), 'Cache key must be lowercased and trimmed');

  await clearOnlineSearchCache();
  const cleared = await getCachedOnlineSearchResults('cereal');
  assert(cleared === null, 'Cache must be empty after clearOnlineSearchCache');
  console.log('✓ Test 2 passed: Cache storage, key normalization, and clearing verified.');

  // Test 3: Incomplete Nutrition Flagging
  assert(sampleItemIncomplete.isIncomplete === true, 'Sample item typed as incomplete');
  // Product without calories or macros
  const incompleteProduct = normalizeOpenFoodFactsProduct('000111222', {
    product_name: 'Incomplete Protein Powder',
    brands: 'Bulk Co',
    nutriments: {}, // completely empty
  });
  assert(incompleteProduct.isIncomplete === true, 'Product with empty nutriments must be flagged as isIncomplete');
  assert(Boolean(incompleteProduct.incompleteReason), 'Incomplete reason must be populated');

  // Product with valid calories and macros
  const completeProduct = normalizeOpenFoodFactsProduct('3017620422003', {
    product_name: 'Nutella',
    brands: 'Ferrero',
    nutriments: {
      'energy-kcal_100g': 539,
      proteins_100g: 6.3,
      carbohydrates_100g: 57.5,
      fat_100g: 30.9,
    },
  });
  assert(completeProduct.isIncomplete !== true, 'Complete product must not be flagged as isIncomplete');
  assert(completeProduct.calories > 0, 'Complete product calories must be > 0');
  console.log('✓ Test 3 passed: Incomplete nutrition detection and tagging verified.');

  // Test 4: Offline Fallback with Cache Retrieval
  const originalFetch = globalThis.fetch;
  try {
    // Populate cache for "protein bar"
    await setCachedOnlineSearchResults('protein bar', [sampleItemComplete]);

    // Simulate offline network failure (fetch throws TypeError)
    (globalThis as any).fetch = async () => {
      throw new Error('Network request failed (offline)');
    };

    // Uncached query when offline
    const offlineUncached = await searchOnlineFoodDatabase('unknown food item');
    assert(offlineUncached.foods.length === 0, 'Uncached offline query must return empty foods array');
    assert(offlineUncached.isOffline === true, 'Offline status must be flagged as true');
    assert(offlineUncached.fromCache === false, 'Uncached query must not report fromCache');
    assert(Boolean(offlineUncached.errorMessage), 'Offline error message must be provided');

    // Cached query when offline
    const offlineCached = await searchOnlineFoodDatabase('protein bar');
    assert(offlineCached.foods.length === 1, 'Cached offline query must return cached items');
    assert(offlineCached.foods[0].name === 'Whole Grain Cereal', 'Cached item must match');
    assert(offlineCached.fromCache === true, 'Offline result must indicate fromCache: true');
    assert(offlineCached.isOffline === true, 'Offline status must be indicated even when serving from cache');
    console.log('✓ Test 4 passed: Offline detection and graceful cache fallback verified.');

    // Test 5: Rate Limiting (HTTP 429) Handling
    // Simulate HTTP 429 Too Many Requests
    (globalThis as any).fetch = async () => {
      return {
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        json: async () => ({}),
      } as any;
    };

    // Rate limited on uncached query
    const rateLimitedUncached = await searchOnlineFoodDatabase('exotic fruit');
    assert(rateLimitedUncached.isRateLimited === true, 'Rate limit must be flagged on status 429');
    assert(rateLimitedUncached.foods.length === 0, 'Empty results on uncached rate limit');
    assert(Boolean(rateLimitedUncached.errorMessage), 'Rate limit error message must be provided');

    // Rate limited on cached query
    const rateLimitedCached = await searchOnlineFoodDatabase('protein bar');
    assert(rateLimitedCached.isRateLimited === true, 'Rate limit must be flagged on status 429');
    assert(rateLimitedCached.fromCache === true, 'Must fall back to cache when rate limited');
    assert(rateLimitedCached.foods.length === 1, 'Cached items must be served when rate limited');
    console.log('✓ Test 5 passed: Rate-limit (HTTP 429) detection and cache fallback verified.');

  } finally {
    globalThis.fetch = originalFetch;
    await clearOnlineSearchCache();
  }

  // Test 6: Alias export contract
  assert(typeof searchOnlineFood === 'function', 'searchOnlineFood alias must be exported');
  assert(typeof searchOnlineFoodDatabase === 'function', 'searchOnlineFoodDatabase must be exported');
  console.log('✓ Test 6 passed: API export signatures and aliases validated.');

  console.log('All Comprehensive Online Food Search & Caching Tests PASSED successfully!');
}

runOnlineFoodSearchTests();
