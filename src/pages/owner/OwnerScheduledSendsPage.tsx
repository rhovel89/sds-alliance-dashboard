import React, { useEffect, useMemo, useState } from "react";
import SupportBundleButton from "../../components/system/SupportBundleButton";
import { sendDiscordBot } from "../../lib/discordEdgeSend";
import { appendDiscordSendLog } from "../../lib/discordSendLog";

type RoleMapStore = {
  version: 1;
  global: Record<string, string>;
  alliances: Record<string, Record<string, string>>;
};
type ChannelEntry = { id: string; name: string; channelId: string; createdUtc: string };
type ChannelMapStore = { version: 1; global: ChannelEntry[]; alliances: Record<string, ChannelEntry[]> };

type Item = {
  id: string;
  createdUtc: string;
  runAtUtc: string;      // ISO or "YYYY-MM-DD HH:mm"
  label: string;
  channelName: string;   // lookup key
  rolesCsv: string;      // "Leadership,R5"
  message: string;       // raw template, supports {{Role}} and {{channel:name}} tokens
  sentUtc: string | null;
  lastError: string | null;
};

type Store = { version: 1; updatedUtc: string; items: Item[] };

const KEY = "sad_discord_scheduled_sends_v1";
const ROLE_MAP_KEY = "sad_discord_role_map_v1";
const CHANNEL_MAP_KEY = "sad_discord_channel_map_v1";

function uid() { return Math.random().toString(16).slice(2) + "-" + Date.now().toString(16); }
function nowUtc() { return new Date().toISOString(); }
function norm(s: any) { return String(s || "").trim().toLowerCase(); }

function safeJson<T>(raw: string | null): T | null { if (!raw) return null; try { return JSON.parse(raw) as T; } catch { return null; } }

function loadRoleStore(): RoleMapStore {
  const s = safeJson<RoleMapStore>(localStorage.getItem(ROLE_MAP_KEY));
  return (s && s.version === 1) ? s : { version: 1, global: {}, alliances: {} };
}
function loadChannelStore(): ChannelMapStore {
  const s = safeJson<ChannelMapStore>(localStorage.getItem(CHANNEL_MAP_KEY));
  return (s && s.version === 1) ? s : { version: 1, global: [], alliances: {} };
}
function makeRoleLut(s: RoleMapStore) {
  const out: Record<string,string> = {};
  const g = s.global || {};
  for (const k of Object.keys(g)) out[norm(k)] = String(g[k] || "");
  return out;
}
function makeChanLut(s: ChannelMapStore) {
  const out: Record<string,string> = {};
  for (const c of s.global || []) {
    const n = norm(c.name);
    if (n) out[n] = String(c.channelId || "").trim();
  }
  return out;
}

