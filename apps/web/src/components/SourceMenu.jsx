import { useState } from 'react';
import { sourceLabel } from '../lib/sourceName.js';
import { PANEL } from './Dropdown.jsx';
import { SearchIcon } from './Icon.jsx';

// Around eighty boards feed this list, so the menu carries its own typeahead.
// The search box is local state: the menu unmounts when it closes, so every
// open starts clean without anyone having to reset it. A row shows the
// company first and its board under it, not the scraper's "board:Company"
// key, and the search matches either.
export default function SourceMenu({ options, excluded, onChange }) {
  const [query, setQuery] = useState('');

  const needle = query.trim().toLowerCase();
  const rows = options.map((option) => ({ ...option, ...sourceLabel(option.name) }));
  const shown = needle
    ? rows.filter((o) => `${o.name} ${o.title} ${o.board}`.toLowerCase().includes(needle))
    : rows;

  // A tick means included, so ticking drops the name from the exclude list.
  const toggle = (name) =>
    onChange(excluded.includes(name) ? excluded.filter((s) => s !== name) : [...excluded, name]);

  return (
    <div className={`${PANEL} left-0 w-80 p-2`}>
      <div className="flex items-center gap-2 p-1 pb-2">
        <span className="relative min-w-0 flex-1">
          <SearchIcon size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search sources"
            placeholder="Search companies and boards"
            className="w-full rounded-full border border-line bg-panel py-1.5 pl-8 pr-3 text-sm outline-none transition-colors duration-fast ease focus:border-primary/60 focus:ring-2 focus:ring-primary/15 focus-visible:outline-none"
          />
        </span>
        {/* Reset, not Clear: an empty exclude list is every source included. */}
        {excluded.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="shrink-0 rounded-full px-2 py-1 text-xs font-semibold text-primary transition-colors duration-fast ease hover:bg-primary/10"
          >
            Reset
          </button>
        )}
      </div>
      <ul className="max-h-72 overflow-y-auto">
        {shown.map((option) => (
          <li key={option.name}>
            <label className="flex cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2 transition-colors duration-fast ease hover:bg-select/60">
              <input
                type="checkbox"
                checked={!excluded.includes(option.name)}
                onChange={() => toggle(option.name)}
                className="h-4 w-4 shrink-0 accent-primary"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-ink">{option.title}</span>
                <span className="block truncate text-[11px] text-muted">{option.board}</span>
              </span>
              <span className="tnum shrink-0 rounded-full bg-select px-2 py-0.5 text-[11px] font-semibold text-muted">{option.count}</span>
            </label>
          </li>
        ))}
        {shown.length === 0 && (
          <li className="px-3 py-3 text-sm text-muted">No source matches that.</li>
        )}
      </ul>
    </div>
  );
}
