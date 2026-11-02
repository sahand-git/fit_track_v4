# FitTrack v4 Food Database & Nutrition Audit (Phase 0)

**Date**: 2026-11-02  
**Scope**: Complete audit of `VERIFIED_FOOD_DATABASE` (368 food items across `dailyFoods.ts`, `popularFoods.ts`, `regionalFoods.ts`, `stapleFoods.ts`, `supplementaryFoods.ts`, and `foodDatabase.ts`), food search algorithms in `useFoodSearch.ts`, and normalization in `localeUtils.ts`.  
**Execution Principle**: No data changes in Phase 0. No fabricated or assumed nutritional values.

---

## 1. Executive Summary

FitTrack v4 contains **368 verified food catalog items** distributed across 17 nutritional categories. While core macronutrients (`calories`, `protein`, `carbs`, `fat`) maintain 100% database coverage, significant disparities exist in micronutrient density, household portion usability, catalog duplication, and search discovery:

1. **Micronutrient Coverage**:
   - The 6 vitamins and minerals added in recent updates (`vitaminA`, `vitaminC`, `vitaminD`, `vitaminB12`, `magnesium`, `zinc`) are populated across **102 to 103 items (27.7% - 28.0%)**.
   - Essential minerals (`calcium`, `iron`, `potassium`) are populated across only **94 to 96 items (25.5% - 26.1%)**.
   - `fiber` is present on **284 items (77.2%)**, `sodium` on **246 items (66.8%)**, and `sugar` on **127 items (34.5%)**.
   - The remaining **~265 foods** have `undefined` micronutrients, triggering "Not enough data" markers on the RDA tracker.
2. **Catalog Duplication**:
   - Multiple identical food items exist across different sub-catalogs with conflicting IDs, slightly differing macros, or redundant names (e.g. `pop_peanut_butter_creamy` vs `food_peanut_butter`, `pop_white_jasmine_rice` vs `food_white_rice`, `pop_red_apple` vs `food_apple`, `pop_greek_yogurt_nonfat` vs `food_greek_yogurt_0`).
3. **USDA Source ID (FDC ID) Reuses**:
   - 196 foods reference a `sourceRef`; 172 foods lack a `sourceRef`.
   - Several identical FDC IDs are reused across distinct food entries (e.g., `USDA FDC 168936` for spaghetti, penne, and macaroni; `USDA FDC 174266` for two duplicate peanut butter entries; `USDA FDC 172796` for hamburger and hotdog buns).
4. **Household Portions Usability**:
   - **66 foods (17.9%)** lack any intuitive household portion. In particular, all 40 `usda_sr28_*` entries in `dailyFoods.ts` strictly define `"100g edible portion"` without piece/cup/slice equivalents (e.g. Hard-boiled egg has no "1 egg / 50g", Pita bread has no "1 loaf / 60g").
5. **Search Deficiencies & Failing Queries**:
   - Common queries such as `"boiled egg"`, `"hard boiled egg"`, `"egg boiled"`, Arabic `"بيض مسلوق"`, and Kurdish `"هێلکەی کوڵاو"` return **0 results** despite `"Egg (hard-boiled)"` existing in the database.
   - Word order inversions (e.g., `"white rice"`, `"breast chicken"`, `"yogurt greek"`, `"oil olive"`) yield **0 results** due to strict substring matching.
   - **Plain 100% sesame tahini paste is completely missing** from the catalog (only composite items like Falafel wrap, Hummus, and Tahin & Debs exist).

---

## 2. Nutrient Coverage Breakdown

Audited across all 368 items in `VERIFIED_FOOD_DATABASE`:

