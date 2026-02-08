import { supabase } from '../../lib/supabaseClient';
import type { CalendarEvent, EventException } from './types';

const EVENTS_TABLE = 'dashboard_calendar_events';
const EXC_TABLE = 'dashboard_calendar_event_exceptions';

type DbEventRow = {
  id: string;
  created_by: string;
  alliance_id: string | null; // TEXT
  visibility: 'personal' | 'alliance';
  title: string;
  description: string | null;
  start_date: string; // YYYY-MM-DD
  start_time: string | null; // HH:mm:ss or HH:mm
  end_time: string | null;
  frequency: 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly';
  days_of_week: number[] | null;
};

type DbExcRow = {
  id: string;
  event_id: string;
  created_by: string;
  occurrence_date: string; // YYYY-MM-DD
  action: 'skip' | 'override';
  new_date: string | null;
  new_start_time: string | null;
  new_end_time: string | null;
  new_title: string | null;
  new_description: string | null;
};

export type UserAlliance = {
  id: string;     // TEXT
  label: string;  // display name
};

function pickLabel(row: any): string {
  return (
    row?.name ??
    row?.alliance_name ??
    row?.title ??
    row?.display_name ??
    row?.tag ??
    row?.id ??
    'Alliance'
  );
}

function toEvent(r: DbEventRow): CalendarEvent {
  return {
    id: r.id,
    title: r.title,
    description: r.description || undefined,
    startDate: r.start_date,
    startTime: r.start_time ? r.start_time.slice(0, 5) : undefined,
    endTime: r.end_time ? r.end_time.slice(0, 5) : undefined,
    frequency: r.frequency,
    daysOfWeek: r.days_of_week || undefined,
    visibility: r.visibility,
    allianceId: r.alliance_id,
  };
}

function toEventPayload(ev: CalendarEvent, userId: string) {
  const visibility = ev.visibility ?? 'personal';
  const allianceId = visibility === 'alliance' ? (ev.allianceId ?? null) : null;

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

function toException(r: DbExcRow): EventException {
  return {
    id: r.id,
    eventId: r.event_id,
    occurrenceDate: r.occurrence_date,
    action: r.action,
    newDate: r.new_date,
    newStartTime: r.new_start_time ? r.new_start_time.slice(0, 5) : null,
    newEndTime: r.new_end_time ? r.new_end_time.slice(0, 5) : null,
    newTitle: r.new_title,
    newDescription: r.new_description,
  };
}

export async function getCurrentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}

export async function listVisibleEvents(): Promise<CalendarEvent[]> {
  const { data, error } = await supabase
    .from(EVENTS_TABLE)
    .select('*')
    .order('start_date', { ascending: true });

  if (error) {
  console.error('EXCEPTION UPSERT ERROR:', error);
  throw error;
}

  return (data as DbEventRow[]).map(toEvent);
}

export async function upsertEvent(ev: CalendarEvent): Promise<CalendarEvent> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('Not authenticated');

  const payload = toEventPayload(ev, userId);

  const { data, error } = await supabase
    .from(EVENTS_TABLE)
    .upsert(payload, { onConflict: 'id' })
    .select('*')
    .single();

  if (error) throw error;
  return toEvent(data as DbEventRow);
}

export async function deleteEvent(id: string): Promise<void> {
  const { error } = await supabase
    .from(EVENTS_TABLE)
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function listUserAlliances(): Promise<UserAlliance[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  const { data: mem, error: memErr } = await supabase
    .from('alliance_members')
    .select('alliance_id')
    .eq('user_id', userId);

  if (memErr) throw memErr;

  const ids = (mem || []).map((r: any) => r.alliance_id).filter(Boolean);
  if (ids.length === 0) return [];

  const { data: alls, error: allErr } = await supabase
    .from('alliances')
    .select('*')
    .in('id', ids);

  if (allErr) throw allErr;

  return (alls || []).map((row: any) => ({
    id: String(row.id),
    label: String(pickLabel(row)),
  }));
}

/** Exceptions: list all exceptions for a set of event ids (RLS restricts to owned events) */
export async function listExceptionsForEventIds(eventIds: string[]): Promise<EventException[]> {
  if (eventIds.length === 0) return [];

  const { data, error } = await supabase
    .from(EXC_TABLE)
    .select('*')
    .in('event_id', eventIds);

  if (error) throw error;
  return (data as DbExcRow[]).map(toException);
}

export async function upsertExceptionSkip(eventId: string, occurrenceDate: string): Promise<EventException> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('Not authenticated');

  const payload = {
    event_id: eventId,
    created_by: userId,
    occurrence_date: occurrenceDate,
    action: 'skip',
    new_date: null,
    new_start_time: null,
    new_end_time: null,
    new_title: null,
    new_description: null,
  };

  const { data, error } = await supabase
    .from(EXC_TABLE)
    .upsert(payload, { onConflict: 'event_id,occurrence_date' })
    .select('*')
    .single();

  if (error) throw error;
  return toException(data as DbExcRow);
}

export async function upsertExceptionOverride(params: {
  eventId: string;
  occurrenceDate: string;
  newDate: string;
  newStartTime?: string | null;
  newEndTime?: string | null;
  newTitle?: string | null;
  newDescription?: string | null;
}): Promise<EventException> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('Not authenticated');

  const payload = {
    event_id: params.eventId,
    created_by: userId,
    occurrence_date: params.occurrenceDate,
    action: 'override',
    new_date: params.newDate,
    new_start_time: params.newStartTime ? (params.newStartTime.length === 5 ? params.newStartTime + ':00' : params.newStartTime) : null,
    new_end_time: params.newEndTime ? (params.newEndTime.length === 5 ? params.newEndTime + ':00' : params.newEndTime) : null,
    new_title: params.newTitle ?? null,
    new_description: params.newDescription ?? null,
  };

  const { data, error } = await supabase
    .from(EXC_TABLE)
    .upsert(payload, { onConflict: 'event_id,occurrence_date' })
    .select('*')
    .single();

  if (error) throw error;
  return toException(data as DbExcRow);
}

export async function deleteException(eventId: string, occurrenceDate: string): Promise<void> {
  const { error } = await supabase
    .from(EXC_TABLE)
    .delete()
    .eq('event_id', eventId)
    .eq('occurrence_date', occurrenceDate);

  if (error) throw error;
}
