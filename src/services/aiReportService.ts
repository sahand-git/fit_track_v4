import { AICoachReport, DailyLog, UserProfile, AppLanguage } from '../types';
import { executeGeminiRequest } from '../utils/geminiCore';
import { FetchFunction } from '../utils/geminiModels';
import { getDailyEffectiveCalorieTarget } from '../utils/activityBudget';

/**
 * Validates and parses raw Gemini JSON response into an AICoachReport structure.
 */
export function parseCoachResult(rawText: string): Omit<AICoachReport, 'generatedAt'> {
  const cleaned = rawText
    .replace(/^```json/g, '')
    .replace(/^```/g, '')
    .replace(/```$/g, '')
    .trim();

  let data: any;
  try {
    data = JSON.parse(cleaned);
  } catch {
    throw new Error('Gemini returned an invalid report format.');
  }

  const stringFields = [
    'overallGrade',
    'headline',
    'caloricBalance',
    'macroBreakdown',
    'customMealSuggestion',
    'coachNote',
  ];

  for (const f of stringFields) {
    if (typeof data?.[f] !== 'string' || !data[f].trim()) {
      throw new Error(`Gemini returned an incomplete report (missing or invalid "${f}").`);
    }
  }

  const arrayFields = ['mistakesAndBlindSpots', 'actionableTomorrowFixes'];
  for (const f of arrayFields) {
    if (
      !Array.isArray(data?.[f]) ||
      data[f].some((item: any) => typeof item !== 'string' || !item.trim())
    ) {
      throw new Error(`Gemini returned an incomplete report (invalid list in "${f}").`);
    }
  }

  return {
    overallGrade: data.overallGrade.trim(),
    headline: data.headline.trim(),
    caloricBalance: data.caloricBalance.trim(),
    macroBreakdown: data.macroBreakdown.trim(),
    mistakesAndBlindSpots: data.mistakesAndBlindSpots.map((s: string) => s.trim()),
    actionableTomorrowFixes: data.actionableTomorrowFixes.map((s: string) => s.trim()),
    customMealSuggestion: data.customMealSuggestion.trim(),
    coachNote: data.coachNote.trim(),
  };
}

/**
 * Generates an evidence-based daily nutrition & activity audit when offline or no Gemini key is set.
 */
export function generateFallbackDailyReport(
  profile: UserProfile,
  log: DailyLog,
  language: AppLanguage = 'en'
): AICoachReport {
  const totalCalories = log.meals.reduce((sum, m) => sum + m.calories, 0);
  const totalProtein = Math.round(log.meals.reduce((sum, m) => sum + m.protein, 0) * 10) / 10;
  const totalCarbs = Math.round(log.meals.reduce((sum, m) => sum + m.carbs, 0) * 10) / 10;
  const totalFat = Math.round(log.meals.reduce((sum, m) => sum + m.fat, 0) * 10) / 10;
  const waterTarget = profile.waterTargetGlasses || 8;
  const targetCalories = getDailyEffectiveCalorieTarget(profile, log);
  const targetProtein = profile.targetProtein || 140;

  const calDiff = totalCalories - targetCalories;
  const hasMeals = log.meals.length > 0;

  let overallGrade = 'B';
  let headline = '';
  let caloricBalance = '';
  let macroBreakdown = '';
  const mistakesAndBlindSpots: string[] = [];
  const actionableTomorrowFixes: string[] = [];
  let customMealSuggestion = '';
  let coachNote = '';

  const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (!hasMeals) {
    if (language === 'ar') {
      overallGrade = '—';
      headline = 'لم يتم تسجيل وجبات لهذا اليوم';
      caloricBalance = `٠ / ${targetCalories} سعرة حرارية مسجلة.`;
      macroBreakdown = 'سجل وجباتك لتفعيل التحليل الغذائي الذكي وتوزيع الماكروز.';
      mistakesAndBlindSpots.push('لا توجد سجلات طعام كافية لتحليل المغذيات بدقة.');
      actionableTomorrowFixes.push('سجل وجبات الفطور والغداء والعشاء لمتابعة عجز أو فائض الطاقة بدقة.');
      customMealSuggestion = 'صدر دجاج مشوي (١٥٠ غم) مع طبق أرز أسمر (١٥٠ غم) وسلطة خضراء غنية بزيت الزيتون.';
      coachNote = 'التتبع المنتظم هو الخطوة الأساسية للوصول إلى هدفك الرياضي والبدني.';
    } else if (language === 'ckb') {
      overallGrade = '—';
      headline = 'هیچ ژەمێک بۆ ئەم ڕۆژە تۆمار نەکراوە';
      caloricBalance = `٠ / ${targetCalories} کالۆری تۆمارکراوە.`;
      macroBreakdown = 'ژەمەکانت تۆمار بکە بۆ چالاککردنی شیکاری خۆراکی ژیر و دابەشکردنی ماکرۆکان.';
      mistakesAndBlindSpots.push('داتای خۆراکی پێویست نییە بۆ پێداچوونەوەی تەواو.');
      actionableTomorrowFixes.push('ژەمەکانی نانی بەیانی، نیوەڕۆ و ئێوارە تۆمار بکە بۆ بەدواداچوونی وردی کالۆری.');
      customMealSuggestion = 'سنگی مریشکی برژاو (١٥٠ گرام) لەگەڵ برنجی قاوەیی (١٥٠ گرام) و زەڵاتەی سەوز بە زەیتی زەیتوون.';
      coachNote = 'بەردەوامی لە تۆمارکردن هەنگاوی سەرەکییە بۆ گەیشتن بە ئامانجە وەرزشییەکانت.';
    } else {
      overallGrade = '—';
      headline = 'No meals logged for this day';
      caloricBalance = `0 / ${targetCalories} kcal recorded today.`;
      macroBreakdown = 'Log your meals to activate AI nutrition review and macronutrient distribution analysis.';
      mistakesAndBlindSpots.push('No logged food data available to evaluate nutritional balance.');
      actionableTomorrowFixes.push('Log breakfast, lunch, and dinner to accurately track energy balance.');
      customMealSuggestion = 'Grilled chicken breast (150g) with brown rice (150g) and mixed olive oil salad.';
      coachNote = 'Consistent tracking is the foundation of nutritional progress and body composition goals.';
    }

    return {
      overallGrade,
      headline,
      caloricBalance,
      macroBreakdown,
      mistakesAndBlindSpots,
      actionableTomorrowFixes,
      customMealSuggestion,
      coachNote,
      generatedAt: timeStr,
    };
  }

  // Calculate grade based on calorie accuracy and protein adequacy
  const calPercent = Math.abs(calDiff) / targetCalories;
  const proteinPercent = totalProtein / targetProtein;

  if (calPercent <= 0.1 && proteinPercent >= 0.9) {
    overallGrade = 'A+';
  } else if (calPercent <= 0.15 && proteinPercent >= 0.8) {
    overallGrade = 'A';
  } else if (calPercent <= 0.22 && proteinPercent >= 0.7) {
    overallGrade = 'B+';
  } else if (calPercent <= 0.3) {
    overallGrade = 'B';
  } else {
    overallGrade = 'C+';
  }

  if (language === 'ar') {
    headline = overallGrade.startsWith('A')
      ? 'أداء غذائي ممتاز وتوافق عالٍ مع الأهداف'
      : 'يوم جيد مع فرص لتحسين التوازن الغذائي';
    caloricBalance = `${totalCalories} من أصل ${targetCalories} سعرة (${calDiff >= 0 ? '+' : ''}${calDiff} سعرة).`;
    macroBreakdown = `البروتين: ${totalProtein}غم / ${targetProtein}غم | الكاربوهيدرات: ${totalCarbs}غم | الدهون: ${totalFat}غم.`;

    if (proteinPercent < 0.8) {
      mistakesAndBlindSpots.push(`استهلاك البروتين (${totalProtein}غم) أقل من الهدف الموصى به (${targetProtein}غم) للحفاظ على الكتلة العضلية.`);
      actionableTomorrowFixes.push('أضف مصدر بروتين صافٍ (بيض، زبادي يوناني، دجاج، تونة) مع وجبة الفطور أو الغداء.');
    } else {
      mistakesAndBlindSpots.push('البروتين ضمن النطاق المستهدف الممتاز لدعم التعافي العضلي.');
    }

    if (log.waterGlasses < waterTarget) {
      mistakesAndBlindSpots.push(`الترطيب (${log.waterGlasses} أكواب) أقل من الهدف (${waterTarget} أكواب).`);
      actionableTomorrowFixes.push('ابدأ يومك بكوبين من الماء واحتفظ بزجاجة ماء بجانبك طوال اليوم.');
    }

    if (calDiff > 250) {
      mistakesAndBlindSpots.push('تجاوزت السعرات الحرارية المستهدفة بهامش ملحوظ.');
      actionableTomorrowFixes.push('ركز غداً على الألياف والخضار الورقية لزيادة الشعور بالشبع دون سعرات مفرطة.');
    } else if (calDiff < -400) {
      mistakesAndBlindSpots.push('عجز السعرات الحرارية كبير جداً وقد يؤثر سلباً على الطاقة والتعافي.');
      actionableTomorrowFixes.push('أضف وجبة خفيفة غنية بالطاقة مثل المكسرات أو الشوفان للوصول إلى النطاق الصحي.');
    }

    if (actionableTomorrowFixes.length === 0) {
      actionableTomorrowFixes.push('حافظ على نفس خطة الوجبات المتوازنة وحافظ على روتين شرب الماء.');
    }

    customMealSuggestion = 'سمك السلمون المشوي (١٥٠ غم) مع الكينوا المسلوقة والخضروات المطهوة على البخار.';
    coachNote = 'الالتزام التراكمي اليومي هو مفتاح النتائج المستدامة. استمر في هذا الأداء الرائع!';
  } else if (language === 'ckb') {
    headline = overallGrade.startsWith('A')
      ? 'ئاستی خۆراکی نایاب و گونجاو لەگەڵ ئامانجەکانت'
      : 'ڕۆژێکی باش لەگەڵ دەرفەت بۆ باشترکردنی هاوسەنگی خۆراکی';
    caloricBalance = `${totalCalories} لە ${targetCalories} کالۆری (${calDiff >= 0 ? '+' : ''}${calDiff} کالۆری).`;
    macroBreakdown = `پرۆتین: ${totalProtein}گم / ${targetProtein}گم | کاربۆهیدرات: ${totalCarbs}گم | چەوری: ${totalFat}گم.`;

    if (proteinPercent < 0.8) {
      mistakesAndBlindSpots.push(`بڕی پرۆتین (${totalProtein}گم) کەمترە لە ئامانجی پێویست (${targetProtein}گم) بۆ پاراستنی ماسوولکە.`);
      actionableTomorrowFixes.push('سەرچاوەیەکی پرۆتینی خاوێن زیاد بکە (هێلکە، ماستی یۆنانی، مریشک، ماسی تونە) بۆ نانی بەیانی یان نیوەڕۆ.');
    } else {
      mistakesAndBlindSpots.push('پرۆتین لە ئاستێکی نایاب و نموونەییدایە بۆ چاکبوونەوەی ماسوولکەکان.');
    }

    if (log.waterGlasses < waterTarget) {
      mistakesAndBlindSpots.push(`خواردنەوەی ئاو (${log.waterGlasses} پەرداخ) کەمترە لە ئامانجی ڕۆژانە (${waterTarget} پەرداخ).`);
      actionableTomorrowFixes.push('ڕۆژەکەت بە دوو پەرداخ ئاو دەستپێبکە و دەبەیەکی ئاو لە نزیکت دابنێ.');
    }

    if (calDiff > 250) {
      mistakesAndBlindSpots.push('کالۆری بەکارهاتوو زیاتر بووە لە ئامانجی دیاریکراو.');
      actionableTomorrowFixes.push('بەیانی گرنگی زیاتر بە سەوزەوات و ڕیشاڵەکان بدە بۆ تێربوون بە کالۆری کەمتر.');
    } else if (calDiff < -400) {
      mistakesAndBlindSpots.push('کەمی کالۆری زۆر زۆرە و لەوانەیە کاریگەری لەسەر وزە و توانای جەستەت دروست بکات.');
      actionableTomorrowFixes.push('سووکەژەمێکی وزەبەخش وەک چەرەسات یان شۆفان زیاد بکە بۆ گەیشتن بە سنووری تەندروست.');
    }

    if (actionableTomorrowFixes.length === 0) {
      actionableTomorrowFixes.push('بەردەوام بە لەسەر ئەم شێوازە هاوسەنگەی خواردن و پاراستنی ئاستی ئاو.');
    }

    customMealSuggestion = 'ماسی سەلەمۆنی برژاو (١٥٠ گرام) لەگەڵ کینوا و سەوزەواتی کوڵاو.';
    coachNote = 'بەردەوامی لە جێبەجێکردنی پلانەکە کلیلە بۆ ئەنجامی هەمیشەیی و تەندروست!';
  } else {
    headline = overallGrade.startsWith('A')
      ? 'Exceptional nutritional compliance and macro balance'
      : 'Solid progress with opportunities for optimization';
    caloricBalance = `${totalCalories} / ${targetCalories} kcal consumed (${calDiff >= 0 ? '+' : ''}${calDiff} kcal vs goal).`;
    macroBreakdown = `Protein: ${totalProtein}g / ${targetProtein}g | Carbs: ${totalCarbs}g | Fat: ${totalFat}g.`;

    if (proteinPercent < 0.8) {
      mistakesAndBlindSpots.push(`Protein intake (${totalProtein}g) fell below target (${targetProtein}g) needed for lean mass preservation.`);
      actionableTomorrowFixes.push('Add a lean protein anchor (eggs, Greek yogurt, chicken, or tuna) to breakfast or lunch.');
    } else {
      mistakesAndBlindSpots.push('Protein intake met the evidence-based threshold for muscle recovery and satiety.');
    }

    if (log.waterGlasses < waterTarget) {
      mistakesAndBlindSpots.push(`Hydration (${log.waterGlasses} glasses) is below daily target (${waterTarget} glasses).`);
      actionableTomorrowFixes.push('Begin tomorrow with two glasses of water upon waking and keep a water bottle visible.');
    }

    if (calDiff > 250) {
      mistakesAndBlindSpots.push('Total caloric intake exceeded target by a noticeable margin.');
      actionableTomorrowFixes.push('Incorporate high-volume leafy vegetables to enhance fullness with lower energy density.');
    } else if (calDiff < -400) {
      mistakesAndBlindSpots.push('Caloric deficit was steeper than optimal, which may impair metabolic rate and recovery.');
      actionableTomorrowFixes.push('Include a nutrient-dense whole food snack such as raw nuts or oats to reach safe minimum intake.');
    }

    if (actionableTomorrowFixes.length === 0) {
      actionableTomorrowFixes.push('Maintain today’s balanced meal timing, high protein, and hydration pacing tomorrow.');
    }

    customMealSuggestion = 'Pan-seared Atlantic salmon (150g) with steamed quinoa, asparagus, and extra virgin olive oil.';
    coachNote = 'Consistency over time drives sustainable body composition change. Keep up the disciplined execution!';
  }

  return {
    overallGrade,
    headline,
    caloricBalance,
    macroBreakdown,
    mistakesAndBlindSpots,
    actionableTomorrowFixes,
    customMealSuggestion,
    coachNote,
    generatedAt: timeStr,
  };
}

/**
 * Generates an AI daily report using Gemini with automatic fallback.
 */
export async function generateDailyAIReport(
  profile: UserProfile,
  log: DailyLog,
  language: AppLanguage = 'en',
  apiKeyOverride?: string,
  customFetch?: FetchFunction,
  apiKeyGetter?: () => Promise<string | null>
): Promise<AICoachReport> {
  const apiKey = apiKeyOverride || (apiKeyGetter ? await apiKeyGetter() : null);
  if (!apiKey) {
    // Return high-quality evidence-based local report if no key configured
    return generateFallbackDailyReport(profile, log, language);
  }

  const allMeals = log.meals.map((m) => `${m.name} (${m.calories} kcal, ${m.protein}g P, ${m.carbs}g C, ${m.fat}g F)`).join('; ');
  const workouts = (log.workouts || []).map((w) => `${w.name} (${w.durationMinutes} min, ${w.caloriesBurned} kcal)`).join('; ');
  const totalCalories = log.meals.reduce((sum, m) => sum + m.calories, 0);
  const totalProtein = Math.round(log.meals.reduce((sum, m) => sum + m.protein, 0) * 10) / 10;
  const totalCarbs = Math.round(log.meals.reduce((sum, m) => sum + m.carbs, 0) * 10) / 10;
  const totalFat = Math.round(log.meals.reduce((sum, m) => sum + m.fat, 0) * 10) / 10;

  const payload = {
    profile: {
      goal: profile.goal,
      weightKg: profile.weightKg,
      targetWeightKg: profile.targetWeightKg,
      targetCalories: getDailyEffectiveCalorieTarget(profile, log),
      targetProtein: profile.targetProtein,
      targetCarbs: profile.targetCarbs,
      targetFat: profile.targetFat,
      waterTargetGlasses: profile.waterTargetGlasses || 8,
    },
    todayLog: {
      date: log.date,
      totalCalories,
      totalProtein,
      totalCarbs,
      totalFat,
      waterGlasses: log.waterGlasses,
      steps: log.steps,
      meals: allMeals || 'None logged',
      workouts: workouts || 'None logged',
    },
  };

  const languageName = language === 'ar' ? 'Arabic' : language === 'ckb' ? 'Sorani Kurdish' : 'English';

  const prompt = `You are an AI fitness & nutrition coach, not a medical professional. Give balanced general nutrition feedback using only the supplied log; do not invent meals or diagnose conditions. Respect uncertainty and do not recommend extreme restriction.
Return ONLY a JSON object with this exact schema, without markdown backticks or commentary:
{
  "overallGrade": "A+ | A | B+ | B | C+ | C",
  "headline": "Brief 1-line encouraging evaluation headline",
  "caloricBalance": "Summary sentence of calories vs target",
  "macroBreakdown": "Evaluation of protein, carb and fat balance",
  "mistakesAndBlindSpots": ["Observation 1", "Observation 2"],
  "actionableTomorrowFixes": ["Actionable fix 1", "Actionable fix 2"],
  "customMealSuggestion": "A practical whole-food meal suggestion tailored to missing macros",
  "coachNote": "An encouraging 2-sentence closing coach note"
}
If the log is sparse or empty, state so clearly in headline and observations.
Write all text fields in ${languageName}.
Data: ${JSON.stringify(payload)}`;

  try {
    const rawResult = await executeGeminiRequest(
      [{ text: prompt }],
      true,
      apiKey,
      customFetch
    );
    const parsed = parseCoachResult(rawResult);
    return {
      ...parsed,
      generatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
  } catch (err) {
    console.warn('Gemini report generation failed, falling back to local audit:', err);
    return generateFallbackDailyReport(profile, log, language);
  }
}
