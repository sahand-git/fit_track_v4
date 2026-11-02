# FitTrack v4 Nutrition Data Report (Phase 4)

**Date**: 2026-11-02  
**Scope**: Full dataset audit, verification, and expansion across `VERIFIED_FOOD_DATABASE` (380 items), `FOOD_NUTRIENT_PROFILES_DATA` (`src/data/nutrientProfilesData.ts`), and `useFoodSearch` engine.  
**Execution Principle**: No invented nutritional values. A nutrient with no verified source value is missing (`undefined`), NEVER 0. Verified against official USDA FoodData Central analytical datasets.

---

## 1. Executive Summary

Phase 4 completes the data verification, correction, and enrichment of FitTrack's nutrition catalog. The catalog has grown from 368 to **380 verified food items**, with full 24-nutrient coverage for all analytical whole foods and ingredients.

Key achievements:
1. **Official USDA Source Verification**: Downloaded and cross-referenced official USDA FoodData Central SR Legacy (April 2018 release, 7,793 analytical foods) and Foundation Foods (October 2024 release) archives directly.
2. **Shifted / Erroneous FDC ID Correction**: Detected and corrected **33 shifted or mismatched USDA FDC IDs** in the legacy catalog (e.g. fresh peach referencing canned papaya, mayonnaise referencing ice cream sandwich, whole wheat bread referencing rye bread, cooked spaghetti referencing raw flour, cooked salmon referencing raw wild salmon).
3. **Reconciled Regional & Branded Recipes**: Reclassified 34 composite and regional recipe foods from spurious USDA single-commodity IDs to `regional_culinary_estimate` or `generic_estimate`.
4. **24-Nutrient Profile Expansion**: Populated `src/data/nutrientProfilesData.ts` with compact per-100g nutrient profiles for all 380 items across all 24 USDA nutrients. Analytical foods have expanded from 9 nutrients to 24 nutrients.
5. **Zero vs Undefined Integrity**: Stripped placeholder zeros for unmeasured micronutrients across 17 non-USDA items. Unanalyzed nutrients are strictly `undefined`.
6. **Added Everyday Missing Foods**: Added 12 missing everyday staples (boiled, fried, and poached eggs with 1-egg portions, plain sesame tahini paste, Iraqi diamond samoon bread, boiled red lentils, boiled chickpeas, boiled potato with skin, traditional labneh, pomegranate molasses, za'atar blend, and Arabic cardamom coffee) with English, Arabic, and Kurdish Sorani names and aliases.
7. **Multi-Token & Alias Search**: Upgraded `useFoodSearch.ts` and `localeUtils.ts` to support multi-word token matching ("boiled egg" matches "Egg (hard-boiled)"), word order inversions, Arabic Taa Marbuta normalization (`ة` $\to$ `ه`), and alias querying.
8. **Automated Audit Suite**: Added 4 new automated quality checks to `auditFoodDatabase.ts`: `reused_fdc_id` with whitelist verification, `unit_sanity_error`, `implausible_nutrient_value`, and `unverified_zero_nutrient`.

---

## 2. Primary Data Sources Used

All nutritional data integrated into FitTrack v4 originates from authoritative, transparent sources:

1. **USDA FoodData Central SR Legacy (April 2018)**:
   - Contains 7,793 core agricultural commodities and minimally processed foods.
   - Provides analytical chemical assays for macronutrients, fatty acids, amino acids, all essential vitamins (A, C, D, E, K, B-complex), and minerals.
   - Official release from `fdc.nal.usda.gov`.
2. **USDA FoodData Central Foundation Foods (October 2024)**:
   - Modern comprehensive analytical dataset for foundational commodities with extensive sampling metadata.
3. **Manufacturer Nutrition Facts Labels (FDA 21 CFR 101.9)**:
   - Used exclusively for commercial branded packaged goods (e.g., Quest protein bars, Optimum Nutrition Gold Standard Whey, MusclePharm Combat Whey, commercial sodas).
   - Only nutrients stated on the manufacturer's regulatory label are entered; unstated minor micronutrients remain `undefined`.
4. **Regional Culinary Composite Formulations**:
   - Documented traditional recipes (e.g. Dolma, Biryani, Machboos, Koshari, Mansaf, Freekeh, Fattoush, Tabbouleh, Samoon, Tahin & Debs).
   - Calculated from quantified ingredient lists. If an ingredient lacks an assay for a minor nutrient, that nutrient remains `undefined` for the composite dish rather than guessed.

---

## 3. Micronutrient Coverage: Before vs After Phase 4

Comparison of nutrient coverage across all catalog items (368 foods in Phase 0 vs 380 foods in Phase 4). In Phase 4, the primary micronutrient registry resides in `FOOD_NUTRIENT_PROFILES_DATA` (`src/data/nutrientProfilesData.ts`), dynamically linked into logged meals and the RDA tracker.

| Nutrient | Unit | Phase 0 Coverage (368 foods) | Phase 4 Coverage (380 foods) | Absolute Change | Primary Sources |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Calories** | kcal | 368 (100.0%) | 380 (100.0%) | +12 foods | USDA / Manufacturer Labels / Recipes |
| **Protein** | g | 368 (100.0%) | 380 (100.0%) | +12 foods | USDA / Manufacturer Labels / Recipes |
| **Carbohydrates** | g | 368 (100.0%) | 380 (100.0%) | +12 foods | USDA / Manufacturer Labels / Recipes |
| **Fat** | g | 368 (100.0%) | 380 (100.0%) | +12 foods | USDA / Manufacturer Labels / Recipes |
| **Dietary Fiber** | g | 284 (77.2%) | 296 (77.9%) | +12 foods | USDA / Manufacturer Labels / Recipes |
| **Sodium** | mg | 246 (66.8%) | 322 (84.7%) | +76 foods | USDA FDC SR Legacy & Foundation |
| **Total Sugars** | g | 127 (34.5%) | 139 (36.6%) | +12 foods | USDA / Manufacturer Labels |
| **Calcium** | mg | 94 (25.5%) | 167 (43.9%) | +73 foods | USDA FDC SR Legacy (Nutrient #301) |
| **Iron** | mg | 94 (25.5%) | 167 (43.9%) | +73 foods | USDA FDC SR Legacy (Nutrient #303) |
| **Magnesium** | mg | 102 (27.7%) | 170 (44.7%) | +68 foods | USDA FDC SR Legacy (Nutrient #304) |
| **Phosphorus** | mg | 0 (0.0%) | 157 (41.3%) | **+157 foods** | USDA FDC SR Legacy (Nutrient #305) |
| **Potassium** | mg | 96 (26.1%) | 165 (43.4%) | +69 foods | USDA FDC SR Legacy (Nutrient #306) |
| **Zinc** | mg | 103 (28.0%) | 169 (44.5%) | +66 foods | USDA FDC SR Legacy (Nutrient #309) |
| **Copper** | mg | 0 (0.0%) | 156 (41.1%) | **+156 foods** | USDA FDC SR Legacy (Nutrient #312) |
| **Manganese** | mg | 0 (0.0%) | 154 (40.5%) | **+154 foods** | USDA FDC SR Legacy (Nutrient #315) |
| **Selenium** | mcg | 0 (0.0%) | 150 (39.5%) | **+150 foods** | USDA FDC SR Legacy (Nutrient #317) |
| **Vitamin A (RAE)** | mcg RAE | 102 (27.7%) | 163 (42.9%) | +61 foods | USDA FDC SR Legacy (Nutrient #320) |
| **Vitamin E (α-toc)**| mg | 0 (0.0%) | 140 (36.8%) | **+140 foods** | USDA FDC SR Legacy (Nutrient #323) |
| **Vitamin D** | mcg | 102 (27.7%) | 158 (41.6%) | +56 foods | USDA FDC SR Legacy (Nutrient #328) |
| **Vitamin C** | mg | 102 (27.7%) | 167 (43.9%) | +65 foods | USDA FDC SR Legacy (Nutrient #401) |
| **Thiamin (B1)** | mg | 0 (0.0%) | 156 (41.1%) | **+156 foods** | USDA FDC SR Legacy (Nutrient #404) |
| **Riboflavin (B2)** | mg | 0 (0.0%) | 157 (41.3%) | **+157 foods** | USDA FDC SR Legacy (Nutrient #405) |
| **Niacin (B3 / NE)**| mg NE | 0 (0.0%) | 156 (41.1%) | **+156 foods** | USDA FDC SR Legacy (Nutrient #406) |
| **Pantothenic Acid**| mg | 0 (0.0%) | 151 (39.7%) | **+151 foods** | USDA FDC SR Legacy (Nutrient #410) |
| **Vitamin B6** | mg | 0 (0.0%) | 156 (41.1%) | **+156 foods** | USDA FDC SR Legacy (Nutrient #415) |
| **Folate (DFE)** | mcg DFE | 0 (0.0%) | 153 (40.3%) | **+153 foods** | USDA FDC SR Legacy (Nutrient #435) |
| **Choline** | mg | 0 (0.0%) | 139 (36.6%) | **+139 foods** | USDA FDC SR Legacy (Nutrient #421) |
| **Vitamin B12** | mcg | 102 (27.7%) | 161 (42.4%) | +59 foods | USDA FDC SR Legacy (Nutrient #418) |
| **Vitamin K** | mcg | 0 (0.0%) | 140 (36.8%) | **+140 foods** | USDA FDC SR Legacy (Nutrient #430) |
| **Iodine** | mcg | 0 (0.0%) | 0 (0.0%) | 0 foods | Not assayed in SR Legacy; stays unknown |

---

## 4. Shifted & Erroneous USDA IDs Corrected

During the verification phase, 33 items had legacy sourceRefs referencing shifted, mismatched, or state-incompatible USDA FoodData Central records. These were verified against the official SR Legacy database and corrected:

| Food ID | Food Name | Old SourceRef | Actual USDA Item in Old ID | Corrected SourceRef / Action | Verified Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `food_spaghetti_cooked_plain` | Spaghetti (cooked, plain) | USDA FDC 168936 | Raw dry wheat flour (364 kcal) | **USDA FDC 168937** | Spaghetti, cooked, unenriched, without added salt (158 kcal) |
| `food_penne_cooked` | Penne Pasta (cooked) | USDA FDC 168936 | Raw dry wheat flour (364 kcal) | **USDA FDC 168937** | Spaghetti/penne cooked (158 kcal) |
| `food_elbow_macaroni_cooked` | Elbow Macaroni (cooked) | USDA FDC 168936 | Raw dry wheat flour (364 kcal) | **USDA FDC 168925** | Macaroni, cooked, unenriched, without added salt (158 kcal) |
| `food_chicken_breast_skinless` | Chicken Breast (Boneless, Skinless) | USDA FDC 171077 | Raw skinless chicken breast | **USDA FDC 171477** | Chicken, broiler or fryers, breast, meat only, cooked, roasted |
| `food_chicken_thigh_skinless` | Chicken Thigh (Skinless, Boneless) | USDA FDC 172389 | Chicken thigh with skin | **USDA FDC 171413** | Chicken, broilers or fryers, thigh, meat only, cooked, roasted |
| `food_ground_beef_85_15` | Ground Beef (85% Lean / 15% Fat) | USDA FDC 174032 | 80% lean raw ground beef | **USDA FDC 171705** | Beef, ground, 85% lean meat / 15% fat, patty, cooked, broiled |
| `food_salmon_cooked` | Salmon Fillet (Baked / Grilled) | USDA FDC 173686 | Raw wild Atlantic salmon | **USDA FDC 175168** | Fish, salmon, Atlantic, wild, cooked, dry heat |
| `food_egg_whites` | Liquid Egg Whites | USDA FDC 172183 | Whole fried egg (90 kcal) | **USDA FDC 172184** | Egg, white, raw, fresh (52 kcal) |
| `food_whole_wheat_bread` | Whole Wheat Bread | USDA FDC 172688 | Rye bread, toasted | **USDA FDC 167535** | Bread, whole-wheat, commercially prepared |
| `food_cornflakes_cereal` | Corn Flakes Cereal | USDA FDC 167644 | Candies, REESE'S Peanut Butter Cups | **USDA FDC 171661** | Cereals ready-to-eat, KELLOGG, KELLOGG'S CORN FLAKES |
| `food_mayonnaise_regular` | Mayonnaise (Regular) | USDA FDC 172230 | Ice cream sandwich | **USDA FDC 169414** | Salad dressing, mayonnaise, regular |
| `food_ketchup_tomato` | Tomato Ketchup | USDA FDC 170457 | Tomatoes, raw, unpeeled | **USDA FDC 170567** | Catsup |
| `food_peach_fresh_raw` | Fresh Peach | USDA FDC 169927 | Papayas, canned, light syrup | **USDA FDC 169928** | Peaches, yellow, raw |
| `food_spinach_raw` | Baby Spinach (Raw) | USDA FDC 170417 | Parsnips, raw | **USDA FDC 168462** | Spinach, raw |
| `food_greek_yogurt_0` | Nonfat Greek Yogurt (Plain) | USDA FDC 170903 | Whole milk strained yogurt | **USDA FDC 170894** | Yogurt, Greek, plain, nonfat |
| `food_hummus_traditional` | Traditional Hummus | USDA FDC 173757 | Boiled chickpeas (commodity) | **regional_culinary_estimate** | Documented chickpeas + tahini + olive oil culinary formula |
| `food_falafel_patty` | Falafel Patty (Fried) | USDA FDC 172421 | Boiled lentils | **regional_culinary_estimate** | Documented fava/chickpea patty culinary formula |
| `food_tahina_dip` | Tahini Sauce / Dip | USDA FDC 170188 | Pure sesame seed butter | **regional_culinary_estimate** | Documented tahini + lemon juice + water + garlic dip |
| `food_baba_ghanoush` | Baba Ghanoush (Moutabal) | USDA FDC 170393 | Raw eggplant | **regional_culinary_estimate** | Documented smoked eggplant + tahini formula |
| `food_biryani_chicken` | Chicken Biryani with Basmati | USDA FDC 171477 | Plain roasted chicken breast | **regional_culinary_estimate** | Documented spiced rice + chicken + ghee formula |
| `food_dolma_iraqi` | Iraqi Dolma (Stuffed Vegetables) | USDA FDC 170567 | Catsup | **regional_culinary_estimate** | Documented stuffed vine leaves/onions with spiced rice and lamb |

---

## 5. Added Missing Everyday Foods

12 everyday staples missing from the catalog (identified during the Phase 0 audit and user requirements) were added with English, Arabic, and Kurdish Sorani names, exact household portion sizes, comprehensive aliases, and verified source citations:

1. **Boiled Egg (Whole)** (`food_egg_boiled_whole`):
   - Portion: 1 large egg (50g) | 78 kcal | 6.3g Protein | 0.6g Carbs | 5.3g Fat
   - Source: USDA FDC 173424 ("Egg, whole, cooked, hard-boiled")
   - Aliases: "boiled egg", "hard boiled egg", "egg boiled", "بيض مسلوق", "بيض مسلوقه", "هێلکەی کوڵاو"
2. **Fried Egg (Whole)** (`food_egg_fried_whole`):
   - Portion: 1 large egg (46g) | 90 kcal | 6.3g Protein | 0.4g Carbs | 6.8g Fat
   - Source: USDA FDC 172183 ("Egg, whole, cooked, fried")
   - Aliases: "fried egg", "sunny side up", "egg fried", "بيض مقلي", "بيض عيون", "هێلکەی سوورکراوە"
3. **Poached Egg (Whole)** (`food_egg_poached_whole`):
   - Portion: 1 large egg (50g) | 72 kcal | 6.3g Protein | 0.4g Carbs | 4.7g Fat
   - Source: USDA FDC 173426 ("Egg, whole, cooked, poached")
   - Aliases: "poached egg", "egg poached", "بيض بوشيه", "هێلکەی پۆچد"
4. **Pure Sesame Tahini Paste** (`food_sesame_tahini_paste`):
   - Portion: 1 tbsp (15g) | 89 kcal | 2.6g Protein | 3.2g Carbs | 8.0g Fat
   - Source: USDA FDC 170188 ("Sesame butter, tahini, from roasted and toasted kernels")
   - Aliases: "tahini", "tahina", "raw tahini", "sesame paste", "rashi", "طحينة", "طحينيه", "راشي", "تەحین", "ڕاشی"
5. **Iraqi Samoon Bread** (`food_iraqi_samoon_bread`):
   - Portion: 1 diamond loaf (80g) | 216 kcal | 7.2g Protein | 43.2g Carbs | 1.6g Fat
   - Source: Traditional Iraqi bakery formulation standard
   - Aliases: "samoon", "iraqi bread", "diamond bread", "صمون", "صمون عراقي", "صمون حجري", "سەموون", "سەموونی عێراقی"
6. **Boiled Red Lentils** (`food_red_lentils_boiled`):
   - Portion: 1 cup (198g) | 230 kcal | 17.9g Protein | 39.9g Carbs | 0.8g Fat
   - Source: USDA FDC 172421 ("Lentils, mature seeds, cooked, boiled, without salt")
   - Aliases: "red lentils", "boiled lentils", "cooked lentils", "عدس أحمر", "عدس مسلوق", "نیسکی کوڵاو"
7. **Boiled Chickpeas** (`food_chickpeas_boiled`):
   - Portion: 1 cup (164g) | 269 kcal | 14.5g Protein | 45.0g Carbs | 4.2g Fat
   - Source: USDA FDC 173757 ("Chickpeas (garbanzo beans, bengal gram), mature seeds, cooked, boiled, without salt")
   - Aliases: "chickpeas", "boiled chickpeas", "garbanzo", "garbanzo beans", "حمص مسلوق", "لبلبي", "نۆک", "نۆکی کوڵاو"
8. **Boiled Potato with Skin** (`food_potato_boiled_skin`):
   - Portion: 1 medium (167g) | 145 kcal | 3.1g Protein | 33.6g Carbs | 0.2g Fat
   - Source: USDA FDC 170033 ("Potatoes, boiled, cooked in skin, flesh, without salt")
   - Aliases: "boiled potato", "potato boiled", "potatoes boiled", "بطاطس مسلوقة", "بتيتة مسلوقة", "پەتاتەی کوڵاو"
9. **Traditional Labneh (Strained Yogurt)** (`food_traditional_labneh`):
   - Portion: 2 tbsp (30g) | 29 kcal | 2.1g Protein | 1.8g Carbs | 1.5g Fat
   - Source: USDA FDC 170889 ("Yogurt, Greek, plain, whole milk")
   - Aliases: "labneh", "labna", "strained yogurt", "لبنة", "لبنة بلدية", "لەبنە"
10. **Pomegranate Molasses** (`food_pomegranate_molasses`):
    - Portion: 1 tbsp (20g) | 54 kcal | 0.0g Protein | 13.5g Carbs | 0.0g Fat
    - Source: Middle Eastern reduced pure pomegranate juice standard
    - Aliases: "pomegranate molasses", "dibs ruman", "pomegranate syrup", "دبس رمان", "دبس الرمان", "دۆشاوی هەنار"
11. **Za'atar Blend** (`food_zaatar_blend`):
    - Portion: 1 tbsp (10g) | 37 kcal | 1.1g Protein | 3.5g Carbs | 2.2g Fat
    - Source: Traditional thyme, toasted sesame, sumac, and salt blend
    - Aliases: "zaatar", "zatar", "za'atar", "thyme blend", "زعتر", "زعتر بلدي", "زەعفەران", "زەعتەر"
12. **Arabic Coffee with Cardamom** (`food_arabic_coffee_cardamom`):
    - Portion: 1 cup / finjan (100ml) | 2 kcal | 0.1g Protein | 0.3g Carbs | 0.0g Fat
    - Source: USDA FDC 171890 ("Beverages, coffee, brewed, prepared with tap water")
    - Aliases: "arabic coffee", "cardamom coffee", "qahwa", "gahwa", "قهوة عربية", "قهوة بالهيل", "قاوەی عەرەبی"

---

## 6. What Stays Incomplete & Why

FitTrack strictly adheres to the principle: **"NEVER invent nutrition values: a nutrient with no source value is missing (`undefined`), never 0."**

1. **Iodine (0% coverage)**:
   - Analytical iodine concentration is absent from the USDA SR Legacy database and FoodData Central analytical tables due to high agricultural soil variability and lack of standardized AOAC spectrophotometric assay data in legacy archives.
   - FitTrack leaves iodine as `undefined` across all foods. The RDA card displays "Not enough data" with the incomplete marker for iodine until user-supplemented or certified salt assays are available.
2. **Packaged & Commercial Branded Goods**:
   - Under FDA 21 CFR 101.9, manufacturers are only required to test and declare calories, total fat, saturated fat, trans fat, cholesterol, sodium, total carbs, dietary fiber, total sugars, added sugars, protein, vitamin D, calcium, iron, and potassium.
   - Minor B-vitamins (thiamin, riboflavin, niacin, B6, pantothenic acid), choline, trace minerals (copper, manganese, selenium), and vitamins E/K are legally omitted from manufacturer packaging. These fields remain `undefined` for branded items.
3. **Regional Composite Dishes**:
   - Complex multi-ingredient dishes (e.g. Biryani, Mansaf, Koshari, Dolma) provide verified composite calories and macronutrients based on standardized culinary ingredient formulations.
   - Minor trace minerals and fragile vitamins affected by thermal degradation during long boiling/baking are not analytically measured in commercial databases and are safely marked `undefined`.

---

## 7. Audit Rules & Verification Results

All automated audits and tests pass with 100% compliance:

- `npm test`: **60 test suites passing, 0 failures** (including `useFoodSearch.test.ts`, `auditFoodDatabase.test.ts`, `nutrientModel.test.ts`, `driTargets.test.ts`, `foodMigration.test.ts`).
- `npx tsc --noEmit`: **0 TypeScript errors**.
- `npx eslint . --max-warnings=0`: **0 ESLint errors and 0 warnings**.
- `npm run audit:foods`:
  - 380 total foods audited across 17 canonical categories.
  - 0 barcode errors (GS1 Modulo-10 check digits valid and unique).
  - 0 duplicate IDs or duplicate names.
  - 0 empty or non-canonical categories.
  - 0 prohibited placeholder brands.
  - 0 unwhitelisted reused FDC IDs.
  - 0 unit sanity violations (serving grams positive and $\le$ 5000g).
  - 0 implausible nutrient values exceeding physiological bounds.
  - 0 unverified placeholder zeros for unmeasured micronutrients.
  - 0 unreviewed macro-calorie discrepancies $> 12\%$.
- `scripts/scanHex.ts`: **0 raw color literals** outside `theme.ts`.
- `scripts/scanFontSize.ts`: **0 font sizes $\le 11\text{px}$**.
- `scripts/auditAccessibility.ts`: **0 accessibility violations**, 10/10 WCAG AA contrast pairs pass.
