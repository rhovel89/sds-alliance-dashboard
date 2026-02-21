import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type TypeRow = {
  id: string;
  name: string;
  required_count: number | null;
  requires_option: boolean | null;
  active: boolean | null;
};

type OptRow = {
  id: string;
  achievement_type_id: string;
  label: string;
  active: boolean | null;
};

type ReqRow = {
  id: string;
  state_code: string;
  player_name: string;
  alliance_name: string | null;
  achievement_type_id: string;
  option_id: string | null;
  status: string | null;
  current_count: number | null;
  required_count: number | null;
  completed_at: string | null;
  created_at: string | null;
};

type ProgressRow = {
  player: string;
  alliance: string | null;
  achievement: string;
  option: string | null;
  current: number;
  required: number;
  completed: boolean;
  status: string;
  updatedHint: string | null;
};

export default function StateAchievementsProgressPanel(props: { stateCode: string; limitPlayers?: number }) {
  const { stateCode, limitPlayers } = props;

  const [loading, setLoading] = useState<boolean>(true);
  const [err, setErr] = useState<string | null>(null);

  const [types, setTypes] = useState<TypeRow[]>([]);
  const [opts, setOpts] = useState<OptRow[]>([]);
  const [reqs, setReqs] = useState<ReqRow[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setErr(null);

      try {
        // 1) Types
        const t = await supabase
          .from("state_achievement_types")
          .select("id,name,required_count,requires_option,active")
          .eq("state_code", stateCode)
          .eq("active", true)
          .order("name", { ascending: true });

        if (t.error) throw new Error(`Types load failed: ${t.error.message}`);
        const typeRows: TypeRow[] = (t.data || []) as any;
        if (cancelled) return;
        setTypes(typeRows);

        // 2) Options for these types (if any)
        const typeIds = typeRows.map((x) => x.id).filter(Boolean);
        if (typeIds.length) {
          const o = await supabase
            .from("state_achievement_options")
            .select("id,achievement_type_id,label,active")
            .in("achievement_type_id", typeIds)
            .eq("active", true)
            .order("label", { ascending: true });

          if (o.error) throw new Error(`Options load failed: ${o.error.message}`);
          if (cancelled) return;
          setOpts(((o.data || []) as any) || []);
        } else {
          setOpts([]);
        }

        // 3) Requests
        const r = await supabase
          .from("state_achievement_requests")
          .select("id,state_code,player_name,alliance_name,achievement_type_id,option_id,status,current_count,required_count,completed_at,created_at")
          .eq("state_code", stateCode)
          .order("created_at", { ascending: false });

        if (r.error) throw new Error(`Requests load failed: ${r.error.message}`);
        if (cancelled) return;
        setReqs(((r.data || []) as any) || []);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message || String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => { cancelled = true; };
  }, [stateCode]);

  const typeById = useMemo(() => {
    const m: Record<string, TypeRow> = {};
    for (const t of types) m[t.id] = t;
    return m;
  }, [types]);

  const optById = useMemo(() => {
    const m: Record<string, OptRow> = {};
    for (const o of opts) m[o.id] = o;
    return m;
  }, [opts]);

  const progress: ProgressRow[] = useMemo(() => {
    const rows: ProgressRow[] = [];

    for (const r of reqs) {
      const player = (r.player_name || "").trim() || "(unknown)";
      const alliance = r.alliance_name ? String(r.alliance_name) : null;
      const type = typeById[r.achievement_type_id];
      const opt = r.option_id ? optById[r.option_id] : null;

      const required = Number(
        (r.required_count ?? type?.required_count ?? 1)
      ) || 1;

      const current = Number(r.current_count ?? 0) || 0;
      const completed = current >= required || !!r.completed_at;

      rows.push({
        player,
        alliance,
        achievement: type?.name || "Unknown Achievement",
        option: opt?.label || null,
        current,
        required,
        completed,
        status: String(r.status || (completed ? "completed" : "pending")),
        updatedHint: r.completed_at || r.created_at || null,
      });
    }

    // Sort: incomplete first, then by player then by achievement
    rows.sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      if (a.player !== b.player) return a.player.localeCompare(b.player);
      return a.achievement.localeCompare(b.achievement);
    });

    return rows;
  }, [reqs, typeById, optById]);

  const byPlayer = useMemo(() => {
    const m = new Map<string, ProgressRow[]>();
    for (const p of progress) {
      const key = p.player;
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(p);
    }
    // optional cap
    const players = Array.from(m.keys());
    if (limitPlayers && limitPlayers > 0 && players.length > limitPlayers) {
      const keep = new Set(players.slice(0, limitPlayers));
      for (const k of players) if (!keep.has(k)) m.delete(k);
    }
    return m;
  }, [progress, limitPlayers]);

  return (
    <div className="zombie-card" style={{ marginTop: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ fontWeight: 900 }}>🏆 Progress Tracker (State {stateCode})</div>
        <div style={{ opacity: 0.7, fontSize: 12 }}>
          Shows per-player progress (e.g. Governor 2/3). Respects RLS.
        </div>
      </div>

      {loading ? (
        <div style={{ marginTop: 10, opacity: 0.75 }}>Loading progress…</div>
      ) : err ? (
        <div style={{ marginTop: 10, color: "#ffb3b3" }}>{err}</div>
      ) : progress.length === 0 ? (
        <div style={{ marginTop: 10, opacity: 0.75 }}>No requests yet.</div>
      ) : (
        <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
          {Array.from(byPlayer.entries()).map(([player, items]) => {
            const incomplete = items.filter((x) => !x.completed).length;
            return (
              <div key={player} style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.20)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ fontWeight: 900 }}>{player}</div>
                  <div style={{ opacity: 0.7, fontSize: 12 }}>
                    {incomplete ? `${incomplete} in progress` : "✅ all complete"}
                  </div>
                </div>

                <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
                  {items.map((it, idx) => {
                    const pct = Math.max(0, Math.min(100, Math.round((it.current / it.required) * 100)));
                    const label = it.option ? `${it.achievement} — ${it.option}` : it.achievement;
                    return (
                      <div key={player + "_" + idx} style={{ display: "grid", gap: 4 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                          <div style={{ fontWeight: 700 }}>
                            {it.completed ? "✅ " : "⬜️ "}{label}
                          </div>
                          <div style={{ opacity: 0.75, fontSize: 12 }}>
                            {it.current}/{it.required} • {it.status}
                          </div>
                        </div>
                        <div style={{ height: 8, borderRadius: 999, background: "rgba(255,255,255,0.10)", overflow: "hidden" }}>
                          <div style={{ height: 8, width: pct + "%", background: "rgba(120,255,120,0.35)" }} />
                        </div>
                        {it.updatedHint ? (
                          <div style={{ opacity: 0.55, fontSize: 11 }}>Updated: {it.updatedHint}</div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}