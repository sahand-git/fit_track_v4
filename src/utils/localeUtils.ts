/**
 * Normalizes text for search, supporting Latin, Arabic, and Kurdish Sorani text.
 * Strips Arabic diacritics/tashkeel/tatweel, normalizes character variants (alef, kaf, yeh),
 * and converts Eastern Arabic and Persian/Kurdish numerals to Latin digits.
 */
export function normalizeSearch(text: string): string {
  if (!text) return '';
  return text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ك/g, 'ک')
    .replace(/[يى]/g, 'ی')
    .replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 0x06f0))
    .replace(/\s+/g, ' ')
    .trim();
}
