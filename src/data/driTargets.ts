/**
 * Dietary Reference Intakes (DRIs) Engine
 * Source Authority: National Academies of Sciences, Engineering, and Medicine (NASEM)
 * (Formerly Institute of Medicine [IOM], Food and Nutrition Board)
 *
 * Implements adult (19+) age- and sex-stratified Recommended Dietary Allowances (RDA),
 * Adequate Intakes (AI), and Tolerable Upper Intake Levels (UL).
 *
 * Rules:
 * - Adults 19+ only; for users < 19, no adult targets are returned.
 * - Male/Female age bands: 19-30, 31-50, 51-70, 71+.
 * - Gender 'other' or missing receives clearly labelled General Adult targets.
 * - Pregnancy, lactation, and clinical medical conditions are NOT handled.
 * - Tolerable Upper Intake Levels (UL) are toxicity ceilings, NEVER goals.
 * - Supplement-only limits (Magnesium, Niacin, Folate, Vitamin E) are never compared against total food intake.
 */

export type DriTargetType = 'RDA' | 'AI';

export type UpperLimitScope = 'all_sources' | 'supplements_only' | 'synthetic_only';

export type DriAgeBand = '19-30' | '31-50' | '51-70' | '71+';

export interface DriTargetResult {
  nutrientKey: string;
  target?: number;
  targetType?: DriTargetType;
  unit: 'mg' | 'mcg' | 'g' | 'kcal';
  isAdult: boolean;
  ageBand?: DriAgeBand;
  genderApplied: 'male' | 'female' | 'general_adult';
  upperLimit?: number;
  upperLimitScope?: UpperLimitScope;
  upperLimitDescription?: string;
  citation: string;
  disclaimer: string;
}

export interface UpperLimitEvaluation {
  exceeds: boolean;
  applicableIntake: number;
  upperLimit?: number;
  scope?: UpperLimitScope;
  warning?: string;
}

/**
 * Resolves standard DRI adult age band.
 * Returns undefined for individuals under 19.
 */
export function getDriAgeBand(age?: number): DriAgeBand | undefined {
  if (typeof age !== 'number' || isNaN(age) || age < 19) {
    return undefined;
  }
  if (age <= 30) return '19-30';
  if (age <= 50) return '31-50';
  if (age <= 70) return '51-70';
  return '71+';
}

const COMMON_DISCLAIMER =
  'Formulated for healthy adults 19+. Pregnancy, lactation, and specific medical conditions are not handled. Consult a healthcare professional.';

const MINOR_DISCLAIMER =
  'Dietary Reference Intakes (DRIs) in FitTrack are formulated for adults 19+. Pediatric and adolescent targets are not displayed.';

/**
 * Resolves exact National Academies DRI target and Tolerable Upper Intake Level
 * based on user age and gender.
 */
