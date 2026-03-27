import { useEffect, useMemo, useState } from "react";

import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useHQPermissions } from "../../hooks/useHQPermissions";
import { useAllianceManagerAccess } from "../../hooks/useAllianceManagerAccess";
import { RecurringControls } from "../../components/calendar/RecurringControls";
import { toLocalISODate, parseISODateLocal } from "../../utils/dateLocal";
import {
  expandEventsForMonth,
  getDeleteId,
  getEventStartUtc,
  type CalendarEventRow,
  type RecurrenceType,
} from "../../utils/recurrence";

type EventRow = CalendarEventRow & {
  title?: string | null;
  event_type?: string | null;
  event_category?: string | null;
  created_by?: string | null;
  duration_minutes?: number | null;
  timezone_origin?: string | null;
  start_time_utc?: string | null;
  start_date?: string | null;
  start_time?: string | null;
  end_date?: string | null;
  end_time?: string | null;

  // expanded fields are already supported by CalendarEventRow meta types
  instance_id?: string | null;
};

type EventTypeRow = {
  id: string;
  alliance_code: string;
  category: string; // 'Alliance' | 'State'
  name: string;
};

const DEFAULT_EVENT_TYPES = [
  "State vs. State",
  "Reminder",
  "Sonic",
  "Dead Rising",
  "Defense of Alliance",
  "Wasteland King",
  "Valiance Conquest",
  "Tundra",
  "Alliance Clash",
  "Alliance Showdown",
  "FireFlies",
];

const CATEGORY_OPTIONS = [
  { value: "Alliance", label: "Alliance Event" },
  { value: "State", label: "State Event" },
];
const EVENT_TYPES = [
  "State vs. State",
  "Reminder",
  "Sonic",
  "Dead Rising",
  "Defense of Alliance",
  "Wasteland King",
  "Valiance Conquest",
  "Tundra",
  "Alliance Clash",
  "Alliance Showdown",
  "FireFlies",
];

const DAY_NAMES = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"] as const;

function weekdayNameFromLocalIsoDate(isoDate: string) {
  const m = String(isoDate || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return "Sun";
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(y, mo - 1, d, 12, 0, 0, 0);
  return DAY_NAMES[dt.getDay()];
}
const LOCAL_DAY_MAP: Record<string, number> = {
  sun: 0, sunday: 0,
  mon: 1, monday: 1,
  tue: 2, tues: 2, tuesday: 2,
  wed: 3, wednesday: 3,
  thu: 4, thur: 4, thurs: 4, thursday: 4,
  fri: 5, friday: 5,
  sat: 6, saturday: 6,
};

function localDowFromToken(v: string): number | null {
  const k = String(v || "").trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(LOCAL_DAY_MAP, k) ? LOCAL_DAY_MAP[k] : null;
}

function parseEventLocalStart(ev: any): Date | null {
  const sd = String(ev?.start_date || "").trim();
  const st = String(ev?.start_time || "").trim();

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

  if (ev?.start_time_utc) {
    const dt = new Date(String(ev.start_time_utc));
    if (!Number.isNaN(dt.getTime())) return dt;
  }

  return null;
}

function parseRecurrenceEndLocal(v: any): Date | null {
  if (!v) return null;
  const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;

  return new Date(
    Number(m[1]),
    Number(m[2]) - 1,
    Number(m[3]),
    23, 59, 59, 999
  );
}

function localWeekStart(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - d.getDay(), 0, 0, 0, 0);
}

function expandEventsForMonthStable(rows: EventRow[], year: number, month: number): EventRow[] {
  const out: EventRow[] = [];
  const monthStart = new Date(year, month, 1, 0, 0, 0, 0);
  const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);

  for (const ev of rows) {
    const baseLocal = parseEventLocalStart(ev);
    if (!baseLocal) continue;

    const baseUtc = String(ev.start_time_utc || baseLocal.toISOString());
    const recurrenceType = String(ev.recurrence_type ?? ev.recurrence ?? (ev as any).frequency ?? "").trim().toLowerCase().replace(/[\s_-]+/g, "");
    const recurring = !!ev.recurring_enabled && !!recurrenceType;
    const recurrenceEnd = parseRecurrenceEndLocal(ev.recurrence_end_date);

    out.push({
      ...(ev as any),
      start_time_utc: baseUtc,
      _source_event_id: ev.id,
      _occurrence_time_utc: baseUtc,
    });

    if (!recurring) continue;

    const rawDays = Array.isArray(ev.recurrence_days)
      ? ev.recurrence_days
      : Array.isArray((ev as any).days_of_week)
      ? (ev as any).days_of_week
      : [];

    const parsedDays = rawDays
      .map((x: any) => localDowFromToken(String(x)))
      .filter((x: number | null): x is number => x !== null);

    const allowedDays =
      (recurrenceType === "weekly" || recurrenceType === "biweekly")
        ? (parsedDays.length ? parsedDays : [baseLocal.getDay()])
        : [];

    const maxDay = getDaysInCalendarMonth(year, month );

    for (let day = 1; day <= maxDay; day++) {
      const candLocal = new Date(
        year,
        month,
        day,
        baseLocal.getHours(),
        baseLocal.getMinutes(),
        baseLocal.getSeconds(),
        baseLocal.getMilliseconds()
      );

      if (candLocal < baseLocal) continue;
      if (candLocal < monthStart || candLocal > monthEnd) continue;
      if (recurrenceEnd && candLocal > recurrenceEnd) continue;

      if (recurrenceType === "daily") {
        // keep
      } else if (recurrenceType === "weekly") {
        if (!allowedDays.includes(candLocal.getDay())) continue;
      } else if (recurrenceType === "biweekly") {
        if (!allowedDays.includes(candLocal.getDay())) continue;

        const baseWeek = localWeekStart(baseLocal).getTime();
        const candWeek = localWeekStart(candLocal).getTime();
        const weeksDiff = Math.floor((candWeek - baseWeek) / (7 * 24 * 60 * 60 * 1000));
        if (weeksDiff % 2 !== 0) continue;
      } else if (recurrenceType === "monthly") {
        if (candLocal.getDate() !== baseLocal.getDate()) continue;
      } else {
        continue;
      }

      const candUtc = candLocal.toISOString();
      if (candUtc === baseUtc) continue;

      out.push({
        ...(ev as any),
        start_time_utc: candUtc,
        _source_event_id: ev.id,
        _occurrence_time_utc: candUtc,
      });
    }
  }

  return out;
}

