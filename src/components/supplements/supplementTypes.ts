import { SupplementCategory, SupplementTime, LoggedDailySupplement } from '../../types';

export const categoryLabels: Record<SupplementCategory, string> = {
  vitamin: 'Vitamin',
  mineral: 'Mineral',
  supplement: 'Supplement',
  other: 'Other',
};

export const timeLabels: Record<SupplementTime, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
  bedtime: 'Bedtime',
};

export function getSlotStats(items: LoggedDailySupplement[], slot: SupplementTime) {
  const slotItems = items.filter((i) => i.time === slot);
  const takenCount = slotItems.filter((i) => i.taken).length;
  return {
    items: slotItems,
    total: slotItems.length,
    taken: takenCount,
  };
}
