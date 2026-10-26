import { useMemo } from 'react';
import { FoodItem, AppLanguage } from '../../types';
import { VERIFIED_FOOD_DATABASE, REGIONAL_FOODS } from '../../data/foodDatabase';
import { normalizeSearch } from '../../utils/localeUtils';

export type FoodFilter =
  | 'all'
  | 'recent'
  | 'frequent'
  | 'favorites'
  | 'templates'
  | 'regional'
  | 'custom'
  | 'scanned';

export interface FilterFoodCatalogOptions {
  searchQuery: string;
  foodFilter: FoodFilter;
  recentFoods: FoodItem[];
  frequentFoods: FoodItem[];
  favoriteFoods: FoodItem[];
  customFoods: FoodItem[];
  barcodeCache: FoodItem[];
  language?: AppLanguage;
  t: (key: string) => string;
}

/**
 * Pure function to filter and search food catalog items by query and active category filter.
 * Supports multilingual query normalization across English, Arabic, and Kurdish Sorani.
 */
export function filterFoodCatalog({
  searchQuery,
  foodFilter,
  recentFoods,
  frequentFoods,
  favoriteFoods,
  customFoods,
  barcodeCache,
  t,
}: FilterFoodCatalogOptions): FoodItem[] {
  let sourceList: FoodItem[] = [];
  if (foodFilter === 'recent') {
    sourceList = recentFoods;
  } else if (foodFilter === 'frequent') {
    sourceList = frequentFoods;
  } else if (foodFilter === 'favorites') {
    sourceList = favoriteFoods;
  } else if (foodFilter === 'custom') {
    sourceList = customFoods;
  } else if (foodFilter === 'regional') {
    sourceList = REGIONAL_FOODS;
  } else if (foodFilter === 'scanned') {
    sourceList = barcodeCache;
  } else {
    sourceList = [...customFoods, ...barcodeCache, ...VERIFIED_FOOD_DATABASE];
  }

  const normalizedQuery = normalizeSearch(searchQuery);
  if (!normalizedQuery) return sourceList;

  return sourceList.filter((f) => {
    const normName = normalizeSearch(f.name);
    const normNameAr = f.nameAr ? normalizeSearch(f.nameAr) : '';
    const normNameCkb = f.nameCkb ? normalizeSearch(f.nameCkb) : '';
    const normCategory = f.category ? normalizeSearch(f.category) : '';
    const normBrand = f.brand ? normalizeSearch(f.brand) : '';
    const normBarcode = f.barcode ? normalizeSearch(f.barcode) : '';
    const localizedName = normalizeSearch(t(f.name));
    return (
      normName.includes(normalizedQuery) ||
      normNameAr.includes(normalizedQuery) ||
      normNameCkb.includes(normalizedQuery) ||
      normCategory.includes(normalizedQuery) ||
      normBrand.includes(normalizedQuery) ||
      normBarcode.includes(normalizedQuery) ||
      localizedName.includes(normalizedQuery)
    );
  });
}

/**
 * Memoized hook wrapping `filterFoodCatalog`.
 */
export function useFoodSearch(options: FilterFoodCatalogOptions): FoodItem[] {
  const {
    searchQuery,
    foodFilter,
    recentFoods,
    frequentFoods,
    favoriteFoods,
    customFoods,
    barcodeCache,
    t,
  } = options;

  return useMemo(() => {
    return filterFoodCatalog({
      searchQuery,
      foodFilter,
      recentFoods,
      frequentFoods,
      favoriteFoods,
      customFoods,
      barcodeCache,
      t,
    });
  }, [
    searchQuery,
    foodFilter,
    recentFoods,
    frequentFoods,
    favoriteFoods,
    customFoods,
    barcodeCache,
    t,
  ]);
}
