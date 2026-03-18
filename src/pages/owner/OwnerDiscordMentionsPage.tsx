import React, { useEffect, useMemo, useState } from "react";
import SupportBundleButton from "../../components/system/SupportBundleButton";
import {
  loadLocalRoleStore,
  loadLocalChannelStore,
  saveLocalRoleStore,
  saveLocalChannelStore,
  fetchRoleStoreFromDb,
  fetchChannelStoreFromDb,
  saveRoleStoreToDb,
  saveChannelStoreToDb,
} from "../../lib/discordMappingsStore";

type DirItem = { id: string; code: string; name: string; state: string };

type RoleMapStore = {
  version: 1;
  global: Record<string, string>;
  alliances: Record<string, Record<string, string>>;
};

type ChannelEntry = { id: string; name: string; channelId: string; createdUtc: string };
type ChannelMapStore = { version: 1; global: ChannelEntry[]; alliances: Record<string, ChannelEntry[]> };

const DIR_KEY = "sad_alliance_directory_v1";

function uid() { return Math.random().toString(16).slice(2) + "-" + Date.now().toString(16); }
function nowUtc() { return new Date().toISOString(); }
function norm(s: string) { return (s || "").trim(); }

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

export default function OwnerDiscordMentionsPage() {
  const dir = useMemo(() => loadDir(), []);
  const [scope, setScope] = useState<"global" | "alliance">("alliance");
  const [allianceCode, setAllianceCode] = useState<string>((dir[0]?.code || "WOC").toUpperCase());

  const [roleStore, setRoleStore] = useState<RoleMapStore>(() => loadLocalRoleStore());
  const [chanStore, setChanStore] = useState<ChannelMapStore>(() => loadLocalChannelStore());

  useEffect(() => saveLocalRoleStore(roleStore), [roleStore]);
  useEffect(() => saveLocalChannelStore(chanStore), [chanStore]);

  useEffect(() => {
    let alive = true;

    (async () => {
      const [dbRoles, dbChannels] = await Promise.all([
        fetchRoleStoreFromDb(),
        fetchChannelStoreFromDb(),
      ]);

      if (!alive) return;
      setRoleStore(dbRoles as RoleMapStore);
      setChanStore(dbChannels as ChannelMapStore);
    })();

    return () => { alive = false; };
  }, []);

  const roleMap = useMemo(() => {
    if (scope === "global") return roleStore.global || {};
    const ac = allianceCode.toUpperCase();
    return roleStore.alliances?.[ac] || {};
  }, [scope, allianceCode, roleStore]);

  const channels = useMemo(() => {
    if (scope === "global") return chanStore.global || [];
    const ac = allianceCode.toUpperCase();
    return chanStore.alliances?.[ac] || [];
  }, [scope, allianceCode, chanStore]);

  const [roleKey, setRoleKey] = useState("");
  const [roleId, setRoleId] = useState("");

  const [chanName, setChanName] = useState("");
  const [chanId, setChanId] = useState("");

  async function upsertRole() {
    const k = norm(roleKey);
    if (!k) return alert("Role name required (e.g. Leadership)");

    const id = norm(roleId);
    const next: RoleMapStore = { ...roleStore };

    if (scope === "global") {
      next.global = { ...(next.global || {}), [k]: id };
    } else {
      const ac = allianceCode.toUpperCase();
      next.alliances = { ...(next.alliances || {}) };
      next.alliances[ac] = { ...(next.alliances[ac] || {}), [k]: id };
    }

    setRoleStore(next);
    saveLocalRoleStore(next);

    const r = await saveRoleStoreToDb(next);
    if ((r as any)?.error) {
      alert("Role save failed: " + (((r as any).error?.message) || JSON.stringify((r as any).error)));
      return;
    }

    setRoleKey("");
    setRoleId("");
  }

  async function delRole(k: string) {
    if (!confirm("Delete role mapping?")) return;

    const next: RoleMapStore = { ...roleStore };
    if (scope === "global") {
      const m = { ...(next.global || {}) };
      delete m[k];
      next.global = m;
    } else {
      const ac = allianceCode.toUpperCase();
      const m = { ...(next.alliances?.[ac] || {}) };
      delete m[k];
      next.alliances = { ...(next.alliances || {}), [ac]: m };
    }

    setRoleStore(next);
    saveLocalRoleStore(next);

    const r = await saveRoleStoreToDb(next);
    if ((r as any)?.error) {
      alert("Role delete failed: " + (((r as any).error?.message) || JSON.stringify((r as any).error)));
    }
  }

  async function addChannel() {
    const n = norm(chanName).replace(/^#/, "");
    if (!n) return alert("Channel name required (e.g. announcements)");

    const id = norm(chanId);
    const entry: ChannelEntry = { id: uid(), name: n, channelId: id, createdUtc: nowUtc() };
    const next: ChannelMapStore = { ...chanStore };

    if (scope === "global") {
      next.global = [entry, ...(next.global || [])];
    } else {
      const ac = allianceCode.toUpperCase();
      next.alliances = { ...(next.alliances || {}) };
      next.alliances[ac] = [entry, ...(next.alliances[ac] || [])];
    }

    setChanStore(next);
    saveLocalChannelStore(next);

    const r = await saveChannelStoreToDb(next);
    if ((r as any)?.error) {
      alert("Channel save failed: " + (((r as any).error?.message) || JSON.stringify((r as any).error)));
      return;
    }

    setChanName("");
    setChanId("");
  }

  async function delChannel(id: string) {
    if (!confirm("Delete channel entry?")) return;

    const next: ChannelMapStore = { ...chanStore };
    if (scope === "global") {
      next.global = (next.global || []).filter((x) => x.id !== id);
    } else {
      const ac = allianceCode.toUpperCase();
      next.alliances = { ...(next.alliances || {}) };
      next.alliances[ac] = (next.alliances[ac] || []).filter((x) => x.id !== id);
    }

    setChanStore(next);
    saveLocalChannelStore(next);

    const r = await saveChannelStoreToDb(next);
    if ((r as any)?.error) {
      alert("Channel delete failed: " + (((r as any).error?.message) || JSON.stringify((r as any).error)));
    }
  }

  async function copyExport() {
    const payload = {
      version: 1,
      exportedUtc: nowUtc(),
      roleStore,
      chanStore,
    };
    const txt = JSON.stringify(payload, null, 2);
    try {
      await navigator.clipboard.writeText(txt);
      alert("Copied export JSON.");
    } catch {
      window.prompt("Copy:", txt);
    }
  }

  async function importExport() {
    const raw = window.prompt("Paste export JSON:");
    if (!raw) return;

    try {
      const p = JSON.parse(raw);
      let nextRoles = roleStore;
      let nextChannels = chanStore;

      if (p?.roleStore?.version === 1) {
        nextRoles = p.roleStore;
        setRoleStore(nextRoles);
        saveLocalRoleStore(nextRoles);
      }

      if (p?.chanStore?.version === 1) {
        nextChannels = p.chanStore;
        setChanStore(nextChannels);
        saveLocalChannelStore(nextChannels);
      }

      const [rr, cr] = await Promise.all([
        saveRoleStoreToDb(nextRoles),
        saveChannelStoreToDb(nextChannels),
      ]);

      if ((rr as any)?.error) {
        alert("Imported locally, but role DB save failed: " + (((rr as any).error?.message) || JSON.stringify((rr as any).error)));
        return;
      }

      if ((cr as any)?.error) {
        alert("Imported locally, but channel DB save failed: " + (((cr as any).error?.message) || JSON.stringify((cr as any).error)));
        return;
      }

      alert("Imported.");
    } catch {
      alert("Invalid JSON.");
    }
  }

  return (
    <div style={{ padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>🔧 Owner — Discord Mentions (Roles + Channels)</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={copyExport}>Export</button>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => void importExport()}>Import</button>
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
            You can leave IDs blank for now and fill them later.
          </div>
        </div>
      </div>

      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 12 }}>
        <div className="zombie-card">
          <div style={{ fontWeight: 900 }}>🎭 Role Mentions</div>
          <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input className="zombie-input" value={roleKey} onChange={(e) => setRoleKey(e.target.value)} placeholder="Role name (Leadership)" style={{ padding: "10px 12px", flex: 1, minWidth: 180 }} />
            <input className="zombie-input" value={roleId} onChange={(e) => setRoleId(e.target.value)} placeholder="Role ID (optional for now)" style={{ padding: "10px 12px", flex: 1, minWidth: 200 }} />
            <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => void upsertRole()}>Save</button>
          </div>

          <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
            {Object.keys(roleMap || {}).sort().map((k) => (
              <div key={k} style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.20)" }}>
                <div style={{ fontWeight: 900 }}>{k}</div>
                <div style={{ opacity: 0.75, fontSize: 12, marginTop: 4 }}>ID: {(roleMap as any)[k] || "(blank)"}</div>
                <div style={{ opacity: 0.65, fontSize: 12, marginTop: 4 }}>
                  Use in text: {"{{"}{k}{"}}"} or @{k}
                </div>
                <button className="zombie-btn" style={{ marginTop: 8, padding: "6px 8px", fontSize: 12 }} onClick={() => void delRole(k)}>Delete</button>
              </div>
            ))}
            {Object.keys(roleMap || {}).length === 0 ? <div style={{ opacity: 0.75 }}>No role mappings yet.</div> : null}
          </div>
        </div>

        <div className="zombie-card">
          <div style={{ fontWeight: 900 }}>📺 Channel Mentions</div>
          <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input className="zombie-input" value={chanName} onChange={(e) => setChanName(e.target.value)} placeholder="Channel name (announcements)" style={{ padding: "10px 12px", flex: 1, minWidth: 180 }} />
            <input className="zombie-input" value={chanId} onChange={(e) => setChanId(e.target.value)} placeholder="Channel ID (optional for now)" style={{ padding: "10px 12px", flex: 1, minWidth: 200 }} />
            <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => void addChannel()}>Add</button>
          </div>

          <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
            {(channels || []).map((c) => (
              <div key={c.id} style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.20)" }}>
                <div style={{ fontWeight: 900 }}>#{c.name}</div>
                <div style={{ opacity: 0.75, fontSize: 12, marginTop: 4 }}>ID: {c.channelId || "(blank)"}</div>
                <div style={{ opacity: 0.65, fontSize: 12, marginTop: 4 }}>
                  Use in text: {"{{channel:"}{c.name}{"}}"} or {"{{#"}{c.name}{"}}"} or #{c.name}
                </div>
                <button className="zombie-btn" style={{ marginTop: 8, padding: "6px 8px", fontSize: 12 }} onClick={() => void delChannel(c.id)}>Delete</button>
              </div>
            ))}
            {(channels || []).length === 0 ? <div style={{ opacity: 0.75 }}>No channels yet.</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}



