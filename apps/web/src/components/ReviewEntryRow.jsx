import { useId, useState } from 'react';
import { changeNote, rowHeading } from '../lib/reviewRowText.js';
import ReviewTag from './ReviewTag.jsx';
import ReviewDetail from './ReviewDetail.jsx';
import IconButton from './ui/IconButton.jsx';
import { ChevronDownIcon } from './Icon.jsx';

// What a removal says beside it: kept is the default, so it says so until
// it is ticked.
const removalNote = (on) => (on ? 'Removed when you apply' : 'Kept unless you tick it');

// One entry the resume would add, update or remove: the tick, what it
// does, the entry itself, a few words on what changes, and under the
// chevron the change in full. The whole line but the chevron is the tick's
// label, so the box is not the only thing to aim at. A removal left
// unticked sits back a step, since leaving it is keeping the entry.
export default function ReviewEntryRow({ row, on, onToggle }) {
  const [open, setOpen] = useState(false);
  const detailId = useId();
  const { title, at, when } = rowHeading(row);
  const note = row.kind === 'newer' ? changeNote(row) : row.kind === 'remove' ? removalNote(on) : '';

  return (
    <li className={`border-b border-line py-2.5 transition-opacity duration-fast ease-ease ${row.kind === 'remove' && !on ? 'opacity-70' : ''}`}>
      <div className="flex items-center gap-3">
        <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
          <input type="checkbox" checked={on} onChange={onToggle} className="h-4 w-4 shrink-0 accent-primary" />
          <ReviewTag kind={row.kind} />
          <span className="min-w-0 flex-1 truncate text-sm">
            <b className="font-semibold text-ink">{title}</b>
            <span className="text-muted">{at && ` ${at}`}{when && ` · ${when}`}</span>
          </span>
          {note && <span className="hidden shrink-0 text-xs text-muted sm:inline">{note}</span>}
        </label>
        <IconButton
          size="xs"
          label={`Details for ${title}`}
          aria-expanded={open}
          aria-controls={detailId}
          onClick={() => setOpen(!open)}
          className={open ? 'text-ink' : ''}
        >
          <ChevronDownIcon size={12} className={`transition-transform duration-fast ease-ease ${open ? 'rotate-180' : ''}`} />
        </IconButton>
      </div>
      {open && <ReviewDetail row={row} id={detailId} />}
    </li>
  );
}
