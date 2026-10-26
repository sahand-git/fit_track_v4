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
let totalHexOccurrences = 0;
const colorRegex = /['"](#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8}))['"]/g;

const filesWithColors: { file: string; count: number; colors: string[] }[] = [];

files.forEach((f) => {
  if (f.endsWith('theme.ts') || f.includes('theme.test.ts')) return;
  const content = fs.readFileSync(f, 'utf8');
  let match;
  const matchesInFile: string[] = [];
  while ((match = colorRegex.exec(content)) !== null) {
    matchesInFile.push(match[1]);
  }
  if (matchesInFile.length > 0) {
    totalHexOccurrences += matchesInFile.length;
    filesWithColors.push({
      file: f,
      count: matchesInFile.length,
      colors: Array.from(new Set(matchesInFile)),
    });
  }
});

console.log('Total raw hex color string literals in src/ (outside theme.ts):', totalHexOccurrences);
filesWithColors.forEach((item) => {
  console.log(`${item.file}: ${item.count} colors -> ${item.colors.join(', ')}`);
});
