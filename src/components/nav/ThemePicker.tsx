import React, { useEffect, useMemo, useState } from "react";

const KEY = "sad_theme";

type ThemeKey = "zombie" | "night" | "blood" | "toxic" | "snow";

const THEMES: { key: ThemeKey; label: string; vars: Record<string, string> }[] = [
  {
    key: "zombie",
    label: "🧟 Zombie",
    vars: {
      "--sad-bg": "radial-gradient(1200px 600px at 20% 0%, rgba(0,80,0,0.35), rgba(0,0,0,0.92))",
      "--sad-card": "rgba(0,0,0,0.55)",
      "--sad-border": "rgba(120,255,120,0.18)",
      "--sad-accent": "rgba(120,255,120,0.95)",
      "--sad-text": "rgba(235,255,235,0.92)",
    },
  },
  {
    key: "night",
    label: "🌙 Night",
    vars: {
      "--sad-bg": "radial-gradient(1200px 600px at 20% 0%, rgba(60,60,120,0.25), rgba(0,0,0,0.92))",
      "--sad-card": "rgba(0,0,0,0.55)",
      "--sad-border": "rgba(160,180,255,0.18)",
      "--sad-accent": "rgba(160,180,255,0.95)",
      "--sad-text": "rgba(240,245,255,0.92)",
    },
  },
  {
    key: "blood",
    label: "🩸 Blood",
    vars: {
      "--sad-bg": "radial-gradient(1200px 600px at 20% 0%, rgba(120,0,0,0.35), rgba(0,0,0,0.92))",
      "--sad-card": "rgba(0,0,0,0.55)",
      "--sad-border": "rgba(255,120,120,0.18)",
      "--sad-accent": "rgba(255,140,140,0.95)",
      "--sad-text": "rgba(255,240,240,0.92)",
    },
  },
  {
    key: "toxic",
    label: "☣️ Toxic",
    vars: {
      "--sad-bg": "radial-gradient(1200px 600px at 20% 0%, rgba(120,255,0,0.22), rgba(0,0,0,0.92))",
      "--sad-card": "rgba(0,0,0,0.55)",
      "--sad-border": "rgba(180,255,120,0.18)",
      "--sad-accent": "rgba(200,255,150,0.95)",
      "--sad-text": "rgba(240,255,235,0.92)",
    },
  },
  {
    key: "snow",
    label: "❄️ Snow",
    vars: {
      "--sad-bg": "radial-gradient(1200px 600px at 20% 0%, rgba(255,255,255,0.12), rgba(0,0,0,0.92))",
      "--sad-card": "rgba(0,0,0,0.52)",
      "--sad-border": "rgba(220,240,255,0.18)",
      "--sad-accent": "rgba(220,240,255,0.95)",
      "--sad-text": "rgba(245,250,255,0.92)",
    },
  },
];

function applyTheme(key: ThemeKey) {
  const t = THEMES.find((x) => x.key === key) || THEMES[0];
  const root = document.documentElement;

  root.setAttribute("data-sad-theme", t.key);
  Object.entries(t.vars).forEach(([k, v]) => root.style.setProperty(k, v));

  // Inject override stylesheet once
  const id = "sad-theme-overrides";
  let el = document.getElementById(id) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement("style");
    el.id = id;
    document.head.appendChild(el);
  }

  // Keep overrides minimal + safe, using !important to win
  el.textContent = `
    body {
      background: var(--sad-bg) !important;
      color: var(--sad-text) !important;
    }
    .zombie-card {
      background: var(--sad-card) !important;
      border: 1px solid var(--sad-border) !important;
    }
    .zombie-btn {
      border: 1px solid var(--sad-border) !important;
      box-shadow: 0 0 0 1px rgba(0,0,0,0.25) inset;
    }
    .zombie-divider {
      border-color: var(--sad-border) !important;
      opacity: 0.85;
    }
    a { color: var(--sad-accent) !important; }
  `;
}

export function ThemePicker() {
  const [theme, setTheme] = useState<ThemeKey>("zombie");

  useEffect(() => {
    const saved = (localStorage.getItem(KEY) || "zombie") as ThemeKey;
    setTheme(saved);
    applyTheme(saved);
  }, []);

  const opts = useMemo(() => THEMES, []);

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <span style={{ opacity: 0.85, fontSize: 12 }}>Theme:</span>
      <select
        value={theme}
        onChange={(e) => {
          const v = (e.target.value || "zombie") as ThemeKey;
          setTheme(v);
          localStorage.setItem(KEY, v);
          applyTheme(v);
        }}
        style={{
          height: 34,
          borderRadius: 10,
          padding: "0 10px",
          border: "1px solid rgba(120,255,120,0.18)",
          background: "rgba(0,0,0,0.25)",
          color: "rgba(235,255,235,0.95)",
          outline: "none",
        }}
        title="Theme (saved locally)"
      >
        {opts.map((t) => (
          <option key={t.key} value={t.key}>
            {t.label}
          </option>
        ))}
      </select>
    </div>
  );
}