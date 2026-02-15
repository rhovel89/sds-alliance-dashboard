export type RecurrenceType = "daily" | "weekly" | "biweekly" | "monthly";

/**
 * Broad shape used by calendar. Keep fields optional so we don't break older rows.
 * We also include meta fields for virtual (expanded) occurrences.
 */
export type CalendarEventRow = {
  id: string;

  // canonical
  start_time_utc?: string | null;

  // legacy helpers (some schemas store these)
  start_date?: string | null; // YYYY-MM-DD
  start_time?: string | null; // HH:mm

  // recurrence
  recurring_enabled?: boolean | null;
  recurrence_type?: RecurrenceType | string | null;
  recurrence_days?: string[] | null;
  recurrence_end_date?: string | null; // YYYY-MM-DD

  // meta for expanded instances
  _source_event_id?: string;
  _occurrence_time_utc?: string;
};

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
  const k = String(v ?? "").trim().toLowerCase();
  return k in DAY_MAP ? DAY_MAP[k] : null;
}

/**
 * Returns the event start time in UTC ISO string.
 * Prefers start_time_utc. Falls back to (start_date + start_time) treated as LOCAL time.
 * Avoids "YYYY-MM-DD" Date() UTC parsing bugs by manual parse.
 */
export function getEventStartUtc(e: CalendarEventRow): string | null {
  if (e.start_time_utc) return String(e.start_time_utc);

  const sd = (e.start_date ?? "").trim();
  const st = (e.start_time ?? "").trim();

  if (sd && st) {
    const d = new Date(`${sd}T${st}`);
    if (!isNaN(d.getTime())) return d.toISOString();
  }

  if (sd) {
    const parts = sd.split("-").map(Number);
    if (parts.length === 3) {
      const [y, m, d] = parts;
      // LOCAL midnight (safe, no UTC string parsing)
      const dt = new Date(y, (m || 1) - 1, d || 1, 0, 0, 0, 0);
      if (!isNaN(dt.getTime())) return dt.toISOString();
    }
  }

  return null;
}

/**
 * For expanded (virtual) occurrences, delete should target the original event id.
 */
export function getDeleteId(e: CalendarEventRow): string {
  return String((e as any)._source_event_id ?? e.id);
}

function daysInUtcMonth(y: number, m: number) {
  return new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
}

function startOfUtcWeek(d: Date) {
  const day = d.getUTCDay();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day));
}

function parseEndClamp(endDate: any): Date | null {
  if (!endDate) return null;
  const [yy, mm, dd] = String(endDate).split("-").map(Number);
  if (!yy || !mm || !dd) return null;
  return new Date(Date.UTC(yy, mm - 1, dd, 23, 59, 59, 999));
}

/**
 * Expand recurring events into occurrences for the requested month.
 * Output events include meta fields:
 *   _source_event_id, _occurrence_time_utc
 */
export function expandEventsForMonth<T extends CalendarEventRow>(
  events: T[],
  year: number,
  month: number
): T[] {
  const monthStart = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  const monthEnd = new Date(Date.UTC(year, month, daysInUtcMonth(year, month), 23, 59, 59, 999));

  const out: T[] = [];

  for (const ev of events) {
    const baseIso = getEventStartUtc(ev);
    if (!baseIso) continue;

    const base = new Date(baseIso);
    const enabled = !!ev.recurring_enabled;
    const rtype = String(ev.recurrence_type ?? "").toLowerCase() as RecurrenceType;

    const endClamp = parseEndClamp(ev.recurrence_end_date);

    // Include base row (mark meta)
    out.push({
      ...(ev as any),
      start_time_utc: base.toISOString(),
      _source_event_id: ev.id,
      _occurrence_time_utc: base.toISOString(),
    });

    if (!enabled || !rtype) continue;

    const baseH = base.getUTCHours();
    const baseM = base.getUTCMinutes();
    const baseS = base.getUTCSeconds();
    const baseMs = base.getUTCMilliseconds();

    const rawDays = Array.isArray(ev.recurrence_days) ? ev.recurrence_days : [];
    const parsedDays = rawDays.map(toDow).filter((x): x is number => x !== null);

    const allowedDays =
      (rtype === "weekly" || rtype === "biweekly")
        ? (parsedDays.length ? parsedDays : [base.getUTCDay()])
        : [];

    const maxDay = daysInUtcMonth(year, month);

    for (let day = 1; day <= maxDay; day++) {
      const cand = new Date(Date.UTC(year, month, day, baseH, baseM, baseS, baseMs));

      if (cand < monthStart || cand > monthEnd) continue;
      if (cand < base) continue;
      if (endClamp && cand > endClamp) continue;

      if (rtype === "daily") {
        // ok
      } else if (rtype === "weekly") {
        if (!allowedDays.includes(cand.getUTCDay())) continue;
      } else if (rtype === "biweekly") {
        if (!allowedDays.includes(cand.getUTCDay())) continue;

        const baseWeek = startOfUtcWeek(base).getTime();
        const candWeek = startOfUtcWeek(cand).getTime();
        const weeksDiff = Math.floor((candWeek - baseWeek) / (7 * 24 * 60 * 60 * 1000));
        if (weeksDiff % 2 !== 0) continue;
      } else if (rtype === "monthly") {
        const baseDay = base.getUTCDate();
        const dim = daysInUtcMonth(cand.getUTCFullYear(), cand.getUTCMonth());
        const effectiveDay = Math.min(baseDay, dim);
        if (cand.getUTCDate() !== effectiveDay) continue;
      } else {
        continue;
      }

      // skip base timestamp duplicate
      if (cand.toISOString() === base.toISOString()) continue;

      out.push({
        ...(ev as any),
        start_time_utc: cand.toISOString(),
        _source_event_id: ev.id,
        _occurrence_time_utc: cand.toISOString(),
      });
    }
  }

  return out;
}