export function getDriTarget(
  nutrientKey: string,
  age?: number,
  gender?: 'male' | 'female' | 'other' | string
): DriTargetResult {
  const isMinor = typeof age === 'number' && !isNaN(age) && age < 19;
  const ageBand = getDriAgeBand(age);

  const normalizedGender: 'male' | 'female' | 'general_adult' =
    gender === 'male' || gender === 'female' ? gender : 'general_adult';

  // Base result template for minors (< 19)
  if (isMinor) {
    return {
      nutrientKey,
      target: undefined,
      targetType: undefined,
      unit: getNutrientCanonicalUnit(nutrientKey),
      isAdult: false,
      genderApplied: normalizedGender,
      citation: 'National Academies of Sciences, Engineering, and Medicine (NASEM) DRIs',
      disclaimer: MINOR_DISCLAIMER,
    };
  }

  // Adults (19+) or unstated age (general adult fallback)
  switch (nutrientKey) {
    // ------------------------------------------------------------------------
    // VITAMINS
    // ------------------------------------------------------------------------
    case 'vitaminA': {
      // IOM (2001) Vitamin A Table 4-1. UL Table 4-2 (preformed retinol only).
      const target = normalizedGender === 'female' ? 700 : 900;
      return {
        nutrientKey,
        target,
        targetType: 'RDA',
        unit: 'mcg',
        isAdult: true,
        ageBand,
        genderApplied: normalizedGender,
        upperLimit: 3000,
        upperLimitScope: 'synthetic_only',
        upperLimitDescription: '3,000 mcg RAE applies to preformed retinol (liver, supplements), not provitamin carotenoids.',
        citation: 'IOM (2001) Dietary Reference Intakes for Vitamin A, K, Elements',
        disclaimer: COMMON_DISCLAIMER,
      };
    }

    case 'vitaminC': {
      // IOM (2000) Vitamin C Table 5-1. UL Table 5-2.
      const target = normalizedGender === 'female' ? 75 : 90;
      return {
        nutrientKey,
        target,
        targetType: 'RDA',
        unit: 'mg',
        isAdult: true,
        ageBand,
        genderApplied: normalizedGender,
        upperLimit: 2000,
        upperLimitScope: 'all_sources',
        upperLimitDescription: '2,000 mg from all sources to prevent osmotic diarrhea and GI disturbances.',
        citation: 'IOM (2000) Dietary Reference Intakes for Vitamin C, E, Selenium',
        disclaimer: COMMON_DISCLAIMER,
      };
    }

    case 'vitaminD': {
      // IOM (2011) Calcium & Vitamin D Table 5-1. UL Table 6-1.
      // 19-70: 15 mcg (600 IU); 71+: 20 mcg (800 IU).
      // General adult fallback: 15 mcg if 19-70, 20 mcg if 71+ or default general adult reference.
      const target = ageBand === '71+' ? 20 : (ageBand ? 15 : 20);
      return {
        nutrientKey,
        target,
        targetType: 'RDA',
        unit: 'mcg',
        isAdult: true,
        ageBand,
        genderApplied: normalizedGender,
        upperLimit: 100,
        upperLimitScope: 'all_sources',
        upperLimitDescription: '100 mcg (4,000 IU) from all sources.',
        citation: 'IOM (2011) Dietary Reference Intakes for Calcium and Vitamin D',
        disclaimer: COMMON_DISCLAIMER,
      };
    }

    case 'vitaminE': {
      // IOM (2000) Vitamin E Table 6-1. UL Table 6-2 (supplemental alpha-tocopherol only).
      return {
        nutrientKey,
        target: 15,
        targetType: 'RDA',
        unit: 'mg',
        isAdult: true,
        ageBand,
        genderApplied: normalizedGender,
        upperLimit: 1000,
        upperLimitScope: 'supplements_only',
        upperLimitDescription: '1,000 mg applies only to supplemental alpha-tocopherol to avoid hemorrhagic risk; dietary food vitamin E has no UL.',
        citation: 'IOM (2000) Dietary Reference Intakes for Vitamin C, E, Selenium',
        disclaimer: COMMON_DISCLAIMER,
      };
    }

    case 'vitaminK': {
      // IOM (2001) Vitamin K Table 5-1.
      const target = normalizedGender === 'female' ? 90 : 120;
      return {
        nutrientKey,
        target,
        targetType: 'AI',
        unit: 'mcg',
        isAdult: true,
        ageBand,
        genderApplied: normalizedGender,
        upperLimit: undefined,
        upperLimitScope: undefined,
        citation: 'IOM (2001) Dietary Reference Intakes for Vitamin A, K, Elements',
        disclaimer: COMMON_DISCLAIMER,
      };
    }

    case 'thiamin': {
      // IOM (1998) B-Vitamins Table 4-1.
      const target = normalizedGender === 'female' ? 1.1 : 1.2;
      return {
        nutrientKey,
        target,
        targetType: 'RDA',
        unit: 'mg',
        isAdult: true,
        ageBand,
        genderApplied: normalizedGender,
        citation: 'IOM (1998) Dietary Reference Intakes for B Vitamins',
        disclaimer: COMMON_DISCLAIMER,
      };
    }

    case 'riboflavin': {
      // IOM (1998) B-Vitamins Table 5-1.
      const target = normalizedGender === 'female' ? 1.1 : 1.3;
      return {
        nutrientKey,
        target,
        targetType: 'RDA',
        unit: 'mg',
        isAdult: true,
        ageBand,
        genderApplied: normalizedGender,
        citation: 'IOM (1998) Dietary Reference Intakes for B Vitamins',
        disclaimer: COMMON_DISCLAIMER,
      };
    }

    case 'niacin': {
      // IOM (1998) B-Vitamins Table 6-1. UL Table 6-2 (supplements & fortified food only).
      const target = normalizedGender === 'female' ? 14 : 16;
      return {
        nutrientKey,
        target,
        targetType: 'RDA',
        unit: 'mg',
        isAdult: true,
        ageBand,
        genderApplied: normalizedGender,
        upperLimit: 35,
        upperLimitScope: 'supplements_only',
        upperLimitDescription: '35 mg applies strictly to synthetic/supplemental forms (nicotinic acid / nicotinamide) to prevent flushing. Food niacin has no UL.',
        citation: 'IOM (1998) Dietary Reference Intakes for B Vitamins',
        disclaimer: COMMON_DISCLAIMER,
      };
    }

    case 'vitaminB6': {
      // IOM (1998) B-Vitamins Table 7-1.
      // Men 19-50: 1.3 mg; Men 51+: 1.7 mg.
      // Women 19-50: 1.3 mg; Women 51+: 1.5 mg.
      let target = 1.3;
      if (normalizedGender === 'female') {
        target = ageBand === '51-70' || ageBand === '71+' ? 1.5 : 1.3;
      } else {
        target = ageBand === '51-70' || ageBand === '71+' ? 1.7 : 1.3;
      }
      return {
        nutrientKey,
        target,
        targetType: 'RDA',
        unit: 'mg',
        isAdult: true,
        ageBand,
        genderApplied: normalizedGender,
        upperLimit: 100,
        upperLimitScope: 'all_sources',
        upperLimitDescription: '100 mg from all sources to prevent sensory neuropathy.',
        citation: 'IOM (1998) Dietary Reference Intakes for B Vitamins',
        disclaimer: COMMON_DISCLAIMER,
      };
    }

    case 'folate': {
      // IOM (1998) B-Vitamins Table 8-1. UL Table 8-2 (synthetic folic acid only).
      return {
        nutrientKey,
        target: 400,
        targetType: 'RDA',
        unit: 'mcg',
        isAdult: true,
        ageBand,
        genderApplied: normalizedGender,
        upperLimit: 1000,
        upperLimitScope: 'synthetic_only',
        upperLimitDescription: '1,000 mcg applies strictly to synthetic folic acid in supplements and fortified foods. Dietary food folate has no UL.',
        citation: 'IOM (1998) Dietary Reference Intakes for B Vitamins',
        disclaimer: COMMON_DISCLAIMER,
      };
    }

    case 'vitaminB12': {
      // IOM (1998) B-Vitamins Table 9-1.
      return {
        nutrientKey,
        target: 2.4,
        targetType: 'RDA',
        unit: 'mcg',
        isAdult: true,
        ageBand,
        genderApplied: normalizedGender,
        citation: 'IOM (1998) Dietary Reference Intakes for B Vitamins',
        disclaimer: COMMON_DISCLAIMER,
      };
    }

    case 'pantothenicAcid': {
      // IOM (1998) B-Vitamins Table 10-1.
      return {
        nutrientKey,
        target: 5,
        targetType: 'AI',
        unit: 'mg',
        isAdult: true,
        ageBand,
        genderApplied: normalizedGender,
        citation: 'IOM (1998) Dietary Reference Intakes for B Vitamins',
        disclaimer: COMMON_DISCLAIMER,
      };
    }

    case 'choline': {
      // IOM (1998) B-Vitamins Table 12-1. UL Table 12-2.
      const target = normalizedGender === 'female' ? 425 : 550;
      return {
        nutrientKey,
        target,
        targetType: 'AI',
        unit: 'mg',
        isAdult: true,
        ageBand,
        genderApplied: normalizedGender,
        upperLimit: 3500,
        upperLimitScope: 'all_sources',
        upperLimitDescription: '3,500 mg from all sources to avoid hypotension and fishy body odor.',
        citation: 'IOM (1998) Dietary Reference Intakes for B Vitamins',
        disclaimer: COMMON_DISCLAIMER,
      };
    }

    // ------------------------------------------------------------------------
    // MINERALS
    // ------------------------------------------------------------------------
    case 'calcium': {
      // IOM (2011) Calcium & Vitamin D Table 5-1.
      // Men 19-70: 1000 mg; Men 71+: 1200 mg.
      // Women 19-50: 1000 mg; Women 51+: 1200 mg.
      // UL: 19-50: 2500 mg; 51+: 2000 mg.
      let target = 1000;
      if (normalizedGender === 'female') {
        target = ageBand === '51-70' || ageBand === '71+' ? 1200 : 1000;
      } else if (normalizedGender === 'male') {
        target = ageBand === '71+' ? 1200 : 1000;
      } else {
        target = ageBand === '51-70' || ageBand === '71+' ? 1200 : 1000;
      }

      const upperLimit = ageBand === '51-70' || ageBand === '71+' ? 2000 : 2500;
      return {
        nutrientKey,
        target,
        targetType: 'RDA',
        unit: 'mg',
        isAdult: true,
        ageBand,
        genderApplied: normalizedGender,
        upperLimit,
        upperLimitScope: 'all_sources',
        upperLimitDescription: `${upperLimit} mg from all sources to avoid hypercalcemia and vascular calcification.`,
        citation: 'IOM (2011) Dietary Reference Intakes for Calcium and Vitamin D',
        disclaimer: COMMON_DISCLAIMER,
      };
    }

    case 'iron': {
      // IOM (2001) Trace Elements Table 9-1.
      // Men 19+: 8 mg.
      // Women 19-50: 18 mg; Women 51+: 8 mg.
      let target = 8;
      if (normalizedGender === 'female') {
        target = ageBand === '51-70' || ageBand === '71+' ? 8 : 18;
      } else if (normalizedGender === 'general_adult') {
        target = ageBand === '51-70' || ageBand === '71+' ? 8 : 18;
      }
      return {
        nutrientKey,
        target,
        targetType: 'RDA',
        unit: 'mg',
        isAdult: true,
        ageBand,
        genderApplied: normalizedGender,
        upperLimit: 45,
        upperLimitScope: 'all_sources',
        upperLimitDescription: '45 mg from all sources to prevent acute gastrointestinal distress.',
        citation: 'IOM (2001) Dietary Reference Intakes for Vitamin A, K, Elements',
        disclaimer: COMMON_DISCLAIMER,
      };
    }

    case 'magnesium': {
      // IOM (1997) Table 6-1. UL Table 6-2 (supplements only: 350 mg).
      // Men 19-30: 400 mg; Men 31+: 420 mg.
      // Women 19-30: 310 mg; Women 31+: 320 mg.
      // Default general adult without age: 400 mg (women 310 mg).
      let target = 400;
      const isOver30 = ageBand === '31-50' || ageBand === '51-70' || ageBand === '71+';
      if (normalizedGender === 'female') {
        target = isOver30 ? 320 : 310;
      } else if (normalizedGender === 'male') {
        target = isOver30 ? 420 : 400;
      } else {
        target = isOver30 ? 420 : 400;
      }
      return {
        nutrientKey,
        target,
        targetType: 'RDA',
        unit: 'mg',
        isAdult: true,
        ageBand,
        genderApplied: normalizedGender,
        upperLimit: 350,
        upperLimitScope: 'supplements_only',
        upperLimitDescription: '350 mg applies strictly to pharmacological agents and supplements (magnesium salts). Natural dietary food magnesium has NO upper limit.',
        citation: 'IOM (1997) Dietary Reference Intakes for Calcium, Phosphorus, Magnesium',
        disclaimer: COMMON_DISCLAIMER,
      };
    }

    case 'phosphorus': {
      // IOM (1997) Table 5-1. UL: 19-70: 4000 mg; 71+: 3000 mg.
      const upperLimit = ageBand === '71+' ? 3000 : 4000;
      return {
        nutrientKey,
        target: 700,
        targetType: 'RDA',
        unit: 'mg',
        isAdult: true,
        ageBand,
        genderApplied: normalizedGender,
        upperLimit,
        upperLimitScope: 'all_sources',
        upperLimitDescription: `${upperLimit} mg from all sources.`,
        citation: 'IOM (1997) Dietary Reference Intakes for Calcium, Phosphorus, Magnesium',
        disclaimer: COMMON_DISCLAIMER,
      };
    }

    case 'potassium': {
      // NASEM (2019) Table S-1.
      // Men 19+: 3400 mg; Women 19+: 2600 mg.
      const target = normalizedGender === 'female' ? 2600 : 3400;
      return {
        nutrientKey,
        target,
        targetType: 'AI',
        unit: 'mg',
        isAdult: true,
        ageBand,
        genderApplied: normalizedGender,
        citation: 'NASEM (2019) Dietary Reference Intakes for Sodium and Potassium',
        disclaimer: COMMON_DISCLAIMER,
      };
    }

    case 'sodium': {
      // NASEM (2019) Table S-1. AI 1500 mg; CDRR 2300 mg.
      return {
        nutrientKey,
        target: 1500,
        targetType: 'AI',
        unit: 'mg',
        isAdult: true,
        ageBand,
        genderApplied: normalizedGender,
        upperLimit: 2300,
        upperLimitScope: 'all_sources',
        upperLimitDescription: '2,300 mg Chronic Disease Risk Reduction (CDRR) threshold.',
        citation: 'NASEM (2019) Dietary Reference Intakes for Sodium and Potassium',
        disclaimer: COMMON_DISCLAIMER,
      };
    }

    case 'zinc': {
      // IOM (2001) Table 12-1. UL Table 12-2.
      const target = normalizedGender === 'female' ? 8 : 11;
      return {
        nutrientKey,
        target,
        targetType: 'RDA',
        unit: 'mg',
        isAdult: true,
        ageBand,
        genderApplied: normalizedGender,
        upperLimit: 40,
        upperLimitScope: 'all_sources',
        upperLimitDescription: '40 mg from all sources to avoid copper deficiency and altered lipid profiles.',
        citation: 'IOM (2001) Dietary Reference Intakes for Vitamin A, K, Elements',
        disclaimer: COMMON_DISCLAIMER,
      };
    }

    case 'copper': {
      // IOM (2001) Table 7-1.
      return {
        nutrientKey,
        target: 900,
        targetType: 'RDA',
        unit: 'mcg',
        isAdult: true,
        ageBand,
        genderApplied: normalizedGender,
        upperLimit: 10000,
        upperLimitScope: 'all_sources',
        upperLimitDescription: '10,000 mcg (10 mg) from all sources to prevent liver damage.',
        citation: 'IOM (2001) Dietary Reference Intakes for Vitamin A, K, Elements',
        disclaimer: COMMON_DISCLAIMER,
      };
    }

    case 'manganese': {
      // IOM (2001) Table 10-1.
      const target = normalizedGender === 'female' ? 1.8 : 2.3;
      return {
        nutrientKey,
        target,
        targetType: 'AI',
        unit: 'mg',
        isAdult: true,
        ageBand,
        genderApplied: normalizedGender,
        upperLimit: 11,
        upperLimitScope: 'all_sources',
        upperLimitDescription: '11 mg from all sources to prevent neurotoxicity.',
        citation: 'IOM (2001) Dietary Reference Intakes for Vitamin A, K, Elements',
        disclaimer: COMMON_DISCLAIMER,
      };
    }

    case 'selenium': {
      // IOM (2000) Table 7-1.
      return {
        nutrientKey,
        target: 55,
        targetType: 'RDA',
        unit: 'mcg',
        isAdult: true,
        ageBand,
        genderApplied: normalizedGender,
        upperLimit: 400,
        upperLimitScope: 'all_sources',
        upperLimitDescription: '400 mcg from all sources to prevent selenosis.',
        citation: 'IOM (2000) Dietary Reference Intakes for Vitamin C, E, Selenium',
        disclaimer: COMMON_DISCLAIMER,
      };
    }

    case 'iodine': {
      // IOM (2001) Table 8-1.
      return {
        nutrientKey,
        target: 150,
        targetType: 'RDA',
        unit: 'mcg',
        isAdult: true,
        ageBand,
        genderApplied: normalizedGender,
        upperLimit: 1100,
        upperLimitScope: 'all_sources',
        upperLimitDescription: '1,100 mcg from all sources to prevent elevated TSH.',
        citation: 'IOM (2001) Dietary Reference Intakes for Vitamin A, K, Elements',
        disclaimer: COMMON_DISCLAIMER,
      };
    }

    case 'fiber': {
      // IOM (2002/2005) Fiber Table 7-1.
      // Men 19-50: 38g; Men 51+: 30g.
      // Women 19-50: 25g; Women 51+: 21g.
      let target = 28;
      if (normalizedGender === 'female') {
        target = ageBand === '51-70' || ageBand === '71+' ? 21 : 25;
      } else if (normalizedGender === 'male') {
        target = ageBand === '51-70' || ageBand === '71+' ? 30 : 38;
      } else {
        target = ageBand === '51-70' || ageBand === '71+' ? 28 : 30;
      }
      return {
        nutrientKey,
        target,
        targetType: 'AI',
        unit: 'g',
        isAdult: true,
        ageBand,
        genderApplied: normalizedGender,
        citation: 'IOM (2002/2005) Dietary Reference Intakes for Energy, Fiber',
        disclaimer: COMMON_DISCLAIMER,
      };
    }

    default:
      return {
        nutrientKey,
        target: undefined,
        unit: getNutrientCanonicalUnit(nutrientKey),
        isAdult: true,
        genderApplied: normalizedGender,
        citation: 'National Academies DRIs',
        disclaimer: COMMON_DISCLAIMER,
      };
  }
}

