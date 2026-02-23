import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import SupportBundleButton from "../../components/system/SupportBundleButton";

type DirItem = { id: string; code: string; name: string; state: string };

type RoleMapStore = { version: 1; global: Record<string, string>; alliances: Record<string, Record<string, string>> };
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

  // #announcements
  text = text.replace(/(^|[\s(])#([A-Za-z0-9_\-]{2,64})(?=$|[\s),.!?])/g, (_m, pre, k) => {
    const key = norm(String(k));
    const id = chanLut[key];
    return id ? `${pre}<#${id}>` : `${pre}#${String(k)}`;
  });

  return text;
}

export default function OwnerDiscordTestSendPage() {
  const nav = useNavigate();
  const dir = useMemo(() => loadDir(), []);

  const [scope, setScope] = useState<"global" | "alliance">("alliance");
  const [allianceCode, setAllianceCode] = useState<string>((dir[0]?.code || "WOC").toUpperCase());

  const [roleStore, setRoleStore] = useState<RoleMapStore>(() => loadRoleStore());
  const [chanStore, setChanStore] = useState<ChannelMapStore>(() => loadChannelStore());

  const effectiveAlliance = useMemo(() => (scope === "alliance" ? String(allianceCode || "").toUpperCase() : null), [scope, allianceCode]);
  const roleLut = useMemo(() => makeRoleLookup(roleStore, effectiveAlliance), [roleStore, effectiveAlliance]);
  const chanLut = useMemo(() => makeChannelLookup(chanStore, effectiveAlliance), [chanStore, effectiveAlliance]);

  const roleKeys = useMemo(() => Object.keys(roleLut || {}).sort(), [roleLut]);
  const channelKeys = useMemo(() => Object.keys(chanLut || {}).sort(), [chanLut]);

  const [targetChannelName, setTargetChannelName] = useState<string>("");
  const [mentionRoleNames, setMentionRoleNames] = useState<string>("");
  const [messageRaw, setMessageRaw] = useState<string>("🧪 Test message — {{Leadership}} check in #announcements");
  const messageResolved = useMemo(() => resolveMentions(messageRaw, roleLut, chanLut), [messageRaw, roleLut, chanLut]);

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


  function reloadMaps() {
    setRoleStore(loadRoleStore());
    setChanStore(loadChannelStore());
  }

  async function send() {
    setSendMsg(null);

    const chKey = norm(targetChannelName);
    const targetChannelId = chKey ? (chanLut[chKey] || "") : "";
    if (!targetChannelId) {
      const msg = "❌ Missing channel ID. Add it in /owner/discord-mentions, then select it here.";
      setSendMsg(msg);
      appendLog({
        id: uid(),
        tsUtc: nowUtc(),
        source: "test_send",
        allianceCode: effectiveAlliance,
        channelName: targetChannelName || null,
        channelId: targetChannelId || null,
        mentionRoles: [],
        mentionRoleIds: [],
        ok: false,
        detail: msg,
      });
      return;
    }

    const roles = mentionRoleNames.split(",").map((x) => x.trim()).filter(Boolean);
    const roleIds = roles.map((r) => roleLut[norm(r)] || "").filter(Boolean);

    const payload = {
      version: 1,
      createdUtc: nowUtc(),
      source: "test_send",
      allianceCode: effectiveAlliance,
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
        source: "test_send",
        allianceCode: effectiveAlliance,
        channelName: targetChannelName || null,
        channelId: targetChannelId || null,
        mentionRoles: roles,
        mentionRoleIds: roleIds,
        ok: true,
        detail: JSON.stringify((r as any).data),
      });

      setSendMsg("✅ Sent test message.");
    } catch (e: any) {
      appendLog({
        id: uid(),
        tsUtc: nowUtc(),
        source: "test_send",
        allianceCode: effectiveAlliance,
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

  async function copyResolved() {
    try { await navigator.clipboard.writeText(messageResolved); alert("Copied Discord-ready message."); }
    catch { window.prompt("Copy:", messageResolved); }
  }

  return (
    <div style={{ padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>🧪 Owner — Discord Test Send</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => nav("/owner/discord-mentions")}>🔧 Mentions</button>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => nav("/owner/discord-send-log")}>📜 Send Log</button>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={reloadMaps}>Reload Maps</button>
          <SupportBundleButton />
        </div>
      </div>

      <div className="zombie-card" style={{ marginTop: 12 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
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

          <div style={{ opacity: 0.75, fontSize: 12 }}>
            Roles mapped: {roleKeys.length} | Channels mapped: {channelKeys.length}
          </div>
        </div>

        <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ opacity: 0.75, fontSize: 12 }}>Channel</div>
          <select className="zombie-input" value={targetChannelName} onChange={(e) => setTargetChannelName(e.target.value)} style={{ padding: "10px 12px", minWidth: 240 }}>
            <option value="">(select)</option>
            {channelKeys.map((k) => <option key={k} value={k}>{k}{chanLut[k] ? "" : " (no id yet)"}</option>)}
          </select>

          <div style={{ opacity: 0.75, fontSize: 12 }}>Mention Roles (comma)</div>
          <input className="zombie-input" value={mentionRoleNames} onChange={(e) => setMentionRoleNames(e.target.value)} placeholder="Leadership,R5" style={{ padding: "10px 12px", minWidth: 240 }} />

          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={send} disabled={sending}>
            {sending ? "Sending…" : "🚀 Send Test"}
          </button>

          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={copyResolved}>Copy Resolved</button>
        </div>

        {sendMsg ? (
          <div style={{ marginTop: 10, whiteSpace: "pre-wrap", fontSize: 12, color: sendMsg.startsWith("✅") ? "inherit" : "#ffb3b3" }}>
            {sendMsg}
          </div>
        ) : null}
      </div>

      <div className="zombie-card" style={{ marginTop: 12 }}>
        <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Message (tokens allowed)</div>
        <textarea className="zombie-input" value={messageRaw} onChange={(e) => setMessageRaw(e.target.value)} style={{ width: "100%", minHeight: 140, padding: "10px 12px" }} />
      </div>

      <div className="zombie-card" style={{ marginTop: 12 }}>
        <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Resolved Preview (Discord-ready)</div>
        <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 12, padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.20)" }}>
{messageResolved}
        </pre>
      </div>
    </div>
  );
}
