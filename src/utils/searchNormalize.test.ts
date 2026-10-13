import { normalizeSearch } from './localeUtils';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

// 1. Basic latin normalization
assert(normalizeSearch('  Grilled   CHICKEN Breast  ') === 'grilled chicken breast', 'Lowercases and collapses spaces');
assert(normalizeSearch('') === '', 'Empty string returns empty');

// 2. Arabic tashkeel (diacritics) & tatweel stripping
// دَجَاج (with fatha) and دـجـاج (with tatweel/kashida)
assert(normalizeSearch('دَجَاجٌ') === normalizeSearch('دجاج'), 'Strips fatha and tanween');
assert(normalizeSearch('دـجـاج') === normalizeSearch('دجاج'), 'Strips kashida / tatweel');

// 3. Alef variant normalization
// أ إ آ ٱ all normalize to ا
assert(normalizeSearch('أرز') === normalizeSearch('ارز'), 'Normalizes alef hamza above');
assert(normalizeSearch('إفطار') === normalizeSearch('افطار'), 'Normalizes alef hamza below');
assert(normalizeSearch('آخر') === normalizeSearch('اخر'), 'Normalizes alef madda');

// 4. Kaf and Yeh variants
// Arabic kaf (ك) vs Persian/Kurdish kaf (ک)
assert(normalizeSearch('كباب') === normalizeSearch('کباب'), 'Unifies Arabic and Persian/Kurdish kaf');
// Arabic yaa (ي) vs alif maqsura (ى) vs Persian/Kurdish yeh (ی)
assert(normalizeSearch('شاي') === normalizeSearch('شاى'), 'Unifies yaa and alif maqsura');
assert(normalizeSearch('شاي') === normalizeSearch('شای'), 'Unifies Arabic and Kurdish yaa');

// 5. Eastern Arabic & Persian/Kurdish Numerals
// ١٠٠ (Arabic-Indic 100) -> 100
assert(normalizeSearch('١٠٠ غرام') === '100 غرام', 'Converts Eastern Arabic numerals to latin digits');
// ۱۰۰ (Persian-Indic 100) -> 100
assert(normalizeSearch('۱۰۰ گرام') === '100 گرام', 'Converts Persian/Kurdish numerals to latin digits');
assert(normalizeSearch('وجبة رقم ٣') === normalizeSearch('وجبة رقم 3'), 'Query with numeral matches query with latin digit');

console.log('All search normalization tests passed successfully.');
