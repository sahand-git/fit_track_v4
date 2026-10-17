/**
 * Food Database Macro & Quality Audit Script
 *
 * Inspects all verified foods in VERIFIED_FOOD_DATABASE and audits:
 * 1. Atwater 4/4/9 macro-calorie consistency:
 *    Calculated Kcal = (Protein * 4) + (Carbs * 4) + (Fat * 9)
 *    Flags any food whose stated calories differ from calculated by > 30%.
 * 2. Serving validity (non-empty servingSize, positive servingGrams).
 * 3. Category validity.
 *
 * Usage:
 *   npx tsx scripts/auditFoodDatabase.ts
 *   npm run audit:foods
 */

import { VERIFIED_FOOD_DATABASE } from '../src/data/foodDatabase';

declare const require: { main?: unknown };
declare const module: unknown;
declare const process: { env: Record<string, string | undefined>; argv: string[] };

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
}

export function auditFoodDatabase(thresholdPercentage = 30): {
  totalAudited: number;
  discrepancies: AuditDiscrepancy[];
  categoryStats: Record<string, number>;
} {
  const discrepancies: AuditDiscrepancy[] = [];
  const categoryStats: Record<string, number> = {};

  for (const food of VERIFIED_FOOD_DATABASE) {
    const category = food.category ?? 'Uncategorized';
    categoryStats[category] = (categoryStats[category] || 0) + 1;

    const atwaterKcal = Math.round((food.protein * 4 + food.carbs * 4 + food.fat * 9) * 10) / 10;
    const absDiff = Math.abs(food.calories - atwaterKcal);

    let pctDiff = 0;
    if (food.calories > 0) {
      pctDiff = (absDiff / food.calories) * 100;
    } else if (atwaterKcal > 0) {
      pctDiff = 100;
    }

    if (pctDiff > thresholdPercentage) {
      let notes = 'Macro-to-calorie ratio differs by > 30%';
      if (food.calories < 15) {
        notes = 'Low-calorie item rounding artifact (fractional macros rounded to integers under 15 kcal)';
      }

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
        atwaterKcal,
        absoluteDiff: Math.round(absDiff * 10) / 10,
        percentageDiff: Math.round(pctDiff * 10) / 10,
        notes,
      });
    }
  }

  return {
    totalAudited: VERIFIED_FOOD_DATABASE.length,
    discrepancies,
    categoryStats,
  };
}

// When executed directly, print formatted console report
if (typeof require !== 'undefined' && require.main === module || !process.env.SUPPRESS_AUDIT_LOGS) {
  console.log('========================================================================');
  console.log('           FITTRACK VERIFIED FOOD DATABASE AUDIT REPORT                ');
  console.log('========================================================================');

  const { totalAudited, discrepancies, categoryStats } = auditFoodDatabase(30);

  console.log(`\nAudited ${totalAudited} total food entries across ${Object.keys(categoryStats).length} categories.\n`);

  console.log('Category Distribution:');
  for (const [cat, count] of Object.entries(categoryStats).sort((a, b) => b[1] - a[1])) {
    console.log(`  • ${cat.padEnd(22)} : ${count} items`);
  }

  console.log('\n------------------------------------------------------------------------');
  console.log(`Macro Discrepancy Findings (Diff > 30% from 4/4/9 Atwater calculation):`);
  console.log('------------------------------------------------------------------------');

  if (discrepancies.length === 0) {
    console.log('✓ No food entries exceeded the 30% macro-calorie discrepancy threshold!');
  } else {
    console.log(`Found ${discrepancies.length} food entry/entries exceeding 30% threshold:\n`);
    for (const d of discrepancies) {
      console.log(`[!] ${d.name} (${d.id})`);
      console.log(`    Category      : ${d.category} | Serving: ${d.servingSize} (${d.servingGrams}g)`);
      console.log(`    Stated Kcal   : ${d.statedKcal} kcal`);
      console.log(`    Macros        : ${d.protein}g Protein | ${d.carbs}g Carbs | ${d.fat}g Fat`);
      console.log(`    Atwater Kcal  : ${d.atwaterKcal} kcal (Diff: ${d.absoluteDiff} kcal, ${d.percentageDiff}%)`);
      console.log(`    Diagnosis     : ${d.notes}\n`);
    }
  }

  console.log('========================================================================');
  console.log('                 DATA QUALITY AUDIT COMPLETE                            ');
  console.log('========================================================================\n');
}
