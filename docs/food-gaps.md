# FitTrack Food Database Integrity & Gap Analysis

## 1. Verified Common Fruits (USDA FoodData Central / SR28)

The following five common fruits are grounded strictly in the USDA National Nutrient Database for Standard Reference (SR28) and FoodData Central (FDC):

| Food Item | USDA Identifier | Reference Serving | Energy (kcal) | Protein (g) | Total Fat (g) | Net Carbs (g) | Dietary Fiber (g) | Total Sugars (g) | Sodium (mg) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Red Delicious Apple** (`food_apple`) | NDB 09003 · FDC 171688 | 1 medium (182g) | 95 | 0.50 | 0.30 | 25.00 | 4.40 | 18.91 | 2 |
| **Sweet Orange** (`usda_sr28_09200`) | NDB 09200 · FDC 169097 | 100g edible portion | 47 | 0.94 | 0.12 | 11.75 | 2.40 | 9.35 | 0 |
| **Red or Green Grapes** (`usda_sr28_09132`) | NDB 09132 · FDC 174683 | 100g edible portion | 69 | 0.72 | 0.16 | 18.10 | 0.90 | 15.48 | 2 |
| **Sweet Watermelon** (`usda_sr28_09326`) | NDB 09326 · FDC 167765 | 100g edible portion | 30 | 0.61 | 0.15 | 7.55 | 0.40 | 6.20 | 1 |
| **Mango** (`usda_sr28_09176`) | NDB 09176 · FDC 169910 | 100g edible portion | 60 | 0.82 | 0.38 | 14.98 | 1.60 | 13.66 | 1 |

---

## 2. Regional Culinary Estimates (`regional_culinary_estimate`)

FitTrack provides localized Iraqi and Kurdish traditional dishes under `src/data/regionalFoods.ts`. Because regional home-style recipes naturally vary in oil absorption, moisture loss, and preparation methods, these entries are categorized with `source: 'regional_culinary_estimate'`.

Every regional dish has been reconciled according to the following principles:
1. **Ingredient Weight Sum:** The sum of constituent raw ingredient gram weights minus moisture evaporation equals the stated `servingGrams`.
2. **Macronutrient Consistency:** Stated calories match the 4/4/9 Atwater calculation ($4 \times \text{protein} + 4 \times \text{carbs} + 9 \times \text{fat}$) within $\pm 5\text{ kcal}$.
3. **Transparent Provenance:** Each item displays an `Estimate` badge in the Add Food UI to ensure complete user clarity regarding culinary estimates versus lab-verified USDA single ingredients.

---

## 3. Sugar Target Guidelines

The 50g reference upper limit for daily sugar intake follows the World Health Organization (WHO) and USDA Dietary Guidelines recommendation for **free and added sugars** ($< 10\%$ of daily caloric intake on a standard 2,000 kcal diet). Naturally occurring sugars bundled with intact fiber and water (e.g., whole fresh apples, oranges, and unflavored dairy) do not contribute to the glycemic velocity of refined sugars and should not be confused with added sugar limits.

---

## 4. Unspecified Gender Reference Daily Intakes (RDA)

When a user's biological sex is unspecified or set to "prefer not to say", FitTrack calculates micronutrient RDA targets using the higher (protective) dietary reference intake between adult biological sexes (e.g., 18 mg for Iron reflecting female RDA; 900 mcg for Vitamin A reflecting male RDA; 3400 mg for Potassium reflecting male AI). This conservative default safeguards against micronutrient insufficiencies while remaining well below tolerable upper intake levels (UL).
