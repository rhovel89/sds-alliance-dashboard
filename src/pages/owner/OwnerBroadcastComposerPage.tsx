import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import SupportBundleButton from "../../components/system/SupportBundleButton";

type RoleMapStore = {
  version: 1;
  global: Record<string, string>;
  alliances: Record<string, Record<string, string>>;
};

type ChannelEntry = {
  id: string;
  name: string;
  channelId: string;
  createdUtc: string;
};

type ChannelMapStore = {
  version: 1;
  global: ChannelEntry[];
  alliances: Record<string, ChannelEntry[]>;
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

type TemplateStore = {
  version: 1;
  templates: Template[];
};

const ROLE_MAP_KEY = "sad_discord_role_map_v1";
const CHANNEL_MAP_KEY = "sad_discord_channel_map_v1";
const DIR_KEY = "sad_alliance_directory_v1";
const TPL_KEY = "sad_discord_broadcast_templates_v1";

function nowUtc() {
  return new Date().toISOString();
}

function uid() {
  return Math.random().toString(16).slice(2) + "-" + Date.now().toString(16);
}

function safeJson<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
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

function loadTemplates(): TemplateStore {
  const s = safeJson<TemplateStore>(localStorage.getItem(TPL_KEY));
  if (s && s.version === 1 && Array.isArray(s.templates)) return s;
  return { version: 1, templates: [] };
}

function saveTemplates(s: TemplateStore) {
  try {
    localStorage.setItem(TPL_KEY, JSON.stringify(s));
  } catch {}
}

function normalizeKey(k: string): string {
  return (k || "").trim().toLowerCase();
}

function makeRoleLookup(roleStore: RoleMapStore, allianceCode: string | null) {
  const global = roleStore.global || {};
  const per = allianceCode ? (roleStore.alliances?.[allianceCode] || {}) : {};
  const out: Record<string, string> = {};
  for (const key of Object.keys(global)) out[normalizeKey(key)] = String(global[key]);
  for (const key of Object.keys(per)) out[normalizeKey(key)] = String(per[key]);
  return out;
}

function makeChannelLookup(channelStore: ChannelMapStore, allianceCode: string | null) {
  const out: Record<string, string> = {};
  const addList = (lst: ChannelEntry[] | undefined) => {
    for (const c of lst || []) {
      const nm = normalizeKey(String(c.name || ""));
      const id = String(c.channelId || "").trim();
      if (nm && id) out[nm] = id;
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
    const key = normalizeKey(String(k));
    const id = roleLut[key];
    return id ? `<@&${id}>` : `{{role:${String(k)}}}`;
  });
  text = text.replace(/\{\{\s*([A-Za-z0-9_\- ]{1,64})\s*\}\}/g, (_m, k) => {
    const key = normalizeKey(String(k));
    const id = roleLut[key];
    return id ? `<@&${id}>` : `{{${String(k)}}}`;
  });

  // @Leadership
  text = text.replace(/(^|[\s(])@([A-Za-z0-9_\-]{2,64})(?=$|[\s),.!?])/g, (_m, pre, k) => {
    const key = normalizeKey(String(k));
    const id = roleLut[key];
    return id ? `${pre}<@&${id}>` : `${pre}@${String(k)}`;
  });

  // {{#announcements}} and {{channel:announcements}}
  text = text.replace(/\{\{\s*#([A-Za-z0-9_\-]{2,64})\s*\}\}/g, (_m, k) => {
    const key = normalizeKey(String(k));
    const id = chanLut[key];
    return id ? `<#${id}>` : `{{#${String(k)}}}`;
  });
  text = text.replace(/\{\{\s*channel\s*:\s*([A-Za-z0-9_\-]{2,64})\s*\}\}/g, (_m, k) => {
    const key = normalizeKey(String(k));
    const id = chanLut[key];
    return id ? `<#${id}>` : `{{channel:${String(k)}}}`;
  });

  // #announcements (only when it matches a known channel name)
  text = text.replace(/(^|[\s(])#([A-Za-z0-9_\-]{2,64})(?=$|[\s),.!?])/g, (_m, pre, k) => {
    const key = normalizeKey(String(k));
    const id = chanLut[key];
    return id ? `${pre}<#${id}>` : `${pre}#${String(k)}`;
  });

  return text;
}

export default function OwnerBroadcastComposerPage() {
  const nav = useNavigate();

  const [dir] = useState<DirItem[]>(() => loadDir());

  const [roleStore, setRoleStore] = useState<RoleMapStore>(() => loadRoleStore());
  const [chanStore, setChanStore] = useState<ChannelMapStore>(() => loadChannelStore());

  const [tplStore, setTplStore] = useState<TemplateStore>(() => loadTemplates());
  const [selectedTplId, setSelectedTplId] = useState<string | null>(null);

  const [scope, setScope] = useState<"global" | "alliance">("alliance");
  const [allianceCode, setAllianceCode] = useState<string>("WOC");

  const [tplName, setTplName] = useState<string>("");
  const [draft, setDraft] = useState<string>("");

  const selectedTpl = useMemo(() => {
    if (!selectedTplId) return null;
    return tplStore.templates.find((t) => t.id === selectedTplId) || null;
  }, [tplStore.templates, selectedTplId]);

  const effectiveAlliance = useMemo(() => {
    return scope === "alliance" ? String(allianceCode || "").toUpperCase() : null;
  }, [scope, allianceCode]);

  const roleLut = useMemo(() => makeRoleLookup(roleStore, effectiveAlliance), [roleStore, effectiveAlliance]);
  const chanLut = useMemo(() => makeChannelLookup(chanStore, effectiveAlliance), [chanStore, effectiveAlliance]);

  const resolved = useMemo(() => resolveMentions(draft, roleLut, chanLut), [draft, roleLut, chanLut]);

  useEffect(() => {
    saveTemplates(tplStore);
  }, [tplStore]);

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
    setAllianceCode((t.allianceCode || "WOC").toUpperCase());
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

  async function copyResolved() {
    try {
      await navigator.clipboard.writeText(resolved);
      window.alert("Copied Discord-ready message.");
    } catch {
      window.prompt("Copy message:", resolved);
    }
  }

  async function copyRaw() {
    try {
      await navigator.clipboard.writeText(draft);
      window.alert("Copied raw draft.");
    } catch {
      window.prompt("Copy raw draft:", draft);
    }
  }

  function templatesFiltered(): Template[] {
    const arr = tplStore.templates || [];
    if (scope === "global") return arr.filter((t) => t.scope === "global");
    const ac = String(allianceCode || "").toUpperCase();
    return arr.filter((t) => t.scope === "alliance" && String(t.allianceCode || "").toUpperCase() === ac);
  }

  const visibleTemplates = useMemo(() => templatesFiltered(), [tplStore.templates, scope, allianceCode]);

  return (
    <div style={{ padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>📣 Owner — Broadcast Composer (UI-only)</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => nav("/owner/discord")}>
            Discord Settings
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
            Roles mapped: {Object.keys(roleLut || {}).length} | Channels mapped: {Object.keys(chanLut || {}).length}
          </div>
        </div>

        <div style={{ marginTop: 10, opacity: 0.75, fontSize: 12, lineHeight: "18px" }}>
          Tokens supported:
          <br />
          Roles: <b>@Leadership</b> <b>@R5</b> <b>@R4</b> <b>@Member</b> <b>@StateLeadership</b> <b>@StateMod</b> and <b>{"{{Leadership}}"}</b> / <b>{"{{role:Leadership}}"}</b>
          <br />
          Channels: <b>#announcements</b>, <b>{"{{#announcements}}"}</b>, <b>{"{{channel:announcements}}"}</b>
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
            <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={saveTemplate}>
              Save Template
            </button>
            <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={copyRaw}>
              Copy Raw
            </button>
            <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={copyResolved}>
              Copy Discord-ready
            </button>
          </div>

          <div style={{ marginTop: 12 }}>
            <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Resolved Preview (Discord-ready)</div>
            <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 12, padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.20)" }}>
{resolved}
            </pre>
          </div>

          <div style={{ marginTop: 10, opacity: 0.65, fontSize: 12 }}>
            This is UI-only. Later we will connect to the Discord bot for direct posting.
          </div>
        </div>
      </div>
    </div>
  );
}
