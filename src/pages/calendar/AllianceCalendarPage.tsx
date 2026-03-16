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
    const recurrenceType = String(ev.recurrence_type || ev.recurrence || "").toLowerCase();
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

    const maxDay = new Date(year, month + 1, 0).getDate();

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

const CAL_LOCAL_DAY_MAP_2: Record<string, number> = {
  sun: 0, sunday: 0,
  mon: 1, monday: 1,
  tue: 2, tues: 2, tuesday: 2,
  wed: 3, wednesday: 3,
  thu: 4, thur: 4, thurs: 4, thursday: 4,
  fri: 5, friday: 5,
  sat: 6, saturday: 6,
};

function calLocalDayNum2(v: string): number | null {
  const k = String(v || "").trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(CAL_LOCAL_DAY_MAP_2, k) ? CAL_LOCAL_DAY_MAP_2[k] : null;
}

function calParseBaseLocal2(ev: any): Date | null {
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

function calLocalWeekStart2(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - d.getDay(), 0, 0, 0, 0);
}

function calParseEndLocal2(v: any): Date | null {
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

function calOccurrenceTimeLabel2(ev: any) {
  if (ev?._occurrence_local_time) return String(ev._occurrence_local_time);

  const d = calParseBaseLocal2(ev);
  if (!d) return "";

  return d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function calOccurrenceLocalDate2(ev: any) {
  if (ev?._occurrence_local_date) return String(ev._occurrence_local_date);

  const d = calParseBaseLocal2(ev);
  if (!d) return "";

  return toLocalISODate(d);
}

function expandEventsForMonthCalendarLocal2(rows: EventRow[], year: number, month: number): CalendarLocalExpandedEvent[] {
  const out: CalendarLocalExpandedEvent[] = [];
  const monthStart = new Date(year, month, 1, 0, 0, 0, 0);
  const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);
  const maxDay = new Date(year, month + 1, 0).getDate();

  for (const ev of rows) {
    const baseLocal = calParseBaseLocal2(ev);
    if (!baseLocal) continue;

    const baseUtc = String(ev.start_time_utc || baseLocal.toISOString());
    const baseLocalDate = toLocalISODate(baseLocal);
    const baseLocalTime = baseLocal.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    out.push({
      ...(ev as any),
      start_time_utc: baseUtc,
      _source_event_id: String(ev.id),
      _occurrence_time_utc: baseUtc,
      _occurrence_local_date: baseLocalDate,
      _occurrence_local_time: baseLocalTime,
    });

    const rtype = String(ev.recurrence_type || ev.recurrence || "").toLowerCase();
    const recurring = !!ev.recurring_enabled && !!rtype;
    if (!recurring) continue;

    const endLocal = calParseEndLocal2(ev.recurrence_end_date);

    const rawDays = Array.isArray(ev.recurrence_days)
      ? ev.recurrence_days
      : Array.isArray((ev as any).days_of_week)
      ? (ev as any).days_of_week
      : [];

    const parsedDays = rawDays
      .map((x: any) => calLocalDayNum2(String(x)))
      .filter((x: number | null): x is number => x !== null);

    const allowedDays =
      (rtype === "weekly" || rtype === "biweekly")
        ? (parsedDays.length ? parsedDays : [baseLocal.getDay()])
        : [];

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
      if (endLocal && candLocal > endLocal) continue;

      if (rtype === "daily") {
        // ok
      } else if (rtype === "weekly") {
        if (!allowedDays.includes(candLocal.getDay())) continue;
      } else if (rtype === "biweekly") {
        if (!allowedDays.includes(candLocal.getDay())) continue;

        const baseWeek = calLocalWeekStart2(baseLocal).getTime();
        const candWeek = calLocalWeekStart2(candLocal).getTime();
        const weeksDiff = Math.floor((candWeek - baseWeek) / (7 * 24 * 60 * 60 * 1000));
        if (weeksDiff % 2 !== 0) continue;
      } else if (rtype === "monthly") {
        if (candLocal.getDate() !== baseLocal.getDate()) continue;
      } else {
        continue;
      }

      const candLocalDate = toLocalISODate(candLocal);
      const candLocalTime = candLocal.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      const candUtc = candLocal.toISOString();

      if (candLocalDate === baseLocalDate && candLocalTime === baseLocalTime) continue;

      out.push({
        ...(ev as any),
        start_time_utc: candUtc,
        _source_event_id: String(ev.id),
        _occurrence_time_utc: candUtc,
        _occurrence_local_date: candLocalDate,
        _occurrence_local_time: candLocalTime,
      });
    }
  }

  return out;
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

  const makeEmptyForm = () => ({
    title: "",
    event_category: "Alliance",         // Alliance | State
    event_type: "Reminder",             // from dropdown or "__new__"
    new_event_type: "",                 // when "__new__"
    start_date: "",
    start_time: "",
    end_date: "",
    end_time: "",
    recurring_enabled: false,
    recurrence_type: "weekly",
    recurrence_days: [] as string[],
    recurrence_end_date: "",
  });

  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [form, setForm] = useState(makeEmptyForm());

  const today = new Date();
  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear] = useState(today.getFullYear());

  const daysInMonth = useMemo(
    () => new Date(year, month + 1, 0).getDate(),
    [month, year]
  );

  // Expand recurring events for the visible month (page-local stable local-date renderer)
  const expandedEvents = useMemo(() => {
    return expandEventsForMonthStable(events as any, year, month) as any[];
  }, [events, year, month]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setUserId(data?.user?.id ?? null);
    })();
  }, []);

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

    // if no table, just return the text (still works)
    if (!typesOk) return name;

    // Only managers can write; respect canEdit
    if (!canEdit && !isOwner) return name;

    const payload: any = {
      alliance_code: upperAlliance,
      category: cat,
      name,
      created_by: userId ?? null,
      updated_at: new Date().toISOString(),
    };

    const res = await supabase
  // NOTE: Writes to alliance_event_types are disabled in Calendar. Manage types in /owner/event-types.

    if (res.error) {
      // fallback: still allow event to save with the raw name
      console.warn("Could not save new event type:", res.error);
      return name;
    }

    // refresh list
    await loadEventTypes();
    return name;
  };

  const saveEvent = async () => {
    if (!canEdit) return;

    const cleanTitle = form.title.trim();

    
    let eventType = form.event_type;

    if (eventType === "__new__") {
      const n = String((form as any).new_event_type ?? "").trim();
      if (!n) return alert("Enter a new event type name.");
      eventType = n;

      // Best-effort: save event type (do NOT crash if DB rejects)
      try {
        await supabase
  // NOTE: Writes to alliance_event_types are disabled in Calendar. Manage types in /owner/event-types.
        await loadEventTypes();
      } catch (e) {
        console.warn("Event type save failed (continuing):", e);
      }
    }if (!cleanTitle) return alert("Event Title required.");
    if (!userId) return alert("No user session.");

    const startLocal = new Date(`${form.start_date}T${form.start_time}`);
    const endLocal = new Date(`${form.end_date}T${form.end_time}`);

    if (Number.isNaN(startLocal.getTime()) || Number.isNaN(endLocal.getTime()))
      return alert("Start/End date & time required.");

    if (endLocal <= startLocal) return alert("End must be after start.");

    const durationMinutes = Math.max(
      1,
      Math.round((endLocal.getTime() - startLocal.getTime()) / 60000)
    );

    const chosenType = await upsertTypeIfNeeded();
    const chosenCategory = (form.event_category || "Alliance").trim() || "Alliance";

    const normalizedRecurrenceDays =
      form.recurring_enabled &&
      (form.recurrence_type === "weekly" || form.recurrence_type === "biweekly")
        ? (
            Array.isArray(form.recurrence_days) && form.recurrence_days.length
              ? form.recurrence_days
              : [weekdayNameFromLocalIsoDate(form.start_date)]
          )
        : form.recurrence_days;

    const basePayload: any = {
      alliance_id: upperAlliance,

      title: cleanTitle,
      created_by: userId,
      start_time_utc: startLocal.toISOString(),
      duration_minutes: durationMinutes,
      timezone_origin: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",

      event_category: chosenCategory,
      event_type: chosenType,

      event_name: cleanTitle,
      start_date: form.start_date,
      start_time: form.start_time,
      end_date: form.end_date,
      end_time: form.end_time,

      recurring_enabled: form.recurring_enabled,
      recurrence_type: form.recurrence_type || null,
      recurrence_days: normalizedRecurrenceDays,
      recurrence_end_date: form.recurrence_end_date || null,
    };

    const wantRecurring = form.recurring_enabled && form.recurrence_type !== "none";

    const payloadA = {
      ...basePayload,
      ...(wantRecurring
        ? { recurrence_type: form.recurrence_type, recurrence_days: normalizedRecurrenceDays }
        : { recurrence_type: null, recurrence_days: null }),
    };

    const resA = await supabase.from("alliance_events").insert(payloadA).select("id").single();

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
        const retry = await supabase.from("alliance_events").insert(payloadNoCat).select("id").single();
        if (retry.error) {
          console.error(retry.error);
          alert(retry.error.message);
          return;
        }
      } else if (missingRecCols) {
        const payloadB = {
          ...basePayload,
          ...(wantRecurring
            ? { recurrence: form.recurrence_type, days_of_week: normalizedRecurrenceDays }
            : { recurrence: null, days_of_week: null }),
        };
        const resB = await supabase.from("alliance_events").insert(payloadB).select("id").single();
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

    setShowModal(false);
    setForm(makeEmptyForm());
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
    const y = Number(m[1]); const mo = Number(m[2]); const da = Number(m[3]);
    const d = new Date(y, mo - 1, da);
    d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  };
  const isRecurringEvent = (e: any) => {
    const rt = String(e?.recurrence_type ?? e?.frequency ?? "").toLowerCase();
    if (rt && rt !== "none" && rt !== "single") return true;
    if (Array.isArray(e?.recurrence_days) && e.recurrence_days.length) return true;
    if (Array.isArray(e?.daysOfWeek) && e.daysOfWeek.length) return true;
    const interval = Number(e?.recurrence_interval ?? e?.interval ?? 0);
    if (Number.isFinite(interval) && interval > 0) return true;
    return false;
  };

  const toLocalHHmm = (d: Date) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;

