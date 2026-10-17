export type FoodCategory =
  | 'Meat'
  | 'Fish & Seafood'
  | 'Drinks'
  | 'Eggs & Dairy'
  | 'Grains & Bread'
  | 'Fruit'
  | 'Vegetables'
  | 'Beans & Lentils'
  | 'Nuts & Seeds'
  | 'Snacks & Protein'
  | 'Other';

export interface FoodCategoryInfo {
  category: FoodCategory;
  emoji: string;
}

const CATEGORY_DEFAULT_EMOJI: Record<FoodCategory, string> = {
  'Meat': '🥩',
  'Fish & Seafood': '🐟',
  'Drinks': '🥤',
  'Eggs & Dairy': '🥛',
  'Grains & Bread': '🍞',
  'Fruit': '🍎',
  'Vegetables': '🥦',
  'Beans & Lentils': '🫘',
  'Nuts & Seeds': '🥜',
  'Snacks & Protein': '🍫',
  'Other': '🍽️',
};

const SPECIFIC_FOOD_EMOJIS: [RegExp, string][] = [
  [/chicken|turkey|poultry/i, '🍗'],
  [/beef|lamb|steak|meat|burger|veal|mutton/i, '🥩'],
  [/shrimp|prawn/i, '🦐'],
  [/salmon|tuna|tilapia|cod|sardine|fish/i, '🐟'],
  [/eggplant|aubergine/i, '🍆'],
  [/\beggs?\b/i, '🥚'],
  [/peanut butter|almond butter/i, '🥜'],
  [/butter|ghee/i, '🧈'],
  [/cheese|cheddar|mozzarella|parmesan|gouda|feta/i, '🧀'],
  [/milk|latte/i, '🥛'],
  [/yogurt|yoghurt|labneh/i, '🥣'],
  [/oat|oatmeal|cereal|porridge|quinoa|bulgur|couscous/i, '🥣'],
  [/rice|biryani/i, '🍚'],
  [/pasta|spaghetti|macaroni|noodle/i, '🍝'],
  [/pita|bread|toast|bagel|croissant|bun|wrap/i, '🍞'],
  [/pizza/i, '🍕'],
  [/sandwich/i, '🥪'],
  [/soup|broth/i, '🍲'],
  [/potato|fries/i, '🥔'],
  [/carrot/i, '🥕'],
  [/cucumber/i, '🥒'],
  [/tomato/i, '🍅'],
  [/onion|garlic/i, '🧅'],
  [/broccoli/i, '🥦'],
  [/lettuce|spinach|okra|salad|cabbage|kale/i, '🥗'],
  [/lentil|bean|chickpea|hummus/i, '🫘'],
  [/falafel/i, '🧆'],
  [/banana/i, '🍌'],
  [/apple/i, '🍎'],
  [/orange|citrus|mandarin|tangerine/i, '🍊'],
  [/watermelon/i, '🍉'],
  [/grape/i, '🍇'],
  [/strawberr/i, '🍓'],
  [/blueberr|berries|berry/i, '🫐'],
  [/avocado/i, '🥑'],
  [/almond|walnut|peanut|cashew|pistachio|nuts/i, '🥜'],
  [/date|dates/i, '🌴'],
  [/olive|olive oil/i, '🫒'],
  [/oil/i, '🫗'],
  [/coffee|espresso|cappuccino/i, '☕'],
  [/tea|chai/i, '🍵'],
  [/juice|smoothie/i, '🧃'],
  [/water/i, '💧'],
  [/chocolate|candy|sweet/i, '🍫'],
  [/protein bar|energy bar/i, '🍫'],
  [/cookie|biscuit/i, '🍪'],
  [/cake|pastry|muffin/i, '🧁'],
  [/ice cream/i, '🍨'],
  [/sugar|honey|syrup/i, '🍯'],
  [/protein powder|whey|shake/i, '🥤'],
];

/**
 * Classifies a food into one of the 11 standard v2 categories.
 */
export function foodCategory(food: { name: string; category?: string }): FoodCategory {
  const name = (food.name || '').toLowerCase();
  const category = (food.category || '').toLowerCase();

  if (/beef|lamb|chicken|turkey|steak|burger|veal|mutton/.test(name) || category === 'meat') {
    return 'Meat';
  }
  if (/salmon|tuna|cod|tilapia|shrimp|prawn|fish|sardine/.test(name) || category === 'fish & seafood') {
    return 'Fish & Seafood';
  }
  if (
    category === 'dairy alternative' ||
    category === 'beverages' ||
    /\b(juice|coffee|tea|water|drink|drinks|beverage|smoothie)\b/.test(name)
  ) {
    return 'Drinks';
  }
  if (
    (/\beggs?\b|milk|yogurt|cheese|butter|labneh/.test(name) &&
      !name.includes('peanut') &&
      !name.includes('almond')) ||
    category === 'dairy'
  ) {
    return 'Eggs & Dairy';
  }
  if (['grains', 'bakery'].includes(category) || /rice|bread|toast|pasta|oats|cereal|grain|flour|quinoa/.test(name)) {
    return 'Grains & Bread';
  }
  if (category === 'fruits' || /apple|banana|orange|berry|berries|grape|melon|mango|date/.test(name)) {
    return 'Fruit';
  }
  if (['vegetables', 'produce'].includes(category) || /salad|spinach|lettuce|broccoli|carrot|tomato|cucumber/.test(name)) {
    return 'Vegetables';
  }
  if (['beans & lentils', 'plant protein'].includes(category) || /lentil|bean|chickpea|hummus|falafel|tofu/.test(name)) {
    return 'Beans & Lentils';
  }
  if (['nuts', 'nut butter'].includes(category) || /almond|walnut|peanut|cashew|pistachio|seed/.test(name)) {
    return 'Nuts & Seeds';
  }
  if (['snacks', 'supplements'].includes(category) || /protein bar|protein powder|whey|shake|chocolate|snack|cookie/.test(name)) {
    return 'Snacks & Protein';
  }

  return 'Other';
}

/**
 * Returns a matching emoji illustration for the food item.
 * Searches specific food keywords first, falls back to the category emoji, then to default 🍽️.
 */
export function getFoodEmoji(name: string, category?: string): string {
  const trimmedName = (name || '').trim();
  for (const [pattern, emoji] of SPECIFIC_FOOD_EMOJIS) {
    if (pattern.test(trimmedName)) {
      return emoji;
    }
  }

  const cat = foodCategory({ name: trimmedName, category });
  return CATEGORY_DEFAULT_EMOJI[cat] || '🍽️';
}
