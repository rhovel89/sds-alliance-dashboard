import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseBrowserClient";

type Row = {
  id: string;
  created_at: string;
  severity: "info" | "warning" | "critical";
  title: string;
  body?: string | null;
  pinned: boolean;
  is_acked: boolean;
  created_by_name?: string | null;
};

function sevTone(sev: string) {
  const s = String(sev || "").toLowerCase();
  if (s === "critical") return "rgba(255,100,100,0.18)";
  if (s === "warning") return "rgba(255,190,80,0.18)";
  return "rgba(120,180,255,0.16)";
}

export default function MeStateAlertsPanel(props: { stateCode?: string | null }) {
  const stateCode = String(props.stateCode || "789").trim() || "789";
  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState("");

  async function load() {
    setStatus("Loading…");
    const res = await supabase
      .from("v_my_state_alerts")
      .select("*")
      .eq("state_code", stateCode)
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(8);

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
  }, [stateCode]);

  const pinned = useMemo(() => rows.filter((r) => !!r.pinned).slice(0, 3), [rows]);
  const unacked = useMemo(() => rows.filter((r) => !r.is_acked).length, [rows]);
  const link = `/state/${encodeURIComponent(stateCode)}/alerts-db`;

  return (
    <div className="zombie-card" style={{ borderRadius: 18, padding: 14, minHeight: 220 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <div style={{ fontWeight: 950, fontSize: 16 }}>🚨 State Alerts</div>
          <div style={{ opacity: 0.72, fontSize: 12 }}>
            State {stateCode} live alert feed {status ? `• ${status}` : ""}
          </div>
        </div>
        <Link to={link} style={{ fontSize: 12 }}>Open feed</Link>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
        <div style={{ padding: "8px 10px", borderRadius: 12, background: "rgba(255,255,255,0.05)", fontSize: 12 }}>
          Total <b>{rows.length}</b>
        </div>
        <div style={{ padding: "8px 10px", borderRadius: 12, background: "rgba(255,255,255,0.05)", fontSize: 12 }}>
          Unacked <b>{unacked}</b>
        </div>
        <div style={{ padding: "8px 10px", borderRadius: 12, background: "rgba(255,255,255,0.05)", fontSize: 12 }}>
          Pinned <b>{pinned.length}</b>
        </div>
      </div>

      <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
        {(pinned.length ? pinned : rows.slice(0, 3)).map((r) => (
          <div
            key={r.id}
            style={{
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: 14,
              padding: 10,
              background: sevTone(r.severity),
            }}
          >
            <div style={{ fontWeight: 900 }}>
              {r.pinned ? "📌 " : ""}[{String(r.severity || "info").toUpperCase()}] {r.title || "State alert"}
            </div>
            <div style={{ opacity: 0.72, fontSize: 12, marginTop: 4 }}>
              {new Date(r.created_at).toLocaleString()} • {r.created_by_name || "Unknown"}
            </div>
            {r.body ? (
              <div style={{ opacity: 0.86, fontSize: 13, marginTop: 6, lineHeight: 1.4 }}>
                {String(r.body).slice(0, 160)}{String(r.body).length > 160 ? "…" : ""}
              </div>
            ) : null}
          </div>
        ))}

        {rows.length === 0 ? (
          <div style={{ opacity: 0.7, fontSize: 13 }}>No live state alerts yet.</div>
        ) : null}
      </div>
    </div>
  );
}
