import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseBrowserClient";

type Row = {
  id: string;
  title?: string | null;
  body?: string | null;
  pinned?: boolean | null;
  created_at?: string | null;
  deleted?: boolean | null;
};

function fmt(v?: string | null) {
  if (!v) return "—";
  try { return new Date(v).toLocaleString(); } catch { return String(v); }
}

function snip(v?: string | null, n = 170) {
  const s = String(v ?? "").replace(/\s+/g, " ").trim();
  if (!s) return "(no details)";
  return s.length > n ? s.slice(0, n) + "…" : s;
}

export default function MeStateAnnouncementsCard() {
  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState("");
  const stateCode = "789";

  async function load() {
    setStatus("Loading…");
    const res = await supabase
      .from("state_bulletins")
      .select("id,title,body,pinned,created_at,deleted")
      .eq("state_code", stateCode)
      .eq("deleted", false)
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

  const top = useMemo(() => {
    const pinned = rows.filter((r) => !!r.pinned);
    return (pinned.length ? pinned : rows).slice(0, 3);
  }, [rows]);

  const pinnedCount = useMemo(() => rows.filter((r) => !!r.pinned).length, [rows]);

  return (
    <div className="zombie-card" style={{ padding: 14, borderRadius: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div>
          <div style={{ fontWeight: 950, fontSize: 16 }}>📣 State Announcements</div>
          <div style={{ opacity: 0.78, fontSize: 12 }}>
            State {stateCode} • {status ? status : `${rows.length} live bulletin(s)`}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ fontSize: 12, opacity: 0.84 }}>
            Pinned <b>{pinnedCount}</b>
          </div>
          <button type="button" className="zombie-btn" onClick={() => void load()}>
            Refresh
          </button>
        </div>
      </div>

      <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
        {top.length === 0 ? (
          <div style={{ opacity: 0.72 }}>No state announcements yet.</div>
        ) : (
          top.map((r) => (
            <div
              key={r.id}
              style={{
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(255,255,255,0.03)",
                borderRadius: 14,
                padding: 12,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    {r.pinned ? (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 900,
                          letterSpacing: 0.3,
                          padding: "4px 8px",
                          borderRadius: 999,
                          background: "rgba(160,220,255,0.12)",
                          border: "1px solid rgba(160,220,255,0.22)",
                        }}
                      >
                        PINNED
                      </span>
                    ) : null}
                  </div>

                  <div style={{ fontWeight: 900, marginTop: 8 }}>
                    {String(r.title ?? "State bulletin")}
                  </div>

                  <div style={{ opacity: 0.78, fontSize: 13, lineHeight: 1.45, marginTop: 6 }}>
                    {snip(r.body)}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 8, opacity: 0.68, fontSize: 12 }}>
                {fmt(r.created_at)}
              </div>
            </div>
          ))
        )}
      </div>

      <div style={{ marginTop: 10 }}>
        <Link to="/state/789">Open state hub</Link>
      </div>
    </div>
  );
}
