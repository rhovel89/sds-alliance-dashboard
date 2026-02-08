export type CalendarEvent = {
  id: string;
  title: string;
  description?: string;
  startDate: string; // YYYY-MM-DD (local)
  startTime?: string; // HH:mm
  endTime?: string;   // HH:mm
  frequency?: 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly';

  // 0=Sun ... 6=Sat
  daysOfWeek?: number[];

  // Sharing
  visibility?: 'personal' | 'alliance';
  allianceId?: string | null; // TEXT to match your DB alliances.id
};
