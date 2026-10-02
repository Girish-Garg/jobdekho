import { useState } from 'react';
import ChecklistMenu from './ChecklistMenu.jsx';
import { rankCompanies } from '../lib/companyRank.js';

// Some fifteen hundred employers is more than a list to scroll, so the menu
// shows the ones with the most jobs and the search reaches the rest.
const SHOWN = 50;

// One line under the list for whatever it is not showing, and why.
function listNote({ list, failed, needle, found, hidden }) {
  let note = null;
  if (!list) note = failed ? 'Could not read the companies. Close this and open it again.' : 'Reading the companies...';
  else if (needle && found === 0) note = 'No company matches that.';
  else if (hidden > 0) note = needle ? `${hidden} more match. Keep typing to narrow them.` : `The ${SHOWN} with the most jobs. Search for the other ${hidden.toLocaleString('en-IN')}.`;
  return note;
}

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
    <ChecklistMenu
      width="w-[min(20rem,calc(100vw-2rem))]"
      label="Search companies"
      placeholder={list ? `Search ${list.length.toLocaleString('en-IN')} companies` : 'Search companies'}
      query={query}
      onQuery={setQuery}
      onKeyDown={onKeyDown}
      action={picked.length > 0 ? { label: 'Clear', onClick: () => onChange([]) } : null}
      rows={shown.map((row) => ({
        id: row.name,
        title: row.name,
        count: row.count,
        checked: isPicked(row),
        onToggle: () => toggle(row),
      }))}
      note={listNote({ list, failed, needle, found: matches.length, hidden: ordered.length - shown.length })}
    />
  );
}
