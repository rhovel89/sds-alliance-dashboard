import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

type AchType = {
  id: string;
  state_code: string;
  name: string;
  kind: string;
  required_count: number;
  active: boolean;
};

type ReqRow = {
  id: string;
  state_code: string;
  player_name: string;
  alliance_name: string;
  achievement_type_id: string;
  option_id: string | null;
  status: string;
  current_count: number;
  required_count: number;
  created_at: string;
  completed_at: string | null;
};

export function State789AchievementsProgressWidget() {
  const nav = useNavigate();
  const STATE = "789";

  const [types, setTypes] = useState<AchType[]>([]);
  const [rows, setRows] = useState<ReqRow[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const typeById = useMemo(() => {
    const m: Record<string, AchType> = {};
    for (const t of types) m[t.id] = t;
    return m;
  }, [types]);

  const govTypeIds = useMemo(() => {
    return types
      .filter((t) => t.active !== false)
      .filter((t) => t.kind === "governor_count" || String(t.name || "").toLowerCase().includes("governor"))
      .map((t) => t.id);
  }, [types]);

  const govRows = useMemo(() => {
    const set = new Set(govTypeIds);
    return rows
      .filter((r) => set.has(r.achievement_type_id))
      .filter((r) => r.status !== "denied")
      .sort((a, b) => (b.current_count || 0) - (a.current_count || 0));
  }, [rows, govTypeIds]);

  async function load() {
    setErr(null);

    const t = await supabase
      .from("state_achievement_types")
      .select("id,state_code,name,kind,required_count,active")
      .eq("state_code", STATE)
      .order("name", { ascending: true });

    if (t.error) { setErr("Types load failed: " + t.error.message); setTypes([]); setRows([]); return; }
    const typesData = (t.data as any) || [];
    setTypes(typesData);

    // If user lacks permission (RLS), this select will fail -> show message (no crash)
    const r = await supabase
      .from("state_achievement_requests")
      .select("id,state_code,player_name,alliance_name,achievement_type_id,option_id,status,current_count,required_count,created_at,completed_at")
      .eq("state_code", STATE)
      .order("created_at", { ascending: false });

    if (r.error) {
      setRows([]);
      setErr("Progress not available (RLS): " + r.error.message);
      return;
    }
    setRows((r.data as any) || []);
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="zombie-card">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ fontWeight: 900 }}>📈 State Achievements — Progress Tracker</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => nav("/state/789/achievements")}>
            Open Achievements
          </button>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={load}>
            Refresh
          </button>
        </div>
      </div>

      {err ? (
        <div style={{ marginTop: 10, opacity: 0.85, border: "1px solid rgba(255,80,80,0.35)", borderRadius: 12, padding: 10 }}>
          {err}
        </div>
      ) : null}

      <div style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 900 }}>👑 Governor (3x) Tracker</div>
        <div style={{ opacity: 0.7, fontSize: 12, marginTop: 6 }}>
          Shows each player’s current rotations like 2/3. Auto-complete happens when Owner bumps count to required.
        </div>

        <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
          {govRows.slice(0, 50).map((r) => {
            const t = typeById[r.achievement_type_id];
            const req = r.required_count || t?.required_count || 3;
            const prog = `${r.current_count || 0}/${req}`;
            const done = (r.status === "completed" || (r.current_count || 0) >= req) ? " ✅" : "";
            return (
              <div key={r.id} style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.20)" }}>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <div style={{ fontWeight: 900 }}>{r.player_name} <span style={{ opacity: 0.7 }}>({r.alliance_name})</span></div>
                  <div style={{ marginLeft: "auto", fontWeight: 900 }}>{prog}{done}</div>
                </div>
                <div style={{ marginTop: 6, opacity: 0.75, fontSize: 12 }}>Status: {r.status}</div>
              </div>
            );
          })}
          {govRows.length === 0 ? <div style={{ opacity: 0.75 }}>No Governor requests visible.</div> : null}
        </div>
      </div>
    </div>
  );
}