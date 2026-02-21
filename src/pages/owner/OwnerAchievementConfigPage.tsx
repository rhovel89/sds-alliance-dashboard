import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import SupportBundleButton from "../../components/system/SupportBundleButton";

type AchType = {
  id: string;
  state_code: string;
  name: string;
  kind: "generic" | "swp_weapon" | "governor_count";
  requires_option: boolean;
  required_count: number;
  active: boolean;
  updated_at: string;
};

type AchOption = {
  id: string;
  achievement_type_id: string;
  label: string;
  sort: number;
  active: boolean;
  updated_at: string;
};

export default function OwnerAchievementConfigPage() {
  const STATE = "789";
  const [types, setTypes] = useState<AchType[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newKind, setNewKind] = useState<AchType["kind"]>("generic");
  const [newReqOpt, setNewReqOpt] = useState(false);
  const [newReqCount, setNewReqCount] = useState(1);

  const [selectedTypeId, setSelectedTypeId] = useState<string>("");
  const selectedType = useMemo(() => types.find((t) => t.id === selectedTypeId) || null, [types, selectedTypeId]);

  const [options, setOptions] = useState<AchOption[]>([]);
  const [optLabel, setOptLabel] = useState("");
  const [optSort, setOptSort] = useState(1);

  async function loadTypes() {
    setMsg(null);
    const r = await supabase
      .from("state_achievement_types")
      .select("id,state_code,name,kind,requires_option,required_count,active,updated_at")
      .eq("state_code", STATE)
      .order("name", { ascending: true });

    if (r.error) { setMsg("Load types failed: " + r.error.message); setTypes([]); return; }
    setTypes((r.data as any) || []);
  }

  async function loadOptions(typeId: string) {
    if (!typeId) { setOptions([]); return; }
    const r = await supabase
      .from("state_achievement_options")
      .select("id,achievement_type_id,label,sort,active,updated_at")
      .eq("achievement_type_id", typeId)
      .order("sort", { ascending: true })
      .order("label", { ascending: true });

    if (r.error) { setMsg("Load options failed: " + r.error.message); setOptions([]); return; }
    setOptions((r.data as any) || []);
  }

  useEffect(() => { loadTypes(); }, []);
  useEffect(() => { loadOptions(selectedTypeId); }, [selectedTypeId]);

  async function createType() {
    setMsg(null);
    const name = newName.trim();
    if (!name) return setMsg("Name required.");

    const payload: any = {
      state_code: STATE,
      name,
      kind: newKind,
      requires_option: !!newReqOpt,
      required_count: Math.max(1, Number(newReqCount || 1)),
      active: true,
    };

    const r = await supabase.from("state_achievement_types").insert(payload).select("id").maybeSingle();
    if (r.error) return setMsg("Create failed: " + r.error.message);

    setNewName("");
    await loadTypes();
  }

  async function toggleTypeActive(t: AchType) {
    setMsg(null);
    const r = await supabase.from("state_achievement_types").update({ active: !t.active } as any).eq("id", t.id);
    if (r.error) return setMsg("Update failed: " + r.error.message);
    await loadTypes();
  }

  async function updateType(t: AchType, patch: Partial<AchType>) {
    setMsg(null);
    const r = await supabase.from("state_achievement_types").update(patch as any).eq("id", t.id);
    if (r.error) return setMsg("Update failed: " + r.error.message);
    await loadTypes();
  }

  async function addOption() {
    setMsg(null);
    if (!selectedTypeId) return setMsg("Select an achievement type first.");
    const label = optLabel.trim();
    if (!label) return setMsg("Weapon/option label required.");

    const payload: any = {
      achievement_type_id: selectedTypeId,
      label,
      sort: Math.max(0, Number(optSort || 0)),
      active: true,
    };

    const r = await supabase.from("state_achievement_options").insert(payload).select("id").maybeSingle();
    if (r.error) return setMsg("Add option failed: " + r.error.message);

    setOptLabel("");
    await loadOptions(selectedTypeId);
  }

  async function toggleOptionActive(o: AchOption) {
    setMsg(null);
    const r = await supabase.from("state_achievement_options").update({ active: !o.active } as any).eq("id", o.id);
    if (r.error) return setMsg("Update option failed: " + r.error.message);
    await loadOptions(selectedTypeId);
  }

  async function updateOption(o: AchOption, patch: Partial<AchOption>) {
    setMsg(null);
    const r = await supabase.from("state_achievement_options").update(patch as any).eq("id", o.id);
    if (r.error) return setMsg("Update option failed: " + r.error.message);
    await loadOptions(selectedTypeId);
  }

  return (
    <div style={{ padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>🧟 Owner — Achievements Config (State 789)</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={loadTypes}>Refresh</button>
          <SupportBundleButton />
        </div>
      </div>

      {msg ? (
        <div className="zombie-card" style={{ marginTop: 12, border: "1px solid rgba(255,80,80,0.35)" }}>
          <div style={{ fontWeight: 900 }}>Message</div>
          <div style={{ opacity: 0.85, marginTop: 6 }}>{msg}</div>
        </div>
      ) : null}

      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "minmax(340px, 1fr) minmax(340px, 1fr)", gap: 12 }}>
        <div className="zombie-card">
          <div style={{ fontWeight: 900 }}>Achievement Types</div>

          <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
            <input className="zombie-input" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder='New achievement name (e.g. "SWP Weapon")' style={{ padding: "10px 12px" }} />

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <select className="zombie-input" value={newKind} onChange={(e) => setNewKind(e.target.value as any)} style={{ padding: "10px 12px", flex: 1, minWidth: 180 }}>
                <option value="generic">generic</option>
                <option value="swp_weapon">swp_weapon</option>
                <option value="governor_count">governor_count</option>
              </select>

              <input className="zombie-input" type="number" value={newReqCount} onChange={(e) => setNewReqCount(Number(e.target.value))} style={{ padding: "10px 12px", width: 120 }} />
              <label style={{ display: "flex", gap: 8, alignItems: "center", opacity: 0.85 }}>
                <input type="checkbox" checked={newReqOpt} onChange={(e) => setNewReqOpt(e.target.checked)} />
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
                  <button className="zombie-btn" style={{ padding: "6px 8px", fontSize: 12 }} onClick={() => setSelectedTypeId(t.id)}>
                    Manage Options
                  </button>
                  <button className="zombie-btn" style={{ padding: "6px 8px", fontSize: 12 }} onClick={() => toggleTypeActive(t)}>
                    {t.active ? "Deactivate" : "Activate"}
                  </button>
                  <button className="zombie-btn" style={{ padding: "6px 8px", fontSize: 12 }} onClick={() => updateType(t, { required_count: Math.max(1, t.required_count) })}>
                    Touch
                  </button>
                </div>
              </div>
            ))}
            {types.length === 0 ? <div style={{ opacity: 0.75 }}>No types.</div> : null}
          </div>
        </div>

        <div className="zombie-card">
          <div style={{ fontWeight: 900 }}>Options / Weapons</div>
          <div style={{ marginTop: 8, opacity: 0.75, fontSize: 12 }}>
            Select a type that requires options (e.g. SWP Weapon), then add/edit weapons.
          </div>

          <div style={{ marginTop: 10 }}>
            <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Selected Type</div>
            <select className="zombie-input" value={selectedTypeId} onChange={(e) => setSelectedTypeId(e.target.value)} style={{ width: "100%", padding: "10px 12px" }}>
              <option value="">(select)</option>
              {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>

          {selectedTypeId ? (
            <>
              <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <input className="zombie-input" value={optLabel} onChange={(e) => setOptLabel(e.target.value)} placeholder="Weapon name (e.g. Rail Gun)" style={{ padding: "10px 12px", flex: 1, minWidth: 220 }} />
                <input className="zombie-input" type="number" value={optSort} onChange={(e) => setOptSort(Number(e.target.value))} style={{ padding: "10px 12px", width: 120 }} />
                <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={addOption}>Add</button>
              </div>

              <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                {options.map((o) => (
                  <div key={o.id} style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.20)" }}>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                      <div style={{ fontWeight: 900 }}>#{o.sort} {o.label} {o.active ? "" : "(inactive)"}</div>
                      <div style={{ marginLeft: "auto", opacity: 0.7, fontSize: 12 }}>{o.updated_at}</div>
                    </div>

                    <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <button className="zombie-btn" style={{ padding: "6px 8px", fontSize: 12 }} onClick={() => toggleOptionActive(o)}>
                        {o.active ? "Deactivate" : "Activate"}
                      </button>
                      <button className="zombie-btn" style={{ padding: "6px 8px", fontSize: 12 }} onClick={() => updateOption(o, { sort: Math.max(0, o.sort) })}>
                        Touch
                      </button>
                    </div>
                  </div>
                ))}
                {options.length === 0 ? <div style={{ opacity: 0.75 }}>No options for this type.</div> : null}
              </div>
            </>
          ) : (
            <div style={{ marginTop: 12, opacity: 0.75 }}>Select a type.</div>
          )}
        </div>
      </div>
    </div>
  );
}