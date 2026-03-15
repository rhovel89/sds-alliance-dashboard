import { supabase } from "./supabaseBrowserClient";

export type RoleMapStore = {
  version: 1;
  global: Record<string, string>;
  alliances: Record<string, Record<string, string>>;
};

export type ChannelEntry = {
  id: string;
  name: string;
  channelId: string;
  createdUtc: string;
};

export type ChannelMapStore = {
  version: 1;
  global: ChannelEntry[];
  alliances: Record<string, ChannelEntry[]>;
};

export const ROLE_MAP_KEY = "sad_discord_role_map_v1";
export const CHANNEL_MAP_KEY = "sad_discord_channel_map_v1";

function uid() {
  return Math.random().toString(16).slice(2) + "-" + Date.now().toString(16);
}

function nowUtc() {
  return new Date().toISOString();
}

function safeJson<T>(raw: string | null): T | null {
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}

export function loadLocalRoleStore(): RoleMapStore {
  const s = safeJson<RoleMapStore>(localStorage.getItem(ROLE_MAP_KEY));
  if (s && s.version === 1) return s;
  return { version: 1, global: {}, alliances: {} };
}

export function loadLocalChannelStore(): ChannelMapStore {
  const s = safeJson<ChannelMapStore>(localStorage.getItem(CHANNEL_MAP_KEY));
  if (s && s.version === 1) return s;
  return { version: 1, global: [], alliances: {} };
}

export function saveLocalRoleStore(s: RoleMapStore) {
  try { localStorage.setItem(ROLE_MAP_KEY, JSON.stringify(s)); } catch {}
}

export function saveLocalChannelStore(s: ChannelMapStore) {
  try { localStorage.setItem(CHANNEL_MAP_KEY, JSON.stringify(s)); } catch {}
}

export async function fetchRoleStoreFromDb(): Promise<RoleMapStore> {
  const local = loadLocalRoleStore();

  const { data, error } = await supabase
    .from("discord_role_mappings")
    .select("scope, alliance_code, name, role_id")
    .eq("state_code", "789")
    .order("scope", { ascending: true })
    .order("alliance_code", { ascending: true })
    .order("name", { ascending: true });

  if (error) return local;

  const out: RoleMapStore = { version: 1, global: {}, alliances: {} };

  for (const row of data || []) {
    const scope = String(row.scope || "global");
    const allianceCode = row.alliance_code ? String(row.alliance_code).toUpperCase() : null;
    const name = String(row.name || "").trim();
    const roleId = String(row.role_id || "").trim();

    if (!name || !roleId) continue;

    if (scope === "alliance" && allianceCode) {
      if (!out.alliances[allianceCode]) out.alliances[allianceCode] = {};
      out.alliances[allianceCode][name] = roleId;
    } else {
      out.global[name] = roleId;
    }
  }

  saveLocalRoleStore(out);
  return out;
}

export async function fetchChannelStoreFromDb(): Promise<ChannelMapStore> {
  const local = loadLocalChannelStore();

  const { data, error } = await supabase
    .from("discord_channel_mappings")
    .select("id, scope, alliance_code, name, channel_id, updated_at")
    .eq("state_code", "789")
    .order("scope", { ascending: true })
    .order("alliance_code", { ascending: true })
    .order("name", { ascending: true });

  if (error) return local;

  const out: ChannelMapStore = { version: 1, global: [], alliances: {} };

  for (const row of data || []) {
    const scope = String(row.scope || "global");
    const allianceCode = row.alliance_code ? String(row.alliance_code).toUpperCase() : null;
    const item: ChannelEntry = {
      id: String(row.id || uid()),
      name: String(row.name || "").trim(),
      channelId: String(row.channel_id || "").trim(),
      createdUtc: String(row.updated_at || nowUtc()),
    };

    if (!item.name) continue;

    if (scope === "alliance" && allianceCode) {
      if (!out.alliances[allianceCode]) out.alliances[allianceCode] = [];
      out.alliances[allianceCode].push(item);
    } else {
      out.global.push(item);
    }
  }

  saveLocalChannelStore(out);
  return out;
}

export async function saveRoleStoreToDb(store: RoleMapStore) {
  saveLocalRoleStore(store);

  const user = await supabase.auth.getUser();
  const userId = user.data.user?.id ?? null;

  const rows: any[] = [];

  for (const [name, roleId] of Object.entries(store.global || {})) {
    if (!String(name || "").trim() || !String(roleId || "").trim()) continue;
    rows.push({
      state_code: "789",
      scope: "global",
      alliance_code: null,
      name: String(name).trim(),
      role_id: String(roleId).trim(),
      created_by_user_id: userId,
      updated_at: nowUtc(),
    });
  }

  for (const [allianceCode, map] of Object.entries(store.alliances || {})) {
    for (const [name, roleId] of Object.entries(map || {})) {
      if (!String(name || "").trim() || !String(roleId || "").trim()) continue;
      rows.push({
        state_code: "789",
        scope: "alliance",
        alliance_code: String(allianceCode).toUpperCase(),
        name: String(name).trim(),
        role_id: String(roleId).trim(),
        created_by_user_id: userId,
        updated_at: nowUtc(),
      });
    }
  }

  const del = await supabase.from("discord_role_mappings").delete().eq("state_code", "789");
  if (del.error) return del;

  if (!rows.length) return { error: null };
  return await supabase.from("discord_role_mappings").insert(rows);
}

export async function saveChannelStoreToDb(store: ChannelMapStore) {
  saveLocalChannelStore(store);

  const user = await supabase.auth.getUser();
  const userId = user.data.user?.id ?? null;

  const rows: any[] = [];

  for (const c of store.global || []) {
    if (!String(c.name || "").trim() || !String(c.channelId || "").trim()) continue;
    rows.push({
      state_code: "789",
      scope: "global",
      alliance_code: null,
      name: String(c.name).trim(),
      channel_id: String(c.channelId).trim(),
      created_by_user_id: userId,
      updated_at: nowUtc(),
    });
  }

  for (const [allianceCode, list] of Object.entries(store.alliances || {})) {
    for (const c of list || []) {
      if (!String(c.name || "").trim() || !String(c.channelId || "").trim()) continue;
      rows.push({
        state_code: "789",
        scope: "alliance",
        alliance_code: String(allianceCode).toUpperCase(),
        name: String(c.name).trim(),
        channel_id: String(c.channelId).trim(),
        created_by_user_id: userId,
        updated_at: nowUtc(),
      });
    }
  }

  const del = await supabase.from("discord_channel_mappings").delete().eq("state_code", "789");
  if (del.error) return del;

  if (!rows.length) return { error: null };
  return await supabase.from("discord_channel_mappings").insert(rows);
}
