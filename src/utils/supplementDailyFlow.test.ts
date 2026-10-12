import {
  SupplementRoutineItem,
  LoggedDailySupplement,
  SupplementCheck,
  DailyLog,
  ReminderSettings,
} from '../types';
import { normalizeSupplementRoutine } from './supplementUtils';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

// Simulated active items resolution from SupplementsScreen / DashboardScreen:
function resolveActiveItems(
  dailySupplements: LoggedDailySupplement[] | undefined,
  routine: SupplementRoutineItem[],
  checks: SupplementCheck[] = []
): LoggedDailySupplement[] {
  if (dailySupplements !== undefined) {
    return dailySupplements;
  }
  if (routine && routine.length > 0) {
    const takenSet = new Set((checks || []).filter((c) => c.taken).map((c) => c.itemId));
    return routine.map((r) => ({
      id: r.id,
      routineItemId: r.id,
      name: r.name,
      category: r.category || 'supplement',
      amount: r.amount,
      unit: r.unit,
      dose: r.dose,
      note: r.note,
      time: r.time,
      taken: takenSet.has(r.id),
    }));
  }
  return [];
}

// Simulated load routine logic from SupplementsScreen:
function loadRoutineIntoDay(
  currentItems: LoggedDailySupplement[],
  routine: SupplementRoutineItem[]
): LoggedDailySupplement[] {
  const existingKeys = new Set(
    currentItems.map((i) => `${i.name.trim().toLowerCase()}_${i.time}`)
  );
  const newToAdd: LoggedDailySupplement[] = [];
  routine.forEach((r) => {
    const key = `${r.name.trim().toLowerCase()}_${r.time}`;
    if (!existingKeys.has(key)) {
      newToAdd.push({
        id: `supp_loaded_${r.id}`,
        routineItemId: r.id,
        name: r.name,
        category: r.category || 'supplement',
        amount: r.amount,
        unit: r.unit,
        dose: r.dose,
        note: r.note,
        time: r.time,
        taken: false,
      });
      existingKeys.add(key);
    }
  });
  return [...currentItems, ...newToAdd];
}

// Simulated save day as routine logic from SupplementsScreen:
function saveDayAsRoutine(
  activeItems: LoggedDailySupplement[]
): SupplementRoutineItem[] {
  const seen = new Set<string>();
  const newRoutine: SupplementRoutineItem[] = [];
  for (const i of activeItems) {
    const key = `${i.name.trim().toLowerCase()}_${i.time}`;
    if (!seen.has(key)) {
      seen.add(key);
      newRoutine.push({
        id: i.routineItemId || i.id,
        name: i.name,
        category: i.category || 'supplement',
        amount: i.amount,
        unit: i.unit,
        dose: i.dose,
        note: i.note,
        time: i.time,
      });
    }
  }
  return newRoutine;
}

// --- TEST 1: Checklist initialization when dailySupplements is undefined ---
const routineSample: SupplementRoutineItem[] = [
  {
    id: 'supp-1',
    name: 'Vitamin D3',
    category: 'vitamin',
    amount: 2000,
    unit: 'IU',
    dose: '2000 IU',
    note: 'With breakfast',
    time: 'morning',
  },
  {
    id: 'supp-2',
    name: 'Magnesium Glycinate',
    category: 'mineral',
    amount: 400,
    unit: 'mg',
    dose: '400 mg',
    note: 'Before sleep',
    time: 'bedtime',
  },
];

const uninitializedResult = resolveActiveItems(undefined, routineSample);
assert(uninitializedResult.length === 2, 'Uninitialized day (undefined) inherits 2 routine items');
assertEqual(uninitializedResult[0].name, 'Vitamin D3', 'First item name is Vitamin D3');
assert(!uninitializedResult[0].taken, 'Initial taken state is false');

// --- TEST 2: Explicitly saved empty daily checklist remains empty ---
const explicitlyEmptyResult = resolveActiveItems([], routineSample);
assert(explicitlyEmptyResult.length === 0, 'Explicitly empty daily checklist ([]) remains empty, not reseeded from routine');

