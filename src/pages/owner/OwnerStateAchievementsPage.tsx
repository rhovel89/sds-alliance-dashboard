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
  id: string;
  state_code: string;
  user_id: string;
  can_view: boolean;
  can_edit: boolean;
  can_manage_types: boolean;
  created_at: string;
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

async function copyText(txt: string) {
  try { await navigator.clipboard.writeText(txt); window.alert("Copied."); }
  catch { window.prompt("Copy:", txt); }
}

function clampInt(x: any, min: number, max: number) {
  const n = Number(x);
  if (!isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

export default function OwnerStateAchievementsPage() {
  const [stateCode, setStateCode] = useState("789");
  const [tab, setTab] = useState<"requests" | "types" | "access">("requests");
  const [msg, setMsg] = useState<string | null>(null);

  const [types, setTypes] = useState<AchType[]>([]);
  const [options, setOptions] = useState<AchOption[]>([]);
  const [requests, setRequests] = useState<ReqRow[]>([]);
  const [access, setAccess] = useState<AccessRow[]>([]);

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

  async function loadAll() {
    setMsg(null);

    const t = await supabase
      .from("state_achievement_types")
      .select("id,state_code,name,kind,requires_option,required_count,active")
      .eq("state_code", stateCode)
      .order("name", { ascending: true });

    if (t.error) { setMsg("Types load failed: " + t.error.message); setTypes([]); return; }
    const typesData = (t.data as any) || [];
    setTypes(typesData);

    const typeIds = typesData.map((x: any) => x.id).filter(Boolean);
    if (typeIds.length) {
      const o = await supabase
        .from("state_achievement_options")
        .select("id,achievement_type_id,label,sort,active")
        .in("achievement_type_id", typeIds)
        .order("sort", { ascending: true })
        .order("label", { ascending: true });

      if (o.error) { setMsg("Options load failed: " + o.error.message); setOptions([]); }
      else setOptions((o.data as any) || []);
    } else {
      setOptions([]);
    }

    const r = await supabase
      .from("state_achievement_requests")
      .select("id,state_code,requester_user_id,player_name,alliance_name,achievement_type_id,option_id,status,current_count,required_count,completed_at,notes,created_at,updated_at")
      .eq("state_code", stateCode)
      .order("created_at", { ascending: false });

    if (r.error) { setMsg("Requests load failed: " + r.error.message); setRequests([]); }
    else setRequests((r.data as any) || []);

    const a = await supabase
      .from("state_achievement_access")
      .select("id,state_code,user_id,can_view,can_edit,can_manage_types,created_at")
      .eq("state_code", stateCode)
      .order("created_at", { ascending: false });

    if (a.error) { setMsg("Access load failed: " + a.error.message); setAccess([]); }
    else setAccess((a.data as any) || []);
  }

  useEffect(() => { loadAll(); }, [stateCode]);

  // ---------------- REQUESTS ----------------
  const [q, setQ] = useState("");
  const filteredRequests = useMemo(() => {
    const s = (q || "").trim().toLowerCase();
    if (!s) return requests;
    return requests.filter((r) => {
      const t = typeById[r.achievement_type_id]?.name || "";
      const o = r.option_id ? (optionById[r.option_id]?.label || "") : "";
      return (
        r.player_name.toLowerCase().includes(s) ||
        r.alliance_name.toLowerCase().includes(s) ||
        t.toLowerCase().includes(s) ||
        o.toLowerCase().includes(s) ||
        r.status.toLowerCase().includes(s)
      );
    });
  }, [q, requests, typeById, optionById]);

  async function saveRequest(r: ReqRow) {
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

  async function bump(r: ReqRow, delta: number) {
    const req = clampInt(r.required_count || 1, 1, 999);
    const cur = clampInt((r.current_count || 0) + delta, 0, 999);
    const status: any = cur >= req ? "completed" : (r.status === "completed" ? "in_progress" : r.status);
    const next: ReqRow = { ...r, current_count: cur, status };
    await saveRequest(next);
  }

  // ---------------- TYPES ----------------
  const [newTypeName, setNewTypeName] = useState("");
  const [newTypeKind, setNewTypeKind] = useState<AchType["kind"]>("generic");
  const [newTypeReqOpt, setNewTypeReqOpt] = useState(false);
  const [newTypeReqCount, setNewTypeReqCount] = useState(1);

  async function addType() {
    setMsg(null);
    const name = newTypeName.trim();
    if (!name) return setMsg("Type name required.");
    const payload: any = {
      state_code: stateCode,
      name,
      kind: newTypeKind,
      requires_option: !!newTypeReqOpt,
      required_count: clampInt(newTypeReqCount, 1, 999),
      active: true
    };
    const ins = await supabase.from("state_achievement_types").insert(payload).select("id").maybeSingle();
    if (ins.error) return setMsg("Create type failed: " + ins.error.message);
    setNewTypeName("");
    setNewTypeKind("generic");
    setNewTypeReqOpt(false);
    setNewTypeReqCount(1);
    await loadAll();
  }

  async function updateType(t: AchType) {
    setMsg(null);
    const patch: any = {
      name: t.name,
      kind: t.kind,
      requires_option: !!t.requires_option,
      required_count: clampInt(t.required_count, 1, 999),
      active: !!t.active
    };
    const u = await supabase.from("state_achievement_types").update(patch).eq("id", t.id);
    if (u.error) return setMsg("Update type failed: " + u.error.message);
    setMsg("✅ Type updated.");
    await loadAll();
  }

  async function deleteType(id: string) {
    if (!confirm("Delete achievement type? (options will cascade)")) return;
    setMsg(null);
    const d = await supabase.from("state_achievement_types").delete().eq("id", id);
    if (d.error) return setMsg("Delete type failed: " + d.error.message);
    setMsg("✅ Type deleted.");
    await loadAll();
  }

  const [optLabel, setOptLabel] = useState("");
  const [optSort, setOptSort] = useState(0);
  const [optTypeId, setOptTypeId] = useState<string>("");

  async function addOption() {
    setMsg(null);
    if (!optTypeId) return setMsg("Select a type first.");
    const label = optLabel.trim();
    if (!label) return setMsg("Option label required.");
    const payload: any = { achievement_type_id: optTypeId, label, sort: clampInt(optSort, -999, 999), active: true };
    const ins = await supabase.from("state_achievement_options").insert(payload).select("id").maybeSingle();
    if (ins.error) return setMsg("Create option failed: " + ins.error.message);
    setOptLabel("");
    setOptSort(0);
    await loadAll();
  }

  async function updateOption(o: AchOption) {
    setMsg(null);
    const patch: any = { label: o.label, sort: clampInt(o.sort, -999, 999), active: !!o.active };
    const u = await supabase.from("state_achievement_options").update(patch).eq("id", o.id);
    if (u.error) return setMsg("Update option failed: " + u.error.message);
    setMsg("✅ Option updated.");
    await loadAll();
  }

  async function deleteOption(id: string) {
    if (!confirm("Delete option?")) return;
    setMsg(null);
    const d = await supabase.from("state_achievement_options").delete().eq("id", id);
    if (d.error) return setMsg("Delete option failed: " + d.error.message);
    setMsg("✅ Option deleted.");
    await loadAll();
  }

  // ---------------- ACCESS ----------------
  const [accUserId, setAccUserId] = useState("");
  const [accView, setAccView] = useState(true);
  const [accEdit, setAccEdit] = useState(false);
  const [accManage, setAccManage] = useState(false);

  async function upsertAccess() {
    setMsg(null);
    const uid = accUserId.trim();
    if (!uid) return setMsg("User UUID required.");
    const payload: any = {
      state_code: stateCode,
      user_id: uid,
      can_view: !!accView,
      can_edit: !!accEdit,
      can_manage_types: !!accManage
    };
    const r = await supabase.from("state_achievement_access").upsert(payload, { onConflict: "state_code,user_id" }).select("id").maybeSingle();
    if (r.error) return setMsg("Access save failed: " + r.error.message);
    setAccUserId("");
    setAccView(true); setAccEdit(false); setAccManage(false);
    setMsg("✅ Access saved.");
    await loadAll();
  }

  async function deleteAccess(id: string) {
    if (!confirm("Remove access row?")) return;
    setMsg(null);
    const d = await supabase.from("state_achievement_access").delete().eq("id", id);
    if (d.error) return setMsg("Delete access failed: " + d.error.message);
    setMsg("✅ Access removed.");
    await loadAll();
  }

  async function exportAll() {
    const payload = {
      version: 1,
      exportedUtc: nowUtc(),
      stateCode,
      types,
      options,
      access,
      requests
    };
    await copyText(JSON.stringify(payload, null, 2));
  }

  return (
    <div style={{ padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>🏆 Owner — State Achievements</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={exportAll}>Export</button>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={loadAll}>Refresh</button>
          <SupportBundleButton />
        </div>
      </div>

      <div className="zombie-card" style={{ marginTop: 12 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ opacity: 0.75, fontSize: 12 }}>State</div>
          <input className="zombie-input" value={stateCode} onChange={(e) => setStateCode(e.target.value.trim())} style={{ padding: "10px 12px", width: 100 }} />

          <div style={{ marginLeft: "auto", display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="zombie-btn" style={{ padding: "10px 12px", opacity: tab==="requests" ? 1 : 0.75 }} onClick={() => setTab("requests")}>Requests</button>
            <button className="zombie-btn" style={{ padding: "10px 12px", opacity: tab==="types" ? 1 : 0.75 }} onClick={() => setTab("types")}>Types</button>
            <button className="zombie-btn" style={{ padding: "10px 12px", opacity: tab==="access" ? 1 : 0.75 }} onClick={() => setTab("access")}>Access</button>
          </div>
        </div>
      </div>

      {msg ? (
        <div className="zombie-card" style={{ marginTop: 12, border: "1px solid rgba(255,80,80,0.35)" }}>
          <div style={{ fontWeight: 900 }}>Message</div>
          <div style={{ opacity: 0.85, marginTop: 6 }}>{msg}</div>
        </div>
      ) : null}

      {tab === "requests" ? (
        <div className="zombie-card" style={{ marginTop: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ fontWeight: 900 }}>Requests Tracker</div>
            <input className="zombie-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search (name, alliance, achievement, status…)" style={{ padding: "10px 12px", minWidth: 280 }} />
          </div>

          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            {filteredRequests.map((r) => {
              const t = typeById[r.achievement_type_id];
              const o = r.option_id ? optionById[r.option_id] : null;
              const req = r.required_count || t?.required_count || 1;
              const cur = r.current_count || 0;
              const left = Math.max(0, req - cur);
              const title = (t?.name || "Achievement") + (o ? (" — " + o.label) : "");
              const done = (r.status === "completed" || cur >= req);

              return (
                <div key={r.id} style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.20)" }}>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                    <div style={{ fontWeight: 900 }}>{r.player_name} <span style={{ opacity: 0.7 }}>({r.alliance_name})</span></div>
                    <div style={{ marginLeft: "auto", fontWeight: 900 }}>
                      {cur}/{req}{done ? " ✅" : ""}
                    </div>
                  </div>

                  <div style={{ opacity: 0.8, marginTop: 6 }}>{title}</div>
                  <div style={{ opacity: 0.7, fontSize: 12, marginTop: 6 }}>
                    Status: {r.status} • Left: {left} • Submitted: {r.created_at}
                  </div>

                  <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                    <button className="zombie-btn" style={{ padding: "8px 10px" }} onClick={() => bump(r, -1)}>-1</button>
                    <button className="zombie-btn" style={{ padding: "8px 10px" }} onClick={() => bump(r, +1)}>+1</button>

                    <div style={{ opacity: 0.75, fontSize: 12 }}>Count</div>
                    <input
                      className="zombie-input"
                      value={String(r.current_count ?? 0)}
                      onChange={(e) => {
                        const v = clampInt(e.target.value, 0, 999);
                        setRequests((prev) => prev.map((x) => x.id === r.id ? { ...x, current_count: v } : x));
                      }}
                      style={{ padding: "8px 10px", width: 90 }}
                    />

                    <div style={{ opacity: 0.75, fontSize: 12 }}>Status</div>
                    <select
                      className="zombie-input"
                      value={r.status}
                      onChange={(e) => {
                        const v = e.target.value as any;
                        setRequests((prev) => prev.map((x) => x.id === r.id ? { ...x, status: v } : x));
                      }}
                      style={{ padding: "8px 10px" }}
                    >
                      <option value="submitted">submitted</option>
                      <option value="in_progress">in_progress</option>
                      <option value="completed">completed</option>
                      <option value="denied">denied</option>
                    </select>

                    <button className="zombie-btn" style={{ padding: "8px 10px", fontWeight: 900 }} onClick={() => saveRequest(r)}>Save</button>
                    <button className="zombie-btn" style={{ padding: "8px 10px" }} onClick={() => saveRequest({ ...r, status: "completed" })}>Mark Complete</button>
                  </div>

                  <div style={{ marginTop: 10 }}>
                    <textarea
                      className="zombie-input"
                      value={r.notes || ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        setRequests((prev) => prev.map((x) => x.id === r.id ? { ...x, notes: v } : x));
                      }}
                      placeholder="Notes (owner + helpers)"
                      style={{ padding: "10px 12px", width: "100%", minHeight: 70 }}
                    />
                  </div>
                </div>
              );
            })}
            {filteredRequests.length === 0 ? <div style={{ opacity: 0.75 }}>No requests found.</div> : null}
          </div>
        </div>
      ) : null}

      {tab === "types" ? (
        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "minmax(320px, 1fr) minmax(320px, 1fr)", gap: 12 }}>
          <div className="zombie-card">
            <div style={{ fontWeight: 900 }}>Create Type</div>
            <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
              <input className="zombie-input" value={newTypeName} onChange={(e) => setNewTypeName(e.target.value)} placeholder="Name (e.g. SWP Weapon)" style={{ padding: "10px 12px" }} />
              <select className="zombie-input" value={newTypeKind} onChange={(e) => setNewTypeKind(e.target.value as any)} style={{ padding: "10px 12px" }}>
                <option value="generic">generic</option>
                <option value="swp_weapon">swp_weapon</option>
                <option value="governor_count">governor_count</option>
              </select>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input type="checkbox" checked={newTypeReqOpt} onChange={(e) => setNewTypeReqOpt(e.target.checked)} />
                  <span style={{ opacity: 0.85 }}>Requires option (weapon)</span>
                </label>

                <div style={{ opacity: 0.75, fontSize: 12 }}>Required count</div>
                <input className="zombie-input" value={String(newTypeReqCount)} onChange={(e) => setNewTypeReqCount(clampInt(e.target.value, 1, 999))} style={{ padding: "10px 12px", width: 120 }} />
              </div>

              <button className="zombie-btn" style={{ padding: "12px 14px", fontWeight: 900 }} onClick={addType}>Create</button>
            </div>
          </div>

          <div className="zombie-card">
            <div style={{ fontWeight: 900 }}>Add Option (Weapon)</div>
            <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
              <select className="zombie-input" value={optTypeId} onChange={(e) => setOptTypeId(e.target.value)} style={{ padding: "10px 12px" }}>
                <option value="">Select type…</option>
                {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <input className="zombie-input" value={optLabel} onChange={(e) => setOptLabel(e.target.value)} placeholder="Option label (e.g. Rail Gun)" style={{ padding: "10px 12px" }} />
              <input className="zombie-input" value={String(optSort)} onChange={(e) => setOptSort(clampInt(e.target.value, -999, 999))} placeholder="Sort" style={{ padding: "10px 12px", width: 140 }} />
              <button className="zombie-btn" style={{ padding: "12px 14px", fontWeight: 900 }} onClick={addOption}>Add Option</button>
            </div>
          </div>

          <div className="zombie-card" style={{ gridColumn: "1 / -1" }}>
            <div style={{ fontWeight: 900 }}>Existing Types + Options</div>

            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              {types.map((t) => {
                const opts = options.filter((o) => o.achievement_type_id === t.id);
                return (
                  <div key={t.id} style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.20)" }}>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                      <input
                        className="zombie-input"
                        value={t.name}
                        onChange={(e) => setTypes((prev) => prev.map((x) => x.id === t.id ? { ...x, name: e.target.value } : x))}
                        style={{ padding: "8px 10px", minWidth: 240 }}
                      />

                      <select
                        className="zombie-input"
                        value={t.kind}
                        onChange={(e) => setTypes((prev) => prev.map((x) => x.id === t.id ? { ...x, kind: e.target.value as any } : x))}
                        style={{ padding: "8px 10px" }}
                      >
                        <option value="generic">generic</option>
                        <option value="swp_weapon">swp_weapon</option>
                        <option value="governor_count">governor_count</option>
                      </select>

                      <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <input
                          type="checkbox"
                          checked={!!t.requires_option}
                          onChange={(e) => setTypes((prev) => prev.map((x) => x.id === t.id ? { ...x, requires_option: e.target.checked } : x))}
                        />
                        <span style={{ opacity: 0.85, fontSize: 12 }}>requires option</span>
                      </label>

                      <div style={{ opacity: 0.75, fontSize: 12 }}>count</div>
                      <input
                        className="zombie-input"
                        value={String(t.required_count)}
                        onChange={(e) => setTypes((prev) => prev.map((x) => x.id === t.id ? { ...x, required_count: clampInt(e.target.value, 1, 999) } : x))}
                        style={{ padding: "8px 10px", width: 90 }}
                      />

                      <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <input
                          type="checkbox"
                          checked={!!t.active}
                          onChange={(e) => setTypes((prev) => prev.map((x) => x.id === t.id ? { ...x, active: e.target.checked } : x))}
                        />
                        <span style={{ opacity: 0.85, fontSize: 12 }}>active</span>
                      </label>

                      <div style={{ marginLeft: "auto", display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <button className="zombie-btn" style={{ padding: "8px 10px", fontWeight: 900 }} onClick={() => updateType(t)}>Save</button>
                        <button className="zombie-btn" style={{ padding: "8px 10px" }} onClick={() => deleteType(t.id)}>Delete</button>
                      </div>
                    </div>

                    {t.requires_option ? (
                      <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                        <div style={{ opacity: 0.75, fontSize: 12 }}>Options</div>
                        {opts.map((o) => (
                          <div key={o.id} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                            <input
                              className="zombie-input"
                              value={o.label}
                              onChange={(e) => setOptions((prev) => prev.map((x) => x.id === o.id ? { ...x, label: e.target.value } : x))}
                              style={{ padding: "8px 10px", minWidth: 220 }}
                            />
                            <input
                              className="zombie-input"
                              value={String(o.sort)}
                              onChange={(e) => setOptions((prev) => prev.map((x) => x.id === o.id ? { ...x, sort: clampInt(e.target.value, -999, 999) } : x))}
                              style={{ padding: "8px 10px", width: 90 }}
                            />
                            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                              <input
                                type="checkbox"
                                checked={!!o.active}
                                onChange={(e) => setOptions((prev) => prev.map((x) => x.id === o.id ? { ...x, active: e.target.checked } : x))}
                              />
                              <span style={{ opacity: 0.85, fontSize: 12 }}>active</span>
                            </label>
                            <button className="zombie-btn" style={{ padding: "8px 10px", fontWeight: 900 }} onClick={() => updateOption(o)}>Save</button>
                            <button className="zombie-btn" style={{ padding: "8px 10px" }} onClick={() => deleteOption(o.id)}>Delete</button>
                          </div>
                        ))}
                        {opts.length === 0 ? <div style={{ opacity: 0.75 }}>No options yet.</div> : null}
                      </div>
                    ) : null}
                  </div>
                );
              })}
              {types.length === 0 ? <div style={{ opacity: 0.75 }}>No types found.</div> : null}
            </div>
          </div>
        </div>
      ) : null}

      {tab === "access" ? (
        <div className="zombie-card" style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 900 }}>Grant Access (paste User UUID)</div>
          <div style={{ opacity: 0.75, fontSize: 12, marginTop: 6 }}>
            can_view: can see tracker • can_edit: can update requests • can_manage_types: can edit dropdowns (types/options)
          </div>

          <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <input className="zombie-input" value={accUserId} onChange={(e) => setAccUserId(e.target.value)} placeholder="user uuid" style={{ padding: "10px 12px", minWidth: 320 }} />
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="checkbox" checked={accView} onChange={(e) => setAccView(e.target.checked)} />
              <span>view</span>
            </label>
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="checkbox" checked={accEdit} onChange={(e) => setAccEdit(e.target.checked)} />
              <span>edit</span>
            </label>
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="checkbox" checked={accManage} onChange={(e) => setAccManage(e.target.checked)} />
              <span>manage types</span>
            </label>
            <button className="zombie-btn" style={{ padding: "10px 12px", fontWeight: 900 }} onClick={upsertAccess}>Save</button>
          </div>

          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            {access.map((a) => (
              <div key={a.id} style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.20)" }}>
                <div style={{ fontWeight: 900 }}>{a.user_id}</div>
                <div style={{ opacity: 0.75, fontSize: 12, marginTop: 6 }}>
                  view={String(a.can_view)} • edit={String(a.can_edit)} • manage_types={String(a.can_manage_types)}
                </div>
                <button className="zombie-btn" style={{ marginTop: 10, padding: "8px 10px" }} onClick={() => deleteAccess(a.id)}>Remove</button>
              </div>
            ))}
            {access.length === 0 ? <div style={{ opacity: 0.75 }}>No access rows yet.</div> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}