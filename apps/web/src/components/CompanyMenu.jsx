import { useState } from 'react';
import { PANEL } from './Dropdown.jsx';
import { SearchIcon } from './Icon.jsx';
import { rankCompanies } from '../lib/companyRank.js';

// Some fifteen hundred employers is more than a list to scroll, so the menu
// shows the ones with the most jobs and the search reaches the rest.
const SHOWN = 50;

// Any number may be picked, and none is every company. A row stands for
// every spelling of its employer (see the store's companies.js): ticking it
// adds its name, and unticking it takes away each pick it stands for, which
// may be a spelling the job pane or the chat picked it under.
export default function CompanyMenu({ list, failed, picked, onChange }) {
  const [query, setQuery] = useState('');
  // The picks the menu opened with stay on top, as the source menu keeps its
  // exclusions: re-ranking on every tick would slide rows from under the cursor.
  const [pinned] = useState(picked);
  const holds = (names) => (row) => names.includes(row.name) || row.picked.some((name) => names.includes(name));
  const isPicked = holds(picked);
  const wasPicked = holds(pinned);

  const needle = query.trim().toLowerCase();
  const matches = rankCompanies(list ?? [], needle);
  const ordered = [...matches.filter(wasPicked), ...matches.filter((row) => !wasPicked(row))];
  const shown = ordered.slice(0, Math.max(SHOWN, pinned.length));

  const toggle = (row) => onChange(isPicked(row)
    ? picked.filter((name) => name !== row.name && !row.picked.includes(name))
    : [...picked, row.name]);

  // Enter takes the best match and clears the box for the next one, so
  // "razor", Enter, "swig", Enter picks two without the mouse.
  function onKeyDown(event) {
    const first = needle && event.key === 'Enter' ? matches.find((row) => !isPicked(row)) : null;
    if (!first) return;
    event.preventDefault();
    onChange([...picked, first.name]);
    setQuery('');
  }

  return (
    <div className={`${PANEL} left-0 w-[min(20rem,calc(100vw-2rem))] p-2`}>
      <div className="flex items-center gap-2 p-1 pb-2">
        <span className="relative min-w-0 flex-1">
          <SearchIcon size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onKeyDown}
            aria-label="Search companies"
            placeholder={list ? `Search ${list.length.toLocaleString('en-IN')} companies` : 'Search companies'}
            className="w-full rounded-full border border-line bg-panel py-1.5 pl-8 pr-3 text-sm outline-none transition-colors duration-fast ease focus:border-primary/60 focus:ring-2 focus:ring-primary/15 focus-visible:outline-none"
          />
        </span>
        {picked.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="shrink-0 rounded-full px-2 py-1 text-xs font-semibold text-primary transition-colors duration-fast ease hover:bg-primary/10"
          >
            Clear
          </button>
        )}
      </div>
      <ul className="max-h-72 overflow-y-auto">
        {shown.map((row) => (
          <li key={row.name}>
            <label className="flex cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2 transition-colors duration-fast ease hover:bg-select/60">
              <input type="checkbox" checked={isPicked(row)} onChange={() => toggle(row)} className="h-4 w-4 shrink-0 accent-primary" />
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{row.name}</span>
              <span className="tnum shrink-0 rounded-full bg-select px-2 py-0.5 text-[11px] font-semibold text-muted">{row.count}</span>
            </label>
          </li>
        ))}
      </ul>
      <MenuNote list={list} failed={failed} needle={needle} found={matches.length} hidden={ordered.length - shown.length} />
    </div>
  );
}

// One line under the list for whatever it is not showing, and why.
function MenuNote({ list, failed, needle, found, hidden }) {
  let note = null;
  if (!list) note = failed ? 'Could not read the companies. Close this and open it again.' : 'Reading the companies...';
  else if (needle && found === 0) note = 'No company matches that.';
  else if (hidden > 0) note = needle ? `${hidden} more match. Keep typing to narrow them.` : `The ${SHOWN} with the most jobs. Search for the other ${hidden.toLocaleString('en-IN')}.`;
  return note && <p className="px-3 pb-1 pt-2 text-xs text-muted">{note}</p>;
}
