import { profileStrength } from '../lib/profileStrength.js';

// How complete the record is, as a bar and a number, with the single most
// useful thing to add next (see profileStrength.js). Teal once it is nearly
// there, saffron while there is real work left: colour agrees with the
// number, it never replaces it.
export default function ProfileStrength({ profile }) {
  const { percent, next } = profileStrength(profile);
  const fill = percent >= 80 ? 'bg-accent' : 'bg-primary';

  return (
    <div className="flex w-full flex-col gap-1.5 sm:w-56">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-semibold text-muted">Profile strength</span>
        <span className="tnum text-sm font-bold text-ink">{percent}%</span>
      </div>
      <span
        role="progressbar"
        aria-label="Profile strength"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        className="block h-2 overflow-hidden rounded-full bg-line"
      >
        <span className={`block h-full rounded-full ${fill}`} style={{ width: `${percent}%` }} />
      </span>
      <span className="text-xs text-muted">{next ? `Next: ${next.toLowerCase()}` : 'Everything the feed and a resume use is here.'}</span>
    </div>
  );
}
