import React from 'react';

type Props = {
  dayNumber: number;
  iso: string;
  inCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  eventCount: number;
  onClick: (iso: string) => void;
};

export function DayCell(props: Props) {
  const {
    dayNumber,
    iso,
    inCurrentMonth,
    isToday,
    isSelected,
    eventCount,
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

  return (
    <button type="button" className={className} onClick={() => onClick(iso)}>
      <div className="v2-day__top">
        <span className="v2-day__num">{dayNumber}</span>
        {eventCount > 0 ? (
          <span className="v2-day__badge">{eventCount}</span>
        ) : null}
      </div>
      <div className="v2-day__hint">
        {eventCount > 0 ? 'Events' : ''}
      </div>
    </button>
  );
}
