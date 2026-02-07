export function normalizeEvents(raw: any[]) {
  return raw
    .map(e => {
      const start = e.start_time_utc ? new Date(e.start_time_utc) : null;
      const end = e.end_time_utc ? new Date(e.end_time_utc) : null;

      if (!start || isNaN(start.getTime())) return null;

      return {
        ...e,
        startDate: start,
        endDate: end ?? start
      };
    })
    .filter(Boolean);
}
