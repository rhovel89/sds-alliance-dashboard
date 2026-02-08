import React, { useEffect, useMemo, useState } from 'react';
import type { CalendarEvent } from './types';
import { WEEKDAY_LABELS_SUN_FIRST, buildMonthGrid, monthLabel, toLocalISODate } from './dateUtils';
import { DayCell } from './DayCell';
import { AgendaPanel } from './AgendaPanel';
import { EventModal } from './EventModal';
import { deleteEvent, listUserAlliances, listVisibleEvents, upsertEvent, type UserAlliance } from './eventsStore';

function uid(): string {
  return Math.random().toString(16).slice(2) + '-' + Date.now().toString(16);
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

function expandEventsForRange(
  baseEvents: CalendarEvent[],
  rangeStart: Date,
  rangeEnd: Date
): Map<string, Occurrence[]> {
  const map = new Map<string, Occurrence[]>();

  function push(iso: string, occ: Occurrence) {
    const arr = map.get(iso) || [];
    arr.push(occ);
    map.set(iso, arr);
  }

  const rs = startOfDay(rangeStart);
  const re = startOfDay(rangeEnd);

  for (const ev of baseEvents) {
    const freq = ev.frequency || 'none';
    const start = startOfDay(dateFromIso(ev.startDate));
    const evDow = start.getDay();
    const dows = (ev.daysOfWeek && ev.daysOfWeek.length > 0) ? ev.daysOfWeek : [evDow];

    const iterStart = start.getTime() > rs.getTime() ? start : rs;

    if (freq === 'none') {
      if (start.getTime() >= rs.getTime() && start.getTime() <= re.getTime()) {
        const iso = toLocalISODate(start);
        push(iso, makeOccurrence(ev, iso));
      }
      continue;
    }

    if (freq === 'daily') {
      for (let d = startOfDay(iterStart); d.getTime() <= re.getTime(); d = addDays(d, 1)) {
        if (d.getTime() < start.getTime()) continue;
        const iso = toLocalISODate(d);
        push(iso, makeOccurrence(ev, iso));
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

        const iso = toLocalISODate(d);
        push(iso, makeOccurrence(ev, iso));
      }
      continue;
    }

    if (freq === 'monthly') {
      const targetDay = start.getDate();

      for (let d = startOfDay(iterStart); d.getTime() <= re.getTime(); d = addDays(d, 1)) {
        if (d.getTime() < start.getTime()) continue;
        if (d.getDate() !== targetDay) continue;

        const iso = toLocalISODate(d);
        push(iso, makeOccurrence(ev, iso));
      }
      continue;
    }
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
  const [alliances, setAlliances] = useState<UserAlliance[]>([]);

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  }, [events]);

  const grid = useMemo(() => buildMonthGrid(year, monthIndex0), [year, monthIndex0]);

  const occurrencesByDay = useMemo(() => {
    const rangeStart = grid[0]?.date ? grid[0].date : new Date(year, monthIndex0, 1);
    const rangeEnd = grid[41]?.date ? grid[41].date : new Date(year, monthIndex0, 28);
    return expandEventsForRange(events, rangeStart, rangeEnd);
  }, [events, grid, year, monthIndex0]);

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
    setIsModalOpen(true);
  }

  function openEditModal(base: CalendarEvent) {
    setEditingEvent(base);
    setSelectedIso(base.startDate);
    setIsModalOpen(true);
  }

  function handleDayClick(iso: string) {
    openCreateModal(iso);
  }

  function handleAddClick() {
    openCreateModal(selectedIso);
  }

  async function handleSave(draft: Draft) {
    const base: CalendarEvent = editingEvent
      ? { ...editingEvent }
      : { id: uid(), title: '', startDate: draft.startDate };

    const next: CalendarEvent = {
      ...base,
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
        const exists = prev.some((e) => e.id === saved.id);
        return exists ? prev.map((e) => (e.id === saved.id ? saved : e)) : [saved, ...prev];
      });
      setIsModalOpen(false);
      setEditingEvent(null);
      setSelectedIso(saved.startDate);
    } catch {
      // fallback local update
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
      await deleteEvent(id);
    } catch {
      // even if delete fails remotely, we still allow local removal to avoid UI "stuck"
    }

    setEvents((prev) => prev.filter((e) => e.id !== id));
    setIsModalOpen(false);
    setEditingEvent(null);
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
          openEditModal(base);
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
      />
    </div>
  );
}
