import { useEffect, useState } from 'react';
import { getPostings, setStatus } from '../api.js';
import { sortPostings } from '../lib/sortPostings.js';
import { isNewToday } from '../lib/time.js';
import { stipendAmount, durationMonths, experienceYears } from '../lib/meta.js';
import PostingRow from './PostingRow.jsx';

// Postings feed. Refetches when filters change; status edits apply optimistically.
const SORTS = [
  ['newest', 'Newest posted'],
  ['oldest', 'Oldest posted'],
  ['added', 'Recently added'],
  ['company', 'Company A-Z'],
];

export default function PostingsView({ filters }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState('newest');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getPostings({ q: filters.q, source: filters.source, status: filters.status })
      .then((data) => alive && setRows(data))
      .catch(() => alive && setRows([]))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [filters]);

  async function onStatus(id, status) {
    const prev = rows;
    setRows(rows.map((r) => (r.id === id ? { ...r, status } : r)));
    try {
      await setStatus(id, status);
    } catch {
      setRows(prev);
    }
  }

  let filtered = rows;
  if (filters.minStipend) filtered = filtered.filter((r) => stipendAmount(r.stipend) >= Number(filters.minStipend));
  if (filters.maxExp !== '') filtered = filtered.filter((r) => experienceYears(r.experience) <= Number(filters.maxExp));
  if (filters.maxMonths) {
    const max = Number(filters.maxMonths);
    filtered = filtered.filter((r) => durationMonths(r.duration) > 0 && durationMonths(r.duration) <= max);
  }
  const sorted = sortPostings(filtered, sort);
  const freshCount = rows.filter((p) => isNewToday(p.firstSeenAt)).length;

  return (
    <section>
      <div className="flex items-baseline justify-between border-b border-line px-6 py-5">
        <div>
          <h2 className="font-display text-2xl font-extrabold tracking-tight">Postings</h2>
          <p className="mt-1 font-mono text-xs text-muted">
            {rows.length} listed
            {freshCount ? ` - ${freshCount} new today` : ''}
          </p>
        </div>
        <label className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
          Sort
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="rounded-md border border-line bg-paper px-2 py-1.5 text-xs normal-case tracking-normal text-ink outline-none focus:border-ink"
          >
            {SORTS.map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </label>
      </div>
      {loading ? (
        <p className="px-6 py-10 font-mono text-sm text-muted">Fetching postings...</p>
      ) : sorted.length === 0 ? (
        <p className="px-6 py-10 font-mono text-sm text-muted">Nothing matches these filters yet.</p>
      ) : (
        sorted.map((p) => <PostingRow key={p.id} posting={p} onStatus={onStatus} />)
      )}
    </section>
  );
}
