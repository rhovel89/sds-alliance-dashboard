import React from "react";

const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"] as const;
type Day = typeof DAYS[number];

type PropsA = {
  form: any;
  setForm: React.Dispatch<React.SetStateAction<any>>;
};

type PropsB = {
  enabled: boolean;
  onEnabledChange: (v: boolean) => void;
  recurrenceType: string;
  onRecurrenceTypeChange: (v: string) => void;
  daysOfWeek: string[];
  onDaysOfWeekChange: (v: string[]) => void;
  endDate?: string;
  onEndDateChange?: (v: string) => void;
};

// Named export (calendar imports { RecurringControls })
export function RecurringControls(props: PropsA | PropsB) {
  const isA = (p: any): p is PropsA => p && typeof p.setForm === "function" && "form" in p;

  // Normalize to one internal shape
  const enabled = isA(props) ? !!(props.form?.recurring_enabled) : !!props.enabled;
  const recurrenceType = isA(props) ? String(props.form?.recurrence_type ?? "weekly") : String(props.recurrenceType ?? "weekly");
  const daysOfWeek = isA(props)
    ? (Array.isArray(props.form?.recurrence_days) ? props.form.recurrence_days : [])
    : (Array.isArray(props.daysOfWeek) ? props.daysOfWeek : []);

  const endDate = isA(props) ? String(props.form?.recurrence_end_date ?? "") : String(props.endDate ?? "");

  const update = (patch: any) => {
    if (isA(props)) {
      props.setForm((prev: any) => ({ ...(prev ?? {}), ...patch }));
      return;
    }

    // PropsB callbacks
    if ("recurring_enabled" in patch) props.onEnabledChange(!!patch.recurring_enabled);
    if ("recurrence_type" in patch) props.onRecurrenceTypeChange(String(patch.recurrence_type ?? ""));
    if ("recurrence_days" in patch) props.onDaysOfWeekChange(Array.isArray(patch.recurrence_days) ? patch.recurrence_days : []);
    if ("recurrence_end_date" in patch) props.onEndDateChange?.(String(patch.recurrence_end_date ?? ""));
  };

  const showDays = enabled && (recurrenceType === "weekly" || recurrenceType === "biweekly");

  const toggleDay = (d: Day) => {
    const next = daysOfWeek.includes(d) ? daysOfWeek.filter(x => x !== d) : [...daysOfWeek, d];
    update({ recurrence_days: next });
  };

  return (
    <div style={{ marginTop: 12, padding: 10, border: "1px solid #333", borderRadius: 10 }}>
      <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => {
            const on = e.target.checked;
            update({
              recurring_enabled: on,
              recurrence_type: on ? (recurrenceType || "weekly") : "",
              recurrence_days: on ? (daysOfWeek || []) : [],
              recurrence_end_date: on ? (endDate || "") : "",
            });
          }}
        />
        <strong>Recurring?</strong>
      </label>

      {enabled ? (
        <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontWeight: 800 }}>Frequency</span>
            <select
              value={recurrenceType}
              onChange={(e) => update({ recurrence_type: e.target.value })}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="biweekly">Bi-weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </label>

          {showDays ? (
            <div>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>Days of week</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {DAYS.map((d) => (
                  <label key={d} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input
                      type="checkbox"
                      checked={daysOfWeek.includes(d)}
                      onChange={() => toggleDay(d)}
                    />
                    {d}
                  </label>
                ))}
              </div>
              <div style={{ fontSize: 12, opacity: 0.75, marginTop: 6 }}>
                If you leave days empty, it will recur on the same weekday as the first event.
              </div>
            </div>
          ) : null}

          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontWeight: 800 }}>End date (optional)</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => update({ recurrence_end_date: e.target.value })}
            />
          </label>
        </div>
      ) : null}
    </div>
  );
}

export default RecurringControls;