/**
 * Returns canonical unit for any nutrient key.
 */
export function getNutrientCanonicalUnit(key: string): 'mg' | 'mcg' | 'g' | 'kcal' {
  const mcgNutrients = ['vitaminA', 'vitaminD', 'vitaminK', 'folate', 'vitaminB12', 'copper', 'selenium', 'iodine'];
  const gNutrients = ['protein', 'carbs', 'fat', 'fiber', 'sugar'];
  if (key === 'calories') return 'kcal';
  if (mcgNutrients.includes(key)) return 'mcg';
  if (gNutrients.includes(key)) return 'g';
  return 'mg';
}

/**
 * Evaluates whether an intake exceeds a Tolerable Upper Intake Level (UL).
 *
 * CRITICAL CLINICAL RULES:
 * 1. Never compare a supplement-only limit (e.g. Magnesium 350 mg) against total food intake.
 * 2. Only applicable sources count toward specific limits.
 */
export function evaluateUpperLimit(
  nutrientKey: string,
  foodAmount: number,
  supplementAmount: number,
  age?: number,
  gender?: string
): UpperLimitEvaluation {
  const dri = getDriTarget(nutrientKey, age, gender);
  if (!dri.upperLimit) {
    return {
      exceeds: false,
      applicableIntake: foodAmount + supplementAmount,
    };
  }

  const scope = dri.upperLimitScope || 'all_sources';
  let applicableIntake = 0;

  if (scope === 'supplements_only' || scope === 'synthetic_only') {
    // ONLY supplemental/pharmacological intake counts
    applicableIntake = supplementAmount;
  } else {
    // Total intake counts
    applicableIntake = foodAmount + supplementAmount;
  }

  const exceeds = applicableIntake > dri.upperLimit;
  let warning: string | undefined = undefined;

  if (exceeds) {
    if (scope === 'supplements_only' || scope === 'synthetic_only') {
      warning = `Supplemental intake (${applicableIntake} ${dri.unit}) exceeds guidance ceiling of ${dri.upperLimit} ${dri.unit}. Food intake is not restricted.`;
    } else {
      warning = `Total daily intake (${applicableIntake} ${dri.unit}) exceeds reference guidance ceiling of ${dri.upperLimit} ${dri.unit}.`;
    }
  }

  return {
    exceeds,
    applicableIntake,
    upperLimit: dri.upperLimit,
    scope,
    warning,
  };
}

