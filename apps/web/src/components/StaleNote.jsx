import { staleSince } from '../lib/lastSeen.js';
import { ClockIcon } from './Icon.jsx';

// A posting its board stopped listing weeks ago, opened anyway (usually from
// a chat answer that named it). Worth one quiet line before anyone applies.
export default function StaleNote({ posting }) {
  const since = staleSince(posting);
  if (!since) return null;
  return (
    <p className="flex items-start gap-2 rounded-xl border border-line bg-select/50 px-3.5 py-2.5 text-sm text-muted">
      <ClockIcon size={15} className="mt-0.5" />
      <span>Last seen on its board on {since}. It has most likely closed.</span>
    </p>
  );
}
