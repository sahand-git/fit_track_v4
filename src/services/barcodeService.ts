import { FoodItem } from '../types';
import { VERIFIED_FOOD_DATABASE } from '../data/foodDatabase';
import { getBarcodeCacheItem, upsertBarcodeCacheItem } from '../storage/storage';

const OFF_FIELDS = 'product_name,product_name_en,brands,nutriments,serving_size,serving_quantity,serving_quantity_unit';

function parseNumber(value: unknown): number | undefined {
  if (typeof value !== 'number' && typeof value !== 'string') return undefined;
  if (typeof value === 'string' && !value.trim()) return undefined;
  const num = Number(value);
  return Number.isFinite(num) && num >= 0 ? num : undefined;
}

function parseString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function roundVal(value: number): number {
  return Math.round(value * 10) / 10;
}

export function normalizeOpenFoodFactsProduct(barcode: string, product: Record<string, any>): FoodItem {
  const nutriments = product.nutriments ?? {};
  const energyKj = parseNumber(nutriments.energy_100g);
  const calories100g = parseNumber(nutriments['energy-kcal_100g']) ?? (energyKj ? energyKj / 4.184 : undefined);
  const protein100g = parseNumber(nutriments.proteins_100g) ?? 0;
  const carbs100g = parseNumber(nutriments.carbohydrates_100g) ?? 0;
  const fat100g = parseNumber(nutriments.fat_100g) ?? 0;

  const productName = parseString(product.product_name) || parseString(product.product_name_en) || 'Scanned Food Product';
  const brandName = parseString(product.brands);

  const servingLabel = parseString(product.serving_size);
  const metricMatch = servingLabel.match(/(\d+(?:[.,]\d+)?)\s*(g|ml)\b/i);
  const servingGrams = parseNumber(product.serving_quantity) ?? (metricMatch ? parseNumber(metricMatch[1].replace(',', '.')) : undefined) ?? 100;
  const servingSize = servingLabel || `${servingGrams}g`;

  const scale = (val: number | undefined) => val !== undefined ? roundVal((val * servingGrams) / 100) : 0;

  const effectiveKcal100g = calories100g ?? (protein100g * 4 + carbs100g * 4 + fat100g * 9);

  return {
    id: `barcode_${barcode}`,
    name: productName,
    brand: brandName || undefined,
    barcode,
    servingSize,
    servingGrams: Math.round(servingGrams),
    calories: Math.round(scale(effectiveKcal100g)),
    protein: scale(protein100g),
    carbs: scale(carbs100g),
    fat: scale(fat100g),
    fiber: scale(parseNumber(nutriments.fiber_100g)),
    sugar: scale(parseNumber(nutriments.sugars_100g)),
    sodium: scale(parseNumber(nutriments.sodium_100g) ? parseNumber(nutriments.sodium_100g)! * 1000 : undefined),
    category: 'Packaged Food',
    source: 'open_food_facts',
  };
}

export async function lookupBarcodeWithFallbacks(rawCode: string): Promise<FoodItem> {
  const code = rawCode.trim().replace(/[\s-]/g, '');
  if (!/^\d{6,14}$/.test(code)) {
    throw new Error('Please enter a valid 8 to 14 digit barcode number.');
  }

  // 1. First check local verified offline database
  const localMatch = VERIFIED_FOOD_DATABASE.find(f => f.barcode === code || f.id === code);
  if (localMatch) {
    return { ...localMatch, source: localMatch.source ?? 'verified_database' };
  }

  // 2. Check offline barcode cache on device
  try {
    const cached = await getBarcodeCacheItem(code);
    if (cached) {
      return { ...cached, source: cached.source ?? 'open_food_facts' };
    }
  } catch (cacheErr) {
    console.warn('Barcode cache lookup error:', cacheErr);
  }

  // 3. Query free Open Food Facts REST endpoint
  const url = `https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=${OFF_FIELDS}`;
  let res: Response;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);
    res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'FitTrackMobile/1.0',
      },
    });
    clearTimeout(timeout);
  } catch {
    // If network fails (offline), check if partial match exists in barcode cache
    const cachedAgain = await getBarcodeCacheItem(code);
    if (cachedAgain) {
      return cachedAgain;
    }
    throw new Error('Could not reach food database. Check your internet connection or enter food details manually.');
  }

  if (res.status === 404) {
    throw new Error(`Product ${code} was not found in Open Food Facts. You can search by name or add custom food.`);
  }

  if (!res.ok) {
    throw new Error(`Database service returned code ${res.status}. Please try again shortly.`);
  }

  let data: any;
  try {
    data = await res.json();
  } catch {
    throw new Error('Received an unreadable response from the food database.');
  }

  if (!data?.product || data.status === 0) {
    throw new Error(`Barcode ${code} not found in the global database. You can search the local database by name.`);
  }

  const normalized = normalizeOpenFoodFactsProduct(code, data.product);

  // 4. Save to device offline barcode cache
  try {
    await upsertBarcodeCacheItem(normalized);
  } catch (saveErr) {
    console.warn('Failed to save product to barcode cache:', saveErr);
  }

  return normalized;
}
