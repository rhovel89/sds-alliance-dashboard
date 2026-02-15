import React from "react";

const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"] as const;
type Day = typeof DAYS[number];

export default function RecurringControls(props: {
  form: any;
  setForm: React.Dispatch<React.SetStateAction<any>>;
}) {
  const { form, setForm } = props;

  const enabled = !!form.recurring_enabled;
  const type = String(form.recurrence_type ?? "");
  const days: string[] = Array.isArray(form.recurrence_days) ? form.recurrence_days : [];

  const showDays = enabled && (type === "weekly" || type === "biweekly");

  const toggleDay = (d: Day) => {
    const next = days.includes(d) ? days.filter(x => x !== d) : [...days, d];
    setForm({ ...form, recurrence_days: next });
  };

  return (
    <div style={{ marginTop: 12, padding: 10, border: "1px solid #333", borderRadius: 10 }}>
      <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) =>
            setForm({
              ...form,
              recurring_enabled: e.target.checked,
              recurrence_type: e.target.checked ? (form.recurrence_type || "weekly") : "",
              recurrence_days: e.target.checked ? (form.recurrence_days || []) : [],
              recurrence_end_date: e.target.checked ? (form.recurrence_end_date || "") : "",
            })
          }
        />
        <strong>Recurring?</strong>
      </label>

      {enabled ? (
        <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontWeight: 800 }}>Frequency</span>
            <select
              value={type}
              onChange={(e) => setForm({ ...form, recurrence_type: e.target.value })}
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
                      checked={days.includes(d)}
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
              value={form.recurrence_end_date || ""}
              onChange={(e) => setForm({ ...form, recurrence_end_date: e.target.value })}
            />
          </label>
        </div>
      ) : null}
    </div>
  );
}
