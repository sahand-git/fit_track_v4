const mockStore: Record<string, string> = {};
(globalThis as any).window = {
  localStorage: {
    getItem: (k: string) => mockStore[k] ?? null,
    setItem: (k: string, v: string) => { mockStore[k] = String(v); },
    removeItem: (k: string) => { delete mockStore[k]; },
    clear: () => { Object.keys(mockStore).forEach((k) => delete mockStore[k]); },
    key: (i: number) => Object.keys(mockStore)[i] ?? null,
    get length() { return Object.keys(mockStore).length; },
  },
};

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  checkRateLimit,
  recordRequestTimestamp,
  createFoodRequestMailtoUrl,
  submitFoodRequest,
  FOOD_REQUESTS_RATE_LIMIT_KEY,
  MAX_REQUESTS_PER_HOUR,
} from './foodRequestService';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

async function runFoodRequestServiceTests() {
  console.log('Starting Food Request Service & Rate Limiting Unit Tests...');

  // Clear storage before tests
  await AsyncStorage.clear();

  // Test 1: Mailto URL generation
  {
    const url = createFoodRequestMailtoUrl({
      foodName: 'Iraqi Samoon (صمون)',
      brand: 'Baghdad Bakeries',
      barcode: '123456789012',
      notes: 'Diamond shape, baked in stone oven',
    });

    assert(url.startsWith('mailto:support@fittrack.app?subject='), 'Must start with support email mailto scheme');
    assert(url.includes('Iraqi%20Samoon'), 'URL must encode food name');
    assert(url.includes('Baghdad%20Bakeries'), 'URL must encode brand');
    assert(url.includes('123456789012'), 'URL must encode barcode');
    console.log('✓ Test 1 passed: Pre-filled mailto URL generated correctly with encoded parameters.');
  }

  // Test 2: Rate limit allows initial requests and records timestamps
  {
    await AsyncStorage.removeItem(FOOD_REQUESTS_RATE_LIMIT_KEY);
    const limitCheck = await checkRateLimit();
    assert(limitCheck.allowed === true, 'Empty history must allow requests');
    assert(limitCheck.waitMinutes === 0, 'Wait minutes must be 0 when allowed');

    await recordRequestTimestamp();
    const afterRecordCheck = await checkRateLimit();
    assert(afterRecordCheck.allowed === true, 'Single request must still be allowed under limit');
    console.log('✓ Test 2 passed: Clean rate limit state allows requests and records timestamps.');
  }

  // Test 3: Rate limiting blocks after MAX_REQUESTS_PER_HOUR
  {
    const now = Date.now();
    // Simulate 5 requests made 10 minutes ago
    const timestamps = [
      now - 10 * 60 * 1000,
      now - 8 * 60 * 1000,
      now - 6 * 60 * 1000,
      now - 4 * 60 * 1000,
      now - 2 * 60 * 1000,
    ];
    await AsyncStorage.setItem(FOOD_REQUESTS_RATE_LIMIT_KEY, JSON.stringify(timestamps));

    const blockedCheck = await checkRateLimit();
    assert(blockedCheck.allowed === false, '5 recent requests must trigger rate limit');
    assert(blockedCheck.waitMinutes > 0 && blockedCheck.waitMinutes <= 60, `Wait minutes must be between 1 and 60: got ${blockedCheck.waitMinutes}`);
    console.log(`✓ Test 3 passed: Exceeded rate limit properly blocked with ${blockedCheck.waitMinutes}m cooldown.`);
  }

  // Test 4: Rate limit sliding window expires old timestamps
  {
    const now = Date.now();
    // 4 old timestamps (> 65 mins ago) and 1 recent (5 mins ago)
    const timestamps = [
      now - 70 * 60 * 1000,
      now - 68 * 60 * 1000,
      now - 66 * 60 * 1000,
      now - 65 * 60 * 1000,
      now - 5 * 60 * 1000,
    ];
    await AsyncStorage.setItem(FOOD_REQUESTS_RATE_LIMIT_KEY, JSON.stringify(timestamps));

    const check = await checkRateLimit();
    assert(check.allowed === true, 'Old timestamps outside 1h window must not block requests');
    console.log('✓ Test 4 passed: Sliding window correctly purges expired timestamps.');
  }

  // Test 5: Input validation & empty name rejection
  {
    const res = await submitFoodRequest({ foodName: '   ' });
    assert(res.status === 'error', 'Whitespace food name must return error status');
    console.log('✓ Test 5 passed: Empty/whitespace food name properly rejected.');
  }

  // Test 6: Rate limited submitFoodRequest status
  {
    const now = Date.now();
    const timestamps = Array.from({ length: MAX_REQUESTS_PER_HOUR }, (_, i) => now - (i + 1) * 60 * 1000);
    await AsyncStorage.setItem(FOOD_REQUESTS_RATE_LIMIT_KEY, JSON.stringify(timestamps));

    const res = await submitFoodRequest({ foodName: 'Test Food' });
    assert(res.status === 'rate_limited', 'submitFoodRequest returns rate_limited when threshold reached');
    assert('waitMinutes' in res && res.waitMinutes > 0, 'Returns waitMinutes');
    console.log('✓ Test 6 passed: submitFoodRequest reports rate_limited status gracefully.');
  }

  // Clean up
  await AsyncStorage.clear();

  console.log('====================================================');
  console.log('All Food Request Service Unit Tests Passed Cleanly!');
  console.log('====================================================');
}

runFoodRequestServiceTests().catch((err) => {
  console.error('Food Request Service test failed:', err);
  process.exit(1);
});
