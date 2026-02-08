import React, { useEffect, useMemo, useState } from 'react';
import type { CalendarEvent } from './types';
import type { UserAlliance } from './eventsStore';

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

type Props = {
  isOpen: boolean;
  mode: 'create' | 'edit';
  selectedIso: string;
  initial?: CalendarEvent | null;
  alliances: UserAlliance[];
  onClose: () => void;
  onSave: (draft: Draft) => void;
};

const DOW_LABELS: Array<{ n: number; label: string }> = [
  { n: 0, label: 'Sun' },
  { n: 1, label: 'Mon' },
  { n: 2, label: 'Tue' },
  { n: 3, label: 'Wed' },
  { n: 4, label: 'Thu' },
  { n: 5, label: 'Fri' },
  { n: 6, label: 'Sat' },
];

function uniqSorted(nums: number[]): number[] {
  const s = new Set(nums);
  return Array.from(s).sort((a, b) => a - b);
}

export function EventModal({
  isOpen,
  mode,
  selectedIso,
  initial,
  alliances,
  onClose,
  onSave,
}: Props) {
  const defaultDraft: Draft = useMemo(() => {
    const initialFreq =
      (initial?.frequency && initial.frequency !== 'none'
        ? initial.frequency
        : 'weekly') as Frequency;

    const selectedDate = new Date(selectedIso + 'T00:00:00');
    const selectedDow = selectedDate.getDay();

    const defaultDays =
      initial?.daysOfWeek && initial.daysOfWeek.length > 0
        ? uniqSorted(initial.daysOfWeek)
        : [selectedDow];

    const initialVisibility: Visibility = (initial?.visibility === 'alliance') ? 'alliance' : 'personal';
    const firstAllianceId = alliances.length > 0 ? alliances[0].id : null;

    return {
      title: initial?.title || '',
      description: initial?.description || '',
      startDate: initial?.startDate || selectedIso,
      startTime: initial?.startTime || '19:00',
      endTime: initial?.endTime || '20:00',
      frequency: initialFreq,
      daysOfWeek: defaultDays,
      visibility: initialVisibility,
      allianceId: initialVisibility === 'alliance'
        ? (initial?.allianceId ?? firstAllianceId)
        : null,
    };
  }, [initial, selectedIso, alliances]);

  const [draft, setDraft] = useState<Draft>(defaultDraft);

  useEffect(() => {
    if (isOpen) setDraft(defaultDraft);
  }, [isOpen, defaultDraft]);

  useEffect(() => {
    if (!isOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const titleText = mode === 'edit' ? 'Edit Event' : 'Create Event';

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function toggleDow(n: number) {
    setDraft((prev) => {
      const has = prev.daysOfWeek.includes(n);
      const next = has ? prev.daysOfWeek.filter((x) => x !== n) : [...prev.daysOfWeek, n];
      return { ...prev, daysOfWeek: uniqSorted(next) };
    });
  }

  function showDowPicker(freq: Frequency): boolean {
    return freq === 'weekly' || freq === 'biweekly' || freq === 'monthly';
  }

  function handleVisibilityChange(v: Visibility) {
    update('visibility', v);
    if (v === 'personal') {
      update('allianceId', null);
    } else {
      const first = alliances.length > 0 ? alliances[0].id : null;
      update('allianceId', first);
    }
  }

  function handleSave() {
    const trimmedTitle = draft.title.trim();
    if (!trimmedTitle) return;

    const needsDow = showDowPicker(draft.frequency);
    const safeDays = needsDow
      ? (draft.daysOfWeek.length > 0 ? draft.daysOfWeek : [new Date(draft.startDate + 'T00:00:00').getDay()])
      : [];

    const vis: Visibility = draft.visibility;
    const allianceId = vis === 'alliance' ? (draft.allianceId || null) : null;

    // If alliance is chosen but user has no alliances, prevent silent bad save
    if (vis === 'alliance' && !allianceId) return;

    onSave({
      ...draft,
      title: trimmedTitle,
      daysOfWeek: safeDays,
      visibility: vis,
      allianceId,
    });
  }

  return (
    <div className="v2-modalOverlay" role="presentation" onMouseDown={onClose}>
      <div className="v2-modal" role="dialog" aria-modal="true" aria-label={titleText} onMouseDown={(e) => e.stopPropagation()}>
        <div className="v2-modal__header">
          <div className="v2-modal__title">{titleText}</div>
          <button type="button" className="v2-iconBtn" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="v2-modal__body">
          <div className="v2-formRow">
            <label className="v2-label">Title</label>
            <input className="v2-input" value={draft.title} onChange={(e) => update('title', e.target.value)} placeholder="Event title" autoFocus />
          </div>

          <div className="v2-formRow">
            <label className="v2-label">Description</label>
            <textarea className="v2-textarea" value={draft.description} onChange={(e) => update('description', e.target.value)} placeholder="Optional details" rows={3} />
          </div>

          <div className="v2-formGrid">
            <div className="v2-formRow">
              <label className="v2-label">Start date</label>
              <input type="date" className="v2-input" value={draft.startDate} onChange={(e) => update('startDate', e.target.value)} />
            </div>

            <div className="v2-formRow">
              <label className="v2-label">Start time</label>
              <input type="time" className="v2-input" value={draft.startTime} onChange={(e) => update('startTime', e.target.value)} />
            </div>

            <div className="v2-formRow">
              <label className="v2-label">End time</label>
              <input type="time" className="v2-input" value={draft.endTime} onChange={(e) => update('endTime', e.target.value)} />
            </div>

            <div className="v2-formRow">
              <label className="v2-label">Frequency</label>
              <select className="v2-input" value={draft.frequency} onChange={(e) => update('frequency', e.target.value as Frequency)}>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="biweekly">Bi-Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          </div>

          <div className="v2-formGrid">
            <div className="v2-formRow">
              <label className="v2-label">Visibility</label>
              <select className="v2-input" value={draft.visibility} onChange={(e) => handleVisibilityChange(e.target.value as Visibility)}>
                <option value="personal">Personal</option>
                <option value="alliance">Alliance</option>
              </select>
            </div>

            {draft.visibility === 'alliance' ? (
              <div className="v2-formRow">
                <label className="v2-label">Alliance</label>
                <select
                  className="v2-input"
                  value={draft.allianceId || ''}
                  onChange={(e) => update('allianceId', e.target.value)}
                >
                  {alliances.map((a) => (
                    <option key={a.id} value={a.id}>{a.label}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div />
            )}
          </div>

          {showDowPicker(draft.frequency) ? (
            <div className="v2-formRow">
              <label className="v2-label">Repeat on</label>
              <div className="v2-dowRow" role="group" aria-label="Repeat on days of week">
                {DOW_LABELS.map((d) => (
                  <label key={d.n} className="v2-dowChip">
                    <input type="checkbox" checked={draft.daysOfWeek.includes(d.n)} onChange={() => toggleDow(d.n)} />
                    <span>{d.label}</span>
                  </label>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="v2-modal__footer">
          <button type="button" className="v2-btn" onClick={onClose}>Cancel</button>
          <button type="button" className="v2-btn v2-btn--primary" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  );
}
