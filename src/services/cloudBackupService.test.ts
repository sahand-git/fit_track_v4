import {
  splitIntoChunks,
  reassembleChunks,
  CHUNK_SIZE,
  CHUNK_THRESHOLD,
} from '../utils/cloudBackupChunks';
import { FitTrackBackup } from '../types';

function assert(condition: boolean, message?: string): void {
  if (!condition) throw new Error(message || 'Assertion failed');
}

function assertStrictEqual<T>(actual: T, expected: T, message?: string): void {
  if (actual !== expected) {
    throw new Error(message || `Expected ${String(expected)}, got ${String(actual)}`);
  }
}

function assertDeepStrictEqual<T>(actual: T, expected: T): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`Objects not equal: ${JSON.stringify(actual)} !== ${JSON.stringify(expected)}`);
  }
}

function assertThrows(fn: () => void): void {
  let threw = false;
  try {
    fn();
  } catch {
    threw = true;
  }
  if (!threw) throw new Error('Expected function to throw, but it succeeded.');
}

console.log('Starting Cloud Backup Chunking & Boundary Tests...');

// Helper to generate realistic sample backup payload
function generateMockBackup(recordCount: number): FitTrackBackup {
  const dailyLogs: Record<string, any> = {};
  for (let i = 0; i < recordCount; i++) {
    const year = 2020 + Math.floor(i / 365);
    const day = (i % 365) + 1;
    const dateStr = `day-${year}-${day}-${i}`;
    dailyLogs[dateStr] = {
      date: dateStr,
      targetCalories: 2200,
      targetWaterMl: 2500,
      meals: [
        {
          id: `meal-${i}-1`,
          mealType: 'breakfast',
          name: 'Scrambled Eggs with Kurdish Flatbread (Samoon) and Olive Oil',
          calories: 450,
          protein: 26,
          carbs: 42,
          fat: 18,
          portionUnit: 'samoon',
          gramsPerUnit: 140,
          source: 'regional_culinary_estimate',
          isEstimate: true,
        },
        {
          id: `meal-${i}-2`,
          mealType: 'lunch',
          name: 'Iraqi Dolma with Lamb, Rice, Eggplant and Traditional Spices',
          calories: 680,
          protein: 34,
          carbs: 72,
          fat: 28,
          portionUnit: 'plate',
          gramsPerUnit: 350,
          source: 'regional_culinary_estimate',
          isEstimate: true,
        },
        {
          id: `meal-${i}-3`,
          mealType: 'dinner',
          name: 'Grilled Kurdish Lamb Kebab with Roasted Tomatoes and Parsley',
          calories: 520,
          protein: 48,
          carbs: 12,
          fat: 32,
          portionUnit: 'skewer',
          gramsPerUnit: 220,
          source: 'regional_culinary_estimate',
          isEstimate: true,
        },
      ],
      waterMl: 2100,
    };
  }

  return {
    version: '4.0',
    exportedAt: '2026-10-15T12:00:00.000Z',
    profile: {
      name: 'Saif',
      age: 28,
      weightKg: 78.5,
      heightCm: 178,
      gender: 'male',
      bmr: 1750,
      tdee: 2400,
      targetCalories: 2200,
      targetProtein: 160,
      targetCarbs: 220,
      targetFat: 65,
      waterTargetGlasses: 10,
      language: 'en',
      isOnboarded: true,
      includeWorkoutsInCalorieBudget: false,
      goal: 'maintenance',
      activityLevel: 'moderate',
    },
    dailyLogs,
    supplementRoutine: [],
    weightHistory: [],
  };
}

// 1. Basic splitting and reassembly identity
{
  const smallText = 'Hello FitTrack Cloud Backup!';
  const chunks = splitIntoChunks(smallText, 10);
  assertStrictEqual(chunks.length, 3);
  assertStrictEqual(chunks[0], 'Hello FitT');
  assertStrictEqual(chunks[1], 'rack Cloud');
  assertStrictEqual(chunks[2], ' Backup!');
  assertStrictEqual(reassembleChunks(chunks), smallText);
  console.log('✓ Test 1 passed: Basic splitting and reassembly preserves identity.');
}

// 2. Empty or edge string handling
{
  assertDeepStrictEqual(splitIntoChunks(''), []);
  assertStrictEqual(reassembleChunks([]), '');
  console.log('✓ Test 2 passed: Empty string handling verified.');
}

// 3. Exact boundary condition (string length is an exact multiple of chunk size)
{
  const exactSize = CHUNK_SIZE * 2;
  const exactPayload = 'A'.repeat(exactSize);
  const chunks = splitIntoChunks(exactPayload, CHUNK_SIZE);
  assertStrictEqual(chunks.length, 2);
  assertStrictEqual(chunks[0].length, CHUNK_SIZE);
  assertStrictEqual(chunks[1].length, CHUNK_SIZE);
  assertStrictEqual(reassembleChunks(chunks), exactPayload);
  console.log('✓ Test 3 passed: Exact chunk boundary splits without trailing empty chunk.');
}

// 4. Large multi-megabyte backup chunking (< 1 MiB Firestore limit guarantee)
{
  // Generate a massive 1.2+ MB JSON payload
  const largeBackup = generateMockBackup(600);
  const serialized = JSON.stringify(largeBackup);

  assert(
    serialized.length > CHUNK_THRESHOLD,
    `Payload should exceed threshold for chunking test (actual: ${serialized.length})`
  );

  const chunks = splitIntoChunks(serialized, CHUNK_SIZE);

  assert(chunks.length >= 2, `Expected at least 2 chunks, got ${chunks.length}`);

  // Guarantee every chunk is strictly below Firestore's 1,048,576 byte document limit
  for (let i = 0; i < chunks.length; i++) {
    const chunkBytes = new TextEncoder().encode(chunks[i]).length;
    assert(
      chunkBytes <= 1_048_576,
      `Chunk ${i} exceeds Firestore limit of 1 MiB! Bytes: ${chunkBytes}`
    );
    assert(
      chunkBytes <= 400_000,
      `Chunk ${i} should be comfortably bounded under ~400 KB for speed and headroom. Bytes: ${chunkBytes}`
    );
  }

  // Full roundtrip reassembly and JSON parse
  const reassembled = reassembleChunks(chunks);
  assertStrictEqual(reassembled, serialized);

  const restoredBackup = JSON.parse(reassembled) as FitTrackBackup;
  assertStrictEqual(restoredBackup.version, '4.0');
  assertStrictEqual(restoredBackup.profile.name, 'Saif');
  assertStrictEqual(Object.keys(restoredBackup.dailyLogs).length, 600);
  console.log(`✓ Test 4 passed: Multi-megabyte payload (${serialized.length} chars, ${chunks.length} chunks) safely under 1 MiB and roundtrips with 100% fidelity.`);
}

// 5. Corrupted / missing chunk resilience test
{
  const backup = generateMockBackup(600);
  const serialized = JSON.stringify(backup);
  const chunks = splitIntoChunks(serialized, CHUNK_SIZE);
  assert(chunks.length >= 2);

  // Drop chunk 1 to simulate a network dropout or missing document
  const corruptedChunks = [chunks[0], /* missing chunk 1 */ ...chunks.slice(2)];
  const corruptedAssembled = reassembleChunks(corruptedChunks);

  assertThrows(() => {
    JSON.parse(corruptedAssembled);
  });
  console.log('✓ Test 5 passed: Missing chunks fail fast via JSON parser and do not restore corrupted state.');
}

console.log('All Cloud Backup Chunking & Boundary Tests Passed Successfully!');
