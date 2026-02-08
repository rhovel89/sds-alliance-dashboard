export function normalizeEvents(events: any[]) {
  return events.map(e => {
    const date =
      e.event_date ||
      (e.start_time_utc
        ? new Date(e.start_time_utc).toISOString().split('T')[0]
        : null);

    return {
      ...e,
      __eventDate: date
    };
  });
}