function parseUtc(input: string): Date | null {
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

function resolveMentions(input: string, roleLut: Record<string,string>, chanLut: Record<string,string>) {
  let text = input || "";
  text = text.replace(/\{\{\s*role\s*:\s*([A-Za-z0-9_\- ]{1,64})\s*\}\}/g, (_m, k) => {
    const id = roleLut[norm(k)];
    return id ? `<@&${id}>` : `{{role:${String(k)}}}`;
  });
  text = text.replace(/\{\{\s*([A-Za-z0-9_\- ]{1,64})\s*\}\}/g, (_m, k) => {
    const id = roleLut[norm(k)];
    return id ? `<@&${id}>` : `{{${String(k)}}}`;
  });
  text = text.replace(/\{\{\s*channel\s*:\s*([A-Za-z0-9_\-]{2,64})\s*\}\}/g, (_m, k) => {
    const id = chanLut[norm(k)];
    return id ? `<#${id}>` : `{{channel:${String(k)}}}`;
  });
  text = text.replace(/\{\{\s*#([A-Za-z0-9_\-]{2,64})\s*\}\}/g, (_m, k) => {
    const id = chanLut[norm(k)];
    return id ? `<#${id}>` : `{{#${String(k)}}}`;
  });
  return text;
}

function loadStore(): Store {
  const s = safeJson<any>(localStorage.getItem(KEY));
  if (s && s.version === 1) {
    const items = Array.isArray(s.items) ? s.items : [];
    return { version: 1, updatedUtc: String(s.updatedUtc || nowUtc()), items };
  }
  return { version: 1, updatedUtc: nowUtc(), items: [] };
}

function saveStore(s: Store) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {} }

export default function OwnerScheduledSendsPage() {
  const [store, setStore] = useState<Store>(() => loadStore());
  useEffect(() => saveStore(store), [store]);

  const [roleStore, setRoleStore] = useState<RoleMapStore>(() => loadRoleStore());
  const [chanStore, setChanStore] = useState<ChannelMapStore>(() => loadChannelStore());
  const roleLut = useMemo(() => makeRoleLut(roleStore), [roleStore]);
  const chanLut = useMemo(() => makeChanLut(chanStore), [chanStore]);

  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((x) => x + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const now = useMemo(() => new Date(), [tick]);

  const [label, setLabel] = useState("State Alert");
  const [runAtUtc, setRunAtUtc] = useState("");
  const [channelName, setChannelName] = useState("");
  const [rolesCsv, setRolesCsv] = useState("");
  const [message, setMessage] = useState("🚨 {{Leadership}} State 789 Alert\n\n<message>\n\n{{channel:announcements}}");

  const items = useMemo(() => {
    const arr = (store.items || []).slice();
    arr.sort((a, b) => {
      const ad = parseUtc(a.runAtUtc)?.getTime() ?? 0;
      const bd = parseUtc(b.runAtUtc)?.getTime() ?? 0;
      return bd - ad;
    });
    return arr;
  }, [store.items]);

  function reloadMentions() {
    setRoleStore(loadRoleStore());
    setChanStore(loadChannelStore());
    alert("Reloaded role/channel maps.");
  }

  function addItem() {
    const d = parseUtc(runAtUtc);
    if (!d) return alert('Invalid run time. Use ISO or "YYYY-MM-DD HH:mm" (UTC).');
    const ch = (channelName || "").trim();
    if (!ch) return alert("Channel name required (must exist in Owner → Discord Mentions).");

    const it: Item = {
      id: uid(),
      createdUtc: nowUtc(),
      runAtUtc: runAtUtc.trim(),
      label: (label || "Scheduled Send").trim(),
      channelName: ch,
      rolesCsv: (rolesCsv || "").trim(),
      message: message || "",
      sentUtc: null,
      lastError: null,
    };

    setStore((p) => ({ version: 1, updatedUtc: nowUtc(), items: [it, ...(p.items || [])] }));
  }

  function del(id: string) {
    if (!confirm("Delete scheduled send?")) return;
    setStore((p) => ({ version: 1, updatedUtc: nowUtc(), items: (p.items || []).filter((x) => x.id !== id) }));
  }

  async function runOne(it: Item) {
    const chId = chanLut[norm(it.channelName)] || "";
    if (!chId) {
      const err = "Channel ID missing for: " + it.channelName;
      setStore((p) => ({
        version: 1,
        updatedUtc: nowUtc(),
        items: (p.items || []).map((x) => x.id === it.id ? { ...x, lastError: err } : x),
      }));
      return;
    }

    const roles = (it.rolesCsv || "").split(",").map((x) => x.trim()).filter(Boolean);
    const prefix = [
      roles.map((r) => `{{${r}}}`).join(" "),
      `{{channel:${it.channelName}}}`,
    ].filter(Boolean).join(" ").trim();

    const raw = (prefix ? (prefix + "\n\n") : "") + (it.message || "");
    const resolved = resolveMentions(raw, roleLut, chanLut);

    const res = await sendDiscordBot({ mode: "bot", channelId: chId, content: resolved });

    if (!res.ok) {
      appendDiscordSendLog({
        source: "scheduled",
        channelId: chId,
        channelName: it.channelName,
        contentPreview: resolved.slice(0, 160),
        ok: false,
        error: res.error,
        details: res.details,
      });
      setStore((p) => ({
        version: 1,
        updatedUtc: nowUtc(),
        items: (p.items || []).map((x) => x.id === it.id ? { ...x, lastError: res.error } : x),
      }));
      alert("Send failed: " + res.error);
      return;
    }

    appendDiscordSendLog({
      source: "scheduled",
      channelId: chId,
      channelName: it.channelName,
      contentPreview: resolved.slice(0, 160),
      ok: true,
      status: (res.data && res.data.discordStatus) ? res.data.discordStatus : null,
      details: res.data,
    });

    setStore((p) => ({
      version: 1,
      updatedUtc: nowUtc(),
      items: (p.items || []).map((x) => x.id === it.id ? { ...x, sentUtc: nowUtc(), lastError: null } : x),
    }));

    alert("✅ Sent.");
  }

  async function runDueNow() {
    const due = (store.items || []).filter((it) => !it.sentUtc && (parseUtc(it.runAtUtc)?.getTime() ?? 0) <= now.getTime());
    if (!due.length) return alert("No due items.");
    for (const it of due) { await runOne(it); }
  }

  async function exportJson() {
    const txt = JSON.stringify({ ...store, exportedUtc: nowUtc() }, null, 2);
    try { await navigator.clipboard.writeText(txt); alert("Copied scheduled sends JSON."); }
    catch { window.prompt("Copy:", txt); }
  }

  function importJson() {
    const raw = window.prompt("Paste scheduled sends JSON:");
    if (!raw) return;
    try {
      const p = JSON.parse(raw);
      if (!p || p.version !== 1 || !Array.isArray(p.items)) throw new Error("Invalid");
      localStorage.setItem(KEY, JSON.stringify(p));
      setStore(loadStore());
      alert("Imported.");
    } catch {
      alert("Invalid JSON.");
    }
  }

  return (
    <div style={{ padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>🗓️ Owner — Scheduled Sends (UI-only)</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={reloadMentions}>Reload Mentions</button>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={runDueNow}>Run Due Now</button>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={exportJson}>Export</button>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={importJson}>Import</button>
          <SupportBundleButton />
        </div>
      </div>

      <div className="zombie-card" style={{ marginTop: 12 }}>
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 240 }}>
              <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Label</div>
              <input className="zombie-input" value={label} onChange={(e) => setLabel(e.target.value)} style={{ width: "100%", padding: "10px 12px" }} />
            </div>

            <div style={{ flex: 1, minWidth: 240 }}>
              <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Run At UTC (ISO or "YYYY-MM-DD HH:mm")</div>
              <input className="zombie-input" value={runAtUtc} onChange={(e) => setRunAtUtc(e.target.value)} placeholder="2026-02-21 18:00" style={{ width: "100%", padding: "10px 12px" }} />
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 240 }}>
              <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Target Channel Name (key)</div>
              <input className="zombie-input" value={channelName} onChange={(e) => setChannelName(e.target.value)} placeholder="announcements" style={{ width: "100%", padding: "10px 12px" }} />
            </div>

            <div style={{ flex: 1, minWidth: 240 }}>
              <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Mention Roles CSV</div>
              <input className="zombie-input" value={rolesCsv} onChange={(e) => setRolesCsv(e.target.value)} placeholder="Leadership,R5" style={{ width: "100%", padding: "10px 12px" }} />
            </div>
          </div>

          <div>
            <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Message (supports tokens)</div>
            <textarea className="zombie-input" value={message} onChange={(e) => setMessage(e.target.value)} style={{ width: "100%", minHeight: 140, padding: "10px 12px" }} />
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={addItem}>Add Scheduled Send</button>
            <div style={{ opacity: 0.65, fontSize: 12, alignSelf: "center" }}>
              localStorage: {KEY}
            </div>
          </div>
        </div>
      </div>

      <div className="zombie-card" style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 900 }}>Queue ({items.length})</div>

        <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
          {items.map((it) => {
            const d = parseUtc(it.runAtUtc);
            const ms = d ? (d.getTime() - now.getTime()) : NaN;
            const due = isFinite(ms) && ms <= 0 && !it.sentUtc;

            return (
              <div key={it.id} style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.20)" }}>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ fontWeight: 900 }}>{due ? "⏰ DUE" : "🗓️"} {it.label}</div>
                  <div style={{ opacity: 0.7, fontSize: 12 }}>runAt: {it.runAtUtc}</div>
                  <div style={{ marginLeft: "auto", opacity: 0.75, fontSize: 12 }}>
                    channel: {it.channelName} • sent: {it.sentUtc ? it.sentUtc : "no"}
                  </div>
                </div>

                <div style={{ marginTop: 6, opacity: 0.8, fontSize: 12 }}>
                  roles: {it.rolesCsv || "(none)"}
                </div>

                {it.lastError ? <div style={{ marginTop: 6, color: "#ffb3b3", fontSize: 12 }}>{it.lastError}</div> : null}

                <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button className="zombie-btn" style={{ padding: "6px 8px", fontSize: 12 }} onClick={() => runOne(it)} disabled={!!it.sentUtc}>
                    Run Now
                  </button>
                  <button className="zombie-btn" style={{ padding: "6px 8px", fontSize: 12 }} onClick={() => del(it.id)}>
                    Delete
                  </button>
                </div>
              </div>
            );
          })}

          {items.length === 0 ? <div style={{ opacity: 0.75 }}>No scheduled sends yet.</div> : null}
        </div>
      </div>
    </div>
  );
}