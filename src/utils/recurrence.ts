export type RecurrenceType = "daily" | "weekly" | "biweekly" | "monthly";

export type CalendarEventRow = {
  id: string;

  title?: string | null;
  event_type?: string | null;
  event_name?: string | null;

  created_by?: string | null;
  alliance_id?: string | null;

  duration_minutes?: number | null;
  timezone_origin?: string | null;

  start_time_utc?: string | null;

  start_date?: string | null; // YYYY-MM-DD
  start_time?: string | null; // HH:mm or HH:mm:ss
  end_date?: string | null;
  end_time?: string | null;

  recurring_enabled?: boolean | null;
  recurrence_type?: RecurrenceType | string | null;
  recurrence_days?: string[] | null;
  recurrence_end_date?: string | null;

  recurrence?: string | null;
  days_of_week?: string[] | null;

  instance_id?: string | null;
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

function parseLocalStart(e: CalendarEventRow): Date | null {
  const sd = String(e.start_date ?? "").trim();
  const st = String(e.start_time ?? "").trim();

  if (sd) {
    const dm = sd.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dm) {
      const y = Number(dm[1]);
      const mo = Number(dm[2]);
      const da = Number(dm[3]);

      let hh = 0;
      let mm = 0;

      if (st) {
        const tm = st.match(/^(\d{2}):(\d{2})/);
        if (tm) {
          hh = Number(tm[1]);
          mm = Number(tm[2]);
        }
      }

      const dt = new Date(y, mo - 1, da, hh, mm, 0, 0);
      if (!Number.isNaN(dt.getTime())) return dt;
    }
  }

  if (e.start_time_utc) {
    const d = new Date(String(e.start_time_utc));
    if (!Number.isNaN(d.getTime())) return d;
  }

  return null;
}

export function getEventStartUtc(e: CalendarEventRow): string | null {
  if (e.start_time_utc) return String(e.start_time_utc);

  const local = parseLocalStart(e);
  if (!local) return null;
  return local.toISOString();
}

export function getDeleteId(e: CalendarEventRow): string {
  return String((e as any)._source_event_id ?? e.id);
}

function daysInLocalMonth(y: number, m: number) {
  return new Date(y, m + 1, 0).getDate();
}

function startOfLocalWeek(d: Date) {
  const day = d.getDay();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - day, 0, 0, 0, 0);
}

function parseEndClampLocal(endDate: any): Date | null {
  if (!endDate) return null;
  const [yy, mm, dd] = String(endDate).split("-").map(Number);
  if (!yy || !mm || !dd) return null;
  return new Date(yy, mm - 1, dd, 23, 59, 59, 999);
}

export function expandEventsForMonth<T extends CalendarEventRow>(
  events: T[],
  year: number,
  month: number
): T[] {
  const monthStart = new Date(year, month, 1, 0, 0, 0, 0);
  const monthEnd = new Date(year, month, daysInLocalMonth(year, month), 23, 59, 59, 999);

  const out: T[] = [];

  for (const ev of events) {
    const baseLocal = parseLocalStart(ev);
    if (!baseLocal) continue;

    const baseUtcIso = getEventStartUtc(ev);
    if (!baseUtcIso) continue;

    const enabled = !!ev.recurring_enabled;
    const rtype = String(ev.recurrence_type ?? ev.recurrence ?? "").toLowerCase() as RecurrenceType;
    const endClamp = parseEndClampLocal(ev.recurrence_end_date);

    out.push({
      ...(ev as any),
      start_time_utc: baseUtcIso,
      _source_event_id: ev.id,
      _occurrence_time_utc: baseUtcIso,
    });

    if (!enabled || !rtype) continue;

    const baseH = baseLocal.getHours();
    const baseM = baseLocal.getMinutes();
    const baseS = baseLocal.getSeconds();
    const baseMs = baseLocal.getMilliseconds();

    const rawDays = Array.isArray(ev.recurrence_days)
      ? ev.recurrence_days
      : Array.isArray(ev.days_of_week)
      ? ev.days_of_week
      : [];

    const parsedDays = rawDays.map((x) => toDow(String(x))).filter((x): x is number => x !== null);

    const allowedDays =
      (rtype === "weekly" || rtype === "biweekly")
        ? (parsedDays.length ? parsedDays : [baseLocal.getDay()])
        : [];

    const maxDay = daysInLocalMonth(year, month);

    for (let day = 1; day <= maxDay; day++) {
      const candLocal = new Date(year, month, day, baseH, baseM, baseS, baseMs);

      if (candLocal < monthStart || candLocal > monthEnd) continue;
      if (candLocal < baseLocal) continue;
      if (endClamp && candLocal > endClamp) continue;

      if (rtype === "daily") {
        // ok
      } else if (rtype === "weekly") {
        if (!allowedDays.includes(candLocal.getDay())) continue;
      } else if (rtype === "biweekly") {
        if (!allowedDays.includes(candLocal.getDay())) continue;

        const baseWeek = startOfLocalWeek(baseLocal).getTime();
        const candWeek = startOfLocalWeek(candLocal).getTime();
        const weeksDiff = Math.floor((candWeek - baseWeek) / (7 * 24 * 60 * 60 * 1000));
        if (weeksDiff % 2 !== 0) continue;
      } else if (rtype === "monthly") {
        const baseDay = baseLocal.getDate();
        const dim = daysInLocalMonth(candLocal.getFullYear(), candLocal.getMonth());
        const effectiveDay = Math.min(baseDay, dim);
        if (candLocal.getDate() !== effectiveDay) continue;
      } else {
        continue;
      }

      const candUtcIso = candLocal.toISOString();
      if (candUtcIso === baseUtcIso) continue;

      out.push({
        ...(ev as any),
        start_time_utc: candUtcIso,
        _source_event_id: ev.id,
        _occurrence_time_utc: candUtcIso,
      });
    }
  }

  return out;
}
