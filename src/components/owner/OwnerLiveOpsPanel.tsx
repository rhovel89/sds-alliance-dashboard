import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

type Severity = "info" | "warning" | "critical";

type ChecklistItem = {
  id: string;
  text: string;
  done: boolean;
  createdUtc: string;
};

function uid() {
  return Math.random().toString(16).slice(2) + "-" + Date.now().toString(16);
}

function nowUtcIso() {
  return new Date().toISOString();
}

function getAllianceFromPath(pathname: string): string | null {
  const m = (pathname || "").match(/^\/dashboard\/([^\/]+)/);
  if (!m) return null;
  const code = (m[1] || "").toString().trim();
  return code ? code.toUpperCase() : null;
}

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveJson(key: string, value: any) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

function parseUtcToDate(utcIso: string): Date | null {
  const s = (utcIso || "").trim();
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function toDiscordTs(d: Date): { unix: number; full: string; relative: string } {
  const unix = Math.floor(d.getTime() / 1000);
  return {
    unix,
    full: `<t:${unix}:F>`,
    relative: `<t:${unix}:R>`,
  };
}

function formatCountdown(ms: number): string {
  const neg = ms < 0;
  const a = Math.abs(ms);
  const totalSec = Math.floor(a / 1000);
  const sec = totalSec % 60;
  const totalMin = Math.floor(totalSec / 60);
  const min = totalMin % 60;
  const hr = Math.floor(totalMin / 60);

  const pad = (n: number) => (n < 10 ? "0" + n : "" + n);
  const s = `${hr}:${pad(min)}:${pad(sec)}`;
  return neg ? `-${s}` : s;
}

function severityBadge(sev: Severity) {
  if (sev === "critical") return "🟥 CRITICAL";
  if (sev === "warning") return "🟧 WARNING";
  return "🟩 INFO";
}

export function OwnerLiveOpsPanel() {
  const nav = useNavigate();
  const loc = useLocation();

  const currentAlliance = useMemo(() => getAllianceFromPath(loc.pathname), [loc.pathname]);

  // ---------- Live Ops Draft ----------
  const [targetMode, setTargetMode] = useState<"ALL" | "CURRENT" | "CUSTOM">("ALL");
  const [customTarget, setCustomTarget] = useState<string>("");

  const [severity, setSeverity] = useState<Severity>("info");
  const [title, setTitle] = useState<string>("Maintenance Notice");
  const [body, setBody] = useState<string>("");

  const [incidentMode, setIncidentMode] = useState<boolean>(false);

  // ---------- Discord Generator ----------
  const [mentionPreset, setMentionPreset] = useState<
    "none" | "@here" | "@everyone" | "@Leadership" | "@R5" | "@R4" | "custom"
  >("none");
  const [customMention, setCustomMention] = useState<string>("@role");

  // ---------- Ops Timer ----------
  const [timerUtc, setTimerUtc] = useState<string>("");
  const [tick, setTick] = useState<number>(Date.now());

  // ---------- Checklist ----------
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [newItem, setNewItem] = useState<string>("");
  const [importJson, setImportJson] = useState<string>("");

  // Load saved state
  useEffect(() => {
    const draft = loadJson("sad_liveops_draft_v2", {
      targetMode: "ALL",
      customTarget: "",
      severity: "info",
      title: "Maintenance Notice",
      body: "",
      incidentMode: false,
      mentionPreset: "none",
      customMention: "@role",
      timerUtc: "",
    });

    setTargetMode(draft.targetMode || "ALL");
    setCustomTarget(draft.customTarget || "");
    setSeverity(draft.severity || "info");
    setTitle(draft.title || "Maintenance Notice");
    setBody(draft.body || "");
    setIncidentMode(!!draft.incidentMode);

    setMentionPreset(draft.mentionPreset || "none");
    setCustomMention(draft.customMention || "@role");

    setTimerUtc(draft.timerUtc || "");

    const savedChecklist = loadJson<ChecklistItem[]>("sad_ops_checklist_v1", []);
    setChecklist(Array.isArray(savedChecklist) ? savedChecklist : []);
  }, []);

  // Persist draft state
  useEffect(() => {
    saveJson("sad_liveops_draft_v2", {
      targetMode,
      customTarget,
      severity,
      title,
      body,
      incidentMode,
      mentionPreset,
      customMention,
      timerUtc,
    });
  }, [targetMode, customTarget, severity, title, body, incidentMode, mentionPreset, customMention, timerUtc]);

  // Persist checklist
  useEffect(() => {
    saveJson("sad_ops_checklist_v1", checklist);
  }, [checklist]);

  // Timer ticking
  useEffect(() => {
    const iv = window.setInterval(() => setTick(Date.now()), 1000);
    return () => window.clearInterval(iv);
  }, []);

  const target = useMemo(() => {
    if (targetMode === "ALL") return "ALL";
    if (targetMode === "CURRENT") return currentAlliance || "ALL";
    const c = (customTarget || "").trim().toUpperCase();
    return c || "ALL";
  }, [targetMode, customTarget, currentAlliance]);

  const header = useMemo(() => {
    const sev = severityBadge(severity);
    const tgt = target === "ALL" ? "[ALL]" : "[" + target + "]";
    const inc = incidentMode ? " 🚨 INCIDENT MODE" : "";
    return `${sev} ${tgt} ${title}${inc}`.trim();
  }, [severity, target, title, incidentMode]);

  const mention = useMemo(() => {
    if (mentionPreset === "none") return "";
    if (mentionPreset === "custom") return (customMention || "").trim();
    return mentionPreset;
  }, [mentionPreset, customMention]);

  const timerDate = useMemo(() => parseUtcToDate(timerUtc), [timerUtc]);
  const timerInfo = useMemo(() => {
    if (!timerDate) return null;
    const ms = timerDate.getTime() - tick;
    const discord = toDiscordTs(timerDate);
    return {
      utc: timerDate.toISOString(),
      local: timerDate.toLocaleString(),
      countdown: formatCountdown(ms),
      ms,
      discord,
    };
  }, [timerDate, tick]);

  const discordAnnouncement = useMemo(() => {
    const lines: string[] = [];
    if (mention) lines.push(mention);
    lines.push(`**${header}**`);
    lines.push(`UTC: ${nowUtcIso()}`);

    if (timerInfo) {
      lines.push(`When: ${timerInfo.discord.full} (${timerInfo.discord.relative})`);
      lines.push(`Local: ${timerInfo.local}`);
    }

    lines.push("");
    lines.push(body || "(empty)");
    return lines.join("\n");
  }, [mention, header, body, timerInfo]);

  async function copy(txt: string, okMsg: string) {
    await navigator.clipboard?.writeText(txt);
    window.alert(okMsg);
  }

  // Checklist actions
  function addChecklistItem() {
    const t = (newItem || "").trim();
    if (!t) return;
    const item: ChecklistItem = { id: uid(), text: t, done: false, createdUtc: nowUtcIso() };
    setChecklist((prev) => [item, ...prev]);
    setNewItem("");
  }

  function toggleChecklist(id: string) {
    setChecklist((prev) => prev.map((x) => (x.id === id ? { ...x, done: !x.done } : x)));
  }

  function removeChecklist(id: string) {
    setChecklist((prev) => prev.filter((x) => x.id !== id));
  }

  function clearCompleted() {
    setChecklist((prev) => prev.filter((x) => !x.done));
  }

  async function exportChecklist() {
    const payload = { tsUtc: nowUtcIso(), checklist };
    await copy(JSON.stringify(payload, null, 2), "Copied checklist export JSON to clipboard.");
  }

  function importChecklistFromText() {
    try {
      const obj = JSON.parse(importJson || "{}");
      const items = obj.checklist ?? obj.items ?? obj;
      if (!Array.isArray(items)) {
        window.alert("Import JSON must contain an array under 'checklist' (or be an array).");
        return;
      }
      const cleaned: ChecklistItem[] = items
        .map((x: any) => {
          const text = (x?.text ?? x?.name ?? "").toString().trim();
          if (!text) return null;
          return {
            id: (x?.id ?? uid()).toString(),
            text,
            done: !!x?.done,
            createdUtc: (x?.createdUtc ?? nowUtcIso()).toString(),
          };
        })
        .filter(Boolean) as any;

      setChecklist(cleaned);
      window.alert("Imported checklist.");
    } catch {
      window.alert("Invalid JSON for checklist import.");
    }
  }

  // Timer helpers
  function setTimerFromMinutes(minutes: number) {
    const d = new Date(Date.now() + minutes * 60 * 1000);
    setTimerUtc(d.toISOString());
  }

  return (
    <div className="zombie-card" style={{ padding: 16, marginTop: 12 }}>
      <h3 style={{ marginTop: 0 }}>🧠 Live Ops Command Panel (UI-only)</h3>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button className="zombie-btn" onClick={() => nav("/status")}>🧪 Open /status</button>
        <button className="zombie-btn" onClick={() => nav("/me")}>🧟 Open /me</button>
        <button className="zombie-btn" onClick={() => window.location.reload()}>🔄 Reload</button>
      </div>

      <hr className="zombie-divider" />

      {/* Target + Severity */}
      <div style={{ display: "grid", gap: 10 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ fontSize: 12, opacity: 0.85 }}>Target:</div>

          <select
            value={targetMode}
            onChange={(e) => setTargetMode((e.target.value as any) || "ALL")}
            style={{
              height: 34,
              borderRadius: 10,
              padding: "0 10px",
              border: "1px solid rgba(120,255,120,0.18)",
              background: "rgba(0,0,0,0.25)",
              color: "rgba(235,255,235,0.95)",
              outline: "none",
              minWidth: 170,
            }}
          >
            <option value="ALL">ALL (state-wide)</option>
            <option value="CURRENT">CURRENT ({currentAlliance || "none"})</option>
            <option value="CUSTOM">CUSTOM</option>
          </select>

          {targetMode === "CUSTOM" ? (
            <input
              value={customTarget}
              onChange={(e) => setCustomTarget((e.target.value || "").toUpperCase())}
              placeholder="Alliance code (e.g. WOC)"
              style={{
                height: 34,
                borderRadius: 10,
                padding: "0 10px",
                border: "1px solid rgba(120,255,120,0.18)",
                background: "rgba(0,0,0,0.25)",
                color: "rgba(235,255,235,0.95)",
                outline: "none",
                minWidth: 220,
              }}
            />
          ) : null}

          <label style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <input type="checkbox" checked={incidentMode} onChange={(e) => setIncidentMode(!!e.target.checked)} />
            <span style={{ fontSize: 12, opacity: 0.9 }}>🚨 Incident Mode</span>
          </label>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ fontSize: 12, opacity: 0.85 }}>Severity:</div>
          <select
            value={severity}
            onChange={(e) => setSeverity((e.target.value as any) || "info")}
            style={{
              height: 34,
              borderRadius: 10,
              padding: "0 10px",
              border: "1px solid rgba(120,255,120,0.18)",
              background: "rgba(0,0,0,0.25)",
              color: "rgba(235,255,235,0.95)",
              outline: "none",
              minWidth: 170,
            }}
          >
            <option value="info">🟩 info</option>
            <option value="warning">🟧 warning</option>
            <option value="critical">🟥 critical</option>
          </select>

          <div style={{ fontSize: 12, opacity: 0.85 }}>Title:</div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{
              flex: 1,
              minWidth: 220,
              height: 34,
              borderRadius: 10,
              padding: "0 10px",
              border: "1px solid rgba(120,255,120,0.18)",
              background: "rgba(0,0,0,0.25)",
              color: "rgba(235,255,235,0.95)",
              outline: "none",
            }}
          />
        </div>

        <div>
          <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 6 }}>Body</div>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={7}
            style={{
              width: "100%",
              borderRadius: 10,
              padding: 10,
              border: "1px solid rgba(120,255,120,0.18)",
              background: "rgba(0,0,0,0.25)",
              color: "rgba(235,255,235,0.95)",
              outline: "none",
              resize: "vertical",
            }}
            placeholder="Type your ops message here…"
          />
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="zombie-btn" onClick={() => copy(`${header}\nUTC: ${nowUtcIso()}\n\n${body}`.trim(), "Copied Live Ops message (text).")}>
            📋 Copy Text
          </button>
          <button className="zombie-btn" onClick={() => copy(JSON.stringify({ tsUtc: nowUtcIso(), target, severity, title, incidentMode, body }, null, 2), "Copied Live Ops payload (JSON).")}>
            🧾 Copy JSON
          </button>
          <button className="zombie-btn" onClick={() => setBody("")}>🧽 Clear Body</button>
        </div>

        <div style={{ opacity: 0.9 }}>
          <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Preview</div>
          <div style={{ padding: 10, borderRadius: 10, background: "rgba(0,0,0,0.18)", border: "1px solid rgba(120,255,120,0.12)" }}>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>{header}</div>
            <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 8 }}>UTC: {nowUtcIso()}</div>
            <div style={{ whiteSpace: "pre-wrap" }}>{body || "(empty)"}</div>
          </div>
        </div>
      </div>

      <hr className="zombie-divider" />

      {/* DISCORD ANNOUNCEMENT GENERATOR */}
      <h4 style={{ marginTop: 0 }}>💬 Discord-ready announcement</h4>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ fontSize: 12, opacity: 0.85 }}>Mention:</div>
        <select
          value={mentionPreset}
          onChange={(e) => setMentionPreset((e.target.value as any) || "none")}
          style={{
            height: 34,
            borderRadius: 10,
            padding: "0 10px",
            border: "1px solid rgba(120,255,120,0.18)",
            background: "rgba(0,0,0,0.25)",
            color: "rgba(235,255,235,0.95)",
            outline: "none",
            minWidth: 220,
          }}
          title="Role mention placeholder"
        >
          <option value="none">(none)</option>
          <option value="@here">@here</option>
          <option value="@everyone">@everyone</option>
          <option value="@Leadership">@Leadership (placeholder)</option>
          <option value="@R5">@R5 (placeholder)</option>
          <option value="@R4">@R4 (placeholder)</option>
          <option value="custom">custom…</option>
        </select>

        {mentionPreset === "custom" ? (
          <input
            value={customMention}
            onChange={(e) => setCustomMention(e.target.value)}
            placeholder="@role or <@&ROLE_ID>"
            style={{
              flex: 1,
              minWidth: 220,
              height: 34,
              borderRadius: 10,
              padding: "0 10px",
              border: "1px solid rgba(120,255,120,0.18)",
              background: "rgba(0,0,0,0.25)",
              color: "rgba(235,255,235,0.95)",
              outline: "none",
            }}
          />
        ) : null}
      </div>

      <div style={{ marginTop: 10 }}>
        <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>
          Output (includes Discord timestamp if timer is set)
        </div>
        <textarea
          value={discordAnnouncement}
          readOnly
          rows={8}
          style={{
            width: "100%",
            borderRadius: 10,
            padding: 10,
            border: "1px solid rgba(120,255,120,0.18)",
            background: "rgba(0,0,0,0.20)",
            color: "rgba(235,255,235,0.95)",
            outline: "none",
            resize: "vertical",
          }}
        />
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
          <button className="zombie-btn" onClick={() => copy(discordAnnouncement, "Copied Discord-ready announcement.")}>
            📋 Copy Discord Announcement
          </button>
          <button className="zombie-btn" onClick={() => copy(JSON.stringify({ tsUtc: nowUtcIso(), target, mention, header, body, timerUtc }, null, 2), "Copied Discord generator JSON.")}>
            🧾 Copy Generator JSON
          </button>
        </div>
      </div>

      <hr className="zombie-divider" />

      {/* OPS TIMER */}
      <h4 style={{ marginTop: 0 }}>⏱ Ops Timer (UTC + countdown)</h4>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <input
          value={timerUtc}
          onChange={(e) => setTimerUtc(e.target.value)}
          placeholder="UTC ISO (e.g. 2026-02-20T05:30:00.000Z)"
          style={{
            flex: 1,
            minWidth: 320,
            height: 36,
            borderRadius: 10,
            padding: "0 10px",
            border: "1px solid rgba(120,255,120,0.18)",
            background: "rgba(0,0,0,0.25)",
            color: "rgba(235,255,235,0.95)",
            outline: "none",
          }}
        />

        <button className="zombie-btn" onClick={() => setTimerUtc(new Date().toISOString())}>Now (UTC)</button>
        <button className="zombie-btn" onClick={() => setTimerFromMinutes(15)}>+15m</button>
        <button className="zombie-btn" onClick={() => setTimerFromMinutes(30)}>+30m</button>
        <button className="zombie-btn" onClick={() => setTimerFromMinutes(60)}>+1h</button>
        <button className="zombie-btn" onClick={() => setTimerFromMinutes(120)}>+2h</button>
        <button className="zombie-btn" onClick={() => setTimerUtc("")}>Clear</button>
      </div>

      {timerInfo ? (
        <div style={{ marginTop: 10, padding: 10, borderRadius: 10, background: "rgba(0,0,0,0.18)", border: "1px solid rgba(120,255,120,0.12)" }}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <div><b>UTC:</b> {timerInfo.utc}</div>
            <div><b>Local:</b> {timerInfo.local}</div>
            <div><b>Countdown:</b> {timerInfo.countdown}</div>
          </div>
          <div style={{ marginTop: 8, fontFamily: "monospace", fontSize: 12, opacity: 0.9 }}>
            Discord: {timerInfo.discord.full}  {timerInfo.discord.relative}
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
            <button className="zombie-btn" onClick={() => copy(`${timerInfo.discord.full} ${timerInfo.discord.relative}`, "Copied Discord timestamps.")}>
              📋 Copy Discord Timestamp
            </button>
            <button className="zombie-btn" onClick={() => copy(timerInfo.utc, "Copied UTC ISO.")}>📋 Copy UTC</button>
          </div>
        </div>
      ) : (
        <div style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>
          Enter a UTC ISO time to get a live countdown and Discord timestamps.
        </div>
      )}

      <hr className="zombie-divider" />

      {/* OPS CHECKLIST */}
      <h4 style={{ marginTop: 0 }}>✅ Ops Checklist (saved locally)</h4>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder="Add checklist item…"
          style={{
            flex: 1,
            minWidth: 260,
            height: 36,
            borderRadius: 10,
            padding: "0 10px",
            border: "1px solid rgba(120,255,120,0.18)",
            background: "rgba(0,0,0,0.25)",
            color: "rgba(235,255,235,0.95)",
            outline: "none",
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") addChecklistItem();
          }}
        />
        <button className="zombie-btn" onClick={addChecklistItem}>➕ Add</button>
        <button className="zombie-btn" onClick={clearCompleted}>🧹 Clear Completed</button>
        <button className="zombie-btn" onClick={exportChecklist}>📦 Export</button>
      </div>

      <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
        {checklist.length === 0 ? (
          <div style={{ fontSize: 12, opacity: 0.7 }}>No items yet.</div>
        ) : (
          checklist.map((it) => (
            <div key={it.id} style={{ display: "flex", gap: 10, alignItems: "center", padding: 8, borderRadius: 10, background: "rgba(0,0,0,0.14)", border: "1px solid rgba(120,255,120,0.10)" }}>
              <input type="checkbox" checked={it.done} onChange={() => toggleChecklist(it.id)} />
              <div style={{ flex: 1, whiteSpace: "pre-wrap", opacity: it.done ? 0.6 : 0.95, textDecoration: it.done ? "line-through" : "none" }}>
                {it.text}
              </div>
              <button className="zombie-btn" style={{ height: 30, padding: "0 10px" }} onClick={() => removeChecklist(it.id)}>🗑</button>
            </div>
          ))
        )}
      </div>

      <div style={{ marginTop: 12 }}>
        <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Import checklist JSON</div>
        <textarea
          value={importJson}
          onChange={(e) => setImportJson(e.target.value)}
          rows={4}
          placeholder='Paste export JSON here (expects { "checklist": [ ... ] })'
          style={{
            width: "100%",
            borderRadius: 10,
            padding: 10,
            border: "1px solid rgba(120,255,120,0.18)",
            background: "rgba(0,0,0,0.20)",
            color: "rgba(235,255,235,0.95)",
            outline: "none",
            resize: "vertical",
          }}
        />
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
          <button className="zombie-btn" onClick={importChecklistFromText}>⬇️ Import</button>
          <button className="zombie-btn" onClick={() => setImportJson("")}>🧽 Clear Import</button>
        </div>
      </div>

      <div style={{ marginTop: 12, fontSize: 12, opacity: 0.7 }}>
        UI-only. Nothing is sent to DB/Discord yet.
      </div>
    </div>
  );
}