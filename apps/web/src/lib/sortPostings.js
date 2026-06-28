import { isNewToday } from './time.js';

// Pin "new today" rows on top; keep newest-first within each group.
export function sortPostings(postings, now = Date.now()) {
  return [...postings].sort((a, b) => {
    const an = isNewToday(a.firstSeenAt, now) ? 1 : 0;
    const bn = isNewToday(b.firstSeenAt, now) ? 1 : 0;
    if (an !== bn) return bn - an;
    return new Date(b.firstSeenAt || 0) - new Date(a.firstSeenAt || 0);
  });
}
