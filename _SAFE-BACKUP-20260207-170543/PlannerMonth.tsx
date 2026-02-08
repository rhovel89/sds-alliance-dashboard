import React, { useMemo, useState } from 'react';
import type { CalendarEvent } from './types';
import { WEEKDAY_LABELS_SUN_FIRST, buildMonthGrid, monthLabel, toLocalISODate } from './dateUtils';
import { DayCell } from './DayCell';
import { AgendaPanel } from './AgendaPanel';

function uid(): string {
  return Math.random().toString(16).slice(2) + '-' + Date.now().toString(16);
}

type Props = {
  initialEvents?: CalendarEvent[];
  onRequestAddEvent?: (selectedIso: string) => void;
};

export function PlannerMonth({ initialEvents, onRequestAddEvent }: Props) {
  const now = new Date();
  const [year, setYear] = useState<number>(now.getFullYear());
  const [monthIndex0, setMonthIndex0] = useState<number>(now.getMonth());
  const [selectedIso, setSelectedIso] = useState<string>(toLocalISODate(now));

  const [events, setEvents] = useState<CalendarEvent[]>(
    initialEvents && initialEvents.length > 0
      ? initialEvents
      : [
          {
            id: uid(),
            title: 'Example: Alliance War',
            description: 'Sample event (local only for now).',
            startDate: toLocalISODate(now),
            startTime: '19:00',
            endTime: '20:00',
            frequency: 'none',
          },
        ]
  );

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

  function handleDayClick(iso: string) {
    setSelectedIso(iso);
  }

  function handleAddClick() {
    if (onRequestAddEvent) {
      onRequestAddEvent(selectedIso);
      return;
    }

    const ev: CalendarEvent = {
      id: uid(),
      title: 'New Event',
      description: 'Replace with modal form next step.',
      startDate: selectedIso,
      startTime: '12:00',
      endTime: '13:00',
      frequency: 'none',
    };
    setEvents((prev) => [ev, ...prev]);
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
    </div>
  );
}
