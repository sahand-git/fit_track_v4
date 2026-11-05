import { useMemo } from 'react';
import { FoodItem, AppLanguage } from '../../types';
import { VERIFIED_FOOD_DATABASE, REGIONAL_FOODS } from '../../data/foodDatabase';
import { foodCategory } from '../../utils/foodCategories';
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
  selectedCategory?: string | null;
  recentFoods: FoodItem[];
  frequentFoods: FoodItem[];
  favoriteFoods: FoodItem[];
  customFoods: FoodItem[];
  barcodeCache: FoodItem[];
  language?: AppLanguage;
  t: (key: string) => string;
}

/**
 * Computes a relevance score for a food item against a normalized search query.
 * Higher score indicates higher relevance. Returns 0 if item does not match.
 *
 * Scoring priority:
 * 1. Exact name / translation match (+20,000)
 * 2. Name starts with query as whole word/phrase (e.g. "Egg (hard-boiled)") (+10,000)
 * 3. Word in name equals query or plural (e.g. "Whole Egg", "Scrambled Eggs") (+5,000 - +8,000)
 * 4. Word in name starts with query (e.g. "Eggplant") (+600 - +1,500)
 * 5. Composite dishes with query as minor ingredient (+200 - +2,500)
 * 6. Aliases, brand, barcode matches
 * 7. Brevity bonus to prioritize direct food items over complex multi-ingredient recipes
 */
export function calculateFoodRelevanceScore(
  f: FoodItem,
  normalizedQuery: string,
  queryTokens: string[],
  t: (key: string) => string
): number {
  const q = normalizedQuery;
  const name = normalizeSearch(f.name);
  const localizedName = normalizeSearch(t(f.name));
  const arName = f.nameAr ? normalizeSearch(f.nameAr) : '';
  const ckbName = f.nameCkb ? normalizeSearch(f.nameCkb) : '';
  const cat = f.category ? normalizeSearch(f.category) : '';
  const brand = f.brand ? normalizeSearch(f.brand) : '';
  const barcode = f.barcode ? normalizeSearch(f.barcode) : '';
  const aliases = (f.aliases || []).map((a) => normalizeSearch(a));

  // Determine if item has any matching property
  const isNameMatch = name.includes(q) || (localizedName && localizedName.includes(q));
  const isAltLangMatch = (arName && arName.includes(q)) || (ckbName && ckbName.includes(q));
  const isAliasMatch = aliases.some((a) => a.includes(q));
  const isBrandMatch = Boolean(brand && brand.includes(q));
  const isBarcodeMatch = Boolean(barcode && barcode.includes(q));

  // Multi-token match across name, translation, aliases, brand
  const allTokensMatch =
    queryTokens.length > 1 &&
    queryTokens.every(
      (tok) =>
        name.includes(tok) ||
        localizedName.includes(tok) ||
        arName.includes(tok) ||
        ckbName.includes(tok) ||
        brand.includes(tok) ||
        aliases.some((a) => a.includes(tok))
    );

  // Category token match: only matches if the query has at least 3 characters and explicitly matches category words
  const isCategoryMatch = Boolean(cat && q.length >= 3 && cat.includes(q));

  if (!isNameMatch && !isAltLangMatch && !isAliasMatch && !isBrandMatch && !isBarcodeMatch && !allTokensMatch && !isCategoryMatch) {
    return 0;
  }

  // Base score for any verified match so penalties cannot make it non-positive
  let score = 1000;

  // 1. Exact matches (highest priority)
  if (name === q || localizedName === q) {
    score += 20000;
  } else if (arName === q || ckbName === q) {
    score += 18000;
  } else if (aliases.some((a) => a === q)) {
    score += 15000;
  } else if (barcode === q) {
    score += 25000;
  }

  const words = name.split(/[\s,()\-./]+/).filter(Boolean);

  // 2. Name starts with exact query as word/phrase (e.g. "Egg (hard-boiled)", "Egg, whole")
  if (name.startsWith(q + ' ') || name.startsWith(q + '(') || name.startsWith(q + ',')) {
    score += 10000;
  } else if (localizedName && (localizedName.startsWith(q + ' ') || localizedName.startsWith(q + '('))) {
    score += 9500;
  } else if (name.startsWith(q)) {
    // Prefix of the first word (e.g. "Eggs" vs "Eggplant")
    if (words[0] === q || words[0] === q + 's' || words[0] === q + 'es') {
      score += 9000;
    } else {
      score += 1500;
    }
  }

  // 3. Word boundary / whole word matches inside name (e.g. "Whole Egg", "Boiled Egg")
  const isTargetWord = (w: string) =>
    w === q ||
    w === q + 's' ||
    w === q + 'es' ||
    (q.endsWith('s') && w === q.slice(0, -1)) ||
    (q.endsWith('es') && w === q.slice(0, -2));

  let matchedWordIndex = -1;
  for (let i = 0; i < words.length; i++) {
    if (isTargetWord(words[i])) {
      matchedWordIndex = i;
      break;
    }
  }

  if (matchedWordIndex !== -1) {
    if (matchedWordIndex === 0) {
      score += 8000; // "Egg White", "Eggs Scrambled"
    } else if (matchedWordIndex === 1) {
      score += 6500; // "Boiled Egg", "Whole Egg"
    } else if (matchedWordIndex === 2) {
      score += 5000; // "Whole Boiled Egg", "Large Poached Egg"
    } else {
      score += 2500; // Later in dish name: "Ramen with Egg"
    }
  } else if (words.some((w) => w.startsWith(q))) {
    // Word starts with q, but is a different word (e.g. "Eggplant")
    score += 600;
  } else if (name.includes(q)) {
    score += 200;
  }

  // 4. Multilingual name matching (Arabic & Kurdish)
  if (arName) {
    if (arName.startsWith(q + ' ') || arName.startsWith(q)) {
      score += 8000;
    } else if (arName.includes(q)) {
      score += 5000;
    }
  }
  if (ckbName) {
    if (ckbName.startsWith(q + ' ') || ckbName.startsWith(q)) {
      score += 8000;
    } else if (ckbName.includes(q)) {
      score += 5000;
    }
  }

  // 5. Category affinity boost (for items that also match name/alias, or explicit category searches)
  if (cat.includes(q)) {
    if (isNameMatch || isAliasMatch) {
      score += 1000;
    } else {
      score += 200;
    }
  }

  // 6. Aliases boost
  for (const alias of aliases) {
    if (alias === q || alias.startsWith(q + ' ') || alias.includes(' ' + q + ' ') || alias.endsWith(' ' + q)) {
      score += 4000;
      break;
    } else if (alias.includes(q)) {
      score += 1500;
      break;
    }
  }

  // 7. Brand boost
  if (brand) {
    if (brand === q || brand.startsWith(q)) {
      score += 3000;
    } else if (brand.includes(q)) {
      score += 1500;
    }
  }

  // 8. Barcode substring
  if (barcode && barcode.includes(q)) {
    score += 5000;
  }

  // 9. Multi-token match
  if (queryTokens.length > 1 && allTokensMatch) {
    score += 4000;
  }

  // 10. Brevity bonus to favor direct foods over long composite recipes
  score -= Math.min(name.length, 50);

  return Math.max(score, 1);
}

