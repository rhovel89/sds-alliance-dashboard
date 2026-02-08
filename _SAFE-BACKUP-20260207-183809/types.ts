export type CalendarEvent = {
  id: string;
  title: string;
  description?: string;
  startDate: string; // YYYY-MM-DD (local)
  startTime?: string; // HH:mm
  endTime?: string;   // HH:mm
  frequency?: 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly';
  daysOfWeek?: number[]; // 0=Sun..6=Sat

  visibility?: 'personal' | 'alliance';
  allianceId?: string | null; // TEXT to match your DB
};

export type EventException = {
  id: string;
  eventId: string;          // uuid of dashboard_calendar_events
  occurrenceDate: string;   // YYYY-MM-DD (the occurrence being modified)
  action: 'skip' | 'override';

  newDate?: string | null;        // YYYY-MM-DD
  newStartTime?: string | null;   // HH:mm
  newEndTime?: string | null;     // HH:mm
  newTitle?: string | null;
  newDescription?: string | null;
};
