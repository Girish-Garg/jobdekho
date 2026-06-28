import { useEffect, useState } from 'react';
import { getPostings, setStatus } from '../api.js';
import { sortPostings } from '../lib/sortPostings.js';
import { isNewToday } from '../lib/time.js';
import PostingRow from './PostingRow.jsx';

// Postings feed. Refetches when filters change; status edits apply optimistically.
export default function PostingsView({ filters }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getPostings(filters)
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

  const sorted = sortPostings(rows);
  const freshCount = sorted.filter((p) => isNewToday(p.firstSeenAt)).length;

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
