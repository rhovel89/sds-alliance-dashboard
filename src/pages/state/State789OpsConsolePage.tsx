import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";

/**
 * NOTE:
 * - Discussion widgets read pinned items from your Discussion V2 meta store.
 * - Alerts widgets read pinned items from Alerts Center V2 store.
 *
 * If your discussion base key differs, update POSTS_KEY + META_KEY below.
 */
const POSTS_KEY = "sad_state_789_discussion_v1";
const META_KEY = "sad_state_789_discussion_v1_meta_v1";

const LS_ALERTS = "sad_state_789_alerts_v2";
const LS_OPS = "sad_state_789_ops_console_v1";

type AnyPost = any;

type MetaStore = {
  version: 1;
  updatedAt: string;
  pinnedKeys: string[];
  tagsByKey: Record<string, string[]>;
};

type Severity = "info" | "warning" | "critical";

type AlertItem = {
  id: string;
  createdAt: string;
  createdBy: string;
  severity: Severity;
  title: string;
  body: string;
  tags: string[];
  pinned: boolean;
  acknowledgedBy: string[];
};

type AlertsStore = {
  version: 1;
  updatedAt: string;
  items: AlertItem[];
};

type OpsStore = {
  version: 1;
  updatedAt: string;
  opsName: string;
  nextOpsAtUtc: string; // ISO
  checklist: Array<{ id: string; text: string; done: boolean }>;
  notes: string;
};

function nowIso() {
  return new Date().toISOString();
}

function safeJsonParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveLS(key: string, obj: any) {
  const raw = JSON.stringify(obj, null, 2);
  localStorage.setItem(key, raw);
  try {
    // eslint-disable-next-line no-new
    const ev = new StorageEvent("storage", { key, newValue: raw });
    window.dispatchEvent(ev);
  } catch {
    window.dispatchEvent(new CustomEvent("sad:localstorage", { detail: { key, newValue: raw } }));
  }
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    alert("Copied to clipboard");
  } catch {
    alert("Copy failed (clipboard permission).");
  }
}

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function getPostKey(p: AnyPost, idx: number): string {
  const maybe = p?.id ?? p?.post_id ?? p?.key ?? p?.uuid ?? null;
  if (maybe) return String(maybe);
  return String(idx);
}

function formatPost(p: AnyPost): { title: string; body: string; author: string; at: string } {
  const author = String(p?.author ?? p?.user ?? p?.from ?? "Unknown");
  const at = String(p?.at ?? p?.created_at ?? p?.time ?? "");
  const title = String(p?.title ?? p?.subject ?? "").trim();

  const body =
    (typeof p?.body === "string" && p.body) ||
    (typeof p?.text === "string" && p.text) ||
    (typeof p?.message === "string" && p.message) ||
    (typeof p === "string" ? p : JSON.stringify(p, null, 2));

  return { title: title || "Post", body, author, at };
}

function severityLabel(s: Severity) {
  if (s === "critical") return "CRITICAL";
  if (s === "warning") return "WARNING";
  return "INFO";
}

function discordAlert(a: AlertItem) {
  const sev = severityLabel(a.severity);
  const tags = a.tags?.length ? `\nTags: ${a.tags.map((t) => `#${t}`).join(" ")}` : "";
  return `**[${sev}] ${a.title}**\n${a.body}${tags}`;
}

function defaultOps(): OpsStore {
  return {
    version: 1,
    updatedAt: nowIso(),
    opsName: "State Ops",
    nextOpsAtUtc: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    checklist: [
      { id: uid("c"), text: "Review pinned alerts", done: false },
      { id: uid("c"), text: "Review pinned discussion items", done: false },
      { id: uid("c"), text: "Post current ops broadcast (copy payload)", done: false },
    ],
    notes: "",
  };
}

