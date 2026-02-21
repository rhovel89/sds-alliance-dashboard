import React, { useEffect, useMemo, useState } from "react";
import SupportBundleButton from "../../components/system/SupportBundleButton";

type DirItem = { id: string; code: string; name: string; state: string };

type RoleMapStore = {
  version: 1;
  global: Record<string, string>;
  alliances: Record<string, Record<string, string>>;
};

type ChannelEntry = { id: string; name: string; channelId: string; createdUtc: string };
type ChannelMapStore = { version: 1; global: ChannelEntry[]; alliances: Record<string, ChannelEntry[]> };

type Defaults = {
  channelName: string;
  rolesCsv: string; // comma list
};

type DefaultsStore = {
  version: 1;
  global: Defaults;
  alliances: Record<string, Defaults>;
  updatedUtc: string;
};

const DIR_KEY = "sad_alliance_directory_v1";
const ROLE_MAP_KEY = "sad_discord_role_map_v1";
const CHANNEL_MAP_KEY = "sad_discord_channel_map_v1";
const DEFAULTS_KEY = "sad_discord_defaults_v1";

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

function loadDefaults(): DefaultsStore {
  const s = safeJson<DefaultsStore>(localStorage.getItem(DEFAULTS_KEY));
  if (s && s.version === 1 && s.global) return s;
  return {
    version: 1,
    global: { channelName: "", rolesCsv: "" },
    alliances: {},
    updatedUtc: nowUtc(),
  };
}

