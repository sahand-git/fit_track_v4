import { buildRoutineFromDay, getEnabledSupplementReminderSlots, mergeRoutineIntoDay, persistRoutineThenCommit } from './supplementRoutine';
import { DEFAULT_REMINDER_SETTINGS } from '../storage/storage';
import { LoggedDailySupplement, SupplementRoutineItem } from '../types';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

const routine: SupplementRoutineItem[] = [
  { id: 'vit-d', name: 'Vitamin D', time: 'morning', amount: 1000, unit: 'IU', note: 'With food' },
  { id: 'mag', name: 'Magnesium', time: 'bedtime', amount: 200, unit: 'mg' },
];
const existing: LoggedDailySupplement[] = [{
  id: 'custom-d', routineItemId: 'vit-d', name: ' vitamin d ', time: 'morning', taken: true,
  amount: 500, unit: 'IU',
}];
const merged = mergeRoutineIntoDay(existing, routine, (item) => `day-${item.id}`);
assertEqual(merged.length, 2, 'Repeated routine loading adds only missing name/time combinations');
assertEqual(merged[0], existing[0], 'Existing daily item and taken state are preserved');
assertEqual(merged[1], {
  id: 'day-mag', routineItemId: 'mag', name: 'Magnesium', category: 'supplement',
  amount: 200, unit: 'mg', dose: undefined, note: undefined, time: 'bedtime', taken: false,
}, 'New daily item retains routine metadata and starts untaken');
assertEqual(mergeRoutineIntoDay(merged, routine, (item) => `again-${item.id}`), merged, 'Loading twice is idempotent');

assertEqual(buildRoutineFromDay([
  { id: 'daily-1', routineItemId: 'stable-id', name: 'Vitamin D', time: 'morning', taken: true, amount: 1000, unit: 'IU', note: 'AM' },
  { id: 'daily-2', name: ' vitamin d ', time: 'morning', taken: false },
]), [{
  id: 'stable-id', name: 'Vitamin D', category: 'supplement', amount: 1000, unit: 'IU', dose: undefined, note: 'AM', time: 'morning',
}], 'Saving a day deduplicates and preserves routine identity and metadata');

const reminderSettings = {
  ...DEFAULT_REMINDER_SETTINGS,
  supplementsEnabled: true,
  supplementTimes: {
    ...DEFAULT_REMINDER_SETTINGS.supplementTimes,
    morning: { ...DEFAULT_REMINDER_SETTINGS.supplementTimes.morning, enabled: true },
    bedtime: { ...DEFAULT_REMINDER_SETTINGS.supplementTimes.bedtime, enabled: true },
  },
};
assertEqual(getEnabledSupplementReminderSlots(reminderSettings, routine), ['morning', 'bedtime'], 'Only enabled slots that have routine items are selected');
assertEqual(getEnabledSupplementReminderSlots({ ...reminderSettings, supplementsEnabled: false }, routine), [], 'Disabled supplement reminders select no slots');
assertEqual(getEnabledSupplementReminderSlots(reminderSettings, []), [], 'Empty routine schedules no reminders');

async function runPersistenceTests(): Promise<void> {
  let committed = false;
  try {
    await persistRoutineThenCommit(routine, async () => { throw new Error('storage unavailable'); }, () => { committed = true; });
  } catch { /* expected */ }
  assert(!committed, 'A failed persistence must not publish an unsaved routine to app state');
  await persistRoutineThenCommit(routine, async () => {}, () => { committed = true; });
  assert(committed, 'A successfully persisted routine is committed to app state');
  console.log('All supplement routine unit tests passed.');
}

void runPersistenceTests();
