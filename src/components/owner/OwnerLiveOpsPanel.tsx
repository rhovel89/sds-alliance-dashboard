import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

type Severity = "info" | "warning" | "critical";

function getAllianceFromPath(pathname: string): string | null {
  const m = (pathname || "").match(/^\/dashboard\/([^\/]+)/);
  if (!m) return null;
  const code = (m[1] || "").toString().trim();
  return code ? code.toUpperCase() : null;
}

function nowUtc() {
  return new Date().toISOString();
}

function loadLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveLocal(key: string, value: any) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

export function OwnerLiveOpsPanel() {
  const nav = useNavigate();
  const loc = useLocation();

  const currentAlliance = useMemo(() => getAllianceFromPath(loc.pathname), [loc.pathname]);

  const [targetMode, setTargetMode] = useState<"ALL" | "CURRENT" | "CUSTOM">("ALL");
  const [customTarget, setCustomTarget] = useState<string>("");

  const [severity, setSeverity] = useState<Severity>("info");
  const [title, setTitle] = useState<string>("Maintenance Notice");
  const [body, setBody] = useState<string>("");

  const [incidentMode, setIncidentMode] = useState<boolean>(false);

  useEffect(() => {
    const s = loadLocal("sad_liveops_draft", {
      targetMode: "ALL",
      customTarget: "",
      severity: "info",
      title: "Maintenance Notice",
      body: "",
      incidentMode: false,
    });
    setTargetMode(s.targetMode || "ALL");
    setCustomTarget(s.customTarget || "");
    setSeverity(s.severity || "info");
    setTitle(s.title || "Maintenance Notice");
    setBody(s.body || "");
    setIncidentMode(!!s.incidentMode);
  }, []);

  useEffect(() => {
    saveLocal("sad_liveops_draft", { targetMode, customTarget, severity, title, body, incidentMode });
  }, [targetMode, customTarget, severity, title, body, incidentMode]);

  const target = useMemo(() => {
    if (targetMode === "ALL") return "ALL";
    if (targetMode === "CURRENT") return currentAlliance || "ALL";
    const c = (customTarget || "").trim().toUpperCase();
    return c || "ALL";
  }, [targetMode, customTarget, currentAlliance]);

  const header = useMemo(() => {
    const sev =
      severity === "critical" ? "🟥 CRITICAL" : severity === "warning" ? "🟧 WARNING" : "🟩 INFO";
    const tgt = target === "ALL" ? "[ALL]" : "[" + target + "]";
    const inc = incidentMode ? " 🚨 INCIDENT MODE" : "";
    return `${sev} ${tgt} ${title}${inc}`.trim();
  }, [severity, target, title, incidentMode]);

  const copyText = async () => {
    const txt = `${header}\nUTC: ${nowUtc()}\n\n${body}`.trim();
    await navigator.clipboard?.writeText(txt);
    window.alert("Copied Live Ops message (text) to clipboard.");
  };

  const copyJson = async () => {
    const payload = {
      tsUtc: nowUtc(),
      target,
      severity,
      title,
      incidentMode,
      body,
      url: typeof window !== "undefined" ? window.location.href : "",
    };
    await navigator.clipboard?.writeText(JSON.stringify(payload, null, 2));
    window.alert("Copied Live Ops payload (JSON) to clipboard.");
  };

  const exportSadSettings = async () => {
    const out: Record<string, any> = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k) continue;
        if (k.startsWith("sad_")) out[k] = localStorage.getItem(k);
      }
    } catch {
      // ignore
    }
    await navigator.clipboard?.writeText(JSON.stringify({ tsUtc: nowUtc(), sadSettings: out }, null, 2));
    window.alert("Copied sad_* local settings export to clipboard.");
  };

  const clearSadSettings = () => {
    const ok = window.confirm("Clear all localStorage keys starting with 'sad_' on this browser?");
    if (!ok) return;
    try {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith("sad_")) keys.push(k);
      }
      keys.forEach((k) => localStorage.removeItem(k));
    } catch {
      // ignore
    }
    window.alert("Cleared sad_* local settings.");
  };

  return (
    <div className="zombie-card" style={{ padding: 16, marginTop: 12 }}>
      <h3 style={{ marginTop: 0 }}>🧠 Live Ops Command Panel (UI-only)</h3>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button className="zombie-btn" onClick={() => nav("/status")}>🧪 Open /status</button>
        <button className="zombie-btn" onClick={() => nav("/me")}>🧟 Open /me</button>
        <button className="zombie-btn" onClick={() => window.location.reload()}>🔄 Reload</button>
      </div>

      <hr className="zombie-divider" />

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

          <div style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 10 }}>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={incidentMode}
                onChange={(e) => setIncidentMode(!!e.target.checked)}
              />
              <span style={{ fontSize: 12, opacity: 0.9 }}>🚨 Incident Mode</span>
            </label>
          </div>
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
            rows={8}
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
            placeholder="Paste your ops message here…"
          />
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="zombie-btn" onClick={copyText}>📋 Copy Text</button>
          <button className="zombie-btn" onClick={copyJson}>🧾 Copy JSON</button>
          <button className="zombie-btn" onClick={() => setBody("")}>🧽 Clear Body</button>
        </div>

        <div style={{ opacity: 0.9 }}>
          <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Preview</div>
          <div style={{ padding: 10, borderRadius: 10, background: "rgba(0,0,0,0.18)", border: "1px solid rgba(120,255,120,0.12)" }}>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>{header}</div>
            <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 8 }}>UTC: {nowUtc()}</div>
            <div style={{ whiteSpace: "pre-wrap" }}>{body || "(empty)"}</div>
          </div>
        </div>

        <hr className="zombie-divider" />

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="zombie-btn" onClick={exportSadSettings}>📦 Export sad_* settings</button>
          <button className="zombie-btn" onClick={clearSadSettings}>🧨 Clear sad_* settings</button>
        </div>
      </div>

      <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>
        Note: UI-only. Nothing is sent to DB/Discord yet.
      </div>
    </div>
  );
}