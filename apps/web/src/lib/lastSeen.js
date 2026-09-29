// The feed hides a posting its board has not listed for this long, since it
// has most likely closed (STALE_AFTER_DAYS in packages/store/src/
// posting-filters.js). The pane can still show one, opened from a chat
// answer that named it, so it says so rather than presenting it as open.
const STALE_AFTER_DAYS = 21;
const DAY_MS = 24 * 60 * 60 * 1000;

// The day it was last seen, as "24 Aug", or null for a posting still listed
// or one scraped before the column existed.
export function staleSince(posting, now = Date.now()) {
  const seen = Date.parse(posting?.lastSeenAt ?? '');
  if (Number.isNaN(seen) || now - seen < STALE_AFTER_DAYS * DAY_MS) return null;
  return new Date(seen).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}
