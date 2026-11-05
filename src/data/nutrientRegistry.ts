import { AppLanguage } from '../types';

export type EssentialNutrientKey =
  | 'vitaminA'
  | 'vitaminC'
  | 'vitaminD'
  | 'vitaminE'
  | 'vitaminK'
  | 'thiamin'
  | 'riboflavin'
  | 'niacin'
  | 'vitaminB6'
  | 'folate'
  | 'vitaminB12'
  | 'pantothenicAcid'
  | 'choline'
  | 'calcium'
  | 'iron'
  | 'magnesium'
  | 'phosphorus'
  | 'potassium'
  | 'sodium'
  | 'zinc'
  | 'copper'
  | 'manganese'
  | 'selenium'
  | 'iodine';

export type MacronutrientKey =
  | 'calories'
  | 'protein'
  | 'carbs'
  | 'fat'
  | 'fiber'
  | 'sugar';

export type AllNutrientKey = MacronutrientKey | EssentialNutrientKey;

export interface NutrientConversionRule {
  fromUnit: string;
  toUnit: string;
  factor: number;
  description: string;
}

export interface NutrientDefinition {
  key: AllNutrientKey;
  category: 'macro' | 'vitamin' | 'mineral' | 'other';
  label: {
    en: string;
    ar: string;
    ckb: string;
  };
  canonicalUnit: 'kcal' | 'g' | 'mg' | 'mcg';
  usdaNutrientNumber: number;
  usdaNutrientCode?: string;
  defaultRdaTarget?: number;
  upperLimit?: number;
  conversions?: NutrientConversionRule[];
}

