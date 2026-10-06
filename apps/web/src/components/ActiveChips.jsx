import { EMPTY_FILTERS } from '../lib/savedFilters.js';
import { CloseIcon } from './Icon.jsx';
import Button from './ui/Button.jsx';
import Chip from './ui/Chip.jsx';
import IconButton from './ui/IconButton.jsx';

// A chip is a filter that is on, so it takes the same saffron tint as the
// trigger holding it: the two read as one piece of state, not as a divider.
// So it is the primary Chip with the trigger's hairline and an ink label, and
// a wide left side, since the right side is the remove button.
const CHIP = 'border border-primary/30 pl-3 pr-1 font-medium text-ink';

// `trailing` ends the row on the right: the offer to save these filters as
// the default (see SaveFiltersButton.jsx), which stands alone once every
// chip is gone and the bare feed is what would be saved.
export default function ActiveChips({ chips, filters, setFilters, trailing = null }) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-line px-1 pt-2">
      {chips.map((chip) => (
        <Chip key={chip.id} tone="primary" className={CHIP}>
          {chip.label}
          {/* An icon this small needs a target bigger than itself to stay clickable. */}
          <IconButton
            label={chip.remove}
            size="xs"
            onClick={() => setFilters({ ...filters, ...chip.patch })}
            className="text-primary hover:bg-primary hover:text-on-primary"
          >
            <CloseIcon size={10} />
          </IconButton>
        </Chip>
      ))}
      {/* A rule, not just spacing, so "everything past here clears everything"
          reads as a boundary rather than one more chip in the row. */}
      {chips.length > 0 && (
        <>
          <span aria-hidden="true" className="mx-1 h-3.5 w-px bg-line" />
          <Button variant="ghost" size="sm" onClick={() => setFilters({ ...EMPTY_FILTERS })} className="px-2 hover:bg-select/60">
            Clear all
          </Button>
        </>
      )}
      {trailing}
    </div>
  );
}
