import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type HqRow = {
  id: string;
  alliance_id: string | null;
  label?: string | null;
  slot_number?: number | null;
  slot_x?: number | null;
  slot_y?: number | null;
  player_x?: number | null;
  player_y?: number | null;
  player_hq_id?: string | null;
  updated_at?: string | null;
};

export default function PlayerHqsPanel(props: { userId: string; allianceCodes: string[] }) {
  const { userId, allianceCodes } = props;
  const [rows, setRows] = useState<HqRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const allianceSet = useMemo(
    () => new Set((allianceCodes || []).map((x) => String(x || "").toUpperCase())),
    [allianceCodes]
  );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setErr(null);

      try {
        const { data, error } = await supabase
          .from("alliance_hq_map")
          .select("id,alliance_id,label,slot_number,slot_x,slot_y,player_x,player_y,player_hq_id,updated_at,assigned_user_id")
          .eq("assigned_user_id", userId)
          .order("updated_at", { ascending: false });

        if (error) {
          setErr(error.message);
          setRows([]);
          return;
        }

        const all = (data || []) as any[];
        const filtered = all.filter((r) => {
          const a = String(r?.alliance_id ?? "").toUpperCase();
          return allianceSet.size === 0 ? true : allianceSet.has(a);
        });

        if (!cancelled) setRows(filtered as HqRow[]);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message ?? String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [userId, allianceSet]);

  return (
    <div style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: 12 }}>
      <h3 style={{ marginTop: 0 }}>🏠 Your HQs</h3>

      {loading ? <div>Loading…</div> : null}
      {err ? (
        <div style={{ marginTop: 10, padding: 10, border: "1px solid rgba(255,0,0,0.35)", borderRadius: 10 }}>
          <b>Error:</b> {err}
        </div>
      ) : null}

      {!loading && !err && rows.length === 0 ? (
        <div style={{ opacity: 0.75 }}>No HQs assigned yet.</div>
      ) : null}

      <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
        {rows.map((r) => {
          const a = String(r.alliance_id ?? "").toUpperCase() || "UNKNOWN";
          return (
            <div key={r.id} style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontWeight: 900 }}>{a}</div>
                  <div style={{ opacity: 0.85 }}>{r.label ?? "HQ"}</div>
                </div>

                <div style={{ textAlign: "right", fontSize: 13, opacity: 0.9 }}>
                  {r.slot_number != null ? <div>Slot: {r.slot_number}</div> : null}
                  {(r.slot_x != null && r.slot_y != null) ? <div>Slot XY: {r.slot_x}, {r.slot_y}</div> : null}
                  {(r.player_x != null && r.player_y != null) ? <div>Player XY: {r.player_x}, {r.player_y}</div> : null}
                </div>
              </div>

              <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <a href={`/dashboard/${encodeURIComponent(a)}/hq-map`} style={{ opacity: 0.9 }}>
                  View HQ Map →
                </a>
                <a href={`/dashboard/${encodeURIComponent(a)}/calendar`} style={{ opacity: 0.9 }}>
                  View Events →
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
