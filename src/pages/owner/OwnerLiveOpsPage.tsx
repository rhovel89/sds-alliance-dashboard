import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import SupportBundleButton from "../../components/system/SupportBundleButton";
import { supabase } from "../../lib/supabaseClient";

type ChecklistItem = { id: string; text: string; done: boolean; createdUtc: string };

type Store = {
  version: 1;
  updatedUtc: string;
  targetUtc: string | null;
  label: string;
  targetAlliance: string;
  checklist: ChecklistItem[];
  announcementTemplate: string;
  templateMode: "liveops" | "broadcast";
  selectedBroadcastTemplateId: string | null;
};

type DirItem = { id: string; code: string; name: string; state: string };

type Template = {
  id: string;
  scope: "global" | "alliance";
  allianceCode: string | null;
  name: string;
  body: string;
  updatedUtc: string;
};

type TemplateStore = { version: 1; templates: Template[] };

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
  source: "liveops";
  allianceCode: string | null;
  channelName: string | null;
  channelId: string | null;
  mentionRoles: string[];
  mentionRoleIds: string[];
  ok: boolean;
  detail: string;
};

type LogStore = { version: 1; items: LogItem[] };

const KEY = "sad_live_ops_v1";
const DIR_KEY = "sad_alliance_directory_v1";
const PREFILL_KEY = "sad_broadcast_prefill_v1";
const TPL_KEY = "sad_discord_broadcast_templates_v1";

const ROLE_MAP_KEY = "sad_discord_role_map_v1";
const CHANNEL_MAP_KEY = "sad_discord_channel_map_v1";
const LOG_KEY = "sad_discord_send_log_v1";

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

function loadTemplates(): Template[] {
  try {
    const raw = localStorage.getItem(TPL_KEY);
    if (!raw) return [];
    const s = JSON.parse(raw) as TemplateStore;
    if (!s || s.version !== 1 || !Array.isArray(s.templates)) return [];
    return s.templates;
  } catch {
    return [];
  }
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
    const next: LogStore = { version: 1, items: [item, ...(s.items || [])].slice(0, 50) };
    localStorage.setItem(LOG_KEY, JSON.stringify(next));
  } catch {}
}

function load(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as Store;
      if (s && s.version === 1 && Array.isArray(s.checklist)) {
        return {
          ...s,
          targetAlliance: String(s.targetAlliance || "WOC").toUpperCase(),
          templateMode: (s.templateMode === "broadcast" ? "broadcast" : "liveops"),
          selectedBroadcastTemplateId: s.selectedBroadcastTemplateId || null,
        };
      }
    }
  } catch {}
  return {
    version: 1,
    updatedUtc: nowUtc(),
    targetUtc: null,
    label: "Next Op",
    targetAlliance: "WOC",
    checklist: [],
    announcementTemplate:
      "🚨 {{Leadership}} LIVE OPS — {{opLabel}}\n\n" +
      "⏰ Starts: {{opUtc}} (UTC) | Local: {{opLocal}}\n" +
      "📍 Rally: {{#announcements}}\n\n" +
      "✅ Checklist:\n{{checklist}}\n",
    templateMode: "broadcast",
    selectedBroadcastTemplateId: null,
  };
}

function save(s: Store) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {}
}

function fmtCountdown(ms: number): string {
  if (!isFinite(ms)) return "—";
  const neg = ms < 0;
  const x = Math.abs(ms);
  const s = Math.floor(x / 1000);
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const str = `${hh.toString().padStart(2,"0")}:${mm.toString().padStart(2,"0")}:${ss.toString().padStart(2,"0")}`;
  return neg ? `+${str} past` : str;
}

function safeParseUtc(input: string): Date | null {
  const t = (input || "").trim();
  if (!t) return null;

  if (t.includes("T")) {
    const d = new Date(t);
    return isNaN(d.getTime()) ? null : d;
  }

  const m = t.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})$/);
  if (m) {
    const y = Number(m[1]), mo = Number(m[2]) - 1, da = Number(m[3]), h = Number(m[4]), mi = Number(m[5]);
    const d = new Date(Date.UTC(y, mo, da, h, mi, 0));
    return isNaN(d.getTime()) ? null : d;
  }

  const d2 = new Date(t);
  return isNaN(d2.getTime()) ? null : d2;
}