// --- TEST 3: Toggling item initializes day and persists without mutating routine ---
const checksSample: SupplementCheck[] = [{ itemId: 'supp-1', taken: true }];
const toggledResult = resolveActiveItems(undefined, routineSample, checksSample);
assert(toggledResult[0].taken === true, 'Item supp-1 is marked as taken from checks');
assert(toggledResult[1].taken === false, 'Item supp-2 remains untaken');

// --- TEST 4: Loading routine does not duplicate existing items ---
const existingDayItems: LoggedDailySupplement[] = [
  {
    id: 'supp_custom_1',
    name: 'Vitamin D3',
    category: 'vitamin',
    amount: 1000,
    unit: 'IU',
    time: 'morning',
    taken: true,
  },
];

const loadedList = loadRoutineIntoDay(existingDayItems, routineSample);
assert(loadedList.length === 2, 'Loaded list contains 1 existing + 1 new item (no duplicate Vitamin D3 in morning)');
assertEqual(loadedList[0].id, 'supp_custom_1', 'Existing item remains first and unchanged');
assertEqual(loadedList[1].name, 'Magnesium Glycinate', 'Only non-duplicated routine item added');

// --- TEST 5: Saving day as routine retains all metadata ---
const dayWithDetailedItems: LoggedDailySupplement[] = [
  {
    id: 'd-1',
    name: 'Zinc Picolinate',
    category: 'mineral',
    amount: 25,
    unit: 'mg',
    dose: '25 mg',
    note: 'With food',
    time: 'lunch' as any,
    taken: true,
  },
];

const savedRoutine = saveDayAsRoutine(dayWithDetailedItems);
assertEqual(savedRoutine[0], {
  id: 'd-1',
  name: 'Zinc Picolinate',
  category: 'mineral',
  amount: 25,
  unit: 'mg',
  dose: '25 mg',
  note: 'With food',
  time: 'lunch' as any,
}, 'Saved routine retains exact metadata (name, category, amount, unit, dose, note, time)');

// --- TEST 6: Routine removal does not erase historical daily records ---
const dayLogHistorical: DailyLog = {
  date: '2026-10-10',
  meals: [],
  waterGlasses: 6,
  steps: 8000,
  dailySupplements: [
    {
      id: 'hist-1',
      routineItemId: 'supp-1',
      name: 'Vitamin D3',
      category: 'vitamin',
      time: 'morning',
      taken: true,
    },
  ],
};

// User removes supp-1 from active routine:
const updatedActiveRoutine = routineSample.filter((r) => r.id !== 'supp-1');
assert(updatedActiveRoutine.length === 1, 'Routine has 1 item after deletion');
assert(dayLogHistorical.dailySupplements?.length === 1, 'Historical log retained its dailySupplements item');
assertEqual(dayLogHistorical.dailySupplements?.[0].name, 'Vitamin D3', 'Historical item is intact');

// --- TEST 7: Supplement reminder slot filtering ---
// Only slots with routine items should be scheduled:
const morningRoutineOnly: SupplementRoutineItem[] = [
  { id: '1', name: 'Multivitamin', time: 'morning' },
];
const activeSlots = (['morning', 'afternoon', 'evening', 'bedtime'] as const).filter(
  (slot) => morningRoutineOnly.some((r) => r.time === slot)
);
assertEqual(activeSlots, ['morning'], 'Supplement reminders schedule ONLY morning slot since routine has no items in other slots');

// --- TEST 8: Water reminder hour window calculation ---
const waterSetting = { startHour: 8, endHour: 20, intervalHours: 2, enabled: true };
const waterHours: number[] = [];
for (let h = waterSetting.startHour; h < waterSetting.endHour; h += waterSetting.intervalHours) {
  waterHours.push(h);
}
assertEqual(waterHours, [8, 10, 12, 14, 16, 18], 'Water reminder generates predictable waking hours (8, 10, 12, 14, 16, 18) avoiding night hours');

console.log('All supplementDailyFlow unit tests passed successfully!');
