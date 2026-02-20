import React, { useEffect, useMemo, useState } from "react";
import { RealtimeStatusBadge } from "../../components/system/RealtimeStatusBadge";

type Note = { id: string; text: string; createdUtc: string };

const NOTES_KEY = "sad_state789_notes_v1";

function uid() {
  return Math.random().toString(16).slice(2) + "-" + Date.now().toString(16);
}

function nowUtc() {
  return new Date().toISOString();
}

function loadNotes(): Note[] {
  try {
    const raw = localStorage.getItem(NOTES_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr as Note[];
  } catch {
    return [];
  }
}

function saveNotes(n: Note[]) {
  try {
    localStorage.setItem(NOTES_KEY, JSON.stringify(n));
  } catch {}
}

export default function State789DashboardPage() {
  const title = useMemo(() => "🧟 State 789 Dashboard", []);
  const [notes, setNotes] = useState<Note[]>(() => loadNotes());
  const [text, setText] = useState("");

  useEffect(() => {
    saveNotes(notes);
  }, [notes]);

  function addNote() {
    const t = text.trim();
    if (!t) return;
    setNotes((p) => [{ id: uid(), text: t, createdUtc: nowUtc() }, ...(p || [])]);
    setText("");
  }

  function del(id: string) {
    if (!window.confirm("Delete this note?")) return;
    setNotes((p) => (p || []).filter((x) => x.id !== id));
  }

  async function exportNotes() {
    const payload = { version: 1, exportedUtc: nowUtc(), notes };
    const txt = JSON.stringify(payload, null, 2);
    try {
      await navigator.clipboard.writeText(txt);
      window.alert("Copied notes export JSON.");
    } catch {
      window.prompt("Copy notes JSON:", txt);
    }
  }

  function importNotes() {
    const raw = window.prompt("Paste notes export JSON:");
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      const arr = parsed.notes;
      if (!Array.isArray(arr)) throw new Error("Invalid notes array");
      const cleaned: Note[] = arr
        .filter((x: any) => x && typeof x.text === "string")
        .map((x: any) => ({ id: String(x.id || uid()), text: String(x.text), createdUtc: String(x.createdUtc || nowUtc()) }));
      setNotes(cleaned);
      window.alert("Imported notes.");
    } catch {
      window.alert("Import failed (invalid JSON).");
    }
  }

  return (
    <div style={{ padding: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <h2 style={{ margin: 0 }}>{title}</h2>
        <RealtimeStatusBadge allianceCode={null} />
      </div>

      <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
        <div className="zombie-card">
          <div style={{ fontWeight: 900, marginBottom: 8 }}>📝 State Notes (UI-only)</div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={exportNotes}>Export</button>
            <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={importNotes}>Import</button>
          </div>

          <div style={{ marginTop: 10 }}>
            <textarea
              className="zombie-input"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Write a state note…"
              style={{ width: "100%", minHeight: 90, padding: "10px 12px" }}
            />
            <button className="zombie-btn" style={{ marginTop: 10, padding: "10px 12px" }} onClick={addNote}>
              Add Note
            </button>
          </div>

          <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
            {notes.length === 0 ? <div style={{ opacity: 0.75 }}>No notes yet.</div> : null}
            {notes.map((n) => (
              <div key={n.id} style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.20)" }}>
                <div style={{ whiteSpace: "pre-wrap" }}>{n.text}</div>
                <div style={{ marginTop: 8, opacity: 0.6, fontSize: 11 }}>UTC: {n.createdUtc}</div>
                <button className="zombie-btn" style={{ marginTop: 8, padding: "6px 8px", fontSize: 12 }} onClick={() => del(n.id)}>Delete</button>
              </div>
            ))}
          </div>
        </div>

        <div className="zombie-card">
          <div style={{ fontWeight: 900, marginBottom: 8 }}>🚨 State Alerts</div>
          <div style={{ opacity: 0.85, fontSize: 13, lineHeight: "18px" }}>
            Placeholder widget. Later: state-wide announcements + pings + approvals workflow.
          </div>
        </div>

        <div className="zombie-card">
          <div style={{ fontWeight: 900, marginBottom: 8 }}>🗓️ Upcoming State Events</div>
          <div style={{ opacity: 0.85, fontSize: 13, lineHeight: "18px" }}>
            Placeholder widget. Later: connect to state calendar + alliance feeds (RLS + realtime).
          </div>
        </div>
      </div>
    </div>
  );
}