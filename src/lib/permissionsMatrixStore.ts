export type RoleKey = "owner" | "dashboard_assist" | "r5" | "r4" | "member" | "viewer" | "state_leadership" | "state_mod" | "state_member";

export type FeatureKey =
  | "tab_my_alliance"
  | "tab_state"
  | "tab_mail"
  | "tab_calendar"
  | "tab_guides"
  | "tab_hq_map"
  | "tab_permissions"
  | "tab_events"
  | "owner_tools"
  | "state_789_dashboard"
  | "state_789_alerts"
  | "state_789_discussion";

export type Matrix = Record<RoleKey, Record<FeatureKey, boolean>>;

export type PermissionsMatrixStore = {
  version: 1;
  updatedUtc: string;
  roles: RoleKey[];
  features: { key: FeatureKey; label: string; group: string }[];
  global: Matrix;
  perAlliance: Record<string, Matrix>;
};

export const PERM_MATRIX_KEY = "sad_permissions_matrix_v1";

function nowUtc() { return new Date().toISOString(); }

export function defaultStore(): PermissionsMatrixStore {
  const roles: RoleKey[] = ["owner","dashboard_assist","r5","r4","member","viewer","state_leadership","state_mod","state_member"];
  const features = [
    { key: "tab_my_alliance", label: "My Alliance", group: "Alliance" },
    { key: "tab_state", label: "State", group: "State" },
    { key: "tab_mail", label: "My Mail", group: "Personal" },
    { key: "tab_calendar", label: "Event Calendar", group: "Alliance" },
    { key: "tab_guides", label: "Guides", group: "Alliance" },
    { key: "tab_hq_map", label: "HQ Map", group: "Alliance" },
    { key: "tab_permissions", label: "Permissions", group: "Alliance" },
    { key: "tab_events", label: "Events", group: "Alliance" },
    { key: "owner_tools", label: "Owner Tools", group: "Owner" },
    { key: "state_789_dashboard", label: "State 789 Dashboard", group: "State 789" },
    { key: "state_789_alerts", label: "State 789 Alerts", group: "State 789" },
    { key: "state_789_discussion", label: "State 789 Discussion", group: "State 789" },
  ] as const;

  const mk = (): Matrix => {
    const m: any = {};
    for (const r of roles) {
      m[r] = {};
      for (const f of features) m[r][f.key] = false;
    }

    // Reasonable defaults (UI-only; backend/RLS still decides real access)
    for (const f of features) {
      m["owner"][f.key] = true;
      m["dashboard_assist"][f.key] = true;
    }
    // Alliance roles
    m["r5"]["tab_my_alliance"] = true;
    m["r5"]["tab_calendar"] = true;
    m["r5"]["tab_guides"] = true;
    m["r5"]["tab_hq_map"] = true;
    m["r5"]["tab_events"] = true;
    m["r5"]["tab_permissions"] = true;

    m["r4"]["tab_my_alliance"] = true;
    m["r4"]["tab_calendar"] = true;
    m["r4"]["tab_guides"] = true;
    m["r4"]["tab_hq_map"] = true;
    m["r4"]["tab_events"] = true;

    m["member"]["tab_my_alliance"] = true;
    m["member"]["tab_calendar"] = true;
    m["member"]["tab_guides"] = true;

    m["viewer"]["tab_my_alliance"] = true;

    // State roles
    m["state_leadership"]["tab_state"] = true;
    m["state_leadership"]["state_789_dashboard"] = true;
    m["state_leadership"]["state_789_alerts"] = true;
    m["state_leadership"]["state_789_discussion"] = true;

    m["state_mod"]["tab_state"] = true;
    m["state_mod"]["state_789_dashboard"] = true;
    m["state_mod"]["state_789_alerts"] = true;
    m["state_mod"]["state_789_discussion"] = true;

    m["state_member"]["tab_state"] = true;
    m["state_member"]["state_789_dashboard"] = true;
    m["state_member"]["state_789_discussion"] = true;

    return m as Matrix;
  };

  return {
    version: 1,
    updatedUtc: nowUtc(),
    roles,
    features: features as any,
    global: mk(),
    perAlliance: {},
  };
}

export function loadPermissionsMatrix(): PermissionsMatrixStore {
  try {
    const raw = localStorage.getItem(PERM_MATRIX_KEY);
    if (!raw) return defaultStore();
    const p = JSON.parse(raw);
    if (!p || p.version !== 1) return defaultStore();
    return p as PermissionsMatrixStore;
  } catch {
    return defaultStore();
  }
}

export function savePermissionsMatrix(s: PermissionsMatrixStore) {
  try { localStorage.setItem(PERM_MATRIX_KEY, JSON.stringify({ ...s, updatedUtc: nowUtc() })); } catch {}
}

export function exportPermissionsMatrix(): string {
  const s = loadPermissionsMatrix();
  return JSON.stringify({ ...s, exportedUtc: nowUtc() }, null, 2);
}

export function importPermissionsMatrix(raw: string): boolean {
  try {
    const p = JSON.parse(raw);
    if (!p || p.version !== 1) return false;
    localStorage.setItem(PERM_MATRIX_KEY, JSON.stringify(p));
    return true;
  } catch {
    return false;
  }
}

export function getMatrixForScope(s: PermissionsMatrixStore, allianceCode: string | null): Matrix {
  if (!allianceCode) return s.global;
  const ac = String(allianceCode).toUpperCase();
  return (s.perAlliance && s.perAlliance[ac]) ? s.perAlliance[ac] : s.global;
}

export function setMatrixForScope(s: PermissionsMatrixStore, allianceCode: string | null, m: Matrix): PermissionsMatrixStore {
  const ac = allianceCode ? String(allianceCode).toUpperCase() : null;
  if (!ac) return { ...s, global: m };
  return { ...s, perAlliance: { ...(s.perAlliance || {}), [ac]: m } };
}