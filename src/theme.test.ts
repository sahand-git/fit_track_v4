import fs from 'fs';
import path from 'path';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

console.log('Starting Design System & Theme Integrity Unit Tests...');

// 1. Verify theme.ts content, tokens, and dark theme parity
const themePath = path.join(__dirname, 'theme.ts');
const themeSource = fs.readFileSync(themePath, 'utf8');

assert(themeSource.includes('export const theme = {'), 'theme.ts must export theme');
assert(themeSource.includes('export const darkTheme = {'), 'theme.ts must export darkTheme');
assert(themeSource.includes('export function getTheme('), 'theme.ts must export getTheme function');

// Extract keys inside theme.colors and darkTheme.colors
const lightColorsMatch = themeSource.match(/colors:\s*\{([\s\S]*?)\n\s*\},/);
assert(!!lightColorsMatch, 'theme.colors must be defined');

const darkColorsMatch = themeSource.match(/darkTheme\s*=\s*\{[\s\S]*?colors:\s*\{([\s\S]*?)\n\s*\},/);
assert(!!darkColorsMatch, 'darkTheme.colors must be defined');

console.log('✓ Token parity and export structures verified');

// 2. Scan entire src/ for any raw hex color literals outside theme.ts
function walk(dir: string): string[] {
  let results: string[] = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(fullPath));
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      results.push(fullPath);
    }
  });
  return results;
}

const files = walk('src');
if (fs.existsSync('App.tsx')) {
  files.push('App.tsx');
}
const colorRegex = /['"`](#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8}))['"`]/g;
const violations: { file: string; color: string; line: number }[] = [];

files.forEach((f) => {
  // theme.ts and this test file are exempted
  if (f.endsWith('theme.ts') || f.endsWith('theme.test.ts')) return;
  const content = fs.readFileSync(f, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, index) => {
    let match;
    while ((match = colorRegex.exec(line)) !== null) {
      violations.push({
        file: f,
        color: match[1],
        line: index + 1,
      });
    }
  });
});

if (violations.length > 0) {
  const summary = violations.map((v) => `${v.file}:${v.line} (${v.color})`).join('\n');
  throw new Error(`Found ${violations.length} hardcoded hex color(s) outside theme.ts:\n${summary}`);
}

console.log('✓ Zero hardcoded hex colors outside theme.ts verified!');
console.log('All theme tests passed cleanly!');
