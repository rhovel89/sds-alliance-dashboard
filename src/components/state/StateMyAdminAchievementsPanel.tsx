import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type Row = Record<string, any>;

export default function StateMyAdminAchievementsPanel(props: {
  stateCode: string;
  title?: string;
  limit?: number;
}) {
  const stateCode = String(props.stateCode || "").trim();
  const title = props.title || "✅ Admin-added achievements for you";
  const limit = Number(props.limit || 25);

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [msg, setMsg] = useState<string>("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setMsg("");
      setRows([]);

      try {
        const u = await supabase.auth.getUser();
        const uid = u.data?.user?.id || null;
        if (!uid) {
          if (!cancelled) { setMsg("Sign in to see admin-added achievements."); setLoading(false); }
          return;
        }

        const p = await supabase
          .from("players")
          .select("id,game_name,name")
          .eq("auth_user_id", uid)
          .maybeSingle();

        const playerId = p.data?.id ? String(p.data.id) : null;
        if (!playerId) {
          if (!cancelled) { setMsg("Player profile not found yet. Complete onboarding first."); setLoading(false); }
          return;
        }

        const r = await supabase
          .from("state_player_achievements")
          .select("*")
          .eq("state_code", stateCode)
          .eq("player_id", playerId)
          .order("created_at", { ascending: false })
          .limit(limit);

        if (r.error) throw r.error;

        if (!cancelled) {
          setRows((r.data as any[]) || []);
          setLoading(false);
        }
      } catch (e: any) {
        if (!cancelled) {
          setMsg(e?.message ?? String(e));
          setRows([]);
          setLoading(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [stateCode, limit]);

  return (
    <div className="zombie-card" style={{ marginTop: 12 }}>
      <div style={{ padding: 14 }}>
        <div style={{ fontWeight: 950 }}>{title}</div>

        {loading ? (
          <div style={{ opacity: 0.8, marginTop: 8 }}>Loading…</div>
        ) : msg ? (
          <div style={{ opacity: 0.85, marginTop: 8 }}>
            <b>Notice:</b> {msg}
          </div>
        ) : rows.length === 0 ? (
          <div style={{ opacity: 0.8, marginTop: 8 }}>No admin-added achievements yet.</div>
        ) : (
          <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
            {rows.map((r) => (
              <div key={String(r.id)} style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)" }}>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "baseline" }}>
                  <div style={{ fontWeight: 950 }}>{String(r.title || "Achievement")}</div>
                  <div style={{ marginLeft: "auto", opacity: 0.75, fontSize: 12 }}>
                    {String(r.created_at || "")}
                  </div>
                </div>
                <div style={{ opacity: 0.8, marginTop: 4 }}>
                  status: <b>{String(r.status || "—")}</b>{" "}
                  {typeof r.progress_percent === "number" ? <span style={{ opacity: 0.75 }}> • {r.progress_percent}%</span> : null}
                </div>
                {r.note ? <div style={{ opacity: 0.8, marginTop: 6 }}>{String(r.note)}</div> : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
