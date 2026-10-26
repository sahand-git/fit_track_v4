import { FoodItem } from '../types';

export const NEW_REGIONAL_FOODS: FoodItem[] = [
  // 1. Kleicha (Date Pastry)
  {
    id: 'regional_kleicha_dates',
    name: 'Kleicha Cardamom Date Pastry',
    nameAr: 'كليجة عراقية بالتمر والهيل',
    nameCkb: 'کولیچەی خورما و هێل',
    servingSize: '2 pieces (70g)',
    servingGrams: 70,
    calories: 285,
    protein: 4.5,
    carbs: 41,
    fat: 11.5,
    fiber: 2.8,
    sugars: 18.5,
    sodium: 120,
    category: 'Regional Dishes',
    portionUnit: 'piece',
    gramsPerUnit: 35,
    isEstimate: true,
    recipeEstimate: true,
    source: 'regional_culinary_estimate',
    variants: [
      { id: 'var_kleicha_2pc', name: '2 pieces (70g)', calories: 285, protein: 4.5, carbs: 41, fat: 11.5, servingSize: '2 pieces (70g)', servingGrams: 70 },
      { id: 'var_kleicha_1pc', name: '1 piece (35g)', calories: 143, protein: 2.3, carbs: 20.5, fat: 5.8, servingSize: '1 piece (35g)', servingGrams: 35 },
      { id: 'var_kleicha_100g', name: '100g portion', calories: 407, protein: 6.4, carbs: 58.6, fat: 16.4, servingSize: '100g portion', servingGrams: 100 }
    ],
    ingredients: [
      { name: 'Wheat flour dough', grams: 30, source: 'USDA FDC #20081 (Wheat flour)', calories: 109, protein: 3.1, carbs: 22.8, fat: 0.3 },
      { name: 'Date paste (pitted medjool dates)', grams: 25, source: 'USDA FDC #09421 (Dates, medjool)', calories: 69, protein: 0.5, carbs: 18.8, fat: 0 },
      { name: 'Clarified butter / Ghee', grams: 10, source: 'USDA FDC #01001 (Butter, clarified)', calories: 88, protein: 0.1, carbs: 0, fat: 9.9 },
      { name: 'Granulated sugar', grams: 3, source: 'USDA FDC #19335 (Sugars, granulated)', calories: 12, protein: 0, carbs: 3, fat: 0 },
      { name: 'Cardamom, fennel seeds & nigella', grams: 2, source: 'USDA FDC #02006 (Spices, cardamom)', calories: 7, protein: 0.2, carbs: 1.4, fat: 0.1 }
    ]
  },
  // 2. Kurdish Chicken Biryani
  {
    id: 'regional_biryani_chicken',
    name: 'Kurdish Chicken Biryani',
    nameAr: 'برياني دجاج كوردي',
    nameCkb: 'بریانیی مریشکی کوردی',
    servingSize: '1 plate (350g)',
    servingGrams: 350,
    calories: 561,
    protein: 34,
    carbs: 70,
    fat: 15.5,
    fiber: 3.5,
    sugars: 4.5,
    sodium: 520,
    category: 'Regional Dishes',
    portionUnit: 'plate',
    gramsPerUnit: 350,
    isEstimate: true,
    recipeEstimate: true,
    source: 'regional_culinary_estimate',
    variants: [
      { id: 'var_biryani_chicken_half', name: 'Half Plate (175g)', calories: 281, protein: 17, carbs: 35, fat: 7.8, servingSize: 'Half Plate (175g)', servingGrams: 175 },
      { id: 'var_biryani_chicken_full', name: '1 Full Plate (350g)', calories: 561, protein: 34, carbs: 70, fat: 15.5, servingSize: '1 Full Plate (350g)', servingGrams: 350 },
      { id: 'var_biryani_chicken_100g', name: '100g portion', calories: 160, protein: 9.7, carbs: 20, fat: 4.4, servingSize: '100g portion', servingGrams: 100 }
    ],
    ingredients: [
      { name: 'Cooked basmati rice', grams: 180, source: 'USDA FDC #20089 (Rice, white, long-grain, cooked)', calories: 234, protein: 4.9, carbs: 50.4, fat: 0.4 },
      { name: 'Shredded poached chicken breast', grams: 90, source: 'USDA FDC #05064 (Chicken breast, cooked)', calories: 149, protein: 27.9, carbs: 0, fat: 3.2 },
      { name: 'Toasted golden vermicelli', grams: 30, source: 'USDA FDC #20109 (Pasta, cooked)', calories: 54, protein: 1.8, carbs: 11.1, fat: 0.2 },
      { name: 'Green peas and diced carrots', grams: 30, source: 'USDA FDC #11326 (Peas and carrots, cooked)', calories: 21, protein: 1.1, carbs: 4.1, fat: 0.1 },
      { name: 'Ghee / vegetable oil', grams: 5, source: 'USDA FDC #04053 (Oil, olive or vegetable)', calories: 44, protein: 0, carbs: 0, fat: 5 },
      { name: 'Golden raisins (kishmish)', grams: 10, source: 'USDA FDC #09299 (Raisins, seedless)', calories: 30, protein: 0.3, carbs: 7.9, fat: 0 },
      { name: 'Toasted slivered almonds', grams: 5, source: 'USDA FDC #12061 (Nuts, almonds)', calories: 29, protein: 1.1, carbs: 1.1, fat: 2.5 }
    ]
  },
  // 3. Iraqi Lamb Biryani
  {
    id: 'regional_biryani_lamb',
    name: 'Iraqi Lamb Biryani',
    nameAr: 'برياني لحم غنم عراقي',
    nameCkb: 'بریانیی گۆشتی بەرخی عێراقی',
    servingSize: '1 plate (350g)',
    servingGrams: 350,
    calories: 625,
    protein: 29,
    carbs: 68,
    fat: 26,
    fiber: 3.5,
    sugars: 4.5,
    sodium: 540,
    category: 'Regional Dishes',
    portionUnit: 'plate',
    gramsPerUnit: 350,
    isEstimate: true,
    recipeEstimate: true,
    source: 'regional_culinary_estimate',
    variants: [
      { id: 'var_biryani_lamb_half', name: 'Half Plate (175g)', calories: 313, protein: 14.5, carbs: 34, fat: 13, servingSize: 'Half Plate (175g)', servingGrams: 175 },
      { id: 'var_biryani_lamb_full', name: '1 Full Plate (350g)', calories: 625, protein: 29, carbs: 68, fat: 26, servingSize: '1 Full Plate (350g)', servingGrams: 350 },
      { id: 'var_biryani_lamb_100g', name: '100g portion', calories: 179, protein: 8.3, carbs: 19.4, fat: 7.4, servingSize: '100g portion', servingGrams: 100 }
    ],
    ingredients: [
      { name: 'Cooked basmati rice', grams: 180, source: 'USDA FDC #20089 (Rice, cooked)', calories: 234, protein: 4.9, carbs: 50.4, fat: 0.4 },
      { name: 'Braised tender lamb shoulder chunks', grams: 90, source: 'USDA FDC #17345 (Lamb, shoulder, cooked)', calories: 216, protein: 21.6, carbs: 0, fat: 14.4 },
      { name: 'Toasted golden vermicelli', grams: 30, source: 'USDA FDC #20109 (Pasta, vermicelli, cooked)', calories: 54, protein: 1.8, carbs: 11.1, fat: 0.2 },
      { name: 'Green peas and diced carrots', grams: 30, source: 'USDA FDC #11326 (Peas & carrots)', calories: 21, protein: 1.1, carbs: 4.1, fat: 0.1 },
      { name: 'Ghee / cooking fat', grams: 5, source: 'USDA FDC #04053 (Vegetable oil / Ghee)', calories: 44, protein: 0, carbs: 0, fat: 5 },
      { name: 'Toasted slivered almonds', grams: 10, source: 'USDA FDC #12061 (Almonds)', calories: 58, protein: 2.1, carbs: 2.2, fat: 5 },
      { name: 'Biryani spice blend', grams: 5, source: 'USDA FDC #02006 (Spices, cinnamon, cardamom)', calories: 0, protein: 0, carbs: 0, fat: 0 }
    ]
  },
  // 4. Kubba Halab (Crispy Rice Croquette)
  {
    id: 'regional_kubba_halab',
    name: 'Kubba Halab (Crispy Rice Croquette)',
    nameAr: 'كبة حلب (كبة رز مقرمشة باللحم)',
    nameCkb: 'کوبەی حەلەب (کوبەی برنجی برژاو)',
    servingSize: '2 croquettes (140g)',
    servingGrams: 140,
    calories: 290,
    protein: 13,
    carbs: 34,
    fat: 11,
    fiber: 1.5,
    sugars: 1.2,
    sodium: 380,
    category: 'Regional Dishes',
    portionUnit: 'piece',
    gramsPerUnit: 70,
    isEstimate: true,
    recipeEstimate: true,
    source: 'regional_culinary_estimate',
    variants: [
      { id: 'var_kubba_halab_2pc', name: '2 croquettes (140g)', calories: 290, protein: 13, carbs: 34, fat: 11, servingSize: '2 croquettes (140g)', servingGrams: 140 },
      { id: 'var_kubba_halab_1pc', name: '1 croquette (70g)', calories: 145, protein: 6.5, carbs: 17, fat: 5.5, servingSize: '1 croquette (70g)', servingGrams: 70 },
      { id: 'var_kubba_halab_100g', name: '100g portion', calories: 207, protein: 9.3, carbs: 24.3, fat: 7.9, servingSize: '100g portion', servingGrams: 100 }
    ],
    ingredients: [
      { name: 'Turmeric spiced cooked rice crust', grams: 80, source: 'USDA FDC #20089 (Rice, cooked)', calories: 104, protein: 2.2, carbs: 22.4, fat: 0.2 },
      { name: 'Cooked lean minced beef filling', grams: 40, source: 'USDA FDC #17003 (Beef, ground, 90% lean, cooked)', calories: 100, protein: 10.4, carbs: 0, fat: 5.6 },
      { name: 'Sauteed onions and parsley', grams: 12, source: 'USDA FDC #11283 (Onions, cooked)', calories: 15, protein: 0.3, carbs: 2.8, fat: 0.1 },
      { name: 'Sunflower oil absorbed during crisping', grams: 8, source: 'USDA FDC #04053 (Oil, sunflower)', calories: 71, protein: 0, carbs: 0, fat: 8 }
    ]
  },
  // 5. Kubba Burghul / Sawar (Torpedo Bulgur Kubba)
  {
    id: 'regional_kubba_sawar',
    name: 'Kubba Burghul / Sawar (Torpedo Bulgur Kubba)',
    nameAr: 'كبة برغل مقلية (كبة صوار)',
    nameCkb: 'کوبەی ساوار (کوبەی کڕاوکی گۆشت)',
    servingSize: '2 pieces (140g)',
    servingGrams: 140,
    calories: 320,
    protein: 14,
    carbs: 33,
    fat: 14.5,
    fiber: 3.8,
    sugars: 1.5,
    sodium: 410,
    category: 'Regional Dishes',
    portionUnit: 'piece',
    gramsPerUnit: 70,
    isEstimate: true,
    recipeEstimate: true,
    source: 'regional_culinary_estimate',
    variants: [
      { id: 'var_kubba_sawar_2pc', name: '2 pieces (140g)', calories: 320, protein: 14, carbs: 33, fat: 14.5, servingSize: '2 pieces (140g)', servingGrams: 140 },
      { id: 'var_kubba_sawar_1pc', name: '1 piece (70g)', calories: 160, protein: 7, carbs: 16.5, fat: 7.25, servingSize: '1 piece (70g)', servingGrams: 70 },
      { id: 'var_kubba_sawar_100g', name: '100g portion', calories: 229, protein: 10, carbs: 23.6, fat: 10.4, servingSize: '100g portion', servingGrams: 100 }
    ],
    ingredients: [
      { name: 'Fine cracked bulgur dough crust', grams: 75, source: 'USDA FDC #20013 (Bulgur, cooked)', calories: 110, protein: 3.5, carbs: 25.4, fat: 0.4 },
      { name: 'Spiced minced beef and lamb filling', grams: 45, source: 'USDA FDC #17003 (Beef, ground, cooked)', calories: 112, protein: 10.2, carbs: 0, fat: 7.2 },
      { name: 'Finely minced sauteed onion', grams: 10, source: 'USDA FDC #11283 (Onions, cooked)', calories: 12, protein: 0.2, carbs: 2.6, fat: 0.1 },
      { name: 'Vegetable frying oil absorbed', grams: 10, source: 'USDA FDC #04053 (Vegetable oil)', calories: 88, protein: 0, carbs: 0, fat: 10 }
    ]
  },
  // 6. Timman Ahmar (Iraqi Red Tomato Rice)
  {
    id: 'regional_timman_ahmar',
    name: 'Timman Ahmar (Iraqi Red Tomato Rice)',
    nameAr: 'تمن أحمر عراقي بالطماطم',
    nameCkb: 'برنجی سووری عێراقی بە تەماتە',
    servingSize: '1 plate (200g)',
    servingGrams: 200,
    calories: 277,
    protein: 5.4,
    carbs: 50.4,
    fat: 5.4,
    fiber: 2.1,
    sugars: 3.2,
    sodium: 320,
    category: 'Regional Dishes',
    portionUnit: 'plate',
    gramsPerUnit: 200,
    isEstimate: true,
    recipeEstimate: true,
    source: 'regional_culinary_estimate',
    variants: [
      { id: 'var_timman_ahmar_plate', name: '1 plate (200g)', calories: 277, protein: 5.4, carbs: 50.4, fat: 5.4, servingSize: '1 plate (200g)', servingGrams: 200 },
      { id: 'var_timman_ahmar_half', name: 'Half plate (100g)', calories: 139, protein: 2.7, carbs: 25.2, fat: 2.7, servingSize: 'Half plate (100g)', servingGrams: 100 },
      { id: 'var_timman_ahmar_100g', name: '100g portion', calories: 139, protein: 2.7, carbs: 25.2, fat: 2.7, servingSize: '100g portion', servingGrams: 100 }
    ],
    ingredients: [
      { name: 'Cooked basmati rice', grams: 160, source: 'USDA FDC #20089 (Rice, white, cooked)', calories: 208, protein: 4.3, carbs: 44.8, fat: 0.3 },
      { name: 'Concentrated tomato paste broth', grams: 25, source: 'USDA FDC #11546 (Tomato paste)', calories: 21, protein: 1, carbs: 4.7, fat: 0.1 },
      { name: 'Vegetable cooking oil', grams: 5, source: 'USDA FDC #04053 (Oil, vegetable)', calories: 44, protein: 0, carbs: 0, fat: 5 },
      { name: 'Finely diced onion', grams: 10, source: 'USDA FDC #11283 (Onions, cooked)', calories: 4, protein: 0.1, carbs: 0.9, fat: 0 }
    ]
  },
  // 7. Timman Baghila (Dill & Broad Bean Rice)
  {
    id: 'regional_timman_baghila',
    name: 'Timman Baghila (Dill & Broad Bean Rice)',
    nameAr: 'تمن باقلاء بالشبت والدهن الحر',
    nameCkb: 'برنجی باقڵاوە بە شیبت',
    servingSize: '1 plate (220g)',
    servingGrams: 220,
    calories: 309,
    protein: 8.3,
    carbs: 52.6,
    fat: 6.7,
    fiber: 4.5,
    sugars: 1.8,
    sodium: 280,
    category: 'Regional Dishes',
    portionUnit: 'plate',
    gramsPerUnit: 220,
    isEstimate: true,
    recipeEstimate: true,
    source: 'regional_culinary_estimate',
    variants: [
      { id: 'var_timman_baghila_plate', name: '1 plate (220g)', calories: 309, protein: 8.3, carbs: 52.6, fat: 6.7, servingSize: '1 plate (220g)', servingGrams: 220 },
      { id: 'var_timman_baghila_half', name: 'Half plate (110g)', calories: 155, protein: 4.1, carbs: 26.3, fat: 3.35, servingSize: 'Half plate (110g)', servingGrams: 110 },
      { id: 'var_timman_baghila_100g', name: '100g portion', calories: 140, protein: 3.8, carbs: 23.9, fat: 3.0, servingSize: '100g portion', servingGrams: 100 }
    ],
    ingredients: [
      { name: 'Cooked basmati rice', grams: 150, source: 'USDA FDC #20089 (Rice, white, cooked)', calories: 195, protein: 4.1, carbs: 42, fat: 0.3 },
      { name: 'Boiled tender broad beans (fava)', grams: 50, source: 'USDA FDC #16054 (Broadbeans, fava, cooked)', calories: 55, protein: 3.8, carbs: 9.8, fat: 0.3 },
      { name: 'Clarified butter / Ghee (dihin hurr)', grams: 6, source: 'USDA FDC #01001 (Butter, clarified / Ghee)', calories: 53, protein: 0, carbs: 0, fat: 6 },
      { name: 'Fresh chopped fragrant dill weed', grams: 14, source: 'USDA FDC #02045 (Dill weed, fresh)', calories: 6, protein: 0.4, carbs: 0.8, fat: 0.1 }
    ]
  },
  // 8. Iraqi Bamya Stew with Lamb
  {
    id: 'regional_bamya_lamb',
    name: 'Iraqi Bamya Stew with Lamb',
    nameAr: 'مرقة بامية عراقية بلحم الغنم',
    nameCkb: 'شۆربای بامیە بە گۆشتی بەرخ',
    servingSize: '1 deep bowl (300g)',
    servingGrams: 300,
    calories: 310,
    protein: 21,
    carbs: 14,
    fat: 18.5,
    fiber: 3.8,
    sugars: 4.5,
    sodium: 460,
    category: 'Regional Dishes',
    portionUnit: 'bowl',
    gramsPerUnit: 300,
    isEstimate: true,
    recipeEstimate: true,
    source: 'regional_culinary_estimate',
    variants: [
      { id: 'var_bamya_bowl', name: '1 deep bowl (300g)', calories: 310, protein: 21, carbs: 14, fat: 18.5, servingSize: '1 deep bowl (300g)', servingGrams: 300 },
      { id: 'var_bamya_half', name: 'Half bowl (150g)', calories: 155, protein: 10.5, carbs: 7, fat: 9.25, servingSize: 'Half bowl (150g)', servingGrams: 150 },
      { id: 'var_bamya_100g', name: '100g portion', calories: 103, protein: 7, carbs: 4.7, fat: 6.2, servingSize: '100g portion', servingGrams: 100 }
    ],
    ingredients: [
      { name: 'Tender baby okra pods', grams: 120, source: 'USDA FDC #11279 (Okra, cooked)', calories: 40, protein: 2.2, carbs: 8.4, fat: 0.2 },
      { name: 'Braised lamb shank chunks', grams: 80, source: 'USDA FDC #17345 (Lamb, shank, cooked)', calories: 192, protein: 18.4, carbs: 0, fat: 12.8 },
      { name: 'Garlic tomato stew broth', grams: 95, source: 'USDA FDC #11547 (Tomato puree)', calories: 36, protein: 1.6, carbs: 7.8, fat: 0.2 },
      { name: 'Olive oil / cooking fat for saute', grams: 5, source: 'USDA FDC #04053 (Oil, olive)', calories: 44, protein: 0, carbs: 0, fat: 5 }
    ]
  },
  // 9. Najafi Qeema (Pounded Lamb & Chickpea Stew)
  {
    id: 'regional_qeema_najafiya',
    name: 'Najafi Qeema (Pounded Lamb & Chickpea Stew)',
    nameAr: 'قيمة نجفية مهروسة باللحم والحمص',
    nameCkb: 'قیمەی نەجەفی بە گۆشت و نۆک',
    servingSize: '1 deep plate (300g)',
    servingGrams: 300,
    calories: 575,
    protein: 36,
    carbs: 45,
    fat: 27.5,
    fiber: 9.5,
    sugars: 6.0,
    sodium: 590,
    category: 'Regional Dishes',
    portionUnit: 'plate',
    gramsPerUnit: 300,
    isEstimate: true,
    recipeEstimate: true,
    source: 'regional_culinary_estimate',
    variants: [
      { id: 'var_qeema_plate', name: '1 deep plate (300g)', calories: 575, protein: 36, carbs: 45, fat: 27.5, servingSize: '1 deep plate (300g)', servingGrams: 300 },
      { id: 'var_qeema_half', name: 'Half plate (150g)', calories: 288, protein: 18, carbs: 22.5, fat: 13.75, servingSize: 'Half plate (150g)', servingGrams: 150 },
      { id: 'var_qeema_100g', name: '100g portion', calories: 192, protein: 12, carbs: 15, fat: 9.2, servingSize: '100g portion', servingGrams: 100 }
    ],
    ingredients: [
      { name: 'Tender boiled lamb, pounded fine', grams: 100, source: 'USDA FDC #17345 (Lamb, leg or shoulder, cooked)', calories: 240, protein: 24, carbs: 0, fat: 16 },
      { name: 'Boiled yellow split chickpeas, mashed', grams: 110, source: 'USDA FDC #16057 (Chickpeas, cooked)', calories: 180, protein: 9.8, carbs: 30.1, fat: 2.9 },
      { name: 'Tomato paste sauce reduction', grams: 75, source: 'USDA FDC #11546 (Tomato paste)', calories: 62, protein: 3.2, carbs: 14.2, fat: 0.3 },
      { name: 'Clarified butter / Ghee', grams: 10, source: 'USDA FDC #01001 (Butter, clarified)', calories: 88, protein: 0, carbs: 0, fat: 9.9 },
      { name: 'Dried lime (noomi basra), cardamom & cinnamon', grams: 5, source: 'USDA FDC #02006 (Spices)', calories: 5, protein: 0.1, carbs: 1.2, fat: 0.1 }
    ]
  },
  // 10. Iraqi Broasted Chicken
  {
    id: 'regional_chicken_broasted',
    name: 'Iraqi Broasted Chicken (Crispy Spiced)',
    nameAr: 'دجاج بروستد عراقي مقرمش',
    nameCkb: 'مریشکی برۆستدی عێراقی',
    servingSize: '2 pieces / half chicken (280g)',
    servingGrams: 280,
    calories: 795,
    protein: 55.6,
    carbs: 30.5,
    fat: 49.9,
    fiber: 1.2,
    sugars: 0.5,
    sodium: 840,
    category: 'Fast Food & Meals',
    portionUnit: 'piece',
    gramsPerUnit: 140,
    isEstimate: true,
    recipeEstimate: true,
    source: 'regional_culinary_estimate',
    variants: [
      { id: 'var_broasted_2pc', name: '2 pieces / half chicken (280g)', calories: 795, protein: 55.6, carbs: 30.5, fat: 49.9, servingSize: '2 pieces (280g)', servingGrams: 280 },
      { id: 'var_broasted_1pc', name: '1 piece (breast or thigh, 140g)', calories: 398, protein: 27.8, carbs: 15.3, fat: 25.0, servingSize: '1 piece (140g)', servingGrams: 140 },
      { id: 'var_broasted_100g', name: '100g edible portion', calories: 284, protein: 19.9, carbs: 10.9, fat: 17.8, servingSize: '100g portion', servingGrams: 100 }
    ],
    ingredients: [
      { name: 'Bone-in chicken meat & skin', grams: 220, source: 'USDA FDC #05011 (Chicken, broilers or fryers, meat and skin, cooked)', calories: 473, protein: 51.5, carbs: 0, fat: 29.5 },
      { name: 'Spiced flour and starch coating', grams: 40, source: 'USDA FDC #20081 (Wheat flour & starch)', calories: 145, protein: 4.1, carbs: 30.5, fat: 0.4 },
      { name: 'Vegetable frying oil absorbed', grams: 20, source: 'USDA FDC #04053 (Oil, vegetable)', calories: 177, protein: 0, carbs: 0, fat: 20 }
    ]
  },
  // 11. Chicken Fesenjan
  {
    id: 'regional_fesenjan_chicken',
    name: 'Fesenjan (Pomegranate Walnut Chicken Stew)',
    nameAr: 'فسنجان بالدجاج والجوز ودبس الرمان',
    nameCkb: 'فسنجان بە مریشک و گوێز و دۆشاوی هەنار',
    servingSize: '1 bowl (280g)',
    servingGrams: 280,
    calories: 690,
    protein: 28,
    carbs: 32,
    fat: 50,
    fiber: 4.8,
    sugars: 21.0,
    sodium: 380,
    category: 'Regional Dishes',
    portionUnit: 'bowl',
    gramsPerUnit: 280,
    isEstimate: true,
    recipeEstimate: true,
    source: 'regional_culinary_estimate',
    variants: [
      { id: 'var_fesenjan_bowl', name: '1 bowl (280g)', calories: 690, protein: 28, carbs: 32, fat: 50, servingSize: '1 bowl (280g)', servingGrams: 280 },
      { id: 'var_fesenjan_half', name: 'Half bowl (140g)', calories: 345, protein: 14, carbs: 16, fat: 25, servingSize: 'Half bowl (140g)', servingGrams: 140 },
      { id: 'var_fesenjan_100g', name: '100g portion', calories: 246, protein: 10, carbs: 11.4, fat: 17.9, servingSize: '100g portion', servingGrams: 100 }
    ],
    ingredients: [
      { name: 'Simmered skinless chicken thigh pieces', grams: 110, source: 'USDA FDC #05096 (Chicken, thigh, meat only, cooked)', calories: 230, protein: 26.2, carbs: 0, fat: 13.1 },
      { name: 'Finely ground toasted walnuts', grams: 50, source: 'USDA FDC #12155 (Nuts, walnuts, english)', calories: 327, protein: 7.6, carbs: 6.9, fat: 32.6 },
      { name: 'Pure pomegranate molasses syrup', grams: 40, source: 'USDA FDC #169134 (Pomegranate molasses)', calories: 100, protein: 0.2, carbs: 25, fat: 0 },
      { name: 'Sauteed onions and savory poultry broth', grams: 80, source: 'USDA FDC #11283 (Onions, cooked)', calories: 35, protein: 1.1, carbs: 6.8, fat: 0.4 }
    ]
  },
  // 12. Iraqi Pacha
  {
    id: 'regional_iraqi_pacha',
    name: 'Iraqi Pacha (Trotters & Stuffed Tripe Stew)',
    nameAr: 'باجة عراقية (كوارع وكرشات محشية)',
    nameCkb: 'پاچەی عێراقی (سەروپێ و ڕیخۆڵەی پڕکراو)',
    servingSize: '1 large bowl (450g)',
    servingGrams: 450,
    calories: 550,
    protein: 44,
    carbs: 16,
    fat: 34.5,
    fiber: 0.8,
    sugars: 0.5,
    sodium: 680,
    category: 'Regional Dishes',
    portionUnit: 'bowl',
    gramsPerUnit: 450,
    isEstimate: true,
    recipeEstimate: true,
    source: 'regional_culinary_estimate',
    variants: [
      { id: 'var_pacha_bowl', name: '1 large bowl (450g)', calories: 550, protein: 44, carbs: 16, fat: 34.5, servingSize: '1 large bowl (450g)', servingGrams: 450 },
      { id: 'var_pacha_half', name: 'Half bowl (225g)', calories: 275, protein: 22, carbs: 8, fat: 17.25, servingSize: 'Half bowl (225g)', servingGrams: 225 },
      { id: 'var_pacha_100g', name: '100g portion', calories: 122, protein: 9.8, carbs: 3.6, fat: 7.7, servingSize: '100g portion', servingGrams: 100 }
    ],
    ingredients: [
      { name: 'Boiled lamb trotters & head meat', grams: 180, source: 'USDA FDC #17345 (Lamb, variety meats, cooked)', calories: 360, protein: 34.2, carbs: 0, fat: 24.5 },
      { name: 'Cleaned sheep tripe stuffed with spiced rice', grams: 100, source: 'USDA FDC #17355 (Beef/Lamb tripe with rice filling)', calories: 155, protein: 9.8, carbs: 16.2, fat: 5.6 },
      { name: 'Concentrated spiced garlic lemon bone broth', grams: 170, source: 'USDA FDC #06170 (Soup, stock, beef/lamb home-prepared)', calories: 35, protein: 3.4, carbs: 1.2, fat: 1.8 }
    ]
  },
  // 13. Kurdish Chicken Tikka Kebab
  {
    id: 'regional_chicken_tikka_kebab',
    name: 'Kurdish Chicken Tikka Kebab',
    nameAr: 'شيش طاووق دجاج كوردي مشوي',
    nameCkb: 'تیکەی مریشکی برژاوی کوردی',
    servingSize: '1 skewer (85g)',
    servingGrams: 85,
    calories: 155,
    protein: 22.5,
    carbs: 0.9,
    fat: 6.8,
    fiber: 0.2,
    sugars: 0.6,
    sodium: 320,
    category: 'Regional Dishes',
    portionUnit: 'piece',
    gramsPerUnit: 85,
    isEstimate: true,
    recipeEstimate: true,
    source: 'regional_culinary_estimate',
    variants: [
      { id: 'var_tikka_1skewer', name: '1 skewer (85g)', calories: 155, protein: 22.5, carbs: 0.9, fat: 6.8, servingSize: '1 skewer (85g)', servingGrams: 85 },
      { id: 'var_tikka_2skewers', name: '2 skewers (170g)', calories: 310, protein: 45, carbs: 1.8, fat: 13.6, servingSize: '2 skewers (170g)', servingGrams: 170 },
      { id: 'var_tikka_100g', name: '100g portion', calories: 182, protein: 26.5, carbs: 1.1, fat: 8, servingSize: '100g portion', servingGrams: 100 }
    ],
    ingredients: [
      { name: 'Chicken breast cubes marinated', grams: 70, source: 'USDA FDC #05064 (Chicken, breast, meat only, cooked)', calories: 116, protein: 21.7, carbs: 0, fat: 2.5 },
      { name: 'Low-fat yogurt marinade with garlic', grams: 10, source: 'USDA FDC #171284 (Yogurt, plain, low fat)', calories: 6, protein: 0.5, carbs: 0.7, fat: 0.2 },
      { name: 'Olive oil & lemon brushing', grams: 5, source: 'USDA FDC #171413 (Oil, olive)', calories: 35, protein: 0, carbs: 0.2, fat: 4 }
    ]
  },
  // 14. Kebab Khashkhash (Aleppo / Iraqi Spiced Tomato Kebab)
  {
    id: 'regional_kebab_khashkhash',
    name: 'Kebab Khashkhash (Spiced Tomato Kebab)',
    nameAr: 'كباب خشخاش بالبندورة المشوية والثوم',
    nameCkb: 'کەبابی خەشخاش بە تەماتە و سیر',
    servingSize: '1 plate (250g)',
    servingGrams: 250,
    calories: 470,
    protein: 27,
    carbs: 5,
    fat: 38,
    fiber: 1.4,
    sugars: 3.2,
    sodium: 510,
    category: 'Regional Dishes',
    portionUnit: 'plate',
    gramsPerUnit: 250,
    isEstimate: true,
    recipeEstimate: true,
    source: 'regional_culinary_estimate',
    variants: [
      { id: 'var_khashkhash_plate', name: '1 plate (250g)', calories: 470, protein: 27, carbs: 5, fat: 38, servingSize: '1 plate (250g)', servingGrams: 250 },
      { id: 'var_khashkhash_half', name: 'Half plate (125g)', calories: 235, protein: 13.5, carbs: 2.5, fat: 19, servingSize: 'Half plate (125g)', servingGrams: 125 },
      { id: 'var_khashkhash_100g', name: '100g portion', calories: 188, protein: 10.8, carbs: 2, fat: 15.2, servingSize: '100g portion', servingGrams: 100 }
    ],
    ingredients: [
      { name: 'Charcoal-grilled minced lamb skewers (lyah 15%)', grams: 150, source: 'USDA FDC #169385 (Lamb, ground, cooked)', calories: 360, protein: 26.2, carbs: 0, fat: 28 },
      { name: 'Fire-roasted crushed tomatoes with garlic & sumac', grams: 90, source: 'USDA FDC #170457 (Tomatoes, red, ripe, raw)', calories: 25, protein: 1, carbs: 5, fat: 0.3 },
      { name: 'Extra virgin olive oil', grams: 10, source: 'USDA FDC #171413 (Oil, olive)', calories: 88, protein: 0, carbs: 0, fat: 10 }
    ]
  }
];