function saveDefaults(s: DefaultsStore) {
  try { localStorage.setItem(DEFAULTS_KEY, JSON.stringify(s)); } catch {}
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

export default function OwnerDiscordDefaultsPage() {
  const dir = useMemo(() => loadDir(), []);
  const [scope, setScope] = useState<"global" | "alliance">("alliance");
  const [allianceCode, setAllianceCode] = useState<string>((dir[0]?.code || "WOC").toUpperCase());

  const [roleStore, setRoleStore] = useState<RoleMapStore>(() => loadRoleStore());
  const [chanStore, setChanStore] = useState<ChannelMapStore>(() => loadChannelStore());
  const [defaults, setDefaults] = useState<DefaultsStore>(() => loadDefaults());

  useEffect(() => saveDefaults(defaults), [defaults]);

  const effectiveAlliance = useMemo(() => (scope === "alliance" ? String(allianceCode || "").toUpperCase() : null), [scope, allianceCode]);
  const roleLut = useMemo(() => makeRoleLookup(roleStore, effectiveAlliance), [roleStore, effectiveAlliance]);
  const chanLut = useMemo(() => makeChannelLookup(chanStore, effectiveAlliance), [chanStore, effectiveAlliance]);

  const roleKeys = useMemo(() => Object.keys(roleLut || {}).sort(), [roleLut]);
  const channelKeys = useMemo(() => Object.keys(chanLut || {}).sort(), [chanLut]);

  const current = useMemo<Defaults>(() => {
    if (scope === "global") return defaults.global || { channelName: "", rolesCsv: "" };
    const ac = String(allianceCode || "").toUpperCase();
    return defaults.alliances?.[ac] || { channelName: "", rolesCsv: "" };
  }, [scope, allianceCode, defaults]);

  const [channelName, setChannelName] = useState<string>(current.channelName || "");
  const [rolesCsv, setRolesCsv] = useState<string>(current.rolesCsv || "");

  useEffect(() => {
    setChannelName(current.channelName || "");
    setRolesCsv(current.rolesCsv || "");
  }, [scope, allianceCode]);

  function reloadAll() {
    setRoleStore(loadRoleStore());
    setChanStore(loadChannelStore());
    setDefaults(loadDefaults());
  }

  function saveCurrent() {
    const next: DefaultsStore = { ...defaults, updatedUtc: nowUtc() };
    const value: Defaults = { channelName: (channelName || "").trim(), rolesCsv: (rolesCsv || "").trim() };

    if (scope === "global") {
      next.global = value;
    } else {
      const ac = String(allianceCode || "").toUpperCase();
      next.alliances = { ...(next.alliances || {}), [ac]: value };
    }
    setDefaults(next);
    alert("Saved defaults.");
  }

  function clearCurrent() {
    if (!confirm("Clear defaults for this scope?")) return;
    setChannelName("");
    setRolesCsv("");
    const next: DefaultsStore = { ...defaults, updatedUtc: nowUtc() };
    if (scope === "global") {
      next.global = { channelName: "", rolesCsv: "" };
    } else {
      const ac = String(allianceCode || "").toUpperCase();
      const a = { ...(next.alliances || {}) };
      delete a[ac];
      next.alliances = a;
    }
    setDefaults(next);
  }

  async function exportJson() {
    const txt = JSON.stringify({ ...defaults, exportedUtc: nowUtc() }, null, 2);
    try { await navigator.clipboard.writeText(txt); alert("Copied defaults JSON."); }
    catch { window.prompt("Copy:", txt); }
  }

  function importJson() {
    const raw = window.prompt("Paste defaults JSON:");
    if (!raw) return;
    try {
      const p = JSON.parse(raw);
      if (p?.version !== 1 || !p.global) throw new Error("Invalid");
      setDefaults(p);
      alert("Imported.");
    } catch {
      alert("Invalid JSON.");
    }
  }

  return (
    <div style={{ padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>⚙️ Owner — Discord Defaults</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={reloadAll}>Reload</button>
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

          <div style={{ opacity: 0.75, fontSize: 12 }}>
            Known channels: {channelKeys.length} • Known roles: {roleKeys.length}
          </div>
        </div>
      </div>

      <div className="zombie-card" style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 900 }}>Defaults</div>

        <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ opacity: 0.75, fontSize: 12 }}>Default Channel</div>
          <select className="zombie-input" value={channelName} onChange={(e) => setChannelName(e.target.value)} style={{ padding: "10px 12px", minWidth: 240 }}>
            <option value="">(none)</option>
            {channelKeys.map((k) => (
              <option key={k} value={k}>
                {k}{chanLut[k] ? "" : " (no id yet)"}
              </option>
            ))}
          </select>

          <div style={{ opacity: 0.75, fontSize: 12 }}>Default Mention Roles (comma)</div>
          <input
            className="zombie-input"
            value={rolesCsv}
            onChange={(e) => setRolesCsv(e.target.value)}
            placeholder="Leadership,R5"
            style={{ padding: "10px 12px", minWidth: 260 }}
          />

          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={saveCurrent}>Save</button>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={clearCurrent}>Clear</button>
        </div>

        <div style={{ marginTop: 10, opacity: 0.65, fontSize: 12 }}>
          Next step (we can do immediately after): auto-fill these defaults in Broadcast, Live Ops, Alerts, Discussion, and Test Send.
        </div>
      </div>

      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "minmax(320px, 1fr) minmax(320px, 1fr)", gap: 12 }}>
        <div className="zombie-card">
          <div style={{ fontWeight: 900 }}>Known Roles (this scope)</div>
          <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
            {roleKeys.map((k) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: 8, borderRadius: 10, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.20)" }}>
                <div style={{ fontWeight: 900 }}>{k}</div>
                <div style={{ opacity: 0.75, fontSize: 12 }}>{roleLut[k] ? roleLut[k] : "(no id yet)"}</div>
              </div>
            ))}
            {roleKeys.length === 0 ? <div style={{ opacity: 0.75 }}>No role mappings yet.</div> : null}
          </div>
        </div>

        <div className="zombie-card">
          <div style={{ fontWeight: 900 }}>Known Channels (this scope)</div>
          <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
            {channelKeys.map((k) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: 8, borderRadius: 10, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.20)" }}>
                <div style={{ fontWeight: 900 }}>#{k}</div>
                <div style={{ opacity: 0.75, fontSize: 12 }}>{chanLut[k] ? chanLut[k] : "(no id yet)"}</div>
              </div>
            ))}
            {channelKeys.length === 0 ? <div style={{ opacity: 0.75 }}>No channel mappings yet.</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}