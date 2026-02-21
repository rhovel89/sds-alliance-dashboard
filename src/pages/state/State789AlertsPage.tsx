import React, { useEffect, useMemo, useState } from "react";
import SupportBundleButton from "../../components/system/SupportBundleButton";
import { supabase } from "../../lib/supabaseClient";

type RoleMapStore = {
  version: 1;
  global: Record<string, string>;
  alliances: Record<string, Record<string, string>>;
};

type ChannelEntry = { id: string; name: string; channelId: string; createdUtc: string };
type ChannelMapStore = { version: 1; global: ChannelEntry[]; alliances: Record<string, ChannelEntry[]> };

type DirItem = { id: string; code: string; name: string; state: string };

type AlertItem = {
  id: string;
  createdUtc: string;
  updatedUtc: string;
  pinned: boolean;
  title: string;
  body: string;

  scope: "global" | "alliance";
  allianceCode: string | null;

  targetChannelName: string | null;
  targetChannelId: string | null;

  mentionRoles: string[];      // keys like Leadership,R5
  mentionRoleIds: string[];    // resolved ids

  messageRaw: string;
  messageResolved: string;
};

type Store = { version: 1; items: AlertItem[] };

const STORE_KEY = "sad_state789_alerts_v2";
const ROLE_MAP_KEY = "sad_discord_role_map_v1";
const CHANNEL_MAP_KEY = "sad_discord_channel_map_v1";
const DIR_KEY = "sad_alliance_directory_v1";
const SEND_LOG_KEY = "sad_discord_send_log_v1";

function uid() {
  return Math.random().toString(16).slice(2) + "-" + Date.now().toString(16);
}
function nowUtc() {
  return new Date().toISOString();
}
function norm(s: any) {
  return String(s || "").trim().toLowerCase();
}

function safeJson<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
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

function loadStore(): Store {
  const s = safeJson<Store>(localStorage.getItem(STORE_KEY));
  if (s && s.version === 1 && Array.isArray(s.items)) return s;
  return { version: 1, items: [] };
}

function saveStore(s: Store) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(s));
  } catch {}
}