// ============================================================================
// Scientific Bio-Equivalence & Conversion Mathematics
// ============================================================================

/**
 * Vitamin A: Retinol Activity Equivalents (RAE)
 * 1 mcg RAE = 1 mcg retinol = 2 mcg supplemental beta-carotene = 12 mcg dietary beta-carotene
 * 1 IU retinol = 0.3 mcg RAE
 */
export function calculateVitaminARAE({
  retinolMcg = 0,
  supplementalBetaCaroteneMcg = 0,
  foodBetaCaroteneMcg = 0,
  retinolIU = 0,
}: {
  retinolMcg?: number;
  supplementalBetaCaroteneMcg?: number;
  foodBetaCaroteneMcg?: number;
  retinolIU?: number;
}): number {
  const fromIU = retinolIU * 0.3;
  const fromSuppCarotene = supplementalBetaCaroteneMcg / 2;
  const fromFoodCarotene = foodBetaCaroteneMcg / 12;
  const total = retinolMcg + fromIU + fromSuppCarotene + fromFoodCarotene;
  return Math.round(total * 10) / 10;
}

/**
 * Vitamin D: IU to mcg
 * 1 mcg = 40 IU <-> 1 IU = 0.025 mcg
 */
export function convertVitaminDToMcg(iu: number): number {
  return Math.round(iu * 0.025 * 100) / 100;
}

