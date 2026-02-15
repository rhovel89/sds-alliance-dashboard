export type RecurrenceType = "none" | "daily" | "weekly" | "biweekly" | "monthly";

export type CalendarEventRow = {
  id: string;
  alliance_id: string;
  title: string;
  event_type?: string | null;
  start_time_utc: string;
  duration_minutes: number;
  created_by: string;

  // Possible schema variants (we support both)
  recurrence_type?: string | null;
  recurrence?: string | null;

  recurrence_days?: number[] | string[] | string | null;
  days_of_week?: number[] | string[] | string | null;

  // For rendering occurrences (client-side only)
  series_id?: string;
  instance_id?: string;
  occurrence_start_time_utc?: string;
};

const MS_DAY = 86_400_000;

function normType(row: CalendarEventRow): RecurrenceType {
  const raw = (row.recurrence_type ?? row.recurrence ?? "none")
    .toString()
    .toLowerCase()
    .trim();

  if (raw === "daily") return "daily";
  if (raw === "weekly") return "weekly";
  if (raw === "biweekly" || raw === "bi-weekly" || raw === "bi_weekly") return "biweekly";
  if (raw === "monthly") return "monthly";
  return "none";
}

// Accept: number[], string[], "1,3,5", "[1,3,5]"
function parseDow(v: CalendarEventRow["recurrence_days"]): number[] {
  if (v == null) return [];
  if (Array.isArray(v)) return v.map((x) => Number(x)).filter((n) => Number.isFinite(n));

  const cleaned = v.toString().replace(/[\[\]\s]/g, "");
  if (!cleaned) return [];
  return cleaned.split(",").map((s) => Number(s)).filter((n) => Number.isFinite(n));
}

// Local start-of-day (matches your isSameDay logic)
function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

export function getEventStartUtc(e: CalendarEventRow): string {
  return e.occurrence_start_time_utc ?? e.start_time_utc;
}

export function getDeleteId(e: CalendarEventRow): string {
  return e.series_id ?? e.id;
}

export function expandEventsForMonth(
  rows: CalendarEventRow[],
  year: number,
  month: number
): CalendarEventRow[] {
  const expanded: CalendarEventRow[] = [];

  const monthStart = new Date(year, month, 1, 0, 0, 0, 0);
  const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (const row of rows) {
    expanded.push(row);

    const rt = normType(row);
    if (rt === "none") continue;

    const base = new Date(row.start_time_utc); // local Date at that UTC instant
    if (Number.isNaN(base.getTime())) continue;

    const baseH = base.getHours();
    const baseM = base.getMinutes();
    const baseS = base.getSeconds();

    // Weekly/Biweekly may use selected DOWs; if none, default to base day-of-week (LOCAL)
    const dowsRaw = parseDow(row.recurrence_days ?? row.days_of_week);
    const dows = (rt === "weekly" || rt === "biweekly")
      ? (dowsRaw.length ? dowsRaw : [base.getDay()])
      : [];

    if (rt === "monthly") {
      const day = Math.min(base.getDate(), daysInMonth);
      const occLocal = new Date(year, month, day, baseH, baseM, baseS, 0);

      if (occLocal >= base && occLocal >= monthStart && occLocal <= monthEnd) {
        const iso = occLocal.toISOString();
        if (iso !== row.start_time_utc) {
          expanded.push({
            ...row,
            series_id: row.id,
            instance_id: `${row.id}__${iso}`,
            occurrence_start_time_utc: iso,
          });
        }
      }
      continue;
    }

    // For daily/weekly/biweekly: scan the visible month days (safe + predictable)
    for (let d = 1; d <= daysInMonth; d++) {
      const occLocal = new Date(year, month, d, baseH, baseM, baseS, 0);
      if (occLocal < base) continue;
      if (occLocal < monthStart || occLocal > monthEnd) continue;

      if (rt === "daily") {
        // ok
      } else if (rt === "weekly" || rt === "biweekly") {
        const dow = occLocal.getDay(); // local 0..6
        if (!dows.includes(dow)) continue;

        if (rt === "biweekly") {
          const diffDays = Math.floor(
            (startOfLocalDay(occLocal).getTime() - startOfLocalDay(base).getTime()) / MS_DAY
          );
          const weekIndex = Math.floor(diffDays / 7);
          if (weekIndex % 2 !== 0) continue;
        }
      } else {
        continue;
      }

      const iso = occLocal.toISOString();
      if (iso === row.start_time_utc) continue;

      expanded.push({
        ...row,
        series_id: row.id,
        instance_id: `${row.id}__${iso}`,
        occurrence_start_time_utc: iso,
      });
    }
  }

  return expanded;
}
