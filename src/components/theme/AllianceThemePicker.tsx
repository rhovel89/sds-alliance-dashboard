import React, { useMemo, useState } from "react";
import { useLocation, useParams } from "react-router-dom";

const GLOBAL_KEY = "sad_theme_global_v1";
const PREFIX = "sad_theme_alliance_v1_";

const THEMES = [
  { key: "night", label: "Night (default)" },
  { key: "blood", label: "Blood" },
  { key: "toxic", label: "Toxic" },
  { key: "graveyard", label: "Graveyard" },
  { key: "neon", label: "Neon" },
  { key: "classic", label: "Classic" },
];

function allianceFromPath(pathname: string): string | null {
  const m = pathname.match(/^\/dashboard\/([^\/?#]+)/i);
  if (!m) return null;
  const code = String(m[1] || "").trim();
  return code ? code.toUpperCase() : null;
}

function readTheme(alliance: string | null): string {
  try {
    if (alliance) {
      const t = localStorage.getItem(PREFIX + alliance);
      if (t) return t;
    }
    const g = localStorage.getItem(GLOBAL_KEY);
    return g || "night";
  } catch {
    return "night";
  }
}

function saveTheme(alliance: string | null, theme: string) {
  try {
    if (alliance) localStorage.setItem(PREFIX + alliance, theme);
    localStorage.setItem(GLOBAL_KEY, theme); // keep a global fallback
  } catch {}
  document.documentElement.dataset.theme = theme;
}

export function AllianceThemePicker() {
  const loc = useLocation();
  const params = useParams();

  const alliance = useMemo(() => {
    const p = (params as any)?.alliance_id;
    if (p) return String(p).toUpperCase();
    return allianceFromPath(loc.pathname);
  }, [loc.pathname, params]);

  const [theme, setTheme] = useState<string>(() => readTheme(alliance));

  // when alliance changes, reload saved theme
  React.useEffect(() => {
    setTheme(readTheme(alliance));
  }, [alliance]);

  return (
    <div
      className="zombie-card"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 10px",
        borderRadius: 999,
        whiteSpace: "nowrap",
      }}
      title={alliance ? ("Theme for " + alliance) : "Theme (global)"}
    >
      <div style={{ fontWeight: 900, fontSize: 12 }}>🎨 Theme</div>
      <select
        className="zombie-input"
        value={theme}
        onChange={(e) => {
          const v = e.target.value;
          setTheme(v);
          saveTheme(alliance, v);
        }}
        style={{ padding: "6px 8px", fontSize: 12 }}
      >
        {THEMES.map((t) => (
          <option key={t.key} value={t.key}>{t.label}</option>
        ))}
      </select>
    </div>
  );
}

export default AllianceThemePicker;