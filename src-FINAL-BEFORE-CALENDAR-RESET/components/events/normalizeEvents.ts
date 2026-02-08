export function normalizeEvents(raw: any[]) {
  if (!Array.isArray(raw)) return [];

  return raw
    .map(e => {
      if (!e?.start_time_utc) return null;

      const start = new Date(e.start_time_utc);
      if (isNaN(start.getTime())) return null;

      const end = e.end_time_utc ? new Date(e.end_time_utc) : start;

      return {
        ...e,
        startDate: start,
        endDate: end
      };
    })
    .filter(Boolean);
}
