import { useState } from 'react';
import TagInput from './TagInput.jsx';

const BOX = 'rounded-md border border-line bg-paper px-2.5 py-1.5 text-sm outline-none focus:border-ink';
const ICON_BTN = 'rounded-full border border-line px-2 py-1 text-xs text-muted transition hover:border-ink hover:text-ink disabled:opacity-30';

function TextField({ label, value, onChange, placeholder }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-muted">{label}</span>
      <input className={BOX} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

// One shape (title, organisation, dates, bullets, tech, link) covers a job,
// a project, a degree, a certification and an achievement, so this is the
// only place any of them gets edited; profileSections.js swaps the labels
// per section. Collapsed to one summary line by default, so a section with
// a hundred of these reads as a hundred lines, not a hundred open forms.
export default function EntryCard({ entry, titleLabel, orgLabel, startOpen, isFirst, isLast, onChange, onRemove, onMove }) {
  const [open, setOpen] = useState(startOpen);
  const set = (key) => (value) => onChange({ ...entry, [key]: value });
  const dates = [entry.startDate, entry.endDate].filter(Boolean).join(' - ');

  return (
    <details className="group rounded-md border border-line bg-paper" open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 flex-1 items-baseline gap-2 truncate">
          <span className="truncate text-sm text-ink">{entry.title || `Untitled ${titleLabel.toLowerCase()}`}</span>
          {entry.organisation && <span className="shrink-0 truncate text-xs text-muted">at {entry.organisation}</span>}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {dates && <span className="font-mono text-xs text-muted">{dates}</span>}
          {entry.pinned && <span className="text-xs text-ember">pinned</span>}
          <span aria-hidden="true" className="text-muted transition-transform group-open:rotate-180">&#8964;</span>
        </span>
      </summary>
      <div className="flex flex-col gap-3 border-t border-line px-3 py-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextField label={titleLabel} value={entry.title} onChange={set('title')} />
          <TextField label={orgLabel} value={entry.organisation} onChange={set('organisation')} />
          <TextField label="Location" value={entry.location} onChange={set('location')} />
          <div className="grid grid-cols-2 gap-2">
            <TextField label="Start" value={entry.startDate} onChange={set('startDate')} />
            <TextField label="End" value={entry.endDate} onChange={set('endDate')} placeholder="Present" />
          </div>
        </div>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted">Bullet lines, one per line</span>
          <textarea
            className={`${BOX} min-h-[4.5rem] resize-y`}
            value={entry.bullets.join('\n')}
            onChange={(event) => set('bullets')(event.target.value.split('\n'))}
          />
        </label>
        <TagInput label="Tech" values={entry.tech} onChange={set('tech')} />
        <TextField label="Link" value={entry.link} onChange={set('link')} />
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button type="button" aria-pressed={entry.pinned} onClick={() => set('pinned')(!entry.pinned)} className={ICON_BTN}>
            {entry.pinned ? 'Pinned' : 'Pin'}
          </button>
          <button type="button" disabled={isFirst} onClick={() => onMove(-1)} className={ICON_BTN}>Move up</button>
          <button type="button" disabled={isLast} onClick={() => onMove(1)} className={ICON_BTN}>Move down</button>
          <button type="button" onClick={onRemove} className={`${ICON_BTN} ml-auto`}>Remove</button>
        </div>
      </div>
    </details>
  );
}
