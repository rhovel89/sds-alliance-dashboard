import React, { useMemo, useState } from "react";
import SupportBundleButton from "../../components/system/SupportBundleButton";
import { loadAllianceDirectory } from "../../lib/allianceDirectoryStore";
import {
  exportPermissionsMatrix,
  getMatrixForScope,
  importPermissionsMatrix,
  loadPermissionsMatrix,
  savePermissionsMatrix,
  setMatrixForScope,
  type FeatureKey,
  type Matrix,
  type RoleKey,
} from "../../lib/permissionsMatrixStore";

function cloneMatrix(m: Matrix): Matrix {
  return JSON.parse(JSON.stringify(m));
}

export default function OwnerPermissionsMatrixPage() {
  const [tick, setTick] = useState(0);
  const [scope, setScope] = useState<"global" | "alliance">("global");
  const [allianceCode, setAllianceCode] = useState<string>("WOC");

  const dir = useMemo(() => loadAllianceDirectory().items || [], [tick]);

  const store = useMemo(() => loadPermissionsMatrix(), [tick]);
  const roles = store.roles || [];
  const features = store.features || [];

  const activeAllianceCode = scope === "alliance" ? (allianceCode || (dir[0]?.code || "WOC")).toUpperCase() : null;

  const matrix = useMemo(() => {
    return getMatrixForScope(store, activeAllianceCode);
  }, [store, activeAllianceCode]);

  const grouped = useMemo(() => {
    const map: Record<string, { key: FeatureKey; label: string; group: string }[]> = {};
    for (const f of features) {
      const g = String((f as any).group || "Other");
      map[g] = map[g] || [];
      map[g].push(f as any);
    }
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
  }, [features]);

  function setCell(role: RoleKey, feature: FeatureKey, val: boolean) {
    const m2 = cloneMatrix(matrix);
    m2[role][feature] = val;
    const next = setMatrixForScope(store, activeAllianceCode, m2);
    savePermissionsMatrix(next);
    setTick((x) => x + 1);
  }

  function toggleCell(role: RoleKey, feature: FeatureKey) {
    const cur = !!matrix?.[role]?.[feature];
    setCell(role, feature, !cur);
  }

  function setRow(feature: FeatureKey, val: boolean) {
    const m2 = cloneMatrix(matrix);
    for (const r of roles) m2[r][feature] = val;
    const next = setMatrixForScope(store, activeAllianceCode, m2);
    savePermissionsMatrix(next);
    setTick((x) => x + 1);
  }

  function setCol(role: RoleKey, val: boolean) {
    const m2 = cloneMatrix(matrix);
    for (const f of features) m2[role][(f as any).key] = val;
    const next = setMatrixForScope(store, activeAllianceCode, m2);
    savePermissionsMatrix(next);
    setTick((x) => x + 1);
  }

  async function copyExport() {
    const txt = exportPermissionsMatrix();
    try { await navigator.clipboard.writeText(txt); alert("Copied matrix export JSON."); }
    catch { window.prompt("Copy:", txt); }
  }

  function doImport() {
    const raw = window.prompt("Paste matrix export JSON:");
    if (!raw) return;
    const ok = importPermissionsMatrix(raw);
    if (!ok) return alert("Invalid JSON.");
    setTick((x) => x + 1);
    alert("Imported.");
  }

  function resetDefaults() {
    if (!confirm("Reset matrix to defaults?")) return;
    try { localStorage.removeItem("sad_permissions_matrix_v1"); } catch {}
    setTick((x) => x + 1);
  }

  return (
    <div style={{ padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>🧩 Owner — Permissions Matrix (UI shell)</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => setTick((x) => x + 1)}>Refresh</button>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={copyExport}>Export</button>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={doImport}>Import</button>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={resetDefaults}>Reset</button>
          <SupportBundleButton />
        </div>
      </div>

      <div className="zombie-card" style={{ marginTop: 12 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ opacity: 0.75, fontSize: 12 }}>Scope</div>
          <select className="zombie-input" value={scope} onChange={(e) => setScope(e.target.value as any)} style={{ padding: "10px 12px" }}>
            <option value="global">Global</option>
            <option value="alliance">Per-Alliance Override</option>
          </select>

          {scope === "alliance" ? (
            <>
              <div style={{ opacity: 0.75, fontSize: 12 }}>Alliance</div>
              <select className="zombie-input" value={activeAllianceCode || ""} onChange={(e) => setAllianceCode(e.target.value.toUpperCase())} style={{ padding: "10px 12px" }}>
                {(dir.length ? dir : [{ code: "WOC", name: "WOC", state: "789" } as any]).map((d: any) => (
                  <option key={d.code} value={d.code}>{d.code} — {d.name}</option>
                ))}
              </select>
            </>
          ) : null}

          <div style={{ marginLeft: "auto", opacity: 0.65, fontSize: 12 }}>
            UI-only visibility rules. Backend RLS still decides real access.
          </div>
        </div>
      </div>

      <div className="zombie-card" style={{ marginTop: 12, overflowX: "auto" }}>
        <div style={{ minWidth: 980 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontWeight: 900 }}>Bulk actions</div>
            <button className="zombie-btn" style={{ padding: "8px 10px", fontSize: 12 }} onClick={() => { for (const r of roles) setCol(r as any, true); }}>
              Allow all by role (one-by-one)
            </button>
            <div style={{ opacity: 0.6, fontSize: 12 }}>
              Tip: click any cell to toggle. Use row/column buttons for mass changes.
            </div>
          </div>

          {grouped.map(([group, feats]) => (
            <div key={group} style={{ marginTop: 12 }}>
              <div style={{ fontWeight: 900, marginBottom: 8 }}>{group}</div>

              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid rgba(255,255,255,0.12)" }}>Feature</th>
                    {roles.map((r) => (
                      <th key={r} style={{ textAlign: "center", padding: 8, borderBottom: "1px solid rgba(255,255,255,0.12)" }}>
                        <div style={{ fontWeight: 900 }}>{r}</div>
                        <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 6 }}>
                          <button className="zombie-btn" style={{ padding: "4px 6px", fontSize: 11 }} onClick={() => setCol(r as any, true)}>All</button>
                          <button className="zombie-btn" style={{ padding: "4px 6px", fontSize: 11 }} onClick={() => setCol(r as any, false)}>None</button>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {feats.map((f: any) => (
                    <tr key={f.key}>
                      <td style={{ padding: 8, borderBottom: "1px solid rgba(255,255,255,0.08)", opacity: 0.95 }}>
                        <div style={{ fontWeight: 900 }}>{f.label}</div>
                        <div style={{ opacity: 0.6, fontSize: 12 }}>{f.key}</div>
                        <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                          <button className="zombie-btn" style={{ padding: "4px 6px", fontSize: 11 }} onClick={() => setRow(f.key, true)}>Row all</button>
                          <button className="zombie-btn" style={{ padding: "4px 6px", fontSize: 11 }} onClick={() => setRow(f.key, false)}>Row none</button>
                        </div>
                      </td>

                      {roles.map((r) => {
                        const v = !!matrix?.[r]?.[f.key];
                        return (
                          <td key={r + ":" + f.key} style={{ textAlign: "center", padding: 8, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                            <button
                              className="zombie-btn"
                              style={{ padding: "6px 8px", fontSize: 12, opacity: v ? 1 : 0.55 }}
                              onClick={() => toggleCell(r as any, f.key)}
                            >
                              {v ? "✅" : "—"}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}