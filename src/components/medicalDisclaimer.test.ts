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
  loadMedicalDisclaimerAccepted,
  saveMedicalDisclaimerAccepted,
  loadUserProfile,
} from '../storage/storage';
import { validateBackup } from '../utils/backupCore';
import { getDefaultProfile } from '../utils/calculator';
import { translate } from '../i18n/strings';
import { FitTrackBackup } from '../types';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runMedicalDisclaimerTests() {
  console.log('Starting Medical Disclaimer & Scientific References Unit Tests...');

  // 1. Default profile state
  {
    const defaultProf = getDefaultProfile();
    assert(defaultProf.hasAcceptedMedicalDisclaimer === false, 'Default profile disclaimer should be false');
    console.log('✓ Default profile disclaimer verified');
  }

  // 2. Storage persistence test
  {
    (globalThis as any).window.localStorage.clear();
    const initial = await loadMedicalDisclaimerAccepted();
    assert(initial === false, 'Initial disclaimer acceptance should be false');

    await saveMedicalDisclaimerAccepted(true);
    const accepted = await loadMedicalDisclaimerAccepted();
    assert(accepted === true, 'Disclaimer acceptance should be saved as true');

    const profile = await loadUserProfile();
    assert(profile.hasAcceptedMedicalDisclaimer === true, 'UserProfile should reflect disclaimer acceptance');

    await saveMedicalDisclaimerAccepted(false);
    const reverted = await loadMedicalDisclaimerAccepted();
    assert(reverted === false, 'Disclaimer acceptance should revert to false');
    console.log('✓ Disclaimer storage and profile synchronization verified');
  }

  // 3. Backup & Restore schema validation
  {
    const baseBackup: FitTrackBackup = {
      version: '4.0',
      exportedAt: '2026-10-15T00:00:00.000Z',
      profile: {
        ...getDefaultProfile(),
        language: 'en',
        hasAcceptedMedicalDisclaimer: true,
      },
      dailyLogs: {},
      supplementRoutine: [],
      weightHistory: [],
    };

    const validated = validateBackup(baseBackup);
    assert(validated.profile.hasAcceptedMedicalDisclaimer === true, 'Validated backup must preserve hasAcceptedMedicalDisclaimer');

    const unacceptedBackup: FitTrackBackup = {
      ...baseBackup,
      profile: {
        ...getDefaultProfile(),
        hasAcceptedMedicalDisclaimer: false,
      },
    };
    const validatedUnaccepted = validateBackup(unacceptedBackup);
    assert(validatedUnaccepted.profile.hasAcceptedMedicalDisclaimer === false, 'Validated backup must preserve false hasAcceptedMedicalDisclaimer');
    console.log('✓ Backup validation with medical disclaimer verified');
  }

  // 4. Localization completeness
  {
    const testKeys = [
      'Evidence & Safety',
      'Medical Disclaimer',
      'Educational wellness notice & emergency guidance',
      'Scientific References',
      'Equations, clinical sources, & nutritional databases',
      'Medical & Health Disclaimer',
      'Important health advisory & safety protocols',
      'FitTrack is designed strictly for educational and wellness tracking purposes. It does not provide medical diagnosis, treatment, or therapy.',
      '1. Not a Substitute for Medical Care',
      'FitTrack and its AI features are informational tools for tracking daily nutrition, hydration, and physical activity. Nothing contained in this application constitutes medical advice, nor does using FitTrack establish a doctor-patient relationship.',
      '2. Consult a Licensed Physician First',
      'Always consult your physician, doctor, or a certified registered dietitian before starting any calorie restriction, aggressive weight loss, intermittent fasting, dietary supplement routine, or strenuous exercise regimen. This is especially vital if you have cardiovascular disease, diabetes, hypertension, kidney disease, are pregnant, or nursing.',
      '3. Emergency Situations & Distress',
      'If you experience chest pain, sudden shortness of breath, dizziness, faintness, heart palpitations, or severe discomfort while exercising or following a diet, stop immediately and contact your local emergency medical services. Never ignore acute bodily symptoms.',
      '4. Nutritional & Caloric Approximations',
      'Calorie budgets, macronutrient ratios, BMR/TDEE equations, barcode nutrition data, and AI meal scans are statistical approximations based on public scientific datasets (USDA, Open Food Facts). Real metabolic expenditure and food composition naturally vary.',
      'I Understand & Agree',
      'I Understand',
      'Evidence-Based',
      'Formulas, clinical standards, and food databases used in FitTrack',
      '1. Food & Nutritional Database Sources',
      'Food logs and barcode scans rely on validated public nutritional repositories. Custom entries and AI meal plate scans are practical estimates, not clinical laboratory assays:',
      'Open Food Facts Global Database',
      'Barcode lookups query Open Food Facts API v2. Provides Nutri-Score, NOVA food processing classifications, and manufacturer package nutrition panels.',
      'USDA FoodData Central (Standard Reference Legacy)',
      'United States Department of Agriculture. Standardized macro and micronutrient density per 100g for whole foods, meats, grains, fruits, and raw produce.',
      'Food Moisture States (Raw vs. Cooked)',
      'Nutrient density changes during cooking due to water evaporation or oil absorption (e.g. 100g raw chicken breast yields ~75g cooked with higher protein density).',
      'Gemini AI Nutrition & Plate Parser',
      'Decomposes natural language meal descriptions and photos into ingredient estimates mapped to USDA reference nutrient profiles for logging convenience.',
      '2. Workout Energy & MET Calculations',
      'Exercise calorie expenditure uses the 2024 Adult Compendium of Physical Activities (Ainsworth BE et al., Medicine & Science in Sports & Exercise):',
      'Standard Metabolic Equivalent Equation (MET):',
      'Calories Burned (kcal) = (MET × 3.5 × Weight in kg ÷ 200) × Duration in min',
      '1 MET = resting oxygen consumption (3.5 ml O₂ · kg⁻¹ · min⁻¹). Net exercise burn subtracts resting metabolic baseline during the workout.',
      '3. BMR & TDEE Equations',
      'Basal Metabolic Rate is calculated using the Mifflin-St Jeor Equation (1990), validated by the Academy of Nutrition and Dietetics as the most accurate clinical formula:',
      'Men: BMR = (10 × weight in kg) + (6.25 × height in cm) - (5 × age) + 5',
      'Women: BMR = (10 × weight in kg) + (6.25 × height in cm) - (5 × age) - 161',
      'TDEE = BMR × Physical Activity Factor (Sedentary: 1.2, Light: 1.375, Moderate: 1.55, Heavy: 1.725, Athlete: 1.9).',
      '4. Pedometer & Step Caloric Expenditure',
      'Step energy consumption is modeled using American College of Sports Medicine (ACSM) and Harvard Health caloric stride standards:',
      'Step Calories (kcal) = Steps × 0.042 × (User Weight in kg ÷ 70)',
      'Deduplication prevents double-counting by subtracting steps taken during logged ambulatory workouts (runs, walks, treadmill).',
      '5. Macronutrient Distribution Targets',
      'Daily protein targets (1.6g – 2.2g per kg bodyweight) adhere to the International Society of Sports Nutrition (ISSN) Position Stand (Jäger et al., 2017) to support muscle protein synthesis and lean mass preservation during calorie deficits.',
      '6. Micronutrient RDA & Supplement Safety',
      'Vitamin and mineral Recommended Dietary Allowances (RDA) and Tolerable Upper Intake Levels (UL) are referenced from the National Institutes of Health (NIH) Office of Dietary Supplements and the Institute of Medicine (IOM) Dietary Reference Intakes.',
      'Close Reference Sheet',
    ];

    for (const key of testKeys) {
      assert(translate('ar', key) !== key, `Missing Arabic translation for: ${key}`);
      assert(translate('ckb', key) !== key, `Missing Kurdish Sorani translation for: ${key}`);
    }
    console.log(`✓ All ${testKeys.length} medical and scientific strings translated in Arabic and Kurdish Sorani`);
  }

  console.log('All Medical Disclaimer & Scientific References unit tests passed successfully!');
}

runMedicalDisclaimerTests().catch((err) => {
  console.error('Medical disclaimer tests failed:', err);
  process.exit(1);
});
