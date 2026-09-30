import { sourceLabel } from '../lib/sourceName.js';
import { shortDay } from '../lib/time.js';

// A handful of names says which sources need a look; a hundred says nothing.
const NAMED = 4;

const REASON = { failing: 'failing', refused: 'asked to slow down', gone: 'not found' };
const ALERT = { empty: 'listing nothing', thin: 'descriptions missing' };

function Names({ items, describe }) {
  return (
    <>
      {items.slice(0, NAMED).map((item, i) => (
        <span key={item.name} title={item.error || undefined}>{`${i ? ', ' : ''}${sourceLabel(item.name).title} (${describe(item)})`}</span>
      ))}
      {items.length > NAMED && <span className="tnum">{` and ${items.length - NAMED} more`}</span>}
    </>
  );
}

// Where the sources stand between runs (the server's scrape service reads the
// scraper's health record): the ones resting after repeated failures, until
// when and why, each error on hover; and the ones that answer but look wrong.
// Nothing at all when every source is well, which is the usual case.
export default function SourceHealthNote({ health }) {
  const paused = health?.paused ?? [];
  const alerts = health?.alerts ?? [];
  if (!paused.length && !alerts.length) return null;

  return (
    <div className="mt-2 space-y-1 text-sm text-muted">
      {paused.length > 0 && (
        <p>
          <span className="tnum font-medium text-ink">{`${paused.length} resting: `}</span>
          <Names items={paused} describe={(p) => `${REASON[p.reason] ?? REASON.failing}, until ${shortDay(p.until)}`} />
        </p>
      )}
      {alerts.length > 0 && (
        <p>
          <span className="tnum font-medium text-ink">{`${alerts.length} to look at: `}</span>
          <Names items={alerts} describe={(a) => ALERT[a.kind] ?? a.kind} />
        </p>
      )}
    </div>
  );
}
