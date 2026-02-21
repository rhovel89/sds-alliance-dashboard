import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import SupportBundleButton from "../../components/system/SupportBundleButton";

type ChecklistItem = { id: string; text: string; done: boolean; createdUtc: string };

type Store = {
  version: 1;
  updatedUtc: string;
  targetUtc: string | null;
  label: string;
  targetAlliance: string; // NEW: feeds Broadcast composer
  checklist: ChecklistItem[];
  announcementTemplate: string;
};

type DirItem = { id: string; code: string; name: string; state: string };

const KEY = "sad_live_ops_v1";
const DIR_KEY = "sad_alliance_directory_v1";
const PREFILL_KEY = "sad_broadcast_prefill_v1";

function uid() { return Math.random().toString(16).slice(2) + "-" + Date.now().toString(16); }
function nowUtc() { return new Date().toISOString(); }

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

function load(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as Store;
      if (s && s.version === 1 && Array.isArray(s.checklist)) {
        return { ...s, targetAlliance: (s.targetAlliance || "WOC").toUpperCase() };
      }
    }
  } catch {}
  return {
    version: 1,
    updatedUtc: nowUtc(),
    targetUtc: null,
    label: "Next Op",
    targetAlliance: "WOC",
    checklist: [],
    announcementTemplate:
      "🚨 {{Leadership}} LIVE OPS — {{opLabel}}\n\n" +
      "⏰ Starts: {{opUtc}} (UTC) | Local: {{opLocal}}\n" +
      "📍 Rally: {{#announcements}}\n\n" +
      "✅ Checklist:\n{{checklist}}\n",
  };
}

function save(s: Store) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {}
}

function fmtCountdown(ms: number): string {
  if (!isFinite(ms)) return "—";
  const neg = ms < 0;
  const x = Math.abs(ms);
  const s = Math.floor(x / 1000);
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const str = `${hh.toString().padStart(2, "0")}:${mm.toString().padStart(2, "0")}:${ss.toString().padStart(2, "0")}`;
  return neg ? `+${str} past` : str;
}

