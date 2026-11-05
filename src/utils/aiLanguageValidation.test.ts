import {
  validateLanguageScript,
  validateReportLanguage,
  getLanguageSystemInstruction,
} from './aiLanguageValidation';
import { AICoachReport } from '../types';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

console.log('Testing aiLanguageValidation utility...');

// 1. English text rejected for Arabic and Kurdish Sorani
{
  const englishText = 'You ate 2,100 calories today, with 160g protein and 200g carbs. Great job!';
  const arVal = validateLanguageScript(englishText, 'ar');
  assert(!arVal.isValid, 'English text must fail validation for Arabic');
  assert(arVal.ratio === 0, `English text should have 0 Arabic script ratio, got ${arVal.ratio}`);

  const ckbVal = validateLanguageScript(englishText, 'ckb');
  assert(!ckbVal.isValid, 'English text must fail validation for Kurdish Sorani');
  assert(ckbVal.ratio === 0, `English text should have 0 Arabic script ratio, got ${ckbVal.ratio}`);
}

// 2. Arabic text passes validation
{
  const arabicText = 'تناولت اليوم ٢١٠٠ سعرة حرارية مع ١٦٠ غم بروتين و٢٠٠ غم كربوهيدرات. أداء ممتاز!';
  const val = validateLanguageScript(arabicText, 'ar');
  assert(val.isValid, 'Arabic text must pass validation for Arabic');
  assert(val.ratio > 0.70, `Expected ratio > 0.70, got ${val.ratio}`);
}

// 3. Kurdish Sorani text passes validation
{
  const soraniText = 'ئەمڕۆ ٢١٠٠ کالۆریت بەکارهێناوە لەگەڵ ١٦٠ گرام پرۆتین و ٢٠٠ گرام کاربۆهیدرات. دەستخۆش!';
  const val = validateLanguageScript(soraniText, 'ckb');
  assert(val.isValid, 'Sorani Kurdish text must pass validation for ckb');
  assert(val.ratio > 0.70, `Expected ratio > 0.70, got ${val.ratio}`);
}

// 4. Mixed Arabic/Kurdish with standard units (e.g. g, kcal) passes
{
  const mixedText = '١٥٠g پرۆتین، ٥٠g چەوری، و ٢٠٠ kcal سووتاندن لە کاتی ڕاهێنان';
  const val = validateLanguageScript(mixedText, 'ckb');
  assert(val.isValid, 'Mixed text with unit abbreviations must pass >= 70% threshold');
}

// 5. English language bypasses script check
{
  const englishText = 'Great nutrition compliance today!';
  const val = validateLanguageScript(englishText, 'en');
  assert(val.isValid, 'English language must return valid: true');
  assert(val.ratio === 1.0, 'English language should return ratio 1.0');
}

// 6. validateReportLanguage catches English fields in Arabic/Kurdish reports
{
  const englishReport: Omit<AICoachReport, 'generatedAt'> = {
    overallGrade: 'A',
    headline: 'Great job hitting your macros',
    caloricBalance: '2100 / 2100 kcal consumed',
    macroBreakdown: 'Protein target met',
    mistakesAndBlindSpots: ['Hydration was slightly low'],
    actionableTomorrowFixes: ['Drink 2 more glasses of water'],
    customMealSuggestion: 'Grilled chicken salad',
    coachNote: 'Keep up the good work!',
  };
  assert(!validateReportLanguage(englishReport, 'ar').isValid, 'English report must fail Arabic validation');
  assert(!validateReportLanguage(englishReport, 'ckb').isValid, 'English report must fail Kurdish validation');

  const kurdishReport: Omit<AICoachReport, 'generatedAt'> = {
    overallGrade: 'A',
    headline: 'ئاستی خۆراکی نایاب و گونجاو لەگەڵ ئامانجەکانت',
    caloricBalance: '٢١٠٠ لە ٢١٠٠ کالۆری بەکارهاتووە',
    macroBreakdown: 'پرۆتین: ١٦٠g | کاربۆهیدرات: ٢٠٠g',
    mistakesAndBlindSpots: ['خواردنەوەی ئاو کەمێک کەم بووە'],
    actionableTomorrowFixes: ['سبەی بە دوو پەرداخ ئاو دەستپێبکە'],
    customMealSuggestion: 'سنگی مریشکی برژاو لەگەڵ سەوزەوات',
    coachNote: 'بەردەوامی لە جێبەجێکردنی پلانەکە کلیلە بۆ ئەنجامی هەمیشەیی!',
  };
  assert(validateReportLanguage(kurdishReport, 'ckb').isValid, 'Kurdish report must pass Kurdish validation');
}

// 7. System instructions check
{
  const ckbInstr = getLanguageSystemInstruction('ckb');
  assert(
    ckbInstr.includes('Sorani Kurdish (Central Kurdish, Arabic script; not Kurmanji; not Arabic)'),
    'Kurdish instruction must specify Sorani Kurdish (Central Kurdish, Arabic script; not Kurmanji; not Arabic)'
  );
  assert(
    ckbInstr.includes('Keep JSON keys in English'),
    'Instruction must specify keeping JSON keys in English'
  );
}

console.log('All aiLanguageValidation tests passed cleanly!');