| Nutrient | Canonical Unit | Populated Foods | Coverage % | Positive (>0) | Zero (==0) | Missing (`undefined`) | Status / Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Calories** | kcal | 368 / 368 | 100.0% | 366 | 2 | 0 | Diet Coke & Water are 0 kcal |
| **Protein** | g | 368 / 368 | 100.0% | 350 | 18 | 0 | Pure fats/sugars are 0g |
| **Carbohydrates** | g | 368 / 368 | 100.0% | 333 | 35 | 0 | Meats/oils are 0g |
| **Fat** | g | 368 / 368 | 100.0% | 347 | 21 | 0 | Pure carbs/proteins are 0g |
| **Dietary Fiber** | g | 284 / 368 | 77.2% | 221 | 63 | 84 | Missing on 84 items |
| **Sodium** | mg | 246 / 368 | 66.8% | 242 | 4 | 122 | Missing on 122 items |
| **Total Sugars** | g | 127 / 368 | 34.5% | 113 | 14 | 241 | Missing on 241 items |
| **Zinc** | mg | 103 / 368 | 28.0% | 102 | 1 | 265 | Populated in 103 items |
| **Vitamin A** | mcg RAE | 102 / 368 | 27.7% | 60 | 42 | 266 | Populated in 102 items |
| **Vitamin C** | mg | 102 / 368 | 27.7% | 50 | 52 | 266 | Populated in 102 items |
| **Vitamin D** | mcg | 102 / 368 | 27.7% | 36 | 66 | 266 | Populated in 102 items |
| **Vitamin B12** | mcg | 102 / 368 | 27.7% | 37 | 65 | 266 | Populated in 102 items |
| **Magnesium** | mg | 102 / 368 | 27.7% | 100 | 2 | 266 | Populated in 102 items |
| **Potassium** | mg | 96 / 368 | 26.1% | 96 | 0 | 272 | Legacy USDA SR28 items only |
| **Calcium** | mg | 94 / 368 | 25.5% | 93 | 1 | 274 | Legacy USDA SR28 items only |
| **Iron** | mg | 94 / 368 | 25.5% | 94 | 0 | 274 | Legacy USDA SR28 items only |

### Key Observations:
- **Zero vs Undefined Integrity**: In accordance with project standards, non-existent data is kept strictly as `undefined`. Zero values represent verified analytical zeros (e.g. 0 mcg Vitamin C in meat, 0 mcg Vitamin D in plain grain).
- **Enriched Subset Distribution**: The 102 enriched foods are located across:
  - `src/data/dailyFoods.ts`: 49 items
  - `src/data/foodDatabase.ts`: 29 items
  - `src/data/stapleFoods.ts`: 24 items
- **Unenriched Catalogs**: `src/data/popularFoods.ts` (89 items), `src/data/regionalFoods.ts` (31 items), and `src/data/supplementaryFoods.ts` (31 items) currently lack vitamin A, C, D, B12, magnesium, and zinc data.

---

## 3. Duplicate and Semantic Overlap Analysis

A scan of the 368 verified food entries revealed several duplicate or semantically overlapping items that clutter search results and lead to inconsistent user logs:

### Exact & Direct Duplicates:
1. **Creamy Peanut Butter**:
   - `pop_peanut_butter_creamy` ("Creamy Peanut Butter (2 tbsp)", 190 kcal, P: 8, C: 6, F: 16, serving: 2 tbsp / 32g, sourceRef: `USDA FDC 174266`) in `popularFoods.ts`.
   - `food_peanut_butter` ("Natural Creamy Peanut Butter", 190 kcal, P: 8, C: 6, F: 16, serving: 2 tablespoons / 32g, sourceRef: `USDA FDC 174266`) in `foodDatabase.ts`.
   - *Impact*: Identical food, identical source, duplicate entry.
2. **Fresh Red Apple**:
   - `pop_red_apple` ("Fresh Red Apple (Medium)", 95 kcal, P: 0.5, C: 25, F: 0.3, serving: 1 medium apple / 180g) in `popularFoods.ts`.
   - `food_apple` ("Red Delicious Apple", 95 kcal, P: 0.5, C: 25, F: 0.3, serving: 1 medium / 182g, sourceRef: `USDA FDC 171688`) in `foodDatabase.ts`.
   - *Impact*: Redundant entries for a standard medium red apple.
3. **Plain Nonfat Greek Yogurt**:
   - `pop_greek_yogurt_nonfat` ("Plain Greek Yogurt (0% Nonfat)", 100 kcal, P: 17.5, C: 6, F: 0.5, serving: 1 cup / 170g) in `popularFoods.ts`.
   - `food_greek_yogurt_0` ("Greek Yogurt 0% Fat Plain", 100 kcal, P: 18, C: 6, F: 0, serving: 1 cup / 170g, sourceRef: `USDA FDC 170903`) in `foodDatabase.ts`.
   - *Impact*: Conflicting macros for the same standard nonfat Greek yogurt serving.
