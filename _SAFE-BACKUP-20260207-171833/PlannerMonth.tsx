import React, { useEffect, useMemo, useState } from 'react';
import type { CalendarEvent } from './types';
import { WEEKDAY_LABELS_SUN_FIRST, buildMonthGrid, monthLabel, toLocalISODate } from './dateUtils';
import { DayCell } from './DayCell';
import { AgendaPanel } from './AgendaPanel';
import { EventModal } from './EventModal';

function uid(): string {
  return Math.random().toString(16).slice(2) + '-' + Date.now().toString(16);
}

type Props = {
  // Later we'll swap this with Supabase-loaded events
  initialEvents?: CalendarEvent[];
};

type Frequency = 'daily' | 'weekly' | 'biweekly' | 'monthly';

type Draft = {
  title: string;
  description: string;
  startDate: string;
  startTime: string;
  endTime: string;
  frequency: Frequency;
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

export function PlannerMonth({ initialEvents }: Props) {
  const now = new Date();
  const [year, setYear] = useState<number>(now.getFullYear());
  const [monthIndex0, setMonthIndex0] = useState<number>(now.getMonth());
  const [selectedIso, setSelectedIso] = useState<string>(toLocalISODate(now));

  const [events, setEvents] = useState<CalendarEvent[]>([]);

  // Load from localStorage once (lowest risk persistence, Supabase later)
  useEffect(() => {
    const fromStorage = safeParseEvents(localStorage.getItem(STORAGE_KEY));
    if (fromStorage.length > 0) {
      setEvents(fromStorage);
      return;
    }
    if (initialEvents && initialEvents.length > 0) {
      setEvents(initialEvents);
    }
  }, [initialEvents]);

  // Save to localStorage whenever events change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  }, [events]);

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  const grid = useMemo(() => buildMonthGrid(year, monthIndex0), [year, monthIndex0]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of events) {
      const key = ev.startDate;
      const arr = map.get(key) || [];
      arr.push(ev);
      map.set(key, arr);
    }
    return map;
  }, [events]);

  const selectedEvents = eventsByDay.get(selectedIso) || [];

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

  function openEditModal(ev: CalendarEvent) {
    setSelectedIso(ev.startDate);
    setEditingEvent(ev);
    setIsModalOpen(true);
  }

  function handleDayClick(iso: string) {
    openCreateModal(iso);
  }

  function handleAddClick() {
    openCreateModal(selectedIso);
  }

  function handleSave(draft: Draft) {
    if (editingEvent) {
      const updated: CalendarEvent = {
        ...editingEvent,
        title: draft.title,
        description: draft.description,
        startDate: draft.startDate,
        startTime: draft.startTime,
        endTime: draft.endTime,
        frequency: draft.frequency,
      };

      setEvents((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
      setIsModalOpen(false);
      setEditingEvent(null);
      setSelectedIso(updated.startDate);
      return;
    }

    const created: CalendarEvent = {
      id: uid(),
      title: draft.title,
      description: draft.description,
      startDate: draft.startDate,
      startTime: draft.startTime,
      endTime: draft.endTime,
      frequency: draft.frequency,
    };

    setEvents((prev) => [created, ...prev]);
    setIsModalOpen(false);
    setSelectedIso(created.startDate);
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
            const evCount = (eventsByDay.get(cell.iso) || []).length;
            return (
              <DayCell
                key={cell.iso}
                dayNumber={cell.date.getDate()}
                iso={cell.iso}
                inCurrentMonth={cell.inCurrentMonth}
                isToday={cell.iso === todayIso}
                isSelected={cell.iso === selectedIso}
                eventCount={evCount}
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
      />

      <EventModal
        isOpen={isModalOpen}
        mode={editingEvent ? 'edit' : 'create'}
        selectedIso={selectedIso}
        initial={editingEvent}
        onClose={() => {
          setIsModalOpen(false);
          setEditingEvent(null);
        }}
        onSave={handleSave}
      />
    </div>
  );
}