const findNextOccurrenceUtc = (sourceEvent: any, afterUtc: string): string | null => {
  const afterMs = new Date(afterUtc).getTime();
  if (!Number.isFinite(afterMs)) return null;

  for (let offset = 0; offset < 36; offset++) {
    const probeMonth = month + offset;
    const probeYear = year + Math.floor(probeMonth / 12);
    const normalizedMonth = ((probeMonth % 12) + 12) % 12;

    const expanded = expandEventsForMonth([sourceEvent], probeYear, normalizedMonth) as any[];

    const candidates = expanded
      .map((x) => String((x as any)._occurrence_time_utc || getEventStartUtc(x) || ""))
      .filter(Boolean)
      .map((iso) => ({ iso, ms: new Date(iso).getTime() }))
      .filter((x) => Number.isFinite(x.ms) && x.ms > afterMs)
      .sort((a, b) => a.ms - b.ms);

    if (candidates.length) return candidates[0].iso;
  }

  return null;
};

const insertClonedSeries = async (sourceEvent: any, nextUtc: string): Promise<string | null> => {
  const nextStart = new Date(nextUtc);
  const duration = Math.max(1, Number(sourceEvent?.duration_minutes || 60));
  const nextEnd = new Date(nextStart.getTime() + duration * 60000);

  const recurrenceDays = Array.isArray(sourceEvent?.recurrence_days)
    ? sourceEvent.recurrence_days
    : Array.isArray(sourceEvent?.days_of_week)
    ? sourceEvent.days_of_week
    : null;

  const basePayload: any = {
    alliance_id: sourceEvent?.alliance_id || upperAlliance,
    title: String(sourceEvent?.title || sourceEvent?.event_name || "").trim(),
    created_by: userId || sourceEvent?.created_by || null,
    start_time_utc: nextUtc,
    duration_minutes: duration,
    timezone_origin: sourceEvent?.timezone_origin || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",

    event_category: sourceEvent?.event_category || null,
    event_type: sourceEvent?.event_type || null,

    event_name: sourceEvent?.event_name || sourceEvent?.title || null,
    start_date: toLocalISODate(nextStart),
    start_time: toLocalHHmm(nextStart),
    end_date: toLocalISODate(nextEnd),
    end_time: toLocalHHmm(nextEnd),

    recurring_enabled: !!sourceEvent?.recurring_enabled,
    recurrence_type: sourceEvent?.recurrence_type || sourceEvent?.recurrence || null,
    recurrence_days: recurrenceDays,
    recurrence_end_date: sourceEvent?.recurrence_end_date || null,
  };

  const resA = await supabase.from("alliance_events").insert(basePayload).select("id").single();

  if (!resA.error) return String(resA.data?.id || "");

  const msg = String(resA.error.message || "").toLowerCase();
  const missingEventCategory = msg.includes("column") && msg.includes("event_category");
  const missingRecCols =
    msg.includes("column") &&
    (msg.includes("recurrence_type") || msg.includes("recurrence_days"));

  if (missingEventCategory) {
    const payloadNoCat = { ...basePayload };
    delete payloadNoCat.event_category;

    const retry = await supabase.from("alliance_events").insert(payloadNoCat).select("id").single();
    if (retry.error) throw retry.error;
    return String(retry.data?.id || "");
  }

  if (missingRecCols) {
    const payloadLegacy = {
      ...basePayload,
      recurrence: basePayload.recurrence_type,
      days_of_week: basePayload.recurrence_days,
    };

    delete payloadLegacy.recurrence_type;
    delete payloadLegacy.recurrence_days;

    const retry = await supabase.from("alliance_events").insert(payloadLegacy).select("id").single();
    if (retry.error) throw retry.error;
    return String(retry.data?.id || "");
  }

  throw resA.error;
};

