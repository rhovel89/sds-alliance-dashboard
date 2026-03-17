from pathlib import Path

path = Path("src/pages/calendar/AllianceCalendarPage.tsx")
text = path.read_text(encoding="utf-8")

def replace_once(old: str, new: str, label: str):
    global text
    if old not in text:
        raise SystemExit(f"Patch failed: could not find block: {label}")
    text = text.replace(old, new, 1)

replace_once(
'''export default function AllianceCalendarPage() {''',
'''type AllianceCalendarPageProps = {
  forcedDisplayUtc?: boolean;
  onForcedDisplayUtcChange?: (value: boolean) => void;
};

export default function AllianceCalendarPage({
  forcedDisplayUtc,
  onForcedDisplayUtcChange,
}: AllianceCalendarPageProps = {}) {''',
"component signature"
)

replace_once(
'''  const [showModal, setShowModal] = useState(false);
const [displayUtc, setDisplayUtc] = useState<boolean>(() => {
  try {
    return localStorage.getItem("calendar.timeMode") === "utc";
  } catch {
    return false;
  }
});

  const makeEmptyForm = () => ({''',
'''  const [showModal, setShowModal] = useState(false);
  const [displayUtc, setDisplayUtc] = useState<boolean>(() => {
    if (typeof forcedDisplayUtc === "boolean") return forcedDisplayUtc;
    try {
      return localStorage.getItem("calendar.timeMode") === "utc";
    } catch {
      return false;
    }
  });

  const makeEmptyForm = () => ({''',
"displayUtc state"
)

replace_once(
'''  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [form, setForm] = useState(makeEmptyForm());''',
'''  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [form, setForm] = useState(makeEmptyForm());
  const [editingEventId, setEditingEventId] = useState<string | null>(null);''',
"editingEventId state"
)

replace_once(
'''  useEffect(() => {
    try {
      localStorage.setItem("calendar.timeMode", displayUtc ? "utc" : "local");
    } catch {}
  }, [displayUtc]);''',
'''  useEffect(() => {
    if (typeof forcedDisplayUtc === "boolean") {
      setDisplayUtc(forcedDisplayUtc);
    }
  }, [forcedDisplayUtc]);

  useEffect(() => {
    try {
      localStorage.setItem("calendar.timeMode", displayUtc ? "utc" : "local");
    } catch {}
  }, [displayUtc]);''',
"displayUtc sync effects"
)

replace_once(
'''      // Seed defaults if empty AND canEdit
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
      }''',
'''      // Writes to alliance_event_types are intentionally disabled in Calendar.
      // Manage custom types in /owner/event-types. ''',
"broken loadEventTypes block"
)

replace_once(
'''  const saveEvent = async () => {''',
'''  const clearEventEditor = () => {
    setEditingEventId(null);
    setForm(makeEmptyForm());
    setShowModal(false);
  };

  const findSourceEvent = (arg: any): EventRow | null => {
    const sourceId = String(arg?._source_event_id || arg?.id || "").trim();
    if (!sourceId) return null;
    return (events.find((x: any) => String(x.id) === sourceId) as EventRow | undefined) || null;
  };

  const loadEventIntoForm = (arg: any) => {
    const source = findSourceEvent(arg);
    if (!source) {
      alert("Could not load the source event for editing.");
      return;
    }

    const recurrenceType = String(source.recurrence_type || source.recurrence || "weekly");
    const recurrenceDays = Array.isArray(source.recurrence_days)
      ? source.recurrence_days
      : Array.isArray((source as any).days_of_week)
      ? ((source as any).days_of_week as string[])
      : [];

    const timeMode: "local" | "utc" =
      String(source.timezone_origin || "").toUpperCase() === "UTC" ? "utc" : "local";

    let endDate = String(source.end_date || "").trim();
    let endTime = String(source.end_time || "").trim().slice(0, 5);

    if ((!endDate || !endTime) && source.start_time_utc) {
      const startUtc = new Date(String(source.start_time_utc));
      const duration = Math.max(1, Number(source.duration_minutes || 60));
      if (!Number.isNaN(startUtc.getTime())) {
        const endInstant = new Date(startUtc.getTime() + duration * 60000);
        const pad = (n: number) => String(n).padStart(2, "0");

        if (timeMode === "utc") {
          endDate = `${endInstant.getUTCFullYear()}-${pad(endInstant.getUTCMonth() + 1)}-${pad(endInstant.getUTCDate())}`;
          endTime = `${pad(endInstant.getUTCHours())}:${pad(endInstant.getUTCMinutes())}`;
        } else {
          endDate = `${endInstant.getFullYear()}-${pad(endInstant.getMonth() + 1)}-${pad(endInstant.getDate())}`;
          endTime = `${pad(endInstant.getHours())}:${pad(endInstant.getMinutes())}`;
        }
      }
    }

    setEditingEventId(String(source.id));
    setForm({
      title: String(source.title || source.event_name || ""),
      event_category: String(source.event_category || "Alliance") || "Alliance",
      event_type: String(source.event_type || "Reminder") || "Reminder",
      new_event_type: "",
      start_date: String(source.start_date || ""),
      start_time: String(source.start_time || "").trim().slice(0, 5),
      end_date: endDate,
      end_time: endTime,
      recurring_enabled: !!source.recurring_enabled && !!String(source.recurrence_type || source.recurrence || "").trim(),
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
        ? "Recurring event:\\n\\n1 = Edit ENTIRE SERIES\\n2 = Delete\\n\\nEnter 1 / 2"
        : "Event:\\n\\n1 = Edit\\n2 = Delete\\n\\nEnter 1 / 2",
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

  const saveEvent = async () => {''',
"editor helpers"
)

