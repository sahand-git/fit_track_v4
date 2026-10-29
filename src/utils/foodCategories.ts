export type CanonicalFoodCategory =
  | 'Meat & Poultry'
  | 'Fish & Seafood'
  | 'Eggs & Dairy'
  | 'Grains & Bread'
  | 'Bakery & Sweets'
  | 'Fruit'
  | 'Vegetables'
  | 'Legumes'
  | 'Nuts & Seeds'
  | 'Drinks'
  | 'Snacks'
  | 'Fast Food & Meals'
  | 'Soups'
  | 'Sauces & Dips'
  | 'Oils & Fats'
  | 'Supplements'
  | 'Regional Dishes';

export const CANONICAL_FOOD_CATEGORIES: CanonicalFoodCategory[] = [
  'Meat & Poultry',
  'Fish & Seafood',
  'Eggs & Dairy',
  'Grains & Bread',
  'Bakery & Sweets',
  'Fruit',
  'Vegetables',
  'Legumes',
  'Nuts & Seeds',
  'Drinks',
  'Snacks',
  'Fast Food & Meals',
  'Soups',
  'Sauces & Dips',
  'Oils & Fats',
  'Supplements',
  'Regional Dishes',
];

// Maintained for backward compatibility with v2 legacy code
export type FoodCategory =
  | CanonicalFoodCategory
  | 'Meat'
  | 'Beans & Lentils'
  | 'Snacks & Protein'
  | 'Other';

export interface FoodCategoryInfo {
  category: FoodCategory;
  emoji: string;
}

export const CATEGORY_DEFAULT_EMOJI: Record<CanonicalFoodCategory, string> = {
  'Meat & Poultry': '🥩',
  'Fish & Seafood': '🐟',
  'Eggs & Dairy': '🥛',
  'Grains & Bread': '🍞',
  'Bakery & Sweets': '🧁',
  'Fruit': '🍎',
  'Vegetables': '🥦',
  'Legumes': '🫘',
  'Nuts & Seeds': '🥜',
  'Drinks': '🥤',
  'Snacks': '🍿',
  'Fast Food & Meals': '🍔',
  'Soups': '🍲',
  'Sauces & Dips': '🥣',
  'Oils & Fats': '🫒',
  'Supplements': '💊',
  'Regional Dishes': '🥘',
};

const SPECIFIC_FOOD_EMOJIS: [RegExp, string][] = [
  [/chicken|turkey|poultry/i, '🍗'],
  [/beef|lamb|steak|burger|veal|mutton/i, '🥩'],
  [/shrimp|prawn/i, '🦐'],
  [/salmon|tuna|tilapia|cod|sardine|carp|fish/i, '🐟'],
  [/eggplant|aubergine/i, '🍆'],
  [/\beggs?\b/i, '🥚'],
  [/peanut butter|almond butter/i, '🥜'],
  [/butter|ghee/i, '🧈'],
  [/cheese|cheddar|mozzarella|parmesan|gouda|feta/i, '🧀'],
  [/milk|latte/i, '🥛'],
  [/yogurt|yoghurt|labneh|mast/i, '🥣'],
  [/oat|oatmeal|cereal|porridge|quinoa|bulgur|couscous/i, '🥣'],
  [/rice|biryani|timman/i, '🍚'],
  [/pasta|spaghetti|macaroni|penne|noodle/i, '🍝'],
  [/pita|bread|toast|bagel|croissant|bun|wrap|samoon|naan/i, '🍞'],
  [/pizza/i, '🍕'],
  [/sandwich/i, '🥪'],
  [/soup|broth|shorba/i, '🍲'],
  [/fries|french fries|onion rings/i, '🍟'],
  [/nuggets|chicken nuggets/i, '🍗'],
  [/potato/i, '🥔'],
  [/carrot/i, '🥕'],
  [/cucumber/i, '🥒'],
  [/tomato/i, '🍅'],
  [/onion|garlic/i, '🧅'],
  [/broccoli/i, '🥦'],
  [/lettuce|spinach|okra|salad|cabbage|kale/i, '🥗'],
  [/lentil|bean|chickpea|hummus|edamame/i, '🫘'],
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
  [/cake|pastry|muffin|donut|kleicha/i, '🧁'],
  [/ice cream/i, '🍨'],
  [/sugar|honey|syrup|molasses/i, '🍯'],
  [/protein powder|whey|isolate|shake/i, '🥤'],
  [/dolma|yaprax/i, '🥘'],
  [/kubba|kebab|tikka/i, '🍢'],
];

/**
 * Classifies a food into one of the 17 canonical FitTrack v4 categories.
 */
