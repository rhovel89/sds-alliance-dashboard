import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import SupportBundleButton from "../../components/system/SupportBundleButton";

type DirItem = { id: string; code: string; name: string; state: string };

type RoleMapStore = { version: 1; global: Record<string, string>; alliances: Record<string, Record<string, string>> };
type ChannelEntry = { id: string; name: string; channelId: string; createdUtc: string };
type ChannelMapStore = { version: 1; global: ChannelEntry[]; alliances: Record<string, ChannelEntry[]> };

type ScheduledItem = {
  id: string;
  createdUtc: string;
  scheduledUtc: string;      // ISO UTC
  scope: "global" | "alliance";
  allianceCode: string | null;

  channelName: string;       // lookup key
  channelId: string | null;  // resolved

  mentionRolesCsv: string;   // names comma
  mentionRoleIds: string[];  // resolved

  messageRaw: string;
  messageResolved: string;

  status: "pending" | "sent" | "failed" | "cancelled";
  lastAttemptUtc: string | null;
  lastResult: string | null;
};

type Store = { version: 1; items: ScheduledItem[] };

type LogItem = {
  id: string;
  tsUtc: string;
  source: string;
  allianceCode: string | null;
  channelName: string | null;
  channelId: string | null;
  mentionRoles: string[];
  mentionRoleIds: string[];
  ok: boolean;
  detail: string;
};
type LogStore = { version: 1; items: LogItem[] };

const KEY = "sad_discord_scheduled_sends_v1";
const DIR_KEY = "sad_alliance_directory_v1";
const ROLE_MAP_KEY = "sad_discord_role_map_v1";
const CHANNEL_MAP_KEY = "sad_discord_channel_map_v1";
const LOG_KEY = "sad_discord_send_log_v1";

function uid() { return Math.random().toString(16).slice(2) + "-" + Date.now().toString(16); }
function nowUtc() { return new Date().toISOString(); }
function norm(s: any) { return String(s || "").trim().toLowerCase(); }

function safeJson<T>(raw: string | null): T | null {
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}

function loadDir(): DirItem[] {
  const raw = safeJson<any>(localStorage.getItem(DIR_KEY));
  const items = Array.isArray(raw?.items) ? raw.items : [];
  return items
    .filter((x: any) => x && x.code)
    .map((x: any) => ({
      id: String(x.id || uid()),
      code: String(x.code).toUpperCase(),
      name: String(x.name || x.code),
      state: String(x.state || "789"),
    }));
}

function loadRoleStore(): RoleMapStore {
  const s = safeJson<RoleMapStore>(localStorage.getItem(ROLE_MAP_KEY));
  if (s && s.version === 1) return s;
  return { version: 1, global: {}, alliances: {} };
}

function loadChannelStore(): ChannelMapStore {
  const s = safeJson<ChannelMapStore>(localStorage.getItem(CHANNEL_MAP_KEY));
  if (s && s.version === 1) return s;
  return { version: 1, global: [], alliances: {} };
}

function loadLog(): LogStore {
  const s = safeJson<LogStore>(localStorage.getItem(LOG_KEY));
  if (s && s.version === 1 && Array.isArray(s.items)) return s;
  return { version: 1, items: [] };
}

function appendLog(item: LogItem) {
  try {
    const s = loadLog();
    const next: LogStore = { version: 1, items: [item, ...(s.items || [])].slice(0, 80) };
    localStorage.setItem(LOG_KEY, JSON.stringify(next));
  } catch {}
}

function load(): Store {
  const s = safeJson<Store>(localStorage.getItem(KEY));
  if (s && s.version === 1 && Array.isArray(s.items)) return s;
  return { version: 1, items: [] };
}

function save(s: Store) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {}
}

