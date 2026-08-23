const SORTS = [
  ['newest', 'Newest posted'],
  ['oldest', 'Oldest posted'],
  ['added', 'Recently added'],
  ['company', 'Company A-Z'],
];

// Sticky so the count and sort stay reachable while scrolling a long feed. The
// section is already named by the nav, so this strip carries no second title.
export default function PostingsHeader({ shown, fresh, sort, setSort }) {
  return (
    <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-line bg-paper/95 px-6 py-2.5 backdrop-blur">
      <p className="tnum font-mono text-xs text-muted">
        {shown} shown
        {fresh > 0 && <span className="text-ember"> / {fresh} new today</span>}
      </p>
      <label className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
        Sort
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="rounded-md border border-line bg-panel px-2 py-1 text-xs normal-case tracking-normal text-ink outline-none focus:border-ink"
        >
          {SORTS.map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </label>
    </div>
  );
}
