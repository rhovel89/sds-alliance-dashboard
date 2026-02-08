import React from 'react';

type Props = {
  dayNumber: number;
  iso: string;
  inCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  eventCount: number;
  eventTitles: string[];
  onClick: (iso: string) => void;
};

function clampTitle(s: string, max: number): string {
  const t = (s || '').trim();
  if (t.length <= max) return t;
  return t.slice(0, max - 1) + '…';
}

export function DayCell(props: Props) {
  const {
    dayNumber,
    iso,
    inCurrentMonth,
    isToday,
    isSelected,
    eventCount,
    eventTitles,
    onClick,
  } = props;

  const className = [
    'v2-day',
    inCurrentMonth ? 'v2-day--in' : 'v2-day--out',
    isToday ? 'v2-day--today' : '',
    isSelected ? 'v2-day--selected' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const titlesToShow = eventTitles.slice(0, 2);
  const remaining = eventCount - titlesToShow.length;

  return (
    <button type="button" className={className} onClick={() => onClick(iso)}>
      <div className="v2-day__top">
        <span className="v2-day__num">{dayNumber}</span>
        {eventCount > 0 ? (
          <span className="v2-day__badge">{eventCount}</span>
        ) : null}
      </div>

      <div className="v2-day__hint">
        {eventCount > 0 ? (
          <div style={{ display: 'grid', gap: '4px', marginTop: '8px' }}>
            {titlesToShow.map((t, i) => (
              <div key={i} style={{ fontSize: '12px', opacity: 0.9 }}>
                {clampTitle(t, 18)}
              </div>
            ))}
            {remaining > 0 ? (
              <div style={{ fontSize: '12px', opacity: 0.7 }}>
                +{remaining} more
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </button>
  );
}
