/* eslint-disable import/first */
// Mock localStorage for Node test environment
const mockStore: Record<string, string> = {};
(globalThis as any).window = {
  localStorage: {
    getItem: (k: string) => mockStore[k] ?? null,
    setItem: (k: string, v: string) => { mockStore[k] = String(v); },
    removeItem: (k: string) => { delete mockStore[k]; },
    clear: () => { Object.keys(mockStore).forEach((k) => delete mockStore[k]); },
    key: (i: number) => Object.keys(mockStore)[i] ?? null,
    get length() { return Object.keys(mockStore).length; },
  },
};

import {
  parseCoachResult,
  generateFallbackDailyReport,
  generateDailyAIReport,
} from './aiReportService';
import { loadDailyLog, saveDailyAIReport } from '../storage/storage';
import { validateBackup } from '../utils/backupCore';
import { getDefaultProfile } from '../utils/calculator';
import { translate } from '../i18n/strings';
import { AICoachReport, DailyLog, FitTrackBackup, LoggedMeal } from '../types';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runAIReportTests() {
  console.log('Starting AI Daily Report (A6) Unit Tests...');

  const mockProfile = {
    ...getDefaultProfile(),
    targetCalories: 2000,
    targetProtein: 150,
    targetCarbs: 200,
    targetFat: 60,
    waterTargetGlasses: 8,
    weightKg: 75,
  };

  const sampleMeal: LoggedMeal = {
    id: 'meal_1',
    foodId: 'food_1',
    name: 'Grilled Chicken & Rice',
    mealType: 'lunch',
    servings: 1,
    servingSize: '1 plate',
    servingGrams: 300,
    calories: 600,
    protein: 45,
    carbs: 65,
    fat: 12,
    timestamp: new Date().toISOString(),
  };

  // 1. parseCoachResult tests
  {
    const validJson = JSON.stringify({
      overallGrade: 'A',
      headline: 'Excellent macro compliance and balanced deficit',
      caloricBalance: '1850 / 2000 kcal consumed (150 kcal deficit).',
      macroBreakdown: 'Protein targets hit with balanced complex carbohydrates.',
      mistakesAndBlindSpots: ['Hydration lagged slightly behind in the afternoon.'],
      actionableTomorrowFixes: ['Drink 500ml water before 10 AM.'],
      customMealSuggestion: 'Greek yogurt parfait with blueberries and walnuts.',
      coachNote: 'Strong consistency today, keep momentum tomorrow!',
    });

    // Test raw JSON and markdown code fence variants
    const parsed1 = parseCoachResult(validJson);
    assert(parsed1.overallGrade === 'A', 'Grade should match');
    assert(parsed1.headline.includes('Excellent'), 'Headline should match');
    assert(parsed1.mistakesAndBlindSpots.length === 1, 'Observations count should match');

    const parsedWithFences = parseCoachResult(`\`\`\`json\n${validJson}\n\`\`\``);
    assert(parsedWithFences.overallGrade === 'A', 'Markdown fences should be stripped');

    // Test missing string field
    let threw = false;
    try {
      parseCoachResult(JSON.stringify({ headline: 'Only headline' }));
    } catch {
      threw = true;
    }
    assert(threw, 'Should throw if required fields missing');

    // Test invalid array field
    threw = false;
    try {
      parseCoachResult(JSON.stringify({
        overallGrade: 'A',
        headline: 'Good',
        caloricBalance: 'Good',
        macroBreakdown: 'Good',
        mistakesAndBlindSpots: 'not an array',
        actionableTomorrowFixes: [],
        customMealSuggestion: 'Meal',
        coachNote: 'Note',
      }));
    } catch {
      threw = true;
    }
    assert(threw, 'Should throw if mistakesAndBlindSpots is not a valid string array');

    console.log('✓ parseCoachResult validation tested successfully.');
  }

  // 2. generateFallbackDailyReport tests
  {
    const emptyLog: DailyLog = {
      date: '2026-10-15',
      meals: [],
      waterGlasses: 0,
      steps: 0,
    };

    // Empty log fallback
    const emptyReportEn = generateFallbackDailyReport(mockProfile, emptyLog, 'en');
    assert(emptyReportEn.overallGrade === '—', 'Empty log grade should be dash');
    assert(emptyReportEn.headline.length > 0, 'Empty log should have headline');
    assert(emptyReportEn.mistakesAndBlindSpots.length > 0, 'Empty log should have observation');

    const emptyReportAr = generateFallbackDailyReport(mockProfile, emptyLog, 'ar');
    assert(emptyReportAr.headline.includes('لم يتم تسجيل'), 'Arabic empty headline expected');

    const emptyReportCkb = generateFallbackDailyReport(mockProfile, emptyLog, 'ckb');
    assert(emptyReportCkb.headline.includes('هیچ ژەمێک'), 'Kurdish empty headline expected');

    // Active compliant log
    const compliantLog: DailyLog = {
      date: '2026-10-15',
      meals: [
        { ...sampleMeal, calories: 1000, protein: 75, carbs: 100, fat: 30 },
        { ...sampleMeal, id: 'm2', calories: 950, protein: 70, carbs: 90, fat: 28 },
      ],
      waterGlasses: 8,
      steps: 8500,
    };

    const compliantReport = generateFallbackDailyReport(mockProfile, compliantLog, 'en');
    assert(compliantReport.overallGrade.startsWith('A'), 'Compliant log should receive grade A/A+');
    assert(compliantReport.mistakesAndBlindSpots.length > 0, 'Should have observations');
    assert(compliantReport.actionableTomorrowFixes.length > 0, 'Should have action fixes');
    assert(compliantReport.customMealSuggestion.length > 0, 'Should have meal suggestion');

    console.log('✓ generateFallbackDailyReport tested across scenarios.');
  }

  // 3. generateDailyAIReport tests (offline fallback & mock fetch)
  {
    const testLog: DailyLog = {
      date: '2026-10-15',
      meals: [sampleMeal],
      waterGlasses: 6,
      steps: 7000,
    };

    // No key: should fall back to local report cleanly
    const reportNoKey = await generateDailyAIReport(mockProfile, testLog, 'en', '');
    assert(reportNoKey.overallGrade.length > 0, 'Should return fallback report without key');
    assert(reportNoKey.generatedAt.length > 0, 'Should have generatedAt timestamp');

    // Mock successful Gemini response
    const mockGeminiJson = JSON.stringify({
      overallGrade: 'B+',
      headline: 'Solid energy balance with high protein consistency',
      caloricBalance: '600 / 2000 kcal logged so far.',
      macroBreakdown: 'Protein ratio is high, need complex carbohydrates for dinner.',
      mistakesAndBlindSpots: ['Evening meal still needs to be logged.'],
      actionableTomorrowFixes: ['Add whole grains and greens to dinner.'],
      customMealSuggestion: 'Baked salmon with roasted asparagus.',
      coachNote: 'Great start to the day. Keep tracking your evening intake.',
    });

    const mockFetch: any = async (url: string) => {
      if (url.includes('/models?')) {
        return new Response(
          JSON.stringify({
            models: [
              {
                name: 'models/gemini-2.5-flash',
                supportedGenerationMethods: ['generateContent'],
              },
            ],
          }),
          { status: 200 }
        );
      }
      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [{ text: mockGeminiJson }],
              },
              finishReason: 'STOP',
            },
          ],
        }),
        { status: 200 }
      );
    };

    const geminiReport = await generateDailyAIReport(
      mockProfile,
      testLog,
      'en',
      'test-api-key',
      mockFetch
    );
    assert(geminiReport.overallGrade === 'B+', 'Gemini grade parsed correctly');
    assert(geminiReport.headline.includes('Solid energy balance'), 'Gemini headline parsed');

    console.log('✓ generateDailyAIReport with Gemini and local fallback tested.');
  }

  // 4. Storage & Backup validation tests
  {
    (globalThis as any).window.localStorage.clear();

    const sampleReport: AICoachReport = {
      overallGrade: 'A',
      headline: 'Perfect Day',
      caloricBalance: '2000 / 2000 kcal',
      macroBreakdown: 'P: 150g, C: 200g, F: 60g',
      mistakesAndBlindSpots: ['None'],
      actionableTomorrowFixes: ['Repeat routine tomorrow'],
      customMealSuggestion: 'Chicken breast and sweet potato',
      coachNote: 'Outstanding work!',
      generatedAt: '12:00 PM',
    };

    await saveDailyAIReport('2026-10-15', sampleReport);
    const loadedLog = await loadDailyLog('2026-10-15');
    assert(loadedLog.aiReport !== undefined, 'Loaded log should contain aiReport');
    assert(loadedLog.aiReport?.overallGrade === 'A', 'Loaded aiReport grade should match');
    assert(loadedLog.aiReport?.headline === 'Perfect Day', 'Loaded headline should match');

    // Backup validation
    const backup: FitTrackBackup = {
      version: '4.0',
      exportedAt: new Date().toISOString(),
      profile: mockProfile,
      dailyLogs: {
        '2026-10-15': loadedLog,
      },
      weightHistory: [],
      supplementRoutine: [],
    };

    const validated = validateBackup(backup);
    assert(validated.dailyLogs['2026-10-15'] !== undefined, 'Backup should have daily log for date');
    assert(validated.dailyLogs['2026-10-15'].aiReport?.overallGrade === 'A', 'Backup should preserve aiReport');

    console.log('✓ Storage persistence and Backup schema validation verified with aiReport.');
  }

  // 5. Localization coverage
  {
    const requiredKeys = [
      'Daily Review & Guidance',
      'Daily Review',
      'Ask Nutritionist',
      'Get Daily Review',
      'Update review for selected day',
      'Analyzing...',
      'Analyzing Nutrition...',
      'Nutrition Observations & Opportunities',
      'Macro Execution',
      'Action Plan for Tomorrow',
      'Meal idea for selected day',
      'Coach Note',
      'Intake overview for selected day',
      'No report generated for this day yet.',
      'Tap "Get Daily Review" to synthesize an AI-powered nutrition and activity audit for today.',
      'Status',
      'Generated at ',
      'Could not generate report. Please try again.',
      'protein',
      'carbs',
      'fat',
    ];

    for (const key of requiredKeys) {
      for (const lang of ['ar', 'ckb'] as const) {
        const translated = translate(lang, key);
        assert(
          translated.length > 0 && translated !== key,
          `Missing ${lang} translation for AI Daily Report string: "${key}"`
        );
      }
    }
    console.log(`✓ Localization verified for all ${requiredKeys.length} strings in Arabic and Kurdish Sorani.`);
  }

  console.log('All AI Daily Report (A6) tests passed successfully!');
}

runAIReportTests().catch((err) => {
  console.error('AI Daily Report test failed:', err);
  process.exit(1);
});
