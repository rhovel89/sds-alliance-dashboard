import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { OwnerLiveOpsEnhancements } from "./OwnerLiveOpsEnhancements";

type Severity = "info" | "warning" | "critical";

type ChecklistItem = {
  id: string;
  text: string;
  done: boolean;
  createdUtc: string;
};

type RoleMapStore = {
  version: 1;
  global: Record<string, string>;
  alliances: Record<string, Record<string, string>>;
};

type ChannelEntry = {
  id: string;
  name: string;       // placeholder name, typically "announcements" (we will match "#announcements")
  channelId: string;  // discord channel id digits
  createdUtc: string;
};

type ChannelMapStore = {
  version: 1;
  global: ChannelEntry[];
  alliances: Record<string, ChannelEntry[]>;
};

const ROLE_MAP_KEY = "sad_discord_role_map_v1";
const CHANNEL_MAP_KEY = "sad_discord_channel_map_v1";

const DEFAULT_ROLE_KEYS = ["Leadership", "R5", "R4", "Member", "StateLeadership", "StateMod"] as const;

function uid() {
  return Math.random().toString(16).slice(2) + "-" + Date.now().toString(16);
}

function nowUtcIso() {
  return new Date().toISOString();
}

function getAllianceFromPath(pathname: string): string | null {
  const m = (pathname || "").match(/^\/dashboard\/([^\/]+)/);
  if (!m) return null;
  const code = (m[1] || "").toString().trim();
  return code ? code.toUpperCase() : null;
}

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveJson(key: string, value: any) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

