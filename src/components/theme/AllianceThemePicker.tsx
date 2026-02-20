import React, { useEffect, useMemo, useState } from "react";

type ThemeKey = "night" | "neon" | "blood" | "decay";

type ThemeDef = {
  key: ThemeKey;
  label: string;
  vars: Record<string, string>;
};

const THEMES: ThemeDef[] = [
  {
    key: "night",
    label: "Night (default)",
    vars: {
      "--sad-bg": "#070b08",
      "--sad-card": "rgba(0,0,0,0.35)",
      "--sad-border": "rgba(120,255,120,0.18)",
      "--sad-accent": "#78ff78",
      "--sad-danger": "#ff4b4b",
      "--sad-text": "rgba(235,255,235,0.95)",
    },
  },
  {
    key: "neon",
    label: "Neon",
    vars: {
      "--sad-bg": "#050013",
      "--sad-card": "rgba(0,0,0,0.40)",
      "--sad-border": "rgba(130,120,255,0.28)",
      "--sad-accent": "#8c7bff",
      "--sad-danger": "#ff4bf1",
      "--sad-text": "rgba(245,240,255,0.95)",
    },
  },
  {
    key: "blood",
    label: "Blood",
    vars: {
      "--sad-bg": "#120102",
      "--sad-card": "rgba(0,0,0,0.42)",
      "--sad-border": "rgba(255,80,80,0.22)",
      "--sad-accent": "#ff5b5b",
      "--sad-danger": "#ff2b2b",
      "--sad-text": "rgba(255,235,235,0.95)",
    },
  },
  {
    key: "decay",
    label: "Decay",
    vars: {
      "--sad-bg": "#08100a",
      "--sad-card": "rgba(0,0,0,0.36)",
      "--sad-border": "rgba(160,255,120,0.20)",
      "--sad-accent": "#a6ff78",
      "--sad-danger": "#ff8a4b",
      "--sad-text": "rgba(240,255,235,0.95)",
    },
  },
];

function keyGlobal() {
  return "sad_theme_global_v1";
}
function keyAlliance(code: string) {
  return "sad_theme_alliance_v1_" + (code || "").toUpperCase();
}

function loadTheme(allianceCode?: string | null): ThemeKey {
  try {
    if (allianceCode) {
      const a = localStorage.getItem(keyAlliance(allianceCode));
      if (a) return (a as ThemeKey) || "night";
    }
    const g = localStorage.getItem(keyGlobal());
    if (g) return (g as ThemeKey) || "night";
  } catch {}
  return "night";
}

function saveTheme(theme: ThemeKey, allianceCode?: string | null, scope: "ALLIANCE" | "GLOBAL" = "ALLIANCE") {
  try {
    if (scope === "ALLIANCE" && allianceCode) localStorage.setItem(keyAlliance(allianceCode), theme);
    if (scope === "GLOBAL") localStorage.setItem(keyGlobal(), theme);
  } catch {}
}

function applyTheme(theme: ThemeKey) {
  const def = THEMES.find((t) => t.key === theme) || THEMES[0];

  // set dataset for future styling
  document.documentElement.setAttribute("data-sad-theme", theme);

  // install CSS vars into a dedicated style tag
  const id = "sad-theme-vars";
  let tag = document.getElementById(id) as HTMLStyleElement | null;
  if (!tag) {
    tag = document.createElement("style");
    tag.id = id;
    document.head.appendChild(tag);
  }

  const vars = Object.entries(def.vars)
    .map(([k, v]) => `${k}: ${v};`)
    .join(" ");

  tag.textContent = `:root { ${vars} } body { background: var(--sad-bg); color: var(--sad-text); }`;
}

export function AllianceThemePicker(props: { allianceCode?: string | null; compact?: boolean }) {
  const allianceCode = props.allianceCode || null;
  const compact = !!props.compact;

  const [scope, setScope] = useState<"ALLIANCE" | "GLOBAL">(allianceCode ? "ALLIANCE" : "GLOBAL");
  const [theme, setTheme] = useState<ThemeKey>(() => loadTheme(allianceCode));

  const canAlliance = useMemo(() => !!allianceCode, [allianceCode]);

  useEffect(() => {
    const t = loadTheme(allianceCode);
    setTheme(t);
    applyTheme(t);
  }, [allianceCode]);

  function onSave() {
    saveTheme(theme, allianceCode, scope);
    applyTheme(theme);
    window.alert(scope === "GLOBAL" ? "Saved global theme." : "Saved alliance theme.");
  }

  return (
    <div
      className="zombie-card"
      style={{
        padding: compact ? 10 : 14,
        borderRadius: 14,
        background: "var(--sad-card)",
        border: "1px solid var(--sad-border)",
      }}
    >
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ fontWeight: 900 }}>🎨 Theme</div>

        <select
          value={theme}
          onChange={(e) => setTheme((e.target.value as ThemeKey) || "night")}
          style={{
            height: 34,
            borderRadius: 10,
            padding: "0 10px",
            border: "1px solid var(--sad-border)",
            background: "rgba(0,0,0,0.25)",
            color: "var(--sad-text)",
            outline: "none",
            minWidth: 170,
          }}
        >
          {THEMES.map((t) => (
            <option value={t.key} key={t.key}>
              {t.label}
            </option>
          ))}
        </select>

        <select
          value={scope}
          onChange={(e) => setScope((e.target.value as any) || (canAlliance ? "ALLIANCE" : "GLOBAL"))}
          disabled={!canAlliance}
          title={canAlliance ? "Save per-alliance or global" : "Global only (no alliance in context)"}
          style={{
            height: 34,
            borderRadius: 10,
            padding: "0 10px",
            border: "1px solid var(--sad-border)",
            background: "rgba(0,0,0,0.25)",
            color: "var(--sad-text)",
            outline: "none",
            minWidth: 150,
            opacity: canAlliance ? 1 : 0.6,
          }}
        >
          <option value="ALLIANCE">Per Alliance</option>
          <option value="GLOBAL">Global</option>
        </select>

        <button className="zombie-btn" style={{ height: 34, padding: "0 12px" }} onClick={onSave}>
          💾 Save
        </button>

        <button
          className="zombie-btn"
          style={{ height: 34, padding: "0 12px" }}
          onClick={() => applyTheme(theme)}
          title="Preview without saving"
        >
          👁 Preview
        </button>
      </div>

      {allianceCode ? (
        <div style={{ marginTop: 8, fontSize: 12, opacity: 0.75 }}>
          Alliance context: <b>{allianceCode.toUpperCase()}</b>
        </div>
      ) : (
        <div style={{ marginTop: 8, fontSize: 12, opacity: 0.75 }}>No alliance context — Global theme only.</div>
      )}
    </div>
  );
}