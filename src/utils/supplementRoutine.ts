import { LoggedDailySupplement, ReminderSettings, SupplementRoutineItem, SupplementTime } from '../types';

function supplementKey(name: string, time: SupplementTime): string {
  return `${name.trim().toLocaleLowerCase()}_${time}`;
}

export function mergeRoutineIntoDay(
  currentItems: LoggedDailySupplement[],
  routine: SupplementRoutineItem[],
  createId: (routineItem: SupplementRoutineItem) => string
): LoggedDailySupplement[] {
  const existingKeys = new Set(currentItems.map((item) => supplementKey(item.name, item.time)));
  const additions: LoggedDailySupplement[] = [];

  for (const item of routine) {
    const key = supplementKey(item.name, item.time);
    if (existingKeys.has(key)) continue;
    additions.push({
      id: createId(item),
      routineItemId: item.id,
      name: item.name,
      category: item.category || 'supplement',
      amount: item.amount,
      unit: item.unit,
      dose: item.dose,
      note: item.note,
      time: item.time,
      taken: false,
    });
    existingKeys.add(key);
  }

  return [...currentItems, ...additions];
}

export function buildRoutineFromDay(items: LoggedDailySupplement[]): SupplementRoutineItem[] {
  const seen = new Set<string>();
  const result: SupplementRoutineItem[] = [];

  for (const item of items) {
    const key = supplementKey(item.name, item.time);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({
      id: item.routineItemId || item.id,
      name: item.name,
      category: item.category || 'supplement',
      amount: item.amount,
      unit: item.unit,
      dose: item.dose,
      note: item.note,
      time: item.time,
    });
  }

  return result;
}

export function getEnabledSupplementReminderSlots(
  settings: ReminderSettings,
  routine: SupplementRoutineItem[]
): SupplementTime[] {
  if (!settings.supplementsEnabled) return [];
  const routineSlots = new Set(routine.map((item) => item.time));
  return (['morning', 'afternoon', 'evening', 'bedtime'] as const).filter(
    (slot) => settings.supplementTimes[slot]?.enabled && routineSlots.has(slot)
  );
}

export async function persistRoutineThenCommit(
  items: SupplementRoutineItem[],
  persist: (items: SupplementRoutineItem[]) => Promise<void>,
  commit: (items: SupplementRoutineItem[]) => void
): Promise<void> {
  await persist(items);
  commit(items);
}
