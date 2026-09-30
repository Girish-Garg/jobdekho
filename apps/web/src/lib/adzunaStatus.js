import { shortStamp } from './time.js';

// The sentences Settings' Adzuna card shows about the key in use and the last
// refresh, from what the server answers (see api/adzuna.js). The server
// never sends the key, only its last four characters, so these never could
// show more.
const FROM = { settings: 'Settings', environment: 'the environment (.env)' };

// `view` is undefined while loading and null when it could not be read.
export function keyStatus(view) {
  if (view === undefined) return { tone: 'muted', text: 'Looking for a saved key...' };
  if (view === null) return { tone: 'error', text: 'Could not read the Adzuna key. Try again once the server is back.' };
  if (!view.configured) return { tone: 'muted', text: 'No key yet, so refreshes leave Adzuna out.' };
  const which = view.keyEnd ? `Key ending ${view.keyEnd}` : 'Key saved';
  return { tone: 'ok', text: `${which}, from ${FROM[view.from] ?? 'Settings'}` };
}

// How Adzuna did in the most recent refresh, or null when it was not in it.
// A failure's own error (already stripped of the key) rides as a tooltip,
// the way the Postings card names a source it could not reach.
export function lastRunStatus(lastRun) {
  if (!lastRun) return null;
  const when = shortStamp(lastRun.at);
  const prefix = when ? `Last refresh, ${when}: ` : 'Last refresh: ';
  if (!lastRun.ok) return { tone: 'error', text: `${prefix}Adzuna failed.`, title: lastRun.error || '' };
  const n = lastRun.count;
  return { tone: 'muted', text: `${prefix}${n} ${n === 1 ? 'posting' : 'postings'} from Adzuna.`, title: '' };
}
