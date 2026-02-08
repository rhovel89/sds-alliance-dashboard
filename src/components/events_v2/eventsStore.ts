import { supabase } from '../../lib/supabaseClient';

/* =========================
   EVENTS
========================= */

export async function upsertEvent(event: any) {
  const { data, error } = await supabase
    .from('alliance_events')
    .upsert(event)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteEvent(id: string) {
  const { error } = await supabase
    .from('alliance_events')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/* =========================
   EXCEPTIONS (RESTORED)
========================= */

export async function listExceptionsForEventIds(eventIds: string[]) {
  if (!eventIds.length) return [];

  const { data, error } = await supabase
    .from('alliance_event_exceptions')
    .select('*')
    .in('event_id', eventIds);

  if (error) throw error;
  return data ?? [];
}

export async function upsertExceptionSkip(eventId: string, iso: string) {
  const { data, error } = await supabase
    .from('alliance_event_exceptions')
    .upsert({
      event_id: eventId,
      occurrence_date: iso,
      action: 'skip'
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function upsertExceptionOverride(payload: any) {
  const { data, error } = await supabase
    .from('alliance_event_exceptions')
    .upsert({
      event_id: payload.eventId,
      occurrence_date: payload.occurrenceDate,
      action: 'override',
      new_date: payload.newDate,
      new_start_time: payload.newStartTime,
      new_end_time: payload.newEndTime,
      new_title: payload.newTitle,
      new_description: payload.newDescription
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/* =========================
   TEMPLATE RUNNER (RPC)
========================= */

export async function runEventTemplate(templateId: string) {
  const { data, error } = await supabase.rpc(
    'generate_event_from_template',
    { template_id: templateId }
  );

  if (error) throw error;
  return data;
}
