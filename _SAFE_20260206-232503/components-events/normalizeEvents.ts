export function normalizeEvents(raw: any[]) {
  return (raw || [])
    .map((e) => {
      const start = e?.start_time_utc ? new Date(e.start_time_utc) : null;
      const end = e?.end_time_utc ? new Date(e.end_time_utc) : null;

      if (!start || isNaN(start.getTime())) return null;

      // derive an event_date key (YYYY-MM-DD) for calendar placement
      const yyyy = start.getUTCFullYear();
      const mm = String(start.getUTCMonth() + 1).padStart(2, "0");
      const dd = String(start.getUTCDate()).padStart(2, "0");
      const event_date = ${yyyy}--;

      return {
        ...e,
        startDate: start,
        endDate: end && !isNaN(end.getTime()) ? end : start,
        event_date,
      };
    })
    .filter(Boolean) as any[];
}
