import { supabase } from '../../lib/supabaseClient';
import type { CalendarEvent } from './types';

const TABLE = 'dashboard_calendar_events';

type DbRow = {
  id: string;
  created_by: string;
  alliance_id: string | null;
  visibility: 'personal' | 'alliance';
  title: string;
  description: string | null;
  start_date: string; // YYYY-MM-DD
  start_time: string | null; // HH:mm:ss or HH:mm
  end_time: string | null;
  frequency: 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly';
  days_of_week: number[] | null;
};

function toEvent(r: DbRow): CalendarEvent {
  return {
    id: r.id,
    title: r.title,
    description: r.description || undefined,
    startDate: r.start_date,
    startTime: r.start_time ? r.start_time.slice(0, 5) : undefined,
    endTime: r.end_time ? r.end_time.slice(0, 5) : undefined,
    frequency: r.frequency,
    daysOfWeek: r.days_of_week || undefined,
  };
}

function toPayload(ev: CalendarEvent, userId: string, visibility: 'personal' | 'alliance', allianceId: string | null) {
  return {
    id: ev.id,
    created_by: userId,
    alliance_id: allianceId,
    visibility,
    title: ev.title,
    description: ev.description ?? null,
    start_date: ev.startDate,
    start_time: ev.startTime ? (ev.startTime.length === 5 ? ev.startTime + ':00' : ev.startTime) : null,
    end_time: ev.endTime ? (ev.endTime.length === 5 ? ev.endTime + ':00' : ev.endTime) : null,
    frequency: (ev.frequency || 'none'),
    days_of_week: ev.daysOfWeek && ev.daysOfWeek.length > 0 ? ev.daysOfWeek : null,
  };
}

export async function getCurrentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}

export async function listVisibleEvents(): Promise<CalendarEvent[]> {
  // RLS already enforces "both" visibility rules.
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('start_date', { ascending: true });

  if (error) throw error;
  return (data as DbRow[]).map(toEvent);
}

export async function upsertEvent(
  ev: CalendarEvent,
  visibility: 'personal' | 'alliance',
  allianceId: string | null
): Promise<CalendarEvent> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('Not authenticated');

  const payload = toPayload(ev, userId, visibility, allianceId);

  const { data, error } = await supabase
    .from(TABLE)
    .upsert(payload, { onConflict: 'id' })
    .select('*')
    .single();

  if (error) throw error;
  return toEvent(data as DbRow);
}
