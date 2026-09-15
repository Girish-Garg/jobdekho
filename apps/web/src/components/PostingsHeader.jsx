import { useEffect } from 'react';
import { onSortRequest } from '../lib/commandBus.js';

// Best fit leads because it is the default. It is named for the axis it
// orders by, like the others: "Recommended" claimed the whole feed, and now
// that fit is also a filter the sort is just one dimension of it.
const SORTS = [
  ['match', 'Best fit'],
  ['newest', 'Newest posted'],
  ['oldest', 'Oldest posted'],
  ['added', 'Recently added'],
  ['company', 'Company A-Z'],
];

// Sticky so the count and sort stay reachable while scrolling a long feed. The
// section is already named by the nav, so this strip carries no second title.
// A solid panel and a hairline stand in for the old blurred glass: this sits
// directly under the filter bar, and translucency there just smears the
// filter row's own text through it on scroll.
export default function PostingsHeader({ shown, fresh, sort, setSort, children }) {
  // The command palette lives in the chrome, outside PostingsView's state, so
  // a sort command arrives as a request on this bus rather than a prop; this
  // is the one place that already holds the real setSort to forward it to.
  useEffect(() => onSortRequest(setSort), [setSort]);

  return (
    // Carries the hairline for the whole filter-and-sort panel above it, not
    // just for itself: FilterBar deliberately left its own bottom border off
    // so the two bars read as one.
    <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-line bg-panel px-6 py-1.5">
      <p className="tnum font-mono text-xs text-muted">
        {shown} shown
        {fresh > 0 && <span className="text-ember"> / {fresh} new today</span>}
      </p>
      <div className="flex items-center gap-3">
        {children}
        <label className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
          Sort
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="rounded-md border border-line bg-paper px-2 py-1 text-xs normal-case tracking-normal text-ink outline-none focus:border-ink"
          >
            {SORTS.map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