export function foodCategory(food: { name: string; category?: string }): CanonicalFoodCategory {
  const name = (food.name || '').toLowerCase();
  const rawCat = (food.category || '').trim();
  const category = rawCat.toLowerCase();

  // Explicit check for exact canonical match first
  for (const c of CANONICAL_FOOD_CATEGORIES) {
    if (c.toLowerCase() === category) {
      return c;
    }
  }

  // 1. Regional dishes
  if (category === 'regional dishes' || category === 'regional' || /dolma|yaprax|kubba|biryani|masgouf|tashreeb|tepsi|qoozi|kleicha|kelane|shifta/.test(name)) {
    return 'Regional Dishes';
  }

  // 2. Fast food items (french fries, onion rings, nuggets, pizza, burgers)
  if (
    category === 'fast food & meals' ||
    category === 'fast food' ||
    category === 'pizza' ||
    /french fries|onion rings|chicken nuggets|nugget|burger|cheeseburger|hot dog|burrito|taco|quesadilla|nachos|pizza|spring roll/.test(name)
  ) {
    return 'Fast Food & Meals';
  }

  // 3. Soups
  if (category === 'soups' || category === 'soup' || /soup|shorba|broth|shorbat/.test(name)) {
    return 'Soups';
  }

  // 4. Sauces & Dips
  if (category === 'sauces & dips' || category === 'dips' || category === 'sauces' || /hummus|tahini|dip|guacamole|dressing|mayonnaise|ketchup/.test(name)) {
    return 'Sauces & Dips';
  }

  // 5. Oils & Fats
  if (category === 'oils & fats' || category === 'oils' || category === 'fats' || /\boil\b|olive oil|butter|ghee/.test(name)) {
    return 'Oils & Fats';
  }

  // 6. Supplements
  if (category === 'supplements' || category === 'supplement' || /protein powder|whey|creatine|multivitamin|supplement/.test(name)) {
    return 'Supplements';
  }

  // 7. Bakery & Sweets
  if (category === 'bakery & sweets' || category === 'bakery' || category === 'sweets' || /ice cream|cookie|cake|pastry|muffin|donut|brownie|cheesecake|chocolate|candy/.test(name)) {
    return 'Bakery & Sweets';
  }

  // 8. Fish & Seafood
  if (category === 'fish & seafood' || category === 'fish' || category === 'seafood' || /salmon|tuna|cod|tilapia|shrimp|prawn|fish|sardine|carp/.test(name)) {
    return 'Fish & Seafood';
  }

  // 9. Meat & Poultry
  if (category === 'meat & poultry' || category === 'meat' || category === 'poultry' || /chicken|turkey|beef|lamb|steak|veal|mutton/.test(name)) {
    return 'Meat & Poultry';
  }

  // 10. Drinks
  if (
    category === 'drinks' ||
    category === 'beverages' ||
    category === 'dairy alternative' ||
    /\b(juice|coffee|tea|water|drink|beverage|smoothie|ayran|soda|cola|pepsi|sprite|fanta)\b/.test(name)
  ) {
    return 'Drinks';
  }

  // 11. Eggs & Dairy
  if (category === 'eggs & dairy' || category === 'dairy' || /\beggs?\b|milk|yogurt|cheese|cottage cheese|labneh|mast/.test(name)) {
    return 'Eggs & Dairy';
  }

  // 12. Grains & Bread
  if (category === 'grains & bread' || category === 'grains' || /rice|bread|toast|pasta|oats|cereal|grain|flour|quinoa|samoon|naan|pita/.test(name)) {
    return 'Grains & Bread';
  }

  // 13. Fruit
  if (category === 'fruit' || category === 'fruits' || /apple|banana|orange|berry|berries|grape|melon|watermelon|mango|date|avocado/.test(name)) {
    return 'Fruit';
  }

  // 14. Vegetables
  if (category === 'vegetables' || category === 'vegetable' || category === 'produce' || /broccoli|spinach|carrot|cucumber|tomato|lettuce|cabbage|okra|pepper/.test(name)) {
    return 'Vegetables';
  }

  // 15. Legumes
  if (category === 'legumes' || category === 'beans & lentils' || category === 'plant protein' || /lentil|bean|chickpea|edamame|tofu|falafel/.test(name)) {
    return 'Legumes';
  }

  // 16. Nuts & Seeds
  if (category === 'nuts & seeds' || category === 'nuts' || /almond|walnut|peanut|cashew|pistachio|seed/.test(name)) {
    return 'Nuts & Seeds';
  }

  // 17. Snacks
  if (category === 'snacks' || category === 'snack' || /protein bar|chips|popcorn|pretzel|snack/.test(name)) {
    return 'Snacks';
  }

  return 'Fast Food & Meals';
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
