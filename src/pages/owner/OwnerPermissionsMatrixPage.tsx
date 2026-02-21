import React, { useEffect, useMemo, useState } from "react";
import SupportBundleButton from "../../components/system/SupportBundleButton";

type DirItem = { id: string; code: string; name: string; state: string };

type Matrix = {
  version: 1;
  updatedUtc: string;
  roles: string[];                // columns
  permissionKeys: string[];        // rows
  global: Record<string, Record<string, boolean>>; // role -> key -> bool
  alliances: Record<string, Record<string, Record<string, boolean>>>; // alliance -> role -> key -> bool
};

const MATRIX_KEY = "sad_permissions_matrix_v1";
const DIR_KEY = "sad_alliance_directory_v1";

function uid() { return Math.random().toString(16).slice(2) + "-" + Date.now().toString(16); }
function nowUtc() { return new Date().toISOString(); }

const DEFAULT_ROLES = [
  "owner",
  "dashboard_assist",
  "r5",
  "r4",
  "member",
  "leadership",
  "mod",
  "state_member",
] as const;

const DEFAULT_PERMS = [
  "tab:my_alliance",
  "tab:state_alliance",
  "tab:my_mail",
  "tab:event_calendar",
  "tab:guides",
  "tab:hq_map",
  "tab:permissions",
  "tab:events_library",
  "owner:access_requests",
  "owner:live_ops",
  "owner:broadcast",
  "owner:directory_editor",
  "owner:permissions_matrix",
] as const;

