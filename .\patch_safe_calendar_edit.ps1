$ErrorActionPreference = "Stop"

$path = "src/pages/calendar/AllianceCalendarPage.tsx"
$backup = "src/pages/calendar/AllianceCalendarPage.tsx.bak-safe-edit"

Copy-Item $path $backup -Force

$raw = Get-Content $path -Raw
$eol = if ($raw.Contains("`r`n")) { "`r`n" } else { "`n" }
$script:Text = $raw -replace "`r`n", "`n"

function Replace-Once {
  param(
    [string]$Label,
    [string]$Old,
    [string]$New
  )

  if (-not $script:Text.Contains($Old)) {
    throw "Patch failed: could not find block: $Label"
  }

  $script:Text = $script:Text.Replace($Old, $New)
}

$old = @'
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [form, setForm] = useState(makeEmptyForm());
'@
$new = @'
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [form, setForm] = useState(makeEmptyForm());
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
'@
Replace-Once "editing state" $old $new

$old = @'
  const saveEvent = async () => {
'@
$new = @'
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

    const recurrenceType = String(source.recurrence_type || source.recurrence || "weekly");
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
'@
Replace-Once "editor helpers" $old $new

$old = @'
    const basePayload: any = {
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

    const wantRecurring = form.recurring_enabled && form.recurrence_type !== "none";
'@
$new = @'
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

      recurring_enabled: form.recurrenc_enabled,
      recurrence_type: form.recurrence_type || null,
      recurrence_days: normalizedRecurrenceDays,
      recurrence_end_date: form.recurrence_end_date || null,
    };

    const writePayloadBase: any = editingEventId
      ? basePayload
      : { ...basePayload, created_by: userId };

    const wantRecurring = form.recurring_enabled && form.recurrence_type !== "none";
'@
Replace-Once "save base payload" $old $new

$old = @'
    const payloadA = {
      ...basePayload,
      ...(wantRecurring
        ? { recurrence_type: form.recurrence_type, recurrence_days: normalizedRecurrenceDays }
        : { recurrence_type: null, recurrence_days: null }),
    };

    const resA = await supabase.from("alliance_events").insert(payloadA).select("id").single();
'@
$new = @'
    const payloadA = {
      ...writePayloadBase,
      ...(wantRecurring
        ? { recurrence_type: form.recurrence_type, recurrence_days: normalizedRecurrenceDays }
        : { recurrence_type: null, recurrence_days: null }),
    };

    const resA = editingEventId
      ? await supabase.from("alliance_events").update(payloadA).eq("id", editingEventId)
      : await supabase.from("alliance_events").insert(payloadA).select("id").single();
'@
Replace-Once "primary write" $old $new

$old = @'
        const retry = await supabase.from("alliance_events").insert(payloadNoCat).select("id").single();
'@
$new = @'
        const retry = editingEventId
          ? await supabase.from("alliance_events").update(payloadNoCat).eq("id", editingEventId)
          : await supabase.from("alliance_events").insert(payloadNoCat).select("id").single();
'@
Replace-Once "no-category fallback" $old $new

$old = @'
        const payloadB = {
          ...basePayload,
          ...(wantRecurring
            ? { recurrence: form.recurrence_type, days_of_week: normalizedRecurrenceDays }
            : { recurrence: null, days_of_week: null }),
        };
        const resB = await supabase.from("alliance_events").insert(payloadB).select("id").single();
'@
$new = @'
        const payloadB = {
          ...writePayloadBase,
          ...(wantRecurring
            ? { recurrence: form.recurrence_type, days_of_week: normalizedRecurrenceDays }
            : { recurrence: null, days_of_week: null }),
        };
        const resB = editingEventId
          ? await supabase.from("alliance_events").update(payloadB).eq("id", editingEventId)
          : await supabase.from("alliance_events").insert(payloadB).select("id").single();
'@
Replace-Once "legacy recurrence fallback" $old $new

$old = @'
    setShowModal(false);
    setForm(makeEmptyForm());
    await refetch();
'@
$new = @'
    clearEventEditor();
    await refetch();
'@
Replace-Once "save cleanup" $old $new

$old = @'
        <button onClick={() => { setForm(makeEmptyForm()); setShowModal(true); }}>
'@
$new = @'
        <button onClick={() => { setEditingEventId(null); setForm(makeEmptyForm()); setShowModal(true); }}>
'@
Replace-Once "create button" $old $new

$old = @'
                  onClick={(evt) => {
                    evt.stopPropagation();
                    if (canEdit) deleteEvent(e);
                  }}
                  title={canEdit ? "Click to delete" : undefined}
'@
$new = @'
                  onClick={(evt) => {
                    evt.stopPropagation();
                    if (canEdit) openEventActions(e);
                  }}
                  title={canEdit ? "Click to edit or delete" : undefined}
'@
Replace-Once "event click behavior" $old $new

$old = @'
          <h3>Create Event</h3>
'@
$new = @'
          <h3>{editingEventId ? "Edit Event" : "Create Event"}</h3>
'@
Replace-Once "modal heading" $old $new

$old = @'
          <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
            <button onClick={saveEvent}>Save</button>
            <button onClick={() => setShowModal(false)}>Cancel</button>
          </div>
'@
$new = @'
          <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
            <button onClick={saveEvent}>{editingEventId ? "Save Changes" : "Save"}</button>
            <button onClick={clearEventEditor}>Cancel</button>
          </div>
'@
Replace-Once "modal buttons" $old $new

Set-Content -Path $path -Value ($script:Text -replace "`n", $eol) -Encoding UTF8
Write-Host "Patched $path"
Write-Host "Backup saved to $backup"
