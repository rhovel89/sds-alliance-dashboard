import React, { useEffect, useMemo, useState } from "react";
import SupportBundleButton from "../../components/system/SupportBundleButton";

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

type Store = { version: 1; items: LogItem[] };

const KEY = "sad_discord_send_log_v1";

function uid() { return Math.random().toString(16).slice(2) + "-" + Date.now().toString(16); }
function nowUtc() { return new Date().toISOString(); }

function load(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { version: 1, items: [] };
    const s = JSON.parse(raw) as Store;
    if (s && s.version === 1 && Array.isArray(s.items)) return s;
  } catch {}
  return { version: 1, items: [] };
}

function save(s: Store) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {}
}

export default function OwnerDiscordSendLogPage() {
  const [store, setStore] = useState<Store>(() => load());
  const [q, setQ] = useState("");

  useEffect(() => save(store), [store]);

  const items = useMemo(() => {
    const qq = q.trim().toLowerCase();
    const arr = (store.items || []).slice();
    arr.sort((a, b) => b.tsUtc.localeCompare(a.tsUtc));
    if (!qq) return arr;
    return arr.filter((x) => {
      const blob = [
        x.source,
        x.allianceCode,
        x.channelName,
        x.channelId,
        x.ok ? "ok" : "fail",
        x.detail,
        (x.mentionRoles || []).join(","),
        (x.mentionRoleIds || []).join(","),
      ].join(" ").toLowerCase();
      return blob.includes(qq);
    });
  }, [store.items, q]);

  async function exportJson() {
    const txt = JSON.stringify({ ...store, exportedUtc: nowUtc() }, null, 2);
    try { await navigator.clipboard.writeText(txt); alert("Copied send log JSON."); }
    catch { window.prompt("Copy:", txt); }
  }

  function importJson() {
    const raw = window.prompt("Paste send log JSON:");
    if (!raw) return;
    try {
      const p = JSON.parse(raw);
      if (p?.version !== 1 || !Array.isArray(p.items)) throw new Error("Invalid");
      setStore({ version: 1, items: p.items });
      alert("Imported.");
    } catch {
      alert("Invalid JSON.");
    }
  }

  function clear() {
    if (!confirm("Clear send log?")) return;
    setStore({ version: 1, items: [] });
  }

  return (
    <div style={{ padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>📜 Owner — Discord Send Log</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={exportJson}>Export</button>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={importJson}>Import</button>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={clear}>Clear</button>
          <SupportBundleButton />
        </div>
      </div>

      <div className="zombie-card" style={{ marginTop: 12 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input className="zombie-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" style={{ padding: "10px 12px", minWidth: 240 }} />
          <div style={{ opacity: 0.75, fontSize: 12 }}>Count: {(store.items || []).length}</div>
        </div>
      </div>

      <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
        {items.map((it) => (
          <div key={it.id} className="zombie-card">
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <div style={{ fontWeight: 900 }}>
                {it.ok ? "✅" : "❌"} {it.source.toUpperCase()} • {it.tsUtc}
              </div>
              <div style={{ opacity: 0.75, fontSize: 12 }}>
                {it.allianceCode ? `Alliance: ${it.allianceCode}` : "Alliance: (none)"} • {it.channelName ? `#${it.channelName}` : "(no channel name)"} • {it.channelId || "(no channel id)"}
              </div>
            </div>
            <div style={{ marginTop: 8, opacity: 0.8, fontSize: 12, whiteSpace: "pre-wrap" }}>{it.detail}</div>
            {(it.mentionRoles || []).length ? (
              <div style={{ marginTop: 8, opacity: 0.75, fontSize: 12 }}>
                Roles: {(it.mentionRoles || []).join(", ")} • IDs: {(it.mentionRoleIds || []).join(", ")}
              </div>
            ) : null}
          </div>
        ))}
        {items.length === 0 ? <div style={{ opacity: 0.75 }}>No log items yet.</div> : null}
      </div>
    </div>
  );
}