export const NUTRIENT_REGISTRY: Record<AllNutrientKey, NutrientDefinition> = {
  // --- Macronutrients & Energy ---
  calories: {
    key: 'calories',
    category: 'macro',
    label: {
      en: 'Calories',
      ar: 'السعرات الحرارية',
      ckb: 'کالۆری',
    },
    canonicalUnit: 'kcal',
    usdaNutrientNumber: 1008,
    usdaNutrientCode: '208',
    defaultRdaTarget: 2000,
  },
  protein: {
    key: 'protein',
    category: 'macro',
    label: {
      en: 'Protein',
      ar: 'بروتين',
      ckb: 'پڕۆتین',
    },
    canonicalUnit: 'g',
    usdaNutrientNumber: 1003,
    usdaNutrientCode: '203',
    defaultRdaTarget: 50,
  },
  carbs: {
    key: 'carbs',
    category: 'macro',
    label: {
      en: 'Carbohydrates',
      ar: 'كربوهيدرات',
      ckb: 'کاربۆهیدرات',
    },
    canonicalUnit: 'g',
    usdaNutrientNumber: 1005,
    usdaNutrientCode: '205',
    defaultRdaTarget: 275,
  },
  fat: {
    key: 'fat',
    category: 'macro',
    label: {
      en: 'Total Fat',
      ar: 'إجمالي الدهون',
      ckb: 'کۆی چەوری',
    },
    canonicalUnit: 'g',
    usdaNutrientNumber: 1004,
    usdaNutrientCode: '204',
    defaultRdaTarget: 70,
  },
  fiber: {
    key: 'fiber',
    category: 'macro',
    label: {
      en: 'Dietary Fiber',
      ar: 'ألياف غذائية',
      ckb: 'ڕیشاڵی خۆراکی',
    },
    canonicalUnit: 'g',
    usdaNutrientNumber: 1079,
    usdaNutrientCode: '291',
    defaultRdaTarget: 28,
  },
  sugar: {
    key: 'sugar',
    category: 'macro',
    label: {
      en: 'Total Sugars',
      ar: 'إجمالي السكريات',
      ckb: 'کۆی شەکرەکان',
    },
    canonicalUnit: 'g',
    usdaNutrientNumber: 2000,
    usdaNutrientCode: '269',
    defaultRdaTarget: 50,
    upperLimit: 50,
  },

  // --- Essential Vitamins ---
  vitaminA: {
    key: 'vitaminA',
    category: 'vitamin',
    label: {
      en: 'Vitamin A (RAE)',
      ar: 'فيتامين أ (RAE)',
      ckb: 'ڤیتامین A (RAE)',
    },
    canonicalUnit: 'mcg',
    usdaNutrientNumber: 1106,
    usdaNutrientCode: '320',
    defaultRdaTarget: 900,
    upperLimit: 3000,
    conversions: [
      { fromUnit: 'IU', toUnit: 'mcg', factor: 0.3, description: '1 IU retinol = 0.3 mcg RAE' },
      { fromUnit: 'mcg_beta_carotene', toUnit: 'mcg', factor: 0.0833, description: '12 mcg dietary beta-carotene = 1 mcg RAE' },
    ],
  },
  vitaminC: {
    key: 'vitaminC',
    category: 'vitamin',
    label: {
      en: 'Vitamin C',
      ar: 'فيتامين ج',
      ckb: 'ڤیتامین C',
    },
    canonicalUnit: 'mg',
    usdaNutrientNumber: 1162,
    usdaNutrientCode: '401',
    defaultRdaTarget: 90,
    upperLimit: 2000,
  },
  vitaminD: {
    key: 'vitaminD',
    category: 'vitamin',
    label: {
      en: 'Vitamin D',
      ar: 'فيتامين د',
      ckb: 'ڤیتامین D',
    },
    canonicalUnit: 'mcg',
    usdaNutrientNumber: 1114,
    usdaNutrientCode: '328',
    defaultRdaTarget: 20,
    upperLimit: 100,
    conversions: [
      { fromUnit: 'IU', toUnit: 'mcg', factor: 0.025, description: '1 IU Vitamin D = 0.025 mcg (40 IU = 1 mcg)' },
    ],
  },
  vitaminE: {
    key: 'vitaminE',
    category: 'vitamin',
    label: {
      en: 'Vitamin E (alpha-tocopherol)',
      ar: 'فيتامين هـ (ألفا توكوفيرول)',
      ckb: 'ڤیتامین E (ئالفا تۆکۆفێرۆڵ)',
    },
    canonicalUnit: 'mg',
    usdaNutrientNumber: 1109,
    usdaNutrientCode: '323',
    defaultRdaTarget: 15,
    upperLimit: 1000,
    conversions: [
      { fromUnit: 'IU_natural', toUnit: 'mg', factor: 0.67, description: '1 IU d-alpha-tocopherol = 0.67 mg' },
      { fromUnit: 'IU_synthetic', toUnit: 'mg', factor: 0.45, description: '1 IU dl-alpha-tocopheryl acetate = 0.45 mg' },
    ],
  },
  vitaminK: {
    key: 'vitaminK',
    category: 'vitamin',
    label: {
      en: 'Vitamin K (phylloquinone)',
      ar: 'فيتامين ك',
      ckb: 'ڤیتامین K',
    },
    canonicalUnit: 'mcg',
    usdaNutrientNumber: 1185,
    usdaNutrientCode: '430',
    defaultRdaTarget: 120,
  },
  thiamin: {
    key: 'thiamin',
    category: 'vitamin',
    label: {
      en: 'Thiamin (B1)',
      ar: 'ثيامين (ب1)',
      ckb: 'تیامین (B1)',
    },
    canonicalUnit: 'mg',
    usdaNutrientNumber: 1165,
    usdaNutrientCode: '404',
    defaultRdaTarget: 1.2,
  },
  riboflavin: {
    key: 'riboflavin',
    category: 'vitamin',
    label: {
      en: 'Riboflavin (B2)',
      ar: 'ريبوفلافين (ب2)',
      ckb: 'ریبۆفلاڤین (B2)',
    },
    canonicalUnit: 'mg',
    usdaNutrientNumber: 1166,
    usdaNutrientCode: '405',
    defaultRdaTarget: 1.3,
  },
  niacin: {
    key: 'niacin',
    category: 'vitamin',
    label: {
      en: 'Niacin (NE)',
      ar: 'نياسين (ب3)',
      ckb: 'نیاسین (B3)',
    },
    canonicalUnit: 'mg',
    usdaNutrientNumber: 1167,
    usdaNutrientCode: '406',
    defaultRdaTarget: 16,
    upperLimit: 35,
    conversions: [
      { fromUnit: 'mg_tryptophan', toUnit: 'mg', factor: 0.01667, description: '60 mg dietary tryptophan = 1 mg Niacin Equivalent (NE)' },
    ],
  },
  vitaminB6: {
    key: 'vitaminB6',
    category: 'vitamin',
    label: {
      en: 'Vitamin B6',
      ar: 'فيتامين ب6',
      ckb: 'ڤیتامین B6',
    },
    canonicalUnit: 'mg',
    usdaNutrientNumber: 1175,
    usdaNutrientCode: '415',
    defaultRdaTarget: 1.7,
    upperLimit: 100,
  },
  folate: {
    key: 'folate',
    category: 'vitamin',
    label: {
      en: 'Folate (DFE)',
      ar: 'فولات (DFE)',
      ckb: 'فۆلات (DFE)',
    },
    canonicalUnit: 'mcg',
    usdaNutrientNumber: 1177,
    usdaNutrientCode: '435',
    defaultRdaTarget: 400,
    upperLimit: 1000,
    conversions: [
      { fromUnit: 'mcg_folic_acid_food', toUnit: 'mcg', factor: 1.7, description: '1 mcg folic acid added to food = 1.7 mcg DFE' },
      { fromUnit: 'mcg_folic_acid_empty', toUnit: 'mcg', factor: 2.0, description: '1 mcg folic acid on empty stomach = 2.0 mcg DFE' },
    ],
  },
  vitaminB12: {
    key: 'vitaminB12',
    category: 'vitamin',
    label: {
      en: 'Vitamin B12',
      ar: 'فيتامين ب12',
      ckb: 'ڤیتامین B12',
    },
    canonicalUnit: 'mcg',
    usdaNutrientNumber: 1178,
    usdaNutrientCode: '418',
    defaultRdaTarget: 2.4,
  },
  pantothenicAcid: {
    key: 'pantothenicAcid',
    category: 'vitamin',
    label: {
      en: 'Pantothenic Acid (B5)',
      ar: 'حمض البانتوثنيك (ب5)',
      ckb: 'ترشی پانتۆتینیک (B5)',
    },
    canonicalUnit: 'mg',
    usdaNutrientNumber: 1170,
    usdaNutrientCode: '410',
    defaultRdaTarget: 5,
  },
  choline: {
    key: 'choline',
    category: 'vitamin',
    label: {
      en: 'Choline',
      ar: 'كولين',
      ckb: 'کۆلین',
    },
    canonicalUnit: 'mg',
    usdaNutrientNumber: 1180,
    usdaNutrientCode: '421',
    defaultRdaTarget: 550,
    upperLimit: 3500,
  },

  // --- Essential Minerals ---
  calcium: {
    key: 'calcium',
    category: 'mineral',
    label: {
      en: 'Calcium',
      ar: 'كالسيوم',
      ckb: 'کالیسیۆم',
    },
    canonicalUnit: 'mg',
    usdaNutrientNumber: 1087,
    usdaNutrientCode: '301',
    defaultRdaTarget: 1000,
    upperLimit: 2500,
  },
  iron: {
    key: 'iron',
    category: 'mineral',
    label: {
      en: 'Iron',
      ar: 'حديد',
      ckb: 'ئاسن',
    },
    canonicalUnit: 'mg',
    usdaNutrientNumber: 1089,
    usdaNutrientCode: '303',
    defaultRdaTarget: 18,
    upperLimit: 45,
  },
  magnesium: {
    key: 'magnesium',
    category: 'mineral',
    label: {
      en: 'Magnesium',
      ar: 'مغنيسيوم',
      ckb: 'مەگنیسیۆم',
    },
    canonicalUnit: 'mg',
    usdaNutrientNumber: 1090,
    usdaNutrientCode: '304',
    defaultRdaTarget: 400,
    upperLimit: 350,
  },
  phosphorus: {
    key: 'phosphorus',
    category: 'mineral',
    label: {
      en: 'Phosphorus',
      ar: 'فوسفور',
      ckb: 'فۆسفۆر',
    },
    canonicalUnit: 'mg',
    usdaNutrientNumber: 1091,
    usdaNutrientCode: '305',
    defaultRdaTarget: 700,
    upperLimit: 4000,
  },
  potassium: {
    key: 'potassium',
    category: 'mineral',
    label: {
      en: 'Potassium',
      ar: 'بوتاسيوم',
      ckb: 'پۆتاسیۆم',
    },
    canonicalUnit: 'mg',
    usdaNutrientNumber: 1092,
    usdaNutrientCode: '306',
    defaultRdaTarget: 3400,
  },
  sodium: {
    key: 'sodium',
    category: 'mineral',
    label: {
      en: 'Sodium',
      ar: 'صوديوم',
      ckb: 'سۆدیۆم',
    },
    canonicalUnit: 'mg',
    usdaNutrientNumber: 1093,
    usdaNutrientCode: '307',
    defaultRdaTarget: 2300,
    upperLimit: 2300,
  },
  zinc: {
    key: 'zinc',
    category: 'mineral',
    label: {
      en: 'Zinc',
      ar: 'زنك',
      ckb: 'زینک',
    },
    canonicalUnit: 'mg',
    usdaNutrientNumber: 1095,
    usdaNutrientCode: '309',
    defaultRdaTarget: 11,
    upperLimit: 40,
  },
  copper: {
    key: 'copper',
    category: 'mineral',
    label: {
      en: 'Copper',
      ar: 'نحاس',
      ckb: 'مس',
    },
    canonicalUnit: 'mg',
    usdaNutrientNumber: 1098,
    usdaNutrientCode: '312',
    defaultRdaTarget: 0.9,
    upperLimit: 10,
  },
  manganese: {
    key: 'manganese',
    category: 'mineral',
    label: {
      en: 'Manganese',
      ar: 'منغنيز',
      ckb: 'مەنگەنیز',
    },
    canonicalUnit: 'mg',
    usdaNutrientNumber: 1101,
    usdaNutrientCode: '315',
    defaultRdaTarget: 2.3,
    upperLimit: 11,
  },
  selenium: {
    key: 'selenium',
    category: 'mineral',
    label: {
      en: 'Selenium',
      ar: 'سيلينيوم',
      ckb: 'سیلینیۆم',
    },
    canonicalUnit: 'mcg',
    usdaNutrientNumber: 1103,
    usdaNutrientCode: '317',
    defaultRdaTarget: 55,
    upperLimit: 400,
  },
  iodine: {
    key: 'iodine',
    category: 'mineral',
    label: {
      en: 'Iodine',
      ar: 'يود',
      ckb: 'یۆد',
    },
    canonicalUnit: 'mcg',
    usdaNutrientNumber: 1100,
    usdaNutrientCode: '318',
    defaultRdaTarget: 150,
    upperLimit: 1100,
  },
};

