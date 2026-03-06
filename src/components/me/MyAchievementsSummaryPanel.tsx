import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { resolveMyPlayerIdentity } from "../../lib/playerIdentity";

type AnyRow = any;

export default function MyAchievementsSummaryPanel() {
  const [status, setStatus] = useState("");
  const [requests, setRequests] = useState<AnyRow[]>([]);
  const [adminRows, setAdminRows] = useState<AnyRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setStatus("");

      // 1) Requests (by name typically; keep existing behavior)
      const r = await supabase
        .from("state_achievement_requests")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(25);

      if (!cancelled && !r.error) setRequests((r.data || []) as any[]);

      // 2) Admin-awarded achievements (by canonical player_id)
      const id = await resolveMyPlayerIdentity();
      if (!id.playerId) {
        if (!cancelled) setAdminRows([]);
        return;
      }

      const a = await supabase
        .from("state_player_achievements")
        .select("*")
        .eq("player_id", id.playerId)
        .order("awarded_at", { ascending: false })
        .limit(20);

      if (!cancelled) {
        if (a.error) setStatus(a.error.message);
        else setAdminRows((a.data || []) as any[]);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  return (
    <div style={{ border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: 12 }}>
      <div style={{ fontWeight: 950 }}>🏆 My Achievements</div>
      {status ? <div style={{ marginTop: 8, fontSize: 12, opacity: 0.85 }}>{status}</div> : null}

      <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
        <a href="/state/789/achievements" style={{ textDecoration: "none" }}>
          <button className="zombie-btn" type="button">Open State Achievements</button>
        </a>
        <a href="/me/dossier" style={{ textDecoration: "none" }}>
          <button className="zombie-btn" type="button">Open Dossier Sheet</button>
        </a>
      </div>

      <div style={{ marginTop: 12, fontWeight: 900, opacity: 0.9 }}>Admin-awarded</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
        {adminRows.map((r: any, i: number) => (
          <div key={String(r.id || i)} style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.18)", borderRadius: 12, padding: 10 }}>
            <div style={{ fontWeight: 900 }}>{String(r.title || r.achievement_name || "Achievement")}</div>
            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
              {r.awarded_at ? new Date(String(r.awarded_at)).toLocaleString() : ""}
              {r.alliance_code ? ` • ${String(r.alliance_code)}` : ""}
            </div>
          </div>
        ))}
        {!adminRows.length ? <div style={{ opacity: 0.75, fontSize: 12 }}>No admin-awarded achievements yet.</div> : null}
      </div>

      <div style={{ marginTop: 12, fontWeight: 900, opacity: 0.9 }}>Recent requests</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
        {requests.slice(0, 8).map((r: any, i: number) => (
          <div key={String(r.id || i)} style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.14)", borderRadius: 12, padding: 10 }}>
            <div style={{ fontWeight: 900 }}>{String(r.title || r.achievement_name || r.type_name || "Request")}</div>
            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
              {r.created_at ? new Date(String(r.created_at)).toLocaleString() : ""}
              {r.status ? ` • ${String(r.status)}` : ""}
            </div>
          </div>
        ))}
        {!requests.length ? <div style={{ opacity: 0.75, fontSize: 12 }}>No requests yet.</div> : null}
      </div>
    </div>
  );
}