type CalendarLocalExpandedEvent = EventRow & {
  _source_event_id: string;
  _occurrence_time_utc: string;
  _occurrence_local_date: string;
  _occurrence_local_time: string;
};

const CAL_DAY_TO_NUM: Record<string, number> = {
  sun: 0, sunday: 0,
  mon: 1, monday: 1,
  tue: 2, tues: 2, tuesday: 2,
  wed: 3, wednesday: 3,
  thu: 4, thur: 4, thurs: 4, thursday: 4,
  fri: 5, friday: 5,
  sat: 6, saturday: 6,
};

function parseYmdLocal(iso: string): { y: number; m: number; d: number } | null {
  const m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
}

function ymdString(y: number, m: number, d: number) {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function parseHmLocal(v: string): { hh: number; mm: number } {
  const m = String(v || "").match(/^(\d{2}):(\d{2})/);
  if (!m) return { hh: 0, mm: 0 };
  return { hh: Number(m[1]), mm: Number(m[2]) };
}

function dateFromYmdNoon(iso: string): Date | null {
  const p = parseYmdLocal(iso);
  if (!p) return null;
  return new Date(p.y, p.m - 1, p.d, 12, 0, 0, 0);
}

function startOfWeekLocalNoon(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - d.getDay(), 12, 0, 0, 0);
}

function recurrenceDayNums(ev: any): number[] {
  const raw = Array.isArray(ev?.recurrence_days)
    ? ev.recurrence_days
    : Array.isArray(ev?.days_of_week)
    ? ev.days_of_week
    : [];

  const nums = raw
    .map((x: any) => {
      const key = String(x || "").trim().toLowerCase();
      return Object.prototype.hasOwnProperty.call(CAL_DAY_TO_NUM, key) ? CAL_DAY_TO_NUM[key] : null;
    })
    .filter((x: number | null): x is number => x !== null);

  if (nums.length) return nums;

  const baseDate = dateFromYmdNoon(String(ev?.start_date || ""));
  if (baseDate) return [baseDate.getDay()];

  if (ev?.start_time_utc) {
    const d = new Date(String(ev.start_time_utc));
    if (!Number.isNaN(d.getTime())) return [d.getDay()];
  }

  return [];
}