function applyOpsTokens(template: string, opLabel: string, opUtc: string, opLocal: string, checklist: string) {
  return (template || "")
    .replace(/\{\{\s*opLabel\s*\}\}/g, opLabel || "Op")
    .replace(/\{\{\s*opUtc\s*\}\}/g, opUtc || "—")
    .replace(/\{\{\s*opLocal\s*\}\}/g, opLocal || "—")
    .replace(/\{\{\s*checklist\s*\}\}/g, checklist || "- (none)");
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

export default function OwnerLiveOpsPage() {
  const nav = useNavigate();
  const [store, setStore] = useState<Store>(() => load());
  const [tick, setTick] = useState(0);

  const [dir, setDir] = useState<DirItem[]>(() => loadDir());
  const [templates, setTemplates] = useState<Template[]>(() => loadTemplates());

  const [roleStore, setRoleStore] = useState<RoleMapStore>(() => loadRoleStore());
  const [chanStore, setChanStore] = useState<ChannelMapStore>(() => loadChannelStore());

  // NEW send controls
  const [targetChannelName, setTargetChannelName] = useState<string>("");
  const [mentionRoleNames, setMentionRoleNames] = useState<string>(""); // comma list
  const [sending, setSending] = useState(false);
  const [sendMsg, setSendMsg] = useState<string | null>(null);

  useEffect(() => save(store), [store]);

  useEffect(() => {
    const id = window.setInterval(() => setTick((x) => x + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const targetDate = useMemo(() => (store.targetUtc ? safeParseUtc(store.targetUtc) : null), [store.targetUtc]);
  const now = useMemo(() => new Date(), [tick]);
  const msLeft = useMemo(() => (targetDate ? targetDate.getTime() - now.getTime() : NaN), [targetDate, now]);

  const localString = useMemo(() => (targetDate ? targetDate.toLocaleString() : "—"), [targetDate]);
  const utcString = useMemo(() => (targetDate ? targetDate.toISOString() : "—"), [targetDate]);

  const checklistText = useMemo(() => {
    const items = store.checklist || [];
    if (!items.length) return "- (none)";
    return items.map((it) => `${it.done ? "✅" : "⬜️"} ${it.text}`).join("\n");
  }, [store.checklist]);

  const alliance = useMemo(() => String(store.targetAlliance || "WOC").toUpperCase(), [store.targetAlliance]);

  const filteredTemplates = useMemo(() => {
    const ac = alliance.toUpperCase();
    return (templates || []).filter((t) => t.scope === "global" || (t.scope === "alliance" && String(t.allianceCode || "").toUpperCase() === ac));
  }, [templates, alliance]);

  const selectedTpl = useMemo(() => {
    if (!store.selectedBroadcastTemplateId) return null;
    return filteredTemplates.find((t) => t.id === store.selectedBroadcastTemplateId) || null;
  }, [filteredTemplates, store.selectedBroadcastTemplateId]);

  const roleLut = useMemo(() => makeRoleLookup(roleStore, alliance), [roleStore, alliance]);
  const chanLut = useMemo(() => makeChannelLookup(chanStore, alliance), [chanStore, alliance]);
  const channelKeys = useMemo(() => Object.keys(chanLut || {}).sort(), [chanLut]);
  const roleKeys = useMemo(() => Object.keys(roleLut || {}).sort(), [roleLut]);

  function generateMessageRaw() {
    const base =
      store.templateMode === "broadcast"
        ? (selectedTpl?.body || store.announcementTemplate)
        : store.announcementTemplate;

    const msg = applyOpsTokens(base, store.label || "Op", utcString, localString, checklistText);
    if ((base || "").indexOf("{{checklist}}") < 0) return msg + "\n\n✅ Checklist:\n" + checklistText + "\n";
    return msg;
  }

  const messageResolved = useMemo(() => resolveMentions(generateMessageRaw(), roleLut, chanLut), [store, selectedTpl, roleLut, chanLut, tick]);

  async function copyMessage() {
    try { await navigator.clipboard.writeText(messageResolved); alert("Copied Discord-ready message."); }
    catch { window.prompt("Copy:", messageResolved); }
  }

  function openInBroadcast() {
    const payload = {
      version: 1,
      createdUtc: nowUtc(),
      scope: "alliance",
      allianceCode: alliance,
      templateName: (store.templateMode === "broadcast" && selectedTpl) ? selectedTpl.name : ("LiveOps: " + (store.label || "Op")),
      body: generateMessageRaw(),
    };
    try { localStorage.setItem(PREFILL_KEY, JSON.stringify(payload)); } catch {}
    nav("/owner/broadcast");
  }

  function addItem(text: string) {
    const t = (text || "").trim();
    if (!t) return;
    setStore((p) => ({
      ...p,
      updatedUtc: nowUtc(),
      checklist: [{ id: uid(), text: t, done: false, createdUtc: nowUtc() }, ...(p.checklist || [])],
    }));
  }

  function toggle(id: string) {
    setStore((p) => ({
      ...p,
      updatedUtc: nowUtc(),
      checklist: (p.checklist || []).map((x) => (x.id === id ? { ...x, done: !x.done } : x)),
    }));
  }

  function remove(id: string) {
    if (!confirm("Remove checklist item?")) return;
    setStore((p) => ({
      ...p,
      updatedUtc: nowUtc(),
      checklist: (p.checklist || []).filter((x) => x.id !== id),
    }));
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
      source: "liveops",
      allianceCode: alliance,
      targetChannelId,
      mentionRoles: roles,
      mentionRoleIds: roleIds,
      messageResolved,
    };

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
        source: "liveops",
        allianceCode: alliance,
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
        source: "liveops",
        allianceCode: alliance,
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

  const [newItem, setNewItem] = useState("");

  return (
    <div style={{ padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>🧟 Owner — Live Ops</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => { setTemplates(loadTemplates()); setRoleStore(loadRoleStore()); setChanStore(loadChannelStore()); }}>
            Reload Templates/Maps
          </button>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => nav("/owner/discord-send-log")}>📜 Send Log</button>
          <SupportBundleButton />
        </div>
      </div>

      <div className="zombie-card" style={{ marginTop: 12 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ opacity: 0.75, fontSize: 12 }}>Target Alliance</div>
          <select
            className="zombie-input"
            value={alliance}
            onChange={(e) => setStore((p) => ({ ...p, updatedUtc: nowUtc(), targetAlliance: e.target.value.toUpperCase() }))}
            style={{ padding: "10px 12px" }}
          >
            {(dir.length ? dir : [{ id: "x", code: "WOC", name: "WOC", state: "789" }]).map((d) => (
              <option key={d.code} value={d.code}>{d.code} — {d.name}</option>
            ))}
          </select>

          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => setDir(loadDir())}>Reload Directory</button>

          <div style={{ marginLeft: "auto", display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={openInBroadcast}>Open in Broadcast</button>
            <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={copyMessage}>Copy Message</button>
          </div>
        </div>

        <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ opacity: 0.75, fontSize: 12 }}>Template Mode</div>
          <select className="zombie-input" value={store.templateMode} onChange={(e) => setStore((p) => ({ ...p, updatedUtc: nowUtc(), templateMode: e.target.value as any }))} style={{ padding: "10px 12px" }}>
            <option value="broadcast">Broadcast Template</option>
            <option value="liveops">Live Ops Template</option>
          </select>

          {store.templateMode === "broadcast" ? (
            <>
              <div style={{ opacity: 0.75, fontSize: 12 }}>Broadcast Template</div>
              <select
                className="zombie-input"
                value={store.selectedBroadcastTemplateId || ""}
                onChange={(e) => setStore((p) => ({ ...p, updatedUtc: nowUtc(), selectedBroadcastTemplateId: e.target.value || null }))}
                style={{ padding: "10px 12px", minWidth: 260 }}
              >
                <option value="">(select template)</option>
                {filteredTemplates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.scope === "global" ? "[Global] " : "[Alliance] "}{t.name}
                  </option>
                ))}
              </select>
            </>
          ) : null}
        </div>

        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.10)" }}>
          <div style={{ fontWeight: 900 }}>Send to Discord (direct)</div>

          <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ opacity: 0.75, fontSize: 12 }}>Channel</div>
            <select className="zombie-input" value={targetChannelName} onChange={(e) => setTargetChannelName(e.target.value)} style={{ padding: "10px 12px", minWidth: 240 }}>
              <option value="">(select)</option>
              {channelKeys.map((k) => <option key={k} value={k}>{k}{chanLut[k] ? "" : " (no id yet)"}</option>)}
            </select>

            <div style={{ opacity: 0.75, fontSize: 12 }}>Mention Roles (comma)</div>
            <input className="zombie-input" value={mentionRoleNames} onChange={(e) => setMentionRoleNames(e.target.value)} placeholder="Leadership,R5" style={{ padding: "10px 12px", minWidth: 240 }} />

            <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={sendToDiscord} disabled={sending}>
              {sending ? "Sending…" : "🚀 Send"}
            </button>

            <div style={{ opacity: 0.75, fontSize: 12 }}>
              Mapped roles: {roleKeys.length} • Mapped channels: {channelKeys.length}
            </div>
          </div>

          {sendMsg ? (
            <div style={{ marginTop: 10, whiteSpace: "pre-wrap", fontSize: 12, color: sendMsg.startsWith("✅") ? "inherit" : "#ffb3b3" }}>
              {sendMsg}
            </div>
          ) : null}
        </div>
      </div>

      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "minmax(320px, 1fr) minmax(320px, 1.1fr)", gap: 12 }}>
        <div className="zombie-card">
          <div style={{ fontWeight: 900 }}>⏱️ Ops Timer</div>

          <div style={{ marginTop: 10 }}>
            <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Op Label</div>
            <input className="zombie-input" value={store.label} onChange={(e) => setStore((p) => ({ ...p, updatedUtc: nowUtc(), label: e.target.value }))} style={{ width: "100%", padding: "10px 12px" }} />
          </div>

          <div style={{ marginTop: 10 }}>
            <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Target UTC (ISO or "YYYY-MM-DD HH:mm")</div>
            <input
              className="zombie-input"
              value={store.targetUtc || ""}
              onChange={(e) => setStore((p) => ({ ...p, updatedUtc: nowUtc(), targetUtc: e.target.value }))}
              placeholder="2026-02-21 18:00"
              style={{ width: "100%", padding: "10px 12px" }}
            />
          </div>

          <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
            <div style={{ fontWeight: 900, fontSize: 20 }}>⏳ {isFinite(msLeft) ? fmtCountdown(msLeft) : "—"}</div>
            <div style={{ opacity: 0.8, fontSize: 12 }}>UTC: {utcString}</div>
            <div style={{ opacity: 0.8, fontSize: 12 }}>Local: {localString}</div>
          </div>
        </div>

        <div className="zombie-card">
          <div style={{ fontWeight: 900 }}>✅ Ops Checklist</div>

          <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input className="zombie-input" value={newItem} onChange={(e) => setNewItem(e.target.value)} placeholder="Add checklist item…" style={{ flex: 1, minWidth: 220, padding: "10px 12px" }} />
            <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => { addItem(newItem); setNewItem(""); }}>Add</button>
          </div>

          <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
            {(store.checklist || []).map((it) => (
              <div key={it.id} style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.20)" }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <input type="checkbox" checked={it.done} onChange={() => toggle(it.id)} />
                  <div style={{ fontWeight: 900 }}>{it.text}</div>
                  <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                    <button className="zombie-btn" style={{ padding: "6px 8px", fontSize: 12 }} onClick={() => remove(it.id)}>Remove</button>
                  </div>
                </div>
                <div style={{ opacity: 0.6, fontSize: 11, marginTop: 6 }}>UTC: {it.createdUtc}</div>
              </div>
            ))}
            {(store.checklist || []).length === 0 ? <div style={{ opacity: 0.75 }}>No checklist items yet.</div> : null}
          </div>
        </div>
      </div>

      <div className="zombie-card" style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 900 }}>Preview (Resolved)</div>
        <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 12, padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.20)" }}>
{messageResolved}
        </pre>
      </div>
    </div>
  );
}