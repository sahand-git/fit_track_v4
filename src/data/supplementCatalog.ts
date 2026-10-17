import { SupplementCategory } from '../types';

export type MicronutrientKey =
  | 'vitaminA'
  | 'vitaminC'
  | 'vitaminD'
  | 'vitaminB12'
  | 'calcium'
  | 'iron'
  | 'potassium'
  | 'magnesium'
  | 'zinc';

export interface CatalogSupplementItem {
  id: string;
  name: string;
  category: SupplementCategory;
  suggestedUnit: string;
  defaultAmount?: number;
  icon: string;
  nutrientKey?: MicronutrientKey;
  nutrientConversionFactor?: number; // Multiply amount by this to obtain canonical unit (mg or mcg)
}

export const COMMON_SUPPLEMENT_CATALOG: CatalogSupplementItem[] = [
  // Vitamins
  {
    id: 'cat_d3',
    name: 'Vitamin D3',
    category: 'vitamin',
    suggestedUnit: 'IU',
    defaultAmount: 2000,
    icon: '☀️',
    nutrientKey: 'vitaminD',
    nutrientConversionFactor: 0.025, // 1 IU D3 = 0.025 mcg
  },
  {
    id: 'cat_c',
    name: 'Vitamin C',
    category: 'vitamin',
    suggestedUnit: 'mg',
    defaultAmount: 1000,
    icon: '🍊',
    nutrientKey: 'vitaminC',
    nutrientConversionFactor: 1,
  },
  {
    id: 'cat_b12',
    name: 'Vitamin B12',
    category: 'vitamin',
    suggestedUnit: 'mcg',
    defaultAmount: 500,
    icon: '🧠',
    nutrientKey: 'vitaminB12',
    nutrientConversionFactor: 1,
  },
  {
    id: 'cat_b_complex',
    name: 'Vitamin B-Complex',
    category: 'vitamin',
    suggestedUnit: 'tablet',
    defaultAmount: 1,
    icon: '💊',
  },
  {
    id: 'cat_a',
    name: 'Vitamin A',
    category: 'vitamin',
    suggestedUnit: 'IU',
    defaultAmount: 5000,
    icon: '🥕',
    nutrientKey: 'vitaminA',
    nutrientConversionFactor: 0.3, // 1 IU Vit A = 0.3 mcg RAE
  },
  {
    id: 'cat_e',
    name: 'Vitamin E',
    category: 'vitamin',
    suggestedUnit: 'IU',
    defaultAmount: 400,
    icon: '🥑',
  },
  {
    id: 'cat_k2',
    name: 'Vitamin K2',
    category: 'vitamin',
    suggestedUnit: 'mcg',
    defaultAmount: 100,
    icon: '🥬',
  },
  {
    id: 'cat_multi',
    name: 'Daily Multivitamin',
    category: 'vitamin',
    suggestedUnit: 'tablet',
    defaultAmount: 1,
    icon: '💊',
  },
  {
    id: 'cat_biotin',
    name: 'Biotin',
    category: 'vitamin',
    suggestedUnit: 'mcg',
    defaultAmount: 5000,
    icon: '💅',
  },

  // Minerals
  {
    id: 'cat_mg_glyc',
    name: 'Magnesium Glycinate',
    category: 'mineral',
    suggestedUnit: 'mg',
    defaultAmount: 200,
    icon: '⚡',
    nutrientKey: 'magnesium',
    nutrientConversionFactor: 1,
  },
  {
    id: 'cat_mg_citr',
    name: 'Magnesium Citrate',
    category: 'mineral',
    suggestedUnit: 'mg',
    defaultAmount: 200,
    icon: '⚡',
    nutrientKey: 'magnesium',
    nutrientConversionFactor: 1,
  },
  {
    id: 'cat_zn_pico',
    name: 'Zinc Picolinate',
    category: 'mineral',
    suggestedUnit: 'mg',
    defaultAmount: 15,
    icon: '🛡️',
    nutrientKey: 'zinc',
    nutrientConversionFactor: 1,
  },
  {
    id: 'cat_fe_bisg',
    name: 'Iron Bisglycinate',
    category: 'mineral',
    suggestedUnit: 'mg',
    defaultAmount: 18,
    icon: '🩸',
    nutrientKey: 'iron',
    nutrientConversionFactor: 1,
  },
  {
    id: 'cat_calcium',
    name: 'Calcium',
    category: 'mineral',
    suggestedUnit: 'mg',
    defaultAmount: 500,
    icon: '🦴',
    nutrientKey: 'calcium',
    nutrientConversionFactor: 1,
  },
  {
    id: 'cat_potassium',
    name: 'Potassium',
    category: 'mineral',
    suggestedUnit: 'mg',
    defaultAmount: 99,
    icon: '🍌',
    nutrientKey: 'potassium',
    nutrientConversionFactor: 1,
  },
  {
    id: 'cat_selenium',
    name: 'Selenium',
    category: 'mineral',
    suggestedUnit: 'mcg',
    defaultAmount: 200,
    icon: '🛡️',
  },

  // Other supplements
  {
    id: 'cat_omega3',
    name: 'Omega-3 Fish Oil',
    category: 'supplement',
    suggestedUnit: 'mg',
    defaultAmount: 1000,
    icon: '🐟',
  },
  {
    id: 'cat_coq10',
    name: 'CoQ10',
    category: 'supplement',
    suggestedUnit: 'mg',
    defaultAmount: 100,
    icon: '⚡',
  },
  {
    id: 'cat_ashwagandha',
    name: 'Ashwagandha',
    category: 'supplement',
    suggestedUnit: 'mg',
    defaultAmount: 600,
    icon: '🌿',
  },
  {
    id: 'cat_creatine',
    name: 'Creatine Monohydrate',
    category: 'supplement',
    suggestedUnit: 'g',
    defaultAmount: 5,
    icon: '💪',
  },
  {
    id: 'cat_melatonin',
    name: 'Melatonin',
    category: 'supplement',
    suggestedUnit: 'mg',
    defaultAmount: 3,
    icon: '💤',
  },
  {
    id: 'cat_turmeric',
    name: 'Turmeric/Curcumin',
    category: 'supplement',
    suggestedUnit: 'mg',
    defaultAmount: 500,
    icon: '🧡',
  },
  {
    id: 'cat_probiotics',
    name: 'Probiotics',
    category: 'supplement',
    suggestedUnit: 'capsule',
    defaultAmount: 1,
    icon: '🦠',
  },
  {
    id: 'cat_collagen',
    name: 'Collagen Peptides',
    category: 'supplement',
    suggestedUnit: 'g',
    defaultAmount: 10,
    icon: '✨',
  },
  {
    id: 'cat_electrolytes',
    name: 'Electrolytes',
    category: 'supplement',
    suggestedUnit: 'packet',
    defaultAmount: 1,
    icon: '💧',
  },
  {
    id: 'cat_theanine',
    name: 'L-Theanine',
    category: 'supplement',
    suggestedUnit: 'mg',
    defaultAmount: 200,
    icon: '🍵',
  },
  {
    id: 'cat_acv',
    name: 'Apple Cider Vinegar',
    category: 'supplement',
    suggestedUnit: 'mg',
    defaultAmount: 500,
    icon: '🍎',
  },
  {
    id: 'cat_spirulina',
    name: 'Spirulina',
    category: 'supplement',
    suggestedUnit: 'mg',
    defaultAmount: 1000,
    icon: '🌿',
  },
  {
    id: 'cat_zma',
    name: 'ZMA',
    category: 'supplement',
    suggestedUnit: 'capsule',
    defaultAmount: 1,
    icon: '🌙',
  },
  {
    id: 'cat_chamomile',
    name: 'Chamomile',
    category: 'supplement',
    suggestedUnit: 'cup',
    defaultAmount: 1,
    icon: '🍵',
  },
];

export const COMMON_UNITS = [
  'tablet',
  'capsule',
  'mg',
  'mcg',
  'IU',
  'g',
  'drop',
  'scoop',
  'packet',
];
