import React from 'react';
import type { CalendarEvent } from './types';

type Props = {
  selectedIso: string;
  eventsForDay: CalendarEvent[];
  onAddClick: () => void;
  onEditClick?: (ev: CalendarEvent) => void;
};

function formatTimeRange(ev: CalendarEvent): string {
  const s = ev.startTime ? ev.startTime : '—';
  const e = ev.endTime ? ev.endTime : '';
  return e ? (s + ' → ' + e) : s;
}

export function AgendaPanel({ selectedIso, eventsForDay, onAddClick, onEditClick }: Props) {
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
              <button
                type="button"
                className="v2-eventcard__btn"
                onClick={() => onEditClick && onEditClick(ev)}
                disabled={!onEditClick}
                aria-label={onEditClick ? 'Edit event' : undefined}
              >
                <div className="v2-eventcard__title">{ev.title}</div>
                <div className="v2-eventcard__meta">{formatTimeRange(ev)}</div>
                {ev.description ? (
                  <div className="v2-eventcard__desc">{ev.description}</div>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
