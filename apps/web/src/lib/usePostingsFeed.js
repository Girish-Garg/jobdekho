import { useEffect, useState } from 'react';
import { getPostingsPage, setStatus } from '../api.js';
import { useDebounced } from './useDebounced.js';
import { onRefreshed } from './postingsRefreshedSignal.js';
import { onBlocked } from './blockedSignal.js';
import { onDescribed } from './postingDescribedSignal.js';
import { withDescribed } from './describedRow.js';
import { feedQuery } from './feedQuery.js';

// Pulled a page at a time. The feed runs to a few thousand rows, and the old
// single 500-row read made everything past the cut unreachable.
export const PAGE = 100;

const NO_COUNTS = { total: 0, postedToday: 0, foundToday: 0, bands: null, notStated: null, blockedPicks: [] };

// The page's counts, over the whole match rather than the loaded rows:
// postedToday is what "new today" means (the board's own date within a
// day), foundToday what was first found today but posted earlier.
// notStated is levelNotStatedTotal, set only under a seniority filter.
const countsOf = (data) => ({
  total: data.total ?? data.postings.length,
  postedToday: data.postedToday ?? 0,
  foundToday: data.foundToday ?? 0,
  bands: data.bands ?? null,
  notStated: data.levelNotStatedTotal ?? null,
  blockedPicks: data.blockedPicks ?? [],
});

// Every filter and the sort key are the server's job. Narrowing or ordering the
// loaded page instead would only ever touch the first 100 of a few thousand
// rows, which silently answered the wrong question.
export function usePostingsFeed(filters, sort = 'match') {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);
  const [counts, setCounts] = useState(NO_COUNTS);
  // A finished refresh (Settings' "Refresh now", see useScrape.js) reads the feed again,
  // so new postings show without a reload of the page; so does a company just
  // blocked (see blockedSignal.js), whose jobs then leave it. A description
  // fetched when a job was opened retags only that job's row, in place.
  const [reloads, setReloads] = useState(0);
  useEffect(() => onRefreshed(() => setReloads((n) => n + 1)), []);
  useEffect(() => onBlocked(() => setReloads((n) => n + 1)), []);
  useEffect(() => onDescribed((posting) => setRows((all) => all.map((row) => withDescribed(row, posting)))), []);

  // The search waits for a pause in typing (see useDebounced.js).
  const q = useDebounced(filters.q ?? '');
  const query = { ...feedQuery(filters, q), sort };
  // Depend on what the query says, not the filters object: a new object
  // identity every render would refetch on every keystroke elsewhere.
  const asked = JSON.stringify(query);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getPostingsPage({ ...query, limit: PAGE })
      .then((data) => {
        if (!alive) return;
        setRows(data.postings);
        setMore(data.postings.length === PAGE);
        setCounts(countsOf(data));
      })
      .catch(() => alive && (setRows([]), setMore(false), setCounts(NO_COUNTS)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [asked, reloads]);

  async function loadMore() {
    const next = await getPostingsPage({ ...query, limit: PAGE, offset: rows.length }).then((d) => d.postings).catch(() => []);
    setMore(next.length === PAGE);
    setRows((prev) => [...prev, ...next]);
  }

  async function onStatus(id, value) {
    const prev = rows;
    setRows(rows.map((r) => (r.id === id ? { ...r, status: value } : r)));
    try {
      await setStatus(id, value);
    } catch {
      setRows(prev);
    }
  }

  // bands: how many of the whole feed fall in each grade, for the dividers.
  // blockedPicks: the picked companies the person has blocked, which this
  // feed will never show (see the store's blocked-companies.js).
  return { rows, loading, more, loadMore, onStatus, ...counts };
}
