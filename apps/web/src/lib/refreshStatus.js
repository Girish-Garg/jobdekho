const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

// "just now", "12 min ago", "3 h ago", "2 d ago": how old the postings are,
// short enough for one status line.
export function refreshedAgo(at, now = Date.now()) {
  const t = Date.parse(at ?? '');
  if (Number.isNaN(t)) return '';
  const gap = Math.max(0, now - t);
  if (gap < MINUTE_MS) return 'just now';
  if (gap < HOUR_MS) return `${Math.floor(gap / MINUTE_MS)} min ago`;
  if (gap < DAY_MS) return `${Math.floor(gap / HOUR_MS)} h ago`;
  return `${Math.floor(gap / DAY_MS)} d ago`;
}

// The sources a run missed, then any it chose not to read with each one's
// own note (LinkedIn inside its guard's window). The skipped ones are never
// counted as missed: that is the guard working, and the line stays 'done'.
function doneTitle(scrape) {
  const missed = scrape.result?.failed?.length ?? 0;
  const lines = [
    missed ? `${missed} of ${scrape.total} sources could not be reached.` : null,
    ...(scrape.result?.skipped ?? []).map((s) => `${s.note}.`),
  ].filter(Boolean);
  return lines.length ? lines.join(' ') : undefined;
}

// The one line that says where refreshing stands, and its tone: 'busy' while
// a run is going, 'error' when the server's last run failed, 'done' for a
// run this page watched end (`finished`, see useScrape.js), and 'idle'
// otherwise, which says how old the postings are. `title` is the longer
// word a hover gives: the failure's sentence, or the sources a run missed
// or skipped.
export function refreshStatus(scrape, { finished = false, now = Date.now() } = {}) {
  if (!scrape) return { tone: 'idle', text: '' };
  if (scrape.running) {
    const text = scrape.total ? `Refreshing: ${scrape.done} of ${scrape.total} sources` : 'Starting the refresh';
    return { tone: 'busy', text };
  }
  if (scrape.error) return { tone: 'error', text: 'Refresh failed', title: scrape.error };
  const last = scrape.lastRun?.at ?? scrape.finishedAt;
  if (finished && scrape.result) {
    return { tone: 'done', text: `Done: ${scrape.result.fresh} new  ·  ${refreshedAgo(last, now)}`, title: doneTitle(scrape) };
  }
  if (!last) return { tone: 'idle', text: 'Not refreshed yet' };
  return { tone: 'idle', text: `Last refreshed ${refreshedAgo(last, now)}` };
}
