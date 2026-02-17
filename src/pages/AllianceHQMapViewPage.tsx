import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

type AnyRow = Record<string, any>;

function upper(v: any) {
  return String(v ?? "").trim().toUpperCase();
}

export default function AllianceHQMapViewPage() {
  const params = useParams();
  const allianceCode = useMemo(() => upper((params as any)?.allianceCode), [params]);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [rows, setRows] = useState<AnyRow[]>([]);
  const [source, setSource] = useState<"alliance_hq_map" | "hq_map" | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setErr(null);
      setRows([]);
      setSource(null);

      try {
        if (!allianceCode) throw new Error("Missing alliance code.");

        // Try new-ish table first: alliance_hq_map (alliance_id is TEXT per your schema)
        const resA = await supabase
          .from("alliance_hq_map")
          .select("*")
          .eq("alliance_id", allianceCode)
          .order("slot_number", { ascending: true });

        if (!resA.error && Array.isArray(resA.data)) {
          if (!cancelled) {
            setRows(resA.data as AnyRow[]);
            setSource("alliance_hq_map");
            setLoading(false);
          }
          return;
        }

        // Fallback: hq_map (legacy)
        const resB = await supabase
          .from("hq_map")
          .select("*")
          .eq("alliance_id", allianceCode)
          .order("order_index", { ascending: true });

        if (resB.error) throw resB.error;

        if (!cancelled) {
          setRows((resB.data ?? []) as AnyRow[]);
          setSource("hq_map");
          setLoading(false);
        }
      } catch (e: any) {
        if (!cancelled) {
          setErr(e?.message ?? String(e));
          setLoading(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [allianceCode]);

  if (loading) return <div style={{ padding: 16 }}>Loading HQ Map…</div>;

  return (
    <div style={{ padding: 16, maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h2 style={{ margin: 0 }}>🗺️ HQ Map (View Only) — {allianceCode}</h2>
        <Link to={`/dashboard/${encodeURIComponent(allianceCode)}`} style={{ opacity: 0.85 }}>
          ← Back to Dashboard
        </Link>
      </div>

      <div style={{ marginTop: 8, fontSize: 12, opacity: 0.75 }}>
        This is a read-only view page (Option 1 UI-only). Owners/R4/R5 should use the normal HQ Map page.
      </div>

      {err ? (
        <div style={{ marginTop: 12, padding: 12, border: "1px solid rgba(255,0,0,0.35)", borderRadius: 12 }}>
          <b>Error:</b> {err}
        </div>
      ) : null}

      {rows.length === 0 ? (
        <div style={{ marginTop: 12, opacity: 0.75 }}>No HQ map rows found.</div>
      ) : (
        <div style={{ marginTop: 12, border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: 12 }}>
          <div style={{ fontSize: 12, opacity: 0.7 }}>
            Data source: <b>{source ?? "unknown"}</b>
          </div>

          <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
            {rows.map((r, i) => {
              const key = String(r?.id ?? `${source}_${i}`);

              if (source === "alliance_hq_map") {
                const slot = r?.slot_number ?? "";
                const sx = r?.slot_x ?? "";
                const sy = r?.slot_y ?? "";
                const label = r?.label ?? "";
                const px = r?.player_x ?? "";
                const py = r?.player_y ?? "";
                return (
                  <div key={key} style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: 12, padding: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                      <div>
                        <div style={{ fontWeight: 800 }}>
                          Slot {slot} ({sx},{sy})
                        </div>
                        <div style={{ opacity: 0.85 }}>{String(label || "—")}</div>
                      </div>
                      <div style={{ opacity: 0.8 }}>
                        Player Coords: <b>{String(px || "—")},{String(py || "—")}</b>
                      </div>
                    </div>
                  </div>
                );
              }

              // legacy hq_map
              const name = r?.player_name ?? "—";
              const hqLabel = r?.hq_label ?? r?.label ?? "—";
              const cx = r?.coord_x ?? "";
              const cy = r?.coord_y ?? "";
              const notes = r?.notes ?? "";
              return (
                <div key={key} style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: 12, padding: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontWeight: 800 }}>{String(name)}</div>
                      <div style={{ opacity: 0.85 }}>{String(hqLabel)}</div>
                      {notes ? <div style={{ marginTop: 6, opacity: 0.75, fontSize: 12 }}>{String(notes)}</div> : null}
                    </div>
                    <div style={{ opacity: 0.8 }}>
                      Coords: <b>{String(cx || "—")},{String(cy || "—")}</b>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