function safeParseUtc(input: string): Date | null {
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

export default function OwnerLiveOpsPage() {
  const nav = useNavigate();
  const [store, setStore] = useState<Store>(() => load());
  const [tick, setTick] = useState(0);
  const [dir, setDir] = useState<DirItem[]>(() => loadDir());

  useEffect(() => save(store), [store]);

  useEffect(() => {
    const id = window.setInterval(() => setTick((x) => x + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const targetDate = useMemo(() => (store.targetUtc ? safeParseUtc(store.targetUtc) : null), [store.targetUtc]);
  const now = useMemo(() => new Date(), [tick]);
  const msLeft = useMemo(() => (targetDate ? targetDate.getTime() - now.getTime() : NaN), [targetDate, now]);

  const localString = useMemo(() => (targetDate ? targetDate.toLocaleString() : "—"), [targetDate]);
  const utcString = useMemo(() => (targetDate ? targetDate.toISOString() : "—"), [targetDate]);

  const checklistText = useMemo(() => {
    const items = store.checklist || [];
    if (!items.length) return "- (none)";
    return items.map((it) => `${it.done ? "✅" : "⬜️"} ${it.text}`).join("\n");
  }, [store.checklist]);

  function setTarget(v: string) {
    setStore((p) => ({ ...p, updatedUtc: nowUtc(), targetUtc: v }));
  }

  function addItem(text: string) {
    const t = (text || "").trim();
    if (!t) return;
    setStore((p) => ({
      ...p,
      updatedUtc: nowUtc(),
      checklist: [{ id: uid(), text: t, done: false, createdUtc: nowUtc() }, ...(p.checklist || [])],
    }));
  }

  function toggle(id: string) {
    setStore((p) => ({
      ...p,
      updatedUtc: nowUtc(),
      checklist: (p.checklist || []).map((x) => (x.id === id ? { ...x, done: !x.done } : x)),
    }));
  }

  function remove(id: string) {
    if (!confirm("Remove checklist item?")) return;
    setStore((p) => ({
      ...p,
      updatedUtc: nowUtc(),
      checklist: (p.checklist || []).filter((x) => x.id !== id),
    }));
  }

  async function exportJson() {
    const txt = JSON.stringify({ ...store, exportedUtc: nowUtc() }, null, 2);
    try { await navigator.clipboard.writeText(txt); alert("Copied Live Ops export JSON."); }
    catch { window.prompt("Copy:", txt); }
  }

  function importJson() {
    const raw = window.prompt("Paste Live Ops export JSON:");
    if (!raw) return;
    try {
      const p = JSON.parse(raw) as Store;
      if (!p || p.version !== 1) throw new Error("Invalid");
      setStore({ ...p, updatedUtc: nowUtc(), targetAlliance: String(p.targetAlliance || "WOC").toUpperCase() });
      alert("Imported.");
    } catch {
      alert("Invalid JSON.");
    }
  }

  function generateAnnouncement(): string {
    const template = store.announcementTemplate || "";
    const out = template
      .replace(/\{\{\s*opLabel\s*\}\}/g, store.label || "Op")
      .replace(/\{\{\s*opUtc\s*\}\}/g, utcString)
      .replace(/\{\{\s*opLocal\s*\}\}/g, localString)
      .replace(/\{\{\s*checklist\s*\}\}/g, checklistText);
    return out;
  }

  async function copyAnnouncement() {
    const msg = generateAnnouncement();
    try { await navigator.clipboard.writeText(msg); alert("Copied announcement (with placeholders)."); }
    catch { window.prompt("Copy announcement:", msg); }
  }

  function openInBroadcast() {
    const msg = generateAnnouncement();
    const alliance = String(store.targetAlliance || "WOC").toUpperCase();

    const payload = {
      version: 1,
      createdUtc: nowUtc(),
      scope: "alliance",
      allianceCode: alliance,
      templateName: `LiveOps: ${store.label || "Op"} (${utcString === "—" ? "no-time" : utcString.slice(0, 16)}Z)`,
      body: msg,
    };

    try { localStorage.setItem(PREFILL_KEY, JSON.stringify(payload)); } catch {}
    nav("/owner/broadcast");
  }

  const [newItem, setNewItem] = useState("");

  return (
    <div style={{ padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>🧟 Owner — Live Ops (UI-only)</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={exportJson}>Export</button>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={importJson}>Import</button>
          <SupportBundleButton />
        </div>
      </div>

      <div className="zombie-card" style={{ marginTop: 12 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ opacity: 0.75, fontSize: 12 }}>Target Alliance</div>
          <select
            className="zombie-input"
            value={store.targetAlliance}
            onChange={(e) => setStore((p) => ({ ...p, updatedUtc: nowUtc(), targetAlliance: e.target.value.toUpperCase() }))}
            style={{ padding: "10px 12px" }}
          >
            {(dir.length ? dir : [{ id: "x", code: "WOC", name: "WOC", state: "789" }]).map((d) => (
              <option key={d.code} value={d.code}>{d.code} — {d.name}</option>
            ))}
          </select>

          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => setDir(loadDir())}>Reload Directory</button>

          <div style={{ marginLeft: "auto", display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={openInBroadcast}>Open in Broadcast</button>
            <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={copyAnnouncement}>Copy Announcement</button>
          </div>
        </div>

        <div style={{ marginTop: 8, opacity: 0.7, fontSize: 12 }}>
          “Open in Broadcast” will prefill /owner/broadcast with this announcement + selected alliance.
        </div>
      </div>

      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "minmax(320px, 1fr) minmax(320px, 1.1fr)", gap: 12 }}>
        <div className="zombie-card">
          <div style={{ fontWeight: 900 }}>⏱️ Ops Timer</div>

          <div style={{ marginTop: 10 }}>
            <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Op Label</div>
            <input className="zombie-input" value={store.label} onChange={(e) => setStore((p) => ({ ...p, updatedUtc: nowUtc(), label: e.target.value }))} style={{ width: "100%", padding: "10px 12px" }} />
          </div>

          <div style={{ marginTop: 10 }}>
            <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Target UTC (ISO or "YYYY-MM-DD HH:mm")</div>
            <input
              className="zombie-input"
              value={store.targetUtc || ""}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="2026-02-21 18:00"
              style={{ width: "100%", padding: "10px 12px" }}
            />
          </div>

          <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
            <div style={{ fontWeight: 900, fontSize: 20 }}>⏳ {isFinite(msLeft) ? fmtCountdown(msLeft) : "—"}</div>
            <div style={{ opacity: 0.8, fontSize: 12 }}>UTC: {utcString}</div>
            <div style={{ opacity: 0.8, fontSize: 12 }}>Local: {localString}</div>
          </div>

          <div style={{ marginTop: 10, opacity: 0.65, fontSize: 12 }}>
            Timer is client-side; UTC is the source-of-truth value you paste.
          </div>
        </div>

        <div className="zombie-card">
          <div style={{ fontWeight: 900 }}>✅ Ops Checklist</div>

          <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input className="zombie-input" value={newItem} onChange={(e) => setNewItem(e.target.value)} placeholder="Add checklist item…" style={{ flex: 1, minWidth: 220, padding: "10px 12px" }} />
            <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => { addItem(newItem); setNewItem(""); }}>Add</button>
          </div>

          <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
            {(store.checklist || []).map((it) => (
              <div key={it.id} style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.20)" }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <input type="checkbox" checked={it.done} onChange={() => toggle(it.id)} />
                  <div style={{ fontWeight: 900 }}>{it.text}</div>
                  <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                    <button className="zombie-btn" style={{ padding: "6px 8px", fontSize: 12 }} onClick={() => remove(it.id)}>Remove</button>
                  </div>
                </div>
                <div style={{ opacity: 0.6, fontSize: 11, marginTop: 6 }}>UTC: {it.createdUtc}</div>
              </div>
            ))}
            {(store.checklist || []).length === 0 ? <div style={{ opacity: 0.75 }}>No checklist items yet.</div> : null}
          </div>

          <div style={{ marginTop: 10, opacity: 0.65, fontSize: 12 }}>
            UI-only; later we can store this per-alliance and share with assistants.
          </div>
        </div>
      </div>

      <div className="zombie-card" style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 900 }}>📣 Announcement Template (placeholders)</div>

        <div style={{ marginTop: 10 }}>
          <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>
            Supports {"{{opLabel}}"} {"{{opUtc}}"} {"{{opLocal}}"} {"{{checklist}}"} and role/channel placeholders like {"{{Leadership}}"} and {"{{#announcements}}"}.
          </div>
          <textarea
            className="zombie-input"
            value={store.announcementTemplate}
            onChange={(e) => setStore((p) => ({ ...p, updatedUtc: nowUtc(), announcementTemplate: e.target.value }))}
            style={{ width: "100%", minHeight: 140, padding: "10px 12px" }}
          />
        </div>

        <div style={{ marginTop: 12 }}>
          <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Preview</div>
          <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 12, padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.20)" }}>
{generateAnnouncement()}
          </pre>
        </div>

        <div style={{ marginTop: 10, opacity: 0.65, fontSize: 12 }}>
          Use “Open in Broadcast” to resolve role/channel mentions via your Discord settings maps.
        </div>
      </div>
    </div>
  );
}