import { blockCompany } from '../api.js';
import { announceBlocked } from './blockedSignal.js';
import { notify } from './toast.js';

// "Acme", "Acme and Beta", "Acme, Beta and Gamma".
const listed = (names) => (names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`);

// Blocks each company in turn, for the job pane and a chat answer alike, then
// tells the feed and the chat (see blockedSignal.js) and says so in a notice,
// since a company not on screen has nothing to vanish from. A block that
// fails is announced by its own call (see api/companies.js); the ones before
// it are kept and announced all the same.
export async function blockCompanies(names, { stopFetching = false } = {}) {
  const blocked = [];
  if (!names?.length) return blocked;
  try {
    for (const name of names) blocked.push({ asked: name, entry: await blockCompany(name, { stopFetching }) });
  } finally {
    if (blocked.length) announceBlocked([...new Set(blocked.flatMap(({ asked, entry }) => [asked, entry.name]))]);
  }
  const kept = blocked.map(({ entry }) => entry);
  const one = kept.length === 1;
  notify({
    kind: 'done',
    title: `Blocked ${listed(kept.map((entry) => entry.name))}`,
    detail: `${one ? 'Its' : 'Their'} jobs stay hidden, now and after every refresh. Settings can unblock ${one ? 'it' : 'them'}.`,
  });
  return kept;
}
