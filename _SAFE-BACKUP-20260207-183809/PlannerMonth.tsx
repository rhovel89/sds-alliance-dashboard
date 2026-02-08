import React, { useEffect, useMemo, useState } from 'react';
import type { CalendarEvent, EventException } from './types';
import { WEEKDAY_LABELS_SUN_FIRST, buildMonthGrid, monthLabel, toLocalISODate } from './dateUtils';
import { DayCell } from './DayCell';
import { AgendaPanel } from './AgendaPanel';
import { EventModal } from './EventModal';
import {
  deleteEvent,
  listUserAlliances,
  listVisibleEvents,
  upsertEvent,
  type UserAlliance,
  listExceptionsForEventIds,
  upsertExceptionSkip,
  upsertExceptionOverride,
} from './eventsStore';

function isUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

function uid(): string {
  // Always prefer a real UUID for Supabase uuid columns
  const g: any = globalThis as any;
  if (g.crypto && typeof g.crypto.randomUUID === 'function') return g.crypto.randomUUID();
  // fallback (should be rare)
  return '00000000-0000-4000-8000-' + Math.random().toString(16).slice(2).padEnd(12, '0').slice(0, 12);
}

type Props = {
  initialEvents?: CalendarEvent[];
};

type Frequency = 'daily' | 'weekly' | 'biweekly' | 'monthly';
type Visibility = 'personal' | 'alliance';

type Draft = {
  title: string;
  description: string;
  startDate: string;
  startTime: string;
  endTime: string;
  frequency: Frequency;
  daysOfWeek: number[];
  visibility: Visibility;
  allianceId: string | null;
};

const STORAGE_KEY = 'state-alliance-events-v2';

function safeParseEvents(raw: string | null): CalendarEvent[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(Boolean) as CalendarEvent[];
  } catch {
    return [];
  }
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, days: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);
}

function dateFromIso(iso: string): Date {
  return new Date(iso + 'T00:00:00');
}

function daysBetween(a: Date, b: Date): number {
  const ms = startOfDay(b).getTime() - startOfDay(a).getTime();
  return Math.floor(ms / 86400000);
}

function weeksBetween(a: Date, b: Date): number {
  return Math.floor(daysBetween(a, b) / 7);
}

type Occurrence = CalendarEvent & {
  sourceId: string;
  occurrenceDate: string;
};

function makeOccurrence(ev: CalendarEvent, iso: string): Occurrence {
  return {
    ...ev,
    startDate: iso,
    sourceId: ev.id,
    occurrenceDate: iso,
    id: ev.id + '@' + iso,
  };
}

function buildExceptionMap(exceptions: EventException[]) {
  const map = new Map<string, Map<string, EventException>>();
  for (const ex of exceptions) {
    const byDate = map.get(ex.eventId) || new Map<string, EventException>();
    byDate.set(ex.occurrenceDate, ex);
    map.set(ex.eventId, byDate);
  }
  return map;
}

function isIsoInRange(iso: string, rangeStart: Date, rangeEnd: Date): boolean {
  const d = startOfDay(dateFromIso(iso));
  return d.getTime() >= startOfDay(rangeStart).getTime() && d.getTime() <= startOfDay(rangeEnd).getTime();
}

