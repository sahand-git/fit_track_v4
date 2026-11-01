import { AppLanguage } from '../types';
import { validateLanguageScript, getLanguageSystemInstruction } from '../utils/aiLanguageValidation';
import {
  executeGeminiRequest,
  FetchFunction,
  WaitFunction,
} from '../utils/geminiCore';

export function generateLocalCoachAdvice(
  context: {
    name?: string;
    goal?: string;
    targetCalories?: number;
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    waterGlasses?: number;
    burnedCalories?: number;
    workouts?: string;
  },
  language: AppLanguage
): string {
  const calDiff = (context.calories || 0) - (context.targetCalories || 2000);
  if (language === 'ckb') {
    let advice = 'تێبینی: ئەم پێداچوونەوەیە بە شێوازی ناوخۆیی ئامادەکراوە چون وەڵامی ژیری دەستکرد بە زمانی داواکراو نەبوو.\n\n';
    advice += `سڵاو ${context.name || 'بەڕێز'}، بەپێی تۆماری ئەمڕۆت:\n`;
    advice += `- کالۆری: ${context.calories || 0} لە ${context.targetCalories || 2000} kcal (${calDiff <= 0 ? 'لە سنووری ئامانجەکەتدایە' : 'زیاتر لە ئامانجەکەت'}).\n`;
    advice += `- پرۆتین: ${context.protein || 0}g، کاربۆهیدرات: ${context.carbs || 0}g، چەوری: ${context.fat || 0}g.\n`;
    advice += `- ئاو: ${context.waterGlasses || 0} پەرداخ.\n`;
    if (context.workouts) {
      advice += `- ڕاهێنان: ${context.workouts}.\n`;
    }
    advice += 'پێشنیار: بەردەوام بە لەسەر جێبەجێکردنی هاوسەنگی خۆراکی و پێدانی گرنگی بە خواردنەوەی ئاوی پێویست و خۆراکی دەوڵەمەند بە پرۆتین.';
    return advice;
  }
  if (language === 'ar') {
    let advice = 'ملاحظة: تم إنشاء هذه المراجعة باستخدام الإرشادات المحلية لأن استجابة الذكاء الاصطناعي لم تكن باللغة المطلوبة.\n\n';
    advice += `مرحباً ${context.name || ''}، بناءً على بيانات اليوم:\n`;
    advice += `- السعرات الحرارية: ${context.calories || 0} من أصل ${context.targetCalories || 2000} سعرة (${calDiff <= 0 ? 'ضمن النطاق المستهدف' : 'أعلى من المستهدف'}).\n`;
    advice += `- البروتين: ${context.protein || 0} غرام، الكاربوهيدرات: ${context.carbs || 0} غرام، الدهون: ${context.fat || 0} غرام.\n`;
    advice += `- الماء: ${context.waterGlasses || 0} أكواب.\n`;
    if (context.workouts) {
      advice += `- التمارين: ${context.workouts}.\n`;
    }
    advice += 'نصيحة عامة: حافظ على توازن السعرات والتركيز على مصادر البروتين وشرب كميات كافية من الماء لدعم طاقتك.';
    return advice;
  }
  let advice = 'Note: Using local coaching guidelines as the AI response was not in the requested language.\n\n';
  advice += `Hello ${context.name || 'there'}, based on your logged intake:\n`;
  advice += `- Calories: ${context.calories || 0} / ${context.targetCalories || 2000} kcal (${calDiff <= 0 ? 'within your target' : 'above your target'}).\n`;
  advice += `- Protein: ${context.protein || 0}g, Carbs: ${context.carbs || 0}g, Fat: ${context.fat || 0}g.\n`;
  advice += `- Water: ${context.waterGlasses || 0} glasses.\n`;
  if (context.workouts) {
    advice += `- Workouts: ${context.workouts}.\n`;
  }
  advice += 'Suggestion: Focus on balanced nutrition, adequate hydration, and meeting your daily protein targets.';
  return advice;
}

export async function askNutritionCoach(
  message: string,
  context: {
    name: string;
    goal: string;
    targetCalories: number;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    waterGlasses: number;
    burnedCalories?: number;
    workouts?: string;
  },
  language: AppLanguage | string,
  customFetch?: FetchFunction,
  customWait?: WaitFunction,
  apiKeyGetter?: () => Promise<string | null>
): Promise<string> {
  const langCode: AppLanguage =
    language === 'ar' || language === 'Arabic'
      ? 'ar'
      : language === 'ckb' || language === 'Sorani Kurdish' || language === 'Kurdish'
      ? 'ckb'
      : 'en';

  const systemInstruction = getLanguageSystemInstruction(langCode);
  const languageTargetDescription =
    langCode === 'ckb'
      ? 'Sorani Kurdish (Central Kurdish, Arabic script; not Kurmanji; not Arabic)'
      : langCode === 'ar'
      ? 'Modern Standard Arabic (العربية)'
      : 'English';

  const languageRule =
    langCode === 'ckb'
      ? 'LANGUAGE RULE: You must respond exclusively in Sorani Kurdish (Central Kurdish, Arabic script; not Kurmanji; not Arabic). Do not output English or Latin words. Keep numbers and unit symbols standard.'
      : langCode === 'ar'
      ? 'LANGUAGE RULE: You must respond exclusively in Modern Standard Arabic (العربية). Do not output English or Latin words. Keep numbers and unit symbols standard.'
      : 'LANGUAGE RULE: Respond in English. Keep numbers and unit symbols standard.';

  const prompt = `${languageRule}

You are a supportive nutrition and fitness coach. Give brief, practical, nonjudgmental general education. You are not a medical professional: do not diagnose, prescribe supplements, or recommend extreme restriction. Clearly say when the log is too limited to conclude anything. Keep numbers and units (e.g. kcal, g). User context: ${JSON.stringify(context)}. User message: ${JSON.stringify(message)}`;

  const text = await executeGeminiRequest(
    [{ text: prompt }],
    false,
    undefined,
    customFetch,
    customWait,
    apiKeyGetter,
    undefined,
    undefined,
    undefined,
    systemInstruction,
    langCode
  );

  const validation = validateLanguageScript(text, langCode);
  if (!validation.isValid && (langCode === 'ar' || langCode === 'ckb')) {
    const strongerPrompt = `CRITICAL LANGUAGE REQUIREMENT: Your previous response was rejected because it contained English or invalid script (${Math.round(validation.ratio * 100)}% Arabic script).
You MUST reply exclusively in ${languageTargetDescription}. Do not output any English words.

${prompt}`;

    try {
      const retryText = await executeGeminiRequest(
        [{ text: strongerPrompt }],
        false,
        undefined,
        customFetch,
        customWait,
        apiKeyGetter,
        undefined,
        undefined,
        undefined,
        systemInstruction,
        langCode
      );
      const retryValidation = validateLanguageScript(retryText, langCode);
      if (retryValidation.isValid) {
        return retryText;
      }
    } catch {
      // Retry failed, fall back below
    }

    // Both attempts failed script validation -> fall back to local offline review in right language and tell user
    return generateLocalCoachAdvice(context, langCode);
  }

  return text;
}
