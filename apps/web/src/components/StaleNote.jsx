import { staleSince } from '../lib/lastSeen.js';

// A posting its board stopped listing weeks ago, opened anyway (usually from
// a chat answer that named it). Worth one quiet line before anyone applies.
export default function StaleNote({ posting }) {
  const since = staleSince(posting);
  if (!since) return null;
  return (
    <p className="rounded-md border border-line bg-select/50 px-3 py-2 text-sm text-muted">
      Last seen on its board on {since}. It has most likely closed.
    </p>
  );
}
