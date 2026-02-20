import React, { useEffect, useMemo, useState } from "react";

type RoleKey =
  | "owner"
  | "dashboard_assist"
  | "r5"
  | "r4"
  | "member"
  | "viewer"
  | "state_leadership"
  | "state_mod"
  | "state_member";

type FeatureKey =
  | "tab_my_alliance"
  | "tab_guides"
  | "tab_calendar"
  | "tab_hq_map"
  | "tab_announcements"
  | "tab_permissions"
  | "tab_events"
  | "tab_mail"
  | "state_789"
  | "owner_tools";

type Matrix = Record<RoleKey, Record<FeatureKey, boolean>>;

type Store = {
  version: 1;
  updatedUtc: string;
  allianceCode: string;
  matrix: Matrix;
};

const KEY_PREFIX = "sad_perm_matrix_shell_v1_";

const ROLES: { key: RoleKey; label: string }[] = [
  { key: "owner", label: "Owner" },
  { key: "dashboard_assist", label: "Dashboard Assist" },
  { key: "r5", label: "R5" },
  { key: "r4", label: "R4" },
  { key: "member", label: "Member" },
  { key: "viewer", label: "Viewer" },
  { key: "state_leadership", label: "State Leadership" },
  { key: "state_mod", label: "State Mod" },
  { key: "state_member", label: "State Member" },
];

const FEATURES: { key: FeatureKey; label: string }[] = [
  { key: "tab_my_alliance", label: "My Alliance" },
  { key: "tab_guides", label: "Guides" },
  { key: "tab_calendar", label: "Calendar" },
  { key: "tab_hq_map", label: "HQ Map" },
  { key: "tab_announcements", label: "Announcements" },
  { key: "tab_permissions", label: "Permissions" },
  { key: "tab_events", label: "Events" },
  { key: "tab_mail", label: "My Mail" },
  { key: "state_789", label: "State 789" },
  { key: "owner_tools", label: "Owner Tools" },
];

function nowUtc() {
  return new Date().toISOString();
}

function emptyMatrix(): Matrix {
  const m: any = {};
  for (const r of ROLES) {
    m[r.key] = {};
    for (const f of FEATURES) {
      m[r.key][f.key] = r.key === "owner"; // owner gets all by default
    }
  }
  return m as Matrix;
}

function loadStore(allianceCode: string): Store {
  const k = KEY_PREFIX + allianceCode.toUpperCase();
  try {
    const raw = localStorage.getItem(k);
    if (raw) {
      const s = JSON.parse(raw) as Store;
      if (s && s.version === 1 && s.matrix) return s;
    }
  } catch {}
  return { version: 1, updatedUtc: nowUtc(), allianceCode, matrix: emptyMatrix() };
}

function saveStore(s: Store) {
  const k = KEY_PREFIX + s.allianceCode.toUpperCase();
  try {
    localStorage.setItem(k, JSON.stringify(s));
  } catch {}
}

export default function OwnerPermissionsMatrixShellPage() {
  const [allianceCode, setAllianceCode] = useState("WOC");
  const [store, setStore] = useState<Store>(() => loadStore("WOC"));

  useEffect(() => {
    const next = loadStore(allianceCode || "WOC");
    setStore(next);
  }, [allianceCode]);

  useEffect(() => {
    saveStore(store);
  }, [store]);

  const matrix = store.matrix;

  function toggle(r: RoleKey, f: FeatureKey) {
    setStore((p) => ({
      ...p,
      updatedUtc: nowUtc(),
      matrix: {
        ...p.matrix,
        [r]: { ...p.matrix[r], [f]: !p.matrix[r][f] },
      },
    }));
  }

  async function copyJson() {
    const txt = JSON.stringify(store, null, 2);
    try {
      await navigator.clipboard.writeText(txt);
      window.alert("Copied matrix JSON.");
    } catch {
      window.prompt("Copy JSON:", txt);
    }
  }

  function importJson() {
    const raw = window.prompt("Paste matrix JSON:");
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as Store;
      if (!parsed || parsed.version !== 1 || !parsed.matrix) throw new Error("Invalid");
      setAllianceCode(String(parsed.allianceCode || "WOC").toUpperCase());
      setStore({ ...parsed, updatedUtc: nowUtc() });
      window.alert("Imported matrix.");
    } catch {
      window.alert("Invalid JSON.");
    }
  }

  const note = useMemo(
    () => "UI-only shell. Later we will persist to Supabase + enforce via RLS (never trust UI).",
    []
  );

  return (
    <div style={{ padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <h2 style={{ margin: 0 }}>🧩 Owner — Permissions Matrix (UI shell)</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={copyJson}>Copy JSON</button>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={importJson}>Import JSON</button>
        </div>
      </div>

      <div className="zombie-card" style={{ marginTop: 12 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ opacity: 0.75, fontSize: 12 }}>Alliance</div>
          <input className="zombie-input" value={allianceCode} onChange={(e) => setAllianceCode(e.target.value.toUpperCase())} style={{ padding: "10px 12px" }} />
          <div style={{ opacity: 0.75, fontSize: 12 }}>Updated (UTC): {store.updatedUtc}</div>
        </div>
        <div style={{ marginTop: 8, opacity: 0.75, fontSize: 12 }}>{note}</div>
      </div>

      <div className="zombie-card" style={{ marginTop: 12, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid rgba(255,255,255,0.12)" }}>Feature</th>
              {ROLES.map((r) => (
                <th key={r.key} style={{ textAlign: "center", padding: 10, borderBottom: "1px solid rgba(255,255,255,0.12)" }}>
                  {r.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {FEATURES.map((f) => (
              <tr key={f.key}>
                <td style={{ padding: 10, borderBottom: "1px solid rgba(255,255,255,0.08)", fontWeight: 800 }}>{f.label}</td>
                {ROLES.map((r) => (
                  <td key={r.key + "_" + f.key} style={{ textAlign: "center", padding: 10, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                    <input
                      type="checkbox"
                      checked={!!matrix?.[r.key]?.[f.key]}
                      onChange={() => toggle(r.key, f.key)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 10, opacity: 0.65, fontSize: 12 }}>
        Later: wire this to Supabase permissions tables + enforce via RLS. Owner always has full override.
      </div>
    </div>
  );
}