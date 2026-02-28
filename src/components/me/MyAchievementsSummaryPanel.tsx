import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type Row = Record<string, any>;

export default function MyAchievementsSummaryPanel() {
  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState<string>("");

  async function load() {
    setStatus("Loading…");
    try {
      const u = await supabase.auth.getUser();
      const uid = u.data?.user?.id || null;
      if (!uid) { setStatus("Not logged in."); setRows([]); return; }

      // best-effort: requester_user_id is the intended column
      const r = await supabase
        .from("state_achievement_requests")
        .select("*")
        .eq("requester_user_id", uid)
        .order("created_at", { ascending: false })
        .limit(25);

      if (r.error) {
        setStatus(r.error.message);
        setRows([]);
        return;
      }

      setRows((r.data ?? []) as any);
      setStatus("");
    } catch (e: any) {
      setStatus(String(e?.message || e || "Error"));
      setRows([]);
    }
  }

  useEffect(() => { void load(); }, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of rows) {
      const s = String(r.status || r.state || "unknown").toLowerCase();
      c[s] = (c[s] || 0) + 1;
    }
    return c;
  }, [rows]);

  return (
    <div className="zombie-card" style={{ padding: 14, borderRadius: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ fontWeight: 950 }}>🏆 My Achievements</div>
        <button type="button" onClick={() => void load()}>Refresh</button>
      </div>

      <div style={{ marginTop: 6, opacity: 0.85, fontSize: 12 }}>
        {status ? status : `Total: ${rows.length}`}
        {Object.keys(counts).length ? (
          <span>
            {"  "}•{"  "}
            {Object.entries(counts).map(([k, v]) => `${k}:${v}`).join("  ")}
          </span>
        ) : null}
      </div>

      <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
        {rows.slice(0, 6).map((r) => (
          <div key={String(r.id)} style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, padding: 10 }}>
            <div style={{ fontWeight: 900 }}>
              {String(r.achievement_name || r.type_name || r.title || r.kind || "Achievement")}
              <span style={{ opacity: 0.75, fontSize: 12 }}>  •  {String(r.status || "unknown")}</span>
            </div>
            <div style={{ marginTop: 6, opacity: 0.8, fontSize: 12 }}>
              State: {String(r.state_code || r.state || "—")}
              {"  "}•{"  "}
              Progress: {String(r.progress_count ?? r.progress ?? "—")}/{String(r.required_count ?? r.required ?? "—")}
            </div>
          </div>
        ))}
        {!rows.length && !status ? <div style={{ opacity: 0.8 }}>No achievement requests yet.</div> : null}
      </div>
    </div>
  );
}
