export type CalendarEvent = {
  id: string;
  title: string;
  description?: string;
  startDate: string; // YYYY-MM-DD (local)
  startTime?: string; // HH:mm
  endTime?: string;   // HH:mm
  frequency?: 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly';

  // 0=Sun ... 6=Sat
  // Used when frequency is weekly/biweekly/monthly (optional)
  daysOfWeek?: number[];
};
