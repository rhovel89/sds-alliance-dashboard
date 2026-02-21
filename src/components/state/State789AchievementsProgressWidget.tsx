import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type AnyRow = Record<string, any>;

function normLower(s: any) { return String(s || "").trim().toLowerCase(); }
function asInt(v: any, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.floor(n) : fallback;
}

export function State789AchievementsProgressWidget() {
  const stateCode = "789";

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const [types, setTypes] = useState<AnyRow[]>([]);
  const [options, setOptions] = useState<AnyRow[]>([]);
  const [requests, setRequests] = useState<AnyRow[]>([]);

  const typeById = useMemo(() => {
    const m: Record<string, AnyRow> = {};
    for (const t of types) if (t?.id) m[String(t.id)] = t;
    return m;
  }, [types]);

  const optionById = useMemo(() => {
    const m: Record<string, AnyRow> = {};
    for (const o of options) if (o?.id) m[String(o.id)] = o;
    return m;
  }, [options]);

  async function load() {
    setLoading(true);
    setMsg(null);

    const t = await supabase
      .from("state_achievement_types")
      .select("*")
      .eq("state_code", stateCode)
      .order("name", { ascending: true });

    if (t.error) {
      setTypes([]); setOptions([]); setRequests([]);
      setMsg("Types load failed: " + t.error.message);
      setLoading(false);
      return;
    }
    const tData = (t.data as any[]) || [];
    setTypes(tData);

    const ids = tData.map((x) => x?.id).filter(Boolean);
    if (ids.length) {
      const o = await supabase
        .from("state_achievement_options")
        .select("*")
        .in("achievement_type_id", ids)
        .order("sort", { ascending: true })
        .order("label", { ascending: true });

      if (!o.error) setOptions((o.data as any[]) || []);
      else setOptions([]);
    } else {
      setOptions([]);
    }

    const r = await supabase
      .from("state_achievement_requests")
      .select("*")
      .eq("state_code", stateCode)
      .order("created_at", { ascending: false })
      .limit(200);

    if (r.error) {
      setRequests([]);
      setMsg("Requests load failed: " + r.error.message);
      setLoading(false);
      return;
    }
    setRequests((r.data as any[]) || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const rows = useMemo(() => {
    // group by player+type+option to show latest progress line
    const map: Record<string, AnyRow> = {};
    for (const r of requests || []) {
      const player = String(r.player_name || "");
      const typeId = String(r.achievement_type_id || "");
      const optId = r.option_id ? String(r.option_id) : "";
      if (!player || !typeId) continue;

      const key = player + "|" + typeId + "|" + optId;
      const req = Math.max(1, asInt(r.required_count, asInt(typeById[typeId]?.required_count, 1)));
      const cur = Math.max(0, asInt(r.current_count, 0));
      const status = String(r.status || "submitted");
      const done = (status === "completed") || (cur >= req);

      const existing = map[key];
      if (!existing) {
        map[key] = {
          key,
          player,
          alliance: String(r.alliance_name || ""),
          typeId,
          optId,
          status,
          cur,
          req,
          done,
          created_at: String(r.created_at || "")
        };
      } else {
        // keep the most recent created_at
        const prevTs = Date.parse(existing.created_at || "") || 0;
        const ts = Date.parse(String(r.created_at || "")) || 0;
        if (ts >= prevTs) {
          map[key] = {
            ...existing,
            alliance: String(r.alliance_name || existing.alliance || ""),
            status,
            cur,
            req,
            done,
            created_at: String(r.created_at || existing.created_at || "")
          };
        }
      }
    }
    const arr = Object.values(map);

    // Sort: in-progress first by % desc, then completed
    arr.sort((a: any, b: any) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      const ap = a.req ? (a.cur / a.req) : 0;
      const bp = b.req ? (b.cur / b.req) : 0;
      if (bp !== ap) return bp - ap;
      return normLower(a.player).localeCompare(normLower(b.player));
    });

    return arr.slice(0, 30);
  }, [requests, typeById]);

  function typeName(typeId: string) {
    const t = typeById[typeId];
    return String(t?.name || "Achievement");
  }

  function optionLabel(optId: string) {
    if (!optId) return "";
    const o = optionById[optId];
    return o ? String(o.label || "") : "";
  }

  return (
    <div className="zombie-card" style={{ marginTop: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ fontWeight: 900 }}>🏆 Achievements Progress (State 789)</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="zombie-btn" style={{ padding: "8px 10px", fontSize: 12 }} onClick={() => window.location.assign("/state/789/achievements")}>Open Achievements</button>
          <button className="zombie-btn" style={{ padding: "8px 10px", fontSize: 12 }} onClick={() => window.location.assign("/state/789/achievements-tracker")}>Open Tracker</button>
          <button className="zombie-btn" style={{ padding: "8px 10px", fontSize: 12 }} onClick={load}>Refresh</button>
        </div>
      </div>

      <div style={{ opacity: 0.75, fontSize: 12, marginTop: 6 }}>
        {loading ? "Loading…" : `Showing ${rows.length} lines (visibility controlled by RLS).`}
      </div>
      {msg ? <div style={{ opacity: 0.9, marginTop: 8 }}>{msg}</div> : null}

      <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
        {rows.map((r: any) => {
          const tName = typeName(String(r.typeId));
          const oLab = optionLabel(String(r.optId));
          return (
            <div key={String(r.key)} style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.20)" }}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ fontWeight: 900 }}>{String(r.player)} <span style={{ opacity: 0.7 }}>({String(r.alliance || "—")})</span></div>
                <div style={{ marginLeft: "auto", fontWeight: 900 }}>{String(r.cur)}/{String(r.req)}{r.done ? " ✅" : ""}</div>
              </div>
              <div style={{ opacity: 0.85, marginTop: 6 }}>
                {tName}{oLab ? (" — " + oLab) : ""}
              </div>
              <div style={{ opacity: 0.65, fontSize: 12, marginTop: 6 }}>
                status: {String(r.status || "submitted")}
              </div>
            </div>
          );
        })}
        {!loading && rows.length === 0 ? <div style={{ opacity: 0.75 }}>No visible progress yet.</div> : null}
      </div>
    </div>
  );
}