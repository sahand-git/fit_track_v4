import { VERIFIED_FOOD_DATABASE } from '../src/data/foodDatabase';

const total = VERIFIED_FOOD_DATABASE.length;
const nutrients = ['vitaminA', 'vitaminC', 'vitaminD', 'vitaminB12', 'magnesium', 'zinc'] as const;

console.log('Total foods in database:', total);
const stats: Record<string, { count: number; pct: string }> = {};

for (const n of nutrients) {
  const count = VERIFIED_FOOD_DATABASE.filter((f) => f[n] !== undefined && f[n] !== null).length;
  stats[n] = { count, pct: (count / total * 100).toFixed(1) + '%' };
}

console.table(stats);
