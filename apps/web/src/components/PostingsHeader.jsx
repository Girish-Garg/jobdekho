// The feed's title line: what this is, how many postings match and how many
// of them arrived today (counted by the server over the whole match, not the
// loaded page), and on the right how to look at them (rows or cards, and the
// order). Those two used to sit in the filter row; filters narrow what is in
// the feed, these only change how it is shown, so they live here.
const count = (n) => n.toLocaleString('en-IN');

export default function PostingsHeader({ shown, total = shown, fresh, controls = null }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 pb-3 pt-5">
      <div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink">Postings</h1>
        <p className="tnum mt-0.5 text-sm text-muted">
          <span>{total > shown ? `${count(shown)} of ${count(total)} shown` : `${count(total)} postings`}</span>
          {fresh > 0 && <span className="font-medium text-primary">{`  ·  ${fresh} new today`}</span>}
        </p>
      </div>
      {controls && <div className="flex flex-wrap items-center justify-end gap-2">{controls}</div>}
    </div>
  );
}
