import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type TimelineItem = {
  id: string;
  tsUtc: string;
  severity: "info" | "warning" | "critical";
  text: string;
};

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

const KEY_DRAFT = "sad_liveops_draft_v2";
const KEY_CHECKLIST = "sad_ops_checklist_v1";
const KEY_TIMELINE = "sad_ops_timeline_v1";
const KEY_ROLEMAP = "sad_discord_role_map_v1";
const KEY_CHANMAP = "sad_discord_channel_map_v1";
const KEY_THEME_GLOBAL = "sad_theme_global_v1";
const KEY_THEME_ALLIANCE_PREFIX = "sad_theme_alliance_v1_";

const DEFAULT_ROLE_KEYS = ["Leadership", "R5", "R4", "Member", "StateLeadership", "StateMod"] as const;

function uid() {
  return Math.random().toString(16).slice(2) + "-" + Date.now().toString(16);
}
function nowUtcIso() {
  return new Date().toISOString();
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
  } catch {}
}

function emptyRoleStore(): RoleMapStore {
  return { version: 1, global: {}, alliances: {} };
}
function loadRoleStore(): RoleMapStore {
  const s = loadJson<RoleMapStore>(KEY_ROLEMAP, emptyRoleStore());
  if (!s || (s as any).version !== 1) return emptyRoleStore();
  if (!s.global) s.global = {};
  if (!s.alliances) s.alliances = {};
  return s;
}
function emptyChanStore(): ChannelMapStore {
  return { version: 1, global: [], alliances: {} };
}
function loadChanStore(): ChannelMapStore {
  const s = loadJson<ChannelMapStore>(KEY_CHANMAP, emptyChanStore());
  if (!s || (s as any).version !== 1) return emptyChanStore();
  if (!Array.isArray(s.global)) s.global = [];
  if (!s.alliances) s.alliances = {};
  return s;
}