export const ESSENTIAL_NUTRIENT_KEYS: EssentialNutrientKey[] = [
  'vitaminA',
  'vitaminC',
  'vitaminD',
  'vitaminE',
  'vitaminK',
  'thiamin',
  'riboflavin',
  'niacin',
  'vitaminB6',
  'folate',
  'vitaminB12',
  'pantothenicAcid',
  'choline',
  'calcium',
  'iron',
  'magnesium',
  'phosphorus',
  'potassium',
  'sodium',
  'zinc',
  'copper',
  'manganese',
  'selenium',
  'iodine',
];

export function getNutrientDefinition(key: string): NutrientDefinition | undefined {
  return NUTRIENT_REGISTRY[key as AllNutrientKey];
}

export function getNutrientLabel(key: string, language: AppLanguage = 'en'): string {
  const def = getNutrientDefinition(key);
  if (!def) return key;
  return def.label[language] || def.label.en || key;
}

export function getAllNutrientDefinitions(): NutrientDefinition[] {
  return Object.values(NUTRIENT_REGISTRY);
}

export function getEssentialNutrients(): NutrientDefinition[] {
  return ESSENTIAL_NUTRIENT_KEYS.map((k) => NUTRIENT_REGISTRY[k]);
}

/**
 * Converts a nutrient amount from one unit to the registry canonical unit.
 * Supports standard weight scales (g <-> mg <-> mcg) and specific vitamin rules (IU -> mcg/mg).
 */
