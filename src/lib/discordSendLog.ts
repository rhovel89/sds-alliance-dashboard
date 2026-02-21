export type DiscordSendLogEntry = {
  id: string;
  tsUtc: string;
  source: string; // "broadcast" | "state789_alerts" | "scheduled" | etc
  channelId: string | null;
  channelName: string | null;
  contentPreview: string;
  ok: boolean;
  status?: number | null;
  error?: string | null;
  details?: any;
};

const KEY = "sad_discord_send_log_v1";
const MAX = 200;

function uid() { return Math.random().toString(16).slice(2) + "-" + Date.now().toString(16); }
function nowUtc() { return new Date().toISOString(); }

export function loadDiscordSendLog(): DiscordSendLogEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const p = JSON.parse(raw);
    const list = Array.isArray(p?.items) ? p.items : (Array.isArray(p) ? p : []);
    return list.filter(Boolean);
  } catch {
    return [];
  }
}

export function saveDiscordSendLog(items: DiscordSendLogEntry[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ version: 1, updatedUtc: nowUtc(), items: items.slice(0, MAX) }));
  } catch {}
}

export function appendDiscordSendLog(partial: Omit<DiscordSendLogEntry, "id" | "tsUtc">) {
  const entry: DiscordSendLogEntry = {
    id: uid(),
    tsUtc: nowUtc(),
    ...partial,
  };
  const items = loadDiscordSendLog();
  items.unshift(entry);
  saveDiscordSendLog(items);
  return entry;
}

export function clearDiscordSendLog() {
  try { localStorage.removeItem(KEY); } catch {}
}

export function exportDiscordSendLog(): string {
  const items = loadDiscordSendLog();
  return JSON.stringify({ version: 1, exportedUtc: nowUtc(), items }, null, 2);
}

export function importDiscordSendLog(raw: string): boolean {
  try {
    const p = JSON.parse(raw);
    const items = Array.isArray(p?.items) ? p.items : (Array.isArray(p) ? p : null);
    if (!items) return false;
    saveDiscordSendLog(items);
    return true;
  } catch {
    return false;
  }
}