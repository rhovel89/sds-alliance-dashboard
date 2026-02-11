export const WEEKDAY_LABELS_SUN_FIRST = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function pad2(n: number): string {
  return n < 10 ? '0' + n : String(n);
}

export function toLocalISODate(d: Date): string {
  const y = d.getFullYear();
  const m = pad2(d.getMonth() + 1);
  const day = pad2(d.getDate());
  return y + '-' + m + '-' + day;
}

export function daysInMonth(year: number, monthIndex0: number): number {
  // monthIndex0: 0-11
  return new Date(year, monthIndex0 + 1, 0).getDate();
}

export function startDayOfMonth(year: number, monthIndex0: number): number {
  // 0=Sun ... 6=Sat
  return new Date(year, monthIndex0, 1).getDay();
}

export type MonthCell = {
  date: Date;
  iso: string;           // YYYY-MM-DD
  inCurrentMonth: boolean;
};

export function buildMonthGrid(year: number, monthIndex0: number): MonthCell[] {
  // Always returns 42 cells (6 weeks), Sun-first
  const firstDow = startDayOfMonth(year, monthIndex0);
  const dim = daysInMonth(year, monthIndex0);

  const prevMonthIndex0 = monthIndex0 === 0 ? 11 : monthIndex0 - 1;
  const prevYear = monthIndex0 === 0 ? year - 1 : year;
  const dimPrev = daysInMonth(prevYear, prevMonthIndex0);

  const cells: MonthCell[] = [];

  // Leading days from previous month
  for (let i = firstDow - 1; i >= 0; i--) {
    const day = dimPrev - i;
    const d = new Date(prevYear, prevMonthIndex0, day);
    cells.push({ date: d, iso: toLocalISODate(d), inCurrentMonth: false });
  }

  // Current month days
  for (let day = 1; day <= dim; day++) {
    const d = new Date(year, monthIndex0, day);
    cells.push({ date: d, iso: toLocalISODate(d), inCurrentMonth: true });
  }

  // Trailing days to fill 42
  while (cells.length < 42) {
    const last = cells[cells.length - 1].date;
    const d = new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1);
    cells.push({ date: d, iso: toLocalISODate(d), inCurrentMonth: false });
  }

  return cells;
}

export function monthLabel(year: number, monthIndex0: number): string {
  const d = new Date(year, monthIndex0, 1);
  return d.toLocaleString(undefined, { month: 'long', year: 'numeric' });
}
