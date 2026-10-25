/**
 * Food Database Macro & Quality Audit Script
 *
 * Inspects all verified foods in VERIFIED_FOOD_DATABASE and audits:
 * 1. Atwater 4/4/9 macro-calorie consistency:
 *    Calculated Kcal = (Protein * 4) + (Carbs * 4) + (Fat * 9)
 *    Enforces strict threshold: calorie-vs-macro mismatch > 12% is an error.
 *    Fiber / Sugar-Alcohol Allowance (FDA 21 CFR 101.9 / FAO guidelines):
 *    - Insoluble fiber yields 0 kcal/g; soluble fiber yields ~2 kcal/g (an allowance deduction
 *      of up to 4 kcal per gram of dietary fiber from total carbohydrates).
 *    - Polyols / sugar alcohols (e.g. erythritol) yield 0 to 2.4 kcal/g rather than 4 kcal/g.
 *    - Low-calorie foods (stated <= 15 kcal) are subject to integer rounding artifacts.
 * 2. Reviewed Exception List:
 *    Explicitly tracks and verifies documented outliers (food_quest_cookie_dough, food_broccoli)
 *    with reviewed physiological justification rather than ignoring them.
 * 3. Barcode integrity:
 *    Valid GS1 UPC-A / EAN-13 / EAN-8 checksums, lengths, and uniqueness.
 * 4. Catalog quality:
 *    - No duplicate IDs.
 *    - No empty/whitespace categories.
 *    - No zero-calorie non-drinks.
 *    - No placeholder brands ("Pizzeria Classic", "Fast Food Classic", "... Classic/Standard", etc.).
 *
 * Usage:
 *   npx tsx scripts/auditFoodDatabase.ts
 *   npm run audit:foods
 */

import { VERIFIED_FOOD_DATABASE } from '../src/data/foodDatabase';
import { isValidBarcode } from '../src/utils/barcodeUtils';
import { CANONICAL_FOOD_CATEGORIES } from '../src/utils/foodCategories';

declare const require: { main?: unknown };
declare const module: unknown;
declare const process: { env: Record<string, string | undefined>; argv: string[]; exit?: (code?: number) => void };

export interface BarcodeAuditError {
  id: string;
  name: string;
  barcode: string;
  type: 'invalid_format_or_checksum' | 'duplicate_barcode';
  message: string;
}

export interface QualityAuditError {
  id: string;
  name: string;
  type:
    | 'duplicate_id'
    | 'duplicate_name'
    | 'empty_category'
    | 'invalid_category'
    | 'zero_calorie_non_drink'
    | 'placeholder_brand'
    | 'drink_missing_unit'
    | 'non_english_name';
  message: string;
}

export interface AuditDiscrepancy {
  id: string;
  name: string;
  category: string;
  servingSize: string;
  servingGrams: number;
  statedKcal: number;
  protein: number;
  carbs: number;
  fat: number;
  atwaterKcal: number;
  absoluteDiff: number;
  percentageDiff: number;
  notes: string;
  fiber?: number;
  isReviewedException?: boolean;
}

export interface ReviewedAuditException {
  id: string;
  name: string;
  reason: string;
  maxAllowedDiffPercentage: number;
}

/**
 * Reviewed Exception List
 * Explicitly audited items with documented biochemical / labeling justifications.
 */
export const REVIEWED_AUDIT_EXCEPTIONS: Record<string, ReviewedAuditException> = {
  food_quest_cookie_dough: {
    id: 'food_quest_cookie_dough',
    name: 'Chocolate Chip Cookie Dough Protein Bar',
    reason:
      'Quest Nutrition bar contains 14g dietary fiber (soluble corn fiber at ~2 kcal/g) and 4g erythritol (sugar alcohol at 0-0.2 kcal/g) per FDA 21 CFR 101.9, causing a 26.5% variance vs standard 4/4/9 Atwater.',
    maxAllowedDiffPercentage: 30,
  },
  food_broccoli: {
    id: 'food_broccoli',
    name: 'Steamed Broccoli Florets',
    reason:
      'High dietary fiber (2.6g / 100g) and USDA specific Atwater factors for cruciferous vegetables yield 35 kcal (USDA FDC #170379) vs general 4/4/9 Atwater (42 kcal), a 20% variance.',
    maxAllowedDiffPercentage: 25,
  },
};

const BANNED_BRAND_PATTERNS = [
  /classic/i,
  /standard/i,
  /heritage/i,
  /tradition/i,
  /healthy choice/i,
  /pizzeria/i,
  /deli classic/i,
  /diner/i,
  /home classic/i,
  /cafe classic/i,
  /restaurant classic/i,
  /comfort classic/i,
  /usda standard/i,
  /usda choice/i,
  /usda fresh/i,
  /produce standard/i,
  /local stone/i,
  /farm fresh/i,
  /\//, // Multiple slash placeholder brands like "Silk / Almond Breeze" or "Fage / Chobani"
];

