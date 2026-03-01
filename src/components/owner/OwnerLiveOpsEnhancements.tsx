import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

type ChecklistItem = { id: string; text: string; done: boolean; createdUtc: string };

const CHECKLIST_KEY = "sad_ops_checklist_v1";
const ANNOUNCE_KEY = "sad_ops_announce_draft_v1";
const TIMER_KEY = "sad_ops_timer_v1";

function uid() {
  return Math.random().toString(16).slice(2) + "-" + Date.now().toString(16);
}

function loadJson<T>(key: string, fallback: T): T {
  try {
    const s = localStorage.getItem(key);
    if (!s) return fallback;
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

function saveJson(key: string, v: any) {
  try { localStorage.setItem(key, JSON.stringify(v)); } catch {}
}

function toUnixSeconds(d: Date) {
  return Math.floor(d.getTime() / 1000);
}

export function OwnerLiveOpsEnhancements() {
  const nav = useNavigate();
  // -------- Announcement generator --------
  const [targetAlliance, setTargetAlliance] = useState<string>("WOC");
  const [title, setTitle] = useState<string>("");
  const [body, setBody] = useState<string>("");
  const [roleToken, setRoleToken] = useState<string>("@Leadership");
  const [whenLocal, setWhenLocal] = useState<string>(""); // yyyy-mm-ddThh:mm

  // -------- Ops timer --------
  const [timerLocal, setTimerLocal] = useState<string>("");
  const [timerUnix, setTimerUnix] = useState<number | null>(null);
  const [now, setNow] = useState<number>(Date.now());

  // -------- Checklist --------
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [newItem, setNewItem] = useState<string>("");

  useEffect(() => {
    const saved = loadJson(ANNOUNCE_KEY, { targetAlliance: "WOC", title: "", body: "", roleToken: "@Leadership", whenLocal: "" });
    setTargetAlliance(saved.targetAlliance || "WOC");
    setTitle(saved.title || "");
    setBody(saved.body || "");
    setRoleToken(saved.roleToken || "@Leadership");
    setWhenLocal(saved.whenLocal || "");

    const t = loadJson(TIMER_KEY, { timerLocal: "" });
    setTimerLocal(t.timerLocal || "");

    const c = loadJson<ChecklistItem[]>(CHECKLIST_KEY, []);
    setItems(Array.isArray(c) ? c : []);
  }, []);

  useEffect(() => {
    saveJson(ANNOUNCE_KEY, { targetAlliance, title, body, roleToken, whenLocal });
  }, [targetAlliance, title, body, roleToken, whenLocal]);

  useEffect(() => {
    saveJson(TIMER_KEY, { timerLocal });
  }, [timerLocal]);

  useEffect(() => {
    saveJson(CHECKLIST_KEY, items);
  }, [items]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!timerLocal) { setTimerUnix(null); return; }
    const d = new Date(timerLocal);
    if (isNaN(d.getTime())) { setTimerUnix(null); return; }
    setTimerUnix(toUnixSeconds(d));
  }, [timerLocal]);

  const countdown = useMemo(() => {
    if (!timerUnix) return null;
    const ms = timerUnix * 1000 - now;
    const s = Math.max(0, Math.floor(ms / 1000));
    const hh = Math.floor(s / 3600);
    const mm = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    return { ms, s, hh, mm, ss };
  }, [timerUnix, now]);

  const announcePreview = useMemo(() => {
    const lines: string[] = [];
    const alliance = (targetAlliance || "").toUpperCase();
    lines.push("**🧟 LIVE OPS — " + alliance + "**");
    if (title.trim()) lines.push("**" + title.trim() + "**");
    if (roleToken) lines.push(roleToken);
    if (whenLocal) {
      const d = new Date(whenLocal);
      if (!isNaN(d.getTime())) {
        const unix = toUnixSeconds(d);
        lines.push("🕒 Time: <t:" + unix + ":F>  (local) | <t:" + unix + ":R>");
      }
    }
    if (body.trim()) {
      lines.push("");
      lines.push(body.trim());
    }
    lines.push("");
    lines.push("_Tokens supported (UI-only):_");
    lines.push("- Roles: @Leadership @R5 @R4 @Member @StateLeadership @StateMod");
    lines.push("- Also: " + "{{Leadership}}" + " style placeholders");
    lines.push("- Channels examples: " + "#announcements" + " | " + "{{#announcements}}" + " | " + "{{channel:announcements}}");
    return lines.join("\n");
  }, [targetAlliance, title, body, roleToken, whenLocal]);

  async function copyText(txt: string) {
    try {
      await navigator.clipboard.writeText(txt);
      window.alert("Copied to clipboard.");
    } catch {
      window.prompt("Copy:", txt);
    }
  }

  function addChecklist() {
    const t = newItem.trim();
    if (!t) return;
    const it: ChecklistItem = { id: uid(), text: t, done: false, createdUtc: new Date().toISOString() };
    setItems([it, ...items]);
    setNewItem("");
  }

  function toggleItem(id: string) {
    setItems(items.map((x) => (x.id === id ? { ...x, done: !x.done } : x)));
  }

  function delItem(id: string) {
    setItems(items.filter((x) => x.id !== id));
  }

  function exportChecklist() {
    const payload = { version: 1, exportedUtc: new Date().toISOString(), items };
    copyText(JSON.stringify(payload, null, 2));
  }

  function importChecklist() {
    const raw = window.prompt("Paste checklist JSON export:");
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      const list = parsed.items;
      if (!Array.isArray(list)) throw new Error("Invalid items");
      const cleaned: ChecklistItem[] = list
        .filter((x) => x && typeof x.text === "string")
        .map((x) => ({ id: String(x.id || uid()), text: String(x.text), done: !!x.done, createdUtc: String(x.createdUtc || new Date().toISOString()) }));
      setItems(cleaned);
      window.alert("Imported checklist.");
    } catch {
      window.alert("Import failed (invalid JSON).");
    }
  }

  return (
    <div className="zombie-card" style={{ marginTop: 14 }}>
      <div style={{ fontWeight: 900, fontSize: 14 }}>🧟 Owner Live Ops — Enhancements (UI-only)</div>      <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => nav("/owner/alliance-directory")}>
          🗂️ Alliance Directory Editor
        </button>
        <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => nav("/owner/permissions?section=permissions")}>
          🧩 Permissions Matrix (Shell)
        </button>
        <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => nav("/state/789")}>
          🧟 State 789 Dashboard
        </button>
      </div>

      {/* Announcement generator */}
      <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.10)" }}>
        <div style={{ fontWeight: 900 }}>📣 Generate Discord-ready announcement</div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10, marginTop: 10 }}>
          <div>
            <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Target Alliance (UI-only)</div>
            <input className="zombie-input" value={targetAlliance} onChange={(e) => setTargetAlliance(e.target.value)} placeholder="WOC" style={{ width: "100%", padding: "10px 12px" }} />
          </div>

          <div>
            <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Role mention</div>
            <select className="zombie-input" value={roleToken} onChange={(e) => setRoleToken(e.target.value)} style={{ width: "100%", padding: "10px 12px" }}>
              <option value="@Leadership">@Leadership</option>
              <option value="@R5">@R5</option>
              <option value="@R4">@R4</option>
              <option value="@Member">@Member</option>
              <option value="@StateLeadership">@StateLeadership</option>
              <option value="@StateMod">@StateMod</option>
              <option value="">(none)</option>
            </select>
          </div>

          <div>
            <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Event time (local input → UTC embed)</div>
            <input className="zombie-input" type="datetime-local" value={whenLocal} onChange={(e) => setWhenLocal(e.target.value)} style={{ width: "100%", padding: "10px 12px" }} />
          </div>
        </div>

        <div style={{ marginTop: 10 }}>
          <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Title</div>
          <input className="zombie-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Reset is coming" style={{ width: "100%", padding: "10px 12px" }} />
        </div>

        <div style={{ marginTop: 10 }}>
          <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Body</div>
          <textarea className="zombie-input" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write the message…" style={{ width: "100%", minHeight: 90, padding: "10px 12px" }} />
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
          <button className="zombie-btn" onClick={() => copyText(announcePreview)} style={{ padding: "10px 12px" }}>
            Copy Discord Announcement
          </button>
        </div>

        <pre style={{ marginTop: 10, padding: 12, borderRadius: 10, background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.10)", overflow: "auto", fontSize: 12 }}>
{announcePreview}
        </pre>
      </div>

      {/* Ops timer */}
      <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.10)" }}>
        <div style={{ fontWeight: 900 }}>⏳ Ops Timer (countdown + UTC conversion)</div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginTop: 10 }}>
          <input className="zombie-input" type="datetime-local" value={timerLocal} onChange={(e) => setTimerLocal(e.target.value)} style={{ padding: "10px 12px" }} />
          <button className="zombie-btn" onClick={() => setTimerLocal("")} style={{ padding: "10px 12px" }}>Clear</button>
        </div>

        <div style={{ marginTop: 10, opacity: 0.9, fontSize: 13 }}>
          {timerUnix ? (
            <>
              <div>UTC: <code>{new Date(timerUnix * 1000).toISOString()}</code></div>
              <div>Discord: <code>{"<t:" + timerUnix + ":F>"}</code> and <code>{"<t:" + timerUnix + ":R>"}</code></div>
              {countdown ? (
                <div style={{ marginTop: 8, fontWeight: 900 }}>
                  Countdown: {countdown.hh}h {countdown.mm}m {countdown.ss}s
                </div>
              ) : null}
            </>
          ) : (
            <div style={{ opacity: 0.75 }}>Set a target time to start the countdown.</div>
          )}
        </div>
      </div>

      {/* Checklist */}
      <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.10)" }}>
        <div style={{ fontWeight: 900 }}>✅ Ops Checklist (localStorage + export/import)</div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
          <input
            className="zombie-input"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            placeholder="Add checklist item…"
            style={{ flex: "1 1 260px", padding: "10px 12px" }}
          />
          <button className="zombie-btn" onClick={addChecklist} style={{ padding: "10px 12px" }}>Add</button>
          <button className="zombie-btn" onClick={exportChecklist} style={{ padding: "10px 12px" }}>Export</button>
          <button className="zombie-btn" onClick={importChecklist} style={{ padding: "10px 12px" }}>Import</button>
        </div>

        <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
          {items.length === 0 ? (
            <div style={{ opacity: 0.75 }}>No checklist items yet.</div>
          ) : (
            items.map((it) => (
              <div key={it.id} className="zombie-card" style={{ padding: 10 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                    <input type="checkbox" checked={it.done} onChange={() => toggleItem(it.id)} />
                    <span style={{ fontWeight: 800, textDecoration: it.done ? "line-through" : "none", opacity: it.done ? 0.6 : 1 }}>
                      {it.text}
                    </span>
                  </label>
                  <button className="zombie-btn" onClick={() => delItem(it.id)} style={{ padding: "8px 10px", fontSize: 12 }}>Delete</button>
                </div>
                <div style={{ marginTop: 6, opacity: 0.6, fontSize: 11 }}>Created (UTC): {it.createdUtc}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}


