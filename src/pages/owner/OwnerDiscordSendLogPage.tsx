import React, { useMemo, useState } from "react";
import SupportBundleButton from "../../components/system/SupportBundleButton";
import { clearDiscordSendLog, exportDiscordSendLog, importDiscordSendLog, loadDiscordSendLog } from "../../lib/discordSendLog";

export default function OwnerDiscordSendLogPage() {
  const [tick, setTick] = useState(0);
  const items = useMemo(() => loadDiscordSendLog(), [tick]);

  const [q, setQ] = useState("");
  const [onlyFails, setOnlyFails] = useState(false);

  const filtered = useMemo(() => {
    const s = (q || "").trim().toLowerCase();
    let arr = items.slice();
    if (onlyFails) arr = arr.filter((x) => x && x.ok === false);
    if (s) {
      arr = arr.filter((x) => {
        const hay = `${x.source} ${x.channelId || ""} ${x.channelName || ""} ${x.contentPreview || ""} ${x.error || ""}`.toLowerCase();
        return hay.includes(s);
      });
    }
    return arr;
  }, [items, q, onlyFails]);

  async function copyExport() {
    const txt = exportDiscordSendLog();
    try { await navigator.clipboard.writeText(txt); alert("Copied send log export JSON."); }
    catch { window.prompt("Copy:", txt); }
  }

  function doImport() {
    const raw = window.prompt("Paste send log export JSON:");
    if (!raw) return;
    const ok = importDiscordSendLog(raw);
    if (!ok) return alert("Invalid JSON.");
    setTick((x) => x + 1);
    alert("Imported.");
  }

  function doClear() {
    if (!confirm("Clear send log?")) return;
    clearDiscordSendLog();
    setTick((x) => x + 1);
  }

  return (
    <div style={{ padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>📜 Owner — Discord Send Log</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => setTick((x) => x + 1)}>Refresh</button>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={copyExport}>Export</button>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={doImport}>Import</button>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={doClear}>Clear</button>
          <SupportBundleButton />
        </div>
      </div>

      <div className="zombie-card" style={{ marginTop: 12 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input className="zombie-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" style={{ padding: "10px 12px", minWidth: 240, flex: 1 }} />
          <label style={{ display: "flex", gap: 8, alignItems: "center", opacity: 0.85 }}>
            <input type="checkbox" checked={onlyFails} onChange={(e) => setOnlyFails(e.target.checked)} />
            Failures only
          </label>
          <div style={{ marginLeft: "auto", opacity: 0.65, fontSize: 12 }}>
            Stored: sad_discord_send_log_v1 • Showing {filtered.length}/{items.length}
          </div>
        </div>
      </div>

      <div className="zombie-card" style={{ marginTop: 12 }}>
        <div style={{ display: "grid", gap: 10 }}>
          {filtered.map((x) => (
            <div key={x.id} style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.20)" }}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <div style={{ fontWeight: 900 }}>{x.ok ? "✅" : "❌"} {x.source}</div>
                <div style={{ opacity: 0.7, fontSize: 12 }}>{x.tsUtc}</div>
                <div style={{ marginLeft: "auto", opacity: 0.75, fontSize: 12 }}>
                  ch: {x.channelName || "(name?)"} • {x.channelId || "(id?)"} • status: {x.status ?? "—"}
                </div>
              </div>
              <div style={{ marginTop: 6, fontSize: 12, whiteSpace: "pre-wrap", opacity: 0.9 }}>
                {x.contentPreview}
              </div>
              {x.error ? <div style={{ marginTop: 6, fontSize: 12, color: "#ffb3b3" }}>{x.error}</div> : null}
            </div>
          ))}
          {filtered.length === 0 ? <div style={{ opacity: 0.75 }}>No log entries.</div> : null}
        </div>
      </div>
    </div>
  );
}