4. **Steamed / Cooked White Rice**:
   - `pop_white_jasmine_rice` ("Cooked White Jasmine / Basmati Rice", 210 kcal, P: 4.4, C: 45, F: 0.5, serving: 1 cup cooked / 160g) in `popularFoods.ts`.
   - `food_white_rice` ("Steamed White Basmati Rice", 205 kcal, P: 4.2, C: 45, F: 0.4, serving: 1 cup cooked / 158g, sourceRef: `USDA FDC 168878`) in `foodDatabase.ts`.
   - `usda_sr28_20045` ("White long-grain rice (cooked)", 130 kcal, P: 2.69, C: 28.17, F: 0.28, serving: 100g edible portion) in `dailyFoods.ts`.
   - *Impact*: 3 separate entries for plain cooked white rice, confusing users searching "white rice".
5. **Whole Eggs**:
   - `food_eggs_large` ("Whole Large Egg", 72 kcal, P: 6.3, C: 0.4, F: 4.8, serving: 1 large egg / 50g) in `foodDatabase.ts`.
   - `usda_sr28_01129` ("Egg (hard-boiled)", 155 kcal / 100g) in `dailyFoods.ts`.
   - `usda_sr28_01128` ("Egg (fried)", 196 kcal / 100g) in `dailyFoods.ts`.
   - `usda_sr28_01131` ("Egg (poached)", 143 kcal / 100g) in `dailyFoods.ts`.

---

## 4. USDA Source ID (`sourceRef`) Reuse Analysis

Of 368 verified food items, **196 items contain a `sourceRef`** and **172 items have no `sourceRef`**. An analysis of the existing reference keys identified the following instances of shared references:

1. **`USDA FDC 174266`** (Peanut butter, smooth style, without salt):
   - Reused by `pop_peanut_butter_creamy` and `food_peanut_butter`.
   - *Assessment*: Directly represents a duplicate database entry.
2. **`USDA FDC 168936`** (Pasta, cooked, unenriched, without added salt):
   - Reused across 3 distinct food entries:
     - `food_spaghetti_cooked_plain` ("Spaghetti Pasta (cooked plain)", 221 kcal)
     - `food_penne_cooked_plain` ("Penne Pasta (cooked plain)", 221 kcal)
     - `food_macaroni_cooked_plain` ("Elbow Macaroni (cooked plain)", 221 kcal)
   - *Assessment*: Legitimate chemical reuse (USDA SR Legacy treats plain pasta shapes as nutritionally identical per 100g), but separate food entries exist for user convenience.
3. **`USDA FDC 172796`** (Rolls, hamburger or hotdog, plain):
   - Reused across 2 distinct food entries:
     - `food_hamburger_bun_plain` ("Classic White Hamburger Bun", 148 kcal, 53g)
     - `food_hot_dog_bun_plain` ("Classic Soft Hot Dog Bun", 126 kcal, 45g)
   - *Assessment*: Legitimate USDA shared entry with different discrete gram weights.
4. **Manufacturer Brand Labels**:
   - `label: The Coca-Cola Company` is shared across `pop_coca_cola_zero`, `pop_sprite_lemon_lime`, and `pop_fanta_orange`.
   - `label: PepsiCo` is shared across `pop_pepsi_max_zero` and `pop_7up_lemon_lime`.
   - *Assessment*: Shared brand source string rather than specific USDA FDC reference.

---

## 5. Household Portions Analysis

### Portion Metadata Statistics:
- **Foods with `portionUnit` defined**: 244 / 368 (**66.3%**)
  - Distribution: `piece` (104), `serving` (35), `bowl` (33), `glass` (30), `plate` (25), `spoon` (14), `samoon` (3).
- **Foods with `variants` defined**: 91 / 368 (**24.7%**)
- **Foods with generic weight only (no household measure)**: 66 / 368 (**17.9%**)

### Critical Household Portion Deficits:
All 40 foods prefixed with `usda_sr28_*` in `src/data/dailyFoods.ts` define `servingSize: "100g edible portion"` and have `portionUnit: undefined` and `variants: undefined`. This forces users to calculate gram weights manually for common discrete foods:

