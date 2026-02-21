export function detectAllianceFromPath(pathname: string): string | null {
  try {
    const p = (pathname || "").toString();
    // Matches:
    // /dashboard/WOC
    // /dashboard/WOC/guides
    // /dashboard/WOC/calendar
    const m = p.match(/^\/dashboard\/([^\/?#]+)(?:\/|$)/i);
    if (!m || !m[1]) return null;
    return String(m[1]).toUpperCase();
  } catch {
    return null;
  }
}