export function convertToCanonicalUnit(
  amount: number,
  fromUnit: string,
  nutrientKey: string
): { amount: number; isCompatible: boolean; warning?: string } {
  const def = getNutrientDefinition(nutrientKey);
  if (!def) return { amount, isCompatible: true };

  const normFrom = fromUnit.trim().toLowerCase();
  const canonical = def.canonicalUnit.toLowerCase();

  if (normFrom === canonical) {
    return { amount, isCompatible: true };
  }

  // Weight conversions between g, mg, mcg
  if (normFrom === 'g') {
    if (canonical === 'mg') return { amount: amount * 1000, isCompatible: true };
    if (canonical === 'mcg') return { amount: amount * 1000000, isCompatible: true };
  }
  if (normFrom === 'mg') {
    if (canonical === 'g') return { amount: amount / 1000, isCompatible: true };
    if (canonical === 'mcg') return { amount: amount * 1000, isCompatible: true };
  }
  if (normFrom === 'mcg' || normFrom === 'µg') {
    if (canonical === 'g') return { amount: amount / 1000000, isCompatible: true };
    if (canonical === 'mg') return { amount: amount / 1000, isCompatible: true };
  }

  // IU Conversions
  if (normFrom === 'iu') {
    if (nutrientKey === 'vitaminD') {
      return { amount: Math.round(amount * 0.025 * 100) / 100, isCompatible: true };
    }
    if (nutrientKey === 'vitaminA') {
      return { amount: Math.round(amount * 0.3 * 10) / 10, isCompatible: true };
    }
    if (nutrientKey === 'vitaminE') {
      return { amount: Math.round(amount * 0.67 * 10) / 10, isCompatible: true };
    }
    return { amount: 0, isCompatible: false, warning: `IU unit is incompatible with ${def.label.en}` };
  }

  return { amount: 0, isCompatible: false, warning: `Unsupported unit ${fromUnit} for ${def.label.en}` };
}
