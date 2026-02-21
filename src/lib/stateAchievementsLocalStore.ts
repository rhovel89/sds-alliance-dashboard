export type SatKind = "count" | "weapon" | "milestone";

export type SatType = {
  id: string;
  stateCode: string;
  name: string;
  kind: SatKind;
  requiresOption: boolean;
  requiredCount: number; // Governor 3x = 3, SWP Weapon = 1
  active: boolean;
  createdUtc: string;
  updatedUtc: string;
};

export type SatOption = {
  id: string;
  stateCode: string;
  typeId: string;
  label: string;
  active: boolean;
  createdUtc: string;
  updatedUtc: string;
};

export type SatRequestStatus = "pending" | "in_progress" | "completed" | "denied";

export type SatRequest = {
  id: string;
  stateCode: string;
  requesterUserId: string | null; // UI-only; safe even if DB lacks it
  playerName: string;
  allianceName: string;
  typeId: string;
  optionId: string | null;
  status: SatRequestStatus;
  currentCount: number;
  requiredCount: number;
  notes: string;
  completedUtc: string | null;
  createdUtc: string;
  updatedUtc: string;
};

export type SatAccess = {
  stateCode: string;
  canViewUserIds: string[];
  canEditUserIds: string[];
  updatedUtc: string;
};

type Store = {
  version: 1;
  updatedUtc: string;
  types: SatType[];
  options: SatOption[];
  requests: SatRequest[];
  access: SatAccess[];
};

const KEY = "sad_state_achievements_local_v1";

function nowUtc() { return new Date().toISOString(); }
function uid() { return Math.random().toString(16).slice(2) + "-" + Date.now().toString(16); }

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}

export function loadSatStore(): Store {
  const s = safeParse<Store>(localStorage.getItem(KEY));
  if (s && s.version === 1) return s;

  const created = nowUtc();
  // Defaults requested:
  // - SWP Weapon -> requires option (weapon list) start with Rail Gun
  // - Governor (3x) -> count to 3
  const tWeapon: SatType = {
    id: uid(),
    stateCode: "789",
    name: "SWP Weapon",
    kind: "weapon",
    requiresOption: true,
    requiredCount: 1,
    active: true,
    createdUtc: created,
    updatedUtc: created,
  };
  const tGov: SatType = {
    id: uid(),
    stateCode: "789",
    name: "Governor (3x)",
    kind: "count",
    requiresOption: false,
    requiredCount: 3,
    active: true,
    createdUtc: created,
    updatedUtc: created,
  };
  const optRail: SatOption = {
    id: uid(),
    stateCode: "789",
    typeId: tWeapon.id,
    label: "Rail Gun",
    active: true,
    createdUtc: created,
    updatedUtc: created,
  };

  const seed: Store = {
    version: 1,
    updatedUtc: created,
    types: [tWeapon, tGov],
    options: [optRail],
    requests: [],
    access: [{
      stateCode: "789",
      canViewUserIds: [],
      canEditUserIds: [],
      updatedUtc: created,
    }],
  };
  localStorage.setItem(KEY, JSON.stringify(seed));
  return seed;
}

export function saveSatStore(next: Store) {
  const s: Store = { ...next, version: 1, updatedUtc: nowUtc() };
  localStorage.setItem(KEY, JSON.stringify(s));
}

export function getStateTypes(stateCode: string): SatType[] {
  const s = loadSatStore();
  return (s.types || []).filter(t => t.stateCode === stateCode);
}
export function getStateOptions(stateCode: string): SatOption[] {
  const s = loadSatStore();
  return (s.options || []).filter(o => o.stateCode === stateCode);
}
export function getStateRequests(stateCode: string): SatRequest[] {
  const s = loadSatStore();
  return (s.requests || []).filter(r => r.stateCode === stateCode);
}
export function getAccess(stateCode: string): SatAccess {
  const s = loadSatStore();
  const a = (s.access || []).find(x => x.stateCode === stateCode);
  if (a) return a;
  return { stateCode, canViewUserIds: [], canEditUserIds: [], updatedUtc: nowUtc() };
}

export function upsertType(type: Omit<SatType, "id" | "createdUtc" | "updatedUtc"> & { id?: string }) {
  const s = loadSatStore();
  const now = nowUtc();
  const t: SatType = {
    id: type.id || uid(),
    stateCode: type.stateCode,
    name: type.name,
    kind: type.kind,
    requiresOption: !!type.requiresOption,
    requiredCount: Math.max(1, Number(type.requiredCount || 1)),
    active: !!type.active,
    createdUtc: now,
    updatedUtc: now,
  };
  const existing = s.types.findIndex(x => x.id === t.id);
  if (existing >= 0) {
    const prev = s.types[existing];
    s.types[existing] = { ...prev, ...t, createdUtc: prev.createdUtc, updatedUtc: now };
  } else {
    s.types.unshift(t);
  }
  saveSatStore(s);
  return t.id;
}

