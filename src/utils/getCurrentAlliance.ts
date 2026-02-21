import { detectAllianceFromPath } from "./detectAllianceFromPath";

const KEY = "sad_last_alliance_code_v1";

export function getCurrentAlliance(pathname?: string): string | null {
  const path = (pathname ?? (typeof window !== "undefined" ? window.location.pathname : "")) || "";
  const fromPath = detectAllianceFromPath(path);
  if (fromPath) {
    try { localStorage.setItem(KEY, fromPath); } catch {}
    return fromPath;
  }

  try {
    const last = localStorage.getItem(KEY);
    if (last) return String(last).toUpperCase();
  } catch {}

  return null;
}