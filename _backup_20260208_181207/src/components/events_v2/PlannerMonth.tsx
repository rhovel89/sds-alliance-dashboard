import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import type { CalendarEvent, EventException } from "./types";
import { WEEKDAY_LABELS_SUN_FIRST, buildMonthGrid, monthLabel, toLocalISODate } from "./dateUtils";
import { DayCell } from "./DayCell";
import { AgendaPanel } from "./AgendaPanel";
import { EventModal } from "./EventModal";
import {
  deleteEvent,
  upsertEvent,
  listExceptionsForEventIds,
  upsertExceptionSkip,
  upsertExceptionOverride
} from "./eventsStore";

type Props = {
  allianceId: string;
};

function isUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

function uid(): string {
  if (crypto?.randomUUID) return crypto.randomUUID();
  return "00000000-0000-4000-8000-" +
    Math.random().toString(16).slice(2).padEnd(12, "0").slice(0, 12);
}

/* ===============================
   🔧 MISSING FUNCTION — RESTORED
   =============================== */
function buildExpanded(
  events: CalendarEvent[],
  exceptions: EventException[],
  rangeStart: Date,
  rangeEnd: Date
) {
  const occurrencesByDay = new Map<string, CalendarEvent[]>();
  const skippedMarkersByDay = new Map<string, CalendarEvent[]>();
  const exceptionFlagByDay = new Map<string, boolean>();

  for (const ev of events) {
    const iso = ev.startDate;
    if (!iso) continue;

    const d = new Date(iso + "T00:00:00");
    if (d < rangeStart || d > rangeEnd) continue;

    const list = occurrencesByDay.get(iso) ?? [];
    list.push(ev);
    occurrencesByDay.set(iso, list);
  }

  return {
    occurrencesByDay,
    skippedMarkersByDay,
    exceptionFlagByDay
  };
}
/* =============================== */

export function PlannerMonth({ allianceId }: Props) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [monthIndex0, setMonthIndex0] = useState(now.getMonth());
  const [selectedIso, setSelectedIso] = useState(toLocalISODate(now));

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [exceptions, setExceptions] = useState<EventException[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [editingOccurrenceIso, setEditingOccurrenceIso] = useState(toLocalISODate(now));

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("alliance_events")
        .select("*")
        .eq("alliance_id", allianceId);

      if (error) {
        console.error("Event load failed:", error);
        setEvents([]);
        return;
      }

      setEvents(data ?? []);
    })();
  }, [allianceId]);

  useEffect(() => {
    (async () => {
      try {
        const ids = events.filter(e => isUuid(e.id)).map(e => e.id);
        const ex = await listExceptionsForEventIds(ids);
        setExceptions(ex);
      } catch {
        setExceptions([]);
      }
    })();
  }, [events]);

  const grid = useMemo(() => buildMonthGrid(year, monthIndex0), [year, monthIndex0]);

  const expanded = useMemo(() => {
    const rangeStart = grid[0]?.date ?? new Date(year, monthIndex0, 1);
    const rangeEnd = grid[41]?.date ?? new Date(year, monthIndex0, 28);
    return buildExpanded(events, exceptions, rangeStart, rangeEnd);
  }, [events, exceptions, grid, year, monthIndex0]);

  const { occurrencesByDay, skippedMarkersByDay, exceptionFlagByDay } = expanded;
  const selectedEvents = occurrencesByDay.get(selectedIso) || [];
  const selectedMarkers = skippedMarkersByDay.get(selectedIso) || [];

  const todayIso = toLocalISODate(new Date());

  return (
    <div className="v2-planner">
      <div className="v2-planner__main">

        <div className="v2-toolbar">
          <button onClick={() => setMonthIndex0(m => m === 0 ? 11 : m - 1)}>‹</button>
          <div>{monthLabel(year, monthIndex0)}</div>
          <button onClick={() => setMonthIndex0(m => m === 11 ? 0 : m + 1)}>›</button>
          <button onClick={() => {
            const d = new Date();
            setYear(d.getFullYear());
            setMonthIndex0(d.getMonth());
            setSelectedIso(toLocalISODate(d));
          }}>Today</button>
        </div>

        <div className="v2-weekdays">
          {WEEKDAY_LABELS_SUN_FIRST.map(w => <div key={w}>{w}</div>)}
        </div>

        <div className="v2-grid">
          {grid.map(cell => (
            <DayCell
              key={cell.iso}
              dayNumber={cell.date.getDate()}
              iso={cell.iso}
              inCurrentMonth={cell.inCurrentMonth}
              isToday={cell.iso === todayIso}
              isSelected={cell.iso === selectedIso}
              eventCount={(occurrencesByDay.get(cell.iso) || []).length}
              eventTitles={(occurrencesByDay.get(cell.iso) || []).map(o => o.title)}
              hasException={exceptionFlagByDay.get(cell.iso)}
              onClick={(iso) => {
                setSelectedIso(iso);
                setEditingEvent(null);
                setEditingOccurrenceIso(iso);
                setIsModalOpen(true);
              }}
            />
          ))}
        </div>
      </div>

      <AgendaPanel
        selectedIso={selectedIso}
        eventsForDay={selectedEvents}
        markersForDay={selectedMarkers}
        onAddClick={() => setIsModalOpen(true)}
        onEditClick={(occ: any) => {
          const base = events.find(e => e.id === (occ.sourceId || occ.id));
          if (base) {
            setEditingEvent(base);
            setIsModalOpen(true);
          }
        }}
      />

      <EventModal
        isOpen={isModalOpen}
        mode={editingEvent ? "edit" : "create"}
        selectedIso={selectedIso}
        initial={editingEvent}
        alliances={[]}
        onClose={() => setIsModalOpen(false)}
        onSave={async (draft: any) => {
          const base = editingEvent ? { ...editingEvent } : { id: uid(), startDate: draft.startDate };
          const ensuredId = isUuid(base.id) ? base.id : uid();

          const next: CalendarEvent = {
            ...base,
            id: ensuredId,
            title: draft.title,
            description: draft.description,
            startDate: draft.startDate,
            startTime: draft.startTime,
            endTime: draft.endTime,
            frequency: draft.frequency,
            daysOfWeek: draft.daysOfWeek,
            allianceId,
          };

          const saved = await upsertEvent(next);
          setEvents(prev =>
            prev.some(e => e.id === saved.id)
              ? prev.map(e => e.id === saved.id ? saved : e)
              : [saved, ...prev]
          );

          setIsModalOpen(false);
          setEditingEvent(null);
        }}
        onDelete={editingEvent ? async () => {
          if (editingEvent && isUuid(editingEvent.id)) {
            await deleteEvent(editingEvent.id);
            setEvents(prev => prev.filter(e => e.id !== editingEvent.id));
          }
          setIsModalOpen(false);
          setEditingEvent(null);
        } : undefined}
        occurrenceIso={editingOccurrenceIso}
      />
    </div>
  );
}
