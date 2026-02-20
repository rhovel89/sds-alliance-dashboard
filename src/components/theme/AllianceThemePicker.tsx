import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

type ThemeKey = "night" | "plague" | "blood" | "ash";

const THEMES: { key: ThemeKey; label: string }[] = [
  { key: "night", label: "Night" },
  { key: "plague", label: "Plague" },
  { key: "blood", label: "Blood" },
  { key: "ash", label: "Ash" },
];

function k(alliance: string | null) {
  return alliance ? "sad_theme_alliance_v1_" + alliance.toUpperCase() : "sad_theme_global_v1";
}

function applyTheme(theme: string) {
  try {
    document.documentElement.dataset.theme = theme;
  } catch {}
  try {
    // keep compatibility with any existing global theme usage
    localStorage.setItem("theme", theme);
  } catch {}
}

export function AllianceThemePicker() {
  const { alliance_id } = useParams();
  const alliance = useMemo(() => (alliance_id ? String(alliance_id).toUpperCase() : null), [alliance_id]);

  const [theme, setTheme] = useState<ThemeKey>("night");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(k(alliance));
      const global = localStorage.getItem("sad_theme_global_v1") || localStorage.getItem("theme");
      const t = (saved || global || "night") as ThemeKey;
      setTheme(t);
      applyTheme(t);
    } catch {
      setTheme("night");
      applyTheme("night");
    }
  }, [alliance]);

  function setAndSave(next: ThemeKey) {
    setTheme(next);
    applyTheme(next);
    try {
      localStorage.setItem(k(alliance), next);
      if (!alliance) localStorage.setItem("sad_theme_global_v1", next);
    } catch {}
  }

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <div style={{ fontSize: 12, opacity: 0.85, fontWeight: 800 }}>Theme</div>
      <select
        value={theme}
        onChange={(e) => setAndSave(e.target.value as ThemeKey)}
        className="zombie-input"
        style={{
          padding: "8px 10px",
          borderRadius: 10,
          background: "rgba(0,0,0,0.25)",
          color: "inherit",
          border: "1px solid rgba(255,255,255,0.12)",
        }}
      >
        {THEMES.map((t) => (
          <option key={t.key} value={t.key}>
            {t.label}
          </option>
        ))}
      </select>
    </div>
  );
}