/// <reference types="node" />
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { translations } from '../src/i18n/strings';

const escapeCsv = (value: string) => `"${value.replaceAll('"', '""')}"`;
const keys = [...new Set([...Object.keys(translations.ar), ...Object.keys(translations.ckb)])].sort();
const rows = [
  ['Key / English', 'Arabic', 'Sorani Kurdish', 'Reviewer corrections'],
  ...keys.map((key) => [key, translations.ar[key] ?? '', translations.ckb[key] ?? '', '']),
];
const outputPath = resolve('docs/localization-review.csv');

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${rows.map((row) => row.map(escapeCsv).join(',')).join('\r\n')}\r\n`, 'utf8');
console.log(`Exported ${keys.length} strings to ${outputPath}`);