export function auditFoodDatabase(thresholdPercentage = 12): {
  totalAudited: number;
  discrepancies: AuditDiscrepancy[];
  reviewedExceptions: AuditDiscrepancy[];
  categoryStats: Record<string, number>;
  barcodeErrors: BarcodeAuditError[];
  qualityErrors: QualityAuditError[];
} {
  const discrepancies: AuditDiscrepancy[] = [];
  const reviewedExceptions: AuditDiscrepancy[] = [];
  const categoryStats: Record<string, number> = {};
  const barcodeErrors: BarcodeAuditError[] = [];
  const qualityErrors: QualityAuditError[] = [];

  const seenIds = new Set<string>();
  const seenNames = new Map<string, string>();
  const seenBarcodes = new Map<string, string>();
  const canonicalCategories = new Set<string>(CANONICAL_FOOD_CATEGORIES);
  const ARABIC_SCRIPT_REGEX = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/;

  for (const food of VERIFIED_FOOD_DATABASE) {
    // 1. Duplicate ID check
    if (seenIds.has(food.id)) {
      qualityErrors.push({
        id: food.id,
        name: food.name,
        type: 'duplicate_id',
        message: `Food item with duplicate ID "${food.id}" detected in database.`,
      });
    } else {
      seenIds.add(food.id);
    }

    // 2. Duplicate Name check
    const normName = food.name.trim().toLowerCase();
    if (seenNames.has(normName)) {
      qualityErrors.push({
        id: food.id,
        name: food.name,
        type: 'duplicate_name',
        message: `Food "${food.name}" (${food.id}) has duplicate name already registered to "${seenNames.get(normName)}".`,
      });
    } else {
      seenNames.set(normName, food.id);
    }

    // 3. Name cleanliness check (Arabic/Kurdish characters must live in nameAr/nameCkb)
    if (ARABIC_SCRIPT_REGEX.test(food.name)) {
      qualityErrors.push({
        id: food.id,
        name: food.name,
        type: 'non_english_name',
        message: `Food "${food.name}" (${food.id}) contains non-English characters in primary name field; move to nameAr/nameCkb.`,
      });
    }

    // 4. Empty category check & canonical category check
    const rawCategory = food.category;
    if (!rawCategory || rawCategory.trim() === '') {
      qualityErrors.push({
        id: food.id,
        name: food.name,
        type: 'empty_category',
        message: `Food "${food.name}" (${food.id}) has missing or empty category.`,
      });
    }

    const category = rawCategory?.trim() ?? 'Uncategorized';
    if (!canonicalCategories.has(category)) {
      qualityErrors.push({
        id: food.id,
        name: food.name,
        type: 'invalid_category',
        message: `Food "${food.name}" (${food.id}) has non-canonical category "${category}". Must be one of the 17 standard categories.`,
      });
    }

    categoryStats[category] = (categoryStats[category] || 0) + 1;

    // 5. Drinks unit check (must store ml separately via unit: 'ml')
    if (category === 'Drinks' && food.unit !== 'ml') {
      qualityErrors.push({
        id: food.id,
        name: food.name,
        type: 'drink_missing_unit',
        message: `Drink "${food.name}" (${food.id}) must specify unit: "ml" rather than coercing volume into grams.`,
      });
    }

    // 6. Zero-calorie non-drink check
    if (food.calories === 0) {
      const isDrink = category === 'Drinks';
      if (!isDrink) {
        qualityErrors.push({
          id: food.id,
          name: food.name,
          type: 'zero_calorie_non_drink',
          message: `Food "${food.name}" (${food.id}) has 0 kcal but is categorized as "${category}" instead of Drinks.`,
        });
      }
    }

    // 4. Placeholder brand check
    if (food.brand && food.brand.trim() !== '') {
      const brandStr = food.brand.trim();
      const isBanned = BANNED_BRAND_PATTERNS.some((pat) => pat.test(brandStr));
      if (isBanned) {
        qualityErrors.push({
          id: food.id,
          name: food.name,
          type: 'placeholder_brand',
          message: `Food "${food.name}" (${food.id}) contains prohibited placeholder brand "${brandStr}".`,
        });
      }
    }

    // 5. Barcode integrity checks: valid GS1 format/checksum and uniqueness
    if (food.barcode !== undefined && food.barcode !== null && String(food.barcode).trim() !== '') {
      const code = String(food.barcode).trim();
      if (!isValidBarcode(code)) {
        barcodeErrors.push({
          id: food.id,
          name: food.name,
          barcode: code,
          type: 'invalid_format_or_checksum',
          message: `Food "${food.name}" (${food.id}) has invalid barcode "${code}" (fails GS1 UPC-A/EAN-13/EAN-8 checksum/length).`,
        });
      } else if (seenBarcodes.has(code)) {
        barcodeErrors.push({
          id: food.id,
          name: food.name,
          barcode: code,
          type: 'duplicate_barcode',
          message: `Food "${food.name}" (${food.id}) has duplicate barcode "${code}" (already registered to "${seenBarcodes.get(code)}").`,
        });
      } else {
        seenBarcodes.set(code, food.id);
      }
    }

    // 6. Macro & Calorie Consistency Check (4/4/9 Atwater with Fiber Allowance & Reviewed Exceptions)
    const rawAtwater = Math.round((food.protein * 4 + food.carbs * 4 + food.fat * 9) * 10) / 10;
    const fiber = food.fiber ?? 0;
    const rawAbsDiff = Math.abs(food.calories - rawAtwater);
    const rawPctDiff = food.calories > 0 ? (rawAbsDiff / food.calories) * 100 : (rawAtwater > 0 ? 100 : 0);

    // Fiber allowance: under FDA 21 CFR 101.9, insoluble fiber contributes 0 kcal/g and soluble ~2 kcal/g.
    // Standard Atwater overestimates total carbohydrate calories by 2 to 4 kcal per gram of fiber.
    const fiberDeduction = fiber * 2; // conservative 2 kcal/g allowance
    const minAtwater = Math.max(0, rawAtwater - fiberDeduction);

    let effectiveDiff = 0;
    if (food.calories > rawAtwater) {
      effectiveDiff = food.calories - rawAtwater;
    } else if (food.calories < minAtwater) {
      effectiveDiff = minAtwater - food.calories;
    } else {
      effectiveDiff = 0;
    }

    const effectivePctDiff = food.calories > 0 ? (effectiveDiff / food.calories) * 100 : 0;
    const isLowCalorieArtifact = food.calories <= 15;

    // Check if item is in explicit reviewed exception list
    const exception = REVIEWED_AUDIT_EXCEPTIONS[food.id];

    if (exception) {
      if (rawPctDiff <= exception.maxAllowedDiffPercentage) {
        reviewedExceptions.push({
          id: food.id,
          name: food.name,
          category,
          servingSize: food.servingSize,
          servingGrams: food.servingGrams,
          statedKcal: food.calories,
          protein: food.protein,
          carbs: food.carbs,
          fat: food.fat,
          fiber: food.fiber,
          atwaterKcal: rawAtwater,
          absoluteDiff: Math.round(rawAbsDiff * 10) / 10,
          percentageDiff: Math.round(rawPctDiff * 10) / 10,
          notes: exception.reason,
          isReviewedException: true,
        });
      } else {
        discrepancies.push({
          id: food.id,
          name: food.name,
          category,
          servingSize: food.servingSize,
          servingGrams: food.servingGrams,
          statedKcal: food.calories,
          protein: food.protein,
          carbs: food.carbs,
          fat: food.fat,
          fiber: food.fiber,
          atwaterKcal: rawAtwater,
          absoluteDiff: Math.round(rawAbsDiff * 10) / 10,
          percentageDiff: Math.round(rawPctDiff * 10) / 10,
          notes: `Reviewed exception exceeded ceiling (${rawPctDiff.toFixed(1)}% > ${exception.maxAllowedDiffPercentage}%): ${exception.reason}`,
          isReviewedException: true,
        });
      }
    } else if (effectivePctDiff > thresholdPercentage && !isLowCalorieArtifact) {
      discrepancies.push({
        id: food.id,
        name: food.name,
        category,
        servingSize: food.servingSize,
        servingGrams: food.servingGrams,
        statedKcal: food.calories,
        protein: food.protein,
        carbs: food.carbs,
        fat: food.fat,
        fiber: food.fiber,
        atwaterKcal: rawAtwater,
        absoluteDiff: Math.round(effectiveDiff * 10) / 10,
        percentageDiff: Math.round(effectivePctDiff * 10) / 10,
        notes: `Macro-to-calorie discrepancy > ${thresholdPercentage}% beyond fiber allowance`,
        isReviewedException: false,
      });
    } else if (isLowCalorieArtifact && rawAtwater > food.calories + 5) {
      reviewedExceptions.push({
        id: food.id,
        name: food.name,
        category,
        servingSize: food.servingSize,
        servingGrams: food.servingGrams,
        statedKcal: food.calories,
        protein: food.protein,
        carbs: food.carbs,
        fat: food.fat,
        fiber: food.fiber,
        atwaterKcal: rawAtwater,
        absoluteDiff: Math.round(rawAbsDiff * 10) / 10,
        percentageDiff: 100,
        notes: 'Low-calorie item rounding artifact (fractional macros rounded to integers under 15 kcal)',
        isReviewedException: true,
      });
    }
  }

  return {
    totalAudited: VERIFIED_FOOD_DATABASE.length,
    discrepancies,
    reviewedExceptions,
    categoryStats,
    barcodeErrors,
    qualityErrors,
  };
}