/**
 * Pure function to filter and search food catalog items by query and active category filter.
 * Supports multilingual query normalization across English, Arabic, and Kurdish Sorani.
 * Results are relevance-ranked with exact and primary matches prioritized over composite dishes.
 */
export function filterFoodCatalog({
  searchQuery,
  foodFilter,
  selectedCategory,
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

  if (selectedCategory && selectedCategory !== 'all') {
    sourceList = sourceList.filter((f) => {
      const cat = foodCategory(f).toLowerCase();
      const explicitCat = (f.category || '').toLowerCase();
      const target = selectedCategory.toLowerCase();
      return cat === target || explicitCat === target;
    });
  }

  const normalizedQuery = normalizeSearch(searchQuery);
  if (!normalizedQuery) return sourceList;

  const queryTokens = normalizedQuery.split(' ').filter(Boolean);

  // Compute relevance score for each food and sort by score descending
  const scoredItems: { item: FoodItem; score: number }[] = [];

  for (let i = 0; i < sourceList.length; i++) {
    const f = sourceList[i];
    const score = calculateFoodRelevanceScore(f, normalizedQuery, queryTokens, t);
    if (score > 0) {
      scoredItems.push({ item: f, score });
    }
  }

  // Sort descending by score; tie-break by shorter name length
  scoredItems.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return a.item.name.length - b.item.name.length;
  });

  return scoredItems.map((s) => s.item);
}

/**
 * Memoized hook wrapping `filterFoodCatalog`.
 */
export function useFoodSearch(options: FilterFoodCatalogOptions): FoodItem[] {
  const {
    searchQuery,
    foodFilter,
    selectedCategory,
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
      selectedCategory,
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
    selectedCategory,
    recentFoods,
    frequentFoods,
    favoriteFoods,
    customFoods,
    barcodeCache,
    t,
  ]);
}
