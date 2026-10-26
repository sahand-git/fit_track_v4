import { FoodItem } from '../types';

export const STAPLE_FOODS: FoodItem[] = [
  // 1. Hot dog (USDA #174034)
  {
    id: 'food_hot_dog_frankfurter',
    name: 'Hot Dog (Frankfurter, beef & pork, cooked)',
    nameAr: 'هوت دوغ (سجق فرانكفورتر مطبوخ)',
    nameCkb: 'هۆت دۆگ (سۆسجی فرانکفۆرتەری کوڵاو)',
    category: 'Fast Food & Meals',
    servingSize: '1 link (57g)',
    servingGrams: 57,
    calories: 165,
    protein: 5.9,
    fat: 14.9,
    carbs: 1.4,
    fiber: 0,
    sugars: 0.7,
    sodium: 496,
    source: 'verified_database',
    variants: [
      { id: 'var_hot_dog_1link', name: '1 link (57g)', calories: 165, protein: 5.9, carbs: 1.4, fat: 14.9, servingSize: '1 link (57g)', servingGrams: 57 },
      { id: 'var_hot_dog_2links', name: '2 links (114g)', calories: 330, protein: 11.8, carbs: 2.8, fat: 29.8, servingSize: '2 links (114g)', servingGrams: 114 },
      { id: 'var_hot_dog_100g', name: '100g portion', calories: 290, protein: 10.4, carbs: 2.5, fat: 26.2, servingSize: '100g portion', servingGrams: 100 }
    ]
  },
  // 2. Kunafa (Middle Eastern Sweet Pastry)
  {
    id: 'food_kunafa_sweet_cheese',
    name: 'Kunafa with Sweet Cheese & Syrup',
    nameAr: 'كنافة نابلسية بالجبن والقطر',
    nameCkb: 'کونافە بە پەنیر و شیرینکراو',
    category: 'Bakery & Sweets',
    servingSize: '1 square piece (125g)',
    servingGrams: 125,
    calories: 425,
    protein: 9.4,
    fat: 18.1,
    carbs: 56.3,
    fiber: 1.5,
    sugars: 35.0,
    sodium: 225,
    isEstimate: true,
    recipeEstimate: true,
    source: 'regional_culinary_estimate',
    variants: [
      { id: 'var_kunafa_piece', name: '1 square piece (125g)', calories: 425, protein: 9.4, carbs: 56.3, fat: 18.1, servingSize: '1 square piece (125g)', servingGrams: 125 },
      { id: 'var_kunafa_small', name: 'Small portion (75g)', calories: 255, protein: 5.6, carbs: 33.8, fat: 10.9, servingSize: 'Small portion (75g)', servingGrams: 75 },
      { id: 'var_kunafa_100g', name: '100g edible portion', calories: 340, protein: 7.5, carbs: 45.0, fat: 14.5, servingSize: '100g edible portion', servingGrams: 100 }
    ]
  },
  // 3. Halloumi Cheese (UK CoFID / USDA)
  {
    id: 'food_halloumi_cheese',
    name: 'Halloumi Cheese',
    nameAr: 'جبنة حلوم',
    nameCkb: 'پەنیری حەلووم',
    category: 'Eggs & Dairy',
    servingSize: '2 thick slices (50g)',
    servingGrams: 50,
    calories: 161,
    protein: 10.8,
    fat: 13.0,
    carbs: 1.0,
    fiber: 0,
    sugars: 0.8,
    sodium: 575,
    source: 'verified_database',
    variants: [
      { id: 'var_halloumi_2slices', name: '2 thick slices (50g)', calories: 161, protein: 10.8, carbs: 1.0, fat: 13.0, servingSize: '2 thick slices (50g)', servingGrams: 50 },
      { id: 'var_halloumi_100g', name: '100g portion', calories: 321, protein: 21.5, carbs: 2.0, fat: 26.0, servingSize: '100g portion', servingGrams: 100 },
      { id: 'var_halloumi_block', name: 'Full block (200g)', calories: 642, protein: 43.0, carbs: 4.0, fat: 52.0, servingSize: 'Full block (200g)', servingGrams: 200 }
    ]
  },
  // 4. Labneh (USDA #170903)
  {
    id: 'food_labneh_strained_yogurt',
    name: 'Labneh (Strained Yogurt Spread)',
    nameAr: 'لبنة بلدية كاملة الدسم',
    nameCkb: 'لەبنەی خۆماڵی',
    category: 'Eggs & Dairy',
    servingSize: '2 tbsp (30g)',
    servingGrams: 30,
    calories: 46,
    protein: 2.7,
    fat: 3.0,
    carbs: 2.1,
    fiber: 0,
    sugars: 1.8,
    sodium: 84,
    source: 'verified_database',
    variants: [
      { id: 'var_labneh_2tbsp', name: '2 tbsp (30g)', calories: 46, protein: 2.7, carbs: 2.1, fat: 3.0, servingSize: '2 tbsp (30g)', servingGrams: 30 },
      { id: 'var_labneh_100g', name: '100g portion', calories: 154, protein: 9.0, carbs: 7.0, fat: 10.0, servingSize: '100g portion', servingGrams: 100 },
      { id: 'var_labneh_bowl', name: 'Small bowl (150g)', calories: 231, protein: 13.5, carbs: 10.5, fat: 15.0, servingSize: 'Small bowl (150g)', servingGrams: 150 }
    ]
  },
  // 6. Fattoush Salad
  {
    id: 'food_fattoush_salad',
    name: 'Fattoush Salad with Crispy Pita',
    nameAr: 'سلطة فتوش بالخبز المقرمش ودبس الرمان',
    nameCkb: 'سەلەتەی فەتووش بە نانی برژاو',
    category: 'Regional Dishes',
    servingSize: '1 medium bowl (200g)',
    servingGrams: 200,
    calories: 176,
    protein: 3.6,
    fat: 9.6,
    carbs: 19.6,
    fiber: 3.6,
    sugars: 6.4,
    sodium: 420,
    isEstimate: true,
    recipeEstimate: true,
    source: 'regional_culinary_estimate',
    variants: [
      { id: 'var_fattoush_bowl', name: '1 medium bowl (200g)', calories: 176, protein: 3.6, carbs: 19.6, fat: 9.6, servingSize: '1 medium bowl (200g)', servingGrams: 200 },
      { id: 'var_fattoush_side', name: 'Side salad (100g)', calories: 88, protein: 1.8, carbs: 9.8, fat: 4.8, servingSize: 'Side salad (100g)', servingGrams: 100 },
      { id: 'var_fattoush_large', name: 'Large meal salad (350g)', calories: 308, protein: 6.3, carbs: 34.3, fat: 16.8, servingSize: 'Large meal salad (350g)', servingGrams: 350 }
    ]
  },
  // 7. Kofta (USDA #171120)
  {
    id: 'food_grilled_kofta',
    name: 'Grilled Kofta (Spiced Lamb & Beef Skewer)',
    nameAr: 'كفتة مشوية على الفحم',
    nameCkb: 'کۆفتەی برژاو',
    category: 'Meat & Poultry',
    servingSize: '1 skewer (80g)',
    servingGrams: 80,
    calories: 196,
    protein: 14.6,
    fat: 14.0,
    carbs: 2.8,
    fiber: 0.5,
    sugars: 0.6,
    sodium: 336,
    source: 'verified_database',
    variants: [
      { id: 'var_kofta_1skewer', name: '1 skewer (80g)', calories: 196, protein: 14.6, carbs: 2.8, fat: 14.0, servingSize: '1 skewer (80g)', servingGrams: 80 },
      { id: 'var_kofta_2skewers', name: '2 skewers (160g)', calories: 392, protein: 29.1, carbs: 5.6, fat: 28.0, servingSize: '2 skewers (160g)', servingGrams: 160 },
      { id: 'var_kofta_100g', name: '100g portion', calories: 245, protein: 18.2, carbs: 3.5, fat: 17.5, servingSize: '100g portion', servingGrams: 100 }
    ]
  },
  // 8. Manakish Za'atar
  {
    id: 'food_manakish_zaatar',
    name: 'Manakish Za\'atar Flatbread',
    nameAr: 'مناقيش زعتر وزيت زيتون',
    nameCkb: 'مەنافیش بە زەعتەر و زەیتی زەیتوون',
    category: 'Bakery & Sweets',
    servingSize: '1 pie (120g)',
    servingGrams: 120,
    calories: 372,
    protein: 8.6,
    fat: 14.4,
    carbs: 51.6,
    fiber: 3.7,
    sugars: 1.8,
    sodium: 576,
    isEstimate: true,
    recipeEstimate: true,
    source: 'regional_culinary_estimate',
    variants: [
      { id: 'var_manakish_pie', name: '1 standard pie (120g)', calories: 372, protein: 8.6, carbs: 51.6, fat: 14.4, servingSize: '1 standard pie (120g)', servingGrams: 120 },
      { id: 'var_manakish_mini', name: '1 mini manakish (50g)', calories: 155, protein: 3.6, carbs: 21.5, fat: 6.0, servingSize: '1 mini manakish (50g)', servingGrams: 50 },
      { id: 'var_manakish_100g', name: '100g portion', calories: 310, protein: 7.2, carbs: 43.0, fat: 12.0, servingSize: '100g portion', servingGrams: 100 }
    ]
  },
  // 9. Lahmacun
  {
    id: 'food_lahmacun_meat_flatbread',
    name: 'Lahmacun (Thin Minced Meat Flatbread)',
    nameAr: 'لحم بعجين / لحماجون رقيق',
    nameCkb: 'لەحەم بەعەجین',
    category: 'Fast Food & Meals',
    servingSize: '1 piece (150g)',
    servingGrams: 150,
    calories: 323,
    protein: 13.2,
    fat: 11.3,
    carbs: 42.0,
    fiber: 3.3,
    sugars: 3.0,
    sodium: 645,
    isEstimate: true,
    recipeEstimate: true,
    source: 'regional_culinary_estimate',
    variants: [
      { id: 'var_lahmacun_1pc', name: '1 piece (150g)', calories: 323, protein: 13.2, carbs: 42.0, fat: 11.3, servingSize: '1 piece (150g)', servingGrams: 150 },
      { id: 'var_lahmacun_2pc', name: '2 pieces (300g)', calories: 645, protein: 26.4, carbs: 84.0, fat: 22.5, servingSize: '2 pieces (300g)', servingGrams: 300 },
      { id: 'var_lahmacun_100g', name: '100g portion', calories: 215, protein: 8.8, carbs: 28.0, fat: 7.5, servingSize: '100g portion', servingGrams: 100 }
    ]
  },
  // 10. Freekeh (USDA #170288)
  {
    id: 'food_freekeh_cooked',
    name: 'Freekeh (Green Durum Wheat, cooked)',
    nameAr: 'فريكة خضراء مطبوخة',
    nameCkb: 'فەريكەی سەوزی کوڵاو',
    category: 'Grains & Bread',
    servingSize: '1 cup cooked (160g)',
    servingGrams: 160,
    calories: 224,
    protein: 8.0,
    fat: 1.3,
    carbs: 44.0,
    fiber: 7.2,
    sugars: 1.3,
    sodium: 24,
    source: 'verified_database',
    variants: [
      { id: 'var_freekeh_cup', name: '1 cup cooked (160g)', calories: 224, protein: 8.0, carbs: 44.0, fat: 1.3, servingSize: '1 cup cooked (160g)', servingGrams: 160 },
      { id: 'var_freekeh_half_cup', name: '1/2 cup cooked (80g)', calories: 112, protein: 4.0, carbs: 22.0, fat: 0.6, servingSize: '1/2 cup cooked (80g)', servingGrams: 80 },
      { id: 'var_freekeh_100g', name: '100g cooked', calories: 140, protein: 5.0, carbs: 27.5, fat: 0.8, servingSize: '100g cooked', servingGrams: 100 }
    ]
  },
  // 11. Pistachios (USDA #170184)
  {
    id: 'food_pistachios_roasted_salted',
    name: 'Pistachios (Dry Roasted, Salted)',
    nameAr: 'فستق حلبي محمص ومملح',
    nameCkb: 'فستقی برژاو و خوێدار',
    category: 'Nuts & Seeds',
    servingSize: '1 handful / oz (30g)',
    servingGrams: 30,
    calories: 170,
    protein: 6.3,
    fat: 13.6,
    carbs: 8.4,
    fiber: 3.1,
    sugars: 2.3,
    sodium: 128,
    source: 'verified_database',
    variants: [
      { id: 'var_pistachio_handful', name: '1 handful (30g)', calories: 170, protein: 6.3, carbs: 8.4, fat: 13.6, servingSize: '1 handful (30g)', servingGrams: 30 },
      { id: 'var_pistachio_50g', name: '50g portion', calories: 284, protein: 10.5, carbs: 14.0, fat: 22.7, servingSize: '50g portion', servingGrams: 50 },
      { id: 'var_pistachio_100g', name: '100g edible kernels', calories: 567, protein: 20.9, carbs: 28.0, fat: 45.4, servingSize: '100g edible kernels', servingGrams: 100 }
    ]
  },
  // 12. Cashews (USDA #170163)
  {
    id: 'food_cashews_roasted_salted',
    name: 'Cashews (Dry Roasted, Salted)',
    nameAr: 'كاجو محمص ومملح',
    nameCkb: 'کاجۆی برژاو و خوێدار',
    category: 'Nuts & Seeds',
    servingSize: '1 ounce / handful (28g)',
    servingGrams: 28,
    calories: 161,
    protein: 4.3,
    fat: 13.0,
    carbs: 9.2,
    fiber: 0.8,
    sugars: 1.4,
    sodium: 179,
    source: 'verified_database',
    variants: [
      { id: 'var_cashew_handful', name: '1 handful (28g)', calories: 161, protein: 4.3, carbs: 9.2, fat: 13.0, servingSize: '1 handful (28g)', servingGrams: 28 },
      { id: 'var_cashew_50g', name: '50g portion', calories: 287, protein: 7.7, carbs: 16.4, fat: 23.2, servingSize: '50g portion', servingGrams: 50 },
      { id: 'var_cashew_100g', name: '100g portion', calories: 574, protein: 15.3, carbs: 32.7, fat: 46.4, servingSize: '100g portion', servingGrams: 100 }
    ]
  },
  // 13. Figs (USDA #173021)
  {
    id: 'food_figs_fresh_raw',
    name: 'Fresh Figs (raw)',
    nameAr: 'تين طازج',
    nameCkb: 'هەنجیری تازە',
    category: 'Fruit',
    servingSize: '1 medium fig (50g)',
    servingGrams: 50,
    calories: 37,
    protein: 0.38,
    fat: 0.15,
    carbs: 9.6,
    fiber: 1.5,
    sugars: 8.2,
    sodium: 1,
    source: 'verified_database',
    variants: [
      { id: 'var_fig_1med', name: '1 medium fig (50g)', calories: 37, protein: 0.38, carbs: 9.6, fat: 0.15, servingSize: '1 medium fig (50g)', servingGrams: 50 },
      { id: 'var_fig_3med', name: '3 medium figs (150g)', calories: 111, protein: 1.13, carbs: 28.8, fat: 0.45, servingSize: '3 medium figs (150g)', servingGrams: 150 },
      { id: 'var_fig_100g', name: '100g edible portion', calories: 74, protein: 0.75, carbs: 19.2, fat: 0.3, servingSize: '100g edible portion', servingGrams: 100 }
    ]
  },
  // 14. Pomegranate (USDA #169134)
  {
    id: 'food_pomegranate_arils_raw',
    name: 'Pomegranate Arils (fresh seeds)',
    nameAr: 'حبوب الرمان الطازج',
    nameCkb: 'دانەی هەناری تازە',
    category: 'Fruit',
    servingSize: '1/2 cup arils (87g)',
    servingGrams: 87,
    calories: 72,
    protein: 1.45,
    fat: 1.02,
    carbs: 16.3,
    fiber: 3.5,
    sugars: 11.9,
    sodium: 3,
    source: 'verified_database',
    variants: [
      { id: 'var_pom_half_cup', name: '1/2 cup arils (87g)', calories: 72, protein: 1.45, carbs: 16.3, fat: 1.02, servingSize: '1/2 cup arils (87g)', servingGrams: 87 },
      { id: 'var_pom_whole', name: '1 whole fruit arils (150g)', calories: 125, protein: 2.5, carbs: 28.1, fat: 1.76, servingSize: '1 whole fruit arils (150g)', servingGrams: 150 },
      { id: 'var_pom_100g', name: '100g arils', calories: 83, protein: 1.67, carbs: 18.7, fat: 1.17, servingSize: '100g arils', servingGrams: 100 }
    ]
  },
  // 15. Peach (USDA #169928)
  {
    id: 'food_peach_fresh_raw',
    name: 'Peach (fresh, raw)',
    nameAr: 'خوخ طازج',
    nameCkb: 'قۆخی تازە',
    category: 'Fruit',
    servingSize: '1 medium peach (150g)',
    servingGrams: 150,
    calories: 59,
    protein: 1.37,
    fat: 0.38,
    carbs: 14.3,
    fiber: 2.3,
    sugars: 12.6,
    sodium: 0,
    source: 'verified_database',
    variants: [
      { id: 'var_peach_1med', name: '1 medium peach (150g)', calories: 59, protein: 1.37, carbs: 14.3, fat: 0.38, servingSize: '1 medium peach (150g)', servingGrams: 150 },
      { id: 'var_peach_100g', name: '100g edible portion', calories: 39, protein: 0.91, carbs: 9.54, fat: 0.25, servingSize: '100g edible portion', servingGrams: 100 },
      { id: 'var_peach_large', name: '1 large peach (200g)', calories: 78, protein: 1.82, carbs: 19.1, fat: 0.5, servingSize: '1 large peach (200g)', servingGrams: 200 }
    ]
  },
  // 16. Pear (USDA #169960)
  {
    id: 'food_pear_fresh_raw',
    name: 'Pear (fresh, raw with skin)',
    nameAr: 'كمثرى (عرموط) طازج',
    nameCkb: 'هرمێی تازە',
    category: 'Fruit',
    servingSize: '1 medium pear (178g)',
    servingGrams: 178,
    calories: 101,
    protein: 0.64,
    fat: 0.25,
    carbs: 27.1,
    fiber: 5.5,
    sugars: 17.4,
    sodium: 2,
    source: 'verified_database',
    variants: [
      { id: 'var_pear_1med', name: '1 medium pear (178g)', calories: 101, protein: 0.64, carbs: 27.1, fat: 0.25, servingSize: '1 medium pear (178g)', servingGrams: 178 },
      { id: 'var_pear_100g', name: '100g edible portion', calories: 57, protein: 0.36, carbs: 15.2, fat: 0.14, servingSize: '100g edible portion', servingGrams: 100 },
      { id: 'var_pear_small', name: '1 small pear (148g)', calories: 84, protein: 0.53, carbs: 22.5, fat: 0.21, servingSize: '1 small pear (148g)', servingGrams: 148 }
    ]
  },
  // 17. Sweet Cherries (USDA #171719)
  {
    id: 'food_sweet_cherries_raw',
    name: 'Sweet Cherries (fresh, raw)',
    nameAr: 'كرز حلو طازج',
    nameCkb: 'گێلاسی تازە',
    category: 'Fruit',
    servingSize: '1 cup with pits (140g)',
    servingGrams: 140,
    calories: 88,
    protein: 1.48,
    fat: 0.28,
    carbs: 22.4,
    fiber: 2.9,
    sugars: 17.9,
    sodium: 0,
    source: 'verified_database',
    variants: [
      { id: 'var_cherry_1cup', name: '1 cup (140g)', calories: 88, protein: 1.48, carbs: 22.4, fat: 0.28, servingSize: '1 cup (140g)', servingGrams: 140 },
      { id: 'var_cherry_10cherries', name: '10 cherries (80g)', calories: 50, protein: 0.85, carbs: 12.8, fat: 0.16, servingSize: '10 cherries (80g)', servingGrams: 80 },
      { id: 'var_cherry_100g', name: '100g edible portion', calories: 63, protein: 1.06, carbs: 16.0, fat: 0.2, servingSize: '100g edible portion', servingGrams: 100 }
    ]
  },
  // 18. Kiwi (USDA #169917)
  {
    id: 'food_kiwi_green_raw',
    name: 'Kiwi Fruit (green, raw)',
    nameAr: 'كيوي طازج',
    nameCkb: 'کیوی تازە',
    category: 'Fruit',
    servingSize: '1 medium kiwi (75g)',
    servingGrams: 75,
    calories: 46,
    protein: 0.86,
    fat: 0.39,
    carbs: 11.0,
    fiber: 2.3,
    sugars: 6.7,
    sodium: 2,
    source: 'verified_database',
    variants: [
      { id: 'var_kiwi_1med', name: '1 medium kiwi (75g)', calories: 46, protein: 0.86, carbs: 11.0, fat: 0.39, servingSize: '1 medium kiwi (75g)', servingGrams: 75 },
      { id: 'var_kiwi_2med', name: '2 medium kiwis (150g)', calories: 92, protein: 1.71, carbs: 22.1, fat: 0.78, servingSize: '2 medium kiwis (150g)', servingGrams: 150 },
      { id: 'var_kiwi_100g', name: '100g edible portion', calories: 61, protein: 1.14, carbs: 14.7, fat: 0.52, servingSize: '100g edible portion', servingGrams: 100 }
    ]
  },
  // 19. Pineapple (USDA #169124)
  {
    id: 'food_pineapple_fresh_raw',
    name: 'Pineapple (fresh chunks, raw)',
    nameAr: 'أناناس طازج مقطع',
    nameCkb: 'ئەناناسی تازە',
    category: 'Fruit',
    servingSize: '1 cup chunks (165g)',
    servingGrams: 165,
    calories: 82,
    protein: 0.89,
    fat: 0.2,
    carbs: 21.6,
    fiber: 2.3,
    sugars: 16.3,
    sodium: 2,
    source: 'verified_database',
    variants: [
      { id: 'var_pineapple_1cup', name: '1 cup chunks (165g)', calories: 82, protein: 0.89, carbs: 21.6, fat: 0.2, servingSize: '1 cup chunks (165g)', servingGrams: 165 },
      { id: 'var_pineapple_1slice', name: '1 thick slice (84g)', calories: 42, protein: 0.45, carbs: 11.0, fat: 0.1, servingSize: '1 thick slice (84g)', servingGrams: 84 },
      { id: 'var_pineapple_100g', name: '100g edible portion', calories: 50, protein: 0.54, carbs: 13.1, fat: 0.12, servingSize: '100g edible portion', servingGrams: 100 }
    ]
  },
  // 20. Lemon (USDA #167746)
  {
    id: 'food_lemon_raw_peeled',
    name: 'Lemon (raw, without peel)',
    nameAr: 'ليمون طازج (مقشر)',
    nameCkb: 'لیمۆی تازەی بێ توێکڵ',
    category: 'Fruit',
    servingSize: '1 medium lemon (58g)',
    servingGrams: 58,
    calories: 19,
    protein: 0.64,
    fat: 0.17,
    carbs: 4.2,
    fiber: 1.6,
    sugars: 1.5,
    sodium: 1,
    source: 'verified_database',
    variants: [
      { id: 'var_lemon_1med', name: '1 medium lemon (58g)', calories: 19, protein: 0.64, carbs: 4.2, fat: 0.17, servingSize: '1 medium lemon (58g)', servingGrams: 58 },
      { id: 'var_lemon_juice_2tbsp', name: '2 tbsp lemon juice (30g)', calories: 8, protein: 0.1, carbs: 2.0, fat: 0.05, servingSize: '2 tbsp lemon juice (30g)', servingGrams: 30 },
      { id: 'var_lemon_100g', name: '100g edible portion', calories: 29, protein: 1.1, carbs: 7.2, fat: 0.3, servingSize: '100g edible portion', servingGrams: 100 }
    ]
  },
  // 21. Coconut Meat (USDA #170169)
  {
    id: 'food_coconut_meat_raw',
    name: 'Coconut Meat (fresh, raw)',
    nameAr: 'لب جوز الهند الطازج',
    nameCkb: 'گۆشتی گوێزی هیندیی تازە',
    category: 'Fruit',
    servingSize: '1 piece (45g)',
    servingGrams: 45,
    calories: 159,
    protein: 1.5,
    fat: 15.1,
    carbs: 6.8,
    fiber: 4.1,
    sugars: 2.8,
    sodium: 9,
    source: 'verified_database',
    variants: [
      { id: 'var_coconut_1pc', name: '1 piece (45g)', calories: 159, protein: 1.5, carbs: 6.8, fat: 15.1, servingSize: '1 piece (45g)', servingGrams: 45 },
      { id: 'var_coconut_shredded', name: '1/2 cup shredded (40g)', calories: 142, protein: 1.33, carbs: 6.1, fat: 13.4, servingSize: '1/2 cup shredded (40g)', servingGrams: 40 },
      { id: 'var_coconut_100g', name: '100g edible portion', calories: 354, protein: 3.33, carbs: 15.2, fat: 33.5, servingSize: '100g edible portion', servingGrams: 100 }
    ]
  },
  // 22. Zucchini (USDA #170457)
  {
    id: 'food_zucchini_cooked_boiled',
    name: 'Cooked Zucchini (courgette, boiled)',
    nameAr: 'كوسة مطبوخة (شجر مسلوق)',
    nameCkb: 'کولەکەی سەوزی کوڵاو',
    category: 'Vegetables',
    servingSize: '1 cup sliced (180g)',
    servingGrams: 180,
    calories: 27,
    protein: 2.05,
    fat: 0.65,
    carbs: 4.84,
    fiber: 1.8,
    sugars: 3.08,
    sodium: 5,
    source: 'verified_database',
    variants: [
      { id: 'var_zucchini_1cup', name: '1 cup sliced (180g)', calories: 27, protein: 2.05, carbs: 4.84, fat: 0.65, servingSize: '1 cup sliced (180g)', servingGrams: 180 },
      { id: 'var_zucchini_1med', name: '1 medium zucchini (150g)', calories: 23, protein: 1.71, carbs: 4.04, fat: 0.54, servingSize: '1 medium zucchini (150g)', servingGrams: 150 },
      { id: 'var_zucchini_100g', name: '100g cooked', calories: 15, protein: 1.14, carbs: 2.69, fat: 0.36, servingSize: '100g cooked', servingGrams: 100 }
    ]
  },
  // 23. Canned Sardines (USDA #175139)
  {
    id: 'food_sardines_canned_oil',
    name: 'Canned Sardines (in oil, drained solids)',
    nameAr: 'سردين معلب بالزيت (مصفى)',
    nameCkb: 'سەردینی قوتوو لەناو ڕۆن',
    category: 'Fish & Seafood',
    servingSize: '1 can drained (85g)',
    servingGrams: 85,
    calories: 177,
    protein: 20.9,
    fat: 9.8,
    carbs: 0,
    fiber: 0,
    sugars: 0,
    sodium: 429,
    source: 'verified_database',
    variants: [
      { id: 'var_sardine_1can', name: '1 can drained (85g)', calories: 177, protein: 20.9, carbs: 0, fat: 9.8, servingSize: '1 can drained (85g)', servingGrams: 85 },
      { id: 'var_sardine_100g', name: '100g drained portion', calories: 208, protein: 24.6, carbs: 0, fat: 11.5, servingSize: '100g drained portion', servingGrams: 100 },
      { id: 'var_sardine_large_can', name: 'Large can drained (120g)', calories: 250, protein: 29.5, carbs: 0, fat: 13.8, servingSize: 'Large can drained (120g)', servingGrams: 120 }
    ]
  },
  // 24. Chicken Liver (USDA #171060)
  {
    id: 'food_chicken_liver_cooked',
    name: 'Chicken Liver (cooked, simmered)',
    nameAr: 'كبدة دجاج مطبوخة',
    nameCkb: 'جگەری مریشکی کوڵاو',
    category: 'Meat & Poultry',
    servingSize: '1 liver (44g)',
    servingGrams: 44,
    calories: 70,
    protein: 11.0,
    fat: 2.3,
    carbs: 0.4,
    fiber: 0,
    sugars: 0,
    sodium: 36,
    source: 'verified_database',
    variants: [
      { id: 'var_chick_liver_1pc', name: '1 liver (44g)', calories: 70, protein: 11.0, carbs: 0.4, fat: 2.3, servingSize: '1 liver (44g)', servingGrams: 44 },
      { id: 'var_chick_liver_100g', name: '100g cooked portion', calories: 160, protein: 25.0, carbs: 0.9, fat: 5.2, servingSize: '100g cooked portion', servingGrams: 100 },
      { id: 'var_chick_liver_plate', name: '1 plate (150g)', calories: 240, protein: 37.5, carbs: 1.4, fat: 7.8, servingSize: '1 plate (150g)', servingGrams: 150 }
    ]
  },
  // 25. Beef Liver (USDA #169451)
  {
    id: 'food_beef_liver_cooked',
    name: 'Beef Liver (cooked, braised)',
    nameAr: 'كبدة بقري مطبوخة',
    nameCkb: 'جگەری مانگای کوڵاو',
    category: 'Meat & Poultry',
    servingSize: '1 slice (81g)',
    servingGrams: 81,
    calories: 142,
    protein: 21.5,
    fat: 3.8,
    carbs: 4.2,
    fiber: 0,
    sugars: 0,
    sodium: 61,
    source: 'verified_database',
    variants: [
      { id: 'var_beef_liver_1slice', name: '1 slice (81g)', calories: 142, protein: 21.5, carbs: 4.2, fat: 3.8, servingSize: '1 slice (81g)', servingGrams: 81 },
      { id: 'var_beef_liver_100g', name: '100g cooked portion', calories: 175, protein: 26.5, carbs: 5.2, fat: 4.7, servingSize: '100g cooked portion', servingGrams: 100 },
      { id: 'var_beef_liver_plate', name: '1 plate (150g)', calories: 263, protein: 39.8, carbs: 7.8, fat: 7.1, servingSize: '1 plate (150g)', servingGrams: 150 }
    ]
  },
  // 26. Instant Noodles (USDA #172778)
  {
    id: 'food_instant_noodles_cooked',
    name: 'Instant Noodles (cooked ramen soup)',
    nameAr: 'شعرية سريعة التحضير (إندومي)',
    nameCkb: 'نودڵسی ئامادەکراو (ئیندۆمی)',
    category: 'Fast Food & Meals',
    servingSize: '1 prepared packet (380g)',
    servingGrams: 380,
    calories: 331,
    protein: 6.8,
    fat: 14.1,
    carbs: 44.1,
    fiber: 1.9,
    sugars: 1.5,
    sodium: 1444,
    source: 'verified_database',
    variants: [
      { id: 'var_instant_noodle_pkt', name: '1 prepared packet (380g)', calories: 331, protein: 6.8, carbs: 44.1, fat: 14.1, servingSize: '1 prepared packet (380g)', servingGrams: 380 },
      { id: 'var_instant_noodle_100g', name: '100g prepared soup', calories: 87, protein: 1.8, carbs: 11.6, fat: 3.7, servingSize: '100g prepared soup', servingGrams: 100 },
      { id: 'var_instant_noodle_half', name: '1/2 bowl (190g)', calories: 165, protein: 3.4, carbs: 22.0, fat: 7.0, servingSize: '1/2 bowl (190g)', servingGrams: 190 }
    ]
  },
  // 27. Cornflakes (USDA #171661)
  {
    id: 'food_cornflakes_cereal_plain',
    name: 'Cornflakes Cereal (plain)',
    nameAr: 'رقائق الذرة (كورن فليكس)',
    nameCkb: 'کۆرن فلێکس',
    category: 'Grains & Bread',
    servingSize: '1 cup (30g)',
    servingGrams: 30,
    calories: 107,
    protein: 2.3,
    fat: 0.1,
    carbs: 25.2,
    fiber: 1.0,
    sugars: 2.9,
    sodium: 219,
    source: 'verified_database',
    variants: [
      { id: 'var_cornflakes_1cup', name: '1 cup (30g)', calories: 107, protein: 2.3, carbs: 25.2, fat: 0.1, servingSize: '1 cup (30g)', servingGrams: 30 },
      { id: 'var_cornflakes_bowl', name: '1 large bowl (50g)', calories: 179, protein: 3.8, carbs: 42.1, fat: 0.2, servingSize: '1 large bowl (50g)', servingGrams: 50 },
      { id: 'var_cornflakes_100g', name: '100g dry cereal', calories: 357, protein: 7.5, carbs: 84.1, fat: 0.4, servingSize: '100g dry cereal', servingGrams: 100 }
    ]
  },
  // 28. Fruit Jam (USDA #173295)
  {
    id: 'food_fruit_jam_preserves',
    name: 'Fruit Jam / Preserves',
    nameAr: 'مربى فواكه',
    nameCkb: 'مرەبای میوە',
    category: 'Sauces & Dips',
    servingSize: '1 tbsp (20g)',
    servingGrams: 20,
    calories: 56,
    protein: 0.08,
    fat: 0.02,
    carbs: 13.8,
    fiber: 0.2,
    sugars: 9.7,
    sodium: 6,
    source: 'verified_database',
    variants: [
      { id: 'var_jam_1tbsp', name: '1 tbsp (20g)', calories: 56, protein: 0.08, carbs: 13.8, fat: 0.02, servingSize: '1 tbsp (20g)', servingGrams: 20 },
      { id: 'var_jam_1tsp', name: '1 tsp (7g)', calories: 19, protein: 0.03, carbs: 4.8, fat: 0.01, servingSize: '1 tsp (7g)', servingGrams: 7 },
      { id: 'var_jam_100g', name: '100g portion', calories: 278, protein: 0.4, carbs: 68.9, fat: 0.1, servingSize: '100g portion', servingGrams: 100 }
    ]
  },
  // 29. Chocolate Hazelnut Spread (USDA #170273)
  {
    id: 'food_chocolate_hazelnut_spread',
    name: 'Chocolate Hazelnut Spread',
    nameAr: 'كريمة شوكولاتة بالبندق (نوتيلا)',
    nameCkb: 'کرێمی چۆکۆڵاتە و فندقی نۆتێلا',
    category: 'Sauces & Dips',
    servingSize: '1 tbsp (19g)',
    servingGrams: 19,
    calories: 102,
    protein: 1.2,
    fat: 5.9,
    carbs: 10.9,
    fiber: 0.6,
    sugars: 10.7,
    sodium: 8,
    source: 'verified_database',
    variants: [
      { id: 'var_nutella_1tbsp', name: '1 tbsp (19g)', calories: 102, protein: 1.2, carbs: 10.9, fat: 5.9, servingSize: '1 tbsp (19g)', servingGrams: 19 },
      { id: 'var_nutella_2tbsp', name: '2 tbsp (37g)', calories: 200, protein: 2.3, carbs: 21.3, fat: 11.4, servingSize: '2 tbsp (37g)', servingGrams: 37 },
      { id: 'var_nutella_100g', name: '100g portion', calories: 539, protein: 6.3, carbs: 57.5, fat: 30.9, servingSize: '100g portion', servingGrams: 100 }
    ]
  },
  // 30. Tomato Ketchup (USDA #170457)
  {
    id: 'food_tomato_ketchup',
    name: 'Tomato Ketchup',
    nameAr: 'كاتشب طماطم',
    nameCkb: 'کەچەپی تەماتە',
    category: 'Sauces & Dips',
    servingSize: '1 tbsp (17g)',
    servingGrams: 17,
    calories: 19,
    protein: 0.2,
    fat: 0.03,
    carbs: 4.5,
    fiber: 0.1,
    sugars: 3.7,
    sodium: 154,
    source: 'verified_database',
    variants: [
      { id: 'var_ketchup_1tbsp', name: '1 tbsp (17g)', calories: 19, protein: 0.2, carbs: 4.5, fat: 0.03, servingSize: '1 tbsp (17g)', servingGrams: 17 },
      { id: 'var_ketchup_pkt', name: '1 single packet (9g)', calories: 10, protein: 0.1, carbs: 2.38, fat: 0.01, servingSize: '1 single packet (9g)', servingGrams: 9 },
      { id: 'var_ketchup_100g', name: '100g portion', calories: 111, protein: 1.18, carbs: 26.5, fat: 0.18, servingSize: '100g portion', servingGrams: 100 }
    ]
  },
  // 31. Mayonnaise (USDA #172348)
  {
    id: 'food_mayonnaise_regular',
    name: 'Mayonnaise (regular full fat)',
    nameAr: 'مايونيز كلاسيكي كامل الدسم',
    nameCkb: 'مایۆنێزی کلاسیک',
    category: 'Sauces & Dips',
    servingSize: '1 tbsp (14g)',
    servingGrams: 14,
    calories: 95,
    protein: 0.13,
    fat: 10.5,
    carbs: 0.08,
    fiber: 0,
    sugars: 0.08,
    sodium: 89,
    source: 'verified_database',
    variants: [
      { id: 'var_mayo_1tbsp', name: '1 tbsp (14g)', calories: 95, protein: 0.13, carbs: 0.08, fat: 10.5, servingSize: '1 tbsp (14g)', servingGrams: 14 },
      { id: 'var_mayo_1tsp', name: '1 tsp (5g)', calories: 34, protein: 0.05, carbs: 0.03, fat: 3.75, servingSize: '1 tsp (5g)', servingGrams: 5 },
      { id: 'var_mayo_100g', name: '100g portion', calories: 680, protein: 0.96, carbs: 0.57, fat: 74.9, servingSize: '100g portion', servingGrams: 100 }
    ]
  },
  // 32. Sprite (The Coca-Cola Company, Drinks, ml)
  {
    id: 'pop_sprite_lemon_lime',
    name: 'Sprite Lemon-Lime Soda',
    nameAr: 'سبرايت ليمون',
    nameCkb: 'سپڕایت',
    category: 'Drinks',
    unit: 'ml',
    brand: 'The Coca-Cola Company',
    servingSize: '1 can (330ml)',
    servingGrams: 330,
    calories: 129,
    protein: 0,
    fat: 0,
    carbs: 31.7,
    fiber: 0,
    sugars: 31.7,
    sodium: 36,
    source: 'verified_database',
    variants: [
      { id: 'var_sprite_330ml', name: '1 standard can (330ml)', calories: 129, protein: 0, carbs: 31.7, fat: 0, servingSize: '1 standard can (330ml)', servingGrams: 330 },
      { id: 'var_sprite_250ml', name: '1 small can (250ml)', calories: 98, protein: 0, carbs: 24.0, fat: 0, servingSize: '1 small can (250ml)', servingGrams: 250 },
      { id: 'var_sprite_500ml', name: '1 bottle (500ml)', calories: 195, protein: 0, carbs: 48.0, fat: 0, servingSize: '1 bottle (500ml)', servingGrams: 500 },
      { id: 'var_sprite_100ml', name: '100ml portion', calories: 39, protein: 0, carbs: 9.6, fat: 0, servingSize: '100ml portion', servingGrams: 100 }
    ]
  },
  // 33. Fanta Orange (The Coca-Cola Company, Drinks, ml)
  {
    id: 'pop_fanta_orange',
    name: 'Fanta Orange Soda',
    nameAr: 'فانتا برتقال',
    nameCkb: 'فانتا پرتەقاڵ',
    category: 'Drinks',
    unit: 'ml',
    brand: 'The Coca-Cola Company',
    servingSize: '1 can (330ml)',
    servingGrams: 330,
    calories: 142,
    protein: 0,
    fat: 0,
    carbs: 35.0,
    fiber: 0,
    sugars: 35.0,
    sodium: 50,
    source: 'verified_database',
    variants: [
      { id: 'var_fanta_330ml', name: '1 standard can (330ml)', calories: 142, protein: 0, carbs: 35.0, fat: 0, servingSize: '1 standard can (330ml)', servingGrams: 330 },
      { id: 'var_fanta_250ml', name: '1 small can (250ml)', calories: 108, protein: 0, carbs: 26.5, fat: 0, servingSize: '1 small can (250ml)', servingGrams: 250 },
      { id: 'var_fanta_500ml', name: '1 bottle (500ml)', calories: 215, protein: 0, carbs: 53.0, fat: 0, servingSize: '1 bottle (500ml)', servingGrams: 500 },
      { id: 'var_fanta_100ml', name: '100ml portion', calories: 43, protein: 0, carbs: 10.6, fat: 0, servingSize: '100ml portion', servingGrams: 100 }
    ]
  },
  // 34. 7Up (PepsiCo, Drinks, ml)
  {
    id: 'pop_7up_lemon_lime',
    name: '7Up Lemon-Lime Soda',
    nameAr: 'سفن أب',
    nameCkb: 'سێڤن ئەپ',
    category: 'Drinks',
    unit: 'ml',
    brand: 'PepsiCo',
    servingSize: '1 can (330ml)',
    servingGrams: 330,
    calories: 125,
    protein: 0,
    fat: 0,
    carbs: 31.4,
    fiber: 0,
    sugars: 31.4,
    sodium: 46,
    source: 'verified_database',
    variants: [
      { id: 'var_7up_330ml', name: '1 standard can (330ml)', calories: 125, protein: 0, carbs: 31.4, fat: 0, servingSize: '1 standard can (330ml)', servingGrams: 330 },
      { id: 'var_7up_250ml', name: '1 small can (250ml)', calories: 95, protein: 0, carbs: 23.8, fat: 0, servingSize: '1 small can (250ml)', servingGrams: 250 },
      { id: 'var_7up_500ml', name: '1 bottle (500ml)', calories: 190, protein: 0, carbs: 47.5, fat: 0, servingSize: '1 bottle (500ml)', servingGrams: 500 },
      { id: 'var_7up_100ml', name: '100ml portion', calories: 38, protein: 0, carbs: 9.5, fat: 0, servingSize: '100ml portion', servingGrams: 100 }
    ]
  },
  // 35. Plain Tea Biscuits (USDA #172709)
  {
    id: 'food_tea_biscuits_plain',
    name: 'Plain Tea Biscuits (Marie)',
    nameAr: 'بسكويت شاي سادة',
    nameCkb: 'بیسکیتی چای سادە',
    category: 'Bakery & Sweets',
    servingSize: '4 biscuits (32g)',
    servingGrams: 32,
    calories: 141,
    protein: 2.4,
    fat: 3.8,
    carbs: 23.8,
    fiber: 0.8,
    sugars: 7.0,
    sodium: 131,
    source: 'verified_database',
    variants: [
      { id: 'var_biscuit_4pc', name: '4 biscuits (32g)', calories: 141, protein: 2.4, carbs: 23.8, fat: 3.8, servingSize: '4 biscuits (32g)', servingGrams: 32 },
      { id: 'var_biscuit_1pc', name: '1 biscuit (8g)', calories: 35, protein: 0.6, carbs: 6.0, fat: 1.0, servingSize: '1 biscuit (8g)', servingGrams: 8 },
      { id: 'var_biscuit_100g', name: '100g portion', calories: 440, protein: 7.5, carbs: 74.5, fat: 12.0, servingSize: '100g portion', servingGrams: 100 }
    ]
  },
  // 36. Wafers (USDA #172733)
  {
    id: 'food_wafers_vanilla_creme',
    name: 'Vanilla Creme Wafers',
    nameAr: 'ويفر بالكريمة والفانيلا',
    nameCkb: 'وایفەری کرێم و ڤانێلا',
    category: 'Bakery & Sweets',
    servingSize: '3 wafers (36g)',
    servingGrams: 36,
    calories: 181,
    protein: 1.5,
    fat: 8.7,
    carbs: 24.6,
    fiber: 0.4,
    sugars: 13.5,
    sodium: 68,
    source: 'verified_database',
    variants: [
      { id: 'var_wafer_3pc', name: '3 wafers (36g)', calories: 181, protein: 1.5, carbs: 24.6, fat: 8.7, servingSize: '3 wafers (36g)', servingGrams: 36 },
      { id: 'var_wafer_1pc', name: '1 wafer (12g)', calories: 60, protein: 0.5, carbs: 8.2, fat: 2.9, servingSize: '1 wafer (12g)', servingGrams: 12 },
      { id: 'var_wafer_100g', name: '100g portion', calories: 504, protein: 4.2, carbs: 68.2, fat: 24.3, servingSize: '100g portion', servingGrams: 100 }
    ]
  },
  // 37. Donut (USDA #173264)
  {
    id: 'food_donut_glazed_yeast',
    name: 'Glazed Ring Donut',
    nameAr: 'دونات كلاسيكي مغطى بالسكر',
    nameCkb: 'دۆناتی شەکرڕێژکراو',
    category: 'Bakery & Sweets',
    servingSize: '1 medium donut (64g)',
    servingGrams: 64,
    calories: 269,
    protein: 3.5,
    fat: 14.6,
    carbs: 31.4,
    fiber: 1.0,
    sugars: 17.3,
    sodium: 209,
    source: 'verified_database',
    variants: [
      { id: 'var_donut_1med', name: '1 medium donut (64g)', calories: 269, protein: 3.5, carbs: 31.4, fat: 14.6, servingSize: '1 medium donut (64g)', servingGrams: 64 },
      { id: 'var_donut_mini', name: '1 mini donut hole (20g)', calories: 84, protein: 1.1, carbs: 9.8, fat: 4.6, servingSize: '1 mini donut hole (20g)', servingGrams: 20 },
      { id: 'var_donut_100g', name: '100g portion', calories: 421, protein: 5.5, carbs: 49.0, fat: 22.8, servingSize: '100g portion', servingGrams: 100 }
    ]
  },
  // 38. Brownie (USDA #173260)
  {
    id: 'food_chocolate_brownie_fudge',
    name: 'Chocolate Fudge Brownie',
    nameAr: 'براوني الشوكولاتة الفاخر',
    nameCkb: 'براونی چۆکۆڵاتە',
    category: 'Bakery & Sweets',
    servingSize: '1 square brownie (60g)',
    servingGrams: 60,
    calories: 280,
    protein: 3.0,
    fat: 15.6,
    carbs: 33.0,
    fiber: 1.9,
    sugars: 22.8,
    sodium: 162,
    source: 'verified_database',
    variants: [
      { id: 'var_brownie_1sq', name: '1 square (60g)', calories: 280, protein: 3.0, carbs: 33.0, fat: 15.6, servingSize: '1 square (60g)', servingGrams: 60 },
      { id: 'var_brownie_mini', name: '1 bite / mini (30g)', calories: 140, protein: 1.5, carbs: 16.5, fat: 7.8, servingSize: '1 bite / mini (30g)', servingGrams: 30 },
      { id: 'var_brownie_100g', name: '100g portion', calories: 466, protein: 5.0, carbs: 55.0, fat: 26.0, servingSize: '100g portion', servingGrams: 100 }
    ]
  },
  // 39. Spaghetti (USDA #168937)
  {
    id: 'food_spaghetti_cooked_plain',
    name: 'Spaghetti Pasta (cooked plain)',
    nameAr: 'معكرونة سباغيتي مطبوخة سادة',
    nameCkb: 'سپاگێتی کوڵاوی سادە',
    category: 'Grains & Bread',
    servingSize: '1 cup cooked (140g)',
    servingGrams: 140,
    calories: 221,
    protein: 8.1,
    fat: 1.3,
    carbs: 43.2,
    fiber: 2.5,
    sugars: 0.8,
    sodium: 1,
    source: 'verified_database',
    variants: [
      { id: 'var_spaghetti_1cup', name: '1 cup cooked (140g)', calories: 221, protein: 8.1, carbs: 43.2, fat: 1.3, servingSize: '1 cup cooked (140g)', servingGrams: 140 },
      { id: 'var_spaghetti_half_cup', name: '1/2 cup cooked (70g)', calories: 111, protein: 4.1, carbs: 21.6, fat: 0.7, servingSize: '1/2 cup cooked (70g)', servingGrams: 70 },
      { id: 'var_spaghetti_100g', name: '100g cooked portion', calories: 158, protein: 5.8, carbs: 30.9, fat: 0.93, servingSize: '100g cooked portion', servingGrams: 100 }
    ]
  },
  // 40. Penne (USDA #168937)
  {
    id: 'food_penne_cooked_plain',
    name: 'Penne Pasta (cooked plain)',
    nameAr: 'معكرونة بيني مطبوخة سادة',
    nameCkb: 'پێنێی کوڵاوی سادە',
    category: 'Grains & Bread',
    servingSize: '1 cup cooked (140g)',
    servingGrams: 140,
    calories: 221,
    protein: 8.1,
    fat: 1.3,
    carbs: 43.2,
    fiber: 2.5,
    sugars: 0.8,
    sodium: 1,
    source: 'verified_database',
    variants: [
      { id: 'var_penne_1cup', name: '1 cup cooked (140g)', calories: 221, protein: 8.1, carbs: 43.2, fat: 1.3, servingSize: '1 cup cooked (140g)', servingGrams: 140 },
      { id: 'var_penne_half_cup', name: '1/2 cup cooked (70g)', calories: 111, protein: 4.1, carbs: 21.6, fat: 0.7, servingSize: '1/2 cup cooked (70g)', servingGrams: 70 },
      { id: 'var_penne_100g', name: '100g cooked portion', calories: 158, protein: 5.8, carbs: 30.9, fat: 0.93, servingSize: '100g cooked portion', servingGrams: 100 }
    ]
  },
  // 41. Macaroni (USDA #168937)
  {
    id: 'food_macaroni_cooked_plain',
    name: 'Elbow Macaroni (cooked plain)',
    nameAr: 'معكرونة كوع (إلبو) مطبوخة سادة',
    nameCkb: 'مەعکەرۆنی کوڵاوی سادە',
    category: 'Grains & Bread',
    servingSize: '1 cup cooked (140g)',
    servingGrams: 140,
    calories: 221,
    protein: 8.1,
    fat: 1.3,
    carbs: 43.2,
    fiber: 2.5,
    sugars: 0.8,
    sodium: 1,
    source: 'verified_database',
    variants: [
      { id: 'var_macaroni_1cup', name: '1 cup cooked (140g)', calories: 221, protein: 8.1, carbs: 43.2, fat: 1.3, servingSize: '1 cup cooked (140g)', servingGrams: 140 },
      { id: 'var_macaroni_half_cup', name: '1/2 cup cooked (70g)', calories: 111, protein: 4.1, carbs: 21.6, fat: 0.7, servingSize: '1/2 cup cooked (70g)', servingGrams: 70 },
      { id: 'var_macaroni_100g', name: '100g cooked portion', calories: 158, protein: 5.8, carbs: 30.9, fat: 0.93, servingSize: '100g cooked portion', servingGrams: 100 }
    ]
  },

  // -------------------------------------------------------------
  // PIZZA MATRIX (Cheese, Pepperoni, Vegetable, Chicken)
  // Each with: per 100g, 1 slice, Small (6 slices), Medium (8 slices), Large (8 slices)
  // -------------------------------------------------------------

  // Pizza 1: Cheese Pizza (USDA #174824)
  {
    id: 'pizza_cheese_margherita',
    name: 'Cheese Pizza (Margherita / Classic)',
    nameAr: 'بيتزا جبنة مارغريتا كلاسيكية',
    nameCkb: 'پیتزای پەنیر (مارگریتا)',
    category: 'Fast Food & Meals',
    servingSize: '1 slice of medium (107g)',
    servingGrams: 107,
    calories: 286,
    protein: 12.1,
    fat: 11.1,
    carbs: 34.5,
    fiber: 2.5,
    sugars: 3.9,
    sodium: 640,
    source: 'verified_database',
    variants: [
      { id: 'var_pizza_cheese_100g', name: 'Per 100g', calories: 267, protein: 11.3, carbs: 32.2, fat: 10.4, servingSize: '100g', servingGrams: 100 },
      { id: 'var_pizza_cheese_slice', name: '1 slice of medium (107g)', calories: 286, protein: 12.1, carbs: 34.5, fat: 11.1, servingSize: '1 slice (107g)', servingGrams: 107 },
      { id: 'var_pizza_cheese_small', name: 'Small 10" Pie (6 slices, 450g)', calories: 1202, protein: 50.9, carbs: 144.9, fat: 46.8, servingSize: 'Small 10" Pie (450g)', servingGrams: 450 },
      { id: 'var_pizza_cheese_med', name: 'Medium 12" Pie (8 slices, 650g)', calories: 1736, protein: 73.5, carbs: 209.3, fat: 67.6, servingSize: 'Medium 12" Pie (650g)', servingGrams: 650 },
      { id: 'var_pizza_cheese_large', name: 'Large 14" Pie (8 slices, 880g)', calories: 2350, protein: 99.4, carbs: 283.4, fat: 91.5, servingSize: 'Large 14" Pie (880g)', servingGrams: 880 }
    ]
  },
  // Pizza 2: Pepperoni Pizza (USDA #174828)
  {
    id: 'pizza_pepperoni_classic',
    name: 'Pepperoni Pizza',
    nameAr: 'بيتزا بيبروني كلاسيكية',
    nameCkb: 'پیتزای پێپەرۆنی',
    category: 'Fast Food & Meals',
    servingSize: '1 slice of medium (110g)',
    servingGrams: 110,
    calories: 328,
    protein: 13.5,
    fat: 15.2,
    carbs: 34.3,
    fiber: 2.3,
    sugars: 3.7,
    sodium: 748,
    source: 'verified_database',
    variants: [
      { id: 'var_pizza_pep_100g', name: 'Per 100g', calories: 298, protein: 12.3, carbs: 31.2, fat: 13.8, servingSize: '100g', servingGrams: 100 },
      { id: 'var_pizza_pep_slice', name: '1 slice of medium (110g)', calories: 328, protein: 13.5, carbs: 34.3, fat: 15.2, servingSize: '1 slice (110g)', servingGrams: 110 },
      { id: 'var_pizza_pep_small', name: 'Small 10" Pie (6 slices, 470g)', calories: 1401, protein: 57.8, carbs: 146.6, fat: 64.9, servingSize: 'Small 10" Pie (470g)', servingGrams: 470 },
      { id: 'var_pizza_pep_med', name: 'Medium 12" Pie (8 slices, 680g)', calories: 2026, protein: 83.6, carbs: 212.2, fat: 93.8, servingSize: 'Medium 12" Pie (680g)', servingGrams: 680 },
      { id: 'var_pizza_pep_large', name: 'Large 14" Pie (8 slices, 920g)', calories: 2742, protein: 113.2, carbs: 287.0, fat: 127.0, servingSize: 'Large 14" Pie (920g)', servingGrams: 920 }
    ]
  },
  // Pizza 3: Vegetable Pizza (USDA #174835)
  {
    id: 'pizza_vegetable_supreme',
    name: 'Vegetable Pizza (Veggie Supreme)',
    nameAr: 'بيتزا خضار مشكلة',
    nameCkb: 'پیتزای سەوزەوات',
    category: 'Fast Food & Meals',
    servingSize: '1 slice of medium (115g)',
    servingGrams: 115,
    calories: 270,
    protein: 10.9,
    fat: 9.4,
    carbs: 35.4,
    fiber: 2.9,
    sugars: 4.4,
    sodium: 587,
    source: 'verified_database',
    variants: [
      { id: 'var_pizza_veg_100g', name: 'Per 100g', calories: 235, protein: 9.5, carbs: 30.8, fat: 8.2, servingSize: '100g', servingGrams: 100 },
      { id: 'var_pizza_veg_slice', name: '1 slice of medium (115g)', calories: 270, protein: 10.9, carbs: 35.4, fat: 9.4, servingSize: '1 slice (115g)', servingGrams: 115 },
      { id: 'var_pizza_veg_small', name: 'Small 10" Pie (6 slices, 480g)', calories: 1128, protein: 45.6, carbs: 147.8, fat: 39.4, servingSize: 'Small 10" Pie (480g)', servingGrams: 480 },
      { id: 'var_pizza_veg_med', name: 'Medium 12" Pie (8 slices, 700g)', calories: 1645, protein: 66.5, carbs: 215.6, fat: 57.4, servingSize: 'Medium 12" Pie (700g)', servingGrams: 700 },
      { id: 'var_pizza_veg_large', name: 'Large 14" Pie (8 slices, 950g)', calories: 2233, protein: 90.3, carbs: 292.6, fat: 77.9, servingSize: 'Large 14" Pie (950g)', servingGrams: 950 }
    ]
  },
  // Pizza 4: Chicken Pizza (BBQ / Grilled Chicken)
  {
    id: 'pizza_chicken_grilled',
    name: 'Chicken Pizza (Grilled / BBQ Chicken)',
    nameAr: 'بيتزا دجاج مشوي',
    nameCkb: 'پیتزای مریشکی برژاو',
    category: 'Fast Food & Meals',
    servingSize: '1 slice of medium (112g)',
    servingGrams: 112,
    calories: 282,
    protein: 15.9,
    fat: 9.9,
    carbs: 32.5,
    fiber: 2.0,
    sugars: 4.7,
    sodium: 650,
    source: 'verified_database',
    variants: [
      { id: 'var_pizza_chick_100g', name: 'Per 100g', calories: 252, protein: 14.2, carbs: 29.0, fat: 8.8, servingSize: '100g', servingGrams: 100 },
      { id: 'var_pizza_chick_slice', name: '1 slice of medium (112g)', calories: 282, protein: 15.9, carbs: 32.5, fat: 9.9, servingSize: '1 slice (112g)', servingGrams: 112 },
      { id: 'var_pizza_chick_small', name: 'Small 10" Pie (6 slices, 470g)', calories: 1184, protein: 66.7, carbs: 136.3, fat: 41.4, servingSize: 'Small 10" Pie (470g)', servingGrams: 470 },
      { id: 'var_pizza_chick_med', name: 'Medium 12" Pie (8 slices, 690g)', calories: 1739, protein: 98.0, carbs: 200.1, fat: 60.7, servingSize: 'Medium 12" Pie (690g)', servingGrams: 690 },
      { id: 'var_pizza_chick_large', name: 'Large 14" Pie (8 slices, 930g)', calories: 2344, protein: 132.1, carbs: 269.7, fat: 81.8, servingSize: 'Large 14" Pie (930g)', servingGrams: 930 }
    ]
  }
];