| Food ID | Food Name | Current Serving | Suggested Household Portion | Suggested Grams |
| :--- | :--- | :--- | :--- | :--- |
| `usda_sr28_01129` | Egg (hard-boiled) | 100g edible portion | 1 large egg (piece) | 50g |
| `usda_sr28_01128` | Egg (fried) | 100g edible portion | 1 large egg (piece) | 50g |
| `usda_sr28_01131` | Egg (poached) | 100g edible portion | 1 large egg (piece) | 50g |
| `usda_sr28_18041` | White pita bread | 100g edible portion | 1 pocket loaf (piece) | 60g |
| `usda_sr28_18042` | Whole-wheat pita bread | 100g edible portion | 1 pocket loaf (piece) | 64g |
| `usda_sr28_11367` | Potato, peeled (boiled) | 100g edible portion | 1 medium potato (piece) | 150g |
| `usda_sr28_15262` | Tilapia fish (cooked) | 100g edible portion | 1 fillet (piece) | 130g |
| `usda_sr28_15192` | Pacific cod (cooked) | 100g edible portion | 1 fillet (piece) | 150g |
| `usda_sr28_15151` | Shrimp (cooked) | 100g edible portion | 6 large shrimp (serving) | 85g |
| `usda_sr28_16070` | Lentils (boiled) | 100g edible portion | 1 cup cooked (bowl) | 198g |
| `usda_sr28_16057` | Chickpeas (boiled) | 100g edible portion | 1 cup cooked (bowl) | 164g |
| `usda_sr28_16033` | Red kidney beans (boiled) | 100g edible portion | 1 cup cooked (bowl) | 177g |
| `usda_sr28_20045` | White long-grain rice (cooked) | 100g edible portion | 1 cup cooked (bowl) | 158g |
| `usda_sr28_20013` | Bulgur (cooked) | 100g edible portion | 1 cup cooked (bowl) | 182g |
| `usda_sr28_20029` | Couscous (cooked) | 100g edible portion | 1 cup cooked (bowl) | 157g |
| `usda_sr28_01009` | Cheddar cheese | 100g edible portion | 1 slice (piece) | 28g |
| `usda_sr28_01019` | Feta cheese | 100g edible portion | 1 oz crumbled (serving) | 28g |
| `usda_sr28_01077` | Whole milk, 3.25% fat | 100g edible portion | 1 glass / cup (glass) | 244g (240ml) |
| `usda_sr28_01116` | Plain whole-milk yogurt | 100g edible portion | 1 cup / bowl (bowl) | 245g |
| `usda_sr28_01117` | Plain low-fat yogurt | 100g edible portion | 1 cup / bowl (bowl) | 245g |
| `usda_sr28_23568` | Beef burger, 85% lean (broiled) | 100g edible portion | 1 patty (piece) | 85g |
| `usda_sr28_13451` | Beef sirloin steak (broiled) | 100g edible portion | 1 steak (piece) | 220g |
| `usda_sr28_05098` | Chicken thigh, skinless (roasted) | 100g edible portion | 1 thigh (piece) | 90g |
| `usda_sr28_19335` | White granulated sugar | 100g edible portion | 1 tsp (spoon) / 1 tbsp | 4g / 12g |

---

## 6. Failing Searches & Root-Cause Analysis

Testing user queries against `filterFoodCatalog`:

| Search Query | Lang | Expected Match | Actual Results | Root Cause |
| :--- | :--- | :--- | :--- | :--- |
| `"boiled egg"` | EN | `usda_sr28_01129` ("Egg (hard-boiled)") | **0 results** | Strict substring mismatch: `"egg hard boiled"` does not contain substring `"boiled egg"`. |
| `"hard boiled egg"` | EN | `usda_sr28_01129` ("Egg (hard-boiled)") | **0 results** | Inverted word order: `"egg"` precedes `"hard-boiled"` in the catalog name. |
| `"egg boiled"` | EN | `usda_sr28_01129` ("Egg (hard-boiled)") | **0 results** | Word `"hard"` sits between `"egg"` and `"boiled"`. |
| `"egg"` | EN | Multiple eggs | **38 results** | Matches because `"egg"` is a single substring, but includes unrelated dishes (e.g. Shakshuka, Ramen, Eggplant). |
| `"hard-boiled"` | EN | `usda_sr28_01129` ("Egg (hard-boiled)") | **1 result** | Exact hyphenated substring match. Users rarely type hyphens. |
| `"بيض مسلوق"` | AR | `usda_sr28_01129` ("بيضة مسلوقة جيداً") | **0 results** | Lack of Taa Marbuta (`ة`) normalization and token search: `"بيض"` does not match `"بيضة"`, and `"مسلوق"` does not match `"مسلوقة"`. |
| `"بيض"` | AR | Egg items | **23 results** | Matches `"بيض"`, but fails to match items with `"بيضة"`. |
| `"هێلکەی کوڵاو"` | CKB | `usda_sr28_01129` ("هێلکەی تەواو کوڵاو") | **0 results** | The catalog entry contains the word `"تەواو"` between `"هێلکەی"` and `"کوڵاو"`. |
| `"tahini"` | EN | Pure sesame tahini paste | **2 results** (Falafel Wrap, Hummus) | **Plain Tahini is missing from the database entirely.** |
| `"tahina"` | EN | Pure sesame tahini paste | **0 results** | Missing food item and no phonetic alias. |
| `"طحينة"` | AR | Pure sesame tahini paste | **4 results** (Tahin & Debs, Falafel, Hummus) | Plain Tahini is missing. |
| `"طحينية"` | AR | Pure sesame tahini paste | **0 results** | Missing food item and dialect spelling variant. |
| `"white rice"` | EN | Cooked white basmati/jasmine | **0 results** | Words separated in all entries: `"Cooked White Jasmine / Basmati Rice"`, `"Steamed White Basmati Rice"`. |
| `"breast chicken"` | EN | Grilled Chicken Breast | **0 results** | Inverted word order. |
| `"yogurt greek"` | EN | Plain Greek Yogurt | **0 results** | Inverted word order. |
| `"oil olive"` | EN | Extra Virgin Olive Oil | **0 results** | Inverted word order. |
| `"sweet potato"` | EN | Baked Sweet Potato | **2 results** | Matches only where contiguous `"sweet potato"` exists. |
| `"potato sweet"` | EN | Baked Sweet Potato | **0 results** | Inverted word order. |
| `"butter peanut"` | EN | Creamy Peanut Butter | **0 results** | Inverted word order. |

