import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import SupportBundleButton from "../../components/system/SupportBundleButton";

type AchType = {
  id: string;
  state_code: string;
  name: string;
  kind: string;
  requires_option: boolean;
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

type AccessRow = {
  can_view: boolean;
  can_edit: boolean;
  can_manage_types: boolean;
};

type ReqRow = {
  id: string;
  state_code: string;
  requester_user_id: string;
  player_name: string;
  alliance_name: string;
  achievement_type_id: string;
  option_id: string | null;
  status: "submitted" | "in_progress" | "completed" | "denied";
  current_count: number;
  required_count: number;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

function nowUtc() { return new Date().toISOString(); }
function norm(s: any) { return String(s || "").trim().toLowerCase(); }
function clampInt(x: any, min: number, max: number) {
  const n = Number(x);
  if (!isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

export default function State789AchievementsTrackerPage() {
  const stateCode = "789";
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [userId, setUserId] = useState<string | null>(null);
  const [access, setAccess] = useState<AccessRow | null>(null);
  const [isOwnerOrAdmin, setIsOwnerOrAdmin] = useState(false);

  const [types, setTypes] = useState<AchType[]>([]);
  const [options, setOptions] = useState<AchOption[]>([]);
  const [rows, setRows] = useState<ReqRow[]>([]);
  const [q, setQ] = useState("");

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

  const canView = useMemo(() => isOwnerOrAdmin || access?.can_view === true, [isOwnerOrAdmin, access]);
  const canEdit = useMemo(() => isOwnerOrAdmin || access?.can_edit === true, [isOwnerOrAdmin, access]);

  async function loadAll() {
    setLoading(true);
    setMsg(null);

    const u = await supabase.auth.getUser();
    const uid = u.data.user?.id || null;
    setUserId(uid);

    let ownerAdmin = false;
    try {
      const a1 = await supabase.rpc("is_app_admin" as any);
      const a2 = await supabase.rpc("is_dashboard_owner" as any);
      ownerAdmin = (a1.data === true) || (a2.data === true);
    } catch {}
    setIsOwnerOrAdmin(ownerAdmin);

    if (uid) {
      const a = await supabase
        .from("state_achievement_access")
        .select("can_view,can_edit,can_manage_types")
        .eq("state_code", stateCode)
        .eq("user_id", uid)
        .maybeSingle();

      if (!a.error) setAccess((a.data as any) || null);
      else setAccess(null);
    } else {
      setAccess(null);
    }

    const t = await supabase
      .from("state_achievement_types")
      .select("id,state_code,name,kind,requires_option,required_count,active")
      .eq("state_code", stateCode)
      .order("name", { ascending: true });

    if (t.error) {
      setTypes([]); setOptions([]); setRows([]);
      setMsg("Types load failed: " + t.error.message);
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
        .order("sort", { ascending: true })
        .order("label", { ascending: true });

      if (!o.error) setOptions((o.data as any) || []);
      else setOptions([]);
    } else {
      setOptions([]);
    }

    // Requests: state-wide (RLS must allow this for helpers)
    const r = await supabase
      .from("state_achievement_requests")
      .select("*")
      .eq("state_code", stateCode)
      .order("created_at", { ascending: false });

    if (r.error) {
      setRows([]);
      setMsg("Requests load failed: " + r.error.message);
      setLoading(false);
      return;
    }
    setRows((r.data as any) || []);
    setLoading(false);
  }

  useEffect(() => { loadAll(); }, []);

  const filtered = useMemo(() => {
    const s = norm(q);
    if (!s) return rows;
    return rows.filter((r) => {
      const t = typeById[r.achievement_type_id]?.name || "";
      const o = r.option_id ? (optionById[r.option_id]?.label || "") : "";
      return (
        norm(r.player_name).includes(s) ||
        norm(r.alliance_name).includes(s) ||
        norm(t).includes(s) ||
        norm(o).includes(s) ||
        norm(r.status).includes(s)
      );
    });
  }, [q, rows, typeById, optionById]);

  async function saveRow(r: ReqRow) {
    if (!canEdit) return;

    setMsg(null);
    const req = clampInt(r.required_count || 1, 1, 999);
    const cur = clampInt(r.current_count || 0, 0, 999);
    const willComplete = (r.status === "completed") || (cur >= req);

    const patch: any = {
      status: willComplete ? "completed" : r.status,
      current_count: cur,
      notes: r.notes || null
    };
    if (willComplete && !r.completed_at) patch.completed_at = nowUtc();

    const u = await supabase.from("state_achievement_requests").update(patch).eq("id", r.id);
    if (u.error) return setMsg("Update failed: " + u.error.message);

    setMsg("✅ Updated.");
    await loadAll();
  }

  return (
    <div style={{ padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>🏆 State 789 — Achievements Tracker</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => window.location.assign("/state/789/achievements")}>
            Open Player Form
          </button>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={loadAll}>Refresh</button>
          <SupportBundleButton />
        </div>
      </div>

      <div className="zombie-card" style={{ marginTop: 12 }}>
        <div style={{ opacity: 0.75, fontSize: 12 }}>
          {loading ? "Loading…" : (canView ? (canEdit ? "Access: view + edit" : "Access: view only") : "No access (can_view required).")}
        </div>
        {!canView ? (
          <div style={{ marginTop: 10, opacity: 0.85 }}>
            Ask the Owner to grant you access in Owner → State Achievements → Access.
          </div>
        ) : null}
        {msg ? <div style={{ marginTop: 10, opacity: 0.9 }}>{msg}</div> : null}
      </div>

      {canView ? (
        <div className="zombie-card" style={{ marginTop: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ fontWeight: 900 }}>All Requests</div>
            <input className="zombie-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" style={{ padding: "10px 12px", minWidth: 280 }} />
          </div>

          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            {filtered.map((r) => {
              const t = typeById[r.achievement_type_id];
              const o = r.option_id ? optionById[r.option_id] : null;
              const req = r.required_count || t?.required_count || 1;
              const cur = r.current_count || 0;
              const done = (r.status === "completed" || cur >= req);
              const title = (t?.name || "Achievement") + (o ? (" — " + o.label) : "");

              return (
                <div key={r.id} style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.20)" }}>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                    <div style={{ fontWeight: 900 }}>{r.player_name} <span style={{ opacity: 0.7 }}>({r.alliance_name})</span></div>
                    <div style={{ marginLeft: "auto", fontWeight: 900 }}>{cur}/{req}{done ? " ✅" : ""}</div>
                  </div>
                  <div style={{ opacity: 0.85, marginTop: 6 }}>{title}</div>

                  <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                    <div style={{ opacity: 0.75, fontSize: 12 }}>Count</div>
                    <input
                      className="zombie-input"
                      value={String(r.current_count ?? 0)}
                      onChange={(e) => {
                        const v = clampInt(e.target.value, 0, 999);
                        setRows((prev) => prev.map((x) => x.id === r.id ? { ...x, current_count: v } : x));
                      }}
                      style={{ padding: "8px 10px", width: 90 }}
                      disabled={!canEdit}
                    />

                    <div style={{ opacity: 0.75, fontSize: 12 }}>Status</div>
                    <select
                      className="zombie-input"
                      value={r.status}
                      onChange={(e) => {
                        const v = e.target.value as any;
                        setRows((prev) => prev.map((x) => x.id === r.id ? { ...x, status: v } : x));
                      }}
                      style={{ padding: "8px 10px" }}
                      disabled={!canEdit}
                    >
                      <option value="submitted">submitted</option>
                      <option value="in_progress">in_progress</option>
                      <option value="completed">completed</option>
                      <option value="denied">denied</option>
                    </select>

                    <button className="zombie-btn" style={{ padding: "8px 10px", fontWeight: 900 }} onClick={() => saveRow(r)} disabled={!canEdit}>Save</button>
                  </div>

                  <div style={{ marginTop: 10 }}>
                    <textarea
                      className="zombie-input"
                      value={r.notes || ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        setRows((prev) => prev.map((x) => x.id === r.id ? { ...x, notes: v } : x));
                      }}
                      placeholder="Notes"
                      style={{ padding: "10px 12px", width: "100%", minHeight: 70 }}
                      disabled={!canEdit}
                    />
                  </div>
                </div>
              );
            })}
            {!loading && filtered.length === 0 ? <div style={{ opacity: 0.75 }}>No requests found.</div> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
