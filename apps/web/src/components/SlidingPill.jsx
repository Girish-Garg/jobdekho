// The gliding highlight behind a row of choices (see lib/useSlidingPill.js).
// Absolutely placed at the container's origin and moved by transform, so the
// glide runs on the compositor and never reflows the row it sits in.
// `shape` follows the items it slides behind: round for a row of pills,
// the items' own corners for a column of links.
export default function SlidingPill({ style, glides, className = 'bg-select', shape = 'rounded-full' }) {
  return (
    <span
      aria-hidden="true"
      style={style}
      className={`pointer-events-none absolute left-0 top-0 ${shape} ${className} ${
        glides ? 'transition-[transform,width,height,opacity] duration-slow ease-out' : ''
      }`}
    />
  );
}
