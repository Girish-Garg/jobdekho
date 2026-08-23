import { useEffect, useState } from 'react';
import { getPostings, setStatus } from '../api.js';

// Pulled a page at a time. The feed runs to a few thousand rows, and the old
// single 500-row read made everything past the cut unreachable.
export const PAGE = 100;

// Every filter and the sort key are the server's job. Narrowing or ordering the
// loaded page instead would only ever touch the first 100 of a few thousand
// rows, which silently answered the wrong question.
export function usePostingsFeed(filters, sort = 'newest') {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);

  // Depend on the individual fields, not the filters object: a new object
  // identity every render would refetch on every keystroke elsewhere.
  const { q, status, maxDegree, minStipend, includeStale } = filters;
  const maxExperienceYears = filters.maxExp;
  const maxDurationMonths = filters.maxMonths;
  const levels = (filters.levels || []).join(',');
  const workModes = (filters.workModes || []).join(',');
  const excludedSources = (filters.excludedSources || []).join(',');
  const query = {
    q, excludedSources, status, levels, workModes, maxDegree,
    minStipend, maxExperienceYears, maxDurationMonths, sort, includeStale,
  };

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getPostings({ ...query, limit: PAGE })
      .then((data) => alive && (setRows(data), setMore(data.length === PAGE)))
      .catch(() => alive && (setRows([]), setMore(false)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [
    q, excludedSources, status, levels, workModes, maxDegree,
    minStipend, maxExperienceYears, maxDurationMonths, sort, includeStale,
  ]);

  async function loadMore() {
    const next = await getPostings({ ...query, limit: PAGE, offset: rows.length }).catch(() => []);
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

  return { rows, loading, more, loadMore, onStatus };
}
