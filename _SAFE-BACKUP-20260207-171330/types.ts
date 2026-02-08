export type CalendarEvent = {
  id: string;
  title: string;
  description?: string;
  startDate: string; // YYYY-MM-DD (local)
  startTime?: string; // HH:mm
  endTime?: string;   // HH:mm
  frequency?: 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly';
};
