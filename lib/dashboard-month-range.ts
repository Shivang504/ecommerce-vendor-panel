/** Max months in the past for export / dashboard picker (inclusive of current month). */
export const DASHBOARD_EXPORT_MAX_MONTH_OFFSET = 120;

/** First day of the month for a given offset (local time). */
export function dateAtFirstOfOffset(offset: number): Date {
  const { y, m } = getMonthRangeByOffset(offset);
  return new Date(y, m - 1, 1);
}

/** Months between the given calendar month and the current month (0 = this month). */
export function monthOffsetFromAnyDayInMonth(date: Date): number {
  const d0 = new Date(date.getFullYear(), date.getMonth(), 1);
  const today = new Date();
  const t0 = new Date(today.getFullYear(), today.getMonth(), 1);
  const months = (t0.getFullYear() - d0.getFullYear()) * 12 + (t0.getMonth() - d0.getMonth());
  return Math.max(0, Math.min(DASHBOARD_EXPORT_MAX_MONTH_OFFSET, months));
}

/** Calendar month bounds in local time for dashboard / export. `offset` 0 = current month, 1 = previous, … */
export function getMonthRangeByOffset(offset: number): { start: Date; end: Date; label: string; y: number; m: number } {
  const safe = Math.max(0, Math.min(DASHBOARD_EXPORT_MAX_MONTH_OFFSET, Math.floor(offset)));
  const ref = new Date();
  ref.setDate(1);
  ref.setMonth(ref.getMonth() - safe);
  const y = ref.getFullYear();
  const m = ref.getMonth();
  const start = new Date(y, m, 1, 0, 0, 0, 0);
  const end = new Date(y, m + 1, 0, 23, 59, 59, 999);
  const label = ref.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  return { start, end, label, y, m: m + 1 };
}
