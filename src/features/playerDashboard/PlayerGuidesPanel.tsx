import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useResolvedPlayer } from "./useResolvedPlayer";

type Row = any;

export function PlayerGuidesPanel(props: { targetPlayerId?: string }) {
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
        const { data, error } = await supabase
          .from("guide_sections")
          .select("id,alliance_code,title,description,mode,updated_at")
          .in("alliance_code", allianceCodes)
          .order("updated_at", { ascending: false })
          .limit(18);

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
        <h3 style={{ margin: 0 }}>📚 Guides</h3>
        <div style={{ opacity: 0.75, fontSize: 12 }}>
          Quick access to your sections
        </div>
      </div>

      {plLoading ? <div style={{ marginTop: 10, opacity: 0.8 }}>Loading…</div> : null}
      {plErr ? (
        <div style={{ marginTop: 10, padding: 10, borderRadius: 12, border: "1px solid rgba(255,0,0,0.35)" }}>
          <b>Error:</b> {plErr}
        </div>
      ) : null}

      {loading ? <div style={{ marginTop: 10, opacity: 0.8 }}>Loading guides…</div> : null}
      {err ? (
        <div style={{ marginTop: 10, padding: 10, borderRadius: 12, border: "1px solid rgba(255,0,0,0.35)" }}>
          <b>Error:</b> {err}
        </div>
      ) : null}

      {!plLoading && !plErr && !loading && !err && rows.length === 0 ? (
        <div style={{ marginTop: 10, opacity: 0.75 }}>No guide sections yet.</div>
      ) : null}

      {Object.keys(grouped).length > 0 ? (
        <div style={{ marginTop: 10, display: "grid", gap: 12 }}>
          {Object.entries(grouped).map(([code, list]) => (
            <div key={code} style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ fontWeight: 900 }}>{code}</div>
                <Link to={`/dashboard/${encodeURIComponent(code)}/guides`} style={{ opacity: 0.85 }}>
                  Open guides →
                </Link>
              </div>

              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                {list.slice(0, 5).map((s: any) => (
                  <Link
                    key={s.id}
                    to={`/dashboard/${encodeURIComponent(code)}/guides?section=${encodeURIComponent(String(s.id))}`}
                    style={{
                      textDecoration: "none",
                      color: "inherit",
                      border: "1px solid rgba(255,255,255,0.10)",
                      borderRadius: 12,
                      padding: 10,
                      display: "block",
                    }}
                  >
                    <div style={{ fontWeight: 800 }}>{s.title || "Untitled"}</div>
                    {s.description ? (
                      <div style={{ marginTop: 4, opacity: 0.8 }}>
                        {String(s.description).slice(0, 140)}{String(s.description).length > 140 ? "…" : ""}
                      </div>
                    ) : null}
                    <div style={{ marginTop: 6, opacity: 0.6, fontSize: 12 }}>
                      Updated: {s.updated_at ? new Date(s.updated_at).toLocaleString() : "—"}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