function appendSendLog(entry: any) {
  try {
    const cur = safeJson<any>(localStorage.getItem(SEND_LOG_KEY));
    const items = Array.isArray(cur?.items) ? cur.items : [];
    items.unshift(entry);
    const trimmed = items.slice(0, 20);
    localStorage.setItem(SEND_LOG_KEY, JSON.stringify({ version: 1, items: trimmed }));
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

  // {{role:Leadership}}
  text = text.replace(/\{\{\s*role\s*:\s*([A-Za-z0-9_\- ]{1,64})\s*\}\}/g, (_m, k) => {
    const id = roleLut[norm(k)];
    return id ? `<@&${id}>` : `{{role:${String(k)}}}`;
  });

  // {{Leadership}}
  text = text.replace(/\{\{\s*([A-Za-z0-9_\- ]{1,64})\s*\}\}/g, (_m, k) => {
    const id = roleLut[norm(k)];
    return id ? `<@&${id}>` : `{{${String(k)}}}`;
  });

  // @Leadership
  text = text.replace(/(^|[\s(])@([A-Za-z0-9_\-]{2,64})(?=$|[\s),.!?])/g, (_m, pre, k) => {
    const id = roleLut[norm(k)];
    return id ? `${pre}<@&${id}>` : `${pre}@${String(k)}`;
  });

  // {{#announcements}}
  text = text.replace(/\{\{\s*#([A-Za-z0-9_\-]{2,64})\s*\}\}/g, (_m, k) => {
    const id = chanLut[norm(k)];
    return id ? `<#${id}>` : `{{#${String(k)}}}`;
  });

  // {{channel:announcements}}
  text = text.replace(/\{\{\s*channel\s*:\s*([A-Za-z0-9_\-]{2,64})\s*\}\}/g, (_m, k) => {
    const id = chanLut[norm(k)];
    return id ? `<#${id}>` : `{{channel:${String(k)}}}`;
  });

  // #announcements (only when mapped)
  text = text.replace(/(^|[\s(])#([A-Za-z0-9_\-]{2,64})(?=$|[\s),.!?])/g, (_m, pre, k) => {
    const id = chanLut[norm(k)];
    return id ? `${pre}<#${id}>` : `${pre}#${String(k)}`;
  });

  return text;
}

export default function State789AlertsPage() {
  const dir = useMemo(() => loadDir(), []);
  const [roleStore] = useState<RoleMapStore>(() => loadRoleStore());
  const [chanStore] = useState<ChannelMapStore>(() => loadChannelStore());

  const [store, setStore] = useState<Store>(() => loadStore());
  useEffect(() => saveStore(store), [store]);

  const [scope, setScope] = useState<"global" | "alliance">("alliance");
  const [allianceCode, setAllianceCode] = useState<string>((dir[0]?.code || "WOC").toUpperCase());

  const effectiveAlliance = useMemo(
    () => (scope === "alliance" ? String(allianceCode || "").toUpperCase() : null),
    [scope, allianceCode]
  );

  const roleLut = useMemo(() => makeRoleLookup(roleStore, effectiveAlliance), [roleStore, effectiveAlliance]);
  const chanLut = useMemo(() => makeChannelLookup(chanStore, effectiveAlliance), [chanStore, effectiveAlliance]);

  const channelKeys = useMemo(() => Object.keys(chanLut || {}).sort(), [chanLut]);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("🚨 State 789 Alert\n\n");
  const [targetChannelName, setTargetChannelName] = useState("");
  const [mentionRoleNames, setMentionRoleNames] = useState(""); // comma list

  const mentionRoles = useMemo(() => {
    return (mentionRoleNames || "")
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
  }, [mentionRoleNames]);

  const mentionRoleIds = useMemo(() => {
    return mentionRoles.map((r) => roleLut[norm(r)] || "").filter(Boolean);
  }, [mentionRoles, roleLut]);

  const targetChannelId = useMemo(() => {
    const k = norm(targetChannelName);
    return k ? (chanLut[k] || "") : "";
  }, [targetChannelName, chanLut]);

  const resolvedPreview = useMemo(() => {
    const header = (mentionRoleIds.length ? mentionRoleIds.map((id) => `<@&${id}>`).join(" ") + "\n\n" : "");
    const raw = header + (body || "");
    return resolveMentions(raw, roleLut, chanLut);
  }, [body, mentionRoleIds, roleLut, chanLut]);

  async function copyPayloadJson() {
    const payload = {
      version: 1,
      createdUtc: nowUtc(),
      scope,
      allianceCode: scope === "alliance" ? effectiveAlliance : null,
      targetChannel: { name: targetChannelName || null, id: targetChannelId || null },
      mentionRoles,
      mentionRoleIds,
      messageRaw: body,
      messageResolved: resolvedPreview,
      note: "UI-only payload; can be sent by Edge Function / bot.",
    };
    const txt = JSON.stringify(payload, null, 2);
    try {
      await navigator.clipboard.writeText(txt);
      window.alert("Copied payload JSON.");
    } catch {
      window.prompt("Copy:", txt);
    }
  }

  async function sendNowBot() {
    try {
      if (!targetChannelId) {
        window.alert("Missing target channel ID. Set it in Owner → Discord Mentions.");
        return;
      }
      const content = String(resolvedPreview || "");
      if (!content.trim()) {
        window.alert("Missing message content.");
        return;
      }

      const entryBase = {
        tsUtc: nowUtc(),
        page: "/state/789/alerts",
        scope,
        allianceCode: scope === "alliance" ? effectiveAlliance : null,
        channelId: targetChannelId,
      };

      const { data, error } = await supabase.functions.invoke("discord-broadcast", {
        body: { mode: "bot", channelId: targetChannelId, content },
      } as any);

      if (error) {
        appendSendLog({ ...entryBase, ok: false, error: error.message });
        window.alert("Send failed: " + error.message);
        return;
      }
      if (data && data.ok === false) {
        appendSendLog({ ...entryBase, ok: false, error: String(data.error || "Unknown") });
        window.alert("Send failed: " + String(data.error || "Unknown"));
        return;
      }

      appendSendLog({ ...entryBase, ok: true });
      window.alert("✅ Sent to Discord (bot).");
    } catch (e: any) {
      window.alert("Send failed: " + String(e?.message || e));
    }
  }

  function createAlert() {
    const t = title.trim();
    if (!t) return window.alert("Title required.");
    const item: AlertItem = {
      id: uid(),
      createdUtc: nowUtc(),
      updatedUtc: nowUtc(),
      pinned: false,
      title: t,
      body: body || "",

      scope,
      allianceCode: scope === "alliance" ? effectiveAlliance : null,

      targetChannelName: targetChannelName || null,
      targetChannelId: targetChannelId || null,

      mentionRoles,
      mentionRoleIds,

      messageRaw: body || "",
      messageResolved: resolvedPreview || "",
    };
    setStore((p) => ({ ...p, items: [item, ...(p.items || [])] }));
    setTitle("");
  }

  function togglePin(id: string) {
    setStore((p) => ({
      ...p,
      items: (p.items || []).map((x) => (x.id === id ? { ...x, pinned: !x.pinned, updatedUtc: nowUtc() } : x)),
    }));
  }

  function del(id: string) {
    if (!window.confirm("Delete this alert?")) return;
    setStore((p) => ({ ...p, items: (p.items || []).filter((x) => x.id !== id) }));
  }

  async function exportJson() {
    const txt = JSON.stringify({ ...store, exportedUtc: nowUtc() }, null, 2);
    try {
      await navigator.clipboard.writeText(txt);
      window.alert("Copied alerts export JSON.");
    } catch {
      window.prompt("Copy:", txt);
    }
  }

  function importJson() {
    const raw = window.prompt("Paste alerts export JSON:");
    if (!raw) return;
    try {
      const p = JSON.parse(raw);
      if (!p || p.version !== 1 || !Array.isArray(p.items)) throw new Error("Invalid");
      setStore({ version: 1, items: p.items });
      window.alert("Imported.");
    } catch {
      window.alert("Invalid JSON.");
    }
  }

  const sorted = useMemo(() => {
    const items = store.items || [];
    return [...items].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return String(b.createdUtc).localeCompare(String(a.createdUtc));
    });
  }, [store.items]);

  return (
    <div style={{ padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>🚨 State 789 — Alerts (UI + Bot Send)</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={exportJson}>Export</button>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={importJson}>Import</button>
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

          <div style={{ marginLeft: "auto", opacity: 0.7, fontSize: 12 }}>
            Channels mapped: {channelKeys.length} • Roles mapped: {Object.keys(roleLut || {}).length}
          </div>
        </div>

        <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ opacity: 0.75, fontSize: 12 }}>Target Channel</div>
          <select className="zombie-input" value={targetChannelName} onChange={(e) => setTargetChannelName(e.target.value)} style={{ padding: "10px 12px", minWidth: 240 }}>
            <option value="">(select)</option>
            {channelKeys.map((k) => (
              <option key={k} value={k}>{k}{chanLut[k] ? "" : " (no id yet)"}</option>
            ))}
          </select>

          <div style={{ opacity: 0.75, fontSize: 12 }}>Mention Roles (comma)</div>
          <input className="zombie-input" value={mentionRoleNames} onChange={(e) => setMentionRoleNames(e.target.value)} placeholder="Leadership,R5" style={{ padding: "10px 12px", minWidth: 240 }} />

          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={copyPayloadJson}>Copy Payload JSON</button>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={sendNowBot} disabled={!targetChannelId}>Send Now (Bot)</button>
        </div>
      </div>

      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "minmax(320px, 1fr) minmax(320px, 1.1fr)", gap: 12 }}>
        <div className="zombie-card">
          <div style={{ fontWeight: 900 }}>Compose Alert</div>

          <div style={{ marginTop: 10 }}>
            <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Title</div>
            <input className="zombie-input" value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: "100%", padding: "10px 12px" }} />
          </div>

          <div style={{ marginTop: 10 }}>
            <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Body (tokens allowed)</div>
            <textarea className="zombie-input" value={body} onChange={(e) => setBody(e.target.value)} style={{ width: "100%", minHeight: 170, padding: "10px 12px" }} />
          </div>

          <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={createAlert}>Save Alert</button>
          </div>

          <div style={{ marginTop: 10, opacity: 0.7, fontSize: 12, lineHeight: "18px" }}>
            Tokens supported: {"{{Leadership}}"} {"{{role:Leadership}}"} @Leadership • {"{{channel:announcements}}"} {"{{#announcements}}"} #announcements
          </div>
        </div>

        <div className="zombie-card">
          <div style={{ fontWeight: 900 }}>Resolved Preview</div>
          <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 12, padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.20)" }}>
{resolvedPreview}
          </pre>
        </div>
      </div>

      <div className="zombie-card" style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 900 }}>Saved Alerts</div>

        <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
          {sorted.map((a) => (
            <div key={a.id} style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.20)" }}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ fontWeight: 900 }}>{a.pinned ? "📌 " : ""}{a.title}</div>
                <div style={{ opacity: 0.65, fontSize: 12, marginLeft: "auto" }}>{a.createdUtc}</div>
              </div>

              <div style={{ opacity: 0.75, fontSize: 12, marginTop: 6 }}>
                Target: {a.targetChannelName ? ("#" + a.targetChannelName) : "(none)"} • Mentions: {(a.mentionRoles || []).join(", ") || "(none)"}
              </div>

              <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className="zombie-btn" style={{ padding: "6px 8px", fontSize: 12 }} onClick={() => togglePin(a.id)}>{a.pinned ? "Unpin" : "Pin"}</button>
                <button className="zombie-btn" style={{ padding: "6px 8px", fontSize: 12 }} onClick={() => del(a.id)}>Delete</button>
              </div>
            </div>
          ))}
          {sorted.length === 0 ? <div style={{ opacity: 0.75 }}>No alerts saved yet.</div> : null}
        </div>
      </div>
    </div>
  );
}