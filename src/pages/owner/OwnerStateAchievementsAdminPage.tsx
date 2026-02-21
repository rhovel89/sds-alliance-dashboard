import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import SupportBundleButton from "../../components/system/SupportBundleButton";

type AnyRow = Record<string, any>;
function nowUtc() { return new Date().toISOString(); }
function norm(v: any) { return String(v || "").trim(); }
function normLower(v: any) { return String(v || "").trim().toLowerCase(); }
function asInt(v: any, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.floor(n) : fallback;
}

export default function OwnerStateAchievementsAdminPage() {
  const [stateCode, setStateCode] = useState("789");
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const [types, setTypes] = useState<AnyRow[]>([]);
  const [options, setOptions] = useState<AnyRow[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState<string>("");

  const [tName, setTName] = useState("SWP Weapon");
  const [tKind, setTKind] = useState("count");
  const [tRequiresOption, setTRequiresOption] = useState(true);
  const [tRequiredCount, setTRequiredCount] = useState(1);
  const [tActive, setTActive] = useState(true);

  const [oLabel, setOLabel] = useState("Rail Gun");
  const [oSort, setOSort] = useState(10);
  const [oActive, setOActive] = useState(true);

  const typeById = useMemo(() => {
    const m: Record<string, AnyRow> = {};
    for (const t of types) if (t?.id) m[String(t.id)] = t;
    return m;
  }, [types]);

  const optionsForType = useMemo(() => {
    const tid = String(selectedTypeId || "");
    return (options || []).filter((o) => String(o.achievement_type_id || "") === tid);
  }, [options, selectedTypeId]);

  async function loadAll() {
    setLoading(true);
    setMsg(null);

    const t = await supabase
      .from("state_achievement_types")
      .select("*")
      .eq("state_code", stateCode)
      .order("name", { ascending: true });

    if (t.error) {
      setTypes([]); setOptions([]);
      setMsg("Types load failed: " + t.error.message);
      setLoading(false);
      return;
    }

    const tData = (t.data as any[]) || [];
    setTypes(tData);

    const firstId = tData[0]?.id ? String(tData[0].id) : "";
    if (!selectedTypeId && firstId) setSelectedTypeId(firstId);

    const ids = tData.map((x) => x?.id).filter(Boolean);
    if (ids.length) {
      const op = await supabase
        .from("state_achievement_options")
        .select("*")
        .in("achievement_type_id", ids)
        .order("sort", { ascending: true })
        .order("label", { ascending: true });

      if (op.error) {
        setOptions([]);
        setMsg((prev) => prev ? prev : ("Options load failed: " + op.error!.message));
      } else {
        setOptions((op.data as any[]) || []);
      }
    } else {
      setOptions([]);
    }

    setLoading(false);
  }

  useEffect(() => { loadAll(); }, [stateCode]);

  function fillTypeEditorFromSelected() {
    const t = typeById[String(selectedTypeId || "")];
    if (!t) return;
    setTName(String(t.name || ""));
    setTKind(String(t.kind || "count"));
    setTRequiresOption(!!t.requires_option);
    setTRequiredCount(Math.max(1, asInt(t.required_count, 1)));
    setTActive(t.active !== false);
  }

  useEffect(() => { fillTypeEditorFromSelected(); }, [selectedTypeId, types]);

  async function createOrUpdateType() {
    setMsg(null);
    const payload: AnyRow = {
      state_code: stateCode,
      name: norm(tName),
      kind: norm(tKind) || "count",
      requires_option: !!tRequiresOption,
      required_count: Math.max(1, asInt(tRequiredCount, 1)),
      active: !!tActive
    };

    if (!payload.name) {
      setMsg("Type name required.");
      return;
    }

    // If editing existing (selected), update; else insert
    if (selectedTypeId) {
      const up = await supabase
        .from("state_achievement_types")
        .update(payload as any)
        .eq("id", selectedTypeId)
        .select("*")
        .maybeSingle();

      if (up.error) {
        setMsg("Type update failed: " + up.error.message);
        return;
      }

      setMsg("✅ Type updated.");
      await loadAll();
      return;
    }

    const ins = await supabase
      .from("state_achievement_types")
      .insert(payload as any)
      .select("*")
      .maybeSingle();

    if (ins.error) {
      setMsg("Type create failed: " + ins.error.message);
      return;
    }

    setMsg("✅ Type created.");
    setSelectedTypeId(String((ins.data as any)?.id || ""));
    await loadAll();
  }

  async function deleteType() {
    setMsg(null);
    if (!selectedTypeId) return;
    if (!confirm("Delete this achievement type? (Options may remain orphaned if DB has no cascade)")) return;

    const del = await supabase.from("state_achievement_types").delete().eq("id", selectedTypeId);
    if (del.error) {
      setMsg("Type delete failed: " + del.error.message);
      return;
    }

    setMsg("✅ Type deleted.");
    setSelectedTypeId("");
    await loadAll();
  }

  async function createOption() {
    setMsg(null);
    const tid = String(selectedTypeId || "");
    if (!tid) { setMsg("Select an achievement type first."); return; }

    const payload: AnyRow = {
      achievement_type_id: tid,
      label: norm(oLabel),
      sort: asInt(oSort, 10),
      active: !!oActive
    };

    if (!payload.label) { setMsg("Option label required."); return; }

    const ins = await supabase
      .from("state_achievement_options")
      .insert(payload as any)
      .select("*")
      .maybeSingle();

    if (ins.error) {
      setMsg("Option create failed: " + ins.error.message);
      return;
    }

    setMsg("✅ Option created.");
    setOLabel("");
    await loadAll();
  }

  async function updateOption(id: string, patch: AnyRow) {
    setMsg(null);
    const up = await supabase
      .from("state_achievement_options")
      .update(patch as any)
      .eq("id", id)
      .select("*")
      .maybeSingle();

    if (up.error) {
      setMsg("Option update failed: " + up.error.message);
      return;
    }

    const row = up.data as any;
    setOptions((prev) => prev.map((x) => (String(x.id) === String(id) ? row : x)));
    setMsg("✅ Option updated.");
  }

  async function deleteOption(id: string) {
    setMsg(null);
    if (!confirm("Delete this option?")) return;
    const del = await supabase.from("state_achievement_options").delete().eq("id", id);
    if (del.error) {
      setMsg("Option delete failed: " + del.error.message);
      return;
    }
    setMsg("✅ Option deleted.");
    setOptions((prev) => prev.filter((x) => String(x.id) !== String(id)));
  }

  async function seedDefaults() {
    setMsg(null);

    // Ensure SWP Weapon
    const swp = types.find((t) => normLower(t.name) === "swp weapon" && String(t.state_code) === String(stateCode));
    let swpId = swp?.id ? String(swp.id) : "";

    if (!swpId) {
      const ins = await supabase
        .from("state_achievement_types")
        .insert({
          state_code: stateCode,
          name: "SWP Weapon",
          kind: "count",
          requires_option: true,
          required_count: 1,
          active: true
        } as any)
        .select("*")
        .maybeSingle();

      if (ins.error) { setMsg("Seed SWP Weapon failed: " + ins.error.message); return; }
      swpId = String((ins.data as any)?.id || "");
    }

    // Ensure Governor Rotations
    const gov = types.find((t) => normLower(t.name) === "governor rotations" && String(t.state_code) === String(stateCode));
    if (!gov?.id) {
      const ins2 = await supabase
        .from("state_achievement_types")
        .insert({
          state_code: stateCode,
          name: "Governor Rotations",
          kind: "count",
          requires_option: false,
          required_count: 3,
          active: true
        } as any)
        .select("*")
        .maybeSingle();

      if (ins2.error) { setMsg("Seed Governor Rotations failed: " + ins2.error.message); return; }
    }

    // Ensure Rail Gun option under SWP
    const existingRail = options.find((o) => String(o.achievement_type_id) === swpId && normLower(o.label) === "rail gun");
    if (!existingRail) {
      const ins3 = await supabase
        .from("state_achievement_options")
        .insert({
          achievement_type_id: swpId,
          label: "Rail Gun",
          sort: 10,
          active: true
        } as any)
        .select("*")
        .maybeSingle();

      if (ins3.error) { setMsg("Seed Rail Gun failed: " + ins3.error.message); return; }
    }

    setMsg("✅ Seeded defaults (SWP Weapon + Rail Gun + Governor Rotations).");
    await loadAll();
  }

  async function copyExport() {
    const payload = {
      version: 1,
      exportedUtc: nowUtc(),
      state_code: stateCode,
      types,
      options
    };
    const txt = JSON.stringify(payload, null, 2);
    try { await navigator.clipboard.writeText(txt); setMsg("✅ Copied export JSON."); }
    catch { window.prompt("Copy export JSON:", txt); }
  }

  function importExport() {
    const raw = window.prompt("Paste export JSON (types/options):");
    if (!raw) return;
    try {
      const p = JSON.parse(raw);
      const tt = Array.isArray(p?.types) ? p.types : [];
      const oo = Array.isArray(p?.options) ? p.options : [];
      (async () => {
        // best-effort import: insert types first (no id reuse assumption), then options
        for (const t of tt) {
          if (!t?.name) continue;
          await supabase.from("state_achievement_types").insert({
            state_code: stateCode,
            name: String(t.name),
            kind: String(t.kind || "count"),
            requires_option: !!t.requires_option,
            required_count: Math.max(1, asInt(t.required_count, 1)),
            active: t.active !== false
          } as any);
        }
        await loadAll();

        // try to map options by type name (best effort)
        const freshTypes = await supabase.from("state_achievement_types").select("*").eq("state_code", stateCode);
        const lut: Record<string, string> = {};
        for (const t of (freshTypes.data as any[]) || []) lut[normLower(t.name)] = String(t.id);

        for (const o of oo) {
          const label = String(o.label || "");
          if (!label) continue;
          const typeName = String(o.type_name || o.achievement_type_name || "");
          const tid = typeName ? (lut[normLower(typeName)] || "") : "";
          if (!tid) continue;
          await supabase.from("state_achievement_options").insert({
            achievement_type_id: tid,
            label,
            sort: asInt(o.sort, 10),
            active: o.active !== false
          } as any);
        }

        setMsg("✅ Imported (best effort).");
        await loadAll();
      })();
    } catch {
      setMsg("Invalid JSON.");
    }
  }

  return (
    <div style={{ padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>🏆 Owner — State Achievements Admin</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => window.location.assign("/owner/state-achievements")}>Back</button>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={loadAll}>Refresh</button>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={seedDefaults}>Seed Defaults</button>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={copyExport}>Export</button>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={importExport}>Import</button>
          <SupportBundleButton />
        </div>
      </div>

      <div className="zombie-card" style={{ marginTop: 12 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ opacity: 0.75, fontSize: 12 }}>State</div>
          <input className="zombie-input" value={stateCode} onChange={(e) => setStateCode(e.target.value)} style={{ padding: "10px 12px", width: 120 }} />
          <div style={{ opacity: 0.75, fontSize: 12 }}>
            {loading ? "Loading…" : `types=${types.length} • options=${options.length}`}
          </div>
        </div>
        {msg ? <div style={{ marginTop: 10 }}>{msg}</div> : null}
      </div>

      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "minmax(320px, 1fr) minmax(320px, 1.2fr)", gap: 12 }}>
        <div className="zombie-card">
          <div style={{ fontWeight: 900 }}>Achievement Types</div>

          <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
            {types.map((t) => (
              <div
                key={String(t.id)}
                onClick={() => setSelectedTypeId(String(t.id))}
                style={{
                  cursor: "pointer",
                  padding: 10,
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.10)",
                  background: String(t.id) === String(selectedTypeId) ? "rgba(120,255,120,0.10)" : "rgba(0,0,0,0.20)"
                }}
              >
                <div style={{ fontWeight: 900 }}>{String(t.name || t.id)}</div>
                <div style={{ opacity: 0.7, fontSize: 12, marginTop: 4 }}>
                  kind={String(t.kind || "count")} • requires_option={String(!!t.requires_option)} • required_count={String(t.required_count ?? 1)} • active={String(t.active !== false)}
                </div>
              </div>
            ))}
            {!loading && types.length === 0 ? <div style={{ opacity: 0.75 }}>No types yet. Click Seed Defaults.</div> : null}
          </div>
        </div>

        <div className="zombie-card">
          <div style={{ fontWeight: 900 }}>Edit Selected Type + Options</div>

          <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "minmax(240px, 1fr) minmax(240px, 1fr)", gap: 12 }}>
            <div>
              <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Type Name</div>
              <input className="zombie-input" value={tName} onChange={(e) => setTName(e.target.value)} style={{ width: "100%", padding: "10px 12px" }} />
            </div>
            <div>
              <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Kind (free text)</div>
              <input className="zombie-input" value={tKind} onChange={(e) => setTKind(e.target.value)} style={{ width: "100%", padding: "10px 12px" }} />
            </div>
            <div>
              <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="checkbox" checked={tRequiresOption} onChange={(e) => setTRequiresOption(e.target.checked)} />
                <span style={{ opacity: 0.85 }}>Requires Option (weapon dropdown)</span>
              </label>
            </div>
            <div>
              <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Required Count (Governor=3)</div>
              <input className="zombie-input" value={String(tRequiredCount)} onChange={(e) => setTRequiredCount(asInt(e.target.value, 1))} style={{ width: "100%", padding: "10px 12px" }} />
            </div>
            <div>
              <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="checkbox" checked={tActive} onChange={(e) => setTActive(e.target.checked)} />
                <span style={{ opacity: 0.85 }}>Active</span>
              </label>
            </div>
          </div>

          <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={createOrUpdateType}>
              {selectedTypeId ? "Save Type" : "Create Type"}
            </button>
            <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={deleteType} disabled={!selectedTypeId}>
              Delete Type
            </button>
          </div>

          <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.10)" }}>
            <div style={{ fontWeight: 900 }}>Options (Weapons) for Selected Type</div>

            <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <input className="zombie-input" value={oLabel} onChange={(e) => setOLabel(e.target.value)} placeholder="Weapon label (Rail Gun)" style={{ padding: "10px 12px", minWidth: 220, flex: 1 }} />
              <input className="zombie-input" value={String(oSort)} onChange={(e) => setOSort(asInt(e.target.value, 10))} placeholder="Sort" style={{ padding: "10px 12px", width: 110 }} />
              <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input type="checkbox" checked={oActive} onChange={(e) => setOActive(e.target.checked)} />
                <span style={{ opacity: 0.85 }}>Active</span>
              </label>
              <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={createOption} disabled={!selectedTypeId}>
                Add Option
              </button>
            </div>

            <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
              {optionsForType.map((o) => (
                <div key={String(o.id)} style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.20)" }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <div style={{ fontWeight: 900 }}>#{String(o.label || "")}</div>
                    <div style={{ marginLeft: "auto", opacity: 0.8 }}>sort={String(o.sort ?? "")} • active={String(o.active !== false)}</div>
                  </div>

                  <div style={{ marginTop: 8, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                    <input className="zombie-input" defaultValue={String(o.label || "")} onBlur={(e) => updateOption(String(o.id), { label: e.target.value })} style={{ padding: "8px 10px", minWidth: 220, flex: 1 }} />
                    <input className="zombie-input" defaultValue={String(o.sort ?? 10)} onBlur={(e) => updateOption(String(o.id), { sort: asInt(e.target.value, 10) })} style={{ padding: "8px 10px", width: 110 }} />
                    <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <input type="checkbox" defaultChecked={o.active !== false} onChange={(e) => updateOption(String(o.id), { active: e.target.checked })} />
                      <span style={{ opacity: 0.85 }}>Active</span>
                    </label>
                    <button className="zombie-btn" style={{ padding: "8px 10px", fontSize: 12 }} onClick={() => deleteOption(String(o.id))}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              {!loading && selectedTypeId && optionsForType.length === 0 ? <div style={{ opacity: 0.75 }}>No options yet.</div> : null}
              {!selectedTypeId ? <div style={{ opacity: 0.75 }}>Select a type first to manage options.</div> : null}
            </div>
          </div>

          <div style={{ marginTop: 10, opacity: 0.65, fontSize: 12 }}>
            If you get a permissions error, grant yourself edit access in Owner → Achievements Access (but Owner should already have it).
          </div>
        </div>
      </div>
    </div>
  );
}