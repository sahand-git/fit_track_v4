import {
  generateDateWindow,
  calculateCalorieTrendMetrics,
  calculateWeightTrendMetrics,
  getChartXCoordinate,
  getBarXCoordinate,
  buildSmoothSvgPath,
  CalorieTrendPoint,
  WeightTrendPoint,
} from './trends';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function runTests() {
  console.log('Starting Trends Utility Unit Tests...');

  // 1. generateDateWindow
  const window7 = generateDateWindow('2026-10-15', 7);
  assert(window7.length === 7, 'Should generate 7 dates');
  assert(window7[0] === '2026-10-09', 'Oldest date should be 2026-10-09');
  assert(window7[6] === '2026-10-15', 'Latest date should be 2026-10-15');

  const window30 = generateDateWindow('2026-10-15', 30);
  assert(window30.length === 30, 'Should generate 30 dates');
  assert(window30[29] === '2026-10-15', 'Latest date should be 2026-10-15');
  console.log('✓ generateDateWindow verified for 7 and 30 days');

  // 2. calculateCalorieTrendMetrics
  const caloriePoints: CalorieTrendPoint[] = [
    { date: '2026-10-01', calories: 2000, target: 2000 }, // On target
    { date: '2026-10-02', calories: 1800, target: 2000 }, // On target (90%)
    { date: '2026-10-03', calories: 2300, target: 2000 }, // Over target (115%)
    { date: '2026-10-04', calories: 350, target: 2000 },  // Partial (< 500 kcal)
    { date: '2026-10-05', calories: 0, target: 2000 },    // Empty
  ];

  const calMetrics = calculateCalorieTrendMetrics(caloriePoints);
  assert(calMetrics.coveredDaysCount === 3, 'Should have 3 covered days >= 500 kcal');
  assert(calMetrics.partialDaysCount === 1, 'Should have 1 partial day');
  assert(calMetrics.avgCalories === Math.round((2000 + 1800 + 2300) / 3), 'Avg calories should only include covered days');
  assert(calMetrics.daysOnTarget === 2, 'Should have 2 days on target');
  assert(calMetrics.adherenceRate === Math.round((2 / 3) * 100), 'Adherence rate should be 67%');
  console.log('✓ calculateCalorieTrendMetrics verified');

  // 3. calculateWeightTrendMetrics
  const weightPoints: WeightTrendPoint[] = [
    { date: '2026-10-01', value: 80.5 },
    { date: '2026-10-05', value: 79.8 },
    { date: '2026-10-10', value: 79.2 },
  ];

  const weightMetrics = calculateWeightTrendMetrics(weightPoints);
  assert(weightMetrics !== null, 'Weight metrics should not be null');
  assert(weightMetrics!.firstVal === 80.5, 'firstVal should be 80.5');
  assert(weightMetrics!.lastVal === 79.2, 'lastVal should be 79.2');
  assert(weightMetrics!.delta === -1.3, 'delta should be -1.3');
  assert(weightMetrics!.minVal === 79.2, 'minVal should be 79.2');
  assert(weightMetrics!.maxVal === 80.5, 'maxVal should be 80.5');

  assert(calculateWeightTrendMetrics([]) === null, 'Empty points should return null');
  console.log('✓ calculateWeightTrendMetrics verified');

  // 4. getChartXCoordinate (LTR vs RTL)
  const width = 300;
  const paddingX = 20;
  const count = 5;

  // LTR: index 0 is at paddingX (20), index 4 is at width - paddingX (280)
  const ltr0 = getChartXCoordinate(0, count, width, paddingX, false);
  const ltr4 = getChartXCoordinate(4, count, width, paddingX, false);
  assert(ltr0 === 20, 'LTR index 0 should be at left padding');
  assert(ltr4 === 280, 'LTR index 4 should be at right padding');

  // RTL: index 0 is at right padding (280), index 4 is at left padding (20)
  const rtl0 = getChartXCoordinate(0, count, width, paddingX, true);
  const rtl4 = getChartXCoordinate(4, count, width, paddingX, true);
  assert(rtl0 === 280, 'RTL index 0 should be at right side');
  assert(rtl4 === 20, 'RTL index 4 should be at left side');
  console.log('✓ getChartXCoordinate LTR and RTL coordinate mirroring verified');

  // 5. getBarXCoordinate (LTR vs RTL)
  const barWidth = 10;
  const ltrBar0 = getBarXCoordinate(0, count, width, paddingX, barWidth, false);
  const rtlBar0 = getBarXCoordinate(0, count, width, paddingX, barWidth, true);
  assert(ltrBar0 < width / 2, 'LTR bar 0 should start on the left');
  assert(rtlBar0 > width / 2, 'RTL bar 0 should start on the right');
  console.log('✓ getBarXCoordinate LTR and RTL mirroring verified');

  // 6. buildSmoothSvgPath
  assert(buildSmoothSvgPath([]) === '', 'Empty points should return empty path');
  assert(buildSmoothSvgPath([{ x: 10, y: 20 }]) === 'M 10 20', 'Single point should return move command');

  const curve = buildSmoothSvgPath([
    { x: 0, y: 10 },
    { x: 50, y: 30 },
    { x: 100, y: 20 },
  ]);
  assert(curve.startsWith('M 0 10 C'), 'Multi-point curve should construct smooth bezier segments');
  console.log('✓ buildSmoothSvgPath verified');

  console.log('All trends utility unit tests passed successfully!');
}

runTests();
