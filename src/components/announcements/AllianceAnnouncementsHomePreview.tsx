import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

type Row = {
  id: string;
  title: string | null;
  body: string | null;
  pinned: boolean | null;
  created_at: string | null;
};

export default function AllianceAnnouncementsHomePreview() {
  const { alliance_id } = useParams();
  const allianceCode = useMemo(() => String(alliance_id || "").toUpperCase(), [alliance_id]);

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!allianceCode) return;
      setLoading(true);
      setErr(null);

      const q = supabase
        .from("alliance_announcements" as any)
        .select("id,title,body,pinned,created_at")
        .eq("alliance_code", allianceCode)
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(3);

      const res = await q;
      if (cancelled) return;

      if (res.error) {
        setErr(res.error.message);
        setRows([]);
      } else {
        setRows((res.data as any) || []);
      }

      setLoading(false);
    }

    run();
    return () => { cancelled = true; };
  }, [allianceCode]);

  return (
    <div className="zombie-card" style={{ padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ fontWeight: 900, fontSize: 16 }}>📣 Announcements</div>
        <Link to={/dashboard//announcements} style={{ opacity: 0.85 }}>
          View all →
        </Link>
      </div>

      {loading ? <div style={{ opacity: 0.75, marginTop: 10 }}>Loading…</div> : null}
      {err ? (
        <div style={{ color: "#ffb3b3", marginTop: 10, fontSize: 12 }}>
          Error: {err}
        </div>
      ) : null}

      <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
        {rows.map((a) => (
          <div key={a.id} style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.20)" }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ fontWeight: 900 }}>
                {a.pinned ? "📌 " : ""}{(a.title || "Untitled").toString()}
              </div>
              <div style={{ marginLeft: "auto", opacity: 0.6, fontSize: 12 }}>
                {a.created_at ? new Date(a.created_at).toLocaleString() : ""}
              </div>
            </div>
            {a.body ? (
              <div style={{ marginTop: 8, opacity: 0.85, whiteSpace: "pre-wrap" }}>
                {String(a.body).slice(0, 220)}{String(a.body).length > 220 ? "…" : ""}
              </div>
            ) : null}
          </div>
        ))}
        {(!loading && !err && rows.length === 0) ? (
          <div style={{ opacity: 0.75 }}>No announcements yet.</div>
        ) : null}
      </div>

      <div style={{ marginTop: 10, opacity: 0.6, fontSize: 12 }}>
        Tip: use the Announcements tab to manage posts.
      </div>
    </div>
  );
}