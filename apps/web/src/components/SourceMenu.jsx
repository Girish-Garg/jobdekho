import { useState } from 'react';
import { sourceLabel } from '../lib/sourceName.js';
import ChecklistMenu from './ChecklistMenu.jsx';

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

  // Reset, not Clear: an empty exclude list is every source included.
  const action = excluded.length > 0 ? { label: 'Reset', onClick: () => onChange([]) } : null;

  return (
    <ChecklistMenu
      label="Search sources"
      placeholder="Search companies and boards"
      query={query}
      onQuery={setQuery}
      action={action}
      rows={shown.map((option) => ({
        id: option.name,
        title: option.title,
        sub: option.board,
        count: option.count,
        checked: !excluded.includes(option.name),
        onToggle: () => toggle(option.name),
      }))}
      empty="No source matches that."
    />
  );
}
