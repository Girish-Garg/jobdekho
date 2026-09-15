import { useState } from 'react';

// Around eighty boards feed this list, so the menu carries its own typeahead.
// The search box is local state: the menu unmounts when it closes, so every
// open starts clean without anyone having to reset it.
export default function SourceMenu({ options, excluded, onChange }) {
  const [query, setQuery] = useState('');

  const needle = query.trim().toLowerCase();
  const shown = needle ? options.filter((o) => o.name.toLowerCase().includes(needle)) : options;

  // A tick means included, so ticking drops the name from the exclude list.
  const toggle = (name) =>
    onChange(excluded.includes(name) ? excluded.filter((s) => s !== name) : [...excluded, name]);

  return (
    <div className="absolute left-0 top-full z-30 mt-2 w-72 rounded-lg border border-line bg-overlay p-2 shadow-pop">
      <div className="flex items-center gap-2 pb-2">
        <input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Search sources"
          placeholder="Search sources"
          className="min-w-0 flex-1 rounded-md border border-line bg-panel px-3 py-1.5 text-sm outline-none focus:border-ink"
        />
        {/* Reset, not Clear: an empty exclude list is every source included. */}
        {excluded.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="shrink-0 font-mono text-[11px] text-muted underline underline-offset-2 hover:text-ink"
          >
            Reset
          </button>
        )}
      </div>
      <ul className="max-h-64 space-y-0.5 overflow-y-auto">
        {shown.map((option) => (
          <li key={option.name}>
            <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-paper">
              <input
                type="checkbox"
                checked={!excluded.includes(option.name)}
                onChange={() => toggle(option.name)}
                className="accent-ink"
              />
              <span className="min-w-0 flex-1 truncate">{option.name}</span>
              <span className="tnum shrink-0 font-mono text-[11px] text-muted">{option.count}</span>
            </label>
          </li>
        ))}
        {shown.length === 0 && (
          <li className="px-2 py-2 font-mono text-[11px] text-muted">No source matches that.</li>
        )}
      </ul>
    </div>
  );
}
