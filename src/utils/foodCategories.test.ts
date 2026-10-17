import { foodCategory, getFoodEmoji, FoodCategory } from './foodCategories';
import { translate } from '../i18n/strings';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function runTests() {
  console.log('Starting Food Categories & Emoji Parity Tests...');

  // 1. Meat classification
  assert(foodCategory({ name: 'Grilled Chicken Breast' }) === 'Meat', 'Chicken should be Meat');
  assert(foodCategory({ name: 'Beef Ribeye Steak' }) === 'Meat', 'Steak should be Meat');
  assert(foodCategory({ name: 'Turkey Slice' }) === 'Meat', 'Turkey should be Meat');
  assert(foodCategory({ name: 'Lamb Chop' }) === 'Meat', 'Lamb should be Meat');
  assert(foodCategory({ name: 'Homemade Burger', category: 'meat' }) === 'Meat', 'Burger should be Meat');
  console.log('✓ Meat classification verified');

  // 2. Fish & Seafood classification
  assert(foodCategory({ name: 'Atlantic Salmon' }) === 'Fish & Seafood', 'Salmon should be Fish & Seafood');
  assert(foodCategory({ name: 'Tuna Salad' }) === 'Fish & Seafood', 'Tuna should be Fish & Seafood');
  assert(foodCategory({ name: 'Grilled Shrimp' }) === 'Fish & Seafood', 'Shrimp should be Fish & Seafood');
  assert(foodCategory({ name: 'Cod Fillet' }) === 'Fish & Seafood', 'Cod should be Fish & Seafood');
  console.log('✓ Fish & Seafood classification verified');

  // 3. Drinks classification
  assert(foodCategory({ name: 'Orange Juice' }) === 'Drinks', 'Juice should be Drinks');
  assert(foodCategory({ name: 'Black Coffee' }) === 'Drinks', 'Coffee should be Drinks');
  assert(foodCategory({ name: 'Herbal Tea' }) === 'Drinks', 'Tea should be Drinks');
  assert(foodCategory({ name: 'Almond Milk', category: 'dairy alternative' }) === 'Drinks', 'Almond Milk should be Drinks');
  console.log('✓ Drinks classification verified');

  // 4. Eggs & Dairy classification
  assert(foodCategory({ name: 'Boiled Egg' }) === 'Eggs & Dairy', 'Egg should be Eggs & Dairy');
  assert(foodCategory({ name: 'Whole Milk' }) === 'Eggs & Dairy', 'Milk should be Eggs & Dairy');
  assert(foodCategory({ name: 'Greek Yogurt' }) === 'Eggs & Dairy', 'Yogurt should be Eggs & Dairy');
  assert(foodCategory({ name: 'Cheddar Cheese' }) === 'Eggs & Dairy', 'Cheese should be Eggs & Dairy');
  assert(foodCategory({ name: 'Butter' }) === 'Eggs & Dairy', 'Butter should be Eggs & Dairy');
  console.log('✓ Eggs & Dairy classification verified');

  // 5. Grains & Bread classification
  assert(foodCategory({ name: 'White Rice' }) === 'Grains & Bread', 'Rice should be Grains & Bread');
  assert(foodCategory({ name: 'Sourdough Toast' }) === 'Grains & Bread', 'Toast should be Grains & Bread');
  assert(foodCategory({ name: 'Rolled Oats' }) === 'Grains & Bread', 'Oats should be Grains & Bread');
  assert(foodCategory({ name: 'Penne Pasta' }) === 'Grains & Bread', 'Pasta should be Grains & Bread');
  console.log('✓ Grains & Bread classification verified');

  // 6. Fruit classification
  assert(foodCategory({ name: 'Fresh Banana' }) === 'Fruit', 'Banana should be Fruit');
  assert(foodCategory({ name: 'Green Apple' }) === 'Fruit', 'Apple should be Fruit');
  assert(foodCategory({ name: 'Strawberries' }) === 'Fruit', 'Strawberries should be Fruit');
  assert(foodCategory({ name: 'Medjool Dates' }) === 'Fruit', 'Dates should be Fruit');
  console.log('✓ Fruit classification verified');

  // 7. Vegetables classification
  assert(foodCategory({ name: 'Steamed Broccoli' }) === 'Vegetables', 'Broccoli should be Vegetables');
  assert(foodCategory({ name: 'Garden Salad' }) === 'Vegetables', 'Salad should be Vegetables');
  assert(foodCategory({ name: 'Baby Carrots' }) === 'Vegetables', 'Carrots should be Vegetables');
  assert(foodCategory({ name: 'Cucumber Slices' }) === 'Vegetables', 'Cucumber should be Vegetables');
  console.log('✓ Vegetables classification verified');

  // 8. Beans & Lentils classification
  assert(foodCategory({ name: 'Red Lentil Soup' }) === 'Beans & Lentils', 'Lentils should be Beans & Lentils');
  assert(foodCategory({ name: 'Chickpea Hummus' }) === 'Beans & Lentils', 'Hummus should be Beans & Lentils');
  assert(foodCategory({ name: 'Crispy Falafel' }) === 'Beans & Lentils', 'Falafel should be Beans & Lentils');
  console.log('✓ Beans & Lentils classification verified');

  // 9. Nuts & Seeds classification
  assert(foodCategory({ name: 'Raw Almonds' }) === 'Nuts & Seeds', 'Almonds should be Nuts & Seeds');
  assert(foodCategory({ name: 'Walnuts' }) === 'Nuts & Seeds', 'Walnuts should be Nuts & Seeds');
  assert(foodCategory({ name: 'Peanut Butter' }) === 'Nuts & Seeds', 'Peanut butter should be Nuts & Seeds');
  console.log('✓ Nuts & Seeds classification verified');

  // 10. Snacks & Protein classification
  assert(foodCategory({ name: 'Whey Protein Powder' }) === 'Snacks & Protein', 'Protein powder should be Snacks & Protein');
  assert(foodCategory({ name: 'Chocolate Bar' }) === 'Snacks & Protein', 'Chocolate should be Snacks & Protein');
  assert(foodCategory({ name: 'Protein Bar' }) === 'Snacks & Protein', 'Protein bar should be Snacks & Protein');
  console.log('✓ Snacks & Protein classification verified');

  // 11. Other fallback
  assert(foodCategory({ name: 'Special Recipe #44' }) === 'Other', 'Unknown should be Other');
  console.log('✓ Other fallback verified');

  // 12. getFoodEmoji mappings
  assert(getFoodEmoji('Chicken Breast') === '🍗', 'Chicken should be 🍗');
  assert(getFoodEmoji('Beef Steak') === '🥩', 'Steak should be 🥩');
  assert(getFoodEmoji('Boiled Egg') === '🥚', 'Egg should be 🥚');
  assert(getFoodEmoji('Salmon Fillet') === '🐟', 'Salmon should be 🐟');
  assert(getFoodEmoji('White Rice') === '🍚', 'Rice should be 🍚');
  assert(getFoodEmoji('Pizza Slice') === '🍕', 'Pizza should be 🍕');
  assert(getFoodEmoji('Espresso') === '☕', 'Coffee should be ☕');
  assert(getFoodEmoji('Banana') === '🍌', 'Banana should be 🍌');
  assert(getFoodEmoji('Garden Salad') === '🥗', 'Salad should be 🥗');
  assert(getFoodEmoji('Whey Protein Shake') === '🥤', 'Protein shake should be 🥤');

  // Category fallback emoji
  assert(getFoodEmoji('Unknown Meat Dish', 'meat') === '🥩', 'Meat category should fall back to 🥩');
  assert(getFoodEmoji('Exotic Fruit Bowl', 'fruits') === '🍎', 'Fruit category should fall back to 🍎');
  assert(getFoodEmoji('Unrecognized Grain Dish', 'grains') === '🍞', 'Grains category should fall back to 🍞');
  assert(getFoodEmoji('Mystery Dish #9') === '🍽️', 'Unmatched should fall back to 🍽️');
  console.log('✓ getFoodEmoji mappings and fallbacks verified');

  // 13. Localization coverage
  const allCategories: FoodCategory[] = [
    'Meat',
    'Fish & Seafood',
    'Drinks',
    'Eggs & Dairy',
    'Grains & Bread',
    'Fruit',
    'Vegetables',
    'Beans & Lentils',
    'Nuts & Seeds',
    'Snacks & Protein',
    'Other',
  ];

  for (const cat of allCategories) {
    const ar = translate('ar', cat);
    const ckb = translate('ckb', cat);

    assert(Boolean(ar) && ar !== cat, `Arabic translation missing for ${cat}`);
    assert(Boolean(ckb) && ckb !== cat, `Sorani translation missing for ${cat}`);
  }
  console.log('✓ Localization completeness verified for ar and ckb');

  console.log('All food categories and emoji tests passed successfully!');
}

runTests();
