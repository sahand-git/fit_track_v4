import { getCalorieRingSize, WEB_APP_MAX_WIDTH, getResponsiveAppWidth } from './dashboardLayout';

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

// Web responsive column constraints
assertEqual(WEB_APP_MAX_WIDTH, 480, 'Web max width is 480px');
assertEqual(getResponsiveAppWidth(1920, true), 480, 'Desktop 1080p browser is capped at 480px');
assertEqual(getResponsiveAppWidth(1440, true), 480, 'Laptop browser is capped at 480px');
assertEqual(getResponsiveAppWidth(390, true), 390, 'Mobile web browser uses full width when below 480px');
assertEqual(getResponsiveAppWidth(1024, false), 1024, 'Native platform does not constrain width');

console.log('Dashboard layout and web responsive sizing tests passed.');