function normalizeRoleKey(k: string) {
  return (k || "").replace(/^@/, "").replace(/^\{\{/, "").replace(/\}\}$/, "").trim();
}
function normalizeChannelName(n: string) {
  return (n || "").trim().replace(/^#/, "").trim();
}
function channelMention(channelId: string) {
  const id = (channelId || "").trim();
  return id ? `<#${id}>` : "";
}

function resolveRoleToken(token: string, allianceCode: string | null): string {
  const store = loadRoleStore();
  const key = normalizeRoleKey(token);
  if (!key) return token;

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

function replaceChannelPlaceholders(input: string, allianceCode: string | null): string {
  let out = input || "";
  const store = loadChanStore();
  const list = allianceCode ? (store.alliances?.[allianceCode] || store.global || []) : (store.global || []);

  for (const ch of list) {
    const name = normalizeChannelName(ch.name || "");
    const id = (ch.channelId || "").trim();
    if (!name || !id) continue;

    const token1 = "#" + name;
    const token2 = "{{#" + name + "}}";
    const token3 = "{{channel:" + name + "}}";
    const rep = channelMention(id);

    if (out.includes(token1)) out = out.split(token1).join(rep);
    if (out.includes(token2)) out = out.split(token2).join(rep);
    if (out.includes(token3)) out = out.split(token3).join(rep);
  }
  return out;
}

function applyResolvers(input: string, allianceCode: string | null): string {
  const a = replaceChannelPlaceholders(input || "", allianceCode);
  return replaceRolePlaceholders(a, allianceCode);
}

async function copy(txt: string, okMsg: string) {
  try {
    await navigator.clipboard.writeText(txt);
    window.alert(okMsg);
  } catch {
    window.prompt("Copy:", txt);
  }
}

export function OwnerLiveOpsEnhancements() {
  const [timeline, setTimeline] = useState<TimelineItem[]>(() => loadJson<TimelineItem[]>(KEY_TIMELINE, []));
  const [sev, setSev] = useState<TimelineItem["severity"]>("info");
  const [note, setNote] = useState("");
  const [importAll, setImportAll] = useState("");

  const [presetAlliance, setPresetAlliance] = useState<string>(""); // optional alliance code
  const [presetKind, setPresetKind] = useState<"maintenance" | "rally" | "reset" | "recruit">("maintenance");
  const [includeWhen, setIncludeWhen] = useState(true);
  const [includeWhere, setIncludeWhere] = useState(true);
  const [whenUtc, setWhenUtc] = useState("");
  const [whereChannel, setWhereChannel] = useState("announcements"); // placeholder name (no '#')

  const [uidState, setUidState] = useState<string | null>(null);

  useEffect(() => {
    saveJson(KEY_TIMELINE, timeline);
  }, [timeline]);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then((r) => {
      if (cancelled) return;
      setUidState(r.data.user?.id ?? null);
    });
    return () => { cancelled = true; };
  }, []);

  function addNote() {
    const t = (note || "").trim();
    if (!t) return;
    const item: TimelineItem = { id: uid(), tsUtc: nowUtcIso(), severity: sev, text: t };
    setTimeline((p) => [item, ...(p || [])]);
    setNote("");
  }

  function del(id: string) {
    setTimeline((p) => (p || []).filter((x) => x.id !== id));
  }

  function clearTimeline() {
    if (!window.confirm("Clear all timeline items?")) return;
    setTimeline([]);
  }

  const presetText = useMemo(() => {
    const alliance = (presetAlliance || "").trim().toUpperCase() || null;

    const baseTitle =
      presetKind === "maintenance"
        ? "Maintenance Notice"
        : presetKind === "rally"
        ? "War Rally"
        : presetKind === "reset"
        ? "Reset Reminder"
        : "Recruitment";

    const mention =
      presetKind === "maintenance"
        ? "@Leadership"
        : presetKind === "rally"
        ? "@R5"
        : presetKind === "reset"
        ? "@R4"
        : "@Member";

    const lines: string[] = [];
    lines.push(mention);
    lines.push("**" + baseTitle + "**");
    lines.push("UTC: " + nowUtcIso());

    if (includeWhen && whenUtc.trim()) {
      lines.push("When: " + whenUtc.trim());
      lines.push("Discord: <t:" + Math.floor(new Date(whenUtc.trim()).getTime() / 1000) + ":F> (<t:" + Math.floor(new Date(whenUtc.trim()).getTime() / 1000) + ":R>)");
    }

    if (includeWhere && whereChannel.trim()) {
      const token = "#"+ whereChannel.trim().replace(/^#/, "");
      lines.push("Where: " + token);
    }

    lines.push("");
    lines.push(
      presetKind === "maintenance"
        ? "We will be performing maintenance. Please avoid critical actions during the window."
        : presetKind === "rally"
        ? "Rally up. Coordinate targets and timing. Post assignments and confirmations."
        : presetKind === "reset"
        ? "Reminder: daily reset is coming. Wrap tasks and prepare for next cycle."
        : "Recruiting: bring active players. Share your power, rally times, and expectations."
    );

    const raw = lines.join("\n");
    return applyResolvers(raw, alliance);
  }, [presetAlliance, presetKind, includeWhen, includeWhere, whenUtc, whereChannel]);

  async function exportEverything() {
    const payload: any = {
      tsUtc: nowUtcIso(),
      href: window.location.href,
      path: window.location.pathname,
      userId: uidState,
      storage: {},
    };

    const keys: string[] = [KEY_DRAFT, KEY_CHECKLIST, KEY_TIMELINE, KEY_ROLEMAP, KEY_CHANMAP, KEY_THEME_GLOBAL];

    // Include all per-alliance theme keys
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i) || "";
        if (k.startsWith(KEY_THEME_ALLIANCE_PREFIX)) keys.push(k);
      }
    } catch {}

    for (const k of keys) {
      try {
        const v = localStorage.getItem(k);
        if (v !== null) payload.storage[k] = v;
      } catch {}
    }

    await copy(JSON.stringify(payload, null, 2), "Copied Live Ops export bundle.");
  }

  function importEverything() {
    try {
      const obj = JSON.parse(importAll || "{}");
      const storage = obj?.storage;
      if (!storage || typeof storage !== "object") {
        window.alert("Import JSON must contain { storage: { key: value } }");
        return;
      }

      for (const k of Object.keys(storage)) {
        const v = storage[k];
        if (typeof v === "string") {
          try { localStorage.setItem(k, v); } catch {}
        }
      }

      // refresh local state from storage
      setTimeline(loadJson<TimelineItem[]>(KEY_TIMELINE, []));
      window.alert("Imported localStorage bundle. Reload page if needed.");
    } catch {
      window.alert("Invalid JSON.");
    }
  }

  return (
    <div style={{ marginTop: 14 }}>
      <hr className="zombie-divider" />

      <h4 style={{ marginTop: 0 }}>🧾 Live Ops Enhancements (UI-only)</h4>

      {/* Timeline */}
      <div className="zombie-card" style={{ padding: 14, borderRadius: 16, background: "rgba(0,0,0,0.28)", border: "1px solid rgba(120,255,120,0.12)" }}>
        <div style={{ fontWeight: 900, marginBottom: 8 }}>🧠 Ops Timeline (saved locally)</div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <select
            value={sev}
            onChange={(e) => setSev((e.target.value as any) || "info")}
            style={{
              height: 34, borderRadius: 10, padding: "0 10px",
              border: "1px solid rgba(120,255,120,0.18)",
              background: "rgba(0,0,0,0.25)",
              color: "rgba(235,255,235,0.95)", outline: "none", minWidth: 140,
            }}
          >
            <option value="info">🟩 info</option>
            <option value="warning">🟧 warning</option>
            <option value="critical">🟥 critical</option>
          </select>

          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a timeline note…"
            style={{
              flex: 1, minWidth: 260, height: 34, borderRadius: 10, padding: "0 10px",
              border: "1px solid rgba(120,255,120,0.18)",
              background: "rgba(0,0,0,0.25)",
              color: "rgba(235,255,235,0.95)", outline: "none",
            }}
            onKeyDown={(e) => { if (e.key === "Enter") addNote(); }}
          />

          <button className="zombie-btn" style={{ height: 34, padding: "0 12px" }} onClick={addNote}>➕ Add</button>
          <button className="zombie-btn" style={{ height: 34, padding: "0 12px" }} onClick={clearTimeline}>🧹 Clear</button>
        </div>

        <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
          {timeline.length === 0 ? (
            <div style={{ fontSize: 12, opacity: 0.7 }}>No timeline entries yet.</div>
          ) : (
            timeline.map((t) => (
              <div key={t.id} style={{ display: "flex", gap: 10, alignItems: "center", padding: 10, borderRadius: 12, background: "rgba(0,0,0,0.18)", border: "1px solid rgba(120,255,120,0.10)" }}>
                <div style={{ width: 120, fontSize: 12, opacity: 0.75 }}>{new Date(t.tsUtc).toLocaleString()}</div>
                <div style={{ width: 110, fontSize: 12 }}>
                  {t.severity === "critical" ? "🟥 CRIT" : t.severity === "warning" ? "🟧 WARN" : "🟩 INFO"}
                </div>
                <div style={{ flex: 1, whiteSpace: "pre-wrap" }}>{t.text}</div>
                <button className="zombie-btn" style={{ height: 30, padding: "0 10px" }} onClick={() => del(t.id)}>🗑</button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Preset Builder */}
      <div className="zombie-card" style={{ padding: 14, borderRadius: 16, marginTop: 12, background: "rgba(0,0,0,0.28)", border: "1px solid rgba(120,255,120,0.12)" }}>
        <div style={{ fontWeight: 900, marginBottom: 8 }}>⚙ Preset Announcement Builder (resolver applied)</div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <select
            value={presetKind}
            onChange={(e) => setPresetKind((e.target.value as any) || "maintenance")}
            style={{
              height: 34, borderRadius: 10, padding: "0 10px",
              border: "1px solid rgba(120,255,120,0.18)",
              background: "rgba(0,0,0,0.25)",
              color: "rgba(235,255,235,0.95)", outline: "none", minWidth: 200,
            }}
          >
            <option value="maintenance">Maintenance</option>
            <option value="rally">War Rally</option>
            <option value="reset">Reset Reminder</option>
            <option value="recruit">Recruitment</option>
          </select>

          <input
            value={presetAlliance}
            onChange={(e) => setPresetAlliance(e.target.value.toUpperCase())}
            placeholder="Alliance code (optional, e.g. WOC)"
            style={{
              height: 34, borderRadius: 10, padding: "0 10px",
              border: "1px solid rgba(120,255,120,0.18)",
              background: "rgba(0,0,0,0.25)",
              color: "rgba(235,255,235,0.95)", outline: "none", minWidth: 220,
            }}
          />

          <label style={{ display: "inline-flex", gap: 8, alignItems: "center", cursor: "pointer" }}>
            <input type="checkbox" checked={includeWhen} onChange={(e) => setIncludeWhen(!!e.target.checked)} />
            <span style={{ fontSize: 12, opacity: 0.85 }}>Include When</span>
          </label>

          <label style={{ display: "inline-flex", gap: 8, alignItems: "center", cursor: "pointer" }}>
            <input type="checkbox" checked={includeWhere} onChange={(e) => setIncludeWhere(!!e.target.checked)} />
            <span style={{ fontSize: 12, opacity: 0.85 }}>Include Where</span>
          </label>
        </div>

        {includeWhen ? (
          <div style={{ marginTop: 10 }}>
            <input
              value={whenUtc}
              onChange={(e) => setWhenUtc(e.target.value)}
              placeholder="When (UTC ISO) e.g. 2026-02-20T07:00:00.000Z"
              style={{
                width: "100%", height: 34, borderRadius: 10, padding: "0 10px",
                border: "1px solid rgba(120,255,120,0.18)",
                background: "rgba(0,0,0,0.25)",
                color: "rgba(235,255,235,0.95)", outline: "none",
              }}
            />
          </div>
        ) : null}

        {includeWhere ? (
          <div style={{ marginTop: 10 }}>
            <input
              value={whereChannel}
              onChange={(e) => setWhereChannel(e.target.value)}
              placeholder="Where channel placeholder name (e.g. announcements)"
              style={{
                width: "100%", height: 34, borderRadius: 10, padding: "0 10px",
                border: "1px solid rgba(120,255,120,0.18)",
                background: "rgba(0,0,0,0.25)",
                color: "rgba(235,255,235,0.95)", outline: "none",
              }}
            />
            <div style={{ marginTop: 6, fontSize: 12, opacity: 0.7 }}>
              Tokens supported: #announcements, {"{{#announcements}}"}, {"{{channel:announcements}}"} plus role tokens like @R5 and {"{{R5}}"}.
            </div>
          </div>
        ) : null}

        <textarea
          value={presetText}
          readOnly
          rows={8}
          style={{
            width: "100%", marginTop: 10, borderRadius: 10, padding: 10,
            border: "1px solid rgba(120,255,120,0.18)",
            background: "rgba(0,0,0,0.20)",
            color: "rgba(235,255,235,0.95)", outline: "none", resize: "vertical",
          }}
        />

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
          <button className="zombie-btn" style={{ height: 34, padding: "0 12px" }} onClick={() => copy(presetText, "Copied preset announcement.")}>
            📋 Copy Preset Output
          </button>
        </div>
      </div>

      {/* Export/Import Everything */}
      <div className="zombie-card" style={{ padding: 14, borderRadius: 16, marginTop: 12, background: "rgba(0,0,0,0.28)", border: "1px solid rgba(120,255,120,0.12)" }}>
        <div style={{ fontWeight: 900, marginBottom: 8 }}>📦 Export / Import Everything (localStorage)</div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="zombie-btn" style={{ height: 34, padding: "0 12px" }} onClick={exportEverything}>
            📤 Export Bundle
          </button>
        </div>

        <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Import bundle JSON</div>
        <textarea
          value={importAll}
          onChange={(e) => setImportAll(e.target.value)}
          rows={6}
          placeholder='Paste export JSON here (expects { "storage": { "key": "value", ... } })'
          style={{
            width: "100%", borderRadius: 10, padding: 10,
            border: "1px solid rgba(120,255,120,0.18)",
            background: "rgba(0,0,0,0.20)",
            color: "rgba(235,255,235,0.95)", outline: "none", resize: "vertical",
          }}
        />

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
          <button className="zombie-btn" style={{ height: 34, padding: "0 12px" }} onClick={importEverything}>
            ⬇️ Import Bundle
          </button>
          <button className="zombie-btn" style={{ height: 34, padding: "0 12px" }} onClick={() => setImportAll("")}>
            🧽 Clear
          </button>
        </div>

        <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>
          Includes: draft, checklist, timeline, role map, channel map, global + per-alliance themes.
        </div>
      </div>

      <div style={{ marginTop: 12, fontSize: 12, opacity: 0.7 }}>
        Enhancements are UI-only; safe for production and do not touch RLS or DB.
      </div>
    </div>
  );
}