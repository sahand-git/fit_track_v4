/// <reference types="node" />
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { translations } from '../src/i18n/strings';
import { VERIFIED_FOOD_DATABASE } from '../src/data/foodDatabase';

const escapeCsv = (value: string) => `"${value.replaceAll('"', '""')}"`;
const keys = [...new Set([...Object.keys(translations.ar), ...Object.keys(translations.ckb)])].sort();

const foodRows = VERIFIED_FOOD_DATABASE.map((food) => [
  `[Food: ${food.id}] ${food.name}`,
  food.nameAr ?? '',
  food.nameCkb ?? '',
  `Category: ${food.category ?? ''}`,
]);

const rows = [
  ['Key / English', 'Arabic', 'Sorani Kurdish', 'Reviewer corrections'],
  ...foodRows,
  ...keys.map((key) => [key, translations.ar[key] ?? '', translations.ckb[key] ?? '', '']),
];
const outputPath = resolve('docs/localization-review.csv');

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${rows.map((row) => row.map(escapeCsv).join(',')).join('\r\n')}\r\n`, 'utf8');
console.log(`Exported ${foodRows.length} food items and ${keys.length} UI strings to ${outputPath}`);
