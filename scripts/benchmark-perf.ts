import { performance } from 'perf_hooks';
import { filterFoodCatalog } from '../src/components/addfood/useFoodSearch';
import { getFoodEmoji } from '../src/utils/foodCategories';
import { theme } from '../src/theme';

/**
 * FitTrack v4 Performance Benchmark Script
 * Measures baseline execution times for critical interactions before optimizations:
 * 1. Add food sheet open & full catalog mapping (284 items)
 * 2. Search typing keystroke filter & row creation
 * 3. FoodThumbnail per-instance StyleSheet creation vs cached
 * 4. Synthetic 1,000 food catalog stress test
 */

function runBenchmark() {
  console.log('=====================================================');
  console.log('       FITTRACK v4 PERFORMANCE PROFILER (BASELINE)   ');
  console.log('=====================================================');

  const t = (k: string) => k;

  // 1. Measure Sheet Open: Catalog Filtering with empty search
  const t0 = performance.now();
  const filtered = filterFoodCatalog({
    searchQuery: '',
    foodFilter: 'all',
    recentFoods: [],
    frequentFoods: [],
    favoriteFoods: [],
    customFoods: [],
    barcodeCache: [],
    t,
  });
  const filterTime = performance.now() - t0;

  // 2. Measure Uncached FoodThumbnail StyleSheet creation (284 items)
  // Simulates StyleSheet.create by building fresh object trees per row per render
  const uncachedStyleFn = (th: any) => ({
    container: {
      backgroundColor: th.colors.surfaceSubtle,
      borderWidth: 1,
      borderColor: th.colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    image: { backgroundColor: th.colors.surfaceSubtle },
    emoji: { textAlign: 'center', includeFontPadding: false },
  });

  const tThumb0 = performance.now();
  for (let i = 0; i < filtered.length; i++) {
    const item = filtered[i];
    getFoodEmoji(item.name, item.category);
    uncachedStyleFn(theme);
  }
  const thumbCreateTime = performance.now() - tThumb0;

  // 3. Measure Typing Keystroke: filter + 284 row mapping
  const tSearch0 = performance.now();
  const searchResults = filterFoodCatalog({
    searchQuery: 'ch',
    foodFilter: 'all',
    recentFoods: [],
    frequentFoods: [],
    favoriteFoods: [],
    customFoods: [],
    barcodeCache: [],
    t,
  });
  for (let i = 0; i < searchResults.length; i++) {
    const item = searchResults[i];
    getFoodEmoji(item.name, item.category);
    uncachedStyleFn(theme);
  }
  const searchTime = performance.now() - tSearch0;

  // 4. Measure 1,000 items synthetic catalog
  const synthetic1000: any[] = Array.from({ length: 1000 }, (_, idx) => ({
    id: `synthetic_${idx}`,
    name: `Synthetic Food ${idx}`,
    calories: 100 + (idx % 200),
    protein: 10,
    carbs: 10,
    fat: 5,
    servingSize: '100g',
    category: 'Grains & Bread',
  }));

  const tSynth0 = performance.now();
  const synthFiltered = filterFoodCatalog({
    searchQuery: 'synthetic',
    foodFilter: 'all',
    recentFoods: [],
    frequentFoods: [],
    favoriteFoods: [],
    customFoods: synthetic1000,
    barcodeCache: [],
    t,
  });
  for (let i = 0; i < synthFiltered.length; i++) {
    uncachedStyleFn(theme);
  }
  const synthTime = performance.now() - tSynth0;

  console.log(`- Filter time (empty query, ${filtered.length} foods): ${filterTime.toFixed(2)} ms`);
  console.log(`- Row stylesheet creation (284 rows, uncached): ${thumbCreateTime.toFixed(2)} ms`);
  console.log(`- Search keystroke ('ch' -> ${searchResults.length} matches): ${searchTime.toFixed(2)} ms`);
  console.log(`- Synthetic 1,000 items processing: ${synthTime.toFixed(2)} ms`);
  console.log('=====================================================\n');

  return {
    filterTime,
    thumbCreateTime,
    searchTime,
    synthTime,
    catalogCount: filtered.length,
  };
}

runBenchmark();
