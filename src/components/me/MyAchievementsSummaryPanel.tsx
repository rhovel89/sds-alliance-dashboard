import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { getCanonicalPlayerIdForUser } from "../../utils/getCanonicalPlayerId";

type Row = Record<string, any>;

export default function MyAchievementsSummaryPanel() {
  const [requests, setRequests] = useState<Row[]>([]);
  const [adminRows, setAdminRows] = useState<Row[]>([]);
  const [status, setStatus] = useState<string>("");

  async function load() {
    setStatus("Loading…");
    try {
      const u = await supabase.auth.getUser();
      const uid = u.data?.user?.id || null;
      if (!uid) { setStatus("Not logged in."); setRequests([]); setAdminRows([]); return; }

      // Requests (what YOU submitted)
      const r = await supabase
        .from("state_achievement_requests")
        .select("*")
        .eq("requester_user_id", uid)
        .order("created_at", { ascending: false })
        .limit(25);

      if (!r.error) setRequests((r.data ?? []) as any);

      // Admin-added achievements (what STAFF assigned to YOUR player_id)
      const pid = await getCanonicalPlayerIdForUser(uid);
      if (pid) {
        const a = await supabase
          .from("state_player_achievements")
          .select("*")
          .eq("player_id", pid)
          .order("created_at", { ascending: false })
          .limit(25);
        if (!a.error) setAdminRows((a.data ?? []) as any);
      } else {
        setAdminRows([]);
      }

      setStatus("");
    } catch (e: any) {
      setStatus(String(e?.message || e || "Error"));
      setRequests([]);
      setAdminRows([]);
    }
  }

  useEffect(() => { void load(); }, []);

  const reqCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of requests) {
      const s = String(r.status || r.state || "unknown").toLowerCase();
      c[s] = (c[s] || 0) + 1;
    }
    return c;
  }, [requests]);

  const adminCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of adminRows) {
      const s = String(r.status || "tracked").toLowerCase();
      c[s] = (c[s] || 0) + 1;
    }
    return c;
  }, [adminRows]);

  return (
    <div className="zombie-card" style={{ padding: 14, borderRadius: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ fontWeight: 950 }}>🏆 My Achievements</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <a href="/state/789/achievements" style={{ textDecoration: "none" }}><button className="zombie-btn" type="button">Open State Achievements</button></a>
          <button className="zombie-btn" type="button" onClick={() => void load()}>Refresh</button>
        </div>
      </div>

      <div style={{ marginTop: 6, opacity: 0.85, fontSize: 12 }}>
        {status ? status : `Requests: ${requests.length} • Admin-added: ${adminRows.length}`}
      </div>

      <div style={{ marginTop: 10, display: "grid", gap: 12 }}>
        <div style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, padding: 10 }}>
          <div style={{ fontWeight: 900 }}>My Requests</div>
          <div style={{ opacity: 0.75, fontSize: 12, marginTop: 4 }}>
            {Object.keys(reqCounts).length ? Object.entries(reqCounts).map(([k,v]) => `${k}:${v}`).join("  ") : "No requests yet."}
          </div>
          <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
            {requests.slice(0, 5).map((r) => (
              <div key={String(r.id)} style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: 12, padding: 10 }}>
                <div style={{ fontWeight: 900 }}>
                  {String(r.achievement_name || r.type_name || r.title || r.kind || "Achievement")}
                  <span style={{ opacity: 0.75, fontSize: 12 }}>  •  {String(r.status || "unknown")}</span>
                </div>
                <div style={{ marginTop: 6, opacity: 0.8, fontSize: 12 }}>
                  State: {String(r.state_code || r.state || "—")}  •  Progress: {String(r.progress_count ?? r.progress ?? "—")}/{String(r.required_count ?? r.required ?? "—")}
                </div>
              </div>
            ))}
            {!requests.length && !status ? <div style={{ opacity: 0.8 }}>No requests yet.</div> : null}
          </div>
        </div>

        <div style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, padding: 10 }}>
          <div style={{ fontWeight: 900 }}>Admin-added / Tracked For Me</div>
          <div style={{ opacity: 0.75, fontSize: 12, marginTop: 4 }}>
            {Object.keys(adminCounts).length ? Object.entries(adminCounts).map(([k,v]) => `${k}:${v}`).join("  ") : "No admin-added items yet."}
          </div>
          <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
            {adminRows.slice(0, 5).map((r) => (
              <div key={String(r.id)} style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: 12, padding: 10 }}>
                <div style={{ fontWeight: 900 }}>{String(r.title || r.achievement_name || r.type_name || "Achievement")}</div>
                <div style={{ marginTop: 6, opacity: 0.8, fontSize: 12 }}>
                  State: {String(r.state_code || "—")}  •  Status: <b>{String(r.status || "tracked")}</b>
                  {typeof r.progress_percent === "number" ? <span style={{ opacity: 0.75 }}>  •  {r.progress_percent}%</span> : null}
                </div>
                {r.note ? <div style={{ marginTop: 6, opacity: 0.8, fontSize: 12 }}>{String(r.note)}</div> : null}
              </div>
            ))}
            {!adminRows.length && !status ? <div style={{ opacity: 0.8 }}>No admin-added achievements yet.</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