const trySkipOccurrence = async (eventId: string, occurrenceIso: string, sourceEvent?: any) => {
  const source = sourceEvent || events.find((x: any) => String(x.id) === String(eventId));
  if (!source) throw new Error("Could not locate source recurring event.");

  const occurrenceUtc = String((source as any)._occurrence_time_utc || getEventStartUtc(source) || "");
  if (!occurrenceUtc) throw new Error("Could not locate occurrence start time.");

  const nextUtc = findNextOccurrenceUtc(source, occurrenceUtc);

  // If no later occurrence exists, deleting this one is just truncating the series
  if (!nextUtc) {
    await tryTruncateSeries(eventId, occurrenceIso);
    return;
  }

  const cloneId = await insertClonedSeries(source, nextUtc);

  try {
    await tryTruncateSeries(eventId, occurrenceIso);
  } catch (err) {
    if (cloneId) {
      await supabase.from("alliance_events").delete().eq("id", cloneId);
    }
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
    return calOccurrenceLocalDate2(e) === want;
  };

  const selectedDayEvents = useMemo(() => {
    if (!selectedDay) return [];
    return expandedEvents.filter((e: any) => isSameDay(e, year, month, selectedDay));
  }, [expandedEvents, selectedDay, year, month]);

  // Manager tools: delete type
  const deleteType = async (id: string) => {
    if (!canEdit) return;
    if (!typesOk) return alert("Event type catalog is not available (fallback mode).");
    if (!confirm("Delete this event type?")) return;

  // NOTE: Writes to alliance_event_types are disabled in Calendar. Manage types in /owner/event-types.

    await loadEventTypes();
  };

  return (
    <div style={{ padding: 24 }}>
      <h2>📅 Alliance Calendar - {upperAlliance}</h2>

      {canEdit && (
        <button onClick={() => { setForm(makeEmptyForm()); setShowModal(true); }}>
          + Create Event
        </button>
      )}

      {typesHint ? <div style={{ marginTop: 10, opacity: 0.85 }}>{typesHint}</div> : null}

      <div style={{ marginTop: 20 }}>
        <strong>{monthLabel}</strong>
      </div>

      <div
        style={{
          marginTop: 20,
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 10,
        }}
      >
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
                    if (canEdit) deleteEvent(e);
                  }}
                  title={canEdit ? "Click to delete" : undefined}
                >
                  {calOccurrenceTimeLabel2(e)}{" "}
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
                      {calOccurrenceTimeLabel2(e)}{" "}
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
          <h3>Create Event</h3>

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
                {EVENT_TYPES.map((t) => (
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
            <button onClick={saveEvent}>Save</button>
            <button onClick={() => setShowModal(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}















