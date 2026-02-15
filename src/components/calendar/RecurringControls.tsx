import React from "react";
import type { RecurrenceType } from "../../utils/recurrence";

type Props = {
  enabled: boolean;
  onEnabledChange: (v: boolean) => void;

  recurrenceType: RecurrenceType;
  onRecurrenceTypeChange: (v: RecurrenceType) => void;

  // 0=Sun..6=Sat (JS convention; we display Mon..Sun)
  daysOfWeek: number[];
  onDaysOfWeekChange: (v: number[]) => void;
};

const DOWS: { v: number; label: string }[] = [
  { v: 1, label: "Mon" },
  { v: 2, label: "Tue" },
  { v: 3, label: "Wed" },
  { v: 4, label: "Thu" },
  { v: 5, label: "Fri" },
  { v: 6, label: "Sat" },
  { v: 0, label: "Sun" },
];

export function RecurringControls(props: Props) {
  const {
    enabled, onEnabledChange,
    recurrenceType, onRecurrenceTypeChange,
    daysOfWeek, onDaysOfWeekChange
  } = props;

  const showDow = enabled && (recurrenceType === "weekly" || recurrenceType === "biweekly");

  function toggleDow(v: number) {
    if (daysOfWeek.includes(v)) onDaysOfWeekChange(daysOfWeek.filter(x => x !== v));
    else onDaysOfWeekChange([...daysOfWeek, v]);
  }

  return (
    <div style={{ marginTop: 12, borderTop: "1px solid #333", paddingTop: 12 }}>
      <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onEnabledChange(e.target.checked)}
        />
        <span>Recurring?</span>
      </label>

      {enabled && (
        <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span>Frequency</span>
            <select
              value={recurrenceType}
              onChange={(e) => onRecurrenceTypeChange(e.target.value as RecurrenceType)}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="biweekly">Bi-weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </label>

          {showDow && (
            <div style={{ display: "grid", gap: 6 }}>
              <span>Days of week</span>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {DOWS.map((d) => (
                  <label key={d.v} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input
                      type="checkbox"
                      checked={daysOfWeek.includes(d.v)}
                      onChange={() => toggleDow(d.v)}
                    />
                    <span>{d.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
