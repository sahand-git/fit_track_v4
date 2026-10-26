import assert from 'node:assert';
import { categoryLabels, timeLabels, getSlotStats } from './supplementTypes';
import { LoggedDailySupplement, SupplementCategory, SupplementTime } from '../../types';

console.log('Starting Supplement Component & Flow Unit Tests...');

// Test 1: Category labels completeness
const categories: SupplementCategory[] = ['vitamin', 'mineral', 'supplement', 'other'];
categories.forEach((cat) => {
  assert(categoryLabels[cat], `Missing label mapping for category ${cat}`);
});
console.log('✓ Test 1 passed: All 4 supplement categories properly mapped.');

// Test 2: Time labels completeness
const slots: SupplementTime[] = ['morning', 'afternoon', 'evening', 'bedtime'];
slots.forEach((slot) => {
  assert(timeLabels[slot], `Missing label mapping for time slot ${slot}`);
});
console.log('✓ Test 2 passed: All 4 supplement time slots properly mapped.');

// Test 3: Slot item aggregation and taken count computation
const mockSupplements: LoggedDailySupplement[] = [
  {
    id: 'sup_1',
    name: 'Vitamin D3',
    time: 'morning',
    taken: true,
    amount: 2000,
    unit: 'IU',
  },
  {
    id: 'sup_2',
    name: 'Omega 3 Fish Oil',
    time: 'morning',
    taken: false,
    amount: 1000,
    unit: 'mg',
  },
  {
    id: 'sup_3',
    name: 'Magnesium Glycinate',
    time: 'bedtime',
    taken: true,
    amount: 400,
    unit: 'mg',
  },
];

const morningStats = getSlotStats(mockSupplements, 'morning');
assert.strictEqual(morningStats.total, 2, 'Morning slot should have 2 items');
assert.strictEqual(morningStats.taken, 1, 'Morning slot should have 1 taken item');

const bedtimeStats = getSlotStats(mockSupplements, 'bedtime');
assert.strictEqual(bedtimeStats.total, 1, 'Bedtime slot should have 1 item');
assert.strictEqual(bedtimeStats.taken, 1, 'Bedtime slot should have 1 taken item');
console.log('✓ Test 3 passed: Slot aggregation and completion calculation verified.');

console.log('All Supplement Component & Flow Unit Tests PASSED Cleanly!');
