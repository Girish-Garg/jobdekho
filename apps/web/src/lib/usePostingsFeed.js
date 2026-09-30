import { useEffect, useState } from 'react';
import { getPostingsPage, setStatus } from '../api.js';
import { useDebounced } from './useDebounced.js';
import { onRefreshed } from './postingsRefreshedSignal.js';

// Pulled a page at a time. The feed runs to a few thousand rows, and the old
// single 500-row read made everything past the cut unreachable.
export const PAGE = 100;

// Every filter and the sort key are the server's job. Narrowing or ordering the
// loaded page instead would only ever touch the first 100 of a few thousand
// rows, which silently answered the wrong question.
export function usePostingsFeed(filters, sort = 'match') {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);
  const [counts, setCounts] = useState({ total: 0, newToday: 0 });
  // A finished refresh (Settings' "Refresh now", see useScrape.js) reads the feed again,
  // so new postings show without a reload of the page.
  const [reloads, setReloads] = useState(0);
  useEffect(() => onRefreshed(() => setReloads((n) => n + 1)), []);

  // Depend on the individual fields, not the filters object: a new object
  // identity every render would refetch on every keystroke elsewhere.
  const { status, maxDegree, minStipend, includeStale, minFit } = filters;
  // The search waits for a pause in typing (see useDebounced.js).
  const q = useDebounced(filters.q ?? '');
  const maxExperienceYears = filters.maxExp;
  const maxDurationMonths = filters.maxMonths;
  const levels = (filters.levels || []).join(',');
  const workModes = (filters.workModes || []).join(',');
  const excludedSources = (filters.excludedSources || []).join(',');
  const query = {
    q, excludedSources, status, levels, workModes, maxDegree,
    minStipend, maxExperienceYears, maxDurationMonths, sort, includeStale, minFit,
  };

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getPostingsPage({ ...query, limit: PAGE })
      .then((data) => {
        if (!alive) return;
        setRows(data.postings);
        setMore(data.postings.length === PAGE);
        setCounts({ total: data.total ?? data.postings.length, newToday: data.newToday ?? 0 });
      })
      .catch(() => alive && (setRows([]), setMore(false), setCounts({ total: 0, newToday: 0 })))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [
    q, excludedSources, status, levels, workModes, maxDegree,
    minStipend, maxExperienceYears, maxDurationMonths, sort, includeStale, minFit, reloads,
  ]);

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

  return { rows, loading, more, loadMore, onStatus, total: counts.total, newToday: counts.newToday };
}
