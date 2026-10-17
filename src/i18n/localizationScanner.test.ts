import { hasTranslation } from './strings';

declare const require: (module: string) => any;
declare const __dirname: string;

const fs: any = require('fs');
const path: any = require('path');

console.log('Testing localizationScanner test setup...');

function getFiles(dir: string, exts: string[] = ['.tsx', '.ts']): string[] {
  let files: string[] = [];
  const entries: any[] = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(getFiles(fullPath, exts));
    } else if (exts.some((ext) => entry.name.endsWith(ext))) {
      files.push(fullPath);
    }
  }
  return files;
}

const rootDir = path.resolve(__dirname, '..');
const srcFiles = getFiles(rootDir).filter(
  (f) => !f.includes('.test.') && !f.endsWith('strings.ts')
);

const literalRegex = /\bt\(\s*(['"])((?:\\.|(?!\1).)*)\1\s*[,)]/g;
const foundKeys = new Set<string>();
const keyLocations: Record<string, string[]> = {};

for (const file of srcFiles) {
  const content: string = fs.readFileSync(file, 'utf8');
  let m: RegExpExecArray | null;
  while ((m = literalRegex.exec(content)) !== null) {
    const raw = m[2];
    const unescaped = raw.replace(/\\'/g, "'").replace(/\\"/g, '"');
    foundKeys.add(unescaped);
    if (!keyLocations[unescaped]) keyLocations[unescaped] = [];
    keyLocations[unescaped].push(path.relative(rootDir, file));
  }
}

console.log(`Localization Scanner: Discovered ${foundKeys.size} distinct t('...') literals in ${srcFiles.length} source files.`);

const missingAr: string[] = [];
const missingCkb: string[] = [];

for (const key of foundKeys) {
  if (!hasTranslation('ar', key)) {
    missingAr.push(key);
  }
  if (!hasTranslation('ckb', key)) {
    missingCkb.push(key);
  }
}

if (missingAr.length > 0 || missingCkb.length > 0) {
  console.error('Localization coverage check FAILED:');
  if (missingAr.length > 0) {
    console.error(`Missing Arabic (${missingAr.length}):`, missingAr);
  }
  if (missingCkb.length > 0) {
    console.error(`Missing Kurdish (${missingCkb.length}):`, missingCkb);
  }
  throw new Error(`Missing translations for ${missingAr.length} ar and ${missingCkb.length} ckb keys.`);
}

console.log(`✓ All ${foundKeys.size} source string literals are fully localized in Arabic and Kurdish.`);
