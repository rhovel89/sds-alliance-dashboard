export type AllianceDirItem = {
  id: string;
  code: string;     // e.g. WOC
  name: string;     // e.g. Warriors of Chaos
  state: string;    // e.g. 789
  active: boolean;
  notes?: string | null;
  createdUtc: string;
  updatedUtc: string;
};

export type AllianceDirectoryStore = {
  version: 1;
  updatedUtc: string;
  items: AllianceDirItem[];
};

export const ALLIANCE_DIR_KEY = "sad_alliance_directory_v1";

function uid() {
  return Math.random().toString(16).slice(2) + "-" + Date.now().toString(16);
}
function nowUtc() { return new Date().toISOString(); }

export function normalizeCode(code: any) {
  return String(code || "").trim().toUpperCase();
}

export function loadAllianceDirectory(): AllianceDirectoryStore {
  try {
    const raw = localStorage.getItem(ALLIANCE_DIR_KEY);
    if (!raw) return { version: 1, updatedUtc: nowUtc(), items: [] };
    const p = JSON.parse(raw);
    const items = Array.isArray(p?.items) ? p.items : [];
    const norm = items
      .filter((x: any) => x && x.code)
      .map((x: any) => ({
        id: String(x.id || uid()),
        code: normalizeCode(x.code),
        name: String(x.name || x.code),
        state: String(x.state || "789"),
        active: x.active !== false,
        notes: (x.notes == null ? null : String(x.notes)),
        createdUtc: String(x.createdUtc || nowUtc()),
        updatedUtc: String(x.updatedUtc || nowUtc()),
      }))
      .filter((x: any) => !!x.code);
    return { version: 1, updatedUtc: String(p.updatedUtc || nowUtc()), items: norm };
  } catch {
    return { version: 1, updatedUtc: nowUtc(), items: [] };
  }
}

export function saveAllianceDirectory(store: AllianceDirectoryStore) {
  try { localStorage.setItem(ALLIANCE_DIR_KEY, JSON.stringify(store)); } catch {}
}

export function upsertAlliance(item: Partial<AllianceDirItem> & { code: string }): AllianceDirItem {
  const store = loadAllianceDirectory();
  const now = nowUtc();
  const code = normalizeCode(item.code);

  const existing = store.items.find((x) => x.code === code) || null;

  const row: AllianceDirItem = {
    id: existing?.id || String(item.id || uid()),
    code,
    name: String(item.name || existing?.name || code),
    state: String(item.state || existing?.state || "789"),
    active: item.active !== undefined ? !!item.active : (existing ? existing.active : true),
    notes: item.notes !== undefined ? (item.notes == null ? null : String(item.notes)) : (existing?.notes ?? null),
    createdUtc: existing?.createdUtc || now,
    updatedUtc: now,
  };

  const items = store.items.filter((x) => x.code !== code);
  items.unshift(row);

  saveAllianceDirectory({ version: 1, updatedUtc: now, items });
  return row;
}

export function removeAllianceByCode(code: string) {
  const store = loadAllianceDirectory();
  const now = nowUtc();
  const c = normalizeCode(code);
  saveAllianceDirectory({ version: 1, updatedUtc: now, items: store.items.filter((x) => x.code !== c) });
}

export function exportAllianceDirectory(): string {
  const store = loadAllianceDirectory();
  return JSON.stringify({ ...store, exportedUtc: nowUtc() }, null, 2);
}

export function importAllianceDirectory(raw: string): boolean {
  try {
    const p = JSON.parse(raw);
    if (!p || p.version !== 1) return false;
    const items = Array.isArray(p.items) ? p.items : null;
    if (!items) return false;
    // Save as-is; loader normalizes.
    localStorage.setItem(ALLIANCE_DIR_KEY, JSON.stringify(p));
    return true;
  } catch {
    return false;
  }
}