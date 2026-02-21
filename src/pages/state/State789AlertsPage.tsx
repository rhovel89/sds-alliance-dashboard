import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import SupportBundleButton from "../../components/system/SupportBundleButton";

type DirItem = { id: string; code: string; name: string; state: string };

type AlertItem = {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  createdUtc: string;
  updatedUtc: string;
};

type AlertsStore = { version: 1; items: AlertItem[] };

type RoleMapStore = {
  version: 1;
  global: Record<string, string>;
  alliances: Record<string, Record<string, string>>;
};

type ChannelEntry = { id: string; name: string; channelId: string; createdUtc: string };
type ChannelMapStore = { version: 1; global: ChannelEntry[]; alliances: Record<string, ChannelEntry[]> };

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

const ALERTS_KEY = "sad_state789_alerts_v1";
const DIR_KEY = "sad_alliance_directory_v1";
const ROLE_MAP_KEY = "sad_discord_role_map_v1";
const CHANNEL_MAP_KEY = "sad_discord_channel_map_v1";
const LOG_KEY = "sad_discord_send_log_v1";
const DEFAULTS_KEY = "sad_discord_defaults_v1";

function uid() { return Math.random().toString(16).slice(2) + "-" + Date.now().toString(16); }
function nowUtc() { return new Date().toISOString(); }
function norm(s: any) { return String(s || "").trim().toLowerCase(); }

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

function loadAlerts(): AlertsStore {
  try {
    const raw = localStorage.getItem(ALERTS_KEY);
    if (raw) {
      const s = JSON.parse(raw) as AlertsStore;
      if (s && s.version === 1 && Array.isArray(s.items)) return s;
    }
  } catch {}
  return { version: 1, items: [] };
}

function saveAlerts(s: AlertsStore) {
  try { localStorage.setItem(ALERTS_KEY, JSON.stringify(s)); } catch {}
}

function loadRoleStore(): RoleMapStore {
  try {
    const raw = localStorage.getItem(ROLE_MAP_KEY);
    if (!raw) return { version: 1, global: {}, alliances: {} };
    const s = JSON.parse(raw) as RoleMapStore;
    if (s && s.version === 1) return s;
  } catch {}
  return { version: 1, global: {}, alliances: {} };
}

function loadChannelStore(): ChannelMapStore {
  try {
    const raw = localStorage.getItem(CHANNEL_MAP_KEY);
    if (!raw) return { version: 1, global: [], alliances: {} };
    const s = JSON.parse(raw) as ChannelMapStore;
    if (s && s.version === 1) return s;
  } catch {}
  return { version: 1, global: [], alliances: {} };
}

function loadLog(): LogStore {
  try {
    const raw = localStorage.getItem(LOG_KEY);
    if (!raw) return { version: 1, items: [] };
    const s = JSON.parse(raw) as LogStore;
    if (s && s.version === 1 && Array.isArray(s.items)) return s;
  } catch {}
  return { version: 1, items: [] };
}

function appendLog(item: LogItem) {
  try {
    const s = loadLog();
    const next: LogStore = { version: 1, items: [item, ...(s.items || [])].slice(0, 80) };
    localStorage.setItem(LOG_KEY, JSON.stringify(next));
  } catch {}
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

  // {{role:Leadership}} and {{Leadership}}
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

  // @Leadership
  text = text.replace(/(^|[\s(])@([A-Za-z0-9_\-]{2,64})(?=$|[\s),.!?])/g, (_m, pre, k) => {
    const key = norm(String(k));
    const id = roleLut[key];
    return id ? `${pre}<@&${id}>` : `${pre}@${String(k)}`;
  });

  // {{#announcements}} and {{channel:announcements}}
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

  // #announcements (only when name exists in lut)
  text = text.replace(/(^|[\s(])#([A-Za-z0-9_\-]{2,64})(?=$|[\s),.!?])/g, (_m, pre, k) => {
    const key = norm(String(k));
    const id = chanLut[key];
    return id ? `${pre}<#${id}>` : `${pre}#${String(k)}`;
  });

  return text;
}

function fmtAlert(a: { title: string; body: string }) {
  const t = (a.title || "").trim();
  const b = (a.body || "").trim();
  if (t && b) return `🚨 STATE 789 ALERT — ${t}\n\n${b}`;
  if (t) return `🚨 STATE 789 ALERT — ${t}`;
  return b || "";
}

