// The feed's title line: what this is, how many rows are loaded and how many
// arrived today, and on the right how to look at them (rows or cards, and the
// order). Those two used to sit in the filter row; filters narrow what is in
// the feed, these only change how it is shown, so they live here.
export default function PostingsHeader({ shown, fresh, controls = null }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 pb-3 pt-5">
      <div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink">Postings</h1>
        <p className="tnum mt-0.5 text-sm text-muted">
          <span>{shown} shown</span>
          {fresh > 0 && <span className="font-medium text-primary">{`  ·  ${fresh} new today`}</span>}
        </p>
      </div>
      {controls && <div className="flex items-center gap-2">{controls}</div>}
    </div>
  );
}
