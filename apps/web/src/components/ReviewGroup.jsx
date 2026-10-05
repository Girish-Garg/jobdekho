import { useId } from 'react';
import { chipLines, isChip } from '../lib/reviewGroups.js';
import ReviewChips from './ReviewChips.jsx';
import ReviewEntryRow from './ReviewEntryRow.jsx';
import ReviewFieldRow from './ReviewFieldRow.jsx';
import CountBadge from './ui/CountBadge.jsx';

// One part of the record in the review: its name and how many changes it
// holds, a way to tick or untick them all at once, then the skills, titles
// and places as chips and everything else as rows.
export default function ReviewGroup({ group, picked, onSet, isLocked }) {
  const headingId = useId();
  const ids = group.rows.map((row) => row.id);
  const all = ids.every((id) => picked.has(id));
  const lines = chipLines(group.rows.filter(isChip));
  const rows = group.rows.filter((row) => !isChip(row));
  const toggle = (id) => onSet([id], !picked.has(id));

  return (
    <section aria-labelledby={headingId}>
      <div className="flex items-center justify-between gap-3 border-b border-line pb-1.5">
        <h4 id={headingId} className="flex items-center gap-2 text-sm font-semibold text-ink">
          {group.label}
          <CountBadge n={group.rows.length} />
        </h4>
        <button type="button" onClick={() => onSet(ids, !all)} className="link text-xs">
          {all ? 'Select none' : 'Select all'}
        </button>
      </div>
      {lines.length > 0 && <ReviewChips lines={lines} picked={picked} onToggle={toggle} isLocked={isLocked} />}
      {rows.length > 0 && (
        <ul>
          {rows.map((row) => {
            const Row = row.entry ? ReviewEntryRow : ReviewFieldRow;
            return <Row key={row.id} row={row} on={picked.has(row.id)} onToggle={() => toggle(row.id)} />;
          })}
        </ul>
      )}
    </section>
  );
}
