import { formatKcal } from './formatKcal';

function assertEqual<T>(actual: T, expected: T, message?: string): void {
  if (actual !== expected) {
    throw new Error(`${message ? message + ': ' : ''}Expected ${expected}, got ${actual}`);
  }
}

console.log('Testing formatKcal shared formatter...');

// 1. Basic formatting
assertEqual(formatKcal(500), '500 kcal');
assertEqual(formatKcal(1928), '1,928 kcal');
assertEqual(formatKcal(123.45), '123 kcal');
assertEqual(formatKcal(123.8), '124 kcal');

// 2. Fallbacks
assertEqual(formatKcal(0), '0 kcal');
assertEqual(formatKcal(null), '0 kcal');
assertEqual(formatKcal(undefined), '0 kcal');
assertEqual(formatKcal(NaN), '0 kcal');

// 3. Multilingual localization
const mockTranslateAr = (key: string) => (key === 'kcal' ? 'سعرة حرارية' : key);
assertEqual(formatKcal(500, mockTranslateAr), '500 سعرة حرارية');

const mockTranslateCkb = (key: string) => (key === 'kcal' ? 'کالۆری' : key);
assertEqual(formatKcal(500, mockTranslateCkb), '500 کالۆری');

console.log('All formatKcal tests passed cleanly!');
