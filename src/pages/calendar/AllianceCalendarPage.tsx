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
} from "../../utils/recurrence";

type EventRow = CalendarEventRow & {
  event_type_id?: string | null;
  category?: string | null;
};

type AllianceEventTypeRow = {
  id: string;
  alliance_code: string;
  name: string;
  category: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

const LEGACY_EVENT_TYPES = [
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

const CATEGORIES = ["Alliance Event", "State Event"] as const;

export default function AllianceCalendarPage() {
  const { alliance_id } = useParams<{ alliance_id: string }>();
  const upperAlliance = (alliance_id || "").toUpperCase();
  const { canEdit } = useHQPermissions(upperAlliance);

  const [userId, setUserId] = useState<string | null>(null);

  // Raw rows from DB
  const [events, setEvents] = useState<EventRow[]>([]);

  const [showModal, setShowModal] = useState(false);

  // Event name templates (per alliance)
  const [eventTypes, setEventTypes] = useState<AllianceEventTypeRow[]>([]);
  const [typesErr, setTypesErr] = useState<string | null>(null);
  const [typesLoading, setTypesLoading] = useState(false);

  // Manage templates modal
  const [showTypesModal, setShowTypesModal] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");
  const [newTypeCategory, setNewTypeCategory] = useState<(typeof CATEGORIES)[number]>("Alliance Event");
  const [typesBusy, setTypesBusy] = useState(false);

  const makeEmptyForm = () => ({
    // NEW: category + template selector
    category: "Alliance Event" as (typeof CATEGORIES)[number],
    event_type_id: "" as string, // template id

    // existing
    title: "",
    event_type: "State vs. State",
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
    return expandEventsForMonth(events, year, month);
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

    setEvents((data || []) as EventRow[]);
  };

  const refetchEventTypes = async () => {
    if (!upperAlliance) return;
    setTypesLoading(true);
    setTypesErr(null);

    try {
      // If table doesn't exist or RLS blocks, we handle gracefully.
      const { data, error } = await supabase
        .from("alliance_event_types")
        .select("id,alliance_code,name,category,created_at,updated_at")
        .eq("alliance_code", upperAlliance)
        .order("name", { ascending: true });

      if (error) {
        // Safe: don’t break calendar if templates table is missing
        console.warn("alliance_event_types fetch error:", error);
        setTypesErr(error.message);
        setEventTypes([]);
        return;
      }

      setEventTypes((data || []) as AllianceEventTypeRow[]);
    } catch (e: any) {
      console.warn("alliance_event_types fetch exception:", e);
      setTypesErr(e?.message ?? String(e));
      setEventTypes([]);
    } finally {
      setTypesLoading(false);
    }
  };

  useEffect(() => {
    refetch();
    refetchEventTypes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [upperAlliance]);

  const saveEvent = async () => {
    if (!canEdit) return;

    const cleanTitle = form.title.trim();
    if (!cleanTitle) return alert("Event Title required.");
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

    // NEW optional columns
    const newCols: any = {
      category: form.category || null,
      event_type_id: form.event_type_id ? form.event_type_id : null,
    };

    const basePayload: any = {
      alliance_id: upperAlliance,

      // REQUIRED NOT NULL COLUMNS
      title: cleanTitle,
      created_by: userId,
      start_time_utc: startLocal.toISOString(),
      duration_minutes: durationMinutes,
      timezone_origin: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",

      // Optional legacy columns (keep existing behavior)
      event_name: cleanTitle,
      event_type: form.event_type,
      start_date: form.start_date,
      end_date: form.end_date,
      start_time: form.start_time,
      end_time: form.end_time,

      // Recurrence (optional)
      recurring_enabled: form.recurring_enabled,
      recurrence_type: form.recurrence_type || null,
      recurrence_days: form.recurrence_days,
      recurrence_end_date: form.recurrence_end_date || null,
    };

    const wantRecurring = form.recurring_enabled && form.recurrence_type !== "none";

    const buildPayloadA = (includeNew: boolean) => ({
      ...basePayload,
      ...(includeNew ? newCols : {}),
      ...(wantRecurring
        ? { recurrence_type: form.recurrence_type, recurrence_days: form.recurrence_days }
        : { recurrence_type: null, recurrence_days: null }),
    });

    const buildPayloadB = (includeNew: boolean) => ({
      ...basePayload,
      ...(includeNew ? newCols : {}),
      ...(wantRecurring
        ? { recurrence: form.recurrence_type, days_of_week: form.recurrence_days }
        : { recurrence: null, days_of_week: null }),
    });

    const tryInsert = async (payload: any) => {
      return supabase.from("alliance_events").insert(payload).select("id").single();
    };

    // Attempt order:
    // 1) New cols + recurrence_type/days
    // 2) No new cols + recurrence_type/days
    // 3) New cols + recurrence/days_of_week
    // 4) No new cols + recurrence/days_of_week
    const attempts: { label: string; payload: any }[] = [
      { label: "A+new", payload: buildPayloadA(true) },
      { label: "A", payload: buildPayloadA(false) },
      { label: "B+new", payload: buildPayloadB(true) },
      { label: "B", payload: buildPayloadB(false) },
    ];

    for (const a of attempts) {
      const res = await tryInsert(a.payload);

      if (!res.error) {
        setShowModal(false);
        setForm(makeEmptyForm());
        await refetch();
        return;
      }

      const msg = (res.error.message || "").toLowerCase();

      // If this attempt failed due to missing columns, we continue to fallback attempts.
      const missingNewCols =
        msg.includes("column") && (msg.includes("event_type_id") || msg.includes("category"));
      const missingRecCols =
        msg.includes("column") && (msg.includes("recurrence_type") || msg.includes("recurrence_days"));

      // If it’s not a "missing column" kind of error, stop and show it.
      if (!missingNewCols && !missingRecCols && !msg.includes("days_of_week") && !msg.includes("recurrence")) {
        console.error(res.error);
        alert(res.error.message);
        return;
      }

      // Otherwise continue to next fallback.
      console.warn(`Insert fallback triggered (${a.label}):`, res.error.message);
    }

    alert("Could not save event (schema mismatch). Please run the latest migration and try again.");
  };

  const deleteEvent = async (id: string) => {
    if (!canEdit) return;
    if (!confirm("Delete this event?")) return;

    await supabase.from("alliance_events").delete().eq("id", id);
    await refetch();
  };

  const createEventType = async () => {
    if (!canEdit) return;
    const name = newTypeName.trim();
    if (!name) return;

    if (!userId) {
      alert("No user session.");
      return;
    }

    setTypesBusy(true);
    try {
      const { error } = await supabase.from("alliance_event_types").insert({
        alliance_code: upperAlliance,
        name,
        category: newTypeCategory,
        created_by: userId,
        updated_at: new Date().toISOString(),
      } as any);

      if (error) {
        console.error(error);
        alert(error.message);
        return;
      }

      setNewTypeName("");
      await refetchEventTypes();
    } finally {
      setTypesBusy(false);
    }
  };

  const deleteEventType = async (id: string) => {
    if (!canEdit) return;
    if (!confirm("Delete this Event Name?")) return;

    setTypesBusy(true);
    try {
      const { error } = await supabase.from("alliance_event_types").delete().eq("id", id);
      if (error) {
        console.error(error);
        alert(error.message);
        return;
      }
      await refetchEventTypes();
    } finally {
      setTypesBusy(false);
    }
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
    return expandedEvents.filter((e) => isSameDay(getEventStartUtc(e), year, month, selectedDay));
  }, [expandedEvents, selectedDay, year, month]);

  const filteredTemplates = useMemo(() => {
    const cat = form.category || "Alliance Event";
    return eventTypes.filter((t) => String(t.category ?? "Alliance Event") === cat);
  }, [eventTypes, form.category]);

  const onPickTemplate = (templateId: string) => {
    if (!templateId) {
      setForm((prev) => ({ ...prev, event_type_id: "" }));
      return;
    }
    const t = eventTypes.find((x) => x.id === templateId);
    setForm((prev) => ({
      ...prev,
      event_type_id: templateId,
      title: t?.name ?? prev.title,
    }));
  };

  return (
    <div style={{ padding: 24 }}>
      <h2>📅 Alliance Calendar — {upperAlliance}</h2>

      {canEdit && (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={() => { setForm(makeEmptyForm()); setShowModal(true); }}>
            ➕ Create Event
          </button>
          <button onClick={() => { setShowTypesModal(true); }}>
            🏷️ Manage Event Names
          </button>
        </div>
      )}

      {typesErr ? (
        <div style={{ marginTop: 10, opacity: 0.8, fontSize: 12 }}>
          Templates unavailable: {typesErr}
        </div>
      ) : null}

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

          const dayEvents = expandedEvents.filter((e) =>
            isSameDay(getEventStartUtc(e), year, month, day)
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

              {dayEvents.map((e) => (
                <div
                  key={(e as any).instance_id ?? (e as any).id}
                  style={{
                    marginTop: 6,
                    fontSize: 12,
                    cursor: canEdit ? "pointer" : "default",
                  }}
                  onClick={(evt) => {
                    evt.stopPropagation();
                    if (canEdit) deleteEvent(getDeleteId(e as any));
                  }}
                  title={canEdit ? "Click to delete" : undefined}
                >
                  {new Date(getEventStartUtc(e as any)).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  — {(e as any).title}
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
            🧟 Agenda — {new Date(year, month, selectedDay).toLocaleDateString()}
          </h3>

          {selectedDayEvents.length === 0 ? (
            <div style={{ opacity: 0.75 }}>No events.</div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {selectedDayEvents
                .slice()
                .sort(
                  (a, b) =>
                    new Date(getEventStartUtc(a as any)).getTime() -
                    new Date(getEventStartUtc(b as any)).getTime()
                )
                .map((e) => (
                  <div
                    key={`agenda__${(e as any).instance_id ?? (e as any).id}`}
                    style={{ border: "1px solid #333", borderRadius: 8, padding: 10 }}
                  >
                    <div style={{ fontWeight: 700 }}>
                      {new Date(getEventStartUtc(e as any)).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      — {(e as any).title}
                    </div>

                    {(e as any).category ? (
                      <div style={{ opacity: 0.85, fontSize: 12 }}>
                        Category: {(e as any).category}
                      </div>
                    ) : null}

                    {(e as any).event_type ? (
                      <div style={{ opacity: 0.85, fontSize: 12 }}>
                        Legacy Type: {(e as any).event_type}
                      </div>
                    ) : null}
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* CREATE EVENT MODAL */}
      {showModal && (
        <div style={{ marginTop: 20, border: "1px solid #333", borderRadius: 10, padding: 14 }}>
          <h3>Create Event</h3>

          {/* NEW: Category + Template */}
          <div style={{ marginTop: 10, display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span>Category</span>
              <select
                value={form.category}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    category: e.target.value as any,
                    event_type_id: "",
                  }))
                }
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span>Event Name (per alliance)</span>
              <select
                value={form.event_type_id}
                onChange={(e) => onPickTemplate(e.target.value)}
                disabled={typesLoading}
              >
                <option value="">Custom (type below)</option>
                {filteredTemplates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <span style={{ fontSize: 12, opacity: 0.75 }}>
                Pick a template to auto-fill the title.
              </span>
            </label>
          </div>

          <input
            placeholder="Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            style={{ marginTop: 10, width: "100%" }}
          />

          {/* Existing legacy event_type dropdown (kept) */}
          <div style={{ marginTop: 10 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span>Legacy Event Type (optional)</span>
              <select
                value={form.event_type}
                onChange={(e) => setForm({ ...form, event_type: e.target.value })}
              >
                {LEGACY_EVENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
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

          {/* Recurrence UI */}
          <RecurringControls
            enabled={form.recurring_enabled}
            onEnabledChange={(v) => setForm((prev) => ({ ...prev, recurring_enabled: v }))}
            recurrenceType={form.recurrence_type as any}
            onRecurrenceTypeChange={(v) => setForm((prev) => ({ ...prev, recurrence_type: v as any }))}
            daysOfWeek={form.recurrence_days}
            onDaysOfWeekChange={(v) => setForm((prev) => ({ ...prev, recurrence_days: v }))}
          />

          <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={saveEvent}>Save</button>
            <button onClick={() => setShowModal(false)}>Cancel</button>
            {canEdit ? (
              <button onClick={() => setShowTypesModal(true)} style={{ marginLeft: "auto" }}>
                🏷️ Manage Event Names
              </button>
            ) : null}
          </div>
        </div>
      )}

      {/* MANAGE EVENT NAMES MODAL */}
      {showTypesModal && (
        <div style={{ marginTop: 20, border: "1px solid #333", borderRadius: 10, padding: 14 }}>
          <h3>🏷️ Manage Event Names — {upperAlliance}</h3>
          <div style={{ fontSize: 12, opacity: 0.75 }}>
            These are templates you can reuse when creating events (per alliance).
          </div>

          <div style={{ marginTop: 12, display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span>Category</span>
              <select value={newTypeCategory} onChange={(e) => setNewTypeCategory(e.target.value as any)}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span>Event Name</span>
              <input
                value={newTypeName}
                onChange={(e) => setNewTypeName(e.target.value)}
                placeholder='e.g. "Hunt Mastery"'
              />
            </label>

            <div style={{ display: "flex", alignItems: "end" }}>
              <button onClick={createEventType} disabled={typesBusy}>
                + Add
              </button>
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            {typesLoading ? (
              <div style={{ opacity: 0.8 }}>Loading…</div>
            ) : eventTypes.length === 0 ? (
              <div style={{ opacity: 0.8 }}>No templates yet.</div>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {eventTypes.map((t) => (
                  <div
                    key={t.id}
                    style={{
                      border: "1px solid #333",
                      borderRadius: 8,
                      padding: 10,
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 800 }}>{t.name}</div>
                      <div style={{ fontSize: 12, opacity: 0.8 }}>
                        {(t.category ?? "Alliance Event") as any}
                      </div>
                    </div>

                    <button onClick={() => deleteEventType(t.id)} disabled={typesBusy}>
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
            <button
              onClick={async () => {
                await refetchEventTypes();
                setShowTypesModal(false);
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
