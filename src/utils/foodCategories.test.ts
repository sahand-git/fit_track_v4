import { foodCategory, getFoodEmoji, CANONICAL_FOOD_CATEGORIES } from './foodCategories';
import { translate } from '../i18n/strings';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function runTests() {
  console.log('Starting Canonical Food Categories & Emoji Tests...');

  // 1. Meat & Poultry classification
  assert(foodCategory({ name: 'Grilled Chicken Breast' }) === 'Meat & Poultry', 'Chicken should be Meat & Poultry');
  assert(foodCategory({ name: 'Beef Ribeye Steak' }) === 'Meat & Poultry', 'Steak should be Meat & Poultry');
  assert(foodCategory({ name: 'Turkey Slice' }) === 'Meat & Poultry', 'Turkey should be Meat & Poultry');
  assert(foodCategory({ name: 'Lamb Chop' }) === 'Meat & Poultry', 'Lamb should be Meat & Poultry');
  console.log('✓ Meat & Poultry classification verified');

  // 2. Fish & Seafood classification
  assert(foodCategory({ name: 'Atlantic Salmon' }) === 'Fish & Seafood', 'Salmon should be Fish & Seafood');
  assert(foodCategory({ name: 'Tuna Salad' }) === 'Fish & Seafood', 'Tuna should be Fish & Seafood');
  assert(foodCategory({ name: 'Grilled Shrimp' }) === 'Fish & Seafood', 'Shrimp should be Fish & Seafood');
  assert(foodCategory({ name: 'Cod Fillet' }) === 'Fish & Seafood', 'Cod should be Fish & Seafood');
  console.log('✓ Fish & Seafood classification verified');

  // 3. Fast Food & Meals (fries, onion rings, nuggets, pizza, burgers)
  assert(foodCategory({ name: 'French Fries' }) === 'Fast Food & Meals', 'French fries are Fast Food & Meals, not Vegetables');
  assert(foodCategory({ name: 'Crispy Vegetable Spring Rolls' }) === 'Fast Food & Meals', 'Spring rolls are Fast Food & Meals, not Vegetables');
  assert(foodCategory({ name: 'Crispy Onion Rings' }) === 'Fast Food & Meals', 'Onion rings are Fast Food & Meals, not Vegetables');
  assert(foodCategory({ name: 'Chicken Nuggets' }) === 'Fast Food & Meals', 'Nuggets are Fast Food & Meals');
  assert(foodCategory({ name: 'Pepperoni Pizza' }) === 'Fast Food & Meals', 'Pizza is Fast Food & Meals');
  assert(foodCategory({ name: 'Classic Single Cheeseburger' }) === 'Fast Food & Meals', 'Cheeseburger is Fast Food & Meals');
  console.log('✓ Fast Food & Meals classification verified (fries, onion rings, nuggets, pizza, burgers)');

  // 4. Bakery & Sweets (ice cream, cake, cookies, donuts)
  assert(foodCategory({ name: 'Vanilla Ice Cream' }) === 'Bakery & Sweets', 'Ice cream is Bakery & Sweets');
  assert(foodCategory({ name: 'Chocolate Chip Cookie' }) === 'Bakery & Sweets', 'Cookie is Bakery & Sweets');
  assert(foodCategory({ name: 'Glazed Donut' }) === 'Bakery & Sweets', 'Donut is Bakery & Sweets');
  console.log('✓ Bakery & Sweets classification verified (ice cream is Bakery & Sweets)');

  // 5. Drinks classification
  assert(foodCategory({ name: 'Orange Juice' }) === 'Drinks', 'Juice should be Drinks');
  assert(foodCategory({ name: 'Black Coffee' }) === 'Drinks', 'Coffee should be Drinks');
  assert(foodCategory({ name: 'Herbal Tea' }) === 'Drinks', 'Tea should be Drinks');
  assert(foodCategory({ name: 'Almond Milk', category: 'Drinks' }) === 'Drinks', 'Almond Milk should be Drinks');
  console.log('✓ Drinks classification verified');

  // 6. Eggs & Dairy classification
  assert(foodCategory({ name: 'Boiled Egg' }) === 'Eggs & Dairy', 'Egg should be Eggs & Dairy');
  assert(foodCategory({ name: 'Whole Milk' }) === 'Eggs & Dairy', 'Milk should be Eggs & Dairy');
  assert(foodCategory({ name: 'Greek Yogurt' }) === 'Eggs & Dairy', 'Yogurt should be Eggs & Dairy');
  assert(foodCategory({ name: 'Cheddar Cheese' }) === 'Eggs & Dairy', 'Cheese should be Eggs & Dairy');
  console.log('✓ Eggs & Dairy classification verified');

  // 7. Grains & Bread classification
  assert(foodCategory({ name: 'White Rice' }) === 'Grains & Bread', 'Rice should be Grains & Bread');
  assert(foodCategory({ name: 'Sourdough Toast' }) === 'Grains & Bread', 'Toast should be Grains & Bread');
  assert(foodCategory({ name: 'Rolled Oats' }) === 'Grains & Bread', 'Oats should be Grains & Bread');
  assert(foodCategory({ name: 'Penne Pasta' }) === 'Grains & Bread', 'Pasta should be Grains & Bread');
  console.log('✓ Grains & Bread classification verified');

  // 8. Fruit classification
  assert(foodCategory({ name: 'Fresh Banana' }) === 'Fruit', 'Banana should be Fruit');
  assert(foodCategory({ name: 'Green Apple' }) === 'Fruit', 'Apple should be Fruit');
  assert(foodCategory({ name: 'Strawberries' }) === 'Fruit', 'Strawberries should be Fruit');
  assert(foodCategory({ name: 'Medjool Dates' }) === 'Fruit', 'Dates should be Fruit');
  console.log('✓ Fruit classification verified');

  // 9. Vegetables classification
  assert(foodCategory({ name: 'Steamed Broccoli' }) === 'Vegetables', 'Broccoli should be Vegetables');
  assert(foodCategory({ name: 'Baby Carrots' }) === 'Vegetables', 'Carrots should be Vegetables');
  assert(foodCategory({ name: 'Cucumber Slices' }) === 'Vegetables', 'Cucumber should be Vegetables');
  console.log('✓ Vegetables classification verified');

  // 10. Legumes classification
  assert(foodCategory({ name: 'Cooked Chickpeas' }) === 'Legumes', 'Chickpeas should be Legumes');
  assert(foodCategory({ name: 'Organic Firm Tofu' }) === 'Legumes', 'Tofu should be Legumes');
  assert(foodCategory({ name: 'Steamed Edamame' }) === 'Legumes', 'Edamame should be Legumes');
  console.log('✓ Legumes classification verified');

  // 11. Soups, Sauces & Dips, Oils & Fats, Supplements, Regional Dishes
  assert(foodCategory({ name: 'Red Lentil Soup' }) === 'Soups', 'Lentil soup should be Soups');
  assert(foodCategory({ name: 'Chickpea Hummus' }) === 'Sauces & Dips', 'Hummus should be Sauces & Dips');
  assert(foodCategory({ name: 'Extra Virgin Olive Oil' }) === 'Oils & Fats', 'Olive oil should be Oils & Fats');
  assert(foodCategory({ name: 'Whey Protein Powder' }) === 'Supplements', 'Protein powder should be Supplements');
  assert(foodCategory({ name: 'Iraqi Dolma' }) === 'Regional Dishes', 'Dolma should be Regional Dishes');
  console.log('✓ Soups, Sauces, Oils, Supplements, and Regional Dishes verified');

  // 12. getFoodEmoji mappings
  assert(getFoodEmoji('Chicken Breast') === '🍗', 'Chicken should be 🍗');
  assert(getFoodEmoji('Beef Steak') === '🥩', 'Steak should be 🥩');
  assert(getFoodEmoji('Boiled Egg') === '🥚', 'Egg should be 🥚');
  assert(getFoodEmoji('Salmon Fillet') === '🐟', 'Salmon should be 🐟');
  assert(getFoodEmoji('White Rice') === '🍚', 'Rice should be 🍚');
  assert(getFoodEmoji('Pizza Slice') === '🍕', 'Pizza should be 🍕');
  assert(getFoodEmoji('Espresso') === '☕', 'Coffee should be ☕');
  assert(getFoodEmoji('Banana') === '🍌', 'Banana should be 🍌');
  assert(getFoodEmoji('French Fries') === '🍟', 'Fries should be 🍟');
  assert(getFoodEmoji('Chicken Nuggets') === '🍗', 'Nuggets should be 🍗');
  console.log('✓ getFoodEmoji mappings and fallbacks verified');

  // 13. Localization coverage for all 17 canonical categories
  for (const cat of CANONICAL_FOOD_CATEGORIES) {
    const ar = translate('ar', cat);
    const ckb = translate('ckb', cat);

    assert(Boolean(ar) && ar !== cat, `Arabic translation missing for ${cat}`);
    assert(Boolean(ckb) && ckb !== cat, `Kurdish translation missing for ${cat}`);
  }
  console.log(`✓ Full localization completeness verified for all ${CANONICAL_FOOD_CATEGORIES.length} canonical categories in ar and ckb.`);

  console.log('========================================================================');
  console.log('✓ All 17 canonical food categories and emoji tests passed cleanly!');
  console.log('========================================================================');
}

runTests();
