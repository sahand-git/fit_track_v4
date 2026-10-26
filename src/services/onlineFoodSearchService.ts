import AsyncStorage from '@react-native-async-storage/async-storage';
import { FoodItem } from '../types';
import { normalizeOpenFoodFactsProduct } from './barcodeService';

const SEARCH_API_URL = 'https://world.openfoodfacts.org/cgi/search.pl';
const USER_AGENT = 'FitTrack-Expo-App/4.0 (https://github.com/sahand-git/fit_track_v4)';
export const ONLINE_SEARCH_CACHE_KEY = '@fittrack_online_search_cache_v1';
export const ONLINE_SEARCH_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
export const MAX_CACHE_ENTRIES = 50;

export interface OnlineSearchResult {
  foods: FoodItem[];
  totalMatches: number;
  fromCache?: boolean;
  isOffline?: boolean;
  isRateLimited?: boolean;
  errorMessage?: string;
}

export interface CachedOnlineQuery {
  query: string;
  foods: FoodItem[];
  timestamp: number;
}

// In-memory cache mirror for synchronous fallback and fast repeated queries
const memoryCache = new Map<string, CachedOnlineQuery>();

function normalizeQueryKey(query: string): string {
  return query.trim().toLowerCase();
}

/**
 * Loads the full online search cache from storage.
 */
export async function getOnlineSearchCache(): Promise<Record<string, CachedOnlineQuery>> {
  try {
    const raw = await AsyncStorage.getItem(ONLINE_SEARCH_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return parsed as Record<string, CachedOnlineQuery>;
    }
    return {};
  } catch {
    // If AsyncStorage fails, return in-memory cache
    const obj: Record<string, CachedOnlineQuery> = {};
    for (const [k, v] of memoryCache.entries()) {
      obj[k] = v;
    }
    return obj;
  }
}

/**
 * Retrieves cached online search results for a given query if not expired.
 */
export async function getCachedOnlineSearchResults(query: string): Promise<FoodItem[] | null> {
  const key = normalizeQueryKey(query);
  if (!key) return null;

  // 1. Check in-memory mirror first
  const memEntry = memoryCache.get(key);
  const now = Date.now();
  if (memEntry && now - memEntry.timestamp < ONLINE_SEARCH_CACHE_TTL_MS) {
    return memEntry.foods;
  }

  // 2. Check AsyncStorage
  try {
    const cache = await getOnlineSearchCache();
    const entry = cache[key];
    if (entry && now - entry.timestamp < ONLINE_SEARCH_CACHE_TTL_MS) {
      memoryCache.set(key, entry);
      return entry.foods;
    }
  } catch {
    // Ignore cache load failure
  }

  return null;
}

/**
 * Persists online search results for a query into the local cache.
 */
export async function setCachedOnlineSearchResults(
  query: string,
  foods: FoodItem[]
): Promise<void> {
  const key = normalizeQueryKey(query);
  if (!key) return;

  const entry: CachedOnlineQuery = {
    query: key,
    foods,
    timestamp: Date.now(),
  };

  memoryCache.set(key, entry);

  try {
    const current = await getOnlineSearchCache();
    current[key] = entry;

    // Prune expired or overflow entries
    const now = Date.now();
    const entries = Object.entries(current)
      .filter(([, v]) => now - v.timestamp < ONLINE_SEARCH_CACHE_TTL_MS)
      .sort((a, b) => b[1].timestamp - a[1].timestamp)
      .slice(0, MAX_CACHE_ENTRIES);

    const pruned: Record<string, CachedOnlineQuery> = {};
    for (const [k, v] of entries) {
      pruned[k] = v;
    }

    await AsyncStorage.setItem(ONLINE_SEARCH_CACHE_KEY, JSON.stringify(pruned));
  } catch (err) {
    console.warn('[onlineFoodSearch] Failed to persist cache:', err);
  }
}

/**
 * Clears the local online search query cache.
 */
export async function clearOnlineSearchCache(): Promise<void> {
  memoryCache.clear();
  try {
    await AsyncStorage.removeItem(ONLINE_SEARCH_CACHE_KEY);
  } catch (err) {
    console.warn('[onlineFoodSearch] Failed to clear cache:', err);
  }
}

/**
 * Helper delay function for exponential backoff on HTTP 429.
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Searches the OpenFoodFacts global food database when local results are insufficient.
 * Supports:
 *  - Local query caching in AsyncStorage with 7-day TTL
 *  - Offline detection with fallback to cached results
 *  - Rate-limit (HTTP 429) backoff retry and friendly notice
 *  - Honest incomplete data flagging on products with missing nutrition
 */