export function convertVitaminDToIU(mcg: number): number {
  return Math.round(mcg * 40);
}

/**
 * Vitamin E: Alpha-tocopherol equivalents (mg)
 * Natural (d-alpha / RRR-alpha): 1 IU = 0.67 mg
 * Synthetic (dl-alpha / all-rac-alpha): 1 IU = 0.45 mg (for RDA activity)
 */
export function calculateVitaminEAlphaTocopherol({
  mgNatural = 0,
  mgSynthetic = 0,
  iuNatural = 0,
  iuSynthetic = 0,
}: {
  mgNatural?: number;
  mgSynthetic?: number;
  iuNatural?: number;
  iuSynthetic?: number;
}): number {
  const total = mgNatural + mgSynthetic + iuNatural * 0.67 + iuSynthetic * 0.45;
  return Math.round(total * 10) / 10;
}

/**
 * Folate: Dietary Folate Equivalents (DFE)
 * mcg DFE = mcg food folate + (1.7 * mcg synthetic folic acid with food)
 * mcg DFE = mcg food folate + (2.0 * mcg synthetic folic acid on empty stomach)
 */
export function calculateFolateDFE({
  foodFolateMcg = 0,
  syntheticFolicAcidMcg = 0,
  onEmptyStomach = false,
}: {
  foodFolateMcg?: number;
  syntheticFolicAcidMcg?: number;
  onEmptyStomach?: boolean;
}): number {
  const multiplier = onEmptyStomach ? 2.0 : 1.7;
  const total = foodFolateMcg + syntheticFolicAcidMcg * multiplier;
  return Math.round(total * 10) / 10;
}

/**
 * Niacin Equivalents (NE)
 * 1 mg NE = 1 mg preformed niacin = 60 mg dietary tryptophan
 */
export function calculateNiacinNE({
  niacinMg = 0,
  tryptophanMg = 0,
}: {
  niacinMg?: number;
  tryptophanMg?: number;
}): number {
  const fromTryptophan = tryptophanMg / 60;
  const total = niacinMg + fromTryptophan;
  return Math.round(total * 10) / 10;
}

/**
 * Metric weight unit conversion (g <-> mg <-> mcg)
 */
export function convertMetricWeight(
  amount: number,
  from: 'g' | 'mg' | 'mcg',
  to: 'g' | 'mg' | 'mcg'
): number {
  if (from === to) return amount;
  // Convert from -> mcg
  let inMcg = amount;
  if (from === 'g') inMcg = amount * 1_000_000;
  else if (from === 'mg') inMcg = amount * 1_000;

  // Convert mcg -> to
  if (to === 'g') return inMcg / 1_000_000;
  if (to === 'mg') return inMcg / 1_000;
  return inMcg;
}