function localTimeLabelFromEvent(ev: any) {
  const hm = parseHmLocal(String(ev?.start_time || ""));
  const d = new Date(2000, 0, 1, hm.hh, hm.mm, 0, 0);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function occurrenceLocalDate(ev: any) {
  return String(ev?._occurrence_local_date || ev?.start_date || "");
}

function occurrenceLocalTime(ev: any) {
  if (ev?._occurrence_local_time) return String(ev._occurrence_local_time);
  return localTimeLabelFromEvent(ev);
}

function expandMonthLocally(rows: EventRow[], year: number, month: number): CalendarLocalExpandedEvent[] {
  const out: CalendarLocalExpandedEvent[] = [];
  const maxDay = getDaysInCalendarMonth(year, month );

  for (const ev of rows) {
    const baseDateIso = String(ev.start_date || "");
    const baseDateNoon = dateFromYmdNoon(baseDateIso);
    if (!baseDateNoon) continue;

    const hm = parseHmLocal(String(ev.start_time || ""));
    const baseDateTime = new Date(
      baseDateNoon.getFullYear(),
      baseDateNoon.getMonth(),
      baseDateNoon.getDate(),
      hm.hh,
      hm.mm,
      0,
      0
    );

    const baseTimeLabel = baseDateTime.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    out.push({
      ...(ev as any),
      _source_event_id: String(ev.id),
      _occurrence_time_utc: String(ev.start_time_utc || baseDateTime.toISOString()),
      _occurrence_local_date: baseDateIso,
      _occurrence_local_time: baseTimeLabel,
      start_time_utc: String(ev.start_time_utc || baseDateTime.toISOString()),
    });

    const rtype = String(ev.recurrence_type ?? ev.recurrence ?? (ev as any).frequency ?? "").trim().toLowerCase().replace(/[\s_-]+/g, "");
    const recurring = !!ev.recurring_enabled && !!rtype;
    if (!recurring) continue;

    const allowedDays = recurrenceDayNums(ev);
    const endDateNoon = dateFromYmdNoon(String(ev.recurrence_end_date || ""));

    for (let day = 1; day <= maxDay; day++) {
      const candNoon = new Date(year, month, day, 12, 0, 0, 0);
      const candIso = ymdString(year, month + 1, day);

      if (candNoon < baseDateNoon) continue;
      if (endDateNoon && candNoon > endDateNoon) continue;

      if (rtype === "daily") {
        // ok
      } else if (rtype === "weekly") {
        if (!allowedDays.includes(candNoon.getDay())) continue;
      } else if (rtype === "biweekly") {
        if (!allowedDays.includes(candNoon.getDay())) continue;

        const baseWeek = startOfWeekLocalNoon(baseDateNoon).getTime();
        const candWeek = startOfWeekLocalNoon(candNoon).getTime();
        const weeksDiff = Math.floor((candWeek - baseWeek) / (7 * 24 * 60 * 60 * 1000));
        if (weeksDiff % 2 !== 0) continue;
      } else if (rtype === "monthly") {
        if (candNoon.getDate() !== baseDateNoon.getDate()) continue;
      } else {
        continue;
      }

      if (candIso === baseDateIso) continue;

      const candDateTime = new Date(year, month, day, hm.hh, hm.mm, 0, 0);

      out.push({
        ...(ev as any),
        _source_event_id: String(ev.id),
        _occurrence_time_utc: candDateTime.toISOString(),
        _occurrence_local_date: candIso,
        _occurrence_local_time: baseTimeLabel,
        start_time_utc: candDateTime.toISOString(),
      });
    }
  }

  return out;
}


function dedupeCalendarDayEvents<T = any>(items: T[]): T[] {
  const seen = new Set<string>();

  return (items ?? []).filter((item: any, idx: number) => {
    const key = [
      String(item?.id ?? ""),
      String(item?.event_id ?? ""),
      String(item?.title ?? item?.name ?? ""),
      String(item?.start_at ?? item?.start ?? item?.date ?? ""),
      String(item?.end_at ?? item?.end ?? item?.date ?? ""),
    ].join("|");

    const finalKey = key === "|||||" ? "idx:" + String(idx) : key;
    if (seen.has(finalKey)) return false;
    seen.add(finalKey);
    return true;
  });
}


const CALENDAR_WEEK_START = "monday" as const;
// Change to "sunday" if you want Sunday in the first column instead.

const CALENDAR_WEEKDAYS =
  CALENDAR_WEEK_START === "monday"
    ? (["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const)
    : (["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const);

function getCalendarMonthOffset(year: number, month: number): number {
  const dow = new Date(year, month, 1).getDay(); // 0=Sun ... 6=Sat
  return CALENDAR_WEEK_START === "monday" ? ((dow + 6) % 7) : dow;
}

function getDaysInCalendarMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}
export default function AllianceCalendarPage() {
  const { alliance_id } = useParams<{ alliance_id: string }>();
  const upperAlliance = (alliance_id || "").toUpperCase();
  const { canEdit: canEditHQ } = useHQPermissions(upperAlliance);
  const { isManager, isAppAdmin } = useAllianceManagerAccess(upperAlliance);
  const canEdit = canEditHQ || isAppAdmin || isManager;

  const [userId, setUserId] = useState<string | null>(null);

  // Raw rows from DB
  const [events, setEvents] = useState<EventRow[]>([]);

  // Event types catalog
  const [typesOk, setTypesOk] = useState(true);
  const [eventTypes, setEventTypes] = useState<EventTypeRow[]>([]);
  const [typesHint, setTypesHint] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
const [displayUtc, setDisplayUtc] = useState<boolean>(() => {
  try {
    return localStorage.getItem("calendar.timeMode") === "utc";
  } catch {
    return false;
  }
});

  const makeEmptyForm = () => ({
  title: "",
  event_category: "Alliance",
  event_type: "Reminder",
  new_event_type: "",
  start_date: "",
  start_time: "",
  end_date: "",
  end_time: "",
  recurring_enabled: false,
  recurrence_type: "weekly",
  recurrence_days: [] as string[],
  recurrence_end_date: "",
  time_mode: "local" as "local" | "utc",
});

  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [form, setForm] = useState(makeEmptyForm());
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  const today = new Date();
  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear] = useState(today.getFullYear());

const parseFormDateTime = (date: string, time: string, mode: "local" | "utc") => {
  const dm = String(date || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const tm = String(time || "").match(/^(\d{2}):(\d{2})/);
  if (!dm || !tm) return new Date(NaN);

  const y = Number(dm[1]);
  const mo = Number(dm[2]);
  const da = Number(dm[3]);
  const hh = Number(tm[1]);
  const mm = Number(tm[2]);

  if (mode === "utc") {
    return new Date(Date.UTC(y, mo - 1, da, hh, mm, 0, 0));
  }

  return new Date(y, mo - 1, da, hh, mm, 0, 0);
};

const hhmmss = (d: Date) =>
  `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:00`;

const formatEventTimeLabel = (e: any) => {
  const utcIso = String(e?._occurrence_time_utc || e?.start_time_utc || "");

  if (displayUtc && utcIso) {
    const d = new Date(utcIso);
    if (!Number.isNaN(d.getTime())) {
      return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")} UTC`;
    }
  }

  if (e?._occurrence_local_time) {
    return String(e._occurrence_local_time);
  }

  const st = String(e?.start_time || "").trim();
  const tm = st.match(/^(\d{2}):(\d{2})/);
  if (tm) {
    const d = new Date(2000, 0, 1, Number(tm[1]), Number(tm[2]), 0, 0);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  if (utcIso) {
    const d = new Date(utcIso);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
  }

  return "";
};

  const daysInMonth = useMemo(
    () => getDaysInCalendarMonth(year, month ),
    [month, year]
  );

  // Expand recurring events for the visible month (page-local stable local-date renderer)
  const expandedEvents = useMemo(() => {
  return expandMonthLocally(events as any, year, month) as any[];
}, [events, year, month]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setUserId(data?.user?.id ?? null);
    })();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("calendar.timeMode", displayUtc ? "utc" : "local");
    } catch {}
  }, [displayUtc]);

  const refetch = async () => {
    if (!upperAlliance) return;

    const { data, error } = await supabase
      .from("alliance_events")
      .select("*")
      .eq("alliance_id", upperAlliance)
      .order("start_time_utc", { ascending: true });

    if (error) {
      console.error(error);
      return;
    }

    setEvents((data || []) as any);
  };

  const loadEventTypes = async () => {
    if (!upperAlliance) return;

    try {
      const res = await supabase
        .from("alliance_event_types")
        .select("id,alliance_code,category,name")
        .eq("alliance_code", upperAlliance)
        .order("category", { ascending: true })
        .order("name", { ascending: true });

      if (res.error) throw res.error;

      const rows = (res.data || []) as EventTypeRow[];
      setEventTypes(rows);
      setTypesOk(true);

      // Seed defaults if empty AND canEdit
      if (rows.length === 0 && canEdit) {
        const seed = DEFAULT_EVENT_TYPES.map((n) => ({
          alliance_code: upperAlliance,
          category: "Alliance",
          name: n,
          created_by: userId ?? null,
        })) as any[];

        // requires unique index -> upsert is safe
        const up = await supabase
  // NOTE: Writes to alliance_event_types are disabled in Calendar. Manage types in /owner/event-types.

        if (!up.error) {
          setTypesHint("Seeded default event types ✅");
          setTimeout(() => setTypesHint(null), 1500);

          const again = await supabase
            .from("alliance_event_types")
            .select("id,alliance_code,category,name")
            .eq("alliance_code", upperAlliance)
            .order("category", { ascending: true })
            .order("name", { ascending: true });

          if (!again.error) setEventTypes((again.data || []) as any);
        }
      }
    } catch (e: any) {
      // Table missing or RLS blocking -> fallback to defaults
      console.warn("Event types catalog not available:", e?.message ?? e);
      setTypesOk(false);
      setEventTypes([]);
    }
  };

  useEffect(() => {
    refetch();
    loadEventTypes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [upperAlliance, canEdit]);

  const effectiveTypes = useMemo(() => {
    if (eventTypes.length > 0) return eventTypes;
    // fallback if table doesn't exist
    return DEFAULT_EVENT_TYPES.map((n) => ({
      id: n,
      alliance_code: upperAlliance,
      category: "Alliance",
      name: n,
    })) as EventTypeRow[];
  }, [eventTypes, upperAlliance]);

  const optionsForCategory = useMemo(() => {
    const cat = form.event_category || "Alliance";
    const list = effectiveTypes.filter((t) => String(t.category || "").toLowerCase() === String(cat).toLowerCase());
    // if State category has no items, still allow Add New
    return list;
  }, [effectiveTypes, form.event_category]);

  const upsertTypeIfNeeded = async (): Promise<string> => {
    const cat = (form.event_category || "Alliance").trim() || "Alliance";
    const selected = form.event_type;

    if (selected !== "__new__") return selected;

    const name = (form.new_event_type || "").trim();
    if (!name) throw new Error("New event type name required.");

    if (!typesOk) return name;
    if (!canEdit) return name;

    const ins = await supabase
      .from("alliance_event_types")
      .insert({
        alliance_code: upperAlliance,
        category: cat,
        name,
        created_by: userId ?? null,
      } as any)
      .select("id")
      .maybeSingle();

    if (ins.error && ins.error.code !== "23505") {
      console.warn("Could not save new event type:", ins.error);
      return name;
    }

    await loadEventTypes();
    return name;
  };

  const clearEventEditor = () => {
    setEditingEventId(null);
    setForm(makeEmptyForm());
    setShowModal(false);
  };

  const findSourceEvent = (arg: any): EventRow | null => {
    const sourceId = String(arg?._source_event_id || arg?.id || "").trim();
    if (!sourceId) return null;
    return (events.find((x: any) => String(x.id) === sourceId) as EventRow | undefined) || null;
  };

  const formatDateForMode = (d: Date, mode: "local" | "utc") => {
    if (mode === "utc") {
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
    }
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  const formatTimeForMode = (d: Date, mode: "local" | "utc") => {
    if (mode === "utc") {
      return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
    }
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  const loadEventIntoForm = (arg: any) => {
    const source = findSourceEvent(arg);
    if (!source) {
      alert("Could not load the source event for editing.");
      return;
    }

    const timeMode: "local" | "utc" =
      String(source.timezone_origin || "").toUpperCase() === "UTC" ? "utc" : "local";

    const recurrenceType = String(source.recurrence_type ?? source.recurrence ?? (source as any).frequency ?? "weekly").trim().toLowerCase().replace(/[\s_-]+/g, "") || "weekly";
    const recurrenceDays = Array.isArray(source.recurrence_days)
      ? source.recurrence_days
      : Array.isArray((source as any).days_of_week)
      ? ((source as any).days_of_week as string[])
      : [];

    let startInstant: Date | null = null;

    if (source.start_time_utc) {
      const d = new Date(String(source.start_time_utc));
      if (!Number.isNaN(d.getTime())) startInstant = d;
    }

    if (!startInstant && source.start_date && source.start_time) {
      const parsed = parseFormDateTime(String(source.start_date), String(source.start_time), timeMode);
      if (!Number.isNaN(parsed.getTime())) startInstant = parsed;
    }

    if (!startInstant) {
      alert("This event is missing a valid start time.");
      return;
    }

    const endInstant = new Date(
      startInstant.getTime() + Math.max(1, Number(source.duration_minutes || 60)) * 60000
    );

    setEditingEventId(String(source.id));
    setForm({
      title: String(source.title || source.event_name || ""),
      event_category: String(source.event_category || "Alliance") || "Alliance",
      event_type: String(source.event_type || "Reminder") || "Reminder",
      new_event_type: "",
      start_date: formatDateForMode(startInstant, timeMode),
      start_time: formatTimeForMode(startInstant, timeMode),
      end_date: formatDateForMode(endInstant, timeMode),
      end_time: formatTimeForMode(endInstant, timeMode),
      recurring_enabled: !!source.recurring_enabled && !!String(source.recurrence_type ?? source.recurrence ?? (source as any).frequency ?? "").trim(),
      recurrence_type: recurrenceType && recurrenceType !== "none" ? recurrenceType : "weekly",
      recurrence_days: recurrenceDays,
      recurrence_end_date: String(source.recurrence_end_date || ""),
      time_mode: timeMode,
    });
    setShowModal(true);
  };

  const openEventActions = (arg: any) => {
    const source = findSourceEvent(arg) || (arg as EventRow);
    const recurring = isRecurringEvent(source);

    const choice = window.prompt(
      recurring
        ? "Recurring event:`n`n1 = Edit ENTIRE SERIES`n2 = Delete`n`nEnter 1 or 2"
        : "Event:`n`n1 = Edit`n2 = Delete`n`nEnter 1 or 2",
      "1"
    );

    if (!choice) return;
    const v = String(choice).trim();

    if (v === "1") {
      loadEventIntoForm(source);
      return;
    }

    if (v === "2") {
      void deleteEvent(arg);
      return;
    }

    alert("Invalid choice. Enter 1 or 2.");
  };

  const saveEvent = async () => {
    if (!canEdit) return;

    const cleanTitle = form.title.trim();

    
    let eventType = form.event_type;

    if (eventType === "__new__") {
      const n = String((form as any).new_event_type ?? "").trim();
      if (!n) return alert("Enter a new event type name.");
      eventType = n;
    }if (!cleanTitle) return alert("Event Title required.");
    if (!userId) return alert("No user session.");

    const startInstant = parseFormDateTime(form.start_date, form.start_time, form.time_mode as any);
    const endInstant = parseFormDateTime(form.end_date, form.end_time, form.time_mode as any);

    if (Number.isNaN(startInstant.getTime()) || Number.isNaN(endInstant.getTime()))
      return alert("Start/End date & time required.");

    if (endInstant <= startInstant) return alert("End must be after start.");

    const storageStart = new Date(startInstant.getTime());
    const storageEnd = new Date(endInstant.getTime());

    const durationMinutes = Math.max(
      1,
      Math.round((endInstant.getTime() - startInstant.getTime()) / 60000)
    );

    const chosenType = await upsertTypeIfNeeded();
    const chosenCategory = (form.event_category || "Alliance").trim() || "Alliance";

    const rawRecurrenceType = String(form.recurrence_type || "").trim().toLowerCase().replace(/[\s_-]+/g, "");

    const normalizedRecurrenceType = rawRecurrenceType === "day" ? "daily" : rawRecurrenceType === "week" ? "weekly" : rawRecurrenceType === "month" ? "monthly" : rawRecurrenceType;

    const normalizedRecurrenceDays =
      form.recurring_enabled &&
      (normalizedRecurrenceType === "weekly" || normalizedRecurrenceType === "biweekly")
        ? (
            Array.isArray(form.recurrence_days) && form.recurrence_days.length
              ? form.recurrence_days
              : [weekdayNameFromLocalIsoDate(form.start_date)]
          )
        : [];

    const basePayload: any = {
      alliance_id: upperAlliance,

      title: cleanTitle,
      start_time_utc: startInstant.toISOString(),
      duration_minutes: durationMinutes,
      timezone_origin: form.time_mode === "utc" ? "UTC" : (Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"),

      event_category: chosenCategory,
      event_type: chosenType,

      event_name: cleanTitle,
      start_date: toLocalISODate(storageStart),
      start_time: hhmmss(storageStart),
      end_date: toLocalISODate(storageEnd),
      end_time: hhmmss(storageEnd),

      recurring_enabled: !!form.recurring_enabled && !!normalizedRecurrenceType,
      recurrence_type: !!form.recurring_enabled ? normalizedRecurrenceType : null,
      recurrence_days:
        !!form.recurring_enabled && (normalizedRecurrenceType === "weekly" || normalizedRecurrenceType === "biweekly")
          ? normalizedRecurrenceDays
          : [],
      recurrence_end_date: !!form.recurring_enabled ? (form.recurrence_end_date || null) : null,
    };

    const writePayloadBase: any = editingEventId
      ? basePayload
      : { ...basePayload, created_by: userId };

    const wantRecurring = !!form.recurring_enabled && normalizedRecurrenceType !== "none";

    const payloadA = {
      ...writePayloadBase,
      ...(wantRecurring
        ? {
            recurring_enabled: true,
            recurrence_type: normalizedRecurrenceType,
            recurrence_days:
              normalizedRecurrenceType === "weekly" || normalizedRecurrenceType === "biweekly"
                ? normalizedRecurrenceDays
                : [],
            recurrence_end_date: form.recurrence_end_date || null,
          }
        : {
            recurring_enabled: false,
            recurrence_type: null,
            recurrence_days: [],
            recurrence_end_date: null,
          }),
    };

    const resA = editingEventId
      ? await supabase.from("alliance_events").update(payloadA).eq("id", editingEventId)
      : await supabase.from("alliance_events").insert(payloadA).select("id").single();

    if (resA.error) {
      const msg = (resA.error.message || "").toLowerCase();

      // If event_category column isn't present, retry without it (safety)
      const missingEventCategory = msg.includes("column") && msg.includes("event_category");

      // If recurrence columns missing, fallback to legacy recurrence fields
      const missingRecCols =
        msg.includes("column") &&
        (msg.includes("recurrence_type") || msg.includes("recurrence_days"));

      if (missingEventCategory) {
        const payloadNoCat = { ...payloadA };
        delete payloadNoCat.event_category;
        const retry = editingEventId
          ? await supabase.from("alliance_events").update(payloadNoCat).eq("id", editingEventId)
          : await supabase.from("alliance_events").insert(payloadNoCat).select("id").single();
        if (retry.error) {
          console.error(retry.error);
          alert(retry.error.message);
          return;
        }
      } else if (missingRecCols) {
        const payloadB = {
          ...writePayloadBase,
          ...(wantRecurring
            ? { recurrence: normalizedRecurrenceType, days_of_week: normalizedRecurrenceDays }
            : { recurrence: null, days_of_week: null }),
        };
        const resB = editingEventId
          ? await supabase.from("alliance_events").update(payloadB).eq("id", editingEventId)
          : await supabase.from("alliance_events").insert(payloadB).select("id").single();
        if (resB.error) {
          console.error(resB.error);
          alert(resB.error.message);
          return;
        }
      } else {
        console.error(resA.error);
        alert(resA.error.message);
        return;
      }
    }

    clearEventEditor();
    await refetch();
  };

    const pad2 = (n: number) => String(n).padStart(2, "0");
  const toLocalIsoFromUtc = (utcString: string) => {
    try {
      const d = new Date(String(utcString || ""));
      return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
    } catch {
      return "";
    }
  };
const prevIsoDay = (iso: string) => {
  const m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return "";

  const y = Number(m[1]);
  const mo = Number(m[2]);
  const da = Number(m[3]);

  const d = new Date(y, mo - 1, da, 12, 0, 0, 0);
  d.setDate(d.getDate() - 1);

  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
};

const tryTruncateSeries = async (eventId: string, occurrenceIso: string) => {
  const prev = prevIsoDay(occurrenceIso);
  if (!prev) throw new Error("Could not compute previous day for truncation.");

  const attempts: any[] = [
    { recurrence_end_date: prev },
    { recurrence_until: prev },
    { until_date: prev },
    { recurrence_end: prev },
  ];

  let lastErr: any = null;

  for (const patch of attempts) {
    const up = await supabase.from("alliance_events").update(patch as any).eq("id", eventId);
    if (!up.error) return;

    lastErr = up.error;
    const msg = String(up.error.message || "").toLowerCase();

    if (msg.includes("column") && (msg.includes("does not exist") || msg.includes("schema cache") || msg.includes("unknown"))) {
      continue;
    }
  }

  throw lastErr || new Error("Could not truncate recurring series.");
};

const isRecurringEvent = (e: any) => {
  const rt = String(e?.recurrence_type ?? e?.recurrence ?? e?.frequency ?? "").trim().toLowerCase().replace(/[\s_-]+/g, "");
  if (rt && rt !== "none" && rt !== "single") return true;
  if (Array.isArray(e?.recurrence_days) && e.recurrence_days.length) return true;
  if (Array.isArray(e?.days_of_week) && e.days_of_week.length) return true;
  const interval = Number(e?.recurrence_interval ?? e?.interval ?? 0);
  if (Number.isFinite(interval) && interval > 0) return true;
  return false;
};

const trySkipOccurrence = async (eventId: string, occurrenceIso: string, sourceEvent?: any) => {
  const source = sourceEvent || events.find((x: any) => String(x.id) === String(eventId));
  if (!source) throw new Error("Could not locate source recurring event.");

  const baseTime = String(source?.start_time || "00:00").trim();
  const hm = baseTime.match(/^(\d{2}):(\d{2})/);
  const hh = hm ? Number(hm[1]) : 0;
  const mm = hm ? Number(hm[2]) : 0;

  const findNextOccurrenceIso = () => {
    const start = parseISODateLocal(String(occurrenceIso || ""));
    for (let offset = 1; offset <= 370; offset++) {
      const probe = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 12, 0, 0, 0);
      probe.setDate(probe.getDate() + offset);

      const probeIso = toLocalISODate(probe);
      const expanded = expandMonthLocally([source] as any, probe.getFullYear(), probe.getMonth()) as any[];

      const hit = expanded.find((row: any) => String(row?._occurrence_local_date || "") === probeIso);
      if (hit) return probeIso;
    }
    return null;
  };

  const nextIso = findNextOccurrenceIso();

  // No later occurrence: truncating the series is enough
  if (!nextIso) {
    await tryTruncateSeries(eventId, occurrenceIso);
    return;
  }

  const nextStart = parseISODateLocal(nextIso);
  nextStart.setHours(hh, mm, 0, 0);

  const duration = Math.max(1, Number(source?.duration_minutes || 60));
  const nextEnd = new Date(nextStart.getTime() + duration * 60000);

  const recurrenceDays = Array.isArray(source?.recurrence_days)
    ? source.recurrence_days
    : Array.isArray(source?.days_of_week)
    ? source.days_of_week
    : null;

  const payload: any = {
    alliance_id: source?.alliance_id,
    title: String(source?.title || source?.event_name || "").trim(),
    event_name: source?.event_name || source?.title || null,
    created_by: userId || source?.created_by || null,
    start_date: nextIso,
    start_time: baseTime,
    end_date: toLocalISODate(nextEnd),
    end_time: `${String(nextEnd.getHours()).padStart(2, "0")}:${String(nextEnd.getMinutes()).padStart(2, "0")}:00`,
    start_time_utc: nextStart.toISOString(),
    duration_minutes: duration,
    timezone_origin: source?.timezone_origin || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    recurring_enabled: !!source?.recurring_enabled,
    recurrence_type: source?.recurrence_type || source?.recurrence || null,
    recurrence_days: recurrenceDays,
    recurrence_end_date: source?.recurrence_end_date || null,
    event_type: source?.event_type || null,
    event_category: source?.event_category || null,
  };

  const ins = await supabase.from("alliance_events").insert(payload as any).select("id").single();
  if (ins.error) throw ins.error;

  try {
    await tryTruncateSeries(eventId, occurrenceIso);
  } catch (err) {
    await supabase.from("alliance_events").delete().eq("id", String(ins.data?.id || ""));
    throw err;
  }
};

const deleteEvent = async (arg: any) => {
    if (!canEdit) return;

    const id = typeof arg === "string" ? arg : getDeleteId(arg);
    const e = typeof arg === "string" ? { id } : arg;

    if (!id) return;

    const recurring = isRecurringEvent(e);
    const utc = String(getEventStartUtc(e) || "");
    const occurrenceIso = String((e as any)?._occurrence_local_date || (utc ? toLocalIsoFromUtc(utc) : ""));

    // Non-recurring: keep old behavior
    if (!recurring || !occurrenceIso) {
      if (!confirm("Delete this event?")) return;
      await supabase.from("alliance_events").delete().eq("id", id);
      await refetch();
      return;
    }

    const choice = window.prompt(
      "Recurring event delete:\n\n1 = Delete THIS occurrence only\n2 = Delete THIS and ALL FUTURE\n3 = Delete ENTIRE SERIES\n\nEnter 1 / 2 / 3",
      "1"
    );

    if (!choice) return;
    const v = String(choice).trim();

    try {
      if (v === "3") {
        if (!confirm("Delete ENTIRE series?")) return;
        await supabase.from("alliance_events").delete().eq("id", id);
      } else if (v === "2") {
        if (!confirm("Delete this occurrence and ALL FUTURE occurrences?")) return;
        await tryTruncateSeries(id, occurrenceIso);
      } else {
        if (!confirm("Delete THIS occurrence only?")) return;
        await trySkipOccurrence(id, occurrenceIso, e);
      }
    } catch (err: any) {
      alert(String(err?.message || err || "Delete failed"));
    }

    await refetch();
  };

  const monthLabel = useMemo(() => {
    return new Date(year, month).toLocaleString(undefined, {
      month: "long",
      year: "numeric",
    });
  }, [month, year]);

  // Calendar day match using local occurrence dates
  const isSameDay = (e: any, y: number, m: number, d: number) => {
  const want = `${y}-${pad2(m + 1)}-${pad2(d)}`;
  return occurrenceLocalDate(e) === want;
};

  const selectedDayEvents = useMemo(() => {
    if (!selectedDay) return [];
    return expandedEvents.filter((e: any) => isSameDay(e, year, month, selectedDay));
  }, [expandedEvents, selectedDay, year, month]);

  // Manager tools: delete type
  const deleteType = async (id: string) => {
    if (!canEdit) return;
    if (!typesOk) return alert("Event type catalog is not available.");
    if (!confirm("Delete this event type?")) return;

    const del = await supabase.from("alliance_event_types").delete().eq("id", id);
    if (del.error) {
      alert(del.error.message);
      return;
    }

    await loadEventTypes();
  };

  return (
    <div style={{ padding: 24 }}>
      <h2>📅 Alliance Calendar - {upperAlliance}</h2>

      {canEdit && (
        <button onClick={() => { setEditingEventId(null); setForm(makeEmptyForm()); setShowModal(true); }}>
          + Create Event
        </button>
      )}

      {typesHint ? <div style={{ marginTop: 10, opacity: 0.85 }}>{typesHint}</div> : null}

      <div
  style={{
    marginTop: 20,
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
    alignItems: "center",
  }}
>
  <strong>{monthLabel}</strong>

  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
    <div style={{ fontSize: 12, opacity: 0.82 }}>Show all event times as:</div>

    <button
      type="button"
      onClick={() => setDisplayUtc(false)}
      style={{
        padding: "6px 10px",
        borderRadius: 10,
        border: !displayUtc ? "1px solid rgba(120,255,120,0.35)" : "1px solid #333",
        background: !displayUtc ? "rgba(120,255,120,0.10)" : "rgba(255,255,255,0.03)",
      }}
    >
      Local
    </button>

    <button
      type="button"
      onClick={() => setDisplayUtc(true)}
      style={{
        padding: "6px 10px",
        borderRadius: 10,
        border: displayUtc ? "1px solid rgba(120,180,255,0.35)" : "1px solid #333",
        background: displayUtc ? "rgba(120,180,255,0.12)" : "rgba(255,255,255,0.03)",
      }}
    >
      Puzzle & Survival UTC
    </button>
  </div>
</div>

<div style={{ marginTop: 8, fontSize: 12, opacity: 0.72 }}>
  This changes display/export only. Saved events stay unchanged.
</div>

      <div
        style={{
          marginTop: 20,
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 10,
        }}
      >
{CALENDAR_WEEKDAYS.map((label) => (
  <div
    key={"weekday-" + label}
    style={{
      fontWeight: 900,
      opacity: 0.82,
      padding: "8px 6px",
      textAlign: "center",
      borderBottom: "1px solid rgba(255,255,255,0.10)"
    }}
  >
    {label}
  </div>
))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;

          const dayEvents = expandedEvents.filter((e: any) => isSameDay(e, year, month, day));

          return (
            <div
              key={day}
              onClick={() => setSelectedDay(day)}
              style={{
                border: "1px solid #444",
                borderRadius: 8,
                padding: 10,
                minHeight: 100,
                outline: selectedDay === day ? "2px solid #666" : "none",
              }}
            >
              <strong>{day}</strong>

              {dayEvents.map((e: any) => (
                <div
                  key={e.instance_id ?? e.id}
                  style={{
                    marginTop: 6,
                    fontSize: 12,
                    cursor: canEdit ? "pointer" : "default",
                  }}
                  onClick={(evt) => {
                    evt.stopPropagation();
                    if (canEdit) openEventActions(e);
                  }}
                  title={canEdit ? "Click to edit or delete" : undefined}
                >
                  {formatEventTimeLabel(e)}{" "}
                  - {e.title}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Optional Agenda List */}
      {selectedDay && (
        <div style={{ marginTop: 18 }}>
          <h3 style={{ marginBottom: 8 }}>
            🧟 Agenda - {new Date(year, month, selectedDay).toLocaleDateString()}
          </h3>

          {selectedDayEvents.length === 0 ? (
            <div style={{ opacity: 0.75 }}>No events.</div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {selectedDayEvents
                .slice()
                .sort((a: any, b: any) => new Date(String(getEventStartUtc(a) || "")).getTime() - new Date(String(getEventStartUtc(b) || "")).getTime())
                .map((e: any) => (
                  <div
                    key={`agenda__${e.instance_id ?? e.id}`}
                    style={{ border: "1px solid #333", borderRadius: 8, padding: 10 }}
                  >
                    <div style={{ fontWeight: 700 }}>
                      {formatEventTimeLabel(e)}{" "}
                      - {e.title}
                    </div>
                    {e.event_category ? <div style={{ opacity: 0.9, fontSize: 12 }}>{String(e.event_category)}</div> : null}
                    {e.event_type ? <div style={{ opacity: 0.85, fontSize: 12 }}>{String(e.event_type)}</div> : null}
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Manager: View/delete event types */}
      {canEdit ? (
        <div style={{ marginTop: 22, borderTop: "1px solid #333", paddingTop: 14 }}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>⚙️ Event Types (per alliance)</div>
          {!typesOk ? (
            <div style={{ opacity: 0.8 }}>
              Event type catalog table not available yet. Calendar will still work with defaults.
              Run migrations + deploy to enable custom types.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {["Alliance","State"].map((cat) => (
                <div key={cat} style={{ border: "1px solid #333", borderRadius: 10, padding: 10 }}>
                  <div style={{ fontWeight: 800, marginBottom: 8 }}>
                    {cat === "Alliance" ? "Alliance Event Types" : "State Event Types"}
                  </div>
                  <div style={{ display: "grid", gap: 6 }}>
                    {eventTypes.filter((t) => String(t.category).toLowerCase() === cat.toLowerCase()).length === 0 ? (
                      <div style={{ opacity: 0.75 }}>None yet. Add from the Create Event modal (+ Add new type...).</div>
                    ) : (
                      eventTypes
                        .filter((t) => String(t.category).toLowerCase() === cat.toLowerCase())
                        .map((t) => (
                          <div key={t.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                            <div style={{ opacity: 0.95 }}>{t.name}</div>
                            <button onClick={() => deleteType(t.id)} style={{ padding: "6px 10px", borderRadius: 10 }}>
                              Delete
                            </button>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {showModal && (
        <div style={{ marginTop: 20 }}>
          <h3>{editingEventId ? "Edit Event" : "Create Event"}</h3>

          <input
            placeholder="Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />

          <div style={{ marginTop: 10, display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span>Category</span>
              <select
                value={form.event_category}
                onChange={(e) => setForm({ ...form, event_category: e.target.value })}
              >
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span>Event Type</span>
              <select
                value={form.event_type}
                onChange={(e) => setForm({ ...form, event_type: e.target.value })}
              >
                {(optionsForCategory.length ? optionsForCategory.map((t) => t.name) : EVENT_TYPES).map((t) => (
  <option key={t} value={t}>{t}</option>
))}
                <option value="__new__">+ New (custom)</option>
              </select>
            </label>
          </div>

          {form.event_type === "__new__" ? (
            <div style={{ marginTop: 10 }}>
              <input
                placeholder="New event type name (ex: Hunt Mastery)"
                value={form.new_event_type}
                onChange={(e) => setForm({ ...form, new_event_type: e.target.value })}
              />
              <div style={{ marginTop: 6, fontSize: 12, opacity: 0.8 }}>
                When you save, this will be added to the dropdown for {upperAlliance}.
              </div>
            </div>
          ) : null}

          <div style={{ marginTop: 12, marginBottom: 10, display: "grid", gap: 6 }}>
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={form.time_mode === "utc"}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    time_mode: e.target.checked ? "utc" : "local",
                  }))
                }
              />
              <span>Puzzle & Survival UTC input</span>
            </label>
            <div style={{ fontSize: 12, opacity: 0.78 }}>
              {form.time_mode === "utc"
                ? "Dates/times entered here are treated as UTC and converted safely for the calendar."
                : "Dates/times entered here are treated as your local time."}
            </div>
          </div>

          <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
            <input
              type="date"
              value={form.start_date}
              onChange={(e) => setForm({ ...form, start_date: e.target.value })}
            />
            <input
              type="time"
              value={form.start_time}
              onChange={(e) => setForm({ ...form, start_time: e.target.value })}
            />
            <input
              type="date"
              value={form.end_date}
              onChange={(e) => setForm({ ...form, end_date: e.target.value })}
            />
            <input
              type="time"
              value={form.end_time}
              onChange={(e) => setForm({ ...form, end_time: e.target.value })}
            />
          </div>

          <RecurringControls
            enabled={form.recurring_enabled}
            onEnabledChange={(v) => setForm((prev) => ({ ...prev, recurring_enabled: v }))}
            recurrenceType={form.recurrence_type as any}
            onRecurrenceTypeChange={(v) => setForm((prev) => ({ ...prev, recurrence_type: v as any }))}
            daysOfWeek={form.recurrence_days}
            onDaysOfWeekChange={(v) => setForm((prev) => ({ ...prev, recurrence_days: v }))}
            endDate={form.recurrence_end_date}
            onEndDateChange={(v) => setForm((prev) => ({ ...prev, recurrence_end_date: v }))}
          />

          <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
            <button onClick={saveEvent}>{editingEventId ? "Save Changes" : "Save"}</button>
            <button onClick={clearEventEditor}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}





































