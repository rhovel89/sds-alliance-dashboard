import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseBrowserClient";

type Row = {
  id: string;
  alliance_code: string;
  title: string;
  body?: string | null;
  pinned?: boolean | null;
  created_at?: string | null;
};

function upper(v: unknown) {
  return String(v ?? "").trim().toUpperCase();
}

export default function MeAllianceAnnouncementsPanel(props: { allianceId?: string | null; allianceCode?: string | null }) {
  const allianceCode = upper(props.allianceCode);
  const allianceId = String(props.allianceId || "");
  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState("");

  async function load() {
    if (!allianceCode) {
      setRows([]);
      setStatus("");
      return;
    }

    setStatus("Loading…");
    const res = await supabase
      .from("alliance_announcements")
      .select("id,alliance_code,title,body,pinned,created_at")
      .eq("alliance_code", allianceCode)
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
  }, [allianceCode]);

  const pinned = useMemo(() => rows.filter((r) => !!r.pinned).slice(0, 3), [rows]);
  const link = allianceId ? `/dashboard/${encodeURIComponent(allianceId)}/announcements` : "";

  return (
    <div className="zombie-card" style={{ borderRadius: 18, padding: 14, minHeight: 220 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <div style={{ fontWeight: 950, fontSize: 16 }}>📢 Alliance Announcements</div>
          <div style={{ opacity: 0.72, fontSize: 12 }}>
            {allianceCode ? `Alliance ${allianceCode}` : "Pick an alliance profile"} {status ? `• ${status}` : ""}
          </div>
        </div>
        {link ? <Link to={link} style={{ fontSize: 12 }}>Open feed</Link> : null}
      </div>

      {!allianceCode ? (
        <div style={{ marginTop: 12, opacity: 0.7, fontSize: 13 }}>
          Select an alliance profile below to see alliance announcements.
        </div>
      ) : (
        <>
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
                  {r.pinned ? "📌 " : ""}{r.title || "Announcement"}
                </div>
                <div style={{ opacity: 0.72, fontSize: 12, marginTop: 4 }}>
                  {r.created_at ? new Date(r.created_at).toLocaleString() : "—"}
                </div>
                {r.body ? (
                  <div style={{ opacity: 0.86, fontSize: 13, marginTop: 6, lineHeight: 1.4 }}>
                    {String(r.body).slice(0, 160)}{String(r.body).length > 160 ? "…" : ""}
                  </div>
                ) : null}
              </div>
            ))}

            {rows.length === 0 ? (
              <div style={{ opacity: 0.7, fontSize: 13 }}>No alliance announcements yet.</div>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
