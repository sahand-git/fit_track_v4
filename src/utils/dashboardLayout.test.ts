import { getCalorieRingSize } from './dashboardLayout';

function assertEqual(actual: number, expected: number, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, got ${actual}`);
  }
}

assertEqual(getCalorieRingSize(180), 172, 'Narrow cards keep the ring inside the minimum size');
assertEqual(getCalorieRingSize(320), 230, 'Ring size scales with a phone-width card');
assertEqual(getCalorieRingSize(375), 270, 'Standard phone cards get a larger ring');
assertEqual(getCalorieRingSize(1280), 280, 'Wide layouts cap the ring instead of leaving it undersized');
assertEqual(getCalorieRingSize(Number.NaN), 200, 'Invalid measurements fall back to a safe size');

console.log('Dashboard layout sizing tests passed.');
