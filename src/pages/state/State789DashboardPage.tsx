import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import SupportBundleButton from "../../components/system/SupportBundleButton";
import { RealtimeStatusBadge } from "../../components/system/RealtimeStatusBadge";

const NOTES_KEY = "sad_state789_notes_v1";
const ALERTS_KEY = "sad_state789_alerts_v1";
const DISCUSSION_KEY = "sad_state789_discussion_v1";

type NotesStore = { version: 1; updatedUtc: string; notes: string };

function nowUtc() {
  return new Date().toISOString();
}

function loadNotes(): NotesStore {
  try {
    const raw = localStorage.getItem(NOTES_KEY);
    if (raw) {
      const s = JSON.parse(raw) as NotesStore;
      if (s && s.version === 1) return s;
    }
  } catch {}
  return { version: 1, updatedUtc: nowUtc(), notes: "" };
}

function saveNotes(s: NotesStore) {
  try { localStorage.setItem(NOTES_KEY, JSON.stringify(s)); } catch {}
}

function readAny(key: string): any {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeAny(key: string, value: any) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

function Card(props: { title: string; children: React.ReactNode }) {
  return (
    <div className="zombie-card" style={{ marginTop: 12 }}>
      <div style={{ fontWeight: 900 }}>{props.title}</div>
      <div style={{ marginTop: 10 }}>{props.children}</div>
    </div>
  );
}

export default function State789DashboardPage() {
  const nav = useNavigate();
  const [store, setStore] = useState<NotesStore>(() => loadNotes());

  useEffect(() => saveNotes(store), [store]);

  const lastUtc = useMemo(() => store.updatedUtc, [store.updatedUtc]);

  async function exportBundle() {
    const payload = {
      version: 1,
      exportedUtc: nowUtc(),
      state: "789",
      notes: store,
      alerts: readAny(ALERTS_KEY),
      discussion: readAny(DISCUSSION_KEY),
    };
    const txt = JSON.stringify(payload, null, 2);
    try {
      await navigator.clipboard.writeText(txt);
      window.alert("Copied State 789 bundle JSON.");
    } catch {
      window.prompt("Copy bundle JSON:", txt);
    }
  }

  function importBundle() {
    const raw = window.prompt("Paste State 789 bundle JSON:");
    if (!raw) return;
    try {
      const p = JSON.parse(raw);
      if (!p || p.version !== 1) throw new Error("Invalid");
      if (p.notes && p.notes.version === 1) {
        setStore({
          version: 1,
          updatedUtc: nowUtc(),
          notes: String(p.notes.notes || ""),
        });
      }
      if (p.alerts) writeAny(ALERTS_KEY, p.alerts);
      if (p.discussion) writeAny(DISCUSSION_KEY, p.discussion);
      window.alert("Imported bundle. (Reload Alerts/Discussion pages if open.)");
    } catch {
      window.alert("Invalid JSON.");
    }
  }

  return (
    <div style={{ padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>🧟 State 789 Dashboard</h2>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <RealtimeStatusBadge allianceCode={null} />
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={exportBundle}>Export Bundle</button>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={importBundle}>Import Bundle</button>
          <SupportBundleButton />
        </div>
      </div>

      <Card title="Quick Actions">
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => nav("/state/789/alerts")}>🚨 Alerts</button>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => nav("/state/789/discussion")}>💬 Discussion</button>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => nav("/alliances")}>🗂️ Alliances</button>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => nav("/dashboard")}>⚡ Dashboards</button>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => nav("/owner")}>🧰 Owner</button>
        </div>
      </Card>

      <Card title="State Notes (UI-only)">
        <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 8 }}>
          Autosaved to localStorage. Last updated (UTC): {lastUtc}
        </div>
        <textarea
          className="zombie-input"
          value={store.notes}
          onChange={(e) => setStore({ version: 1, updatedUtc: nowUtc(), notes: e.target.value })}
          placeholder="State notes… reminders… leadership plans…"
          style={{ width: "100%", minHeight: 220, padding: "10px 12px" }}
        />
        <div style={{ marginTop: 10, opacity: 0.65, fontSize: 12 }}>
          Export/Import Bundle includes Notes + Alerts + Discussion.
        </div>
      </Card>
    </div>
  );
}