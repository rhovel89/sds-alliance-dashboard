import React, { useEffect, useMemo, useState } from "react";
import SupportBundleButton from "../../components/system/SupportBundleButton";
import { sendDiscordBot } from "../../lib/discordEdgeSend";

type RoleMapStore = {
  version: 1;
  global: Record<string, string>;
  alliances: Record<string, Record<string, string>>;
};

type ChannelEntry = { id: string; name: string; channelId: string; createdUtc: string };
type ChannelMapStore = { version: 1; global: ChannelEntry[]; alliances: Record<string, ChannelEntry[]> };

type DefaultsStore = {
  version: 1;
  global: { channelName: string; rolesCsv: string };
  alliances: Record<string, { channelName: string; rolesCsv: string }>;
  updatedUtc: string;
};

type Severity = "info" | "warning" | "critical";

type AlertRow = {
  id: string;
  createdUtc: string;
  updatedUtc: string;
  title: string;
  body: string;
  tags: string[];
  pinned: boolean;
  authorLabel: string;
  severity: Severity;
};

type Store = {
  version: 1;
  updatedUtc: string;
  alerts: AlertRow[];
};

const KEY = "sad_state789_alerts_v1";
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

function loadDefaults(): DefaultsStore | null {
  const s = safeJson<DefaultsStore>(localStorage.getItem(DEFAULTS_KEY));
  if (s && s.version === 1) return s;
  return null;
}

function loadStore(): Store {
  const s = safeJson<any>(localStorage.getItem(KEY));
  if (s && s.version === 1) {
    const srcAlerts = Array.isArray(s.alerts) ? s.alerts : (Array.isArray(s.items) ? s.items : []);
    const alerts: AlertRow[] = srcAlerts.map((a: any) => ({
      id: String(a?.id || uid()),
      createdUtc: String(a?.createdUtc || nowUtc()),
      updatedUtc: String(a?.updatedUtc || nowUtc()),
      title: String(a?.title || "Untitled"),
      body: String(a?.body || a?.content || ""),
      tags: Array.isArray(a?.tags) ? a.tags.map((x: any) => String(x)) : [],
      pinned: !!a?.pinned,
      authorLabel: String(a?.authorLabel || a?.author || "Unknown"),
      severity: (String(a?.severity || "info") as any) === "critical" ? "critical" : (String(a?.severity || "info") as any) === "warning" ? "warning" : "info",
    }));
    return { version: 1, updatedUtc: String(s.updatedUtc || nowUtc()), alerts };
  }
  return { version: 1, updatedUtc: nowUtc(), alerts: [] };
}

function saveStore(s: Store) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {}
}

function makeRoleLookup(roleStore: RoleMapStore) {
  const out: Record<string, string> = {};
  const g = roleStore.global || {};
  for (const k of Object.keys(g)) out[norm(k)] = String(g[k] || "");
  return out;
}

function makeChannelLookup(channelStore: ChannelMapStore) {
  const out: Record<string, string> = {};
  for (const c of channelStore.global || []) {
    const nm = norm(c?.name);
    if (nm) out[nm] = String(c?.channelId || "").trim();
  }
  return out;
}

