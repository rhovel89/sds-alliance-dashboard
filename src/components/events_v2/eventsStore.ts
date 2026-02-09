import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import type { CalendarEvent, EventException } from "./types";

/* ---------------- EVENTS ---------------- */

export async function upsertEvent(event: CalendarEvent) {
  const { data, error } = await supabase
    .from("alliance_events")
    .upsert(event)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function deleteEvent(id: string) {
  const { error } = await supabase
    .from("alliance_events")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

/* ---------------- EXCEPTIONS ---------------- */

export async function listExceptionsForEventIds(eventIds: string[]) {
  if (eventIds.length === 0) return [];

  const { data, error } = await supabase
    .from("alliance_event_exceptions")
    .select("*")
    .in("event_id", eventIds);

  if (error) throw error;
  return data as EventException[];
}

export async function upsertExceptionSkip(eventId: string, occurrenceDate: string) {
  const { data, error } = await supabase
    .from("alliance_event_exceptions")
    .upsert({
      event_id: eventId,
      occurrence_date: occurrenceDate,
      action: "skip",
    })
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function upsertExceptionOverride(payload: {
  eventId: string;
  occurrenceDate: string;
  newDate: string;
  newStartTime?: string | null;
  newEndTime?: string | null;
  newTitle?: string | null;
  newDescription?: string | null;
}) {
  const { data, error } = await supabase
    .from("alliance_event_exceptions")
    .upsert({
      event_id: payload.eventId,
      occurrence_date: payload.occurrenceDate,
      action: "override",
      new_date: payload.newDate,
      new_start_time: payload.newStartTime,
      new_end_time: payload.newEndTime,
      new_title: payload.newTitle,
      new_description: payload.newDescription,
    })
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
}

/* ---------------- TEMPLATE RUN ---------------- */

export async function runEventTemplate(templateId: string, runDate?: string) {
  const effectiveDate =
    runDate ?? new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase.rpc(
    "generate_event_from_template",
    {
      p_template_id: templateId,
      p_run_date: effectiveDate,
    }
  );

  if (error) {
    console.error("RPC error:", error);
    throw error;
  }

  return data;
}

import { logAllianceActivity } from '../../lib/activityLogger';
export async function logEventCreated(allianceId: string, title: string) {
  try {
    await logAllianceActivity({
      allianceId,
      actionType: "event_created",
      actionLabel: title
    });
  } catch {}
}

export async function logEventDeleted(allianceId: string, title: string) {
  try {
    await logAllianceActivity({
      allianceId,
      actionType: "event_deleted",
      actionLabel: title
    });
  } catch {}
}