function makeRoleLookup(roleStore: RoleMapStore, allianceCode: string | null) {
  const global = roleStore.global || {};
  const per = allianceCode ? (roleStore.alliances?.[allianceCode] || {}) : {};
  const out: Record<string, string> = {};
  for (const k of Object.keys(global)) out[norm(k)] = String(global[k] || "");
  for (const k of Object.keys(per)) out[norm(k)] = String(per[k] || "");
  return out;
}

function makeChannelLookup(channelStore: ChannelMapStore, allianceCode: string | null) {
  const out: Record<string, string> = {};
  const addList = (lst: ChannelEntry[] | undefined) => {
    for (const c of lst || []) {
      const nm = norm(String(c.name || ""));
      const id = String(c.channelId || "").trim();
      if (nm) out[nm] = id;
    }
  };
  addList(channelStore.global);
  if (allianceCode) addList(channelStore.alliances?.[allianceCode]);
  return out;
}

function resolveMentions(input: string, roleLut: Record<string, string>, chanLut: Record<string, string>) {
  let text = input || "";

  text = text.replace(/\{\{\s*role\s*:\s*([A-Za-z0-9_\- ]{1,64})\s*\}\}/g, (_m, k) => {
    const key = norm(String(k));
    const id = roleLut[key];
    return id ? `<@&${id}>` : `{{role:${String(k)}}}`;
  });
  text = text.replace(/\{\{\s*([A-Za-z0-9_\- ]{1,64})\s*\}\}/g, (_m, k) => {
    const key = norm(String(k));
    const id = roleLut[key];
    return id ? `<@&${id}>` : `{{${String(k)}}}`;
  });

  text = text.replace(/(^|[\s(])@([A-Za-z0-9_\-]{2,64})(?=$|[\s),.!?])/g, (_m, pre, k) => {
    const key = norm(String(k));
    const id = roleLut[key];
    return id ? `${pre}<@&${id}>` : `${pre}@${String(k)}`;
  });

  text = text.replace(/\{\{\s*#([A-Za-z0-9_\-]{2,64})\s*\}\}/g, (_m, k) => {
    const key = norm(String(k));
    const id = chanLut[key];
    return id ? `<#${id}>` : `{{#${String(k)}}}`;
  });
  text = text.replace(/\{\{\s*channel\s*:\s*([A-Za-z0-9_\-]{2,64})\s*\}\}/g, (_m, k) => {
    const key = norm(String(k));
    const id = chanLut[key];
    return id ? `<#${id}>` : `{{channel:${String(k)}}}`;
  });

  text = text.replace(/(^|[\s(])#([A-Za-z0-9_\-]{2,64})(?=$|[\s),.!?])/g, (_m, pre, k) => {
    const key = norm(String(k));
    const id = chanLut[key];
    return id ? `${pre}<#${id}>` : `${pre}#${String(k)}`;
  });

  return text;
}

function parseUtc(input: string): Date | null {
  const t = (input || "").trim();
  if (!t) return null;
  const d = new Date(t);
  return isNaN(d.getTime()) ? null : d;
}

export default function OwnerScheduledDiscordSendsPage() {
  const dir = useMemo(() => loadDir(), []);
  const [store, setStore] = useState<Store>(() => load());
  useEffect(() => save(store), [store]);

  const [roleStore, setRoleStore] = useState<RoleMapStore>(() => loadRoleStore());
  const [chanStore, setChanStore] = useState<ChannelMapStore>(() => loadChannelStore());

  const [scope, setScope] = useState<"global" | "alliance">("alliance");
  const [allianceCode, setAllianceCode] = useState<string>((dir[0]?.code || "WOC").toUpperCase());

  const effectiveAlliance = useMemo(() => (scope === "alliance" ? String(allianceCode || "").toUpperCase() : null), [scope, allianceCode]);
  const roleLut = useMemo(() => makeRoleLookup(roleStore, effectiveAlliance), [roleStore, effectiveAlliance]);
  const chanLut = useMemo(() => makeChannelLookup(chanStore, effectiveAlliance), [chanStore, effectiveAlliance]);

  const channelKeys = useMemo(() => Object.keys(chanLut || {}).sort(), [chanLut]);
  const roleKeys = useMemo(() => Object.keys(roleLut || {}).sort(), [roleLut]);

  const [scheduledUtc, setScheduledUtc] = useState<string>(new Date(Date.now() + 10 * 60 * 1000).toISOString());
  const [channelName, setChannelName] = useState<string>("");
  const [rolesCsv, setRolesCsv] = useState<string>("");
  const [messageRaw, setMessageRaw] = useState<string>("📣 Scheduled message — {{Leadership}}");

  const messageResolved = useMemo(() => resolveMentions(messageRaw, roleLut, chanLut), [messageRaw, roleLut, chanLut]);

  const [opMsg, setOpMsg] = useState<string | null>(null);

  function reloadMaps() {
    setRoleStore(loadRoleStore());
    setChanStore(loadChannelStore());
    setOpMsg("Reloaded role/channel maps.");
    window.setTimeout(() => setOpMsg(null), 1500);
  }

  function createItem() {
    const d = parseUtc(scheduledUtc);
    if (!d) return alert("Invalid scheduled UTC (must be ISO, e.g. 2026-02-21T12:00:00Z).");
    const chKey = norm(channelName);
    const chId = chKey ? (chanLut[chKey] || "") : "";
    if (!chKey) return alert("Pick a channel.");

    const roles = rolesCsv.split(",").map((x) => x.trim()).filter(Boolean);
    const roleIds = roles.map((r) => roleLut[norm(r)] || "").filter(Boolean);

    const item: ScheduledItem = {
      id: uid(),
      createdUtc: nowUtc(),
      scheduledUtc: d.toISOString(),
      scope,
      allianceCode: effectiveAlliance,
      channelName: chKey,
      channelId: chId || null,
      mentionRolesCsv: rolesCsv,
      mentionRoleIds: roleIds,
      messageRaw,
      messageResolved,
      status: "pending",
      lastAttemptUtc: null,
      lastResult: null,
    };

    setStore((p) => ({ version: 1, items: [item, ...(p.items || [])] }));
    setOpMsg("Created scheduled item.");
    window.setTimeout(() => setOpMsg(null), 1500);
  }

  function updateItem(id: string, patch: Partial<ScheduledItem>) {
    setStore((p) => ({ version: 1, items: (p.items || []).map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
  }

  function removeItem(id: string) {
    if (!confirm("Delete scheduled item?")) return;
    setStore((p) => ({ version: 1, items: (p.items || []).filter((x) => x.id !== id) }));
  }

  async function exportJson() {
    const txt = JSON.stringify({ ...store, exportedUtc: nowUtc() }, null, 2);
    try { await navigator.clipboard.writeText(txt); alert("Copied scheduled sends JSON."); }
    catch { window.prompt("Copy:", txt); }
  }

  function importJson() {
    const raw = window.prompt("Paste scheduled sends JSON:");
    if (!raw) return;
    try {
      const p = JSON.parse(raw);
      if (p?.version !== 1 || !Array.isArray(p.items)) throw new Error("Invalid");
      setStore({ version: 1, items: p.items });
      alert("Imported.");
    } catch {
      alert("Invalid JSON.");
    }
  }

  async function sendItem(it: ScheduledItem) {
    const targetChannelId = it.channelId || "";
    if (!targetChannelId) {
      const msg = "Missing channelId (add in /owner/discord-mentions).";
      updateItem(it.id, { status: "failed", lastAttemptUtc: nowUtc(), lastResult: msg });
      appendLog({
        id: uid(),
        tsUtc: nowUtc(),
        source: "scheduled_send",
        allianceCode: it.allianceCode,
        channelName: it.channelName,
        channelId: it.channelId,
        mentionRoles: (it.mentionRolesCsv || "").split(",").map((x) => x.trim()).filter(Boolean),
        mentionRoleIds: it.mentionRoleIds || [],
        ok: false,
        detail: msg,
      });
      return;
    }

    const payload = {
      version: 1,
      createdUtc: nowUtc(),
      source: "scheduled_send",
      allianceCode: it.allianceCode,
      targetChannelId,
      mentionRoles: (it.mentionRolesCsv || "").split(",").map((x) => x.trim()).filter(Boolean),
      mentionRoleIds: it.mentionRoleIds || [],
      messageResolved: it.messageResolved,
    };

    updateItem(it.id, { lastAttemptUtc: nowUtc(), lastResult: "Sending…", status: "pending" });

    try {
      const r = await supabase.functions.invoke("discord-broadcast", { body: payload as any });
      if ((r as any).error) {
        const e = (r as any).error;
        throw new Error(e?.message || JSON.stringify(e));
      }

      updateItem(it.id, { status: "sent", lastResult: "Sent OK", lastAttemptUtc: nowUtc() });
      appendLog({
        id: uid(),
        tsUtc: nowUtc(),
        source: "scheduled_send",
        allianceCode: it.allianceCode,
        channelName: it.channelName,
        channelId: it.channelId,
        mentionRoles: payload.mentionRoles,
        mentionRoleIds: payload.mentionRoleIds,
        ok: true,
        detail: JSON.stringify((r as any).data),
      });
    } catch (e: any) {
      const msg = String(e?.message || e);
      updateItem(it.id, { status: "failed", lastResult: msg, lastAttemptUtc: nowUtc() });
      appendLog({
        id: uid(),
        tsUtc: nowUtc(),
        source: "scheduled_send",
        allianceCode: it.allianceCode,
        channelName: it.channelName,
        channelId: it.channelId,
        mentionRoles: payload.mentionRoles,
        mentionRoleIds: payload.mentionRoleIds,
        ok: false,
        detail: msg,
      });
    }
  }

  async function sendDueNow() {
    const now = new Date();
    const due = (store.items || []).filter((x) => x.status === "pending" && parseUtc(x.scheduledUtc) && (parseUtc(x.scheduledUtc)!.getTime() <= now.getTime()));
    if (!due.length) { alert("No pending items due right now."); return; }
    for (const it of due) { await sendItem(it); }
    alert("Done sending due items.");
  }

  const items = useMemo(() => {
    const arr = (store.items || []).slice();
    arr.sort((a, b) => b.scheduledUtc.localeCompare(a.scheduledUtc));
    return arr;
  }, [store.items]);

  return (
    <div style={{ padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>🗓️ Owner — Scheduled Discord Sends</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={reloadMaps}>Reload Maps</button>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={sendDueNow}>Send Due Now</button>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={exportJson}>Export</button>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={importJson}>Import</button>
          <SupportBundleButton />
        </div>
      </div>

      {opMsg ? <div style={{ marginTop: 10, opacity: 0.8 }}>{opMsg}</div> : null}

      <div className="zombie-card" style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 900 }}>Create Scheduled Send</div>

        <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ opacity: 0.75, fontSize: 12 }}>Scope</div>
          <select className="zombie-input" value={scope} onChange={(e) => setScope(e.target.value as any)} style={{ padding: "10px 12px" }}>
            <option value="alliance">Alliance</option>
            <option value="global">Global</option>
          </select>

          {scope === "alliance" ? (
            <>
              <div style={{ opacity: 0.75, fontSize: 12 }}>Alliance</div>
              <select className="zombie-input" value={allianceCode} onChange={(e) => setAllianceCode(e.target.value.toUpperCase())} style={{ padding: "10px 12px" }}>
                {(dir.length ? dir : [{ id: "x", code: "WOC", name: "WOC", state: "789" }]).map((d) => (
                  <option key={d.code} value={d.code}>{d.code} — {d.name}</option>
                ))}
              </select>
            </>
          ) : null}

          <div style={{ opacity: 0.75, fontSize: 12 }}>Scheduled UTC (ISO)</div>
          <input className="zombie-input" value={scheduledUtc} onChange={(e) => setScheduledUtc(e.target.value)} style={{ padding: "10px 12px", minWidth: 300 }} />

          <div style={{ opacity: 0.75, fontSize: 12 }}>Channel</div>
          <select className="zombie-input" value={channelName} onChange={(e) => setChannelName(e.target.value)} style={{ padding: "10px 12px", minWidth: 220 }}>
            <option value="">(select)</option>
            {channelKeys.map((k) => <option key={k} value={k}>{k}{chanLut[k] ? "" : " (no id yet)"}</option>)}
          </select>

          <div style={{ opacity: 0.75, fontSize: 12 }}>Mention Roles (comma)</div>
          <input className="zombie-input" value={rolesCsv} onChange={(e) => setRolesCsv(e.target.value)} placeholder="Leadership,R5" style={{ padding: "10px 12px", minWidth: 240 }} />

          <div style={{ opacity: 0.7, fontSize: 12 }}>
            Mapped roles: {roleKeys.length} • Mapped channels: {channelKeys.length}
          </div>
        </div>

        <div style={{ marginTop: 10 }}>
          <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Message (tokens allowed)</div>
          <textarea className="zombie-input" value={messageRaw} onChange={(e) => setMessageRaw(e.target.value)} style={{ width: "100%", minHeight: 120, padding: "10px 12px" }} />
        </div>

        <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={createItem}>Create</button>
        </div>

        <div style={{ marginTop: 12 }}>
          <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Resolved Preview</div>
          <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 12, padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.20)" }}>
{messageResolved}
          </pre>
        </div>
      </div>

      <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
        {items.map((it) => {
          const due = (() => {
            const d = parseUtc(it.scheduledUtc);
            return d ? d.getTime() <= Date.now() : false;
          })();

          return (
            <div key={it.id} className="zombie-card">
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <div style={{ fontWeight: 900 }}>
                  {it.status === "sent" ? "✅" : it.status === "failed" ? "❌" : it.status === "cancelled" ? "🚫" : "🕒"}{" "}
                  {it.scope === "global" ? "GLOBAL" : (it.allianceCode || "ALLIANCE")} • {it.scheduledUtc}
                  {due && it.status === "pending" ? " • DUE" : ""}
                </div>
                <div style={{ opacity: 0.75, fontSize: 12 }}>
                  Channel: #{it.channelName} • ID: {it.channelId || "(missing)"} • Status: {it.status}
                </div>
              </div>

              <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className="zombie-btn" style={{ padding: "8px 10px", fontSize: 12 }} onClick={() => sendItem(it)} disabled={it.status === "sent" || it.status === "cancelled"}>
                  Send Now
                </button>
                <button className="zombie-btn" style={{ padding: "8px 10px", fontSize: 12 }} onClick={() => updateItem(it.id, { status: "cancelled", lastResult: "Cancelled by user", lastAttemptUtc: nowUtc() })} disabled={it.status === "sent"}>
                  Cancel
                </button>
                <button className="zombie-btn" style={{ padding: "8px 10px", fontSize: 12 }} onClick={() => removeItem(it.id)}>
                  Delete
                </button>
              </div>

              {it.lastResult ? (
                <div style={{ marginTop: 8, opacity: 0.8, fontSize: 12, whiteSpace: "pre-wrap" }}>
                  Last: {it.lastAttemptUtc || "(no attempt)"} — {it.lastResult}
                </div>
              ) : null}

              <details style={{ marginTop: 8 }}>
                <summary style={{ cursor: "pointer" }}>Message Preview</summary>
                <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 12, padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.20)" }}>
{it.messageResolved}
                </pre>
              </details>
            </div>
          );
        })}
        {items.length === 0 ? <div style={{ opacity: 0.75 }}>No scheduled sends yet.</div> : null}
      </div>
    </div>
  );
}