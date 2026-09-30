import { EMPTY_FILTERS } from '../lib/savedFilters.js';
import { CloseIcon } from './Icon.jsx';

// A chip is a filter that is on, so it takes the same saffron tint as the
// trigger holding it: the two read as one piece of state, not as a divider.
const CHIP = 'inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 py-0.5 pl-3 pr-1 text-xs font-medium text-ink';
// An icon this small needs a target bigger than itself to stay clickable.
const REMOVE = 'grid h-5 w-5 place-items-center rounded-full text-primary transition-colors duration-fast ease hover:bg-primary hover:text-on-primary';

export default function ActiveChips({ chips, filters, setFilters }) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-line px-1 pt-2">
      {chips.map((chip) => (
        <span key={chip.id} className={CHIP}>
          {chip.label}
          <button
            type="button"
            aria-label={chip.remove}
            onClick={() => setFilters({ ...filters, ...chip.patch })}
            className={REMOVE}
          >
            <CloseIcon size={10} />
          </button>
        </span>
      ))}
      {/* A rule, not just spacing, so "everything past here clears everything"
          reads as a boundary rather than one more chip in the row. */}
      <span aria-hidden="true" className="mx-1 h-3.5 w-px bg-line" />
      <button
        type="button"
        onClick={() => setFilters({ ...EMPTY_FILTERS })}
        className="rounded-full px-2 py-0.5 text-xs font-semibold text-muted transition-colors duration-fast ease hover:bg-select/60 hover:text-ink"
      >
        Clear all
      </button>
    </div>
  );
}
