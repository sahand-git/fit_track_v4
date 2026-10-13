/**
 * Pure helper to verify if an asynchronous date-scoped operation should update visible UI state.
 * Returns true only if the operation's target date matches the currently selected date.
 */
export function shouldUpdateVisibleDate(targetDate: string, currentlySelectedDate: string): boolean {
  return targetDate === currentlySelectedDate;
}
