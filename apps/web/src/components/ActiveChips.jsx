import { EMPTY_FILTERS } from '../lib/savedFilters.js';

// border-edge, not the hairline border-line: a chip is a piece of active
// state, not a resting surface, so it carries the heavier of the two border
// tokens to read as a thing rather than a divider.
const CHIP = 'inline-flex items-center gap-1 rounded-full border border-edge bg-paper py-0.5 pl-3 pr-1 text-xs text-ink';
// A glyph this small needs a target bigger than itself to stay clickable.
const REMOVE = 'grid h-5 w-5 place-items-center rounded-full text-sm leading-none text-muted transition hover:bg-ink hover:text-paper';

export default function ActiveChips({ chips, filters, setFilters }) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      {chips.map((chip) => (
        <span key={chip.id} className={CHIP}>
          {chip.label}
          <button
            type="button"
            aria-label={chip.remove}
            onClick={() => setFilters({ ...filters, ...chip.patch })}
            className={REMOVE}
          >
            &#215;
          </button>
        </span>
      ))}
      {/* A rule, not just spacing, so "everything past here clears everything"
          reads as a boundary rather than one more chip in the row. */}
      <span aria-hidden="true" className="mx-1 h-3.5 w-px bg-line" />
      <button
        type="button"
        onClick={() => setFilters({ ...EMPTY_FILTERS })}
        className="font-mono text-[11px] text-muted underline underline-offset-2 transition hover:text-ink"
      >
        Clear all
      </button>
    </div>
  );
}
