import { useBlockedCompanies } from '../lib/useBlockedCompanies.js';
import { shortDay } from '../lib/time.js';
import SettingsCard from './SettingsCard.jsx';
import { BuildingIcon } from './Icon.jsx';

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

// The companies the person never wants to see again (blocked from a job's
// pane or a chat answer), newest first, each with a way back.
export default function BlockedCompaniesCard() {
  const { list, failed, busy, unblock } = useBlockedCompanies();

  return (
    <SettingsCard icon={<BuildingIcon size={18} />} title="Blocked companies" hint="Their jobs never show again, and refreshes do not keep the new ones.">
      {list === null && <p className="text-sm text-muted">{failed ? 'Could not read the blocked companies.' : 'Reading the blocked companies...'}</p>}
      {list?.length === 0 && <p className="text-sm text-muted">{EMPTY}</p>}
      {list?.length > 0 && (
        <ul className="divide-y divide-line">
          {list.map((entry) => (
            <li key={entry.key} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
              <span className="min-w-0 text-sm">
                <span className="block truncate font-semibold text-ink">{entry.name}</span>
                <span className="tnum text-muted">{detail(entry)}</span>
              </span>
              <button
                type="button"
                onClick={() => unblock(entry.key)}
                disabled={busy === entry.key}
                aria-label={`Unblock ${entry.name}`}
                className="btn btn-quiet btn-sm shrink-0"
              >
                {busy === entry.key ? 'Unblocking...' : 'Unblock'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </SettingsCard>
  );
}
