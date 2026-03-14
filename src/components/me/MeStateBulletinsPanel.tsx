import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseBrowserClient";

type Row = {
  id: string;
  title: string | null;
  body: string;
  pinned: boolean;
  created_at: string;
  deleted?: boolean;
};

export default function MeStateBulletinsPanel(props: { stateCode?: string | null }) {
  const stateCode = String(props.stateCode || "789").trim() || "789";
  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState("");

  async function load() {
    setStatus("Loading…");
    const res = await supabase
      .from("state_bulletins")
      .select("id,title,body,pinned,created_at,deleted")
      .eq("state_code", stateCode)
      .eq("deleted", false)
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

  return (
    <div className="zombie-card" style={{ borderRadius: 18, padding: 14, minHeight: 220 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <div style={{ fontWeight: 950, fontSize: 16 }}>📣 State Announcements</div>
          <div style={{ opacity: 0.72, fontSize: 12 }}>
            Bulletin board for State {stateCode} {status ? `• ${status}` : ""}
          </div>
        </div>
        <Link to={`/state/${encodeURIComponent(stateCode)}`} style={{ fontSize: 12 }}>Open state hub</Link>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
        <div style={{ padding: "8px 10px", borderRadius: 12, background: "rgba(255,255,255,0.05)", fontSize: 12 }}>
          Total <b>{rows.length}</b>
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
              background: "rgba(255,255,255,0.04)",
            }}
          >
            <div style={{ fontWeight: 900 }}>
              {r.pinned ? "📌 " : ""}{r.title || "State bulletin"}
            </div>
            <div style={{ opacity: 0.72, fontSize: 12, marginTop: 4 }}>
              {new Date(r.created_at).toLocaleString()}
            </div>
            <div style={{ opacity: 0.86, fontSize: 13, marginTop: 6, lineHeight: 1.4 }}>
              {String(r.body || "").slice(0, 160)}{String(r.body || "").length > 160 ? "…" : ""}
            </div>
          </div>
        ))}

        {rows.length === 0 ? (
          <div style={{ opacity: 0.7, fontSize: 13 }}>No state announcements yet.</div>
        ) : null}
      </div>
    </div>
  );
}
