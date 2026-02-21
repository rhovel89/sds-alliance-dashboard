import React, { useEffect, useMemo, useState } from "react";
import SupportBundleButton from "../../components/system/SupportBundleButton";
import {
  SatKind,
  SatType,
  SatOption,
  exportSatState,
  importSatState,
  getAccess,
  getStateOptions,
  getStateTypes,
  loadSatStore,
  upsertAccess,
  upsertOption,
  upsertType,
  deleteOption,
  deleteType,
} from "../../lib/stateAchievementsLocalStore";
import { supabase } from "../../lib/supabaseClient";

const STATE = "789";

function norm(s: any) { return String(s || "").trim(); }
function uid() { return Math.random().toString(16).slice(2) + "-" + Date.now().toString(16); }

export default function OwnerStateAchievementCatalogPage() {
  const [stateCode, setStateCode] = useState(STATE);
  const [meId, setMeId] = useState<string | null>(null);

  const [types, setTypes] = useState<SatType[]>(() => getStateTypes(STATE));
  const [options, setOptions] = useState<SatOption[]>(() => getStateOptions(STATE));
  const [selectedTypeId, setSelectedTypeId] = useState<string>(types[0]?.id || "");

  const [typeName, setTypeName] = useState("");
  const [typeKind, setTypeKind] = useState<SatKind>("weapon");
  const [typeRequiresOpt, setTypeRequiresOpt] = useState(true);
  const [typeReqCount, setTypeReqCount] = useState(1);
  const [typeActive, setTypeActive] = useState(true);

  const [optLabel, setOptLabel] = useState("");
  const [optActive, setOptActive] = useState(true);

  const [viewId, setViewId] = useState("");
  const [editId, setEditId] = useState("");

  const access = useMemo(() => getAccess(stateCode), [stateCode, types, options]);

  useEffect(() => {
    (async () => {
      try {
        const u = await supabase.auth.getUser();
        setMeId(u.data.user?.id || null);
      } catch {
        setMeId(null);
      }
    })();
  }, []);

  function reload() {
    loadSatStore(); // ensures defaults exist
    const t = getStateTypes(stateCode);
    const o = getStateOptions(stateCode);
    setTypes(t);
    setOptions(o);
    if (!t.find(x => x.id === selectedTypeId)) {
      setSelectedTypeId(t[0]?.id || "");
    }
  }

  useEffect(() => { reload(); }, [stateCode]);

  const selectedType = useMemo(() => types.find(t => t.id === selectedTypeId) || null, [types, selectedTypeId]);
  const optsForSelected = useMemo(
    () => options.filter(o => o.typeId === selectedTypeId),
    [options, selectedTypeId]
  );

  function startNewType() {
    setSelectedTypeId("");
    setTypeName("");
    setTypeKind("weapon");
    setTypeRequiresOpt(true);
    setTypeReqCount(1);
    setTypeActive(true);
  }

  function loadTypeIntoForm(t: SatType) {
    setSelectedTypeId(t.id);
    setTypeName(t.name);
    setTypeKind(t.kind);
    setTypeRequiresOpt(!!t.requiresOption);
    setTypeReqCount(Number(t.requiredCount || 1));
    setTypeActive(!!t.active);
  }

  function saveType() {
    const name = norm(typeName);
    if (!name) return alert("Achievement name required.");
    const id = upsertType({
      id: selectedTypeId || undefined,
      stateCode,
      name,
      kind: typeKind,
      requiresOption: !!typeRequiresOpt,
      requiredCount: Math.max(1, Number(typeReqCount || 1)),
      active: !!typeActive,
    });
    setSelectedTypeId(id);
    reload();
  }

  function removeType() {
    if (!selectedTypeId) return;
    if (!confirm("Delete achievement type (and its options)?")) return;
    deleteType(selectedTypeId);
    startNewType();
    reload();
  }

  function addOrUpdateOption(existingId?: string) {
    if (!selectedTypeId) return alert("Select an achievement type first.");
    const label = norm(optLabel);
    if (!label) return alert("Weapon/Option label required (e.g. Rail Gun).");
    upsertOption({
      id: existingId || undefined,
      stateCode,
      typeId: selectedTypeId,
      label,
      active: !!optActive,
    });
    setOptLabel("");
    setOptActive(true);
    reload();
  }

  function loadOption(o: SatOption) {
    setOptLabel(o.label);
    setOptActive(!!o.active);
  }

  function removeOption(id: string) {
    if (!confirm("Delete option?")) return;
    deleteOption(id);
    reload();
  }

  async function copyExport() {
    const payload = exportSatState(stateCode);
    const txt = JSON.stringify(payload, null, 2);
    try { await navigator.clipboard.writeText(txt); alert("Copied export JSON."); }
    catch { window.prompt("Copy:", txt); }
  }

  function doImport() {
    const raw = window.prompt("Paste export JSON:");
    if (!raw) return;
    try {
      const p = JSON.parse(raw);
      importSatState(p);
      reload();
      alert("Imported.");
    } catch (e: any) {
      alert("Import failed: " + (e?.message || String(e)));
    }
  }

  function saveAccess() {
    const v = access.canViewUserIds.slice();
    const e = access.canEditUserIds.slice();

    const addUnique = (arr: string[], id: string) => {
      const x = norm(id);
      if (!x) return;
      if (!arr.includes(x)) arr.push(x);
    };

    addUnique(v, viewId);
    addUnique(e, editId);

    upsertAccess(stateCode, v, e);
    setViewId("");
    setEditId("");
    reload();
    alert("Saved access list (UI-only).");
  }

  function removeAccess(kind: "view" | "edit", id: string) {
    const v = access.canViewUserIds.slice();
    const e = access.canEditUserIds.slice();
    if (kind === "view") {
      upsertAccess(stateCode, v.filter(x => x !== id), e);
    } else {
      upsertAccess(stateCode, v, e.filter(x => x !== id));
    }
    reload();
  }

  return (
    <div style={{ padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>🏆 Owner — State Achievements Catalog (Local)</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={reload}>Reload</button>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={copyExport}>Export</button>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={doImport}>Import</button>
          <SupportBundleButton />
        </div>
      </div>

      <div className="zombie-card" style={{ marginTop: 12 }}>
        <div style={{ opacity: 0.7, fontSize: 12 }}>
          Storage mode: <b>localStorage</b> (safe). This avoids DB constraint issues and works immediately.
        </div>
        <div style={{ marginTop: 8, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ opacity: 0.75, fontSize: 12 }}>State</div>
          <input className="zombie-input" value={stateCode} onChange={(e) => setStateCode(e.target.value.trim())} style={{ padding: "10px 12px", width: 110 }} />
          <div style={{ marginLeft: "auto", opacity: 0.65, fontSize: 12 }}>
            You: {meId || "(not signed in)"}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "minmax(320px, 1fr) minmax(360px, 1.1fr)", gap: 12 }}>
        <div className="zombie-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <div style={{ fontWeight: 900 }}>Achievement Types</div>
            <button className="zombie-btn" style={{ padding: "8px 10px", fontSize: 12 }} onClick={startNewType}>+ New</button>
          </div>

          <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
            {types.map((t) => (
              <div
                key={t.id}
                onClick={() => loadTypeIntoForm(t)}
                style={{
                  cursor: "pointer",
                  padding: 10,
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.10)",
                  background: t.id === selectedTypeId ? "rgba(120,255,120,0.10)" : "rgba(0,0,0,0.20)",
                }}
              >
                <div style={{ fontWeight: 900 }}>{t.name}</div>
                <div style={{ opacity: 0.7, fontSize: 12, marginTop: 4 }}>
                  kind={t.kind} • requiresOption={String(t.requiresOption)} • requiredCount={t.requiredCount} • active={String(t.active)}
                </div>
              </div>
            ))}
            {types.length === 0 ? <div style={{ opacity: 0.75 }}>No types yet.</div> : null}
          </div>
        </div>

        <div className="zombie-card">
          <div style={{ fontWeight: 900 }}>{selectedTypeId ? "Edit Type" : "Create Type"}</div>

          <div style={{ marginTop: 10 }}>
            <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Name</div>
            <input className="zombie-input" value={typeName} onChange={(e) => setTypeName(e.target.value)} style={{ width: "100%", padding: "10px 12px" }} placeholder="SWP Weapon / Governor (3x) / Puzzle..." />
          </div>

          <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Kind</div>
              <select className="zombie-input" value={typeKind} onChange={(e) => setTypeKind(e.target.value as any)} style={{ width: "100%", padding: "10px 12px" }}>
                <option value="weapon">weapon (SWP)</option>
                <option value="count">count (Governor rotations)</option>
                <option value="milestone">milestone (100% complete)</option>
              </select>
            </div>

            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Required Count</div>
              <input className="zombie-input" type="number" value={typeReqCount} onChange={(e) => setTypeReqCount(Number(e.target.value))} style={{ width: "100%", padding: "10px 12px" }} />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 22 }}>
              <input type="checkbox" checked={typeRequiresOpt} onChange={(e) => setTypeRequiresOpt(e.target.checked)} />
              <div style={{ opacity: 0.8, fontSize: 12 }}>Requires Option (weapon list)</div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 22 }}>
              <input type="checkbox" checked={typeActive} onChange={(e) => setTypeActive(e.target.checked)} />
              <div style={{ opacity: 0.8, fontSize: 12 }}>Active</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
            <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={saveType}>Save Type</button>
            {selectedTypeId ? (
              <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={removeType}>Delete Type</button>
            ) : null}
          </div>

          {selectedType && selectedType.requiresOption ? (
            <div className="zombie-card" style={{ marginTop: 12, background: "rgba(0,0,0,0.20)" }}>
              <div style={{ fontWeight: 900 }}>Options / Weapons for: {selectedType.name}</div>

              <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <input className="zombie-input" value={optLabel} onChange={(e) => setOptLabel(e.target.value)} placeholder="Rail Gun" style={{ padding: "10px 12px", flex: 1, minWidth: 220 }} />
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input type="checkbox" checked={optActive} onChange={(e) => setOptActive(e.target.checked)} />
                  <div style={{ opacity: 0.8, fontSize: 12 }}>Active</div>
                </div>
                <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => addOrUpdateOption()}>Add</button>
              </div>

              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                {optsForSelected.map((o) => (
                  <div key={o.id} style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)" }}>
                    <div style={{ fontWeight: 900 }}>{o.label}</div>
                    <div style={{ opacity: 0.7, fontSize: 12, marginTop: 4 }}>active={String(o.active)}</div>
                    <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                      <button className="zombie-btn" style={{ padding: "6px 8px", fontSize: 12 }} onClick={() => loadOption(o)}>Load</button>
                      <button className="zombie-btn" style={{ padding: "6px 8px", fontSize: 12 }} onClick={() => removeOption(o.id)}>Delete</button>
                    </div>
                  </div>
                ))}
                {optsForSelected.length === 0 ? <div style={{ opacity: 0.75 }}>No options yet.</div> : null}
              </div>
            </div>
          ) : null}

          <div className="zombie-card" style={{ marginTop: 12, background: "rgba(0,0,0,0.20)" }}>
            <div style={{ fontWeight: 900 }}>Access List (UI-only)</div>
            <div style={{ opacity: 0.7, fontSize: 12, marginTop: 6 }}>
              Add user IDs who can view/edit the Owner Requests page for this state. (Client-side only for now.)
            </div>

            <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <input className="zombie-input" value={viewId} onChange={(e) => setViewId(e.target.value)} placeholder="UserId to add to VIEW" style={{ padding: "10px 12px", flex: 1, minWidth: 240 }} />
              <input className="zombie-input" value={editId} onChange={(e) => setEditId(e.target.value)} placeholder="UserId to add to EDIT" style={{ padding: "10px 12px", flex: 1, minWidth: 240 }} />
              <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={saveAccess}>Save</button>
            </div>

            <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <div style={{ fontWeight: 900, fontSize: 12, opacity: 0.8 }}>Can View</div>
                {(access.canViewUserIds || []).map((id) => (
                  <div key={id} style={{ marginTop: 6, display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                    <div style={{ fontFamily: "monospace", fontSize: 12 }}>{id}</div>
                    <button className="zombie-btn" style={{ padding: "4px 6px", fontSize: 12 }} onClick={() => removeAccess("view", id)}>Remove</button>
                  </div>
                ))}
                {(access.canViewUserIds || []).length === 0 ? <div style={{ opacity: 0.65, fontSize: 12, marginTop: 6 }}>None</div> : null}
              </div>

              <div>
                <div style={{ fontWeight: 900, fontSize: 12, opacity: 0.8 }}>Can Edit</div>
                {(access.canEditUserIds || []).map((id) => (
                  <div key={id} style={{ marginTop: 6, display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                    <div style={{ fontFamily: "monospace", fontSize: 12 }}>{id}</div>
                    <button className="zombie-btn" style={{ padding: "4px 6px", fontSize: 12 }} onClick={() => removeAccess("edit", id)}>Remove</button>
                  </div>
                ))}
                {(access.canEditUserIds || []).length === 0 ? <div style={{ opacity: 0.65, fontSize: 12, marginTop: 6 }}>None</div> : null}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}