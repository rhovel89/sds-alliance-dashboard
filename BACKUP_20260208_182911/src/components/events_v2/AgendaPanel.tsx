import React from 'react';
import type { CalendarEvent } from './types';

type Props = {
  selectedIso: string;
  eventsForDay: CalendarEvent[];
  markersForDay?: CalendarEvent[]; // skipped markers live here
  onAddClick: () => void;
  onEditClick?: (ev: CalendarEvent) => void;
};

function formatTimeRange(ev: CalendarEvent): string {
  const s = ev.startTime ? ev.startTime : '—';
  const e = ev.endTime ? ev.endTime : '';
  return e ? (s + ' → ' + e) : s;
}

function chipFor(ev: CalendarEvent) {
  if (ev.renderHint === 'moved') return <span className="v2-chip v2-chip--moved">↷ Moved</span>;
  if (ev.renderHint === 'skipped') return <span className="v2-chip v2-chip--skipped">⛔ Skipped</span>;
  return null;
}

export function AgendaPanel({ selectedIso, eventsForDay, markersForDay, onAddClick, onEditClick }: Props) {
  const hasAny = eventsForDay.length > 0 || (markersForDay && markersForDay.length > 0);

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

      {!hasAny ? (
        <div className="v2-empty">No events for this day.</div>
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
                <div className="v2-eventcard__row">
                  <div className="v2-eventcard__title">{ev.title}</div>
                  {chipFor(ev)}
                </div>

                <div className="v2-eventcard__meta">{formatTimeRange(ev)}</div>

                {ev.description ? (
                  <div className="v2-eventcard__desc">{ev.description}</div>
                ) : null}
              </button>
            </li>
          ))}

          {(markersForDay || []).map((m) => (
            <li key={m.id} className="v2-eventcard v2-eventcard--marker">
              <div className="v2-eventcard__row">
                <div className="v2-eventcard__title">{m.title}</div>
                {chipFor(m)}
              </div>
              {m.originalDate ? (
                <div className="v2-eventcard__meta">Occurrence: {m.originalDate}</div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