function formatCountdown(targetIso: string) {
  const t = new Date(targetIso).getTime();
  const now = Date.now();
  const diff = t - now;
  const sign = diff < 0 ? "-" : "";
  const d = Math.abs(diff);

  const hh = Math.floor(d / (1000 * 60 * 60));
  const mm = Math.floor((d % (1000 * 60 * 60)) / (1000 * 60));
  const ss = Math.floor((d % (1000 * 60)) / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${sign}${pad(hh)}:${pad(mm)}:${pad(ss)}`;
}

export default function State789OpsConsolePage() {
  const [ops, setOps] = useState<OpsStore>(() => safeJsonParse<OpsStore>(localStorage.getItem(LS_OPS), defaultOps()));
  const [tick, setTick] = useState(0);

  // Timer tick (also causes periodic re-read of localStorage-based widgets)
  React.useEffect(() => {
    const id = window.setInterval(() => setTick((x) => x + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  // Discussion
  const postsRaw = localStorage.getItem(POSTS_KEY);
  const posts = useMemo(() => {
    const parsed = safeJsonParse<any>(postsRaw, null);
    if (Array.isArray(parsed)) return parsed as AnyPost[];
    if (parsed && typeof parsed === "object" && Array.isArray((parsed as any).posts)) return (parsed as any).posts as AnyPost[];
    return [] as AnyPost[];
  }, [postsRaw]);

  const metaRaw = localStorage.getItem(META_KEY);
  const meta = useMemo(() => {
    return safeJsonParse<MetaStore>(metaRaw, {
      version: 1,
      updatedAt: nowIso(),
      pinnedKeys: [],
      tagsByKey: {},
    });
  }, [metaRaw]);

  const pinnedDiscussion = useMemo(() => {
    const normalized = posts.map((p, idx) => {
      const key = getPostKey(p, idx);
      return { key, p, view: formatPost(p) };
    });
    const set = new Set(meta.pinnedKeys ?? []);
    return normalized.filter((x) => set.has(x.key));
  }, [posts, meta]);

  // Alerts
  const alertsRaw = localStorage.getItem(LS_ALERTS);
  const alertsStore = useMemo(() => {
    return safeJsonParse<AlertsStore>(alertsRaw, { version: 1, updatedAt: nowIso(), items: [] });
  }, [alertsRaw, tick]); // tick ensures refresh if storage changes but string doesn't (rare)

  const pinnedAlerts = useMemo(() => {
    return (alertsStore.items ?? []).filter((a) => !!a.pinned);
  }, [alertsStore]);

  const unackedCount = useMemo(() => {
    return (alertsStore.items ?? []).filter((a) => (a.acknowledgedBy ?? []).length === 0).length;
  }, [alertsStore]);

  function persistOps(next: OpsStore) {
    const withTs: OpsStore = { ...next, updatedAt: nowIso() };
    setOps(withTs);
    saveLS(LS_OPS, withTs);
  }

  function setNextOpsUtc(v: string) {
    persistOps({ ...ops, nextOpsAtUtc: v });
  }

  function toggleChecklist(id: string) {
    persistOps({
      ...ops,
      checklist: ops.checklist.map((c) => (c.id === id ? { ...c, done: !c.done } : c)),
    });
  }

  function addChecklist() {
    const t = prompt("Checklist item:")?.trim();
    if (!t) return;
    persistOps({ ...ops, checklist: [...ops.checklist, { id: uid("c"), text: t, done: false }] });
  }

  function clearDone() {
    persistOps({ ...ops, checklist: ops.checklist.filter((c) => !c.done) });
  }

  const countdown = formatCountdown(ops.nextOpsAtUtc);
  const utc = new Date(ops.nextOpsAtUtc).toISOString().replace(".000Z", "Z");
  const local = new Date(ops.nextOpsAtUtc).toLocaleString();

  return (
    <div style={{ padding: 16, maxWidth: 1200, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 900 }}>State 789 Ops Console</h1>
      <p style={{ opacity: 0.8, marginTop: 6 }}>UI-only command center with pinned alerts + pinned discussion.</p>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12, alignItems: "center" }}>
        <Link to="/state/789/alerts">Alerts (V2)</Link>
        <Link to="/state/789/alerts">Alerts (Legacy)</Link>
        <Link to="/state/789/discussion">Discussion (V2)</Link>
        <Link to="/state/789/achievements">Achievements</Link>
        <Link to="/owner/broadcast">Broadcast Composer</Link>
        <Link to="/owner/data-vault">Data Vault</Link>

        <span style={{ opacity: 0.75, marginLeft: 8 }}>
          Unacked alerts: <b>{unackedCount}</b>
        </span>
      </div>

      <hr style={{ margin: "16px 0", opacity: 0.3 }} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Timer */}
        <div style={{ border: "1px solid #333", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: 12, borderBottom: "1px solid #333", fontWeight: 800 }}>Ops Timer</div>
          <div style={{ padding: 12, display: "grid", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ opacity: 0.75, fontSize: 12 }}>Countdown</div>
                <div style={{ fontSize: 28, fontWeight: 900 }}>{countdown}</div>
              </div>
              <div>
                <div style={{ opacity: 0.75, fontSize: 12 }}>UTC</div>
                <div style={{ fontWeight: 800 }}>{utc}</div>
                <div style={{ opacity: 0.75, fontSize: 12, marginTop: 6 }}>Local</div>
                <div style={{ fontWeight: 800 }}>{local}</div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <label style={{ opacity: 0.8 }}>Next ops (UTC)</label>
              <input
                type="datetime-local"
                onChange={(e) => {
                  const v = e.target.value;
                  if (!v) return;
                  const d = new Date(v);
                  setNextOpsUtc(d.toISOString());
                }}
              />
              <button onClick={() => copyToClipboard(JSON.stringify(ops, null, 2))}>Copy ops JSON</button>
            </div>
          </div>
        </div>

        {/* Checklist */}
        <div style={{ border: "1px solid #333", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: 12, borderBottom: "1px solid #333", fontWeight: 800 }}>Checklist</div>
          <div style={{ padding: 12 }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
              <button onClick={addChecklist}>+ Add</button>
              <button onClick={clearDone}>Clear done</button>
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              {ops.checklist.map((c) => (
                <label key={c.id} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <input type="checkbox" checked={c.done} onChange={() => toggleChecklist(c.id)} />
                  <span style={{ textDecoration: c.done ? "line-through" : "none", opacity: c.done ? 0.7 : 1 }}>
                    {c.text}
                  </span>
                </label>
              ))}
              {ops.checklist.length === 0 ? <div style={{ opacity: 0.7 }}>No checklist items.</div> : null}
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={{ opacity: 0.75, fontSize: 12 }}>Notes</div>
              <textarea
                value={ops.notes}
                onChange={(e) => persistOps({ ...ops, notes: e.target.value })}
                rows={3}
                style={{ width: "100%" }}
                placeholder="Ops notes…"
              />
            </div>
          </div>
        </div>
      </div>

      <hr style={{ margin: "16px 0", opacity: 0.3 }} />

      {/* Widgets row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Pinned Alerts */}
        <div style={{ border: "1px solid #333", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: 12, borderBottom: "1px solid #333", fontWeight: 800 }}>
            Pinned Alerts ({pinnedAlerts.length})
          </div>

          <div style={{ padding: 12, display: "grid", gap: 12 }}>
            {pinnedAlerts.length === 0 ? (
              <div style={{ opacity: 0.75 }}>
                No pinned alerts. Pin alerts in <Link to="/state/789/alerts">Alerts (V2)</Link>.
              </div>
            ) : (
              pinnedAlerts.slice(0, 6).map((a) => (
                <div key={a.id} style={{ border: "1px solid #222", borderRadius: 10, padding: 12 }}>
                  <div style={{ fontWeight: 900 }}>
                    [{severityLabel(a.severity)}] {a.title}
                  </div>
                  <div style={{ opacity: 0.75, fontSize: 12, marginTop: 4 }}>
                    {a.createdBy} • {new Date(a.createdAt).toLocaleString()}
                  </div>
                  <div style={{ whiteSpace: "pre-wrap", marginTop: 10 }}>{a.body}</div>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                    <button onClick={() => copyToClipboard(discordAlert(a))}>Copy Discord</button>
                    <button onClick={() => copyToClipboard(JSON.stringify(a, null, 2))}>Copy JSON</button>
                  </div>

                  <div style={{ opacity: 0.75, marginTop: 8, fontSize: 12 }}>
                    Ack: {(a.acknowledgedBy ?? []).length ? a.acknowledgedBy.join(", ") : "(none)"}
                  </div>
                </div>
              ))
            )}

            {pinnedAlerts.length > 6 ? (
              <div style={{ opacity: 0.75 }}>
                Showing 6 of {pinnedAlerts.length}. Open <Link to="/state/789/alerts">Alerts (V2)</Link> for more.
              </div>
            ) : null}
          </div>
        </div>

        {/* Pinned Discussion */}
        <div style={{ border: "1px solid #333", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: 12, borderBottom: "1px solid #333", fontWeight: 800 }}>
            Pinned Discussion ({pinnedDiscussion.length})
          </div>

          <div style={{ padding: 12, display: "grid", gap: 12 }}>
            {pinnedDiscussion.length === 0 ? (
              <div style={{ opacity: 0.75 }}>
                No pinned posts. Pin posts in <Link to="/state/789/discussion">Discussion (V2)</Link>.
                <div style={{ opacity: 0.65, marginTop: 6, fontSize: 12 }}>
                  Using POSTS_KEY="{POSTS_KEY}" and META_KEY="{META_KEY}".
                </div>
              </div>
            ) : (
              pinnedDiscussion.slice(0, 6).map((x) => (
                <div key={x.key} style={{ border: "1px solid #222", borderRadius: 10, padding: 12 }}>
                  <div style={{ fontWeight: 900 }}>{x.view.title}</div>
                  <div style={{ opacity: 0.75, fontSize: 12, marginTop: 4 }}>
                    {x.view.author} {x.view.at ? "• " + x.view.at : ""}
                  </div>
                  <div style={{ whiteSpace: "pre-wrap", marginTop: 10 }}>{x.view.body}</div>
                  <div style={{ marginTop: 10 }}>
                    <button onClick={() => copyToClipboard(x.view.body)}>Copy body</button>
                  </div>
                </div>
              ))
            )}

            {pinnedDiscussion.length > 6 ? (
              <div style={{ opacity: 0.75 }}>
                Showing 6 of {pinnedDiscussion.length}. Open <Link to="/state/789/discussion">Discussion (V2)</Link> for more.
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div style={{ opacity: 0.55, marginTop: 12, fontSize: 12 }}>tick: {tick}</div>
    </div>
  );
}