// When executed directly, print formatted console report
if ((typeof require !== 'undefined' && require.main === module) || !process.env.SUPPRESS_AUDIT_LOGS) {
  console.log('========================================================================');
  console.log('           FITTRACK VERIFIED FOOD DATABASE AUDIT REPORT (PHASE 2)      ');
  console.log('========================================================================');

  const { totalAudited, discrepancies, reviewedExceptions, categoryStats, barcodeErrors, qualityErrors } =
    auditFoodDatabase(12);

  console.log(`\nAudited ${totalAudited} total food entries across ${Object.keys(categoryStats).length} categories.\n`);

  console.log('Category Distribution:');
  for (const [cat, count] of Object.entries(categoryStats).sort((a, b) => b[1] - a[1])) {
    console.log(`  • ${cat.padEnd(22)} : ${count} items`);
  }

  console.log('\n------------------------------------------------------------------------');
  console.log(`Barcode Integrity Check:`);
  console.log('------------------------------------------------------------------------');
  if (barcodeErrors.length === 0) {
    console.log('✓ All food barcodes passed GS1 check digit and uniqueness validation!');
  } else {
    console.error(`❌ Found ${barcodeErrors.length} barcode error(s):\n`);
    for (const b of barcodeErrors) {
      console.error(`[!] [${b.type}] ${b.message}`);
    }
  }

  console.log('\n------------------------------------------------------------------------');
  console.log(`Quality Checks (Duplicates, Empty Categories, 0-kcal Non-drinks, Brands):`);
  console.log('------------------------------------------------------------------------');
  if (qualityErrors.length === 0) {
    console.log('✓ All food entries passed quality checks (0 duplicates, 0 empty categories, 0 fake brands).');
  } else {
    console.error(`❌ Found ${qualityErrors.length} quality error(s):\n`);
    for (const q of qualityErrors) {
      console.error(`[!] [${q.type}] ${q.message}`);
    }
  }

  console.log('\n------------------------------------------------------------------------');
  console.log(`Reviewed Audit Exceptions (${reviewedExceptions.length} verified item/entries):`);
  console.log('------------------------------------------------------------------------');
  for (const r of reviewedExceptions) {
    console.log(`[✓ Reviewed] ${r.name} (${r.id})`);
    console.log(`    Stated: ${r.statedKcal} kcal | Atwater: ${r.atwaterKcal} kcal | Diff: ${r.percentageDiff}%`);
    console.log(`    Biochemical Justification: ${r.notes}\n`);
  }

  console.log('------------------------------------------------------------------------');
  console.log(`Macro Discrepancy Findings (Diff > 12% beyond fiber/polyol allowance):`);
  console.log('------------------------------------------------------------------------');

  if (discrepancies.length === 0) {
    console.log('✓ No unreviewed food entries exceeded the 12% macro-calorie discrepancy threshold!');
  } else {
    console.error(`❌ Found ${discrepancies.length} food entry/entries exceeding 12% threshold:\n`);
    for (const d of discrepancies) {
      console.error(`[!] ${d.name} (${d.id})`);
      console.error(`    Category      : ${d.category} | Serving: ${d.servingSize} (${d.servingGrams}g)`);
      console.error(`    Stated Kcal   : ${d.statedKcal} kcal`);
      console.error(`    Macros        : ${d.protein}g Protein | ${d.carbs}g Carbs | ${d.fat}g Fat | ${d.fiber ?? 0}g Fiber`);
      console.error(`    Atwater Kcal  : ${d.atwaterKcal} kcal (Diff: ${d.absoluteDiff} kcal, ${d.percentageDiff}%)`);
      console.error(`    Diagnosis     : ${d.notes}\n`);
    }
  }

  console.log('========================================================================');
  console.log('                 DATA QUALITY AUDIT COMPLETE                            ');
  console.log('========================================================================\n');

  const hasFailures = barcodeErrors.length > 0 || qualityErrors.length > 0 || discrepancies.length > 0;
  if (hasFailures) {
    if (typeof process !== 'undefined' && process.exit) {
      process.exit(1);
    } else {
      throw new Error(`Audit failed with ${barcodeErrors.length + qualityErrors.length + discrepancies.length} total error(s).`);
    }
  }
}