export function deleteType(typeId: string) {
  const s = loadSatStore();
  s.types = (s.types || []).filter(t => t.id !== typeId);
  s.options = (s.options || []).filter(o => o.typeId !== typeId);
  saveSatStore(s);
}

export function upsertOption(opt: Omit<SatOption, "id" | "createdUtc" | "updatedUtc"> & { id?: string }) {
  const s = loadSatStore();
  const now = nowUtc();
  const o: SatOption = {
    id: opt.id || uid(),
    stateCode: opt.stateCode,
    typeId: opt.typeId,
    label: opt.label,
    active: !!opt.active,
    createdUtc: now,
    updatedUtc: now,
  };
  const existing = s.options.findIndex(x => x.id === o.id);
  if (existing >= 0) {
    const prev = s.options[existing];
    s.options[existing] = { ...prev, ...o, createdUtc: prev.createdUtc, updatedUtc: now };
  } else {
    s.options.unshift(o);
  }
  saveSatStore(s);
  return o.id;
}

export function deleteOption(optionId: string) {
  const s = loadSatStore();
  s.options = (s.options || []).filter(o => o.id !== optionId);
  saveSatStore(s);
}

export function addRequest(req: Omit<SatRequest, "id" | "createdUtc" | "updatedUtc" | "completedUtc">) {
  const s = loadSatStore();
  const now = nowUtc();
  const r: SatRequest = {
    id: uid(),
    ...req,
    status: req.status || "pending",
    currentCount: Math.max(0, Number(req.currentCount ?? 0)),
    requiredCount: Math.max(1, Number(req.requiredCount ?? 1)),
    notes: req.notes || "",
    completedUtc: null,
    createdUtc: now,
    updatedUtc: now,
  };
  s.requests.unshift(r);
  saveSatStore(s);
  return r.id;
}

export function updateRequest(id: string, patch: Partial<SatRequest>) {
  const s = loadSatStore();
  const idx = (s.requests || []).findIndex(r => r.id === id);
  if (idx < 0) return false;
  const now = nowUtc();
  const prev = s.requests[idx];
  const next: SatRequest = {
    ...prev,
    ...patch,
    currentCount: patch.currentCount != null ? Math.max(0, Number(patch.currentCount)) : prev.currentCount,
    requiredCount: patch.requiredCount != null ? Math.max(1, Number(patch.requiredCount)) : prev.requiredCount,
    updatedUtc: now,
  };
  // auto-complete if reached required count
  if (next.currentCount >= next.requiredCount) {
    next.status = "completed";
    next.completedUtc = next.completedUtc || now;
  } else if (next.status === "completed") {
    // allow manual completed, keep completedUtc
    next.completedUtc = next.completedUtc || now;
  } else {
    if (next.status === "pending" && next.currentCount > 0) next.status = "in_progress";
  }
  s.requests[idx] = next;
  saveSatStore(s);
  return true;
}

export function deleteRequest(id: string) {
  const s = loadSatStore();
  s.requests = (s.requests || []).filter(r => r.id !== id);
  saveSatStore(s);
}

export function upsertAccess(stateCode: string, canView: string[], canEdit: string[]) {
  const s = loadSatStore();
  const now = nowUtc();
  const idx = (s.access || []).findIndex(a => a.stateCode === stateCode);
  const next: SatAccess = { stateCode, canViewUserIds: canView, canEditUserIds: canEdit, updatedUtc: now };
  if (idx >= 0) s.access[idx] = next;
  else s.access.push(next);
  saveSatStore(s);
}

export function exportSatState(stateCode: string) {
  const s = loadSatStore();
  return {
    version: 1,
    exportedUtc: nowUtc(),
    stateCode,
    types: (s.types || []).filter(t => t.stateCode === stateCode),
    options: (s.options || []).filter(o => o.stateCode === stateCode),
    requests: (s.requests || []).filter(r => r.stateCode === stateCode),
    access: (s.access || []).filter(a => a.stateCode === stateCode),
  };
}

export function importSatState(payload: any) {
  if (!payload || payload.version !== 1) throw new Error("Invalid payload version.");
  const stateCode = String(payload.stateCode || "");
  if (!stateCode) throw new Error("Missing stateCode.");
  const s = loadSatStore();
  s.types = (s.types || []).filter(t => t.stateCode !== stateCode).concat(payload.types || []);
  s.options = (s.options || []).filter(o => o.stateCode !== stateCode).concat(payload.options || []);
  s.requests = (s.requests || []).filter(r => r.stateCode !== stateCode).concat(payload.requests || []);
  s.access = (s.access || []).filter(a => a.stateCode !== stateCode).concat(payload.access || []);
  saveSatStore(s);
}