import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import SupportBundleButton from "../../components/system/SupportBundleButton";
import UserIdDisplay from "../../components/common/UserIdDisplay";

type Row = {
  id: string;
  ts: string;
  actor_user_id: string | null;
  event_type: string;
  state_code: string | null;
  alliance_code: string | null;
  entity: string | null;
  entity_id: string | null;
  payload: any;
};

function fmt(dt?: string | null) {
  if (!dt) return "—";
  try { return new Date(dt).toLocaleString(); } catch { return dt; }
}

export default function OwnerActivityFeedPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState<string>("");

  const [filterState, setFilterState] = useState<string>("");
  const [filterAlliance, setFilterAlliance] = useState<string>("");

  async function load() {
    setStatus("Loading…");
    let q = supabase.from("audit_events").select("*").order("ts", { ascending: false }).limit(200);
    if (filterState) q = q.eq("state_code", filterState);
    if (filterAlliance) q = q.eq("alliance_code", filterAlliance.toUpperCase());

    const r = await q;
    if (r.error) { setStatus(r.error.message); setRows([]); return; }
    setRows((r.data ?? []) as any);
    setStatus("");
  }

  useEffect(() => { void load(); }, []);
  useEffect(() => { void load(); }, [filterState, filterAlliance]);

  const count = useMemo(() => rows.length, [rows]);

  return (
    <div style={{ padding: 16, maxWidth: 1400, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>📡 Activity Feed</h2>
        <SupportBundleButton />
      </div>
      <div style={{ marginTop: 8, opacity: 0.8, fontSize: 12 }}>{status ? status : `Events: ${count}`}</div>

      <div className="zombie-card" style={{ marginTop: 12, padding: 12, borderRadius: 16 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input value={filterState} onChange={(e) => setFilterState(e.target.value)} placeholder="Filter state (e.g. 789)" />
          <input value={filterAlliance} onChange={(e) => setFilterAlliance(e.target.value)} placeholder="Filter alliance (e.g. WOC)" />
          <button type="button" onClick={() => void load()}>Refresh</button>
        </div>
      </div>

      <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
        {rows.map((r) => (
          <div key={r.id} className="zombie-card" style={{ padding: 12, borderRadius: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <div style={{ fontWeight: 950 }}>{r.event_type}</div>
              <div style={{ opacity: 0.75, fontSize: 12 }}>{fmt(r.ts)}</div>
            </div>
            <div style={{ marginTop: 6, opacity: 0.85, fontSize: 12, display: "flex", gap: 12, flexWrap: "wrap" }}>
              <div><b>Actor:</b> <UserIdDisplay userId={r.actor_user_id} /></div>
              {r.state_code ? <div><b>State:</b> {r.state_code}</div> : null}
              {r.alliance_code ? <div><b>Alliance:</b> {r.alliance_code}</div> : null}
              {r.entity ? <div><b>Entity:</b> {r.entity}</div> : null}
            </div>
          </div>
        ))}
        {!rows.length && !status ? <div style={{ opacity: 0.8 }}>No events.</div> : null}
      </div>
    </div>
  );
}