function expandEventsForRangeWithExceptions(
  baseEvents: CalendarEvent[],
  exceptions: EventException[],
  rangeStart: Date,
  rangeEnd: Date
): Map<string, Occurrence[]> {
  const map = new Map<string, Occurrence[]>();
  const exMap = buildExceptionMap(exceptions);

  function push(iso: string, occ: Occurrence) {
    const arr = map.get(iso) || [];
    arr.push(occ);
    map.set(iso, arr);
  }

  const rs = startOfDay(rangeStart);
  const re = startOfDay(rangeEnd);

  const overrideList = exceptions.filter((e) => e.action === 'override' && e.newDate);

  for (const ev of baseEvents) {
    const freq = ev.frequency || 'none';
    const start = startOfDay(dateFromIso(ev.startDate));
    const evDow = start.getDay();
    const dows = (ev.daysOfWeek && ev.daysOfWeek.length > 0) ? ev.daysOfWeek : [evDow];

    const byDate = exMap.get(ev.id);

    const iterStart = start.getTime() > rs.getTime() ? start : rs;

    function applyExceptionOrPush(baseIso: string) {
      const ex = byDate?.get(baseIso);
      if (!ex) {
        if (isIsoInRange(baseIso, rs, re)) push(baseIso, makeOccurrence(ev, baseIso));
        return;
      }

      if (ex.action === 'skip') return;

      if (ex.action === 'override' && ex.newDate) {
        const movedIso = ex.newDate;
        if (!isIsoInRange(movedIso, rs, re)) return;

        const moved: CalendarEvent = {
          ...ev,
          title: ex.newTitle ?? ev.title,
          description: ex.newDescription ?? ev.description,
          startTime: ex.newStartTime ?? ev.startTime,
          endTime: ex.newEndTime ?? ev.endTime,
        };

        push(movedIso, makeOccurrence(moved, movedIso));
        return;
      }

      if (isIsoInRange(baseIso, rs, re)) push(baseIso, makeOccurrence(ev, baseIso));
    }

    if (freq === 'none') {
      const iso = toLocalISODate(start);
      if (start.getTime() >= rs.getTime() && start.getTime() <= re.getTime()) {
        applyExceptionOrPush(iso);
      }
      continue;
    }

    if (freq === 'daily') {
      for (let d = startOfDay(iterStart); d.getTime() <= re.getTime(); d = addDays(d, 1)) {
        if (d.getTime() < start.getTime()) continue;
        applyExceptionOrPush(toLocalISODate(d));
      }
      continue;
    }

    if (freq === 'weekly' || freq === 'biweekly') {
      const mod = freq === 'biweekly' ? 2 : 1;

      for (let d = startOfDay(iterStart); d.getTime() <= re.getTime(); d = addDays(d, 1)) {
        if (d.getTime() < start.getTime()) continue;

        const dow = d.getDay();
        if (!dows.includes(dow)) continue;

        const w = weeksBetween(start, d);
        if (w % mod !== 0) continue;

        applyExceptionOrPush(toLocalISODate(d));
      }
      continue;
    }

    if (freq === 'monthly') {
      const targetDay = start.getDate();

      for (let d = startOfDay(iterStart); d.getTime() <= re.getTime(); d = addDays(d, 1)) {
        if (d.getTime() < start.getTime()) continue;
        if (d.getDate() !== targetDay) continue;

        applyExceptionOrPush(toLocalISODate(d));
      }
      continue;
    }
  }

  for (const ex of overrideList) {
    const ev = baseEvents.find((e) => e.id === ex.eventId);
    if (!ev) continue;

    const movedIso = ex.newDate as string;
    if (!isIsoInRange(movedIso, rs, re)) continue;

    const existing = map.get(movedIso) || [];
    if (existing.some((o) => o.sourceId === ev.id && o.occurrenceDate === movedIso)) continue;

    const moved: CalendarEvent = {
      ...ev,
      title: ex.newTitle ?? ev.title,
      description: ex.newDescription ?? ev.description,
      startTime: ex.newStartTime ?? ev.startTime,
      endTime: ex.newEndTime ?? ev.endTime,
    };

    push(movedIso, makeOccurrence(moved, movedIso));
  }

  for (const [iso, arr] of map.entries()) {
    arr.sort((a, b) => {
      const ta = a.startTime || '';
      const tb = b.startTime || '';
      return ta.localeCompare(tb);
    });
    map.set(iso, arr);
  }

  return map;
}

