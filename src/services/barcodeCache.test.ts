import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  loadBarcodeCache,
  saveBarcodeCache,
  upsertBarcodeCacheItem,
  getBarcodeCacheItem,
  searchBarcodeCache,
  clearBarcodeCache,
  restoreAllData,
  loadUserProfile,
} from '../storage/storage';
import { lookupBarcodeWithFallbacks } from './barcodeService';
import { getFoodSourceLabel } from '../utils/foodSource';
import { validateBackup } from '../utils/backupCore';
import { FoodItem, FitTrackBackup } from '../types';

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

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

async function runBarcodeCacheTests() {
  console.log('Starting Offline Barcode Cache & Provenance Tests...');
  await AsyncStorage.clear();

  const sampleFood1: FoodItem = {
    id: 'barcode_3017620422003',
    barcode: '3017620422003',
    name: 'Nutella Hazelnut Spread',
    brand: 'Ferrero',
    servingSize: '15g',
    servingGrams: 15,
    calories: 80,
    protein: 1,
    carbs: 8.6,
    fat: 4.6,
    source: 'open_food_facts',
  };

  const sampleFood2: FoodItem = {
    id: 'barcode_7622210449283',
    barcode: '7622210449283',
    name: 'Oreo Original Sandwich Biscuits',
    brand: 'Mondelez',
    servingSize: '34g',
    servingGrams: 34,
    calories: 160,
    protein: 1.8,
    carbs: 24,
    fat: 6.8,
    source: 'open_food_facts',
  };

  // Test 1: Save and load barcode cache
  {
    await saveBarcodeCache([sampleFood1]);
    const loaded = await loadBarcodeCache();
    assert(loaded.length === 1, 'Cache contains 1 item');
    assert(loaded[0].barcode === '3017620422003', 'Barcode matches');
    assert(loaded[0].name === 'Nutella Hazelnut Spread', 'Product name matches');
    assert(loaded[0].source === 'open_food_facts', 'Source is open_food_facts');
  }

  // Test 2: upsertBarcodeCacheItem - deduplicate and update
  {
    await upsertBarcodeCacheItem(sampleFood2);
    let loaded = await loadBarcodeCache();
    assert(loaded.length === 2, 'Cache now contains 2 items');

    // Upserting food with same barcode replaces the old entry
    const updatedFood1: FoodItem = {
      ...sampleFood1,
      name: 'Nutella Hazelnut Spread (Updated)',
      calories: 82,
    };
    await upsertBarcodeCacheItem(updatedFood1);
    loaded = await loadBarcodeCache();
    assert(loaded.length === 2, 'Cache still has 2 items after updating food1');
    assert(loaded[0].barcode === '3017620422003', 'Updated food is at front');
    assert(loaded[0].calories === 82, 'Calories updated');
  }

  // Test 3: getBarcodeCacheItem - handles spaces and hyphens
  {
    const match1 = await getBarcodeCacheItem('3017620422003');
    assert(match1 !== null && match1.brand === 'Ferrero', 'Exact barcode matches');

    const matchWithSpaces = await getBarcodeCacheItem('  3017620422003  ');
    assert(matchWithSpaces !== null, 'Barcode with whitespace matches');

    const matchWithHyphens = await getBarcodeCacheItem('301-762-0422003');
    assert(matchWithHyphens !== null, 'Barcode with hyphens matches');

    const notFound = await getBarcodeCacheItem('9999999999999');
    assert(notFound === null, 'Nonexistent barcode returns null');
  }

  // Test 4: searchBarcodeCache - search by name, brand, and barcode
  {
    // Search by product name
    const byName = await searchBarcodeCache('Nutella');
    assert(byName.length === 1 && byName[0].barcode === '3017620422003', 'Search by name succeeds');

    // Case-insensitive search
    const byNameLower = await searchBarcodeCache('oreo');
    assert(byNameLower.length === 1 && byNameLower[0].brand === 'Mondelez', 'Case-insensitive search succeeds');

    // Search by brand
    const byBrand = await searchBarcodeCache('Ferrero');
    assert(byBrand.length === 1, 'Search by brand succeeds');

    // Search by barcode number
    const byCode = await searchBarcodeCache('762221');
    assert(byCode.length === 1 && byCode[0].name.includes('Oreo'), 'Search by barcode snippet succeeds');

    // Empty query returns empty array
    const empty = await searchBarcodeCache('   ');
    assert(empty.length === 0, 'Empty query returns empty');
  }

  // Test 5: lookupBarcodeWithFallbacks - offline hit returns cached food without network
  {
    // Override global fetch to fail (simulating offline device)
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      throw new Error('Network error: Device is offline');
    };

    try {
      // Barcode in cache should return immediately without throwing
      const offlineResult = await lookupBarcodeWithFallbacks('3017620422003');
      assert(offlineResult.barcode === '3017620422003', 'Offline lookup returned cached product');
      assert(offlineResult.source === 'open_food_facts', 'Source preserved as open_food_facts');

      // Uncached barcode throws user-friendly offline message
      let threw = false;
      try {
        await lookupBarcodeWithFallbacks('5000159461122');
      } catch (err: any) {
        threw = true;
        assert(err.message.includes('Could not reach food database'), 'Helpful offline message returned');
      }
      assert(threw, 'Uncached barcode threw when offline');
    } finally {
      globalThis.fetch = originalFetch;
    }
  }

  // Test 6: lookupBarcodeWithFallbacks - online lookup automatically caches product
  {
    const originalFetch = globalThis.fetch;
    let fetchCalled = 0;
    const testCode = '5449000000996';
    const mockOffResponse = {
      status: 1,
      product: {
        product_name: 'Coca-Cola Original Taste',
        brands: 'Coca-Cola',
        serving_size: '330 ml',
        serving_quantity: 330,
        nutriments: {
          'energy-kcal_100g': 42,
          proteins_100g: 0,
          carbohydrates_100g: 10.6,
          fat_100g: 0,
          sugars_100g: 10.6,
          sodium_100g: 0,
        },
      },
    };

    globalThis.fetch = async () => {
      fetchCalled++;
      return new Response(JSON.stringify(mockOffResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    try {
      const fetched = await lookupBarcodeWithFallbacks(testCode);
      assert(fetchCalled === 1, 'Fetch was called once');
      assert(fetched.name === 'Coca-Cola Original Taste', 'Product name parsed');
      assert(fetched.calories === 139, 'Calories scaled to 330ml');
      assert(fetched.source === 'open_food_facts', 'Source is open_food_facts');

      // Now verify it was automatically saved in local barcode cache
      const cached = await getBarcodeCacheItem(testCode);
      assert(cached !== null, 'Product was automatically cached');
      assert(cached?.name === 'Coca-Cola Original Taste', 'Cached item has correct name');

      // Second lookup uses cache without calling fetch!
      const secondLookup = await lookupBarcodeWithFallbacks(testCode);
      assert(fetchCalled === 1, 'Fetch was NOT called again because cache hit');
      assert(secondLookup.name === 'Coca-Cola Original Taste', 'Cached result returned');
    } finally {
      globalThis.fetch = originalFetch;
    }
  }

  // Test 7: getFoodSourceLabel - localization and parity with v2
  {
    assert(getFoodSourceLabel('open_food_facts') === 'Open Food Facts', 'OFF source label');
    assert(getFoodSourceLabel('verified_database') === 'Built-in food reference', 'Verified DB label');
    assert(getFoodSourceLabel('custom') === 'Custom food', 'Custom food label');
    assert(getFoodSourceLabel('ai_estimated') === 'AI estimate', 'AI estimate label');
    assert(getFoodSourceLabel('barcode_cache') === 'Barcode Cache', 'Barcode cache label');
    assert(getFoodSourceLabel(undefined) === null, 'Undefined source returns null');

    // With localization function
    const mockT = (key: string) => `[TR] ${key}`;
    assert(getFoodSourceLabel('open_food_facts', mockT) === '[TR] Open Food Facts', 'Localized label');
    assert(getFoodSourceLabel('custom', mockT) === '[TR] Custom food', 'Localized custom label');
  }

  // Test 8: Backup and restore preserves barcode cache
  {
    const currentProfile = await loadUserProfile();
    const backup: FitTrackBackup = {
      version: '4.0',
      exportedAt: new Date().toISOString(),
      profile: currentProfile,
      dailyLogs: {},
      supplementRoutine: [],
      weightHistory: [],
      barcodeCache: [sampleFood1, sampleFood2],
    };

    // Validates cleanly against backup schema
    const validated = validateBackup(backup);
    assert(validated.barcodeCache?.length === 2, 'Validated backup retains barcodeCache');

    // Restore overwrites cache
    await clearBarcodeCache();
    let emptyCache = await loadBarcodeCache();
    assert(emptyCache.length === 0, 'Cache cleared before restore');

    await restoreAllData(backup, 'replace');
    const restored = await loadBarcodeCache();
    assert(restored.length === 2, 'Restore restored barcodeCache');
    assert(restored[0].barcode === sampleFood1.barcode, 'Restored barcode matches');

    // Merge restore unions items
    const newFood: FoodItem = {
      id: 'barcode_8000500310427',
      barcode: '8000500310427',
      name: 'Kinder Bueno',
      servingSize: '43g',
      servingGrams: 43,
      calories: 246,
      protein: 3.9,
      carbs: 22.7,
      fat: 16,
      source: 'open_food_facts',
    };
    const mergeBackup: FitTrackBackup = {
      version: '4.0',
      exportedAt: new Date().toISOString(),
      profile: currentProfile,
      dailyLogs: {},
      supplementRoutine: [],
      weightHistory: [],
      barcodeCache: [newFood, sampleFood1],
    };
    await restoreAllData(mergeBackup, 'merge');
    const merged = await loadBarcodeCache();
    assert(merged.length === 3, 'Merge restore unifies barcode items to 3');
  }

  console.log('All offline barcode cache and food source tests passed successfully!');
}

runBarcodeCacheTests().catch((err) => {
  console.error('Barcode cache tests failed:', err);
  process.exit(1);
});
