import React from 'react';
import type { CalendarEvent } from './types';

type Props = {
  selectedIso: string;
  eventsForDay: CalendarEvent[];
  onAddClick: () => void;
};

export function AgendaPanel({ selectedIso, eventsForDay, onAddClick }: Props) {
  return (
    <aside className="v2-agenda">
      <div className="v2-agenda__header">
        <div>
          <div className="v2-agenda__title">Agenda</div>
          <div className="v2-agenda__date">{selectedIso}</div>
        </div>
        <button type="button" className="v2-btn v2-btn--primary" onClick={onAddClick}>
          + Add
        </button>
      </div>

      {eventsForDay.length === 0 ? (
        <div className="v2-empty">
          No events for this day.
        </div>
      ) : (
        <ul className="v2-eventlist">
          {eventsForDay.map((ev) => (
            <li key={ev.id} className="v2-eventcard">
              <div className="v2-eventcard__title">{ev.title}</div>
              <div className="v2-eventcard__meta">
                {ev.startTime ? ev.startTime : '—'}
                {ev.endTime ? ' → ' + ev.endTime : ''}
              </div>
              {ev.description ? (
                <div className="v2-eventcard__desc">{ev.description}</div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