export async function searchOnlineFoodDatabase(
  query: string,
  pageSize = 15
): Promise<OnlineSearchResult> {
  const clean = query.trim();
  if (clean.length < 2) {
    return { foods: [], totalMatches: 0 };
  }

  const normalizedKey = normalizeQueryKey(clean);

  // Helper to fallback to cache if available
  const fallbackToCache = async (status: {
    isOffline?: boolean;
    isRateLimited?: boolean;
    errorMessage?: string;
  }): Promise<OnlineSearchResult> => {
    const cached = await getCachedOnlineSearchResults(normalizedKey);
    if (cached && cached.length > 0) {
      return {
        foods: cached,
        totalMatches: cached.length,
        fromCache: true,
        isOffline: status.isOffline,
        isRateLimited: status.isRateLimited,
        errorMessage: status.errorMessage,
      };
    }
    return {
      foods: [],
      totalMatches: 0,
      fromCache: false,
      isOffline: status.isOffline,
      isRateLimited: status.isRateLimited,
      errorMessage: status.errorMessage,
    };
  };

  const params = new URLSearchParams({
    search_terms: clean,
    search_simple: '1',
    action: 'process',
    json: '1',
    page_size: String(pageSize),
    fields:
      'code,product_name,product_name_en,brands,nutriments,serving_size,serving_quantity,image_front_small_url',
  });

  const requestUrl = `${SEARCH_API_URL}?${params.toString()}`;

  let res: Response | null = null;

  // Attempt initial request with 8000ms timeout
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      res = await fetch(requestUrl, {
        method: 'GET',
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'application/json',
        },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    // Handle HTTP 429 Too Many Requests with backoff retry
    if (res.status === 429) {
      console.warn('[onlineFoodSearch] HTTP 429 Rate limited. Retrying after 1500ms backoff...');
      await delay(1500);

      const retryController = new AbortController();
      const retryTimeout = setTimeout(() => retryController.abort(), 8000);
      try {
        res = await fetch(requestUrl, {
          method: 'GET',
          headers: {
            'User-Agent': USER_AGENT,
            Accept: 'application/json',
          },
          signal: retryController.signal,
        });
      } finally {
        clearTimeout(retryTimeout);
      }
    }
  } catch (err: any) {
    console.warn(`[onlineFoodSearch] Network/Offline error: ${err.message}`);
    return fallbackToCache({
      isOffline: true,
      errorMessage: 'You are currently offline. Check your internet connection or browse the offline catalog.',
    });
  }

  // If still rate limited after retry
  if (res.status === 429) {
    return fallbackToCache({
      isRateLimited: true,
      errorMessage: 'Rate limit reached. Please wait a few seconds before searching again.',
    });
  }

  if (!res.ok) {
    console.warn(`[onlineFoodSearch] Open Food Facts returned status: ${res.status}`);
    return fallbackToCache({
      errorMessage: `Database returned status ${res.status}. Showing cached results if available.`,
    });
  }

  let data: any;
  try {
    data = await res.json();
  } catch (err) {
    console.warn('[onlineFoodSearch] Failed to parse JSON response:', err);
    return fallbackToCache({
      errorMessage: 'Failed to read response from food database.',
    });
  }

  const rawProducts: any[] = data.products || [];
  const normalizedFoods: FoodItem[] = [];

  for (const raw of rawProducts) {
    const name = raw.product_name || raw.product_name_en;
    if (!name || typeof name !== 'string' || !name.trim()) {
      continue;
    }

    const code = raw.code || `off_${Math.random().toString(36).slice(2, 10)}`;
    try {
      const item = normalizeOpenFoodFactsProduct(code, raw);
      if (item) {
        if (raw.image_front_small_url) {
          item.imageUrl = raw.image_front_small_url;
        }

        // Determine if nutrition data is incomplete
        const nutriments = raw.nutriments ?? {};
        const hasKcal = nutriments['energy-kcal_100g'] !== undefined || nutriments.energy_100g !== undefined;
        const hasProtein = nutriments.proteins_100g !== undefined;
        const hasCarbs = nutriments.carbohydrates_100g !== undefined;
        const hasFat = nutriments.fat_100g !== undefined;

        if (!hasKcal || (!hasProtein && !hasCarbs && !hasFat) || item.calories === 0) {
          item.isIncomplete = true;
          item.incompleteReason = 'Open Food Facts entry lacks full calorie or macronutrient values';
        }

        normalizedFoods.push(item);
      }
    } catch {
      // Skip unparseable products
    }
  }

  // Persist to local search cache
  if (normalizedFoods.length > 0) {
    await setCachedOnlineSearchResults(clean, normalizedFoods);
  }

  return {
    foods: normalizedFoods,
    totalMatches: Number(data.count) || normalizedFoods.length,
    fromCache: false,
    isOffline: false,
    isRateLimited: false,
  };
}

export const searchOnlineFood = searchOnlineFoodDatabase;
