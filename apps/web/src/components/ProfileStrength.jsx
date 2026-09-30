import { profileStrength } from '../lib/profileStrength.js';

// How complete the record is, as a bar and a number, with the single most
// useful thing to add next (see profileStrength.js). The bar is saffron at
// every level: the number says how far along it is, not a change of hue.
export default function ProfileStrength({ profile }) {
  const { percent, next } = profileStrength(profile);

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
        <span className="block h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
      </span>
      <span className="text-xs text-muted">{next ? `Next: ${next.toLowerCase()}` : 'Everything the feed and a resume use is here.'}</span>
    </div>
  );
}