function resolveMentions(input: string, roleLut: Record<string, string>, chanLut: Record<string, string>) {
  let text = input || "";

  text = text.replace(/\{\{\s*role\s*:\s*([A-Za-z0-9_\- ]{1,64})\s*\}\}/g, (_m, k) => {
    const id = roleLut[norm(k)];
    return id ? `<@&${id}>` : `{{role:${String(k)}}}`;
  });
  text = text.replace(/\{\{\s*([A-Za-z0-9_\- ]{1,64})\s*\}\}/g, (_m, k) => {
    const id = roleLut[norm(k)];
    return id ? `<@&${id}>` : `{{${String(k)}}}`;
  });

  text = text.replace(/(^|[\s(])@([A-Za-z0-9_\-]{2,64})(?=$|[\s),.!?])/g, (_m, pre, k) => {
    const id = roleLut[norm(k)];
    return id ? `${pre}<@&${id}>` : `${pre}@${String(k)}`;
  });

  text = text.replace(/\{\{\s*#([A-Za-z0-9_\-]{2,64})\s*\}\}/g, (_m, k) => {
    const id = chanLut[norm(k)];
    return id ? `<#${id}>` : `{{#${String(k)}}}`;
  });
  text = text.replace(/\{\{\s*channel\s*:\s*([A-Za-z0-9_\-]{2,64})\s*\}\}/g, (_m, k) => {
    const id = chanLut[norm(k)];
    return id ? `<#${id}>` : `{{channel:${String(k)}}}`;
  });

  text = text.replace(/(^|[\s(])#([A-Za-z0-9_\-]{2,64})(?=$|[\s),.!?])/g, (_m, pre, k) => {
    const id = chanLut[norm(k)];
    return id ? `${pre}<#${id}>` : `${pre}#${String(k)}`;
  });

  return text;
}

function pickTags(csv: string): string[] {
  const arr = (csv || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .map((x) => x.replace(/^#/, ""));
  return Array.from(new Set(arr));
}

function sevLabel(s: Severity) {
  if (s === "critical") return "CRITICAL";
  if (s === "warning") return "WARNING";
  return "INFO";
}

function sevIcon(s: Severity) {
  if (s === "critical") return "🛑";
  if (s === "warning") return "⚠️";
  return "📣";
}

export default function State789AlertsPage() {
  const [store, setStore] = useState<Store>(() => loadStore());
  useEffect(() => saveStore(store), [store]);

  const [roleStore, setRoleStore] = useState<RoleMapStore>(() => loadRoleStore());
  const [chanStore, setChanStore] = useState<ChannelMapStore>(() => loadChannelStore());
  const roleLut = useMemo(() => makeRoleLookup(roleStore), [roleStore]);
  const chanLut = useMemo(() => makeChannelLookup(chanStore), [chanStore]);

  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<string>("");

  const allTags = useMemo(() => {
    const s = new Set<string>();
    for (const a of store.alerts || []) for (const tag of (a.tags || [])) s.add(tag);
    return Array.from(s).sort((x, y) => x.localeCompare(y));
  }, [store.alerts]);

  const alerts = useMemo(() => {
    const q = (search || "").trim().toLowerCase();
    const tf = (tagFilter || "").trim().toLowerCase();

    let arr = (store.alerts || []).slice();
    if (tf) arr = arr.filter((a) => (a.tags || []).some((x) => String(x).toLowerCase() === tf));
    if (q) {
      arr = arr.filter((a) => {
        const hay = `${a.title} ${a.body} ${(a.tags || []).join(" ")} ${a.authorLabel} ${a.severity}`.toLowerCase();
        return hay.includes(q);
      });
    }

    arr.sort((a, b) => {
      if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
      return String(b.updatedUtc).localeCompare(String(a.updatedUtc));
    });

    return arr;
  }, [store.alerts, search, tagFilter]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = useMemo(
    () => (selectedId ? (store.alerts || []).find((a) => a.id === selectedId) || null : null),
    [selectedId, store.alerts]
  );

  const [title, setTitle] = useState("");
  const [tagsCsv, setTagsCsv] = useState("");
  const [authorLabel, setAuthorLabel] = useState("Unknown");
  const [severity, setSeverity] = useState<Severity>("info");
  const [body, setBody] = useState("");

  useEffect(() => {
    if (!selected) return;
    setTitle(selected.title || "");
    setTagsCsv((selected.tags || []).join(","));
    setAuthorLabel(selected.authorLabel || "Unknown");
    setSeverity(selected.severity || "info");
    setBody(selected.body || "");
  }, [selectedId]);

  function resetComposer() {
    setSelectedId(null);
    setTitle("");
    setTagsCsv("");
    setAuthorLabel("Unknown");
    setSeverity("info");
    setBody("");
  }

  function upsertAlert() {
    const t = title.trim();
    if (!t) return alert("Title required.");
    const now = nowUtc();

    const row: AlertRow = {
      id: selectedId || uid(),
      createdUtc: selected?.createdUtc || now,
      updatedUtc: now,
      title: t,
      body: body || "",
      tags: pickTags(tagsCsv),
      pinned: selected?.pinned || false,
      authorLabel: (authorLabel || "Unknown").trim() || "Unknown",
      severity: severity || "info",
    };

    setStore((p) => {
      const next: Store = { version: 1, updatedUtc: now, alerts: [...(p.alerts || [])] };
      const idx = next.alerts.findIndex((x) => x.id === row.id);
      if (idx >= 0) next.alerts[idx] = row;
      if (idx < 0) next.alerts.unshift(row);
      return next;
    });

    setSelectedId(row.id);
  }

  function delAlert(id: string) {
    const row = (store.alerts || []).find((x) => x.id === id);
    if (!row) return;
    if (!confirm(`Delete "${row.title}"?`)) return;

    setStore((p) => ({ version: 1, updatedUtc: nowUtc(), alerts: (p.alerts || []).filter((a) => a.id !== id) }));
    if (selectedId === id) resetComposer();
  }

  function togglePin(id: string) {
    setStore((p) => ({
      version: 1,
      updatedUtc: nowUtc(),
      alerts: (p.alerts || []).map((a) => (a.id === id ? { ...a, pinned: !a.pinned, updatedUtc: nowUtc() } : a)),
    }));
  }

  async function exportJson() {
    const txt = JSON.stringify({ ...store, exportedUtc: nowUtc() }, null, 2);
    try { await navigator.clipboard.writeText(txt); alert("Copied alerts JSON."); }
    catch { window.prompt("Copy:", txt); }
  }

  function importJson() {
    const raw = window.prompt("Paste alerts JSON:");
    if (!raw) return;
    try {
      const p = JSON.parse(raw);
      if (!p || p.version !== 1 || (!Array.isArray(p.alerts) && !Array.isArray(p.items))) throw new Error("Invalid");
      localStorage.setItem(KEY, JSON.stringify(p));
      setStore(loadStore());
      resetComposer();
      alert("Imported.");
    } catch {
      alert("Invalid JSON.");
    }
  }

  // -----------------------------
  // Optional: Send-to-Discord payload copy (UI-only)
  // -----------------------------
  const [targetChannelName, setTargetChannelName] = useState<string>("");
  const [mentionRoleNames, setMentionRoleNames] = useState<string>("");

  useEffect(() => {
    try {
      const d = loadDefaults();
      if (!d) return;
      if (!targetChannelName && d.global?.channelName) setTargetChannelName(String(d.global.channelName));
      if (!mentionRoleNames && d.global?.rolesCsv) setMentionRoleNames(String(d.global.rolesCsv));
    } catch {}
  }, []);

  const channelKeys = useMemo(() => Object.keys(chanLut || {}).sort(), [chanLut]);
  const roleKeys = useMemo(() => Object.keys(roleLut || {}).sort(), [roleLut]);

  const resolvedChannelId = useMemo(() => {
    const k = norm(targetChannelName);
    return k ? (chanLut[k] || "") : "";
  }, [targetChannelName, chanLut]);

  const mentionRoles = useMemo(() => {
      async function sendNowBot() {
        try {
          const a: any = (typeof alertToSend !== "undefined") ? (alertToSend as any) : null;
          if (!a) { window.alert("No alert selected to send."); return; }
          const channelId = String(a?.target?.channel?.id ?? a?.target?.channelId ?? a?.channelId ?? a?.channel?.id ?? "").trim();
          const content = String(a?.messageResolved ?? a?.message_resolved ?? a?.message ?? a?.content ?? a?.body ?? "");
          if (!channelId) { window.alert("Missing channel ID. Set it in Owner → Discord Mentions."); return; }
          if (!content.trim()) { window.alert("Missing message content."); return; }
          const r = await sendDiscordBot({ mode: "bot", channelId, content });
          if (!r.ok) { window.alert("Send failed: " + r.error); return; }
          window.alert("✅ Sent to Discord (bot).");
        } catch (e: any) {
          window.alert("Send failed: " + String(e?.message || e));
        }
      }
  }

return (mentionRoleNames || "")
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
  }, [mentionRoleNames]);

  const mentionRoleIds = useMemo(() => {
    return mentionRoles.map((r) => roleLut[norm(r)] || "").filter(Boolean);
  }, [mentionRoles, roleLut]);

  function reloadMentions() {
    setRoleStore(loadRoleStore());
    setChanStore(loadChannelStore());
    alert("Reloaded role/channel maps.");
  }

  const alertToSend = selected;

  const payloadTemplate = useMemo(() => {
    if (!alertToSend) return "Select an alert to build a Discord payload.";
    const tags = (alertToSend.tags || []).map((t) => `#${t}`).join(" ");
    const link = `${window.location.origin}/state/789/alerts`;
    const head = `${sevIcon(alertToSend.severity)} State 789 — ALERT (${sevLabel(alertToSend.severity)})`;
    return `${head}\n\n**${alertToSend.title}**\n${tags ? tags + "\n" : ""}\n${alertToSend.body}\n\n— ${alertToSend.authorLabel}\n${link}`;
  }, [alertToSend]);

  const payloadResolved = useMemo(() => resolveMentions(payloadTemplate, roleLut, chanLut), [payloadTemplate, roleLut, chanLut]);

  async function copyPayloadJson() {
    const payload = {
      version: 1,
      createdUtc: nowUtc(),
      source: "state789_alerts_ui",
      target: {
        channelName: targetChannelName || null,
        channelId: resolvedChannelId || null,
      },
      mentionRoles,
      mentionRoleIds,
      alert: alertToSend ? {
        id: alertToSend.id,
        title: alertToSend.title,
        tags: alertToSend.tags,
        authorLabel: alertToSend.authorLabel,
        severity: alertToSend.severity,
        updatedUtc: alertToSend.updatedUtc,
        pinned: alertToSend.pinned,
      } : null,
      messageRaw: payloadTemplate,
      messageResolved: payloadResolved,
      note: "UI-only payload. Bot/webhook posting comes later.",
    };

    const txt = JSON.stringify(payload, null, 2);
    try { await navigator.clipboard.writeText(txt); alert("Copied Discord payload JSON."); }
    catch { window.prompt("Copy payload JSON:", txt); }
  }

  async function copyResolvedMessage() {
    try { await navigator.clipboard.writeText(payloadResolved); alert("Copied Discord-ready message."); }
    catch { window.prompt("Copy message:", payloadResolved); }
  }

  return (
    <div style={{ padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>🧟 State 789 — Alerts</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={exportJson}>Export</button>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={importJson}>Import</button>
          <SupportBundleButton />
        </div>
      </div>

      <div className="zombie-card" style={{ marginTop: 12 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input className="zombie-input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" style={{ padding: "10px 12px", minWidth: 240, flex: 1 }} />

          <div style={{ opacity: 0.75, fontSize: 12 }}>Tag filter</div>
          <select className="zombie-input" value={tagFilter} onChange={(e) => setTagFilter(e.target.value)} style={{ padding: "10px 12px", minWidth: 180 }}>
            <option value="">(all)</option>
            {allTags.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>

          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={resetComposer}>+ New</button>
          <div style={{ opacity: 0.65, fontSize: 12, marginLeft: "auto" }}>
            localStorage: {KEY}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "minmax(320px, 1fr) minmax(360px, 1.2fr)", gap: 12 }}>
        <div className="zombie-card">
          <div style={{ fontWeight: 900 }}>Alerts ({alerts.length})</div>

          <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
            {alerts.map((a) => {
              const sel = a.id === selectedId;
              const preview = (a.body || "").slice(0, 120);
              return (
                <div
                  key={a.id}
                  onClick={() => setSelectedId(a.id)}
                  style={{
                    cursor: "pointer",
                    padding: 10,
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.10)",
                    background: sel ? "rgba(120,255,120,0.08)" : "rgba(0,0,0,0.20)",
                  }}
                >
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                    <div style={{ fontWeight: 900 }}>
                      {a.pinned ? "📌 " : ""}{sevIcon(a.severity)} {a.title}
                    </div>
                    <div style={{ marginLeft: "auto", opacity: 0.65, fontSize: 12 }}>{a.updatedUtc}</div>
                  </div>
                  <div style={{ opacity: 0.75, fontSize: 12, marginTop: 4 }}>
                    {(a.tags || []).map((x) => "#" + x).join(" ")}{a.authorLabel ? " • " + a.authorLabel : ""} • {sevLabel(a.severity)}
                  </div>
                  {preview ? (
                    <div style={{ opacity: 0.7, fontSize: 12, marginTop: 6 }}>
                      {preview}{preview.length >= 120 ? "…" : ""}
                    </div>
                  ) : null}

                  <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button className="zombie-btn" style={{ padding: "6px 8px", fontSize: 12 }} onClick={(ev) => { ev.stopPropagation(); togglePin(a.id); }}>
                      {a.pinned ? "Unpin" : "Pin"}
                    </button>
                    <button className="zombie-btn" style={{ padding: "6px 8px", fontSize: 12 }} onClick={(ev) => { ev.stopPropagation(); delAlert(a.id); }}>
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
            {alerts.length === 0 ? <div style={{ opacity: 0.75 }}>No alerts yet.</div> : null}
          </div>
        </div>

        <div>
          <div className="zombie-card">
            <div style={{ fontWeight: 900 }}>{selected ? "Edit Alert" : "New Alert"}</div>

            <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
              <div>
                <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Severity</div>
                <select className="zombie-input" value={severity} onChange={(e) => setSeverity(e.target.value as any)} style={{ width: "100%", padding: "10px 12px" }}>
                  <option value="info">Info</option>
                  <option value="warning">Warning</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div>
                <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Title</div>
                <input className="zombie-input" value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: "100%", padding: "10px 12px" }} />
              </div>

              <div>
                <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Tags (comma)</div>
                <input className="zombie-input" value={tagsCsv} onChange={(e) => setTagsCsv(e.target.value)} style={{ width: "100%", padding: "10px 12px" }} placeholder="nap,war,ops,shield" />
              </div>

              <div>
                <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Author label</div>
                <input className="zombie-input" value={authorLabel} onChange={(e) => setAuthorLabel(e.target.value)} style={{ width: "100%", padding: "10px 12px" }} placeholder="Leadership / Mod" />
              </div>

              <div>
                <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Body</div>
                <textarea className="zombie-input" value={body} onChange={(e) => setBody(e.target.value)} style={{ width: "100%", minHeight: 160, padding: "10px 12px" }} />
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={upsertAlert}>
                  {selected ? "Save" : "Publish"}
                </button>
                {selected ? (
                  <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => togglePin(selected.id)}>
                    {selected.pinned ? "Unpin" : "Pin"}
                  </button>
                ) : null}
                <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={resetComposer}>Clear</button>
              </div>
            </div>

            <div style={{ marginTop: 10, opacity: 0.65, fontSize: 12 }}>
              UI-only alerts. Later we’ll move to Supabase + RLS + realtime.
            </div>
          </div>

          <div className="zombie-card" style={{ marginTop: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ fontWeight: 900 }}>📣 Optional: Send-to-Discord (payload copy)</div>
              <button className="zombie-btn" style={{ padding: "8px 10px", fontSize: 12 }} onClick={reloadMentions}>Reload Mentions</button>
            </div>

            <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ opacity: 0.75, fontSize: 12 }}>Channel</div>
              <select className="zombie-input" value={targetChannelName} onChange={(e) => setTargetChannelName(e.target.value)} style={{ padding: "10px 12px", minWidth: 240 }}>
                <option value="">(none)</option>
                {channelKeys.map((k) => (
                  <option key={k} value={k}>{k}{chanLut[k] ? "" : " (no id yet)"}</option>
                ))}
              </select>

              <div style={{ opacity: 0.75, fontSize: 12 }}>Mention Roles (comma)</div>
              <input className="zombie-input" value={mentionRoleNames} onChange={(e) => setMentionRoleNames(e.target.value)} placeholder="Leadership,StateLeadership" style={{ padding: "10px 12px", minWidth: 260 }} />

              <div style={{ opacity: 0.65, fontSize: 12 }}>
                Mapped roles: {roleKeys.length} • Mapped channels: {channelKeys.length}
              </div>
            </div>

            <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={copyPayloadJson} disabled={!alertToSend}>
                Copy Payload JSON
                <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={sendNowBot} disabled={!alertToSend}>Send Now (Bot)</button>
              </button>
              <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={copyResolvedMessage} disabled={!alertToSend}>
                Copy Discord-ready Message
              </button>
            </div>

            {!alertToSend ? <div style={{ marginTop: 10, opacity: 0.75 }}>Select an alert to enable payload copy.</div> : null}

            <div style={{ marginTop: 12 }}>
              <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Preview (resolved)</div>
              <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 12, padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.20)" }}>
{payloadResolved}
              </pre>
              <div style={{ marginTop: 8, opacity: 0.65, fontSize: 12 }}>
                This does not post to Discord yet — it prepares the exact payload your bot/edge-function can send later.
              </div>
              <div style={{ marginTop: 6, opacity: 0.6, fontSize: 12 }}>
                Channel ID: {resolvedChannelId || "(missing)"} (set in Owner → Discord Mentions)
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
