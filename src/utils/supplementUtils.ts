import { SupplementCategory, SupplementCheck, SupplementRoutineItem, SupplementTime } from '../types';

export interface SupplementProgress {
  scheduled: number;
  completed: number;
  pending: number;
  percentage: number;
}

const validTimes: SupplementTime[] = ['morning', 'afternoon', 'evening', 'bedtime'];
const validCategories: SupplementCategory[] = ['vitamin', 'mineral', 'supplement', 'other'];

export function normalizeSupplementRoutine(value: unknown): SupplementRoutineItem[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((candidate): SupplementRoutineItem[] => {
    if (!candidate || typeof candidate !== 'object') return [];
    const item = candidate as Record<string, unknown>;
    if (
      typeof item.id !== 'string' || !item.id.trim() ||
      typeof item.name !== 'string' || !item.name.trim() ||
      typeof item.dose !== 'string' ||
      typeof item.time !== 'string' || !validTimes.includes(item.time as SupplementTime)
    ) return [];

    const category = typeof item.category === 'string' && validCategories.includes(item.category as SupplementCategory)
      ? item.category as SupplementCategory
      : 'other';

    return [{
      id: item.id,
      name: item.name,
      dose: item.dose,
      time: item.time as SupplementTime,
      category,
    }];
  });
}

export function getSupplementProgress(
  routine: SupplementRoutineItem[],
  checks: SupplementCheck[],
): SupplementProgress {
  const takenIds = new Set(checks.filter(check => check.taken).map(check => check.itemId));
  const completed = routine.reduce((count, item) => count + (takenIds.has(item.id) ? 1 : 0), 0);
  const scheduled = routine.length;

  return {
    scheduled,
    completed,
    pending: scheduled - completed,
    percentage: scheduled === 0 ? 0 : Math.round((completed / scheduled) * 100),
  };
}
