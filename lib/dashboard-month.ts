export interface DashboardMonthRange {
  year: number;
  month: number;
  startOfMonth: Date;
  endOfMonth: Date;
  startOfLastMonth: Date;
  endOfLastMonth: Date;
  label: string;
  isCurrentMonth: boolean;
}

export function parseDashboardMonth(
  yearParam: string | null,
  monthParam: string | null
): DashboardMonthRange {
  const now = new Date();
  let year = parseInt(yearParam || '', 10);
  let month = parseInt(monthParam || '', 10);

  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    year = now.getFullYear();
    month = now.getMonth() + 1;
  }

  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);
  const startOfLastMonth = new Date(year, month - 2, 1);
  const endOfLastMonth = new Date(year, month - 1, 0, 23, 59, 59, 999);

  const isCurrentMonth =
    year === now.getFullYear() && month === now.getMonth() + 1;

  const label = isCurrentMonth
    ? 'This month'
    : startOfMonth.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  return {
    year,
    month,
    startOfMonth,
    endOfMonth,
    startOfLastMonth,
    endOfLastMonth,
    label,
    isCurrentMonth,
  };
}

export function shiftDashboardMonth(year: number, month: number, delta: number) {
  const date = new Date(year, month - 1 + delta, 1);
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}

export function canGoToNextMonth(year: number, month: number): boolean {
  const now = new Date();
  const next = shiftDashboardMonth(year, month, 1);
  if (next.year > now.getFullYear()) return false;
  if (next.year === now.getFullYear() && next.month > now.getMonth() + 1) return false;
  return true;
}
