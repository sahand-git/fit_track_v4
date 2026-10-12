import { SupplementCategory } from '../types';

export interface CatalogSupplementItem {
  id: string;
  name: string;
  category: SupplementCategory;
  suggestedUnit: string;
}

export const COMMON_SUPPLEMENT_CATALOG: CatalogSupplementItem[] = [
  // Vitamins
  { id: 'cat_d3', name: 'Vitamin D3', category: 'vitamin', suggestedUnit: 'IU' },
  { id: 'cat_c', name: 'Vitamin C', category: 'vitamin', suggestedUnit: 'mg' },
  { id: 'cat_b12', name: 'Vitamin B12', category: 'vitamin', suggestedUnit: 'mcg' },
  { id: 'cat_b_complex', name: 'Vitamin B-Complex', category: 'vitamin', suggestedUnit: 'tablet' },
  { id: 'cat_a', name: 'Vitamin A', category: 'vitamin', suggestedUnit: 'IU' },
  { id: 'cat_e', name: 'Vitamin E', category: 'vitamin', suggestedUnit: 'IU' },
  { id: 'cat_k2', name: 'Vitamin K2', category: 'vitamin', suggestedUnit: 'mcg' },
  { id: 'cat_multi', name: 'Daily Multivitamin', category: 'vitamin', suggestedUnit: 'tablet' },
  { id: 'cat_biotin', name: 'Biotin', category: 'vitamin', suggestedUnit: 'mcg' },

  // Minerals
  { id: 'cat_mg_glyc', name: 'Magnesium Glycinate', category: 'mineral', suggestedUnit: 'mg' },
  { id: 'cat_mg_citr', name: 'Magnesium Citrate', category: 'mineral', suggestedUnit: 'mg' },
  { id: 'cat_zn_pico', name: 'Zinc Picolinate', category: 'mineral', suggestedUnit: 'mg' },
  { id: 'cat_fe_bisg', name: 'Iron Bisglycinate', category: 'mineral', suggestedUnit: 'mg' },
  { id: 'cat_calcium', name: 'Calcium', category: 'mineral', suggestedUnit: 'mg' },
  { id: 'cat_potassium', name: 'Potassium', category: 'mineral', suggestedUnit: 'mg' },
  { id: 'cat_selenium', name: 'Selenium', category: 'mineral', suggestedUnit: 'mcg' },

  // Other supplements
  { id: 'cat_omega3', name: 'Omega-3 Fish Oil', category: 'supplement', suggestedUnit: 'mg' },
  { id: 'cat_coq10', name: 'CoQ10', category: 'supplement', suggestedUnit: 'mg' },
  { id: 'cat_ashwagandha', name: 'Ashwagandha', category: 'supplement', suggestedUnit: 'mg' },
  { id: 'cat_creatine', name: 'Creatine Monohydrate', category: 'supplement', suggestedUnit: 'g' },
  { id: 'cat_melatonin', name: 'Melatonin', category: 'supplement', suggestedUnit: 'mg' },
  { id: 'cat_turmeric', name: 'Turmeric/Curcumin', category: 'supplement', suggestedUnit: 'mg' },
  { id: 'cat_probiotics', name: 'Probiotics', category: 'supplement', suggestedUnit: 'capsule' },
  { id: 'cat_collagen', name: 'Collagen Peptides', category: 'supplement', suggestedUnit: 'g' },
  { id: 'cat_electrolytes', name: 'Electrolytes', category: 'supplement', suggestedUnit: 'packet' },
  { id: 'cat_theanine', name: 'L-Theanine', category: 'supplement', suggestedUnit: 'mg' },
  { id: 'cat_acv', name: 'Apple Cider Vinegar', category: 'supplement', suggestedUnit: 'mg' },
  { id: 'cat_spirulina', name: 'Spirulina', category: 'supplement', suggestedUnit: 'mg' },
  { id: 'cat_zma', name: 'ZMA', category: 'supplement', suggestedUnit: 'capsule' },
  { id: 'cat_chamomile', name: 'Chamomile', category: 'supplement', suggestedUnit: 'cup' },
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
