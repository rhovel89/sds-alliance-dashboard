import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";

type EventRow = {
  event_id: string;
  alliance_id: string; // text (uuid string)
  starts_at: string;
  title: string;
  raw: any;
};

type PlayerAllianceRow = {
  alliance_code: string;
  alliance_id?: string | null; // uuid
};

function toUtcString(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { timeZone: "UTC" });
}

function minutesUntil(iso: string) {
  const t = new Date(iso).getTime();
  return Math.round((t - Date.now()) / 60000);
}

export default function MeTodayEventsPanel(props: { events: EventRow[]; alliances: PlayerAllianceRow[] }) {
  const [showUtc, setShowUtc] = useState(false);
  const [onlySoon, setOnlySoon] = useState(false);

  const allianceIdToCode = useMemo(() => {
    const m = new Map<string, string>();
    (props.alliances ?? []).forEach((a) => {
      if (a.alliance_id) m.set(String(a.alliance_id).toLowerCase(), a.alliance_code);
    });
    return m;
  }, [props.alliances]);

  const grouped = useMemo(() => {
    const list = (props.events ?? []).slice().sort((a, b) => a.starts_at.localeCompare(b.starts_at));
    const groups = new Map<string, EventRow[]>();

    list.forEach((e) => {
      const mins = minutesUntil(e.starts_at);
      const soon = mins >= 0 && mins <= 120;
      if (onlySoon && !soon) return;

      const key = String(e.alliance_id ?? "").toLowerCase();
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(e);
    });

    return Array.from(groups.entries()).map(([allianceKey, items]) => {
      const code = allianceIdToCode.get(allianceKey) ?? allianceKey.slice(0, 8) + "…";
      return { allianceKey, code, items };
    });
  }, [props.events, allianceIdToCode, onlySoon]);

  return (
    <div style={{ border: "1px solid #333", borderRadius: 12, overflow: "hidden" }}>
      <div style={{ padding: 12, borderBottom: "1px solid #333", fontWeight: 900 }}>Today’s Events</div>
      <div style={{ padding: 12 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
          <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input type="checkbox" checked={showUtc} onChange={(e) => setShowUtc(e.target.checked)} />
            show UTC
          </label>
          <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input type="checkbox" checked={onlySoon} onChange={(e) => setOnlySoon(e.target.checked)} />
            starting soon (≤ 2h)
          </label>
        </div>

        {grouped.length === 0 ? (
          <div style={{ opacity: 0.75 }}>No events found today for your alliances.</div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {grouped.map((g) => (
              <div key={g.allianceKey} style={{ border: "1px solid #222", borderRadius: 10, padding: 10 }}>
                <div style={{ fontWeight: 900, marginBottom: 8 }}>Alliance: {g.code}</div>
                <div style={{ display: "grid", gap: 8 }}>
                  {g.items.map((e) => {
                    const mins = minutesUntil(e.starts_at);
                    const soon = mins >= 0 && mins <= 120;
                    return (
                      <div key={e.event_id} style={{ border: "1px solid #222", borderRadius: 10, padding: 10 }}>
                        <div style={{ fontWeight: 900 }}>{e.title}</div>
                        <div style={{ opacity: 0.75, fontSize: 12, marginTop: 4 }}>
                          {showUtc ? toUtcString(e.starts_at) : new Date(e.starts_at).toLocaleString()}
                          {soon ? ` • starts in ${mins}m` : ""}
                          {" • "}
                          <Link to={`/dashboard/${e.alliance_id}/calendar`}>Open calendar</Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
