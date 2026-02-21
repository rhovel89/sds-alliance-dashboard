import React, { useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";

const GLOBAL_KEY = "sad_theme_global_v1";
const PREFIX = "sad_theme_alliance_v1_";

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

function applyTheme(theme: string) {
  document.documentElement.dataset.theme = theme;
}

export default function ThemeBootstrap() {
  const loc = useLocation();
  const alliance = useMemo(() => allianceFromPath(loc.pathname), [loc.pathname]);

  useEffect(() => {
    const t = readTheme(alliance);
    applyTheme(t);
  }, [alliance]);

  return null;
}