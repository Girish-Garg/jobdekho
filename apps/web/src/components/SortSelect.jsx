import { usePopover } from '../lib/usePopover.js';
import { DEFAULT_SORT, SORTS, sortLabel } from '../lib/sorts.js';
import { PANEL, Caret } from './Dropdown.jsx';
import { CheckIcon, SortIcon } from './Icon.jsx';

// A menu in the filters' own style rather than the browser's select, which
// drew a system list under a control that matched nothing around it. Best fit
// is not an item: it always comes first (see lib/sorts.js), so the menu says
// that once and offers the orders that arrange each grade. Picking the order
// already picked puts it back to fit alone.
export default function SortSelect({ sort, setSort }) {
  const { open, setOpen, ref } = usePopover();
  const label = sortLabel(sort);

  function pick(value) {
    setSort(value === sort ? DEFAULT_SORT : value);
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label ? `Sort: Best fit, then ${label}` : 'Sort: Best fit'}
        className={`dither flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm ${
          open ? 'border-edge bg-select text-ink' : 'border-line bg-panel text-ink hover:border-edge'
        }`}
      >
        <SortIcon size={14} className="text-muted" />
        <span className={label ? 'text-muted' : 'text-ink'}>{label ? 'Best fit, then' : 'Best fit'}</span>
        {label && <span className="font-semibold">{label}</span>}
        <Caret open={open} />
      </button>
      {open && (
        <div role="menu" aria-label="Sort" className={`${PANEL} right-0 w-64 p-1.5`}>
          <p className="px-3 pb-1.5 pt-1 text-xs text-muted">Best fit always leads. Within each grade:</p>
          {SORTS.map(([value, name, hint]) => {
            const on = value === sort;
            return (
              <button
                key={value}
                type="button"
                role="menuitemcheckbox"
                aria-checked={on}
                onClick={() => pick(value)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors duration-fast ease ${
                  on ? 'bg-primary/10' : 'hover:bg-select/60'
                }`}
              >
                <span className="min-w-0 flex-1">
                  <span className={`block text-sm ${on ? 'font-semibold text-primary' : 'font-medium text-ink'}`}>{name}</span>
                  <span className="block text-xs text-muted">{hint}</span>
                </span>
                {on && <CheckIcon size={14} className="shrink-0 text-primary" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
