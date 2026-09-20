import { useState } from 'react';
import TagInput from './TagInput.jsx';
import { BOX, TextField } from './ProfileField.jsx';

const TEXT_BTN = 'text-sm text-muted transition-colors duration-fast ease-ease hover:text-ink disabled:opacity-30 disabled:hover:text-muted';

// One shape (title, organisation, dates, bullets, tech, link) covers a job,
// a project, a degree, a certification and an achievement, so this is the
// only place any of them gets edited; profileSections.js swaps the labels
// per section. A row by default, with the bullets as a count, so a section
// with a hundred of these reads as a hundred lines, not a hundred open
// forms; the editor opens inline under the row.
export default function EntryCard({ entry, titleLabel, orgLabel, startOpen, isFirst, isLast, onChange, onRemove, onMove }) {
  const [open, setOpen] = useState(startOpen);
  const set = (key) => (value) => onChange({ ...entry, [key]: value });
  const dates = [entry.startDate, entry.endDate].filter(Boolean).join(' - ');
  const bullets = entry.bullets.filter((line) => line.trim()).length;

  return (
    <details className="group" open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary className="flex cursor-pointer list-none items-baseline gap-3 py-2.5 [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 flex-1 items-baseline gap-2">
          <span className="truncate text-base font-medium text-ink">{entry.title || `Untitled ${titleLabel.toLowerCase()}`}</span>
          {entry.organisation && <span className="truncate text-sm text-muted">at {entry.organisation}</span>}
        </span>
        <span className="flex shrink-0 items-baseline gap-3 text-sm text-muted">
          {entry.pinned && <span className="text-xs font-medium text-ink">pinned</span>}
          {bullets > 0 && <span className="text-xs group-open:hidden">{bullets} {bullets === 1 ? 'bullet' : 'bullets'}</span>}
          {dates && <span className="tnum">{dates}</span>}
          <span aria-hidden="true" className="transition-transform duration-fast ease-ease group-open:rotate-180">&#8964;</span>
        </span>
      </summary>
      <div className="flex flex-col gap-3 pb-5 pt-1">
        <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
          <TextField label={titleLabel} value={entry.title} onChange={set('title')} />
          <TextField label={orgLabel} value={entry.organisation} onChange={set('organisation')} />
          <TextField label="Location" value={entry.location} onChange={set('location')} />
          <div className="grid grid-cols-2 gap-x-3">
            <TextField label="Start" value={entry.startDate} onChange={set('startDate')} />
            <TextField label="End" value={entry.endDate} onChange={set('endDate')} placeholder="Present" />
          </div>
        </div>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-muted">Bullet lines, one per line</span>
          <textarea
            rows={3}
            className={`${BOX} resize-y`}
            value={entry.bullets.join('\n')}
            onChange={(event) => set('bullets')(event.target.value.split('\n'))}
          />
        </label>
        <TagInput plain label="Tech" values={entry.tech} onChange={set('tech')} />
        <TextField label="Link" value={entry.link} onChange={set('link')} />
        <div className="flex flex-wrap items-center gap-4 pt-1">
          <button type="button" aria-pressed={entry.pinned} onClick={() => set('pinned')(!entry.pinned)} className={TEXT_BTN}>
            {entry.pinned ? 'Pinned' : 'Pin'}
          </button>
          <button type="button" disabled={isFirst} onClick={() => onMove(-1)} className={TEXT_BTN}>Move up</button>
          <button type="button" disabled={isLast} onClick={() => onMove(1)} className={TEXT_BTN}>Move down</button>
          <button type="button" onClick={onRemove} className={`${TEXT_BTN} ml-auto`}>Remove</button>
        </div>
      </div>
    </details>
  );
}
