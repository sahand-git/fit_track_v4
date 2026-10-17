import { translations } from './strings';

const localeKeys = [...new Set([...Object.keys(translations.ar), ...Object.keys(translations.ckb)])];
const missingArabic = localeKeys.filter((key) => !translations.ar[key]?.trim());
const missingSorani = localeKeys.filter((key) => !translations.ckb[key]?.trim());

if (missingArabic.length) throw new Error(`Arabic translations are missing: ${missingArabic.join(', ')}`);
if (missingSorani.length) throw new Error(`Sorani translations are missing: ${missingSorani.join(', ')}`);
console.log(`Localization coverage check passed (${localeKeys.length} translated strings).`);
