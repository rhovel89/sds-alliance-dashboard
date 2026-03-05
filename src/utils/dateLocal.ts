export function pad2(n: number) { return String(n).padStart(2, "0"); }

// Local calendar day key (NOT UTC)
export function toLocalISODate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

// Parse "YYYY-MM-DD" as LOCAL midnight (avoids UTC shift)
export function parseISODateLocal(iso: string): Date {
  const [y, m, dd] = String(iso || "").split("-").map((v) => Number(v));
  if (!y || !m || !dd) return new Date(NaN);
  return new Date(y, m - 1, dd);
}
