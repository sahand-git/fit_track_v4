import { FoodItem } from '../types';
import { normalizeOpenFoodFactsProduct } from './barcodeService';

const SEARCH_API_URL = 'https://world.openfoodfacts.org/cgi/search.pl';
const USER_AGENT = 'FitTrack-Expo-App/4.0 (https://github.com/sahand-git/fit_track_v4)';

export interface OnlineSearchResult {
  foods: FoodItem[];
  totalMatches: number;
}

/**
 * Searches the OpenFoodFacts global food database when local results are insufficient.
 * Does not require an API key and provides nutrition facts for millions of packaged & branded products.
 */
export async function searchOnlineFoodDatabase(
  query: string,
  pageSize = 15
): Promise<FoodItem[]> {
  const clean = query.trim();
  if (clean.length < 2) {
    return [];
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const params = new URLSearchParams({
      search_terms: clean,
      search_simple: '1',
      action: 'process',
      json: '1',
      page_size: String(pageSize),
      fields:
        'code,product_name,product_name_en,brands,nutriments,serving_size,serving_quantity,image_front_small_url',
    });

    const res = await fetch(`${SEARCH_API_URL}?${params.toString()}`, {
      method: 'GET',
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/json',
      },
      signal: controller.signal,
    });

    if (!res.ok) {
      console.warn(`[onlineFoodSearch] Failed with status: ${res.status}`);
      return [];
    }

    const data = await res.json();
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
        if (item && item.calories > 0) {
          if (raw.image_front_small_url) {
            item.imageUrl = raw.image_front_small_url;
          }
          normalizedFoods.push(item);
        }
      } catch {
        // Skip unparseable products
      }
    }

    return normalizedFoods;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      console.warn('[onlineFoodSearch] Request timed out.');
    } else {
      console.warn('[onlineFoodSearch] Network error:', err.message);
    }
    return [];
  } finally {
    clearTimeout(timeoutId);
  }
}
