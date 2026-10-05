import Chip from './ui/Chip.jsx';
import { MAX_SKILLS } from '../lib/groupSkills.js';

const FULL = `Best fit keeps ${MAX_SKILLS}. Untick one, or remove one, to make room.`;

// One skill, title or place to add or remove, as a chip that toggles. An
// addition reads "+ Go", saffron while kept and struck through once
// unticked; a removal reads plain and is struck in ember once ticked, so a
// strike always means "not on the profile after this". An addition past
// the room Best fit has is shown but cannot be ticked.
function ToggleChip({ row, on, locked, onToggle }) {
  const remove = row.kind === 'remove';
  const look = remove ? (on ? 'bg-ember/15 text-ember line-through hover:text-ember' : 'hover:text-ink') : on ? 'bg-primary/15' : 'line-through hover:text-ink';
  const tip = locked ? FULL : remove ? (on ? 'Removed when you apply' : 'Kept unless you tick it') : undefined;
  return (
    <Chip
      as="button"
      type="button"
      tone={!remove && on ? 'primary' : 'quiet'}
      aria-pressed={on}
      aria-label={`${remove ? 'Remove' : 'Add'} ${row.value}`}
      title={tip}
      disabled={locked}
      onClick={onToggle}
      className={`transition-colors duration-fast ease-ease disabled:cursor-default disabled:opacity-50 ${look}`}
    >
      {remove ? row.value : `+ ${row.value}`}
    </Chip>
  );
}

// Lines of chips, each under the name of what it changes: a Best fit list,
// or a skill group, its own or a new one (see chipLines in reviewGroups.js).
// A list out of room says so beside the additions it cannot take.
export default function ReviewChips({ lines, picked, onToggle, isLocked }) {
  return (
    <div className="flex flex-col gap-2 pt-2.5">
      {lines.map((line) => (
        <div key={line.key} className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-xs text-muted">{line.label}</span>
          {line.rows.map((row) => (
            <ToggleChip key={row.id} row={row} on={picked.has(row.id)} locked={isLocked(row)} onToggle={() => onToggle(row.id)} />
          ))}
          {line.rows.some(isLocked) && <span className="ml-1 text-xs text-muted">Best fit keeps {MAX_SKILLS} {line.field}</span>}
        </div>
      ))}
    </div>
  );
}
