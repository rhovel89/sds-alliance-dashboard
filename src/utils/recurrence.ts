export type RecurrenceType = "daily" | "weekly" | "biweekly" | "monthly";

const DAY_MAP: Record<string, number> = {
  sun: 0, sunday: 0,
  mon: 1, monday: 1,
  tue: 2, tues: 2, tuesday: 2,
  wed: 3, wednesday: 3,
  thu: 4, thur: 4, thurs: 4, thursday: 4,
  fri: 5, friday: 5,
  sat: 6, saturday: 6,
};

function toDow(v: string): number | null {
  const k = v.trim().toLowerCase();
  return k in DAY_MAP ? DAY_MAP[k] : null;
}

function daysInUtcMonth(y: number, m: number) {
  // m is 0-based
  return new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
}

function startOfUtcWeek(d: Date) {
  // Sunday-based week start (matches JS getUTCDay)
  const day = d.getUTCDay();
  const t = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day);
  return new Date(t);
}

export function expandEventsForMonth<T extends { id: string; start_time_utc: string; recurring_enabled?: boolean | null; recurrence_type?: string | null; recurrence_days?: string[] | null; recurrence_end_date?: string | null }>(
  events: T[],
  year: number,
  month: number
): T[] {
  const monthStart = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  const monthEnd = new Date(Date.UTC(year, month, daysInUtcMonth(year, month), 23, 59, 59, 999));

  const out: T[] = [];

  for (const ev of events) {
    if (!ev.start_time_utc) continue;

    const base = new Date(ev.start_time_utc);
    const enabled = !!ev.recurring_enabled;
    const rtype = (ev.recurrence_type ?? "").toLowerCase() as any as RecurrenceType;

    // end date clamp (inclusive end-of-day UTC)
    let endClamp: Date | null = null;
    if (ev.recurrence_end_date) {
      const [yy, mm, dd] = String(ev.recurrence_end_date).split("-").map(Number);
      if (yy && mm && dd) {
        endClamp = new Date(Date.UTC(yy, mm - 1, dd, 23, 59, 59, 999));
      }
    }

    // Always include the base event if it falls within month (or even if not; keep legacy behavior)
    out.push(ev);

    if (!enabled || !rtype) continue;

    const baseH = base.getUTCHours();
    const baseM = base.getUTCMinutes();
    const baseS = base.getUTCSeconds();
    const baseMs = base.getUTCMilliseconds();

    const allowedDaysRaw = Array.isArray(ev.recurrence_days) ? ev.recurrence_days : [];
    const allowedDaysParsed = allowedDaysRaw.map(toDow).filter((x): x is number => x !== null);

    const allowedDays =
      (rtype === "weekly" || rtype === "biweekly")
        ? (allowedDaysParsed.length ? allowedDaysParsed : [base.getUTCDay()])
        : [];

    // Iterate every day in the month and generate occurrences that match
    const maxDay = daysInUtcMonth(year, month);

    for (let day = 1; day <= maxDay; day++) {
      let candidate = new Date(Date.UTC(year, month, day, baseH, baseM, baseS, baseMs));

      if (candidate < monthStart || candidate > monthEnd) continue;
      if (candidate < base) continue;
      if (endClamp && candidate > endClamp) continue;

      if (rtype === "daily") {
        // ok
      } else if (rtype === "weekly") {
        if (!allowedDays.includes(candidate.getUTCDay())) continue;
      } else if (rtype === "biweekly") {
        if (!allowedDays.includes(candidate.getUTCDay())) continue;

        const baseWeek = startOfUtcWeek(base).getTime();
        const candWeek = startOfUtcWeek(candidate).getTime();
        const weeksDiff = Math.floor((candWeek - baseWeek) / (7 * 24 * 60 * 60 * 1000));
        if (weeksDiff % 2 !== 0) continue;
      } else if (rtype === "monthly") {
        const baseDay = base.getUTCDate();
        const dim = daysInUtcMonth(candidate.getUTCFullYear(), candidate.getUTCMonth());
        const effectiveDay = Math.min(baseDay, dim);
        if (candidate.getUTCDate() !== effectiveDay) continue;
      } else {
        continue;
      }

      // Skip duplicating the base instance (same timestamp)
      if (candidate.toISOString() === base.toISOString()) continue;

      const clone = { ...ev, start_time_utc: candidate.toISOString() };
      out.push(clone);
    }
  }

  return out;
}
