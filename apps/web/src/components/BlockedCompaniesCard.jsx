import { useState } from 'react';
import Chip from './ui/Chip.jsx';
import IconButton from './ui/IconButton.jsx';
import SearchField from './ui/SearchField.jsx';
import { useBlockedCompanies } from '../lib/useBlockedCompanies.js';
import { shortDay } from '../lib/time.js';
import SettingsCard from './SettingsCard.jsx';
import { BuildingIcon, CloseIcon } from './Icon.jsx';

const EMPTY = 'To block a company, open one of its jobs and press Block company beside its name, or ask the chat to block it.';

// When it was blocked, and what became of its own careers page: left unread,
// or still read with its jobs dropped. A company with no page of its own in
// JobDekho's sources says nothing about one, unless the block asked for any
// page it gets later to be left unread.
function detail(entry) {
  const parts = [entry.blockedAt ? `Blocked ${shortDay(entry.blockedAt)}` : 'Blocked'];
  if (entry.stopFetching) parts.push('careers page not fetched');
  else if (entry.careersPage) parts.push('careers page still fetched');
  return parts.join('  ·  ');
}

// About three rows of chips. A list of every blocked company, one row each,
// grew past everything else in Settings, so the newest few show and the rest
// wait behind "Show all", or come up as a search narrows them; a search box
// shows only once there are more than that to look through.
const FIRST = 12;

// The companies the person never wants to see again (blocked from a job's
// pane or a chat answer), newest first, as chips with a way back on each, as
// picked from rendered option A. When and how each was blocked is the chip's
// hover, and is read out with its name.
export default function BlockedCompaniesCard() {
  const { list, failed, busy, unblock } = useBlockedCompanies();
  const [query, setQuery] = useState('');
  const [all, setAll] = useState(false);
  const wanted = query.trim().toLowerCase();
  const found = (list ?? []).filter((entry) => entry.name.toLowerCase().includes(wanted));
  const shown = all || wanted ? found : found.slice(0, FIRST);

  return (
    <SettingsCard icon={<BuildingIcon size={18} />} title="Blocked companies" count={list?.length || null} hint="Their jobs never show again, and refreshes do not keep the new ones.">
      {list === null && <p className="text-sm text-muted">{failed ? 'Could not read the blocked companies.' : 'Reading the blocked companies...'}</p>}
      {list?.length === 0 && <p className="text-sm text-muted">{EMPTY}</p>}
      {list?.length > FIRST && (
        <SearchField label="Find a blocked company" placeholder="Find a blocked company" value={query} onChange={(event) => setQuery(event.target.value)} className="mb-3" />
      )}
      {list?.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {shown.map((entry) => (
            <Chip as="li" key={entry.key} tone="line" className="gap-1 py-1 pl-2.5 pr-1">
              <span title={detail(entry)}>{entry.name}<span className="sr-only">, {detail(entry)}</span></span>
              <IconButton label={`Unblock ${entry.name}`} size="xs" onClick={() => unblock(entry.key)} disabled={busy === entry.key}>
                <CloseIcon size={10} />
              </IconButton>
            </Chip>
          ))}
        </ul>
      )}
      {wanted && found.length === 0 && <p className="text-sm text-muted">No blocked company matches "{query.trim()}".</p>}
      {found.length > FIRST && !wanted && (
        <div className="mt-3 flex items-center justify-between border-t border-line pt-3 text-xs text-muted">
          <button type="button" onClick={() => setAll(!all)} className="link text-xs">{all ? 'Show fewer' : `Show all ${found.length}`}</button>
          <span>Newest first. Point at a name for when it was blocked.</span>
        </div>
      )}
    </SettingsCard>
  );
}
