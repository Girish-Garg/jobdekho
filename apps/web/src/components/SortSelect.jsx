import { usePopover } from '../lib/usePopover.js';
import { PANEL, Caret } from './Dropdown.jsx';
import { CheckIcon, SortIcon } from './Icon.jsx';

// Best fit leads because it is the default. Each option is named for the
// axis it orders by, with a line saying what that means where the name
// alone could be read two ways ("posted" by the board, "added" to JobDekho).
const SORTS = [
  ['match', 'Best fit', 'Highest grade first'],
  ['newest', 'Newest posted', 'By the date the board posted it'],
  ['oldest', 'Oldest posted', 'The longest open first'],
  ['added', 'Recently added', 'Newest to JobDekho first'],
  ['company', 'Company A-Z', 'Grouped by company'],
];

// A menu in the filters' own style rather than the browser's select, which
// drew a system list under a control that matched nothing around it.
export default function SortSelect({ sort, setSort }) {
  const { open, setOpen, ref } = usePopover();
  const [, label] = SORTS.find(([value]) => value === sort) ?? SORTS[0];

  function pick(value) {
    setSort(value);
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Sort: ${label}`}
        className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm transition-colors duration-fast ease ${
          open ? 'border-edge bg-select text-ink' : 'border-line bg-panel text-ink hover:border-edge'
        }`}
      >
        <SortIcon size={14} className="text-muted" />
        <span className="text-muted">Sort</span>
        <span className="font-semibold">{label}</span>
        <Caret open={open} />
      </button>
      {open && (
        <div role="menu" aria-label="Sort" className={`${PANEL} right-0 w-64 p-1.5`}>
          {SORTS.map(([value, name, hint]) => {
            const on = value === sort;
            return (
              <button
                key={value}
                type="button"
                role="menuitemradio"
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
