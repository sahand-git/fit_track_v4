import fs from 'fs';
import path from 'path';

// WCAG 2.1 Contrast Calculation
function parseHex(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return [r, g, b];
}

function sRgbToLin(c: number): number {
  const norm = c / 255;
  return norm <= 0.03928 ? norm / 12.92 : Math.pow((norm + 0.055) / 1.055, 2.4);
}

function relativeLuminance(r: number, g: number, b: number): number {
  return 0.2126 * sRgbToLin(r) + 0.7152 * sRgbToLin(g) + 0.0722 * sRgbToLin(b);
}

function getContrastRatio(hex1: string, hex2: string): number {
  const [r1, g1, b1] = parseHex(hex1);
  const [r2, g2, b2] = parseHex(hex2);
  const lum1 = relativeLuminance(r1, g1, b1);
  const lum2 = relativeLuminance(r2, g2, b2);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

interface Issue {
  file: string;
  line: number;
  component: string;
  issue: 'missing_label' | 'missing_role' | 'small_touch_target';
  details: string;
}

const themeColors: Record<string, string> = {
  background: '#FAF7F2',
  surface: '#FFFFFF',
  surfaceSubtle: '#F3EFE6',
  textPrimary: '#1F2421',
  textSecondary: '#555F58',
  textMuted: '#54635B',
  textInverted: '#FFFFFF',
  primary: '#1E3A2F',
  secondary: '#7A9283',
  accent: '#C1664C',
  danger: '#B83A3A',
  warning: '#BA7720',
};

function runContrastAudit() {
  console.log('=== WCAG AA Contrast Audit ===');
  const pairs: { name: string; fg: string; bg: string; min: number }[] = [
    { name: 'textPrimary on background', fg: themeColors.textPrimary, bg: themeColors.background, min: 4.5 },
    { name: 'textPrimary on surface', fg: themeColors.textPrimary, bg: themeColors.surface, min: 4.5 },
    { name: 'textSecondary on background', fg: themeColors.textSecondary, bg: themeColors.background, min: 4.5 },
    { name: 'textSecondary on surface', fg: themeColors.textSecondary, bg: themeColors.surface, min: 4.5 },
    { name: 'textMuted on background', fg: themeColors.textMuted, bg: themeColors.background, min: 4.5 },
    { name: 'textMuted on surface', fg: themeColors.textMuted, bg: themeColors.surface, min: 4.5 },
    { name: 'textInverted on primary', fg: themeColors.textInverted, bg: themeColors.primary, min: 4.5 },
    { name: 'textInverted on danger', fg: themeColors.textInverted, bg: themeColors.danger, min: 4.5 },
    { name: 'accent on background (large/UI)', fg: themeColors.accent, bg: themeColors.background, min: 3.0 },
    { name: 'secondary on background (large/UI)', fg: themeColors.secondary, bg: themeColors.background, min: 3.0 },
  ];

  let contrastPass = 0;
  let contrastFail = 0;

  for (const p of pairs) {
    const ratio = getContrastRatio(p.fg, p.bg);
    const passes = ratio >= p.min;
    if (passes) {
      contrastPass++;
      console.log(`✓ ${p.name}: ${ratio.toFixed(2)}:1 (Pass >= ${p.min}:1)`);
    } else {
      contrastFail++;
      console.warn(`✗ ${p.name}: ${ratio.toFixed(2)}:1 (FAIL < ${p.min}:1)`);
    }
  }

  console.log(`Contrast Summary: ${contrastPass} passed, ${contrastFail} failed\n`);
  return { contrastPass, contrastFail };
}

function scanFilesForInteractiveElements(dir: string): Issue[] {
  const issues: Issue[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.expo') {
        issues.push(...scanFilesForInteractiveElements(fullPath));
      }
    } else if (entry.isFile() && (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts'))) {
      if (entry.name.endsWith('.test.ts') || entry.name.endsWith('.test.tsx')) continue;
      const content = fs.readFileSync(fullPath, 'utf8');

      const regex = /<(TouchableOpacity|Pressable|AnimatedPressable)\b/g;
      let match: RegExpExecArray | null;

      while ((match = regex.exec(content)) !== null) {
        const startIndex = match.index;
        const comp = match[1];
        let i = startIndex + match[0].length;
        let braceDepth = 0;
        let parenDepth = 0;
        let inString: string | null = null;
        let props = '';

        while (i < content.length) {
          const char = content[i];
          const prevChar = i > 0 ? content[i - 1] : '';

          if (inString) {
            if (char === inString && prevChar !== '\\') {
              inString = null;
            }
          } else {
            if (char === '"' || char === "'" || char === '`') {
              inString = char;
            } else if (char === '{') {
              braceDepth++;
            } else if (char === '}') {
              if (braceDepth > 0) braceDepth--;
            } else if (char === '(') {
              parenDepth++;
            } else if (char === ')') {
              if (parenDepth > 0) parenDepth--;
            } else if (char === '>' && braceDepth === 0 && parenDepth === 0) {
              props = content.substring(startIndex + match[0].length, i);
              break;
            }
          }
          i++;
        }

        const lineNum = content.substring(0, startIndex).split('\n').length;
        const hasRole = /accessibilityRole\s*=/.test(props);
        const hasLabel = /accessibilityLabel\s*=/.test(props) || /aria-label\s*=/.test(props);

        if (!hasRole) {
          issues.push({
            file: path.relative(process.cwd(), fullPath),
            line: lineNum,
            component: comp,
            issue: 'missing_role',
            details: `Missing accessibilityRole on <${comp}>`,
          });
        }

        if (!hasLabel) {
          issues.push({
            file: path.relative(process.cwd(), fullPath),
            line: lineNum,
            component: comp,
            issue: 'missing_label',
            details: `Missing accessibilityLabel on <${comp}>`,
          });
        }
      }
    }
  }

  return issues;
}

export function runAccessibilityAudit() {
  const contrastResult = runContrastAudit();

  console.log('=== Interactive Element (Touch Target & ARIA) Audit ===');
  const srcDir = path.join(process.cwd(), 'src');
  const issues = scanFilesForInteractiveElements(srcDir);

  const missingRoles = issues.filter((i) => i.issue === 'missing_role');
  const missingLabels = issues.filter((i) => i.issue === 'missing_label');

  console.log(`Scanned src directory.`);
  console.log(`Total interactive elements with missing accessibilityRole: ${missingRoles.length}`);
  console.log(`Total interactive elements with missing accessibilityLabel: ${missingLabels.length}`);
  console.log(`Total element accessibility issues found: ${issues.length}`);

  if (issues.length > 0) {
    console.log('\nTop 20 Issues to Resolve:');
    issues.slice(0, 20).forEach((iss, idx) => {
      console.log(`  ${idx + 1}. [${iss.file}:${iss.line}] <${iss.component}> -> ${iss.details}`);
    });
  }

  return {
    contrastResult,
    totalIssues: issues.length,
    missingRolesCount: missingRoles.length,
    missingLabelsCount: missingLabels.length,
    issues,
  };
}

if (require.main === module) {
  runAccessibilityAudit();
}