replace_once(
'''    const basePayload: any = {
      alliance_id: upperAlliance,

      title: cleanTitle,
      created_by: userId,
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

      recurring_enabled: form.recurring_enabled,
      recurrence_type: form.recurrence_type || null,
      recurrence_days: normalizedRecurrenceDays,
      recurrence_end_date: form.recurrence_end_date || null,
    };

    const wantRecurring = form.recurring_enabled && form.recurrence_type !== "none";''',
'''    const basePayload: any = {
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

      recurring_enabled: form.recurring_enabled,
      recurrence_type: form.recurrence_type || null,
      recurrence_days: normalizedRecurrenceDays,
      recurrence_end_date: form.recurrence_end_date || null,
    };

    const writePayloadBase: any = editingEventId
      ? basePayload
      : { ...basePayload, created_by: userId };

    const wantRecurring = form.recurring_enabled && form.recurrence_type !== "none";''',
"saveEvent base payload"
)

replace_once(
'''    const payloadA = {
      ...basePayload,
      ...(wantRecurring
        ? { recurrence_type: form.recurrence_type, recurrence_days: normalizedRecurrenceDays }
        : { recurrence_type: null, recurrence_days: null }),
    };

    const resA = await supabase.from("alliance_events").insert(payloadA).select("id").single();''',
'''    const payloadA = {
      ...writePayloadBase,
      ...(wantRecurring
        ? { recurrence_type: form.recurrence_type, recurrence_days: normalizedRecurrenceDays }
        : { recurrence_type: null, recurrence_days: null }),
    };

    const resA = editingEventId
      ? await supabase.from("alliance_events").update(payloadA).eq("id", editingEventId)
      : await supabase.from("alliance_events").insert(payloadA).select("id").single();''',
"saveEvent primary write"
)

replace_once(
'''        const retry = await supabase.from("alliance_events").insert(payloadNoCat).select("id").single();''',
'''        const retry = editingEventId
          ? await supabase.from("alliance_events").update(payloadNoCat).eq("id", editingEventId)
          : await supabase.from("alliance_events").insert(payloadNoCat).select("id").single();''',
"saveEvent no-category fallback"
)

replace_once(
'''        const payloadB = {
          ...basePayload,
          ...(wantRecurring
            ? { recurrence: form.recurrence_type, days_of_week: normalizedRecurrenceDays }
            : { recurrence: null, days_of_week: null }),
        };
        const resB = await supabase.from("alliance_events").insert(payloadB).select("id").single();''',
'''        const payloadB = {
          ...writePayloadBase,
          ...(wantRecurring
            ? { recurrence: form.recurrence_type, days_of_week: normalizedRecurrenceDays }
            : { recurrence: null, days_of_week: null }),
        };
        const resB = editingEventId
          ? await supabase.from("alliance_events").update(payloadB).eq("id", editingEventId)
          : await supabase.from("alliance_events").insert(payloadB).select("id").single();''',
"saveEvent legacy recurrence fallback"
)

replace_once(
'''    setShowModal(false);
    setForm(makeEmptyForm());
    await refetch();''',
'''    clearEventEditor();
    await refetch();''',
"saveEvent cleanup"
)

replace_once(
'''        <button onClick={() => { setForm(makeEmptyForm()); setShowModal(true); }}>''',
'''        <button onClick={() => { setEditingEventId(null); setForm(makeEmptyForm()); setShowModal(true); }}>''',
"create button"
)

replace_once(
'''      onClick={() => setDisplayUtc(false)}''',
'''      onClick={() => {
        setDisplayUtc(false);
        onForcedDisplayUtcChange?.(false);
      }}''',
"local display toggle"
)

replace_once(
'''      onClick={() => setDisplayUtc(true)}''',
'''      onClick={() => {
        setDisplayUtc(true);
        onForcedDisplayUtcChange?.(true);
      }}''',
"utc display toggle"
)

replace_once(
'''                  onClick={(evt) => {
                    evt.stopPropagation();
                    if (canEdit) deleteEvent(e);
                  }}
                  title={canEdit ? "Click to delete" : undefined}''',
'''                  onClick={(evt) => {
                    evt.stopPropagation();
                    if (canEdit) openEventActions(e);
                  }}
                  title={canEdit ? "Click to edit or delete" : undefined}''',
"event click behavior"
)

replace_once(
'''          <h3>Create Event</h3>''',
'''          <h3>{editingEventId ? "Edit Event" : "Create Event"}</h3>''',
"modal heading"
)

replace_once(
'''          <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
            <button onClick={saveEvent}>Save</button>
            <button onClick={() => setShowModal(false)}>Cancel</button>
          </div>''',
'''          <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
            <button onClick={saveEvent}>{editingEventId ? "Save Changes" : "Save"}</button>
            <button onClick={clearEventEditor}>Cancel</button>
          </div>''',
"modal buttons"
)

path.write_text(text, encoding="utf-8")
print("Patched:", path)
