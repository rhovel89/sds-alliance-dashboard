import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

type Row = {
  id?: string;
  player_name?: string | null;
  alliance_name?: string | null;
  current_count?: number | null;
  required_count?: number | null;
  status?: string | null;
  created_at?: string | null;
  state_achievement_types?: { name?: string | null } | null;
};

type FilterKey = "all" | "governor" | "swp";

function norm(s: any) {
  return String(s ?? "").trim().toLowerCase();
}

export default function StateAchievementsMiniProgressCard(props: { stateCode: string; limit?: number }) {
  const stateCode = props.stateCode;
  const limit = props.limit ?? 6;

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // NEW: filter toggle + search
  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState<string>("");

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const res = await supabase
        .from("state_achievement_requests")
        .select("id,player_name,alliance_name,status,current_count,required_count,created_at,state_achievement_types(name)")
        .eq("state_code", stateCode)
        .order("created_at", { ascending: false })
        .limit(250);

      if (res.error) {
        setRows([]);
        setErr(res.error.message);
      } else {
        setRows((res.data as any) ?? []);
      }
    } catch (e: any) {
      setRows([]);
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [stateCode]);

  const inProgress = useMemo(() => {
    const safe = (rows || []).map((r) => {
      const cur = Number(r.current_count ?? 0);
      const req = Number(r.required_count ?? 0);
      return { ...r, _cur: cur, _req: req, _ratio: req > 0 ? cur / req : 0 };
    });

    // Base “in progress”
    let filtered = safe.filter((r) => r._req > 0 && r._cur < r._req);

    // Toggle filter by achievement type name (best-effort, UI-only)
    if (filter !== "all") {
      filtered = filtered.filter((r) => {
        const title = norm(r.state_achievement_types?.name);
        if (filter === "governor") return title.includes("governor");
        if (filter === "swp") return title.includes("swp") || title.includes("weapon");
        return true;
      });
    }

    // Optional search: player, alliance, or achievement name
    const q = norm(search);
    if (q) {
      filtered = filtered.filter((r) => {
        const who = norm(r.player_name);
        const ally = norm(r.alliance_name);
        const title = norm(r.state_achievement_types?.name);
        return who.includes(q) || ally.includes(q) || title.includes(q);
      });
    }

    // Most advanced first
    filtered.sort((a, b) => (b as any)._ratio - (a as any)._ratio);
    return filtered.slice(0, limit);
  }, [rows, limit, filter, search]);

  const counts = useMemo(() => {
    // compute counts for toggle labels (best-effort)
    const safe = (rows || []).map((r) => {
      const cur = Number(r.current_count ?? 0);
      const req = Number(r.required_count ?? 0);
      return { ...r, _cur: cur, _req: req };
    });
    const base = safe.filter((r) => r._req > 0 && r._cur < r._req);
    const governor = base.filter((r) => norm(r.state_achievement_types?.name).includes("governor")).length;
    const swp = base.filter((r) => {
      const t = norm(r.state_achievement_types?.name);
      return t.includes("swp") || t.includes("weapon");
    }).length;
    return { all: base.length, governor, swp };
  }, [rows]);

  return (
    <div className="zombie-card" style={{ marginTop: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ fontWeight: 900 }}>🏆 Achievements — Top In-Progress</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="zombie-btn" style={{ padding: "8px 10px", fontSize: 12 }} onClick={load} disabled={loading}>
            {loading ? "Loading…" : "Refresh"}
          </button>
          <Link className="zombie-btn" style={{ padding: "8px 10px", fontSize: 12, textDecoration: "none", display: "inline-block" }} to={`/state/${stateCode}/achievements`}>
            Open Achievements
          </Link>
        </div>
      </div>

      {/* NEW: Filter toggle + search */}
      <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ opacity: 0.75, fontSize: 12 }}>Filter</div>
        <select
          className="zombie-input"
          value={filter}
          onChange={(e) => setFilter(e.target.value as FilterKey)}
          style={{ padding: "8px 10px", minWidth: 220 }}
        >
          <option value="all">All ({counts.all})</option>
          <option value="governor">Governor ({counts.governor})</option>
          <option value="swp">SWP Weapons ({counts.swp})</option>
        </select>

        <div style={{ opacity: 0.75, fontSize: 12 }}>Search</div>
        <input
          className="zombie-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="player / alliance / achievement…"
          style={{ padding: "8px 10px", minWidth: 240, flex: 1 }}
        />

        {search ? (
          <button className="zombie-btn" style={{ padding: "8px 10px", fontSize: 12 }} onClick={() => setSearch("")}>
            Clear
          </button>
        ) : null}
      </div>

      {err ? (
        <div style={{ marginTop: 10, color: "#ffb3b3", fontSize: 12 }}>
          Could not load progress (RLS/schema): {err}
        </div>
      ) : null}

      <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
        {inProgress.map((r) => {
          const who = (r.player_name || "Unknown").toString();
          const ally = (r.alliance_name || "").toString();
          const title = (r.state_achievement_types?.name || "Achievement").toString();
          const cur = Number(r.current_count ?? 0);
          const req = Number(r.required_count ?? 0);
          return (
            <div key={r.id || who + title + cur} style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.20)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <div style={{ fontWeight: 900 }}>{who}{ally ? ` (${ally})` : ""}</div>
                <div style={{ fontWeight: 900 }}>{cur}/{req}</div>
              </div>
              <div style={{ opacity: 0.75, fontSize: 12, marginTop: 4 }}>{title}</div>
            </div>
          );
        })}
        {!err && !loading && inProgress.length === 0 ? (
          <div style={{ opacity: 0.75, fontSize: 12 }}>No in-progress items found for this filter.</div>
        ) : null}
      </div>
    </div>
  );
}