function parseUtcToDate(utcIso: string): Date | null {
  const s = (utcIso || "").trim();
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function toDiscordTs(d: Date): { unix: number; full: string; relative: string } {
  const unix = Math.floor(d.getTime() / 1000);
  return { unix, full: `<t:${unix}:F>`, relative: `<t:${unix}:R>` };
}

function formatCountdown(ms: number): string {
  const neg = ms < 0;
  const a = Math.abs(ms);
  const totalSec = Math.floor(a / 1000);
  const sec = totalSec % 60;
  const totalMin = Math.floor(totalSec / 60);
  const min = totalMin % 60;
  const hr = Math.floor(totalMin / 60);
  const pad = (n: number) => (n < 10 ? "0" + n : "" + n);
  const s = `${hr}:${pad(min)}:${pad(sec)}`;
  return neg ? `-${s}` : s;
}

function severityBadge(sev: Severity) {
  if (sev === "critical") return "🟥 CRITICAL";
  if (sev === "warning") return "🟧 WARNING";
  return "🟩 INFO";
}

// ----------------------
// Role mention resolver
// ----------------------
function emptyRoleStore(): RoleMapStore {
  return { version: 1, global: {}, alliances: {} };
}

function loadRoleStore(): RoleMapStore {
  const s = loadJson<RoleMapStore>(ROLE_MAP_KEY, emptyRoleStore());
  if (!s || (s as any).version !== 1) return emptyRoleStore();
  if (!s.global) s.global = {};
  if (!s.alliances) s.alliances = {};
  return s;
}

function saveRoleStore(s: RoleMapStore) {
  saveJson(ROLE_MAP_KEY, s);
}

function normalizeRoleKey(k: string) {
  return (k || "").replace(/^@/, "").replace(/^\{\{/, "").replace(/\}\}$/, "").trim();
}

function resolveRoleToken(token: string, allianceCode: string | null): string {
  const store = loadRoleStore();
  const key = normalizeRoleKey(token);
  if (!key) return token;

  // per-alliance wins
  if (allianceCode) {
    const m = store.alliances?.[allianceCode];
    const v = m?.[key];
    if (v && v.trim()) return v.trim();
  }

  const gv = store.global?.[key];
  if (gv && gv.trim()) return gv.trim();

  return token;
}

function replaceRolePlaceholders(input: string, allianceCode: string | null): string {
  let out = input || "";
  for (const k of DEFAULT_ROLE_KEYS) {
    const a = "@" + k;
    const b = "{{" + k + "}}";
    const ra = resolveRoleToken(a, allianceCode);
    const rb = resolveRoleToken(b, allianceCode);
    if (out.includes(a)) out = out.split(a).join(ra);
    if (out.includes(b)) out = out.split(b).join(rb);
  }
  return out;
}

// ----------------------
// Channel mention resolver
// ----------------------
function emptyChannelStore(): ChannelMapStore {
  return { version: 1, global: [], alliances: {} };
}

function loadChannelStore(): ChannelMapStore {
  const s = loadJson<ChannelMapStore>(CHANNEL_MAP_KEY, emptyChannelStore());
  if (!s || (s as any).version !== 1) return emptyChannelStore();
  if (!Array.isArray(s.global)) s.global = [];
  if (!s.alliances) s.alliances = {};
  return s;
}

function saveChannelStore(s: ChannelMapStore) {
  saveJson(CHANNEL_MAP_KEY, s);
}

function normalizeChannelName(name: string) {
  // store placeholder name without leading '#'
  return (name || "").trim().replace(/^#/, "").trim();
}

function channelMention(channelId: string): string {
  const id = (channelId || "").trim();
  if (!id) return "";
  return `<#${id}>`;
}

function getChannelsForScope(store: ChannelMapStore, allianceCode: string | null): ChannelEntry[] {
  if (allianceCode) {
    const a = store.alliances?.[allianceCode];
    if (Array.isArray(a) && a.length) return a;
  }
  return store.global || [];
}

function replaceChannelPlaceholders(input: string, allianceCode: string | null): string {
  let out = input || "";
  const store = loadChannelStore();
  const list = getChannelsForScope(store, allianceCode);

  for (const ch of list) {
    const name = normalizeChannelName(ch.name);
    const id = (ch.channelId || "").trim();
    if (!name || !id) continue;

    const token1 = "#" + name;                 // #announcements
    const token2 = "{{#" + name + "}}";        // {{#announcements}}
    const token3 = "{{channel:" + name + "}}"; // {{channel:announcements}}
    const rep = channelMention(id);

    if (out.includes(token1)) out = out.split(token1).join(rep);
    if (out.includes(token2)) out = out.split(token2).join(rep);
    if (out.includes(token3)) out = out.split(token3).join(rep);
  }

  return out;
}

function applyResolvers(input: string, allianceCode: string | null): string {
  // channel first, then roles
  const a = replaceChannelPlaceholders(input || "", allianceCode);
  return replaceRolePlaceholders(a, allianceCode);
}

export function OwnerLiveOpsPanel() {
  const nav = useNavigate();
  const loc = useLocation();

  const currentAlliance = useMemo(() => getAllianceFromPath(loc.pathname), [loc.pathname]);

  // ---------- Live Ops Draft ----------
  const [targetMode, setTargetMode] = useState<"ALL" | "CURRENT" | "CUSTOM">("ALL");
  const [customTarget, setCustomTarget] = useState<string>("");

  const [severity, setSeverity] = useState<Severity>("info");
  const [title, setTitle] = useState<string>("Maintenance Notice");
  const [body, setBody] = useState<string>("");

  const [incidentMode, setIncidentMode] = useState<boolean>(false);

  // ---------- Discord Generator ----------
  const [mentionPreset, setMentionPreset] = useState<
    "none" | "@here" | "@everyone" | "@Leadership" | "@R5" | "@R4" | "custom"
  >("none");
  const [customMention, setCustomMention] = useState<string>("@role");

  // ---------- Ops Timer ----------
  const [timerUtc, setTimerUtc] = useState<string>("");
  const [tick, setTick] = useState<number>(Date.now());

  // ---------- Checklist ----------
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [newItem, setNewItem] = useState<string>("");
  const [importJson, setImportJson] = useState<string>("");

  // ---------- Role Resolver UI ----------
  const [roleScope, setRoleScope] = useState<"GLOBAL" | "ALLIANCE">("ALLIANCE");
  const [roleAlliance, setRoleAlliance] = useState<string>("");
  const [roleDraft, setRoleDraft] = useState<Record<string, string>>({});
  const [roleImport, setRoleImport] = useState<string>("");
  const [roleTest, setRoleTest] = useState<string>("@Leadership please coordinate with @R5 and @R4. {{Member}} notify.");

  // ---------- Channel Resolver UI ----------
  const [chanScope, setChanScope] = useState<"GLOBAL" | "ALLIANCE">("ALLIANCE");
  const [chanAlliance, setChanAlliance] = useState<string>("");
  const [chanDraft, setChanDraft] = useState<ChannelEntry[]>([]);
  const [chanNewName, setChanNewName] = useState<string>("announcements");
  const [chanNewId, setChanNewId] = useState<string>("");
  const [chanImport, setChanImport] = useState<string>("");
  const [chanTest, setChanTest] = useState<string>("Post updates in #announcements and coordinate in {{channel:r5-chat}}.");

  const activeAllianceForOps = useMemo(() => {
    if (targetMode === "CURRENT") return currentAlliance || null;
    if (targetMode === "CUSTOM") {
      const c = (customTarget || "").trim().toUpperCase();
      return c || null;
    }
    return null; // ALL => resolver uses GLOBAL unless you also choose ALLIANCE scope and set alliance manually
  }, [targetMode, currentAlliance, customTarget]);

  const target = useMemo(() => {
    if (targetMode === "ALL") return "ALL";
    if (targetMode === "CURRENT") return currentAlliance || "ALL";
    const c = (customTarget || "").trim().toUpperCase();
    return c || "ALL";
  }, [targetMode, customTarget, currentAlliance]);

  const header = useMemo(() => {
    const sev = severityBadge(severity);
    const tgt = target === "ALL" ? "[ALL]" : "[" + target + "]";
    const inc = incidentMode ? " 🚨 INCIDENT MODE" : "";
    return `${sev} ${tgt} ${title}${inc}`.trim();
  }, [severity, target, title, incidentMode]);

  const mentionRaw = useMemo(() => {
    if (mentionPreset === "none") return "";
    if (mentionPreset === "custom") return (customMention || "").trim();
    return mentionPreset;
  }, [mentionPreset, customMention]);

  const timerDate = useMemo(() => parseUtcToDate(timerUtc), [timerUtc]);
  const timerInfo = useMemo(() => {
    if (!timerDate) return null;
    const ms = timerDate.getTime() - tick;
    const discord = toDiscordTs(timerDate);
    return { utc: timerDate.toISOString(), local: timerDate.toLocaleString(), countdown: formatCountdown(ms), ms, discord };
  }, [timerDate, tick]);

  const resolvedMention = useMemo(() => applyResolvers(mentionRaw || "", activeAllianceForOps), [mentionRaw, activeAllianceForOps]);
  const resolvedHeader = useMemo(() => applyResolvers(header, activeAllianceForOps), [header, activeAllianceForOps]);
  const resolvedBody = useMemo(() => applyResolvers(body || "", activeAllianceForOps), [body, activeAllianceForOps]);

  const discordAnnouncement = useMemo(() => {
    const lines: string[] = [];
    if (resolvedMention) lines.push(resolvedMention);
    lines.push(`**${resolvedHeader}**`);
    lines.push(`UTC: ${nowUtcIso()}`);

    if (timerInfo) {
      lines.push(`When: ${timerInfo.discord.full} (${timerInfo.discord.relative})`);
      lines.push(`Local: ${timerInfo.local}`);
    }

    lines.push("");
    lines.push(resolvedBody || "(empty)");
    return lines.join("\n");
  }, [resolvedMention, resolvedHeader, resolvedBody, timerInfo]);

  async function copy(txt: string, okMsg: string) {
    await navigator.clipboard?.writeText(txt);
    window.alert(okMsg);
  }

  // Load saved state
  useEffect(() => {
    const draft = loadJson("sad_liveops_draft_v2", {
      targetMode: "ALL",
      customTarget: "",
      severity: "info",
      title: "Maintenance Notice",
      body: "",
      incidentMode: false,
      mentionPreset: "none",
      customMention: "@role",
      timerUtc: "",
    });

    setTargetMode(draft.targetMode || "ALL");
    setCustomTarget(draft.customTarget || "");
    setSeverity(draft.severity || "info");
    setTitle(draft.title || "Maintenance Notice");
    setBody(draft.body || "");
    setIncidentMode(!!draft.incidentMode);

    setMentionPreset(draft.mentionPreset || "none");
    setCustomMention(draft.customMention || "@role");

    setTimerUtc(draft.timerUtc || "");

    const savedChecklist = loadJson<ChecklistItem[]>("sad_ops_checklist_v1", []);
    setChecklist(Array.isArray(savedChecklist) ? savedChecklist : []);

    // defaults for scopes
    const def = (currentAlliance || "").toUpperCase();
    setRoleAlliance(def);
    setChanAlliance(def);
  }, [currentAlliance]);

  // Persist draft state
  useEffect(() => {
    saveJson("sad_liveops_draft_v2", { targetMode, customTarget, severity, title, body, incidentMode, mentionPreset, customMention, timerUtc });
  }, [targetMode, customTarget, severity, title, body, incidentMode, mentionPreset, customMention, timerUtc]);

  // Persist checklist
  useEffect(() => {
    saveJson("sad_ops_checklist_v1", checklist);
  }, [checklist]);

  // Timer ticking
  useEffect(() => {
    const iv = window.setInterval(() => setTick(Date.now()), 1000);
    return () => window.clearInterval(iv);
  }, []);

  function setTimerFromMinutes(minutes: number) {
    const d = new Date(Date.now() + minutes * 60 * 1000);
    setTimerUtc(d.toISOString());
  }

  // Checklist actions
  function addChecklistItem() {
    const t = (newItem || "").trim();
    if (!t) return;
    const item: ChecklistItem = { id: uid(), text: t, done: false, createdUtc: nowUtcIso() };
    setChecklist((prev) => [item, ...prev]);
    setNewItem("");
  }
  function toggleChecklist(id: string) {
    setChecklist((prev) => prev.map((x) => (x.id === id ? { ...x, done: !x.done } : x)));
  }
  function removeChecklist(id: string) {
    setChecklist((prev) => prev.filter((x) => x.id !== id));
  }
  function clearCompleted() {
    setChecklist((prev) => prev.filter((x) => !x.done));
  }
  async function exportChecklist() {
    const payload = { tsUtc: nowUtcIso(), checklist };
    await copy(JSON.stringify(payload, null, 2), "Copied checklist export JSON to clipboard.");
  }
  function importChecklistFromText() {
    try {
      const obj = JSON.parse(importJson || "{}");
      const items = (obj as any).checklist ?? (obj as any).items ?? obj;
      if (!Array.isArray(items)) {
        window.alert("Import JSON must contain an array under 'checklist' (or be an array).");
        return;
      }
      const cleaned: ChecklistItem[] = items
        .map((x: any) => {
          const text = (x?.text ?? x?.name ?? "").toString().trim();
          if (!text) return null;
          return { id: (x?.id ?? uid()).toString(), text, done: !!x?.done, createdUtc: (x?.createdUtc ?? nowUtcIso()).toString() };
        })
        .filter(Boolean) as any;

      setChecklist(cleaned);
      window.alert("Imported checklist.");
    } catch {
      window.alert("Invalid JSON for checklist import.");
    }
  }

  // ----------------------
  // Role mapping helpers
  // ----------------------
  const roleScopeKey = useMemo(() => (roleScope === "GLOBAL" ? "GLOBAL" : (roleAlliance || "").trim().toUpperCase()), [roleScope, roleAlliance]);

  useEffect(() => {
    const store = loadRoleStore();
    const draft: Record<string, string> = {};
    for (const k of DEFAULT_ROLE_KEYS) {
      if (roleScopeKey === "GLOBAL") draft[k] = store.global?.[k] || "";
      else draft[k] = store.alliances?.[roleScopeKey]?.[k] || "";
    }
    setRoleDraft(draft);
  }, [roleScopeKey]);

  function saveRoleDraft() {
    const store = loadRoleStore();
    const clean: Record<string, string> = {};
    for (const k of DEFAULT_ROLE_KEYS) {
      const v = (roleDraft[k] || "").trim();
      if (v) clean[k] = v;
    }

    if (roleScopeKey === "GLOBAL") {
      store.global = clean;
    } else {
      if (!store.alliances) store.alliances = {};
      store.alliances[roleScopeKey] = clean;
    }

    saveRoleStore(store);
    window.alert("Saved role mention mapping.");
  }

  async function exportRoleMap() {
    const store = loadRoleStore();
    await copy(JSON.stringify({ tsUtc: nowUtcIso(), roleMap: store }, null, 2), "Copied role mention mapping JSON to clipboard.");
  }

  function importRoleMap() {
    try {
      const obj = JSON.parse(roleImport || "{}");
      const rm = (obj as any).roleMap ?? obj;
      const s: RoleMapStore = {
        version: 1,
        global: (rm?.global && typeof rm.global === "object") ? rm.global : {},
        alliances: (rm?.alliances && typeof rm.alliances === "object") ? rm.alliances : {},
      };
      saveRoleStore(s);
      window.alert("Imported role mention mapping.");
      // refresh draft
      const next = loadRoleStore();
      const draft: Record<string, string> = {};
      for (const k of DEFAULT_ROLE_KEYS) {
        if (roleScopeKey === "GLOBAL") draft[k] = next.global?.[k] || "";
        else draft[k] = next.alliances?.[roleScopeKey]?.[k] || "";
      }
      setRoleDraft(draft);
    } catch {
      window.alert("Invalid JSON for role mapping import.");
    }
  }

  const roleTestOutput = useMemo(() => applyResolvers(roleTest || "", activeAllianceForOps), [roleTest, activeAllianceForOps]);

  // ----------------------
  // Channel mapping helpers
  // ----------------------
  const chanScopeKey = useMemo(() => (chanScope === "GLOBAL" ? "GLOBAL" : (chanAlliance || "").trim().toUpperCase()), [chanScope, chanAlliance]);

  useEffect(() => {
    const store = loadChannelStore();
    const list = (chanScopeKey === "GLOBAL") ? (store.global || []) : (store.alliances?.[chanScopeKey] || []);
    setChanDraft(Array.isArray(list) ? list : []);
  }, [chanScopeKey]);

  function saveChanDraft() {
    const store = loadChannelStore();
    const cleaned = (chanDraft || [])
      .map((x) => ({
        id: (x?.id || uid()).toString(),
        name: normalizeChannelName((x?.name || "").toString()),
        channelId: ((x?.channelId || "").toString().trim()),
        createdUtc: (x?.createdUtc || nowUtcIso()).toString(),
      }))
      .filter((x) => x.name && x.channelId);

    if (chanScopeKey === "GLOBAL") {
      store.global = cleaned;
    } else {
      if (!store.alliances) store.alliances = {};
      store.alliances[chanScopeKey] = cleaned;
    }

    saveChannelStore(store);
    setChanDraft(cleaned);
    window.alert("Saved channel mapping.");
  }

  function addChannel() {
    const name = normalizeChannelName(chanNewName);
    const channelId = (chanNewId || "").trim();
    if (!name) return window.alert("Channel placeholder name required (e.g. announcements).");
    if (!channelId) return window.alert("Channel ID required (digits).");

    const item: ChannelEntry = { id: uid(), name, channelId, createdUtc: nowUtcIso() };
    setChanDraft((p) => [item, ...(p || [])]);
    setChanNewId("");
  }

  function updateChannel(id: string, patch: Partial<ChannelEntry>) {
    setChanDraft((p) => (p || []).map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }

  function deleteChannel(id: string) {
    setChanDraft((p) => (p || []).filter((x) => x.id !== id));
  }

  async function exportChanMap() {
    const store = loadChannelStore();
    await copy(JSON.stringify({ tsUtc: nowUtcIso(), channelMap: store }, null, 2), "Copied channel mapping JSON to clipboard.");
  }

  function importChanMap() {
    try {
      const obj = JSON.parse(chanImport || "{}");
      const cm = (obj as any).channelMap ?? obj;

      const normalizeList = (arr: any): ChannelEntry[] => {
        if (!Array.isArray(arr)) return [];
        return arr
          .map((x) => ({
            id: (x?.id || uid()).toString(),
            name: normalizeChannelName((x?.name || "").toString()),
            channelId: ((x?.channelId || x?.id || "").toString().trim()),
            createdUtc: (x?.createdUtc || nowUtcIso()).toString(),
          }))
          .filter((x) => x.name && x.channelId);
      };

      const s: ChannelMapStore = {
        version: 1,
        global: normalizeList(cm?.global),
        alliances: {},
      };

      const a = cm?.alliances;
      if (a && typeof a === "object") {
        for (const k of Object.keys(a)) {
          s.alliances[k.toUpperCase()] = normalizeList(a[k]);
        }
      }

      saveChannelStore(s);
      window.alert("Imported channel mapping.");
      // refresh draft
      const next = loadChannelStore();
      const list = (chanScopeKey === "GLOBAL") ? (next.global || []) : (next.alliances?.[chanScopeKey] || []);
      setChanDraft(Array.isArray(list) ? list : []);
    } catch {
      window.alert("Invalid JSON for channel mapping import.");
    }
  }

  const chanTestOutput = useMemo(() => applyResolvers(chanTest || "", activeAllianceForOps), [chanTest, activeAllianceForOps]);

  return (
    <div className="zombie-card" style={{ padding: 16, marginTop: 12 }}>
      <h3 style={{ marginTop: 0 }}>🧠 Live Ops Command Panel (UI-only)</h3>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button className="zombie-btn" onClick={() => nav("/status")}>🧪 Open /status</button>
        <button className="zombie-btn" onClick={() => nav("/me")}>🧟 Open /me</button>
        <button className="zombie-btn" onClick={() => window.location.reload()}>🔄 Reload</button>
      </div>

      <hr className="zombie-divider" />

      {/* Target + Severity */}
      <div style={{ display: "grid", gap: 10 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ fontSize: 12, opacity: 0.85 }}>Target:</div>

          <select
            value={targetMode}
            onChange={(e) => setTargetMode((e.target.value as any) || "ALL")}
            style={{
              height: 34, borderRadius: 10, padding: "0 10px",
              border: "1px solid rgba(120,255,120,0.18)",
              background: "rgba(0,0,0,0.25)",
              color: "rgba(235,255,235,0.95)", outline: "none", minWidth: 170,
            }}
          >
            <option value="ALL">ALL (state-wide)</option>
            <option value="CURRENT">CURRENT ({currentAlliance || "none"})</option>
            <option value="CUSTOM">CUSTOM</option>
          </select>

          {targetMode === "CUSTOM" ? (
            <input
              value={customTarget}
              onChange={(e) => setCustomTarget((e.target.value || "").toUpperCase())}
              placeholder="Alliance code (e.g. WOC)"
              style={{
                height: 34, borderRadius: 10, padding: "0 10px",
                border: "1px solid rgba(120,255,120,0.18)",
                background: "rgba(0,0,0,0.25)",
                color: "rgba(235,255,235,0.95)", outline: "none", minWidth: 220,
              }}
            />
          ) : null}

          <label style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <input type="checkbox" checked={incidentMode} onChange={(e) => setIncidentMode(!!e.target.checked)} />
            <span style={{ fontSize: 12, opacity: 0.9 }}>🚨 Incident Mode</span>
          </label>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ fontSize: 12, opacity: 0.85 }}>Severity:</div>
          <select
            value={severity}
            onChange={(e) => setSeverity((e.target.value as any) || "info")}
            style={{
              height: 34, borderRadius: 10, padding: "0 10px",
              border: "1px solid rgba(120,255,120,0.18)",
              background: "rgba(0,0,0,0.25)",
              color: "rgba(235,255,235,0.95)", outline: "none", minWidth: 170,
            }}
          >
            <option value="info">🟩 info</option>
            <option value="warning">🟧 warning</option>
            <option value="critical">🟥 critical</option>
          </select>

          <div style={{ fontSize: 12, opacity: 0.85 }}>Title:</div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{
              flex: 1, minWidth: 220, height: 34, borderRadius: 10, padding: "0 10px",
              border: "1px solid rgba(120,255,120,0.18)",
              background: "rgba(0,0,0,0.25)",
              color: "rgba(235,255,235,0.95)", outline: "none",
            }}
          />
        </div>

        <div>
          <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 6 }}>Body</div>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={7}
            style={{
              width: "100%", borderRadius: 10, padding: 10,
              border: "1px solid rgba(120,255,120,0.18)",
              background: "rgba(0,0,0,0.25)",
              color: "rgba(235,255,235,0.95)", outline: "none", resize: "vertical",
            }}
            placeholder="Type your ops message here…"
          />
          <div style={{ marginTop: 6, fontSize: 12, opacity: 0.7 }}>
            Tokens supported:
            Roles: @Leadership @R5 @R4 @Member @StateLeadership @StateMod (and {"{{Leadership}}"} style)
            • Channels: #announcements, {"{{#announcements}}"}, {"{{channel:announcements}}"}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="zombie-btn" onClick={() => copy(`${header}\nUTC: ${nowUtcIso()}\n\n${body}`.trim(), "Copied Live Ops message (text).")}>
            📋 Copy Text
          </button>
          <button className="zombie-btn" onClick={() => copy(JSON.stringify({ tsUtc: nowUtcIso(), target, severity, title, incidentMode, body }, null, 2), "Copied Live Ops payload (JSON).")}>
            🧾 Copy JSON
          </button>
          <button className="zombie-btn" onClick={() => setBody("")}>🧽 Clear Body</button>
        </div>

        <div style={{ opacity: 0.9 }}>
          <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Preview</div>
          <div style={{ padding: 10, borderRadius: 10, background: "rgba(0,0,0,0.18)", border: "1px solid rgba(120,255,120,0.12)" }}>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>{header}</div>
            <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 8 }}>UTC: {nowUtcIso()}</div>
            <div style={{ whiteSpace: "pre-wrap" }}>{body || "(empty)"}</div>
          </div>
        </div>
      </div>

      <hr className="zombie-divider" />

      {/* DISCORD ANNOUNCEMENT GENERATOR */}
      <h4 style={{ marginTop: 0 }}>💬 Discord-ready announcement</h4>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ fontSize: 12, opacity: 0.85 }}>Mention:</div>
        <select
          value={mentionPreset}
          onChange={(e) => setMentionPreset((e.target.value as any) || "none")}
          style={{
            height: 34, borderRadius: 10, padding: "0 10px",
            border: "1px solid rgba(120,255,120,0.18)",
            background: "rgba(0,0,0,0.25)",
            color: "rgba(235,255,235,0.95)", outline: "none", minWidth: 220,
          }}
        >
          <option value="none">(none)</option>
          <option value="@here">@here</option>
          <option value="@everyone">@everyone</option>
          <option value="@Leadership">@Leadership (resolver)</option>
          <option value="@R5">@R5 (resolver)</option>
          <option value="@R4">@R4 (resolver)</option>
          <option value="custom">custom…</option>
        </select>

        {mentionPreset === "custom" ? (
          <input
            value={customMention}
            onChange={(e) => setCustomMention(e.target.value)}
            placeholder="@role or <@&ROLE_ID>"
            style={{
              flex: 1, minWidth: 220, height: 34, borderRadius: 10, padding: "0 10px",
              border: "1px solid rgba(120,255,120,0.18)",
              background: "rgba(0,0,0,0.25)",
              color: "rgba(235,255,235,0.95)", outline: "none",
            }}
          />
        ) : null}
      </div>

      <div style={{ marginTop: 10 }}>
        <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>
          Output (resolvers applied + Discord timestamp if timer set)
        </div>
        <textarea
          value={discordAnnouncement}
          readOnly
          rows={8}
          style={{
            width: "100%", borderRadius: 10, padding: 10,
            border: "1px solid rgba(120,255,120,0.18)",
            background: "rgba(0,0,0,0.20)",
            color: "rgba(235,255,235,0.95)", outline: "none", resize: "vertical",
          }}
        />
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
          <button className="zombie-btn" onClick={() => copy(discordAnnouncement, "Copied Discord-ready announcement.")}>
            📋 Copy Discord Announcement
          </button>
          <button className="zombie-btn" onClick={() => copy(JSON.stringify({ tsUtc: nowUtcIso(), target, mentionRaw, resolvedMention, resolvedHeader, resolvedBody, timerUtc }, null, 2), "Copied generator JSON.")}>
            🧾 Copy Generator JSON
          </button>
        </div>
      </div>

      <hr className="zombie-divider" />

      {/* OPS TIMER */}
      <h4 style={{ marginTop: 0 }}>⏱ Ops Timer (UTC + countdown)</h4>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <input
          value={timerUtc}
          onChange={(e) => setTimerUtc(e.target.value)}
          placeholder="UTC ISO (e.g. 2026-02-20T05:30:00.000Z)"
          style={{
            flex: 1, minWidth: 320, height: 36, borderRadius: 10, padding: "0 10px",
            border: "1px solid rgba(120,255,120,0.18)",
            background: "rgba(0,0,0,0.25)",
            color: "rgba(235,255,235,0.95)", outline: "none",
          }}
        />

        <button className="zombie-btn" onClick={() => setTimerUtc(new Date().toISOString())}>Now (UTC)</button>
        <button className="zombie-btn" onClick={() => setTimerFromMinutes(15)}>+15m</button>
        <button className="zombie-btn" onClick={() => setTimerFromMinutes(30)}>+30m</button>
        <button className="zombie-btn" onClick={() => setTimerFromMinutes(60)}>+1h</button>
        <button className="zombie-btn" onClick={() => setTimerFromMinutes(120)}>+2h</button>
        <button className="zombie-btn" onClick={() => setTimerUtc("")}>Clear</button>
      </div>

      {timerInfo ? (
        <div style={{ marginTop: 10, padding: 10, borderRadius: 10, background: "rgba(0,0,0,0.18)", border: "1px solid rgba(120,255,120,0.12)" }}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <div><b>UTC:</b> {timerInfo.utc}</div>
            <div><b>Local:</b> {timerInfo.local}</div>
            <div><b>Countdown:</b> {timerInfo.countdown}</div>
          </div>
          <div style={{ marginTop: 8, fontFamily: "monospace", fontSize: 12, opacity: 0.9 }}>
            Discord: {timerInfo.discord.full}  {timerInfo.discord.relative}
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
            <button className="zombie-btn" onClick={() => copy(`${timerInfo.discord.full} ${timerInfo.discord.relative}`, "Copied Discord timestamps.")}>
              📋 Copy Discord Timestamp
            </button>
            <button className="zombie-btn" onClick={() => copy(timerInfo.utc, "Copied UTC ISO.")}>📋 Copy UTC</button>
          </div>
        </div>
      ) : (
        <div style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>
          Enter a UTC ISO time to get a live countdown and Discord timestamps.
        </div>
      )}

      <hr className="zombie-divider" />

      {/* CHANNEL RESOLVER CRUD */}
      <h4 style={{ marginTop: 0 }}>📣 Discord Channel Mention Resolver (UI-only)</h4>

      <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 8 }}>
        Create channel placeholders like <b>#announcements</b> and map them to <b>{"<#CHANNEL_ID>"}</b>. Per-alliance overrides GLOBAL.
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ fontSize: 12, opacity: 0.85 }}>Scope:</div>
        <select
          value={chanScope}
          onChange={(e) => setChanScope((e.target.value as any) || "ALLIANCE")}
          style={{
            height: 34, borderRadius: 10, padding: "0 10px",
            border: "1px solid rgba(120,255,120,0.18)",
            background: "rgba(0,0,0,0.25)",
            color: "rgba(235,255,235,0.95)", outline: "none", minWidth: 170,
          }}
        >
          <option value="ALLIANCE">Alliance</option>
          <option value="GLOBAL">Global</option>
        </select>

        {chanScope === "ALLIANCE" ? (
          <input
            value={chanAlliance}
            onChange={(e) => setChanAlliance((e.target.value || "").toUpperCase())}
            placeholder="Alliance code (e.g. WOC)"
            style={{
              height: 34, borderRadius: 10, padding: "0 10px",
              border: "1px solid rgba(120,255,120,0.18)",
              background: "rgba(0,0,0,0.25)",
              color: "rgba(235,255,235,0.95)", outline: "none", minWidth: 220,
            }}
          />
        ) : null}

        <div style={{ marginLeft: "auto", fontSize: 12, opacity: 0.75 }}>
          Active ops alliance: {activeAllianceForOps || "GLOBAL"}
        </div>
      </div>

      <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <input
          value={chanNewName}
          onChange={(e) => setChanNewName(e.target.value)}
          placeholder="Channel placeholder name (e.g. announcements)"
          style={{
            flex: 1, minWidth: 220, height: 34, borderRadius: 10, padding: "0 10px",
            border: "1px solid rgba(120,255,120,0.18)",
            background: "rgba(0,0,0,0.25)",
            color: "rgba(235,255,235,0.95)", outline: "none",
          }}
        />
        <input
          value={chanNewId}
          onChange={(e) => setChanNewId(e.target.value)}
          placeholder="Channel ID (digits)"
          style={{
            flex: 1, minWidth: 220, height: 34, borderRadius: 10, padding: "0 10px",
            border: "1px solid rgba(120,255,120,0.18)",
            background: "rgba(0,0,0,0.25)",
            color: "rgba(235,255,235,0.95)", outline: "none",
          }}
        />
        <button className="zombie-btn" onClick={addChannel}>➕ Add</button>
        <button className="zombie-btn" onClick={saveChanDraft}>💾 Save</button>
        <button className="zombie-btn" onClick={exportChanMap}>📦 Export</button>
      </div>

      <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
        {chanDraft.length === 0 ? (
          <div style={{ fontSize: 12, opacity: 0.7 }}>No channels in this scope yet.</div>
        ) : (
          chanDraft.map((ch) => {
            const ph = "#" + normalizeChannelName(ch.name || "");
            const rep = channelMention(ch.channelId || "");
            return (
              <div key={ch.id} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", padding: 10, borderRadius: 10, background: "rgba(0,0,0,0.14)", border: "1px solid rgba(120,255,120,0.10)" }}>
                <div style={{ width: 180, fontSize: 12, opacity: 0.85 }}>{ph}</div>

                <input
                  value={ch.name || ""}
                  onChange={(e) => updateChannel(ch.id, { name: e.target.value })}
                  placeholder="name"
                  style={{
                    flex: 1, minWidth: 200, height: 34, borderRadius: 10, padding: "0 10px",
                    border: "1px solid rgba(120,255,120,0.18)",
                    background: "rgba(0,0,0,0.25)",
                    color: "rgba(235,255,235,0.95)", outline: "none",
                  }}
                />

                <input
                  value={ch.channelId || ""}
                  onChange={(e) => updateChannel(ch.id, { channelId: e.target.value })}
                  placeholder="channelId"
                  style={{
                    flex: 1, minWidth: 220, height: 34, borderRadius: 10, padding: "0 10px",
                    border: "1px solid rgba(120,255,120,0.18)",
                    background: "rgba(0,0,0,0.25)",
                    color: "rgba(235,255,235,0.95)", outline: "none",
                  }}
                />

                <div style={{ fontFamily: "monospace", fontSize: 12, opacity: 0.85 }}>{rep || "(missing id)"}</div>

                <button className="zombie-btn" style={{ height: 34, padding: "0 10px" }} onClick={() => deleteChannel(ch.id)}>🗑</button>
              </div>
            );
          })
        )}
      </div>

      <div style={{ marginTop: 10 }}>
        <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Import channel mapping JSON</div>
        <textarea
          value={chanImport}
          onChange={(e) => setChanImport(e.target.value)}
          rows={4}
          placeholder='Paste export JSON (expects {"channelMap": {...}} or just {...})'
          style={{
            width: "100%", borderRadius: 10, padding: 10,
            border: "1px solid rgba(120,255,120,0.18)",
            background: "rgba(0,0,0,0.20)",
            color: "rgba(235,255,235,0.95)", outline: "none", resize: "vertical",
          }}
        />
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
          <button className="zombie-btn" onClick={importChanMap}>⬇️ Import</button>
          <button className="zombie-btn" onClick={() => setChanImport("")}>🧽 Clear Import</button>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Test channel resolver</div>
        <input
          value={chanTest}
          onChange={(e) => setChanTest(e.target.value)}
          style={{
            width: "100%", height: 36, borderRadius: 10, padding: "0 10px",
            border: "1px solid rgba(120,255,120,0.18)",
            background: "rgba(0,0,0,0.20)",
            color: "rgba(235,255,235,0.95)", outline: "none",
          }}
        />
        <textarea
          value={chanTestOutput}
          readOnly
          rows={3}
          style={{
            width: "100%", marginTop: 8, borderRadius: 10, padding: 10,
            border: "1px solid rgba(120,255,120,0.18)",
            background: "rgba(0,0,0,0.20)",
            color: "rgba(235,255,235,0.95)", outline: "none", resize: "vertical",
          }}
        />
        <button className="zombie-btn" style={{ marginTop: 8 }} onClick={() => copy(chanTestOutput, "Copied channel resolver test output.")}>
          📋 Copy Test Output
        </button>
      </div>

      <hr className="zombie-divider" />

      {/* ROLE RESOLVER */}
      <h4 style={{ marginTop: 0 }}>🔧 Discord Role Mention Resolver (UI-only)</h4>

      <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 8 }}>
        Map placeholders like @R5 to real mentions like {"<@&ROLE_ID>"}. Per-alliance overrides GLOBAL.
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ fontSize: 12, opacity: 0.85 }}>Scope:</div>
        <select
          value={roleScope}
          onChange={(e) => setRoleScope((e.target.value as any) || "ALLIANCE")}
          style={{
            height: 34, borderRadius: 10, padding: "0 10px",
            border: "1px solid rgba(120,255,120,0.18)",
            background: "rgba(0,0,0,0.25)",
            color: "rgba(235,255,235,0.95)", outline: "none", minWidth: 170,
          }}
        >
          <option value="ALLIANCE">Alliance</option>
          <option value="GLOBAL">Global</option>
        </select>

        {roleScope === "ALLIANCE" ? (
          <input
            value={roleAlliance}
            onChange={(e) => setRoleAlliance((e.target.value || "").toUpperCase())}
            placeholder="Alliance code (e.g. WOC)"
            style={{
              height: 34, borderRadius: 10, padding: "0 10px",
              border: "1px solid rgba(120,255,120,0.18)",
              background: "rgba(0,0,0,0.25)",
              color: "rgba(235,255,235,0.95)", outline: "none", minWidth: 220,
            }}
          />
        ) : null}
      </div>

      <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
        {DEFAULT_ROLE_KEYS.map((k) => (
          <div key={k} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ width: 160, fontSize: 12, opacity: 0.9 }}>{`@${k}`}</div>
            <input
              value={roleDraft[k] || ""}
              onChange={(e) => setRoleDraft((p) => ({ ...p, [k]: e.target.value }))}
              placeholder={`<@&ROLE_ID> (or leave blank)`}
              style={{
                flex: 1, minWidth: 260, height: 34, borderRadius: 10, padding: "0 10px",
                border: "1px solid rgba(120,255,120,0.18)",
                background: "rgba(0,0,0,0.25)",
                color: "rgba(235,255,235,0.95)", outline: "none",
              }}
            />
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
        <button className="zombie-btn" onClick={saveRoleDraft}>💾 Save Mapping</button>
        <button className="zombie-btn" onClick={exportRoleMap}>📦 Export Mapping</button>
      </div>

      <div style={{ marginTop: 10 }}>
        <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Import role mapping JSON</div>
        <textarea
          value={roleImport}
          onChange={(e) => setRoleImport(e.target.value)}
          rows={4}
          placeholder='Paste JSON export (expects {"roleMap": {...}} or just {...})'
          style={{
            width: "100%", borderRadius: 10, padding: 10,
            border: "1px solid rgba(120,255,120,0.18)",
            background: "rgba(0,0,0,0.20)",
            color: "rgba(235,255,235,0.95)", outline: "none", resize: "vertical",
          }}
        />
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
          <button className="zombie-btn" onClick={importRoleMap}>⬇️ Import Mapping</button>
          <button className="zombie-btn" onClick={() => setRoleImport("")}>🧽 Clear Import</button>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Test resolver</div>
        <input
          value={roleTest}
          onChange={(e) => setRoleTest(e.target.value)}
          style={{
            width: "100%", height: 36, borderRadius: 10, padding: "0 10px",
            border: "1px solid rgba(120,255,120,0.18)",
            background: "rgba(0,0,0,0.20)",
            color: "rgba(235,255,235,0.95)", outline: "none",
          }}
        />
        <textarea
          value={roleTestOutput}
          readOnly
          rows={3}
          style={{
            width: "100%", marginTop: 8, borderRadius: 10, padding: 10,
            border: "1px solid rgba(120,255,120,0.18)",
            background: "rgba(0,0,0,0.20)",
            color: "rgba(235,255,235,0.95)", outline: "none", resize: "vertical",
          }}
        />
        <button className="zombie-btn" style={{ marginTop: 8 }} onClick={() => copy(roleTestOutput, "Copied resolver test output.")}>
          📋 Copy Test Output
        </button>
      </div>

      <hr className="zombie-divider" />

      {/* OPS CHECKLIST */}
      <h4 style={{ marginTop: 0 }}>✅ Ops Checklist (saved locally)</h4>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder="Add checklist item…"
          style={{
            flex: 1, minWidth: 260, height: 36, borderRadius: 10, padding: "0 10px",
            border: "1px solid rgba(120,255,120,0.18)",
            background: "rgba(0,0,0,0.25)",
            color: "rgba(235,255,235,0.95)", outline: "none",
          }}
          onKeyDown={(e) => { if (e.key === "Enter") addChecklistItem(); }}
        />
        <button className="zombie-btn" onClick={addChecklistItem}>➕ Add</button>
        <button className="zombie-btn" onClick={clearCompleted}>🧹 Clear Completed</button>
        <button className="zombie-btn" onClick={exportChecklist}>📦 Export</button>
      </div>

      <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
        {checklist.length === 0 ? (
          <div style={{ fontSize: 12, opacity: 0.7 }}>No items yet.</div>
        ) : (
          checklist.map((it) => (
            <div key={it.id} style={{ display: "flex", gap: 10, alignItems: "center", padding: 8, borderRadius: 10, background: "rgba(0,0,0,0.14)", border: "1px solid rgba(120,255,120,0.10)" }}>
              <input type="checkbox" checked={it.done} onChange={() => toggleChecklist(it.id)} />
              <div style={{ flex: 1, whiteSpace: "pre-wrap", opacity: it.done ? 0.6 : 0.95, textDecoration: it.done ? "line-through" : "none" }}>
                {it.text}
              </div>
              <button className="zombie-btn" style={{ height: 30, padding: "0 10px" }} onClick={() => removeChecklist(it.id)}>🗑</button>
            </div>
          ))
        )}
      </div>

      <div style={{ marginTop: 12 }}>
        <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Import checklist JSON</div>
        <textarea
          value={importJson}
          onChange={(e) => setImportJson(e.target.value)}
          rows={4}
          placeholder='Paste export JSON here (expects { "checklist": [ ... ] })'
          style={{
            width: "100%", borderRadius: 10, padding: 10,
            border: "1px solid rgba(120,255,120,0.18)",
            background: "rgba(0,0,0,0.20)",
            color: "rgba(235,255,235,0.95)", outline: "none", resize: "vertical",
          }}
        />
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
          <button className="zombie-btn" onClick={importChecklistFromText}>⬇️ Import</button>
          <button className="zombie-btn" onClick={() => setImportJson("")}>🧽 Clear Import</button>
        </div>
      </div>

      <div style={{ marginTop: 12, fontSize: 12, opacity: 0.7 }}>
        <OwnerLiveOpsEnhancements />

      UI-only. Nothing is sent to DB/Discord yet.
      </div>
    </div>
  );
}