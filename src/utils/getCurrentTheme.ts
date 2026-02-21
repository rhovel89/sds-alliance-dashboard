function safeParse(raw: string | null): any {
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

function pickFromAny(obj: any, allianceCode?: string | null): string | null {
  if (!obj) return null;

  // string store
  if (typeof obj === "string") return obj || null;

  // common shapes
  if (typeof obj.theme === "string" && obj.theme) return obj.theme;
  if (typeof obj.value === "string" && obj.value) return obj.value;
  if (typeof obj.global === "string" && obj.global) return obj.global;
  if (typeof obj.globalTheme === "string" && obj.globalTheme) return obj.globalTheme;

  const a = (allianceCode || "").toUpperCase();
  if (a) {
    const candidates = [
      obj.alliances,
      obj.byAlliance,
      obj.themeByAlliance,
      obj.themes,
      obj.map,
      obj.perAlliance,
    ];
    for (const c of candidates) {
      if (c && typeof c === "object") {
        const v = c[a];
        if (typeof v === "string" && v) return v;
        if (v && typeof v === "object" && typeof v.theme === "string" && v.theme) return v.theme;
      }
    }
  }

  return null;
}

export function getCurrentTheme(allianceCode?: string | null): string | null {
  try {
    const de = document?.documentElement as any;
    const body = document?.body as any;

    const fromDom =
      de?.dataset?.theme ||
      de?.getAttribute?.("data-theme") ||
      body?.dataset?.theme ||
      body?.getAttribute?.("data-theme");

    if (fromDom) return String(fromDom);

    // class-based themes: "theme-plague" or "plague"
    const cls = (de?.className || "").toString();
    const m = cls.match(/theme-([a-z0-9_-]+)/i);
    if (m && m[1]) return String(m[1]);

    // localStorage fallback (handles old/new keys)
    const keys = [
      "sad_theme_v1",
      "sad_theme",
      "sad_ui_theme",
      "sad_theme_mode",
      "sad_alliance_theme_v1",
      "sad_alliance_theme_map_v1",
      "sad_theme_by_alliance_v1",
      "sad_theme_by_alliance",
    ];

    // Also try per-alliance direct keys
    const a = (allianceCode || "").toUpperCase();
    if (a) {
      keys.unshift(`sad_alliance_theme_${a}`);
      keys.unshift(`sad_theme_${a}`);
    }

    for (const k of keys) {
      let raw: string | null = null;
      try { raw = localStorage.getItem(k); } catch {}
      if (!raw) continue;

      const parsed = safeParse(raw);
      const picked = pickFromAny(parsed ?? raw, allianceCode);
      if (picked) return picked;
    }

    return null;
  } catch {
    return null;
  }
}