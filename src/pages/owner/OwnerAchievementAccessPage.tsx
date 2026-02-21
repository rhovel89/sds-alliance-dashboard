import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import SupportBundleButton from "../../components/system/SupportBundleButton";

type AccessRow = {
  id: string;
  state_code: string;
  user_id: string;
  can_view: boolean;
  can_edit: boolean;
  can_manage_types: boolean;
  created_at: string;
};

export default function OwnerAchievementAccessPage() {
  const STATE = "789";
  const [rows, setRows] = useState<AccessRow[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  const [userId, setUserId] = useState("");
  const [canView, setCanView] = useState(true);
  const [canEdit, setCanEdit] = useState(false);
  const [canManageTypes, setCanManageTypes] = useState(false);

  async function load() {
    setMsg(null);
    const r = await supabase
      .from("state_achievement_access")
      .select("id,state_code,user_id,can_view,can_edit,can_manage_types,created_at")
      .eq("state_code", STATE)
      .order("created_at", { ascending: false });

    if (r.error) { setMsg("Load failed: " + r.error.message); setRows([]); return; }
    setRows((r.data as any) || []);
  }

  useEffect(() => { load(); }, []);

  async function add() {
    setMsg(null);
    const u = userId.trim();
    if (!u) return setMsg("user_id required (paste Supabase auth user id).");

    const payload: any = {
      state_code: STATE,
      user_id: u,
      can_view: !!canView,
      can_edit: !!canEdit,
      can_manage_types: !!canManageTypes,
    };

    const r = await supabase.from("state_achievement_access").insert(payload).select("id").maybeSingle();
    if (r.error) return setMsg("Add failed: " + r.error.message);

    setUserId("");
    await load();
  }

  async function patch(id: string, patch: any) {
    setMsg(null);
    const r = await supabase.from("state_achievement_access").update(patch as any).eq("id", id);
    if (r.error) return setMsg("Update failed: " + r.error.message);
    await load();
  }

  async function del(id: string) {
    if (!window.confirm("Delete access entry?")) return;
    setMsg(null);
    const r = await supabase.from("state_achievement_access").delete().eq("id", id);
    if (r.error) return setMsg("Delete failed: " + r.error.message);
    await load();
  }

  return (
    <div style={{ padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>🧟 Owner — Achievements Access (State 789)</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={load}>Refresh</button>
          <SupportBundleButton />
        </div>
      </div>

      {msg ? (
        <div className="zombie-card" style={{ marginTop: 12, border: "1px solid rgba(255,80,80,0.35)" }}>
          <div style={{ fontWeight: 900 }}>Message</div>
          <div style={{ opacity: 0.85, marginTop: 6 }}>{msg}</div>
        </div>
      ) : null}

      <div className="zombie-card" style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 900 }}>Add Access</div>
        <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input className="zombie-input" value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="Supabase auth user_id" style={{ padding: "10px 12px", minWidth: 280 }} />
          <label style={{ display: "flex", gap: 8, alignItems: "center", opacity: 0.85 }}>
            <input type="checkbox" checked={canView} onChange={(e) => setCanView(e.target.checked)} /> can_view
          </label>
          <label style={{ display: "flex", gap: 8, alignItems: "center", opacity: 0.85 }}>
            <input type="checkbox" checked={canEdit} onChange={(e) => setCanEdit(e.target.checked)} /> can_edit
          </label>
          <label style={{ display: "flex", gap: 8, alignItems: "center", opacity: 0.85 }}>
            <input type="checkbox" checked={canManageTypes} onChange={(e) => setCanManageTypes(e.target.checked)} /> can_manage_types
          </label>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={add}>Add</button>
        </div>
        <div style={{ marginTop: 10, opacity: 0.7, fontSize: 12 }}>
          can_edit controls who can update request progress/status. can_manage_types controls who can edit dropdown lists.
        </div>
      </div>

      <div className="zombie-card" style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 900 }}>Existing Access</div>
        <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
          {rows.map((r) => (
            <div key={r.id} style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.20)" }}>
              <div style={{ fontWeight: 900 }}>{r.user_id}</div>
              <div style={{ opacity: 0.75, fontSize: 12, marginTop: 4 }}>Created: {r.created_at}</div>

              <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <label style={{ display: "flex", gap: 8, alignItems: "center", opacity: 0.85 }}>
                  <input type="checkbox" checked={r.can_view} onChange={(e) => patch(r.id, { can_view: e.target.checked })} /> can_view
                </label>
                <label style={{ display: "flex", gap: 8, alignItems: "center", opacity: 0.85 }}>
                  <input type="checkbox" checked={r.can_edit} onChange={(e) => patch(r.id, { can_edit: e.target.checked })} /> can_edit
                </label>
                <label style={{ display: "flex", gap: 8, alignItems: "center", opacity: 0.85 }}>
                  <input type="checkbox" checked={r.can_manage_types} onChange={(e) => patch(r.id, { can_manage_types: e.target.checked })} /> can_manage_types
                </label>
                <button className="zombie-btn" style={{ padding: "6px 8px", fontSize: 12 }} onClick={() => del(r.id)}>Delete</button>
              </div>
            </div>
          ))}
          {rows.length === 0 ? <div style={{ opacity: 0.75 }}>No access entries.</div> : null}
        </div>
      </div>
    </div>
  );
}