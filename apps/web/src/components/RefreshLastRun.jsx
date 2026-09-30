import { shortStamp } from '../lib/time.js';
import { sourceLabel } from '../lib/sourceName.js';

// A handful of names says which boards are struggling; a list of a hundred
// says nothing a person can act on.
const NAMED = 4;

// The last completed refresh, whoever ran it (this page, the daily check or
// `npm run scrape`): when, what it found, and which sources it could not
// reach, named briefly with each one's error on hover. A source it chose not
// to read (LinkedIn inside its guard's window) is no failure: its own note
// says why, quietly, under the rest.
export default function RefreshLastRun({ lastRun }) {
  if (!lastRun) return <p className="mt-4 text-sm text-muted">No refresh has run yet.</p>;
  const { at, fresh, sources, failed, skipped = [] } = lastRun;
  const more = failed.length - NAMED;

  return (
    <div className="mt-4 rounded-xl border border-line bg-paper/60 p-3.5 text-sm">
      <p className="text-ink">
        <span className="font-semibold">Last refreshed {shortStamp(at)}</span>
        <span className="tnum text-muted">{`: ${fresh} new from ${sources} sources`}</span>
      </p>
      {failed.length > 0 && (
        <p className="mt-1 text-muted">
          <span className="tnum font-medium text-ember">{`${failed.length} could not be reached: `}</span>
          {failed.slice(0, NAMED).map((f, i) => (
            <span key={f.name} title={f.error}>{`${i ? ', ' : ''}${sourceLabel(f.name).title}`}</span>
          ))}
          {more > 0 && <span className="tnum">{` and ${more} more`}</span>}
        </p>
      )}
      {skipped.map((s) => <p key={s.name} className="tnum mt-1 text-muted">{s.note}</p>)}
    </div>
  );
}
