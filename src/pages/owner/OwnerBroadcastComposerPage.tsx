import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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

type Template = {
  id: string;
  scope: "global" | "alliance";
  allianceCode: string | null;
  name: string;
  body: string;
  updatedUtc: string;
};

type TemplateStore = { version: 1; templates: Template[] };

const ROLE_MAP_KEY = "sad_discord_role_map_v1";
const CHANNEL_MAP_KEY = "sad_discord_channel_map_v1";
const DIR_KEY = "sad_alliance_directory_v1";
const TPL_KEY = "sad_discord_broadcast_templates_v1";
const PREFILL_KEY = "sad_broadcast_prefill_v1";

function nowUtc() { return new Date().toISOString(); }
function uid() { return Math.random().toString(16).slice(2) + "-" + Date.now().toString(16); }
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

function loadTemplates(): TemplateStore {
  const s = safeJson<TemplateStore>(localStorage.getItem(TPL_KEY));
  if (s && s.version === 1 && Array.isArray(s.templates)) return s;
  return { version: 1, templates: [] };
}

function saveTemplates(s: TemplateStore) {
  try { localStorage.setItem(TPL_KEY, JSON.stringify(s)); } catch {}
}

function makeRoleLookup(roleStore: RoleMapStore, allianceCode: string | null) {
  const global = roleStore.global || {};
  const per = allianceCode ? (roleStore.alliances?.[allianceCode] || {}) : {};
  const out: Record<string, string> = {};
  for (const key of Object.keys(global)) out[norm(key)] = String(global[key] || "");
  for (const key of Object.keys(per)) out[norm(key)] = String(per[key] || "");
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

export default function OwnerBroadcastComposerPage() {
  const nav = useNavigate();

  const dir = useMemo(() => loadDir(), []);
  const [roleStore, setRoleStore] = useState<RoleMapStore>(() => loadRoleStore());
  const [chanStore, setChanStore] = useState<ChannelMapStore>(() => loadChannelStore());

  const [tplStore, setTplStore] = useState<TemplateStore>(() => loadTemplates());
  const [selectedTplId, setSelectedTplId] = useState<string | null>(null);

  const [scope, setScope] = useState<"global" | "alliance">("alliance");
  const [allianceCode, setAllianceCode] = useState<string>((dir[0]?.code || "WOC").toUpperCase());

  const [tplName, setTplName] = useState<string>("");
  const [draft, setDraft] = useState<string>("");

  // targeting controls
  const [targetChannelName, setTargetChannelName] = useState<string>("");
  const [mentionRoleNames, setMentionRoleNames] = useState<string>(""); // comma list of role keys

  // send state
  const [sending, setSending] = useState(false);
  const [sendMsg, setSendMsg] = useState<string | null>(null);

  const effectiveAlliance = useMemo(() => (scope === "alliance" ? String(allianceCode || "").toUpperCase() : null), [scope, allianceCode]);
  const roleLut = useMemo(() => makeRoleLookup(roleStore, effectiveAlliance), [roleStore, effectiveAlliance]);
  const chanLut = useMemo(() => makeChannelLookup(chanStore, effectiveAlliance), [chanStore, effectiveAlliance]);

  const roleKeys = useMemo(() => Object.keys(roleLut || {}).sort(), [roleLut]);
  const channelKeys = useMemo(() => Object.keys(chanLut || {}).sort(), [chanLut]);

  const selectedTpl = useMemo(() => {
    if (!selectedTplId) return null;
    return tplStore.templates.find((t) => t.id === selectedTplId) || null;
  }, [tplStore.templates, selectedTplId]);

  const visibleTemplates = useMemo(() => {
    const arr = tplStore.templates || [];
    if (scope === "global") return arr.filter((t) => t.scope === "global");
    const ac = String(allianceCode || "").toUpperCase();
    return arr.filter((t) => t.scope === "alliance" && String(t.allianceCode || "").toUpperCase() === ac);
  }, [tplStore.templates, scope, allianceCode]);

  const resolved = useMemo(() => resolveMentions(draft, roleLut, chanLut), [draft, roleLut, chanLut]);

  useEffect(() => { saveTemplates(tplStore); }, [tplStore]);

  // One-time prefill from Live Ops
  useEffect(() => {
    try {
      const raw = localStorage.getItem(PREFILL_KEY);
      if (!raw) return;
      const p = JSON.parse(raw);
      if (!p || p.version !== 1) return;

      const sc = (p.scope === "global" ? "global" : "alliance");
      const ac = String(p.allianceCode || "WOC").toUpperCase();
      const nm = String(p.templateName || "Live Ops");
      const body = String(p.body || "");

      setScope(sc as any);
      setAllianceCode(ac);
      setTplName(nm);
      setDraft(body);

      localStorage.removeItem(PREFILL_KEY);
    } catch {
      try { localStorage.removeItem(PREFILL_KEY); } catch {}
    }
  }, []);

  function refreshStores() {
    setRoleStore(loadRoleStore());
    setChanStore(loadChannelStore());
  }

  function newTemplate() {
    setSelectedTplId(null);
    setTplName("");
    setDraft("");
  }

  function loadTemplate(t: Template) {
    setSelectedTplId(t.id);
    setTplName(t.name);
    setDraft(t.body || "");
    setScope(t.scope);
    setAllianceCode((t.allianceCode || (dir[0]?.code || "WOC")).toUpperCase());
  }

  function saveTemplate() {
    const name = tplName.trim();
    if (!name) return window.alert("Template name is required.");

    const t: Template = {
      id: selectedTplId || uid(),
      scope,
      allianceCode: scope === "alliance" ? String(allianceCode || "WOC").toUpperCase() : null,
      name,
      body: draft || "",
      updatedUtc: nowUtc(),
    };

    const next: TemplateStore = { ...tplStore, templates: [...(tplStore.templates || [])] };
    const idx = next.templates.findIndex((x) => x.id === t.id);
    if (idx >= 0) next.templates[idx] = t;
    else next.templates.unshift(t);

    setTplStore(next);
    setSelectedTplId(t.id);
  }

  function deleteTemplate(id: string) {
    if (!window.confirm("Delete this template?")) return;
    const next: TemplateStore = { ...tplStore, templates: (tplStore.templates || []).filter((t) => t.id !== id) };
    setTplStore(next);
    if (selectedTplId === id) newTemplate();
  }

  function buildPayload() {
    const chKey = norm(targetChannelName);
    const targetChannelId = chKey ? (chanLut[chKey] || "") : "";

    const roles = mentionRoleNames.split(",").map((x) => x.trim()).filter(Boolean);
    const roleIds = roles.map((r) => roleLut[norm(r)] || "").filter(Boolean);

    return {
      version: 1,
      createdUtc: nowUtc(),
      scope,
      allianceCode: scope === "alliance" ? String(allianceCode || "").toUpperCase() : null,
      templateName: tplName || (selectedTpl?.name || ""),
      targetChannel: { name: targetChannelName || null, id: targetChannelId || null },
      targetChannelId: targetChannelId || null,
      mentionRoles: roles,
      mentionRoleIds: roleIds,
      messageRaw: draft,
      messageResolved: resolved,
    };
  }

  function insertTargets() {
    const ch = targetChannelName.trim();
    const roles = mentionRoleNames.split(",").map((x) => x.trim()).filter(Boolean);

    const parts: string[] = [];
    if (ch) parts.push(`{{channel:${ch}}}`);
    for (const r of roles) parts.push(`{{${r}}}`);

    if (!parts.length) return window.alert("Select a channel and/or roles first.");

    const prefix = parts.join(" ") + "\n\n";
    setDraft((p) => (p.startsWith(prefix) ? p : prefix + p));
  }

  async function copyResolvedPayload() {
    const payload = buildPayload();
    const txt = JSON.stringify(payload, null, 2);
    try { await navigator.clipboard.writeText(txt); window.alert("Copied Discord payload JSON."); }
    catch { window.prompt("Copy payload JSON:", txt); }
  }

  async function copyResolved() {
    try { await navigator.clipboard.writeText(resolved); window.alert("Copied Discord-ready message."); }
    catch { window.prompt("Copy message:", resolved); }
  }

  async function sendToDiscord() {
    setSendMsg(null);
    const payload = buildPayload();

    // Bot-token mode REQUIRES a real channelId
    if (!payload.targetChannelId || String(payload.targetChannelId).trim() === "") {
      setSendMsg("❌ Missing target channel ID. Add channel ID in /owner/discord-mentions, then select it here.");
      return;
    }

    setSending(true);
    try {
      const r = await supabase.functions.invoke("discord-broadcast", { body: payload as any });
      if ((r as any).error) {
        const e = (r as any).error;
        throw new Error(e?.message || JSON.stringify(e));
      }
      setSendMsg("✅ Sent to Discord. Response: " + JSON.stringify((r as any).data));
    } catch (e: any) {
      setSendMsg("❌ Send failed: " + String(e?.message || e));
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={{ padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>📣 Owner — Broadcast Composer</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => nav("/owner/discord-mentions")}>
            🔧 Mentions
          </button>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={refreshStores}>
            Reload Role/Channel Maps
          </button>
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

        <div style={{ marginTop: 10, opacity: 0.75, fontSize: 12, lineHeight: "18px" }}>
          Tokens supported:
          <br />
          Roles: <b>@Leadership</b> <b>@R5</b> <b>@R4</b> <b>@Member</b> and <b>{"{{Leadership}}"}</b> / <b>{"{{role:Leadership}}"}</b>
          <br />
          Channels: <b>#announcements</b>, <b>{"{{#announcements}}"}</b>, <b>{"{{channel:announcements}}"}</b>
        </div>
      </div>

      <div className="zombie-card" style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 900 }}>Target Channel + Mentions</div>

        <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ opacity: 0.75, fontSize: 12 }}>Post Target Channel</div>
          <select className="zombie-input" value={targetChannelName} onChange={(e) => setTargetChannelName(e.target.value)} style={{ padding: "10px 12px", minWidth: 240 }}>
            <option value="">(none)</option>
            {channelKeys.map((k) => <option key={k} value={k}>{k}{chanLut[k] ? "" : " (no id yet)"}</option>)}
          </select>

          <div style={{ opacity: 0.75, fontSize: 12 }}>Mention Roles (comma names)</div>
          <input
            className="zombie-input"
            value={mentionRoleNames}
            onChange={(e) => setMentionRoleNames(e.target.value)}
            placeholder="Leadership,R5"
            style={{ padding: "10px 12px", minWidth: 240 }}
          />

          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={insertTargets}>Insert into Draft</button>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={copyResolvedPayload}>Copy Payload JSON</button>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={sendToDiscord} disabled={sending}>
            {sending ? "Sending…" : "🚀 Send to Discord"}
          </button>
        </div>

        {sendMsg ? (
          <div style={{ marginTop: 10, whiteSpace: "pre-wrap", fontSize: 12, color: sendMsg.startsWith("✅") ? "inherit" : "#ffb3b3" }}>
            {sendMsg}
          </div>
        ) : null}

        <div style={{ marginTop: 10, opacity: 0.7, fontSize: 12 }}>
          Bot-token mode requires a real channelId. Add it in <b>/owner/discord-mentions</b>.
        </div>
      </div>

      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "minmax(280px, 1fr) minmax(360px, 1.2fr)", gap: 12 }}>
        <div className="zombie-card">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ fontWeight: 900 }}>Templates</div>
            <button className="zombie-btn" style={{ padding: "8px 10px", fontSize: 12 }} onClick={newTemplate}>+ New</button>
          </div>

          <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
            {visibleTemplates.map((t) => {
              const sel = t.id === selectedTplId;
              return (
                <div
                  key={t.id}
                  onClick={() => loadTemplate(t)}
                  style={{
                    cursor: "pointer",
                    padding: 10,
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.10)",
                    background: sel ? "rgba(120,255,120,0.10)" : "rgba(0,0,0,0.20)",
                  }}
                >
                  <div style={{ fontWeight: 900 }}>{t.name}</div>
                  <div style={{ opacity: 0.65, fontSize: 12, marginTop: 4 }}>
                    {t.scope === "global" ? "Global" : ("Alliance: " + (t.allianceCode || ""))} • {t.updatedUtc}
                  </div>
                  <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button className="zombie-btn" style={{ padding: "6px 8px", fontSize: 12 }} onClick={(ev) => { ev.stopPropagation(); deleteTemplate(t.id); }}>
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
            {visibleTemplates.length === 0 ? <div style={{ opacity: 0.75 }}>No templates for this scope.</div> : null}
          </div>
        </div>

        <div className="zombie-card">
          <div style={{ fontWeight: 900 }}>{selectedTpl ? "Edit Template + Compose" : "Compose (New Template)"}</div>

          <div style={{ marginTop: 10 }}>
            <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Template Name</div>
            <input className="zombie-input" value={tplName} onChange={(e) => setTplName(e.target.value)} style={{ width: "100%", padding: "10px 12px" }} placeholder="e.g. WK Reminder" />
          </div>

          <div style={{ marginTop: 10 }}>
            <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Draft (with tokens)</div>
            <textarea className="zombie-input" value={draft} onChange={(e) => setDraft(e.target.value)} style={{ width: "100%", minHeight: 180, padding: "10px 12px" }} />
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
            <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={saveTemplate}>Save Template</button>
            <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={copyResolved}>Copy Discord-ready</button>
          </div>

          <div style={{ marginTop: 12 }}>
            <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Resolved Preview (Discord-ready)</div>
            <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 12, padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.20)" }}>
{resolved}
            </pre>
          </div>

          <div style={{ marginTop: 10, opacity: 0.65, fontSize: 12 }}>
            “Send to Discord” calls Supabase Edge Function: <b>discord-broadcast</b>.
          </div>
        </div>
      </div>
    </div>
  );
}