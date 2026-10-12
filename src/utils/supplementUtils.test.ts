import { getSupplementProgress, normalizeSupplementRoutine } from './supplementUtils';
import { translate } from '../i18n/strings';

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

const legacyRoutine = normalizeSupplementRoutine([
  { id: 'old-a', name: 'Vitamin D', dose: '1000 IU', time: 'morning' },
  { id: 'old-b', name: 'Omega 3', dose: '1 capsule', time: 'evening', category: 'supplement' },
  { id: '', name: 'Broken', dose: '', time: 'morning' },
  null,
]);

assertEqual(legacyRoutine, [
  { id: 'old-a', name: 'Vitamin D', dose: '1000 IU', time: 'morning', category: 'other' },
  { id: 'old-b', name: 'Omega 3', dose: '1 capsule', time: 'evening', category: 'supplement' },
], 'legacy items are preserved and invalid items are skipped');

assertEqual(
  getSupplementProgress(legacyRoutine, [{ itemId: 'old-a', taken: true }, { itemId: 'deleted', taken: true }]),
  { scheduled: 2, completed: 1, pending: 1, percentage: 50 },
  'progress counts only active routine items',
);

assertEqual(
  getSupplementProgress([], []),
  { scheduled: 0, completed: 0, pending: 0, percentage: 0 },
  'empty routine has zero progress',
);

assertEqual(translate('ar', 'kcal remaining'), 'السعرات المتبقية', 'Arabic calorie remainder label is translated');
assertEqual(translate('ckb', 'kcal remaining'), 'کالۆری ماوە', 'Sorani calorie remainder label is translated');
assertEqual(translate('ar', 'kcal over budget'), 'تجاوزت ميزانية السعرات', 'Arabic over-budget label is translated');
assertEqual(translate('ckb', 'kcal over budget'), 'کالۆرییەکانی ئامانج تێپەڕاندووە', 'Sorani over-budget label is translated');
