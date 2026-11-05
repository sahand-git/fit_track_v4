import fs from 'fs';
import path from 'path';

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
let count = 0;
for (const f of files) {
  if (f.includes('.test.') || f.endsWith('theme.ts')) continue;
  const content = fs.readFileSync(f, 'utf8');
  const lines = content.split('\n');
  lines.forEach((l, i) => {
    const match = l.match(/fontSize:\s*([0-9]+)/);
    if (match && parseInt(match[1], 10) <= 11) {
      console.log(`${f}:${i + 1}: ${l.trim()}`);
      count++;
    }
  });
}
console.log(`Total font size <= 11 in src/: ${count}`);
