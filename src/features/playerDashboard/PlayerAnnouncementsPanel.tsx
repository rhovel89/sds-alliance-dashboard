import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useResolvedPlayer } from "./useResolvedPlayer";

type Row = any;

export function PlayerAnnouncementsPanel(props: { targetPlayerId?: string }) {
  const { loading: plLoading, error: plErr, allianceCodes } = useResolvedPlayer(props.targetPlayerId);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setErr(null);
      setRows([]);

      if (!allianceCodes || allianceCodes.length === 0) return;

      setLoading(true);
      try {
        // pull a few across all alliances
        const { data, error } = await supabase
          .from("alliance_announcements")
          .select("id,alliance_code,title,body,pinned,created_at")
          .in("alliance_code", allianceCodes)
          .order("pinned", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(12);

        if (error) throw error;
        if (!cancelled) setRows((data ?? []) as any[]);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message ?? String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [allianceCodes.join("|")]);

  const grouped = useMemo(() => {
    const map: Record<string, Row[]> = {};
    for (const r of (rows || [])) {
      const code = String(r.alliance_code || "").toUpperCase();
      if (!code) continue;
      if (!map[code]) map[code] = [];
      map[code].push(r);
    }
    return map;
  }, [rows]);

  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline", flexWrap: "wrap" }}>
        <h3 style={{ margin: 0 }}>📣 Announcements</h3>
        <div style={{ opacity: 0.75, fontSize: 12 }}>
          Latest from your alliances
        </div>
      </div>

      {plLoading ? <div style={{ marginTop: 10, opacity: 0.8 }}>Loading…</div> : null}
      {plErr ? (
        <div style={{ marginTop: 10, padding: 10, borderRadius: 12, border: "1px solid rgba(255,0,0,0.35)" }}>
          <b>Error:</b> {plErr}
        </div>
      ) : null}

      {loading ? <div style={{ marginTop: 10, opacity: 0.8 }}>Loading announcements…</div> : null}
      {err ? (
        <div style={{ marginTop: 10, padding: 10, borderRadius: 12, border: "1px solid rgba(255,0,0,0.35)" }}>
          <b>Error:</b> {err}
        </div>
      ) : null}

      {!plLoading && !plErr && !loading && !err && rows.length === 0 ? (
        <div style={{ marginTop: 10, opacity: 0.75 }}>No announcements yet.</div>
      ) : null}

      {Object.keys(grouped).length > 0 ? (
        <div style={{ marginTop: 10, display: "grid", gap: 12 }}>
          {Object.entries(grouped).map(([code, list]) => (
            <div key={code} style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ fontWeight: 900 }}>{code}</div>
                <Link to={`/dashboard/${encodeURIComponent(code)}`} style={{ opacity: 0.85 }}>
                  Open dashboard →
                </Link>
              </div>

              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                {list.slice(0, 4).map((a: any) => (
                  <div key={a.id} style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                      <div style={{ fontWeight: 800 }}>
                        {a.title || "Announcement"}
                        {a.pinned ? <span style={{ marginLeft: 8, opacity: 0.75, fontSize: 12 }}>📌</span> : null}
                      </div>
                      <div style={{ opacity: 0.6, fontSize: 12 }}>
                        {a.created_at ? new Date(a.created_at).toLocaleString() : ""}
                      </div>
                    </div>
                    {a.body ? (
                      <div style={{ marginTop: 6, opacity: 0.85, whiteSpace: "pre-wrap" }}>
                        {String(a.body).slice(0, 240)}
                        {String(a.body).length > 240 ? "…" : ""}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
