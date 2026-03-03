import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type Row = Record<string, any>;

function norm(s: any) { return String(s ?? "").trim(); }
function normLower(s: any) { return String(s ?? "").trim().toLowerCase(); }

export default function StateMyAdminAchievementsPanel(props: { stateCode: string; title?: string; limit?: number }) {
  const stateCode = norm(props.stateCode) || "789";
  const limit = Math.max(1, Number(props.limit ?? 25) || 25);

  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState<string>("");

  const title = props.title ?? "✅ Admin-added achievements (your account)";

  async function load() {
    setStatus("Loading…");
    setRows([]);

    const u = await supabase.auth.getUser();
    const uid = u.data?.user?.id || null;
    if (!uid) { setStatus("Sign in to see admin-added achievements."); return; }

    const p = await supabase.from("players").select("id").eq("auth_user_id", uid).maybeSingle();
    if (p.error || !p.data?.id) {
      setStatus("Player profile not linked yet.");
      return;
    }

    const r = await supabase
      .from("state_player_achievements")
      .select("*")
      .eq("state_code", stateCode)
      .eq("player_id", String(p.data.id))
      .order("created_at", { ascending: false })
      .limit(limit);

    if (r.error) {
      const msg = String(r.error.message || "");
      if (msg.toLowerCase().includes("could not find the table")) { setStatus(""); setRows([]); return; }
      setStatus(msg);
      return;
    }

    setRows((r.data ?? []) as any);
    setStatus("");
  }

  useEffect(() => { void load(); }, [stateCode]);

  const pretty = useMemo(() => {
    return rows.map((r) => {
      const t = norm(r.title || r.achievement || r.name || "Achievement");
      const st = normLower(r.status || "completed");
      const pct = r.progress_percent != null ? Number(r.progress_percent) : null;
      const note = norm(r.note || "");
      const created = norm(r.created_at || "");
      return { id: String(r.id), title: t, status: st, pct, note, created };
    });
  }, [rows]);

  return (
    <div className="zombie-card" style={{ marginTop: 12 }}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ fontWeight: 900 }}>{title}</div>
        <div style={{ marginLeft: "auto", opacity: 0.75, fontSize: 12 }}>{status || (pretty.length ? `${pretty.length} item(s)` : " ")}</div>
      </div>

      {!status && pretty.length === 0 ? (
        <div style={{ marginTop: 10, opacity: 0.75 }}>None yet.</div>
      ) : null}

      {pretty.length ? (
        <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
          {pretty.map((r) => (
            <div key={r.id} style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.20)" }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ fontWeight: 900 }}>{r.title}</div>
                <div style={{ marginLeft: "auto", fontWeight: 900, fontSize: 12, opacity: 0.9 }}>
                  {r.status}{r.pct != null ? ` • ${Math.round(r.pct)}%` : ""}
                </div>
              </div>
              {r.note ? <div style={{ marginTop: 6, opacity: 0.8, fontSize: 12 }}>{r.note}</div> : null}
              {r.created ? <div style={{ marginTop: 6, opacity: 0.6, fontSize: 12 }}>added: {r.created}</div> : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
