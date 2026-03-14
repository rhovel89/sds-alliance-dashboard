import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseBrowserClient";

type Row = {
  id: string;
  created_at: string;
  severity?: "info" | "warning" | "critical" | null;
  title?: string | null;
  body?: string | null;
  pinned?: boolean | null;
  is_acked?: boolean | null;
  created_by_name?: string | null;
};

function fmt(v?: string | null) {
  if (!v) return "—";
  try { return new Date(v).toLocaleString(); } catch { return String(v); }
}

function snip(v?: string | null, n = 160) {
  const s = String(v ?? "").replace(/\s+/g, " ").trim();
  if (!s) return "(no details)";
  return s.length > n ? s.slice(0, n) + "…" : s;
}

function tone(sev?: string | null) {
  const s = String(sev ?? "").toLowerCase();
  if (s === "critical") return { badge: "rgba(255,120,120,0.18)", border: "rgba(255,120,120,0.32)" };
  if (s === "warning") return { badge: "rgba(255,210,120,0.16)", border: "rgba(255,210,120,0.28)" };
  return { badge: "rgba(120,190,255,0.14)", border: "rgba(120,190,255,0.24)" };
}

export default function MeStateAlertsCard() {
  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState("");
  const stateCode = "789";

  async function load() {
    setStatus("Loading…");
    const res = await supabase
      .from("v_my_state_alerts")
      .select("*")
      .eq("state_code", stateCode)
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(12);

    if (res.error) {
      setRows([]);
      setStatus(res.error.message);
      return;
    }

    setRows((res.data ?? []) as Row[]);
    setStatus("");
  }

  useEffect(() => {
    void load();
    const id = window.setInterval(() => { void load(); }, 30000);
    return () => window.clearInterval(id);
  }, []);

  const unacked = useMemo(() => rows.filter((r) => !r.is_acked).length, [rows]);
  const top = useMemo(() => {
    const pinned = rows.filter((r) => !!r.pinned);
    return (pinned.length ? pinned : rows).slice(0, 3);
  }, [rows]);

  return (
    <div className="zombie-card" style={{ padding: 14, borderRadius: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div>
          <div style={{ fontWeight: 950, fontSize: 16 }}>🚨 State Alerts</div>
          <div style={{ opacity: 0.78, fontSize: 12 }}>
            State {stateCode} • {status ? status : `${rows.length} live item(s)`}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ fontSize: 12, opacity: 0.84 }}>
            Unacked <b>{unacked}</b>
          </div>
          <button type="button" className="zombie-btn" onClick={() => void load()}>
            Refresh
          </button>
        </div>
      </div>

      <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
        {top.length === 0 ? (
          <div style={{ opacity: 0.72 }}>No state alerts yet.</div>
        ) : (
          top.map((r) => {
            const t = tone(r.severity);
            return (
              <div
                key={r.id}
                style={{
                  border: `1px solid ${t.border}`,
                  background: "rgba(255,255,255,0.03)",
                  borderRadius: 14,
                  padding: 12,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 900,
                          letterSpacing: 0.3,
                          padding: "4px 8px",
                          borderRadius: 999,
                          background: t.badge,
                          border: `1px solid ${t.border}`,
                        }}
                      >
                        {(String(r.severity ?? "info")).toUpperCase()}
                      </span>
                      {r.pinned ? <span style={{ fontSize: 12, opacity: 0.85 }}>📌 Pinned</span> : null}
                    </div>

                    <div style={{ fontWeight: 900, marginTop: 8 }}>
                      {String(r.title ?? "State alert")}
                    </div>

                    <div style={{ opacity: 0.78, fontSize: 13, lineHeight: 1.45, marginTop: 6 }}>
                      {snip(r.body)}
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 8, opacity: 0.68, fontSize: 12 }}>
                  {fmt(r.created_at)} • {String(r.created_by_name ?? "Unknown")}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div style={{ marginTop: 10 }}>
        <Link to="/state/789/alerts-db">Open full state alerts</Link>
      </div>
    </div>
  );
}
