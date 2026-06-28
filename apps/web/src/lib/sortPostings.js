import { isNewToday } from './time.js';

const ts = (v) => new Date(v || 0).getTime();

// Sort the feed by the chosen key. "added" keeps the new-to-you rows pinned on top.
export function sortPostings(postings, sortBy = 'newest', now = Date.now()) {
  const rows = [...postings];
  if (sortBy === 'company') {
    return rows.sort((a, b) => (a.company || '').localeCompare(b.company || ''));
  }
  if (sortBy === 'oldest') {
    return rows.sort((a, b) => ts(a.postedAt || a.firstSeenAt) - ts(b.postedAt || b.firstSeenAt));
  }
  if (sortBy === 'added') {
    return rows.sort((a, b) => {
      const an = isNewToday(a.firstSeenAt, now) ? 1 : 0;
      const bn = isNewToday(b.firstSeenAt, now) ? 1 : 0;
      if (an !== bn) return bn - an;
      return ts(b.firstSeenAt) - ts(a.firstSeenAt);
    });
  }
  return rows.sort((a, b) => ts(b.postedAt || b.firstSeenAt) - ts(a.postedAt || a.firstSeenAt));
}
