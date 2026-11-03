import { MealType } from '../../types';

export interface SessionItem {
  id: string; // LoggedMeal id
  foodId: string;
  name: string;
  portion: string;
  calories: number;
  mealType: MealType;
  timestamp: string;
  batchId?: string;
}

export interface SessionToastState {
  visible: boolean;
  message: string;
  itemIds: string[];
}

export interface AddFoodSessionState {
  items: SessionItem[];
  isTrayExpanded: boolean;
  toast: SessionToastState | null;
  lastAddTapTime: number;
}

export function createInitialSessionState(): AddFoodSessionState {
  return {
    items: [],
    isTrayExpanded: false,
    toast: null,
    lastAddTapTime: 0,
  };
}

/**
 * Validates if an Add button tap should be processed.
 * Ignores taps within `thresholdMs` (default 700ms) to guard against rapid double-taps,
 * while allowing deliberate taps after the threshold.
 */
export function canProcessAddTap(
  lastTapTime: number,
  currentTime: number = Date.now(),
  thresholdMs: number = 700
): boolean {
  if (lastTapTime <= 0) return true;
  return currentTime - lastTapTime >= thresholdMs;
}

/**
 * Calculates cumulative count and calories for items added this session.
 */
export function calculateSessionTotals(items: SessionItem[]): {
  count: number;
  totalCalories: number;
} {
  const count = items.length;
  const totalCalories = items.reduce((sum, item) => sum + (item.calories || 0), 0);
  return { count, totalCalories };
}

/**
 * Formats the summary pill text: e.g. "3 added · 450 kcal".
 */
export function formatSessionSummary(
  count: number,
  totalCalories: number,
  t: (key: string) => string
): string {
  const template = t('{count} added · {kcal} kcal');
  if (template && template !== '{count} added · {kcal} kcal') {
    return template
      .replace('{count}', String(count))
      .replace('{kcal}', String(totalCalories));
  }
  return `${count} ${t('added')} · ${totalCalories} ${t('kcal')}`;
}

/**
 * Formats toast message for a single logged item: e.g. "Added Boiled Egg to Breakfast".
 */
export function formatAddedToastMessage(
  foodName: string,
  mealName: string,
  t: (key: string) => string
): string {
  const template = t('Added {food} to {meal}');
  if (template && template !== 'Added {food} to {meal}') {
    return template.replace('{food}', foodName).replace('{meal}', mealName);
  }
  return `${t('Added')} ${foodName} ${t('to')} ${mealName}`;
}

/**
 * Formats toast message for batch adds (e.g. template or copy yesterday).
 */
export function formatBatchAddedToastMessage(
  count: number,
  t: (key: string) => string
): string {
  const template = t('Added {count} meals');
  if (template && template !== 'Added {count} meals') {
    return template.replace('{count}', String(count));
  }
  return `${t('Added')} ${count} ${count === 1 ? t('meal') : t('meals')}`;
}

/**
 * Adds new session items and returns updated state with active toast.
 */
export function addSessionItems(
  state: AddFoodSessionState,
  newItems: SessionItem[],
  toastMessage: string,
  timestamp: number = Date.now()
): AddFoodSessionState {
  if (newItems.length === 0) return state;

  return {
    ...state,
    items: [...newItems, ...state.items], // newest first for session tray
    toast: {
      visible: true,
      message: toastMessage,
      itemIds: newItems.map((item) => item.id),
    },
    lastAddTapTime: timestamp,
  };
}

/**
 * Removes a specific item from the session and recalculates state.
 */
export function removeSessionItem(
  state: AddFoodSessionState,
  itemId: string
): AddFoodSessionState {
  const remaining = state.items.filter((item) => item.id !== itemId);
  const toastVisible = state.toast?.itemIds.includes(itemId) ? false : (state.toast?.visible ?? false);

  return {
    ...state,
    items: remaining,
    isTrayExpanded: remaining.length === 0 ? false : state.isTrayExpanded,
    toast: toastVisible ? state.toast : null,
  };
}

/**
 * Removes multiple items from the session (e.g. on batch Undo).
 */
export function removeSessionBatch(
  state: AddFoodSessionState,
  itemIds: string[]
): AddFoodSessionState {
  const idSet = new Set(itemIds);
  const remaining = state.items.filter((item) => !idSet.has(item.id));

  return {
    ...state,
    items: remaining,
    isTrayExpanded: remaining.length === 0 ? false : state.isTrayExpanded,
    toast: null,
  };
}

/**
 * Dismisses the active toast without modifying items.
 */
export function dismissSessionToast(state: AddFoodSessionState): AddFoodSessionState {
  if (!state.toast) return state;
  return {
    ...state,
    toast: null,
  };
}

/**
 * Toggles the expanded drawer list in the session tray.
 */
export function toggleSessionTrayExpanded(state: AddFoodSessionState): AddFoodSessionState {
  if (state.items.length === 0) {
    return { ...state, isTrayExpanded: false };
  }
  return {
    ...state,
    isTrayExpanded: !state.isTrayExpanded,
  };
}