function loadDir(): DirItem[] {
  try {
    const raw = localStorage.getItem(DIR_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const items = Array.isArray(parsed?.items) ? parsed.items : [];
    return items
      .filter((x: any) => x && x.code)
      .map((x: any) => ({
        id: String(x.id || uid()),
        code: String(x.code).toUpperCase(),
        name: String(x.name || x.code),
        state: String(x.state || "789"),
      }));
  } catch {
    return [];
  }
}

function emptyMatrix(): Matrix {
  const roles = [...DEFAULT_ROLES];
  const keys = [...DEFAULT_PERMS];

  const mk = (): Record<string, Record<string, boolean>> => {
    const g: Record<string, Record<string, boolean>> = {};
    for (const r of roles) {
      g[r] = {};
      for (const k of keys) g[r][k] = false;
    }
    // sensible defaults: owner gets everything in UI shell
    for (const k of keys) g["owner"][k] = true;
    return g;
  };

  return {
    version: 1,
    updatedUtc: nowUtc(),
    roles,
    permissionKeys: keys,
    global: mk(),
    alliances: {},
  };
}

function loadMatrix(): Matrix {
  try {
    const raw = localStorage.getItem(MATRIX_KEY);
    if (!raw) return emptyMatrix();
    const p = JSON.parse(raw);
    if (!p || p.version !== 1) return emptyMatrix();

    const m: Matrix = {
      version: 1,
      updatedUtc: String(p.updatedUtc || nowUtc()),
      roles: Array.isArray(p.roles) ? p.roles.map((x: any) => String(x)) : [...DEFAULT_ROLES],
      permissionKeys: Array.isArray(p.permissionKeys) ? p.permissionKeys.map((x: any) => String(x)) : [...DEFAULT_PERMS],
      global: (p.global && typeof p.global === "object") ? p.global : {},
      alliances: (p.alliances && typeof p.alliances === "object") ? p.alliances : {},
    };

    // normalize structure (fill missing cells)
    for (const r of m.roles) {
      if (!m.global[r]) m.global[r] = {};
      for (const k of m.permissionKeys) {
        if (typeof m.global[r][k] !== "boolean") m.global[r][k] = false;
      }
    }
    if (m.global["owner"]) for (const k of m.permissionKeys) m.global["owner"][k] = true;

    return m;
  } catch {
    return emptyMatrix();
  }
}

function saveMatrix(m: Matrix) {
  try { localStorage.setItem(MATRIX_KEY, JSON.stringify(m)); } catch {}
}

export default function OwnerPermissionsMatrixPage() {
  const dir = useMemo(() => loadDir(), []);
  const [matrix, setMatrix] = useState<Matrix>(() => loadMatrix());
  useEffect(() => saveMatrix(matrix), [matrix]);

  const [scope, setScope] = useState<"global" | "alliance">("global");
  const [alliance, setAlliance] = useState<string>((dir[0]?.code || "WOC").toUpperCase());

  const view = useMemo(() => {
    if (scope === "global") return matrix.global;
    const a = alliance.toUpperCase();
    const existing = matrix.alliances?.[a] || null;
    if (existing) return existing;

    // create blank override from global
    const clone: Record<string, Record<string, boolean>> = {};
    for (const r of matrix.roles) {
      clone[r] = {};
      for (const k of matrix.permissionKeys) clone[r][k] = !!(matrix.global?.[r]?.[k]);
    }
    return clone;
  }, [matrix, scope, alliance]);

  function ensureAllianceOverride(): Record<string, Record<string, boolean>> {
    const a = alliance.toUpperCase();
    const next: Matrix = { ...matrix, alliances: { ...(matrix.alliances || {}) }, updatedUtc: nowUtc() };
    if (!next.alliances[a]) {
      const clone: Record<string, Record<string, boolean>> = {};
      for (const r of next.roles) {
        clone[r] = {};
        for (const k of next.permissionKeys) clone[r][k] = !!(next.global?.[r]?.[k]);
      }
      next.alliances[a] = clone;
      setMatrix(next);
      return clone;
    }
    return next.alliances[a];
  }

  function toggleCell(role: string, key: string) {
    setMatrix((p) => {
      const next: Matrix = { ...p, updatedUtc: nowUtc() };

      if (scope === "global") {
        next.global = { ...(next.global || {}) };
        next.global[role] = { ...(next.global[role] || {}) };
        next.global[role][key] = !next.global[role][key];
        if (role === "owner") next.global[role][key] = true; // owner stays true
        return next;
      }

      const a = alliance.toUpperCase();
      next.alliances = { ...(next.alliances || {}) };
      const ov = next.alliances[a] ? { ...next.alliances[a] } : ensureAllianceOverride();
      ov[role] = { ...(ov[role] || {}) };
      ov[role][key] = !ov[role][key];
      if (role === "owner") ov[role][key] = true;
      next.alliances[a] = ov;
      return next;
    });
  }

  const [newPerm, setNewPerm] = useState("");
  function addPerm() {
    const k = (newPerm || "").trim();
    if (!k) return;
    if (matrix.permissionKeys.includes(k)) return alert("Permission key already exists.");
    setMatrix((p) => {
      const next: Matrix = { ...p, updatedUtc: nowUtc(), permissionKeys: [...p.permissionKeys, k] };
      next.global = { ...(next.global || {}) };
      for (const r of next.roles) {
        next.global[r] = { ...(next.global[r] || {}) };
        next.global[r][k] = (r === "owner");
      }
      next.alliances = { ...(next.alliances || {}) };
      for (const a of Object.keys(next.alliances)) {
        const ov = { ...(next.alliances[a] || {}) };
        for (const r of next.roles) {
          ov[r] = { ...(ov[r] || {}) };
          if (typeof ov[r][k] !== "boolean") ov[r][k] = next.global[r][k];
          if (r === "owner") ov[r][k] = true;
        }
        next.alliances[a] = ov;
      }
      return next;
    });
    setNewPerm("");
  }

  function removePerm(k: string) {
    if (!confirm(`Remove permission key "${k}"?`)) return;
    setMatrix((p) => {
      const next: Matrix = { ...p, updatedUtc: nowUtc(), permissionKeys: p.permissionKeys.filter((x) => x !== k) };
      next.global = { ...(next.global || {}) };
      for (const r of next.roles) {
        const row = { ...(next.global[r] || {}) };
        delete row[k];
        next.global[r] = row;
      }
      next.alliances = { ...(next.alliances || {}) };
      for (const a of Object.keys(next.alliances)) {
        const ov = { ...(next.alliances[a] || {}) };
        for (const r of next.roles) {
          const row = { ...(ov[r] || {}) };
          delete row[k];
          ov[r] = row;
        }
        next.alliances[a] = ov;
      }
      return next;
    });
  }

  async function exportJson() {
    const txt = JSON.stringify({ ...matrix, exportedUtc: nowUtc() }, null, 2);
    try { await navigator.clipboard.writeText(txt); alert("Copied permissions matrix JSON."); }
    catch { window.prompt("Copy:", txt); }
  }

  function importJson() {
    const raw = window.prompt("Paste permissions matrix JSON:");
    if (!raw) return;
    try {
      const p = JSON.parse(raw);
      if (!p || p.version !== 1) throw new Error("Invalid");
      setMatrix(loadMatrix.call(null) as any); // reset once, then load below cleanly
      // directly accept p, but keep owner always true
      const m: Matrix = {
        version: 1,
        updatedUtc: nowUtc(),
        roles: Array.isArray(p.roles) ? p.roles.map((x: any) => String(x)) : [...DEFAULT_ROLES],
        permissionKeys: Array.isArray(p.permissionKeys) ? p.permissionKeys.map((x: any) => String(x)) : [...DEFAULT_PERMS],
        global: (p.global && typeof p.global === "object") ? p.global : {},
        alliances: (p.alliances && typeof p.alliances === "object") ? p.alliances : {},
      };
      for (const r of m.roles) {
        if (!m.global[r]) m.global[r] = {};
        for (const k of m.permissionKeys) if (typeof m.global[r][k] !== "boolean") m.global[r][k] = false;
      }
      if (m.global["owner"]) for (const k of m.permissionKeys) m.global["owner"][k] = true;
      setMatrix(m);
      alert("Imported.");
    } catch {
      alert("Invalid JSON.");
    }
  }

  function clearAllianceOverride() {
    if (scope !== "alliance") return;
    const a = alliance.toUpperCase();
    if (!matrix.alliances?.[a]) return alert("No override exists for this alliance.");
    if (!confirm(`Remove ALL overrides for ${a} and revert to global?`)) return;
    setMatrix((p) => {
      const next: Matrix = { ...p, updatedUtc: nowUtc(), alliances: { ...(p.alliances || {}) } };
      delete next.alliances[a];
      return next;
    });
  }

  return (
    <div style={{ padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>🧬 Owner — Permissions Matrix (UI shell)</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={exportJson}>Export</button>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={importJson}>Import</button>
          <SupportBundleButton />
        </div>
      </div>

      <div className="zombie-card" style={{ marginTop: 12 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ opacity: 0.75, fontSize: 12 }}>Scope</div>
          <select className="zombie-input" value={scope} onChange={(e) => setScope(e.target.value as any)} style={{ padding: "10px 12px" }}>
            <option value="global">Global</option>
            <option value="alliance">Alliance Override</option>
          </select>

          {scope === "alliance" ? (
            <>
              <div style={{ opacity: 0.75, fontSize: 12 }}>Alliance</div>
              <select className="zombie-input" value={alliance} onChange={(e) => setAlliance(e.target.value.toUpperCase())} style={{ padding: "10px 12px" }}>
                {(dir.length ? dir : [{ id: "x", code: "WOC", name: "WOC", state: "789" }]).map((d) => (
                  <option key={d.code} value={d.code}>{d.code} — {d.name}</option>
                ))}
              </select>

              <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={clearAllianceOverride}>Clear Override</button>
            </>
          ) : null}

          <div style={{ marginLeft: "auto", opacity: 0.7, fontSize: 12 }}>
            UI-only config. Supabase RLS still enforces actual access.
          </div>
        </div>
      </div>

      <div className="zombie-card" style={{ marginTop: 12 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ fontWeight: 900 }}>Permission Keys</div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input className="zombie-input" value={newPerm} onChange={(e) => setNewPerm(e.target.value)} placeholder="Add key (e.g. tab:guides)" style={{ padding: "10px 12px", minWidth: 260 }} />
            <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={addPerm}>Add</button>
          </div>
        </div>

        <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8 }}>
          {matrix.permissionKeys.map((k) => (
            <button key={k} className="zombie-btn" style={{ padding: "6px 10px", fontSize: 12, opacity: 0.9 }} onClick={() => removePerm(k)}>
              🗑 {k}
            </button>
          ))}
          {matrix.permissionKeys.length === 0 ? <div style={{ opacity: 0.75 }}>No permission keys.</div> : null}
        </div>
      </div>

      <div className="zombie-card" style={{ marginTop: 12, overflowX: "auto" }}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Matrix</div>

        <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: 10, position: "sticky", left: 0, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)" }}>
                Permission
              </th>
              {matrix.roles.map((r) => (
                <th key={r} style={{ textAlign: "center", padding: 10, whiteSpace: "nowrap" }}>
                  {r}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.permissionKeys.map((k) => (
              <tr key={k}>
                <td style={{ padding: 10, position: "sticky", left: 0, background: "rgba(0,0,0,0.35)", backdropFilter: "blur(6px)", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                  <div style={{ fontWeight: 900 }}>{k}</div>
                </td>
                {matrix.roles.map((r) => {
                  const v = !!(view?.[r]?.[k]);
                  const disabled = (r === "owner");
                  return (
                    <td key={r} style={{ textAlign: "center", padding: 10, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                      <input
                        type="checkbox"
                        checked={disabled ? true : v}
                        disabled={disabled}
                        onChange={() => toggleCell(r, k)}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ marginTop: 10, opacity: 0.65, fontSize: 12 }}>
          Owner is always forced ON in the matrix.
        </div>
      </div>
    </div>
  );
}