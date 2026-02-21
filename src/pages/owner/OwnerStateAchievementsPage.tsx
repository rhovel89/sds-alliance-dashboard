import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import SupportBundleButton from "../../components/system/SupportBundleButton";

type Tab = "requests" | "dropdowns" | "access";
type AchType = {
  id: string;
  name: string;
  kind: "generic" | "swp_weapon" | "governor_count";
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

type ReqRow = {
  id: string;
  player_name: string;
  alliance_name: string;
  status: "submitted" | "in_progress" | "completed" | "denied";
  current_count: number;
  required_count: number;
  completed_at: string | null;
  notes: string | null;
  created_at: string;

  state_achievement_types?: { name: string; kind: string; required_count: number } | null;
  state_achievement_options?: { label: string } | null;
};

type AccessRow = {
  id: string;
  user_id: string;
  can_view: boolean;
  can_edit: boolean;
  can_manage_types: boolean;
  created_at: string;
};

function nowUtc() { return new Date().toISOString(); }

export default function OwnerStateAchievementsPage() {
  const STATE = "789";
  const [tab, setTab] = useState<Tab>("requests");
  const [msg, setMsg] = useState<string | null>(null);

  // Requests
  const [reqs, setReqs] = useState<ReqRow[]>([]);
  const [filter, setFilter] = useState<"all" | "submitted" | "in_progress" | "completed" | "denied">("all");
  const viewReqs = useMemo(() => filter === "all" ? reqs : reqs.filter((r) => r.status === filter), [reqs, filter]);

  async function loadRequests() {
    setMsg(null);
    const r = await supabase
      .from("state_achievement_requests")
      .select(`
        id,player_name,alliance_name,status,current_count,required_count,completed_at,notes,created_at,
        state_achievement_types(name,kind,required_count),
        state_achievement_options(label)
      `)
      .eq("state_code", STATE)
      .order("created_at", { ascending: false });

    if (r.error) { setMsg("Load requests failed: " + r.error.message); setReqs([]); return; }
    setReqs((r.data as any) || []);
  }

  async function updateRequest(id: string, patch: any) {
    setMsg(null);
    const r = await supabase.from("state_achievement_requests").update({ ...patch, updated_at: nowUtc() } as any).eq("id", id);
    if (r.error) { setMsg("Update failed: " + r.error.message); return; }
    await loadRequests();
  }

  // Dropdowns
  const [types, setTypes] = useState<AchType[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState<string>("");
  const selectedType = useMemo(() => types.find((t) => t.id === selectedTypeId) || null, [types, selectedTypeId]);
  const [options, setOptions] = useState<AchOption[]>([]);

  const [newTypeName, setNewTypeName] = useState("");
  const [newTypeKind, setNewTypeKind] = useState<AchType["kind"]>("generic");
  const [newTypeReqOpt, setNewTypeReqOpt] = useState(false);
  const [newTypeReqCount, setNewTypeReqCount] = useState(1);

  const [newOptLabel, setNewOptLabel] = useState("");
  const [newOptSort, setNewOptSort] = useState(1);

  async function loadTypes() {
    setMsg(null);
    const r = await supabase
      .from("state_achievement_types")
      .select("id,name,kind,requires_option,required_count,active")
      .eq("state_code", STATE)
      .order("name", { ascending: true });

    if (r.error) { setMsg("Load types failed: " + r.error.message); setTypes([]); return; }
    setTypes((r.data as any) || []);
  }

  async function loadOptions(typeId: string) {
    if (!typeId) { setOptions([]); return; }
    const r = await supabase
      .from("state_achievement_options")
      .select("id,achievement_type_id,label,sort,active")
      .eq("achievement_type_id", typeId)
      .order("sort", { ascending: true })
      .order("label", { ascending: true });

    if (r.error) { setMsg("Load options failed: " + r.error.message); setOptions([]); return; }
    setOptions((r.data as any) || []);
  }

  async function createType() {
    setMsg(null);
    const name = newTypeName.trim();
    if (!name) return setMsg("Type name required.");
    const payload: any = {
      state_code: STATE,
      name,
      kind: newTypeKind,
      requires_option: !!newTypeReqOpt,
      required_count: Math.max(1, Number(newTypeReqCount || 1)),
      active: true,
    };
    const r = await supabase.from("state_achievement_types").insert(payload).select("id").maybeSingle();
    if (r.error) return setMsg("Create type failed: " + r.error.message);
    setNewTypeName("");
    await loadTypes();
  }

  async function updateType(id: string, patch: any) {
    setMsg(null);
    const r = await supabase.from("state_achievement_types").update(patch as any).eq("id", id);
    if (r.error) return setMsg("Update type failed: " + r.error.message);
    await loadTypes();
  }

  async function createOption() {
    setMsg(null);
    if (!selectedTypeId) return setMsg("Select a type first.");
    const label = newOptLabel.trim();
    if (!label) return setMsg("Weapon/option label required.");
    const payload: any = { achievement_type_id: selectedTypeId, label, sort: Math.max(0, Number(newOptSort || 0)), active: true };
    const r = await supabase.from("state_achievement_options").insert(payload).select("id").maybeSingle();
    if (r.error) return setMsg("Create option failed: " + r.error.message);
    setNewOptLabel("");
    await loadOptions(selectedTypeId);
  }

  async function updateOption(id: string, patch: any) {
    setMsg(null);
    const r = await supabase.from("state_achievement_options").update(patch as any).eq("id", id);
    if (r.error) return setMsg("Update option failed: " + r.error.message);
    await loadOptions(selectedTypeId);
  }

  // Access
  const [access, setAccess] = useState<AccessRow[]>([]);
  const [newUserId, setNewUserId] = useState("");
  const [canView, setCanView] = useState(true);
  const [canEdit, setCanEdit] = useState(false);
  const [canManageTypes, setCanManageTypes] = useState(false);

  async function loadAccess() {
    setMsg(null);
    const r = await supabase
      .from("state_achievement_access")
      .select("id,user_id,can_view,can_edit,can_manage_types,created_at")
      .eq("state_code", STATE)
      .order("created_at", { ascending: false });

    if (r.error) { setMsg("Load access failed: " + r.error.message); setAccess([]); return; }
    setAccess((r.data as any) || []);
  }

  async function addAccess() {
    setMsg(null);
    const u = newUserId.trim();
    if (!u) return setMsg("Paste the user's Supabase auth user_id.");
    const payload: any = { state_code: STATE, user_id: u, can_view: !!canView, can_edit: !!canEdit, can_manage_types: !!canManageTypes };
    const r = await supabase.from("state_achievement_access").insert(payload).select("id").maybeSingle();
    if (r.error) return setMsg("Add access failed: " + r.error.message);
    setNewUserId("");
    await loadAccess();
  }

  async function updateAccess(id: string, patch: any) {
    setMsg(null);
    const r = await supabase.from("state_achievement_access").update(patch as any).eq("id", id);
    if (r.error) return setMsg("Update access failed: " + r.error.message);
    await loadAccess();
  }

  async function deleteAccess(id: string) {
    if (!window.confirm("Delete access entry?")) return;
    setMsg(null);
    const r = await supabase.from("state_achievement_access").delete().eq("id", id);
    if (r.error) return setMsg("Delete failed: " + r.error.message);
    await loadAccess();
  }

  useEffect(() => {
    // load data for default tab only (minimal network)
    loadRequests();
  }, []);

  useEffect(() => {
    if (tab === "requests") loadRequests();
    if (tab === "dropdowns") { loadTypes(); if (selectedTypeId) loadOptions(selectedTypeId); }
    if (tab === "access") loadAccess();
  }, [tab]);

  useEffect(() => {
    if (tab === "dropdowns") loadOptions(selectedTypeId);
  }, [selectedTypeId]);

  return (
    <div style={{ padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>🧟 Owner — State Achievements (789)</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <SupportBundleButton />
        </div>
      </div>

      {msg ? (
        <div className="zombie-card" style={{ marginTop: 12, border: "1px solid rgba(255,80,80,0.35)" }}>
          <div style={{ fontWeight: 900 }}>Message</div>
          <div style={{ opacity: 0.85, marginTop: 6 }}>{msg}</div>
        </div>
      ) : null}

      <div className="zombie-card" style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => setTab("requests")}>Requests</button>
        <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => setTab("dropdowns")}>Dropdowns</button>
        <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => setTab("access")}>Access</button>
      </div>

      {tab === "requests" ? (
        <div style={{ marginTop: 12 }}>
          <div className="zombie-card">
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ opacity: 0.75, fontSize: 12 }}>Filter</div>
              <select className="zombie-input" value={filter} onChange={(e) => setFilter(e.target.value as any)} style={{ padding: "10px 12px" }}>
                <option value="all">All</option>
                <option value="submitted">submitted</option>
                <option value="in_progress">in_progress</option>
                <option value="completed">completed</option>
                <option value="denied">denied</option>
              </select>
              <button className="zombie-btn" style={{ padding: "10px 12px", marginLeft: "auto" }} onClick={loadRequests}>Refresh</button>
            </div>
          </div>

          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            {viewReqs.map((r) => {
              const t = r.state_achievement_types?.name || "Achievement";
              const kind = String(r.state_achievement_types?.kind || "");
              const opt = r.state_achievement_options?.label ? (" — " + r.state_achievement_options.label) : "";
              const needsCount = (r.required_count || 1) > 1 || kind === "governor_count";
              const prog = needsCount ? ` (${r.current_count}/${r.required_count})` : "";
              const done = r.status === "completed" ? " ✅" : "";

              return (
                <div key={r.id} className="zombie-card">
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                    <div style={{ fontWeight: 900 }}>{t}{opt}{prog}{done}</div>
                    <div style={{ marginLeft: "auto", opacity: 0.7, fontSize: 12 }}>{r.created_at}</div>
                  </div>

                  <div style={{ marginTop: 8, opacity: 0.8, fontSize: 12 }}>
                    Player: <b>{r.player_name}</b> • Alliance: <b>{r.alliance_name}</b>
                  </div>

                  {r.notes ? <div style={{ marginTop: 8, opacity: 0.75, whiteSpace: "pre-wrap" }}>{r.notes}</div> : null}

                  <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                    <div style={{ opacity: 0.75, fontSize: 12 }}>Status</div>
                    <select
                      className="zombie-input"
                      value={r.status}
                      onChange={(e) => updateRequest(r.id, { status: e.target.value })}
                      style={{ padding: "10px 12px" }}
                    >
                      <option value="submitted">submitted</option>
                      <option value="in_progress">in_progress</option>
                      <option value="completed">completed</option>
                      <option value="denied">denied</option>
                    </select>

                    {needsCount ? (
                      <>
                        <div style={{ opacity: 0.75, fontSize: 12 }}>Count</div>
                        <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => updateRequest(r.id, { current_count: Math.max(0, (r.current_count || 0) - 1) })}>-1</button>
                        <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => updateRequest(r.id, { current_count: (r.current_count || 0) + 1 })}>+1</button>
                      </>
                    ) : null}

                    <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => updateRequest(r.id, { current_count: r.required_count, status: "completed" })}>
                      Mark Complete
                    </button>
                  </div>

                  {r.completed_at ? <div style={{ marginTop: 8, opacity: 0.75, fontSize: 12 }}>Completed: {r.completed_at}</div> : null}
                </div>
              );
            })}
            {viewReqs.length === 0 ? <div style={{ opacity: 0.75 }}>No requests.</div> : null}
          </div>
        </div>
      ) : null}

      {tab === "dropdowns" ? (
        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "minmax(340px, 1fr) minmax(340px, 1fr)", gap: 12 }}>
          <div className="zombie-card">
            <div style={{ fontWeight: 900 }}>Achievement Types</div>

            <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
              <input className="zombie-input" value={newTypeName} onChange={(e) => setNewTypeName(e.target.value)} placeholder="New achievement name" style={{ padding: "10px 12px" }} />
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <select className="zombie-input" value={newTypeKind} onChange={(e) => setNewTypeKind(e.target.value as any)} style={{ padding: "10px 12px", minWidth: 180 }}>
                  <option value="generic">generic</option>
                  <option value="swp_weapon">swp_weapon</option>
                  <option value="governor_count">governor_count</option>
                </select>

                <input className="zombie-input" type="number" value={newTypeReqCount} onChange={(e) => setNewTypeReqCount(Number(e.target.value))} style={{ padding: "10px 12px", width: 120 }} />
                <label style={{ display: "flex", gap: 8, alignItems: "center", opacity: 0.85 }}>
                  <input type="checkbox" checked={newTypeReqOpt} onChange={(e) => setNewTypeReqOpt(e.target.checked)} />
                  requires option
                </label>

                <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={createType}>Create</button>
              </div>
            </div>

            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              {types.map((t) => (
                <div key={t.id} style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.20)" }}>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                    <div style={{ fontWeight: 900 }}>{t.name} {t.active ? "" : "(inactive)"}</div>
                    <div style={{ marginLeft: "auto", opacity: 0.7, fontSize: 12 }}>{t.kind} • req {t.required_count} • opt {t.requires_option ? "yes" : "no"}</div>
                  </div>

                  <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button className="zombie-btn" style={{ padding: "6px 8px", fontSize: 12 }} onClick={() => setSelectedTypeId(t.id)}>Manage Weapons/Options</button>
                    <button className="zombie-btn" style={{ padding: "6px 8px", fontSize: 12 }} onClick={() => updateType(t.id, { active: !t.active })}>{t.active ? "Deactivate" : "Activate"}</button>
                  </div>
                </div>
              ))}
              {types.length === 0 ? <div style={{ opacity: 0.75 }}>No types.</div> : null}
            </div>
          </div>

          <div className="zombie-card">
            <div style={{ fontWeight: 900 }}>Weapons / Options</div>
            <div style={{ marginTop: 10 }}>
              <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Selected Achievement</div>
              <select className="zombie-input" value={selectedTypeId} onChange={(e) => setSelectedTypeId(e.target.value)} style={{ width: "100%", padding: "10px 12px" }}>
                <option value="">(select)</option>
                {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>

            {selectedTypeId ? (
              <>
                <div style={{ marginTop: 10, opacity: 0.75, fontSize: 12 }}>
                  Tip: Use this for SWP weapons list (Rail Gun, etc).
                </div>

                <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <input className="zombie-input" value={newOptLabel} onChange={(e) => setNewOptLabel(e.target.value)} placeholder="Weapon name" style={{ padding: "10px 12px", flex: 1, minWidth: 220 }} />
                  <input className="zombie-input" type="number" value={newOptSort} onChange={(e) => setNewOptSort(Number(e.target.value))} style={{ padding: "10px 12px", width: 120 }} />
                  <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={createOption}>Add</button>
                </div>

                <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                  {options.map((o) => (
                    <div key={o.id} style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.20)" }}>
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                        <div style={{ fontWeight: 900 }}>#{o.sort} {o.label} {o.active ? "" : "(inactive)"}</div>
                        <button className="zombie-btn" style={{ marginLeft: "auto", padding: "6px 8px", fontSize: 12 }} onClick={() => updateOption(o.id, { active: !o.active })}>
                          {o.active ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </div>
                  ))}
                  {options.length === 0 ? <div style={{ opacity: 0.75 }}>No options.</div> : null}
                </div>
              </>
            ) : (
              <div style={{ marginTop: 12, opacity: 0.75 }}>Select an achievement type.</div>
            )}
          </div>
        </div>
      ) : null}

      {tab === "access" ? (
        <div style={{ marginTop: 12 }}>
          <div className="zombie-card">
            <div style={{ fontWeight: 900 }}>Grant Tracker Permissions</div>

            <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <input className="zombie-input" value={newUserId} onChange={(e) => setNewUserId(e.target.value)} placeholder="Supabase auth user_id" style={{ padding: "10px 12px", minWidth: 280 }} />
              <label style={{ display: "flex", gap: 8, alignItems: "center", opacity: 0.85 }}>
                <input type="checkbox" checked={canView} onChange={(e) => setCanView(e.target.checked)} /> can_view
              </label>
              <label style={{ display: "flex", gap: 8, alignItems: "center", opacity: 0.85 }}>
                <input type="checkbox" checked={canEdit} onChange={(e) => setCanEdit(e.target.checked)} /> can_edit
              </label>
              <label style={{ display: "flex", gap: 8, alignItems: "center", opacity: 0.85 }}>
                <input type="checkbox" checked={canManageTypes} onChange={(e) => setCanManageTypes(e.target.checked)} /> can_manage_types
              </label>
              <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={addAccess}>Add</button>
            </div>

            <div style={{ marginTop: 10, opacity: 0.7, fontSize: 12 }}>
              can_view = see requests • can_edit = update counts/status • can_manage_types = edit dropdown lists
            </div>
          </div>

          <div className="zombie-card" style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 900 }}>Access List</div>
            <button className="zombie-btn" style={{ padding: "10px 12px", marginTop: 10 }} onClick={loadAccess}>Refresh</button>

            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              {access.map((a) => (
                <div key={a.id} style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.20)" }}>
                  <div style={{ fontWeight: 900 }}>{a.user_id}</div>
                  <div style={{ opacity: 0.75, fontSize: 12, marginTop: 4 }}>Created: {a.created_at}</div>

                  <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                    <label style={{ display: "flex", gap: 8, alignItems: "center", opacity: 0.85 }}>
                      <input type="checkbox" checked={a.can_view} onChange={(e) => updateAccess(a.id, { can_view: e.target.checked })} /> can_view
                    </label>
                    <label style={{ display: "flex", gap: 8, alignItems: "center", opacity: 0.85 }}>
                      <input type="checkbox" checked={a.can_edit} onChange={(e) => updateAccess(a.id, { can_edit: e.target.checked })} /> can_edit
                    </label>
                    <label style={{ display: "flex", gap: 8, alignItems: "center", opacity: 0.85 }}>
                      <input type="checkbox" checked={a.can_manage_types} onChange={(e) => updateAccess(a.id, { can_manage_types: e.target.checked })} /> can_manage_types
                    </label>
                    <button className="zombie-btn" style={{ padding: "6px 8px", fontSize: 12 }} onClick={() => deleteAccess(a.id)}>Delete</button>
                  </div>
                </div>
              ))}
              {access.length === 0 ? <div style={{ opacity: 0.75 }}>No access entries.</div> : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}