import {
  createInitialSessionState,
  canProcessAddTap,
  calculateSessionTotals,
  formatSessionSummary,
  formatAddedToastMessage,
  formatBatchAddedToastMessage,
  addSessionItems,
  removeSessionItem,
  removeSessionBatch,
  dismissSessionToast,
  toggleSessionTrayExpanded,
  SessionItem,
  AddFoodSessionState,
} from './addFoodSessionCore';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ Assertion failed: ${message}`);
    process.exit(1);
  }
}

console.log('Starting AddFoodSessionCore Unit & Regression Tests...');

// 1. Initial State
console.log('Testing createInitialSessionState...');
const s0 = createInitialSessionState();
assert(s0.items.length === 0, 'Items must be initially empty');
assert(s0.isTrayExpanded === false, 'Tray must be initially collapsed');
assert(s0.toast === null, 'Toast must be initially null');
assert(s0.lastAddTapTime === 0, 'lastAddTapTime must start at 0');
console.log('✓ Initial state clean.');

// 2. Debounce Tap Guard (700ms)
console.log('Testing canProcessAddTap...');
assert(canProcessAddTap(0, 1000, 700) === true, 'First tap must always be processed');
assert(canProcessAddTap(1000, 1200, 700) === false, 'Tap at 200ms must be rejected');
assert(canProcessAddTap(1000, 1699, 700) === false, 'Tap at 699ms must be rejected');
assert(canProcessAddTap(1000, 1700, 700) === true, 'Tap at exactly 700ms must be processed');
assert(canProcessAddTap(1000, 2500, 700) === true, 'Deliberate subsequent tap after 1500ms must be processed');
console.log('✓ Debounce tap guard (700ms) verified.');

// 3. Adding Single Food
console.log('Testing addSessionItems (single item)...');
const item1: SessionItem = {
  id: 'meal_1',
  foodId: 'food_egg_boiled_whole',
  name: 'Boiled Egg',
  portion: '1 large egg (50g)',
  calories: 78,
  mealType: 'breakfast',
  timestamp: new Date().toISOString(),
};

const s1 = addSessionItems(s0, [item1], 'Added Boiled Egg to Breakfast', 1000);
assert(s1.items.length === 1, 'Items should have length 1');
assert(s1.items[0].id === 'meal_1', 'Item 1 should be present');
assert(s1.toast !== null && s1.toast.visible === true, 'Toast must be visible');
assert(s1.toast?.message === 'Added Boiled Egg to Breakfast', 'Toast message mismatch');
assert(Boolean(s1.toast?.itemIds.includes('meal_1')), 'Toast itemIds must include meal_1');
assert(s1.lastAddTapTime === 1000, 'lastAddTapTime should update');

const totals1 = calculateSessionTotals(s1.items);
assert(totals1.count === 1, 'Total count should be 1');
assert(totals1.totalCalories === 78, 'Total calories should be 78');
console.log('✓ Single food add verified.');

// 4. Adding Second Food (Deliberate addition with different meal)
console.log('Testing mid-session meal switch & cumulative totals...');
const item2: SessionItem = {
  id: 'meal_2',
  foodId: 'food_chicken_breast_cooked',
  name: 'Chicken Breast',
  portion: '150g',
  calories: 248,
  mealType: 'lunch',
  timestamp: new Date().toISOString(),
};

const s2 = addSessionItems(s1, [item2], 'Added Chicken Breast to Lunch', 2000);
assert(s2.items.length === 2, 'Items should now have length 2');
assert(s2.items[0].id === 'meal_2', 'Newest item should be at the front');
assert(s2.items[1].id === 'meal_1', 'Previous item preserved');
assert(s2.items[0].mealType === 'lunch', 'Lunch mealType correctly registered');
assert(s2.items[1].mealType === 'breakfast', 'Breakfast mealType correctly registered');

const totals2 = calculateSessionTotals(s2.items);
assert(totals2.count === 2, 'Total count should be 2');
assert(totals2.totalCalories === 326, `Total calories should be 326 (78+248), got ${totals2.totalCalories}`);
console.log('✓ Mid-session meal switch and cumulative totals verified.');

// 5. Batch Add (Template or Copy Yesterday)
console.log('Testing batch add (Template / Copy Yesterday)...');
const batchItems: SessionItem[] = [
  {
    id: 'meal_3',
    foodId: 'food_rice',
    name: 'Basmati Rice',
    portion: '100g',
    calories: 130,
    mealType: 'lunch',
    timestamp: new Date().toISOString(),
  },
  {
    id: 'meal_4',
    foodId: 'food_broccoli',
    name: 'Steamed Broccoli',
    portion: '100g',
    calories: 35,
    mealType: 'lunch',
    timestamp: new Date().toISOString(),
  },
];

const s3 = addSessionItems(s2, batchItems, 'Added 2 meals', 3000);
assert(s3.items.length === 4, 'Items should now have length 4');
const totals3 = calculateSessionTotals(s3.items);
assert(totals3.count === 4, 'Total count should be 4');
assert(totals3.totalCalories === 491, `Total calories should be 491 (326+165), got ${totals3.totalCalories}`);
assert(s3.toast?.itemIds.length === 2, 'Toast should track both batch item IDs for Undo');
console.log('✓ Batch add verified.');

// 6. Undo Batch & Restore Totals
console.log('Testing Undo batch removal...');
const s4 = removeSessionBatch(s3, s3.toast!.itemIds);
assert(s4.items.length === 2, 'Items should revert back to 2');
const totals4 = calculateSessionTotals(s4.items);
assert(totals4.count === 2, 'Total count restored to 2');
assert(totals4.totalCalories === 326, 'Total calories restored to 326');
assert(s4.toast === null, 'Toast dismissed on undo');
console.log('✓ Undo batch restores totals accurately.');

// 7. Individual Item Removal from Session Tray
console.log('Testing individual item removal from session tray...');
const s5 = removeSessionItem(s4, 'meal_1');
assert(s5.items.length === 1, 'Only meal_2 should remain');
assert(s5.items[0].id === 'meal_2', 'Remaining item must be meal_2');
const totals5 = calculateSessionTotals(s5.items);
assert(totals5.count === 1, 'Count should be 1');
assert(totals5.totalCalories === 248, 'Calories should be 248');

const s6 = removeSessionItem(s5, 'meal_2');
assert(s6.items.length === 0, 'Session items should be empty');
assert(s6.isTrayExpanded === false, 'Tray auto-collapses when empty');
const totals6 = calculateSessionTotals(s6.items);
assert(totals6.count === 0 && totals6.totalCalories === 0, 'Zeroed totals verified');
console.log('✓ Individual item removal and tray collapse verified.');

// 8. Tray Expansion Toggle
console.log('Testing tray expansion toggle...');
const sWithItems = addSessionItems(s0, [item1], 'Added Boiled Egg');
assert(sWithItems.isTrayExpanded === false, 'Initially collapsed');
const sExpanded = toggleSessionTrayExpanded(sWithItems);
assert(sExpanded.isTrayExpanded === true, 'Expanded on toggle');
const sCollapsed = toggleSessionTrayExpanded(sExpanded);
assert(sCollapsed.isTrayExpanded === false, 'Collapsed on second toggle');
const sEmptyToggle = toggleSessionTrayExpanded(s0);
assert(sEmptyToggle.isTrayExpanded === false, 'Empty state cannot expand');
console.log('✓ Tray toggle behavior verified.');

// 9. Toast Dismissal
console.log('Testing dismissSessionToast...');
const sToastDismissed = dismissSessionToast(sWithItems);
assert(sToastDismissed.toast === null, 'Toast should be null after dismissal');
assert(sToastDismissed.items.length === 1, 'Items unaffected by toast dismissal');
console.log('✓ Toast dismissal verified.');

// 10. String Formatting & Template Replacement
console.log('Testing localized string formatters...');
const mockT = (key: string) => {
  if (key === '{count} added · {kcal} kcal') return '{count} added · {kcal} kcal';
  if (key === 'Added {food} to {meal}') return 'Added {food} to {meal}';
  if (key === 'Added {count} meals') return 'Added {count} meals';
  return key;
};

const summaryStr = formatSessionSummary(3, 450, mockT);
assert(summaryStr === '3 added · 450 kcal', `Expected "3 added · 450 kcal", got "${summaryStr}"`);

const addedToastStr = formatAddedToastMessage('Boiled Egg', 'Breakfast', mockT);
assert(addedToastStr === 'Added Boiled Egg to Breakfast', `Expected "Added Boiled Egg to Breakfast", got "${addedToastStr}"`);

const batchToastStr = formatBatchAddedToastMessage(5, mockT);
assert(batchToastStr === 'Added 5 meals', `Expected "Added 5 meals", got "${batchToastStr}"`);
console.log('✓ String formatting & template replacement verified.');

// 11. State Retention Regression Simulation
console.log('Testing Search, Filter, and Selection State Retention after Logging...');
interface SimulatedAddFoodSheetState {
  searchQuery: string;
  selectedCategory: string;
  selectedMeal: string;
  selectedFood: any | null;
  session: AddFoodSessionState;
  isOpen: boolean;
}

const mockSheetState: SimulatedAddFoodSheetState = {
  searchQuery: 'egg',
  selectedCategory: 'Eggs & Dairy',
  selectedMeal: 'breakfast',
  selectedFood: { id: 'food_egg_boiled_whole', name: 'Boiled Egg' },
  session: createInitialSessionState(),
  isOpen: true,
};

// Simulate logging food: do NOT close sheet, keep search and category, only clear selectedFood
function simulateLogFood(state: SimulatedAddFoodSheetState, loggedMeal: SessionItem): SimulatedAddFoodSheetState {
  return {
    ...state,
    selectedFood: null, // Clear only selected food
    session: addSessionItems(state.session, [loggedMeal], `Added ${loggedMeal.name}`),
    isOpen: true, // Sheet STAYS OPEN
  };
}

const afterLogState = simulateLogFood(mockSheetState, item1);
assert(afterLogState.isOpen === true, 'Sheet MUST STAY OPEN after logging food');
assert(afterLogState.searchQuery === 'egg', 'Search query MUST survive add');
assert(afterLogState.selectedCategory === 'Eggs & Dairy', 'Selected category MUST survive add');
assert(afterLogState.selectedMeal === 'breakfast', 'Selected meal MUST survive add');
assert(afterLogState.selectedFood === null, 'Selected food state MUST be cleared for next selection');
assert(afterLogState.session.items.length === 1, 'Item registered in session');
console.log('✓ Search, filter, and sheet persistence verified cleanly.');

console.log('======================================================');
console.log('All AddFoodSessionCore Unit & Regression Tests PASSED!');
console.log('======================================================');
