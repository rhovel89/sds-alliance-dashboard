import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type AchType = {
  id: string;
  state_code: string;
  name: string;
  kind: string;
  required_count: number;
  active: boolean;
};

type AchOption = {
  id: string;
  achievement_type_id: string;
  label: string;
  sort: number;
  active: boolean;
};

type ReqRow = {
  id: string;
  state_code: string;
  requester_user_id: string;
  player_name: string;
  alliance_name: string;
  achievement_type_id: string;
  option_id: string | null;
  status: string;
  current_count: number;
  required_count: number;
  created_at: string;
};

function norm(s: any) { return String(s || "").trim().toLowerCase(); }

export function State789AchievementsProgressWidget() {
  const stateCode = "789";

  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [userId, setUserId] = useState<string | null>(null);
  const [canViewAll, setCanViewAll] = useState(false);

  const [types, setTypes] = useState<AchType[]>([]);
  const [options, setOptions] = useState<AchOption[]>([]);
  const [rows, setRows] = useState<ReqRow[]>([]);

  const typeById = useMemo(() => {
    const m: Record<string, AchType> = {};
    for (const t of types) m[t.id] = t;
    return m;
  }, [types]);

  const optionById = useMemo(() => {
    const m: Record<string, AchOption> = {};
    for (const o of options) m[o.id] = o;
    return m;
  }, [options]);

  const governorTypeIds = useMemo(() => {
    return types
      .filter((t) => t.active !== false)
      .filter((t) => t.kind === "governor_count" || norm(t.name).includes("governor"))
      .map((t) => t.id);
  }, [types]);

  const swpTypeIds = useMemo(() => {
    return types
      .filter((t) => t.active !== false)
      .filter((t) => t.kind === "swp_weapon" || norm(t.name).includes("swp"))
      .map((t) => t.id);
  }, [types]);

  async function load() {
    setLoading(true);
    setMsg(null);

    const u = await supabase.auth.getUser();
    const uid = u.data.user?.id || null;
    setUserId(uid);

    // Determine view permissions (Owner/AppAdmin OR access.can_view)
    let viewAll = false;
    try {
      const a1 = await supabase.rpc("is_app_admin" as any);
      const a2 = await supabase.rpc("is_dashboard_owner" as any);
      viewAll = (a1.data === true) || (a2.data === true);
    } catch {}

    if (!viewAll && uid) {
      const acc = await supabase
        .from("state_achievement_access")
        .select("can_view")
        .eq("state_code", stateCode)
        .eq("user_id", uid)
        .maybeSingle();

      if (!acc.error && acc.data?.can_view === true) viewAll = true;
    }

    setCanViewAll(viewAll);

    const t = await supabase
      .from("state_achievement_types")
      .select("id,state_code,name,kind,required_count,active")
      .eq("state_code", stateCode)
      .eq("active", true)
      .order("name", { ascending: true });

    if (t.error) {
      setMsg("Types load failed: " + t.error.message);
      setTypes([]);
      setOptions([]);
      setRows([]);
      setLoading(false);
      return;
    }
    const typesData = (t.data as any) || [];
    setTypes(typesData);

    const ids = typesData.map((x: any) => x.id).filter(Boolean);
    if (ids.length) {
      const o = await supabase
        .from("state_achievement_options")
        .select("id,achievement_type_id,label,sort,active")
        .in("achievement_type_id", ids)
        .eq("active", true)
        .order("sort", { ascending: true })
        .order("label", { ascending: true });

      if (!o.error) setOptions((o.data as any) || []);
      else setOptions([]);
    } else {
      setOptions([]);
    }

    // Fetch requests:
    // - if canViewAll: all state rows
    // - else: only your own rows (RLS-safe)
    let q = supabase
      .from("state_achievement_requests")
      .select("id,state_code,requester_user_id,player_name,alliance_name,achievement_type_id,option_id,status,current_count,required_count,created_at")
      .eq("state_code", stateCode)
      .order("created_at", { ascending: false });

    if (!viewAll && uid) q = q.eq("requester_user_id", uid);

    const r = await q;
    if (r.error) {
      setMsg("Requests load failed: " + r.error.message);
      setRows([]);
      setLoading(false);
      return;
    }
    setRows((r.data as any) || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const governorProgress = useMemo(() => {
    const set = new Set(governorTypeIds);
    const m: Record<string, { player: string; alliance: string; cur: number; req: number }> = {};
    for (const r of rows) {
      if (!set.has(r.achievement_type_id)) continue;
      if (r.status === "denied") continue;

      const key = norm(r.player_name) + "|" + norm(r.alliance_name);
      const req = r.required_count || typeById[r.achievement_type_id]?.required_count || 3;
      const cur = r.current_count || 0;

      if (!m[key] || cur > m[key].cur) {
        m[key] = { player: r.player_name, alliance: r.alliance_name, cur, req };
      }
    }

    return Object.values(m).sort((a, b) => (b.cur - a.cur) || a.player.localeCompare(b.player));
  }, [rows, governorTypeIds, typeById]);

  const swpWishlist = useMemo(() => {
    const set = new Set(swpTypeIds);
    const m: Record<string, { player: string; alliance: string; weapons: string[] }> = {};
    for (const r of rows) {
      if (!set.has(r.achievement_type_id)) continue;
      if (r.status === "denied") continue;
      if (r.status === "completed") continue;

      const key = norm(r.player_name) + "|" + norm(r.alliance_name);
      if (!m[key]) m[key] = { player: r.player_name, alliance: r.alliance_name, weapons: [] };

      const w = r.option_id ? (optionById[r.option_id]?.label || "Unknown") : "Unknown";
      if (!m[key].weapons.includes(w)) m[key].weapons.push(w);
    }

    return Object.values(m).sort((a, b) => a.player.localeCompare(b.player));
  }, [rows, swpTypeIds, optionById]);

  return (
    <div className="zombie-card" style={{ marginTop: 12 }}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ fontWeight: 900 }}>🏆 Achievements Progress</div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="zombie-btn" style={{ padding: "8px 10px", fontSize: 12 }} onClick={() => window.location.assign("/state/789/achievements")}>Open Achievements</button>
<button className="zombie-btn" style={{ padding: "8px 10px", fontSize: 12 }} onClick={() => window.location.assign("/state/789/achievements-tracker")}>Open Tracker</button>
<button className="zombie-btn" style={{ padding: "8px 10px", fontSize: 12 }} onClick={load}>Refresh</button>
        </div>
      </div>

      <div style={{ opacity: 0.75, fontSize: 12, marginTop: 6 }}>
        {loading ? "Loading…" : (canViewAll ? "Viewing: state-wide progress" : "Viewing: your progress only (RLS)")}
      </div>

      {msg ? <div style={{ marginTop: 10, opacity: 0.85 }}>{msg}</div> : null}

      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "minmax(280px, 1fr) minmax(280px, 1fr)", gap: 12 }}>
        <div style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.20)" }}>
          <div style={{ fontWeight: 900 }}>👑 Governor Rotations</div>
          <div style={{ opacity: 0.75, fontSize: 12, marginTop: 6 }}>Shows X/3 progress (auto ✅ at 3).</div>

          <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
            {governorProgress.slice(0, 25).map((p) => {
              const done = p.cur >= p.req;
              return (
                <div key={p.player + "|" + p.alliance} style={{ padding: 8, borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.18)" }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <div style={{ fontWeight: 900 }}>{p.player} <span style={{ opacity: 0.7 }}>({p.alliance})</span></div>
                    <div style={{ marginLeft: "auto", fontWeight: 900 }}>
                      {p.cur}/{p.req}{done ? " ✅" : ""}
                    </div>
                  </div>
                </div>
              );
            })}
            {!loading && governorProgress.length === 0 ? <div style={{ opacity: 0.75 }}>No governor progress yet.</div> : null}
          </div>
        </div>

        <div style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.20)" }}>
          <div style={{ fontWeight: 900 }}>🔫 SWP Weapon Wishlist</div>
          <div style={{ opacity: 0.75, fontSize: 12, marginTop: 6 }}>Shows pending SWP weapons (not completed).</div>

          <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
            {swpWishlist.slice(0, 25).map((p) => (
              <div key={p.player + "|" + p.alliance} style={{ padding: 8, borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.18)" }}>
                <div style={{ fontWeight: 900 }}>{p.player} <span style={{ opacity: 0.7 }}>({p.alliance})</span></div>
                <div style={{ opacity: 0.85, marginTop: 6 }}>{p.weapons.join(", ")}</div>
              </div>
            ))}
            {!loading && swpWishlist.length === 0 ? <div style={{ opacity: 0.75 }}>No SWP wishlists yet.</div> : null}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 10, opacity: 0.6, fontSize: 12 }}>
        Tip: If you want leadership/mods to see state-wide lists, add them in Owner → State Achievements → Access (can_view).
      </div>
    </div>
  );
}
