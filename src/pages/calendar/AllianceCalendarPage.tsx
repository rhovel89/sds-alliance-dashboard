import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useHQPermissions } from "../../hooks/useHQPermissions";
import { RecurringControls } from "../../components/calendar/RecurringControls";
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

export default function AllianceCalendarPage() {
  const { alliance_id } = useParams<{ alliance_id: string }>();
  const upperAlliance = (alliance_id || "").toUpperCase();
  const { canEdit } = useHQPermissions(upperAlliance);

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

  // Expand recurring events for the visible month (client-side)
  const expandedEvents = useMemo(() => {
    return expandEventsForMonth(events as any, year, month) as any[];
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
          .from("alliance_event_types")
          .upsert(seed, { onConflict: "alliance_code,category,name" as any });

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
    if (!canEdit) return name;

    const payload: any = {
      alliance_code: upperAlliance,
      category: cat,
      name,
      created_by: userId ?? null,
      updated_at: new Date().toISOString(),
    };

    const res = await supabase
      .from("alliance_event_types")
      .upsert(payload, { onConflict: "alliance_code,category,name" as any })
      .select("id,name")
      .maybeSingle();

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
          .from("alliance_event_types")
          .upsert(
            { alliance_code: upperAlliance, category: "Alliance Event", name: n } as any,
            { onConflict: "alliance_code,category,name" as any }
          );
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

    const basePayload: any = {
      alliance_id: upperAlliance,

      // REQUIRED NOT NULL COLUMNS (your newer schema)
      title: cleanTitle,
      created_by: userId,
      start_time_utc: startLocal.toISOString(),
      duration_minutes: durationMinutes,
      timezone_origin: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",

      // category + type
      event_category: chosenCategory,
      event_type: chosenType,

      // Optional legacy columns (keep existing behavior)
      event_name: cleanTitle,
      start_date: form.start_date,
      end_date: form.end_date,
      start_time: form.start_time,
      end_time: form.end_time,

      // Recurrence
      recurring_enabled: form.recurring_enabled,
      recurrence_type: form.recurrence_type || null,
      recurrence_days: form.recurrence_days,
      recurrence_end_date: form.recurrence_end_date || null,
    };

    const wantRecurring = form.recurring_enabled && form.recurrence_type !== "none";

    const payloadA = {
      ...basePayload,
      ...(wantRecurring
        ? { recurrence_type: form.recurrence_type, recurrence_days: form.recurrence_days }
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
            ? { recurrence: form.recurrence_type, days_of_week: form.recurrence_days }
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

  const deleteEvent = async (id: string) => {
    if (!canEdit) return;
    if (!confirm("Delete this event?")) return;
    await supabase.from("alliance_events").delete().eq("id", id);
    await refetch();
  };

  const monthLabel = useMemo(() => {
    return new Date(year, month).toLocaleString(undefined, {
      month: "long",
      year: "numeric",
    });
  }, [month, year]);

  // Calendar day match using local conversion from UTC instant
  const isSameDay = (utcString: string, y: number, m: number, d: number) => {
    const local = new Date(utcString);
    return (
      local.getFullYear() === y &&
      local.getMonth() === m &&
      local.getDate() === d
    );
  };

  const selectedDayEvents = useMemo(() => {
    if (!selectedDay) return [];
    return expandedEvents.filter((e: any) => isSameDay(String(getEventStartUtc(e) || ""), year, month, selectedDay));
  }, [expandedEvents, selectedDay, year, month]);

  // Manager tools: delete type
  const deleteType = async (id: string) => {
    if (!canEdit) return;
    if (!typesOk) return alert("Event type catalog is not available (fallback mode).");
    if (!confirm("Delete this event type?")) return;

    const del = await supabase.from("alliance_event_types").delete().eq("id", id);
    if (del.error) return alert(del.error.message);

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

          const dayEvents = expandedEvents.filter((e: any) =>
            isSameDay(String(getEventStartUtc(e) || ""), year, month, day)
          );

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
                    if (canEdit) deleteEvent(getDeleteId(e));
                  }}
                  title={canEdit ? "Click to delete" : undefined}
                >
                  {new Date(String(getEventStartUtc(e) || "")).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
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
                      {new Date(String(getEventStartUtc(e) || "")).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
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
                {canEdit ? <option value="__new__">+ Add new type…</option> : null}
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




