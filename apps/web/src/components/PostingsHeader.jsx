// The one line the feed says about itself. It used to be a third band of
// chrome holding the sort and the density toggle as well; those sit in the
// filter row now, with the filters they belong with, and the count is a
// caption over the list rather than a bar above it.
export default function PostingsHeader({ shown, fresh }) {
  return (
    <p className="tnum px-3 pb-1.5 pt-1 font-mono text-xs text-muted">
      {shown} shown
      {fresh > 0 && <span className="text-ember"> / {fresh} new today</span>}
    </p>
  );
}