export function PlannerMonth({ initialEvents }: Props) {
  const now = new Date();
  const [year, setYear] = useState<number>(now.getFullYear());
  const [monthIndex0, setMonthIndex0] = useState<number>(now.getMonth());
  const [selectedIso, setSelectedIso] = useState<string>(toLocalISODate(now));

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [exceptions, setExceptions] = useState<EventException[]>([]);
  const [alliances, setAlliances] = useState<UserAlliance[]>([]);

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [editingOccurrenceIso, setEditingOccurrenceIso] = useState<string>(toLocalISODate(now));

  useEffect(() => {
    (async () => {
      try {
        const list = await listUserAlliances();
        setAlliances(list);
      } catch {
        setAlliances([]);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const remote = await listVisibleEvents();
        setEvents(remote);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(remote));
        return;
      } catch {
        const fromStorage = safeParseEvents(localStorage.getItem(STORAGE_KEY));
        if (fromStorage.length > 0) {
          setEvents(fromStorage);
          return;
        }
        if (initialEvents && initialEvents.length > 0) {
          setEvents(initialEvents);
          return;
        }
        setEvents([]);
      }
    })();
  }, [initialEvents]);

  useEffect(() => {
    (async () => {
      try {
        const ids = events.filter(e => isUuid(e.id)).map((e) => e.id);
        const ex = await listExceptionsForEventIds(ids);
        setExceptions(ex);
      } catch {
        setExceptions([]);
      }
    })();
  }, [events]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  }, [events]);

  const grid = useMemo(() => buildMonthGrid(year, monthIndex0), [year, monthIndex0]);

  const occurrencesByDay = useMemo(() => {
    const rangeStart = grid[0]?.date ? grid[0].date : new Date(year, monthIndex0, 1);
    const rangeEnd = grid[41]?.date ? grid[41].date : new Date(year, monthIndex0, 28);
    return expandEventsForRangeWithExceptions(events, exceptions, rangeStart, rangeEnd);
  }, [events, exceptions, grid, year, monthIndex0]);

  const selectedEvents = occurrencesByDay.get(selectedIso) || [];

  function goPrevMonth() {
    const m = monthIndex0 - 1;
    if (m < 0) {
      setMonthIndex0(11);
      setYear((y) => y - 1);
    } else {
      setMonthIndex0(m);
    }
  }

  function goNextMonth() {
    const m = monthIndex0 + 1;
    if (m > 11) {
      setMonthIndex0(0);
      setYear((y) => y + 1);
    } else {
      setMonthIndex0(m);
    }
  }

  function openCreateModal(forIso: string) {
    setSelectedIso(forIso);
    setEditingEvent(null);
    setEditingOccurrenceIso(forIso);
    setIsModalOpen(true);
  }

  function openEditModal(base: CalendarEvent, occurrenceIso: string) {
    setEditingEvent(base);
    setSelectedIso(occurrenceIso);
    setEditingOccurrenceIso(occurrenceIso);
    setIsModalOpen(true);
  }

  function handleDayClick(iso: string) {
    openCreateModal(iso);
  }

  function handleAddClick() {
    openCreateModal(selectedIso);
  }

  async function handleSave(draft: any) {
    const base: CalendarEvent = editingEvent
      ? { ...editingEvent }
      : { id: uid(), title: '', startDate: draft.startDate };

    // If somehow we still have a non-uuid id, upgrade it now
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
      visibility: draft.visibility,
      allianceId: draft.visibility === 'alliance' ? (draft.allianceId || null) : null,
    };

    try {
      const saved = await upsertEvent(next);
      setEvents((prev) => {
        const exists = prev.some((e) => e.id === saved.id || e.id === base.id);
        return exists
          ? prev.map((e) => (e.id === saved.id || e.id === base.id ? saved : e))
          : [saved, ...prev];
      });
      setIsModalOpen(false);
      setEditingEvent(null);
      setSelectedIso(saved.startDate);
    } catch {
      setEvents((prev) => {
        const exists = prev.some((ev) => ev.id === next.id);
        return exists ? prev.map((ev) => (ev.id === next.id ? next : ev)) : [next, ...prev];
      });
      setIsModalOpen(false);
      setEditingEvent(null);
      setSelectedIso(next.startDate);
    }
  }

  async function handleDelete() {
    if (!editingEvent) return;
    const id = editingEvent.id;

    try {
      if (isUuid(id)) await deleteEvent(id);
    } catch {}

    setEvents((prev) => prev.filter((e) => e.id !== id));
    setIsModalOpen(false);
    setEditingEvent(null);
  }

  async function ensureEditingEventUuid(): Promise<CalendarEvent | null> {
    if (!editingEvent) return null;
    if (isUuid(editingEvent.id)) return editingEvent;

    // Migrate the rule event to a real UUID in Supabase
    const migrated: CalendarEvent = { ...editingEvent, id: uid() };

    try {
      const saved = await upsertEvent(migrated);
      setEvents((prev) => prev.map((e) => (e.id === editingEvent.id ? saved : e)));
      setEditingEvent(saved);
      return saved;
    } catch {
      return null;
    }
  }

  async function handleSkipOccurrence(occIso: string) {
    const base = await ensureEditingEventUuid();
    if (!base) return;

    try {
      const ex = await upsertExceptionSkip(base.id, occIso);
      setExceptions((prev) => {
        const filtered = prev.filter((p) => !(p.eventId === ex.eventId && p.occurrenceDate === ex.occurrenceDate));
        return [ex, ...filtered];
      });
      setIsModalOpen(false);
      setEditingEvent(null);
    } catch {}
  }

  async function handleMoveOccurrence(args: {
    occurrenceIso: string;
    newDate: string;
    newStartTime?: string | null;
    newEndTime?: string | null;
    newTitle?: string | null;
    newDescription?: string | null;
  }) {
    const base = await ensureEditingEventUuid();
    if (!base) return;

    try {
      const ex = await upsertExceptionOverride({
        eventId: base.id,
        occurrenceDate: args.occurrenceIso,
        newDate: args.newDate,
        newStartTime: args.newStartTime ?? null,
        newEndTime: args.newEndTime ?? null,
        newTitle: args.newTitle ?? null,
        newDescription: args.newDescription ?? null,
      });

      setExceptions((prev) => {
        const filtered = prev.filter((p) => !(p.eventId === ex.eventId && p.occurrenceDate === ex.occurrenceDate));
        return [ex, ...filtered];
      });

      setIsModalOpen(false);
      setEditingEvent(null);
      setSelectedIso(args.newDate);
    } catch {}
  }

  const todayIso = toLocalISODate(new Date());

  return (
    <div className="v2-planner">
      <div className="v2-planner__main">
        <div className="v2-toolbar">
          <div className="v2-toolbar__left">
            <button type="button" className="v2-btn" onClick={goPrevMonth}>‹</button>
            <div className="v2-monthlabel">{monthLabel(year, monthIndex0)}</div>
            <button type="button" className="v2-btn" onClick={goNextMonth}>›</button>
          </div>

          <div className="v2-toolbar__right">
            <button
              type="button"
              className="v2-btn"
              onClick={() => {
                const d = new Date();
                setYear(d.getFullYear());
                setMonthIndex0(d.getMonth());
                setSelectedIso(toLocalISODate(d));
              }}
            >
              Today
            </button>
          </div>
        </div>

        <div className="v2-weekdays">
          {WEEKDAY_LABELS_SUN_FIRST.map((w) => (
            <div key={w} className="v2-weekday">{w}</div>
          ))}
        </div>

        <div className="v2-grid">
          {grid.map((cell) => {
            const occs = occurrencesByDay.get(cell.iso) || [];
            const evCount = occs.length;
            const titles = occs.map((o) => o.title);

            return (
              <DayCell
                key={cell.iso}
                dayNumber={cell.date.getDate()}
                iso={cell.iso}
                inCurrentMonth={cell.inCurrentMonth}
                isToday={cell.iso === todayIso}
                isSelected={cell.iso === selectedIso}
                eventCount={evCount}
                eventTitles={titles}
                onClick={handleDayClick}
              />
            );
          })}
        </div>
      </div>

      <AgendaPanel
        selectedIso={selectedIso}
        eventsForDay={selectedEvents}
        onAddClick={handleAddClick}
        onEditClick={(occAny) => {
          const occ = occAny as any;
          const sourceId = occ.sourceId || occ.id;
          const base = events.find((e) => e.id === sourceId);
          if (!base) return;
          openEditModal(base, selectedIso);
        }}
      />

      <EventModal
        isOpen={isModalOpen}
        mode={editingEvent ? 'edit' : 'create'}
        selectedIso={selectedIso}
        initial={editingEvent}
        alliances={alliances}
        onClose={() => {
          setIsModalOpen(false);
          setEditingEvent(null);
        }}
        onSave={handleSave}
        onDelete={editingEvent ? handleDelete : undefined}
        occurrenceIso={editingOccurrenceIso}
        onSkipOccurrence={editingEvent ? handleSkipOccurrence : undefined}
        onMoveOccurrence={editingEvent ? handleMoveOccurrence : undefined}
      />
    </div>
  );
}
