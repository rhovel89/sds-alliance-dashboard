import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type SatType = {
  id: string;
  state_code: string;
  name: string;
  kind: string | null;
  requires_option: boolean | null;
  required_count: number | null;
  active: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type SatOption = {
  id: string;
  state_code: string;
  achievement_type_id: string;
  label: string;
  active: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type AccessRow = {
  id: string;
  state_code: string;
  user_id: string;
  can_view: boolean | null;
  can_edit: boolean | null;
  created_at?: string | null;
};

const STATE = "789";

function norm(s: any) { return String(s || "").trim(); }

export default function OwnerStateAchievementsAdminPage() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [types, setTypes] = useState<SatType[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState<string>("");

  const selectedType = useMemo(
    () => types.find((t) => t.id === selectedTypeId) || null,
    [types, selectedTypeId]
  );

  const [options, setOptions] = useState<SatOption[]>([]);
  const [access, setAccess] = useState<AccessRow[]>([]);

  // Create Type form
  const [newTypeName, setNewTypeName] = useState("");
  const [newTypeRequiresOption, setNewTypeRequiresOption] = useState(false);
  const [newTypeRequiredCount, setNewTypeRequiredCount] = useState<number>(1);
  const newTypeKind = "count"; // IMPORTANT: sat_kind_chk expects allowed values; we only use 'count'

  // Create Option form
  const [newOptionLabel, setNewOptionLabel] = useState("");

  // Access form
  const [accessUserId, setAccessUserId] = useState("");
  const [accessCanView, setAccessCanView] = useState(true);
  const [accessCanEdit, setAccessCanEdit] = useState(false);

  async function loadAll() {
    setErr(null);
    setLoading(true);
    try {
      const tRes = await supabase
        .from("state_achievement_types")
        .select("id,state_code,name,kind,requires_option,required_count,active,created_at,updated_at")
        .eq("state_code", STATE)
        .order("name", { ascending: true });

      if (tRes.error) throw new Error(tRes.error.message);
      const t = (tRes.data || []) as SatType[];
      setTypes(t);

      const first = t.find((x) => x.active !== false)?.id || t[0]?.id || "";
      setSelectedTypeId((prev) => prev || first);

      const aRes = await supabase
        .from("state_achievement_access")
        .select("id,state_code,user_id,can_view,can_edit,created_at")
        .eq("state_code", STATE)
        .order("created_at", { ascending: false });

      if (aRes.error) throw new Error(aRes.error.message);
      setAccess((aRes.data || []) as AccessRow[]);
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  async function loadOptions(typeId: string) {
    setErr(null);
    if (!typeId) { setOptions([]); return; }
    try {
      const oRes = await supabase
        .from("state_achievement_options")
        .select("id,state_code,achievement_type_id,label,active,created_at,updated_at")
        .eq("state_code", STATE)
        .eq("achievement_type_id", typeId)
        .order("label", { ascending: true });

      if (oRes.error) throw new Error(oRes.error.message);
      setOptions((oRes.data || []) as SatOption[]);
    } catch (e: any) {
      setErr(e?.message || String(e));
      setOptions([]);
    }
  }

  useEffect(() => { loadAll(); }, []);
  useEffect(() => { loadOptions(selectedTypeId); }, [selectedTypeId]);

  async function createType(preset?: "swp" | "gov") {
    setErr(null);
    const name = preset === "swp" ? "SWP Weapon" : preset === "gov" ? "Governor (3x)" : norm(newTypeName);
    const requires_option = preset === "swp" ? true : preset === "gov" ? false : !!newTypeRequiresOption;
    const required_count = preset === "swp" ? 1 : preset === "gov" ? 3 : Math.max(1, Number(newTypeRequiredCount || 1));

    if (!name) return alert("Type name required.");

    setLoading(true);
    try {
      const ins = await supabase
        .from("state_achievement_types")
        .insert({
          state_code: STATE,
          name,
          kind: newTypeKind,
          requires_option,
          required_count,
          active: true,
        })
        .select("id")
        .maybeSingle();

      if (ins.error) throw new Error(ins.error.message);

      setNewTypeName("");
      setNewTypeRequiresOption(false);
      setNewTypeRequiredCount(1);

      await loadAll();

      // Auto seed option for SWP Weapon
      if (preset === "swp" && ins.data?.id) {
        await supabase.from("state_achievement_options").insert({
          state_code: STATE,
          achievement_type_id: ins.data.id,
          label: "Rail Gun",
          active: true,
        });
        await loadOptions(ins.data.id);
      }
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  async function updateType(id: string, patch: Partial<SatType>) {
    setErr(null);
    setLoading(true);
    try {
      // Enforce kind safety
      const safePatch: any = { ...patch };
      if (typeof safePatch.kind !== "undefined") safePatch.kind = "count";

      const upd = await supabase.from("state_achievement_types").update(safePatch).eq("id", id);
      if (upd.error) throw new Error(upd.error.message);
      await loadAll();
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  async function deleteType(id: string) {
    if (!confirm("Delete achievement type? (This will deactivate it)")) return;
    await updateType(id, { active: false } as any);
  }

  async function createOption() {
    setErr(null);
    const label = norm(newOptionLabel);
    if (!selectedTypeId) return alert("Select a type first.");
    if (!label) return alert("Option label required.");
    setLoading(true);
    try {
      const ins = await supabase.from("state_achievement_options").insert({
        state_code: STATE,
        achievement_type_id: selectedTypeId,
        label,
        active: true,
      });
      if (ins.error) throw new Error(ins.error.message);
      setNewOptionLabel("");
      await loadOptions(selectedTypeId);
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  async function updateOption(id: string, patch: Partial<SatOption>) {
    setErr(null);
    setLoading(true);
    try {
      const upd = await supabase.from("state_achievement_options").update(patch as any).eq("id", id);
      if (upd.error) throw new Error(upd.error.message);
      await loadOptions(selectedTypeId);
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  async function deleteOption(id: string) {
    if (!confirm("Delete option? (This will deactivate it)")) return;
    await updateOption(id, { active: false } as any);
  }

  async function addAccess() {
    setErr(null);
    const uid = norm(accessUserId);
    if (!uid) return alert("user_id required (paste from /debug).");
    setLoading(true);
    try {
      const ins = await supabase.from("state_achievement_access").insert({
        state_code: STATE,
        user_id: uid,
        can_view: !!accessCanView,
        can_edit: !!accessCanEdit,
      });
      if (ins.error) throw new Error(ins.error.message);
      setAccessUserId("");
      setAccessCanView(true);
      setAccessCanEdit(false);
      await loadAll();
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  async function updateAccess(id: string, patch: Partial<AccessRow>) {
    setErr(null);
    setLoading(true);
    try {
      const upd = await supabase.from("state_achievement_access").update(patch as any).eq("id", id);
      if (upd.error) throw new Error(upd.error.message);
      await loadAll();
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  async function deleteAccess(id: string) {
    if (!confirm("Remove access row?")) return;
    setLoading(true);
    try {
      const del = await supabase.from("state_achievement_access").delete().eq("id", id);
      if (del.error) throw new Error(del.error.message);
      await loadAll();
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  async function exportJson() {
    const payload = { exportedAtUtc: new Date().toISOString(), state: STATE, types, options, access };
    const txt = JSON.stringify(payload, null, 2);
    try { await navigator.clipboard.writeText(txt); alert("Copied export JSON."); }
    catch { window.prompt("Copy:", txt); }
  }

  function badge(active: boolean | null | undefined) {
    return active === false ? "OFF" : "ON";
  }

  return (
    <div style={{ padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>🏆 Owner — State 789 Achievements (Types + Options + Access)</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={loadAll} disabled={loading}>Reload</button>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={exportJson}>Export</button>
        </div>
      </div>

      {err ? (
        <div className="zombie-card" style={{ marginTop: 12, border: "1px solid rgba(255,120,120,0.35)" }}>
          <div style={{ fontWeight: 900, color: "#ffb3b3" }}>Error</div>
          <div style={{ marginTop: 6, whiteSpace: "pre-wrap", opacity: 0.9 }}>{err}</div>
        </div>
      ) : null}

      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "minmax(320px, 1fr) minmax(320px, 1fr)", gap: 12 }}>
        {/* Types */}
        <div className="zombie-card">
          <div style={{ fontWeight: 900 }}>Achievement Types</div>

          <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => createType("swp")} disabled={loading}>
              + Preset: SWP Weapon
            </button>
            <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => createType("gov")} disabled={loading}>
              + Preset: Governor (3x)
            </button>
          </div>

          <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input className="zombie-input" value={newTypeName} onChange={(e) => setNewTypeName(e.target.value)} placeholder="New type name…" style={{ padding: "10px 12px", flex: 1, minWidth: 180 }} />
            <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12, opacity: 0.9 }}>
              <input type="checkbox" checked={newTypeRequiresOption} onChange={(e) => setNewTypeRequiresOption(e.target.checked)} />
              Requires Option (SWP weapon list)
            </label>
            <input className="zombie-input" type="number" value={newTypeRequiredCount} onChange={(e) => setNewTypeRequiredCount(Number(e.target.value || 1))} style={{ padding: "10px 12px", width: 120 }} />
            <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => createType()} disabled={loading}>Create</button>
          </div>

          <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
            {types.map((t) => (
              <div key={t.id} style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: selectedTypeId === t.id ? "rgba(120,255,120,0.10)" : "rgba(0,0,0,0.20)" }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <button className="zombie-btn" style={{ padding: "6px 8px", fontSize: 12 }} onClick={() => setSelectedTypeId(t.id)}>
                    Select
                  </button>
                  <div style={{ fontWeight: 900 }}>{t.name}</div>
                  <div style={{ opacity: 0.7, fontSize: 12 }}>({badge(t.active)} • kind={t.kind || "count"} • reqCount={t.required_count ?? 1} • option={t.requires_option ? "yes" : "no"})</div>
                  <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                    <button className="zombie-btn" style={{ padding: "6px 8px", fontSize: 12 }} onClick={() => updateType(t.id, { active: !(t.active !== false) } as any)} disabled={loading}>
                      Toggle
                    </button>
                    <button className="zombie-btn" style={{ padding: "6px 8px", fontSize: 12 }} onClick={() => deleteType(t.id)} disabled={loading}>
                      Delete
                    </button>
                  </div>
                </div>

                <div style={{ marginTop: 8, display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <input className="zombie-input" defaultValue={t.name} onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v && v !== t.name) updateType(t.id, { name: v } as any);
                  }} style={{ padding: "8px 10px", flex: 1, minWidth: 180 }} />
                  <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12, opacity: 0.9 }}>
                    <input type="checkbox" defaultChecked={!!t.requires_option} onChange={(e) => updateType(t.id, { requires_option: e.target.checked } as any)} />
                    Requires Option
                  </label>
                  <input className="zombie-input" type="number" defaultValue={t.required_count ?? 1} onBlur={(e) => {
                    const n = Math.max(1, Number(e.target.value || 1));
                    if (n !== (t.required_count ?? 1)) updateType(t.id, { required_count: n } as any);
                  }} style={{ padding: "8px 10px", width: 120 }} />
                </div>
              </div>
            ))}
            {types.length === 0 ? <div style={{ opacity: 0.75 }}>No types yet.</div> : null}
          </div>
        </div>

        {/* Options + Access */}
        <div style={{ display: "grid", gap: 12 }}>
          <div className="zombie-card">
            <div style={{ fontWeight: 900 }}>Options (for selected type)</div>
            <div style={{ marginTop: 6, opacity: 0.75, fontSize: 12 }}>
              Selected: {selectedType ? selectedType.name : "(none)"}
            </div>

            <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <input className="zombie-input" value={newOptionLabel} onChange={(e) => setNewOptionLabel(e.target.value)} placeholder="New option label… (Rail Gun)" style={{ padding: "10px 12px", flex: 1, minWidth: 200 }} />
              <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={createOption} disabled={loading || !selectedTypeId}>Add</button>
            </div>

            <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
              {options.map((o) => (
                <div key={o.id} style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.20)" }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <div style={{ fontWeight: 900 }}>{o.label}</div>
                    <div style={{ opacity: 0.7, fontSize: 12 }}>({badge(o.active)})</div>
                    <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                      <button className="zombie-btn" style={{ padding: "6px 8px", fontSize: 12 }} onClick={() => updateOption(o.id, { active: !(o.active !== false) } as any)} disabled={loading}>
                        Toggle
                      </button>
                      <button className="zombie-btn" style={{ padding: "6px 8px", fontSize: 12 }} onClick={() => deleteOption(o.id)} disabled={loading}>
                        Delete
                      </button>
                    </div>
                  </div>

                  <div style={{ marginTop: 8 }}>
                    <input className="zombie-input" defaultValue={o.label} onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v && v !== o.label) updateOption(o.id, { label: v } as any);
                    }} style={{ padding: "8px 10px", width: "100%" }} />
                  </div>
                </div>
              ))}
              {selectedTypeId && options.length === 0 ? <div style={{ opacity: 0.75 }}>No options yet.</div> : null}
              {!selectedTypeId ? <div style={{ opacity: 0.75 }}>Select a type to manage options.</div> : null}
            </div>
          </div>

          <div className="zombie-card">
            <div style={{ fontWeight: 900 }}>Access (View/Edit Achievements)</div>

            <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <input className="zombie-input" value={accessUserId} onChange={(e) => setAccessUserId(e.target.value)} placeholder="user_id (paste)" style={{ padding: "10px 12px", flex: 1, minWidth: 220 }} />
              <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12, opacity: 0.9 }}>
                <input type="checkbox" checked={accessCanView} onChange={(e) => setAccessCanView(e.target.checked)} />
                Can view
              </label>
              <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12, opacity: 0.9 }}>
                <input type="checkbox" checked={accessCanEdit} onChange={(e) => setAccessCanEdit(e.target.checked)} />
                Can edit
              </label>
              <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={addAccess} disabled={loading}>Grant</button>
            </div>

            <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
              {access.map((a) => (
                <div key={a.id} style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.20)" }}>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                    <div style={{ fontWeight: 900 }}>{a.user_id}</div>
                    <div style={{ opacity: 0.7, fontSize: 12 }}>
                      view={a.can_view ? "yes" : "no"} • edit={a.can_edit ? "yes" : "no"}
                    </div>
                    <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                      <button className="zombie-btn" style={{ padding: "6px 8px", fontSize: 12 }} onClick={() => updateAccess(a.id, { can_view: !a.can_view } as any)} disabled={loading}>
                        Toggle View
                      </button>
                      <button className="zombie-btn" style={{ padding: "6px 8px", fontSize: 12 }} onClick={() => updateAccess(a.id, { can_edit: !a.can_edit } as any)} disabled={loading}>
                        Toggle Edit
                      </button>
                      <button className="zombie-btn" style={{ padding: "6px 8px", fontSize: 12 }} onClick={() => deleteAccess(a.id)} disabled={loading}>
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {access.length === 0 ? <div style={{ opacity: 0.75 }}>No access rows yet.</div> : null}
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 12, opacity: 0.65, fontSize: 12 }}>
        Note: “kind” is locked to <b>count</b> to satisfy <code>sat_kind_chk</code>.
      </div>
    </div>
  );
}