import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const SRC_DIR = path.resolve(__dirname, '../src');
const EXCLUDED_FILES = [
  path.resolve(SRC_DIR, 'theme.ts'),
];

const HEX_REGEX = /#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g;

export interface HexFinding {
  file: string;
  line: number;
  match: string;
  text: string;
}

/**
 * Scans for newly introduced raw hex color values in added/modified files and untracked files
 * compared to origin/main. Fails if any new raw hexes are introduced outside theme.ts.
 */
export function scanNewHexColors(): HexFinding[] {
  const findings: HexFinding[] = [];

  // 1. Get list of untracked files in src/
  try {
    const untracked = execSync('git ls-files --others --exclude-standard src', {
      cwd: path.resolve(__dirname, '..'),
      encoding: 'utf-8',
    }).trim().split('\n').filter(Boolean);

    for (const relFile of untracked) {
      const fullPath = path.resolve(__dirname, '..', relFile);
      if (EXCLUDED_FILES.includes(fullPath)) continue;
      if (relFile.endsWith('.test.ts') || relFile.endsWith('.test.tsx')) continue;
      if (!relFile.endsWith('.ts') && !relFile.endsWith('.tsx')) continue;

      const content = fs.readFileSync(fullPath, 'utf-8');
      const lines = content.split('\n');
      lines.forEach((lineText, index) => {
        const trimmed = lineText.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) return;
        if (lineText.includes('http://') || lineText.includes('https://')) return;

        const matches = lineText.match(HEX_REGEX);
        if (matches) {
          matches.forEach((m) => {
            findings.push({
              file: relFile,
              line: index + 1,
              match: m,
              text: trimmed,
            });
          });
        }
      });
    }
  } catch {
    // fallback if git command fails
  }

  // 2. Get git diff of modified files against origin/main
  try {
    const diff = execSync('git diff origin/main src', {
      cwd: path.resolve(__dirname, '..'),
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
    });

    let currentFile = '';
    let lineNumber = 0;

    diff.split('\n').forEach((line) => {
      if (line.startsWith('diff --git a/')) {
        const match = line.match(/^diff --git a\/(.+) b\/(.+)$/);
        currentFile = match ? match[2] : '';
        lineNumber = 0;
        return;
      }

      if (line.startsWith('@@ ')) {
        const match = line.match(/@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
        if (match) {
          lineNumber = parseInt(match[1], 10) - 1;
        }
        return;
      }

      if (line.startsWith('+') && !line.startsWith('+++')) {
        lineNumber++;
        if (!currentFile || currentFile.endsWith('theme.ts') || currentFile.includes('.test.')) return;
        const lineContent = line.substring(1);
        const trimmed = lineContent.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) return;
        if (lineContent.includes('http://') || lineContent.includes('https://')) return;

        const matches = lineContent.match(HEX_REGEX);
        if (matches) {
          matches.forEach((m) => {
            findings.push({
              file: currentFile,
              line: lineNumber,
              match: m,
              text: trimmed,
            });
          });
        }
      } else if (!line.startsWith('-')) {
        lineNumber++;
      }
    });
  } catch {
    // fallback
  }

  return findings;
}

if (require.main === module) {
  const findings = scanNewHexColors();
  if (findings.length === 0) {
    console.log('✓ scanHex: Zero new raw hex color values found (outside theme.ts).');
    process.exit(0);
  } else {
    console.error(`Found ${findings.length} new raw hex color values in modified/new files:`);
    findings.forEach((f) => {
      console.error(`  ${f.file}:${f.line} -> ${f.match} in "${f.text}"`);
    });
    process.exit(1);
  }
}
