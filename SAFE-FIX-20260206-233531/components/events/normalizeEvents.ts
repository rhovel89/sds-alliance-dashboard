export type NormalizedEvent = {
  id: string;
  title: string;
  event_date: string; // YYYY-MM-DD
  startDate: Date;
  endDate: Date;
};

export function normalizeEvents(raw: any[]): NormalizedEvent[] {
  return raw
    .map(e => {
      if (!e.start_time_utc) return null;

      const start = new Date(e.start_time_utc);
      if (isNaN(start.getTime())) return null;

      const end = e.end_time_utc
        ? new Date(e.end_time_utc)
        : start;

      const yyyy = start.getUTCFullYear();
      const mm = String(start.getUTCMonth() + 1).padStart(2, "0");
      const dd = String(start.getUTCDate()).padStart(2, "0");

      return {
        ...e,
        event_date: `${yyyy}-${mm}-${dd}`,
        startDate: start,
        endDate: end
      };
    })
    .filter(Boolean) as NormalizedEvent[];
}