export default function State789AlertsPage() {
  const nav = useNavigate();
  const dir = useMemo(() => loadDir(), []);

  const [store, setStore] = useState<AlertsStore>(() => loadAlerts());
  useEffect(() => saveAlerts(store), [store]);

  const [scope, setScope] = useState<"global" | "alliance">("global");
  const [allianceCode, setAllianceCode] = useState<string>((dir[0]?.code || "WOC").toUpperCase());

  const [roleStore, setRoleStore] = useState<RoleMapStore>(() => loadRoleStore());
  const [chanStore, setChanStore] = useState<ChannelMapStore>(() => loadChannelStore());

  const effectiveAlliance = useMemo(() => (scope === "alliance" ? String(allianceCode || "").toUpperCase() : null), [scope, allianceCode]);
  const roleLut = useMemo(() => makeRoleLookup(roleStore, effectiveAlliance), [roleStore, effectiveAlliance]);
  const chanLut = useMemo(() => makeChannelLookup(chanStore, effectiveAlliance), [chanStore, effectiveAlliance]);

  const channelKeys = useMemo(() => Object.keys(chanLut || {}).sort(), [chanLut]);
  const roleKeys = useMemo(() => Object.keys(roleLut || {}).sort(), [roleLut]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = useMemo(() => (selectedId ? (store.items || []).find((x) => x.id === selectedId) || null : null), [store.items, selectedId]);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  // Send controls
  const [targetChannelName, setTargetChannelName] = useState<string>("");
  const [mentionRoleNames, setMentionRoleNames] = useState<string>(""); // comma list
  const [sending, setSending] = useState(false);
  const [sendMsg, setSendMsg] = useState<string | null>(null);

  // Auto-fill Discord defaults (channel + roles) when empty
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DEFAULTS_KEY);
      if (!raw) return;
      const s = JSON.parse(raw);
      if (!s || s.version !== 1) return;

      const ac = scope === "alliance" ? String(allianceCode || "").toUpperCase() : null;
      const d =
        scope === "global"
          ? (s.global || {})
          : ((s.alliances && ac && s.alliances[ac]) ? s.alliances[ac] : (s.global || {}));

      if (!targetChannelName && d.channelName) setTargetChannelName(String(d.channelName));
      if (!mentionRoleNames && d.rolesCsv) setMentionRoleNames(String(d.rolesCsv));
    } catch {}
  }, [scope, allianceCode]);


  useEffect(() => {
    if (!selected) return;
    setTitle(selected.title || "");
    setBody(selected.body || "");
  }, [selectedId]);

  function resetEditor() {
    setSelectedId(null);
    setTitle("");
    setBody("");
  }

  function saveAlert() {
    const t = title.trim();
    const b = body.trim();
    if (!t && !b) return alert("Enter a title or body.");

    const now = nowUtc();
    const next: AlertsStore = { ...store, items: [...(store.items || [])] };

    if (selectedId) {
      const idx = next.items.findIndex((x) => x.id === selectedId);
      if (idx >= 0) {
        next.items[idx] = { ...next.items[idx], title: t, body: b, updatedUtc: now };
      }
    } else {
      next.items.unshift({
        id: uid(),
        title: t || "(untitled)",
        body: b || "",
        pinned: false,
        createdUtc: now,
        updatedUtc: now,
      });
    }

    setStore(next);
    resetEditor();
  }

  function deleteAlert(id: string) {
    if (!confirm("Delete this alert?")) return;
    setStore((p) => ({ ...p, items: (p.items || []).filter((x) => x.id !== id) }));
    if (selectedId === id) resetEditor();
  }

  function togglePin(id: string) {
    setStore((p) => ({
      ...p,
      items: (p.items || []).map((x) => (x.id === id ? { ...x, pinned: !x.pinned, updatedUtc: nowUtc() } : x)),
    }));
  }

  async function exportJson() {
    const txt = JSON.stringify({ ...store, exportedUtc: nowUtc() }, null, 2);
    try { await navigator.clipboard.writeText(txt); alert("Copied alerts JSON."); }
    catch { window.prompt("Copy alerts JSON:", txt); }
  }

  function importJson() {
    const raw = window.prompt("Paste alerts JSON:");
    if (!raw) return;
    try {
      const p = JSON.parse(raw);
      if (p?.version !== 1 || !Array.isArray(p.items)) throw new Error("Invalid");
      setStore({ version: 1, items: p.items });
      resetEditor();
      alert("Imported.");
    } catch {
      alert("Invalid JSON.");
    }
  }

  function buildMessageRaw() {
    const a = selected ? { title: selected.title, body: selected.body } : { title, body };
    return fmtAlert(a);
  }

  const messageResolved = useMemo(() => resolveMentions(buildMessageRaw(), roleLut, chanLut), [selectedId, title, body, roleLut, chanLut]);

  function applyDiscordDefaults(force: boolean = true) {
    try {
      const raw = localStorage.getItem(DEFAULTS_KEY);
      if (!raw) return;
      const s = JSON.parse(raw);
      if (!s || s.version !== 1) return;
      const ac = scope === "alliance" ? String(allianceCode || "").toUpperCase() : null;
      const d =
        scope === "global"
          ? (s.global || {})
          : ((s.alliances && ac && s.alliances[ac]) ? s.alliances[ac] : (s.global || {}));
      if (d.channelName && (force || !targetChannelName)) setTargetChannelName(String(d.channelName));
      if (d.rolesCsv && (force || !mentionRoleNames)) setMentionRoleNames(String(d.rolesCsv));
    } catch {}
  }

  async function sendToDiscord() {
    setSendMsg(null);

    const chKey = norm(targetChannelName);
    const targetChannelId = chKey ? (chanLut[chKey] || "") : "";
    if (!targetChannelId) {
      setSendMsg("❌ Missing channel ID. Add it in /owner/discord-mentions, then select the channel here.");
      return;
    }

    const roles = mentionRoleNames.split(",").map((x) => x.trim()).filter(Boolean);
    const roleIds = roles.map((r) => roleLut[norm(r)] || "").filter(Boolean);

    const payload = {
      version: 1,
      createdUtc: nowUtc(),
      source: "state_alerts",
      allianceCode: null,
      targetChannelId,
      mentionRoles: roles,
      mentionRoleIds: roleIds,
      messageResolved,
    };

    if (!payload.messageResolved || !String(payload.messageResolved).trim()) {
      setSendMsg("❌ Message is empty.");
      return;
    }

    setSending(true);
    try {
      const r = await supabase.functions.invoke("discord-broadcast", { body: payload as any });
      if ((r as any).error) {
        const e = (r as any).error;
        throw new Error(e?.message || JSON.stringify(e));
      }

      appendLog({
        id: uid(),
        tsUtc: nowUtc(),
        source: "state_alerts",
        allianceCode: null,
        channelName: targetChannelName || null,
        channelId: targetChannelId || null,
        mentionRoles: roles,
        mentionRoleIds: roleIds,
        ok: true,
        detail: JSON.stringify((r as any).data),
      });

      setSendMsg("✅ Sent to Discord.");
    } catch (e: any) {
      appendLog({
        id: uid(),
        tsUtc: nowUtc(),
        source: "state_alerts",
        allianceCode: null,
        channelName: targetChannelName || null,
        channelId: targetChannelId || null,
        mentionRoles: roles,
        mentionRoleIds: roleIds,
        ok: false,
        detail: String(e?.message || e),
      });

      setSendMsg("❌ Send failed: " + String(e?.message || e));
    } finally {
      setSending(false);
    }
  }

  const pinned = useMemo(() => (store.items || []).filter((x) => x.pinned), [store.items]);
  const others = useMemo(() => (store.items || []).filter((x) => !x.pinned), [store.items]);

  return (
    <div style={{ padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>🚨 State 789 — Alerts</h2>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => nav("/state/789")}>⬅ Back</button>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => nav("/owner/discord-mentions")}>🔧 Mentions</button>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => nav("/owner/discord-send-log")}>📜 Send Log</button>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={exportJson}>Export</button>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={importJson}>Import</button>
          <SupportBundleButton />
        </div>
      </div>

      <div className="zombie-card" style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 900 }}>Send to Discord</div>

        <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ opacity: 0.75, fontSize: 12 }}>Scope</div>
          <select className="zombie-input" value={scope} onChange={(e) => setScope(e.target.value as any)} style={{ padding: "10px 12px" }}>
            <option value="global">Global</option>
            <option value="alliance">Alliance</option>
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

          <div style={{ opacity: 0.75, fontSize: 12 }}>Channel</div>
          <select className="zombie-input" value={targetChannelName} onChange={(e) => setTargetChannelName(e.target.value)} style={{ padding: "10px 12px", minWidth: 220 }}>
            <option value="">(select)</option>
            {channelKeys.map((k) => <option key={k} value={k}>{k}{chanLut[k] ? "" : " (no id yet)"}</option>)}
          </select>

          <div style={{ opacity: 0.75, fontSize: 12 }}>Mention Roles (comma names)</div>
          <input className="zombie-input" value={mentionRoleNames} onChange={(e) => setMentionRoleNames(e.target.value)} placeholder="Leadership,R5" style={{ padding: "10px 12px", minWidth: 220 }} />

          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => applyDiscordDefaults(true)}>Use Defaults</button>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={sendToDiscord} disabled={sending}>
            {sending ? "Sending…" : "🚀 Send Alert"}
          </button>

          <div style={{ opacity: 0.7, fontSize: 12 }}>
            Mapped roles: {roleKeys.length} • Mapped channels: {channelKeys.length}
          </div>
        </div>

        {sendMsg ? (
          <div style={{ marginTop: 10, whiteSpace: "pre-wrap", fontSize: 12, color: sendMsg.startsWith("✅") ? "inherit" : "#ffb3b3" }}>
            {sendMsg}
          </div>
        ) : null}

        <div style={{ marginTop: 10, opacity: 0.65, fontSize: 12 }}>
          Tip: Use tokens in your alert body like {"{{Leadership}}"} or {"{{channel:announcements}}"} or @Leadership / #announcements.
        </div>
      </div>

      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "minmax(320px, 1fr) minmax(320px, 1.1fr)", gap: 12 }}>
        <div className="zombie-card">
          <div style={{ fontWeight: 900 }}>Alerts</div>

          {pinned.length ? <div style={{ marginTop: 10, opacity: 0.75, fontSize: 12 }}>Pinned</div> : null}
          <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
            {pinned.map((a) => (
              <div key={a.id} style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(120,255,120,0.08)" }}>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <div style={{ fontWeight: 900, cursor: "pointer" }} onClick={() => setSelectedId(a.id)}>{a.title}</div>
                  <div style={{ marginLeft: "auto", opacity: 0.65, fontSize: 12 }}>{a.updatedUtc}</div>
                </div>
                <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button className="zombie-btn" style={{ padding: "6px 8px", fontSize: 12 }} onClick={() => togglePin(a.id)}>Unpin</button>
                  <button className="zombie-btn" style={{ padding: "6px 8px", fontSize: 12 }} onClick={() => deleteAlert(a.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 12, opacity: 0.75, fontSize: 12 }}>All</div>
          <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
            {others.map((a) => (
              <div key={a.id} style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.20)" }}>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <div style={{ fontWeight: 900, cursor: "pointer" }} onClick={() => setSelectedId(a.id)}>{a.title}</div>
                  <div style={{ marginLeft: "auto", opacity: 0.65, fontSize: 12 }}>{a.updatedUtc}</div>
                </div>
                <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button className="zombie-btn" style={{ padding: "6px 8px", fontSize: 12 }} onClick={() => togglePin(a.id)}>Pin</button>
                  <button className="zombie-btn" style={{ padding: "6px 8px", fontSize: 12 }} onClick={() => deleteAlert(a.id)}>Delete</button>
                </div>
              </div>
            ))}
            {(store.items || []).length === 0 ? <div style={{ opacity: 0.75 }}>No alerts yet.</div> : null}
          </div>
        </div>

        <div className="zombie-card">
          <div style={{ fontWeight: 900 }}>{selected ? "Edit Alert" : "Create Alert"}</div>

          <div style={{ marginTop: 10 }}>
            <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Title</div>
            <input className="zombie-input" value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: "100%", padding: "10px 12px" }} />
          </div>

          <div style={{ marginTop: 10 }}>
            <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Body</div>
            <textarea className="zombie-input" value={body} onChange={(e) => setBody(e.target.value)} style={{ width: "100%", minHeight: 180, padding: "10px 12px" }} />
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
            <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={saveAlert}>
              {selected ? "Save" : "Create"}
            </button>
            <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={resetEditor}>Clear</button>
          </div>

          <div style={{ marginTop: 12 }}>
            <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Preview (Resolved)</div>
            <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 12, padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.20)" }}>
{messageResolved}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