### Technical Architecture Flaws:
1. **Unbroken Substring Search in `filterFoodCatalog`**:
   [`src/components/addfood/useFoodSearch.ts`](file:///c:/Users/Lenovo/Downloads/Fittrack%20v4/src/components/addfood/useFoodSearch.ts#L83-L90) checks `normName.includes(normalizedQuery)`. It does not tokenize queries into individual words (`query.split(/\s+/)`). Any difference in word order or intervening words immediately causes a total search failure.
2. **Arabic Dialect / Morphological Normalization Gaps**:
   [`src/utils/localeUtils.ts`](file:///c:/Users/Lenovo/Downloads/Fittrack%20v4/src/utils/localeUtils.ts#L6-L18) does not normalize Taa Marbuta (`ة` vs `ه` vs stem) or handle prefixes like `ال-` (definite article).
3. **Absence of Food Search Aliases / Keywords**:
   `FoodItem` has no `aliases?: string[]` or `searchKeywords?: string[]` field, preventing common search phrases (e.g., `"boiled egg"`, `"hard boiled egg"`, `"hard-boiled egg"`, `"rashi"`, `"tahina"`) from indexing to their canonical entries.
4. **Missing Fundamental Middle Eastern Staple**:
   Plain 100% roasted sesame seed tahini paste (`طحينة صافية / راشي`) is missing despite being an everyday staple in Iraq, the Levant, and the Middle East.

---

## 7. Actionable Recommendations for Subsequent Phases

1. **Search Normalization & Multi-Word Token Matching**:
   - Update `useFoodSearch.ts` / `filterFoodCatalog` to perform **token-based search** (`tokens.every(t => itemFields.some(f => f.includes(t)))`).
   - Support inverted word queries (`"white rice"`, `"boiled egg"`, `"breast chicken"`).
   - Normalize Arabic Taa Marbuta (`ة` $\leftrightarrow$ `ه`) in `normalizeSearch`.
2. **Catalog Cleanup & Deduplication**:
   - Merge duplicate peanut butters (`pop_peanut_butter_creamy` into `food_peanut_butter`).
   - Harmonize multiple plain cooked white rice entries and plain Greek yogurts.
   - Add missing plain Sesame Tahini paste (100% sesame seeds, FDC 170188).
3. **Household Portions Enrichment**:
   - Add discrete household servings (`portionUnit`, `servingSize`, `variants`) to the 40 `usda_sr28_*` foods (e.g. 1 egg = 50g, 1 pita = 60g, 1 cup cooked rice = 158g).
4. **USDA Micronutrient Population**:
   - Enrich remaining 265 food entries with verified USDA FDC data (Vitamin A, C, D, B12, Calcium, Iron, Potassium, Magnesium, Zinc).
   - Maintain the principle that missing values remain `undefined` (never assumed or defaulted to 0).
