// The internal dimension keys, in the words the overlay already uses.
const DIMENSION_WORD = { skills: 'Skills', titles: 'Title', level: 'Level', degree: 'Degree' };

// Each bar is that dimension's own 0-1 value, not a share of 100: the fit
// total tops out near the low 60s in practice, so a track meaning "out of a
// hundred" would paint every posting as a failure. "17 of 35" is the same
// fact in text, because the bars are data and colour-blind readers and screen
// readers both need a version that is not a width. Points are rounded for
// reading, so the rows can drift a point off the card's total; the unrounded
// values are the server's. Rows keep the server's order, so two overlays
// compare line for line.
//
// The ceiling is `max`, never the raw `weight`: a dimension the profile does
// not support is dropped and the rest renormalise, so skills is worth 45
// points of 100 on a full profile and 60 on one with no target titles.
// Reading `weight` as points printed "32 of 4500".
export default function FitBreakdown({ breakdown }) {
  if (!breakdown?.length) return null;

  return (
    <ul className="mt-2 flex flex-col gap-1.5">
      {breakdown.map(({ dimension, value, max, points }) => (
        <li key={dimension} className="flex items-center gap-3">
          <span className="w-14 shrink-0 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
            {DIMENSION_WORD[dimension] || dimension}
          </span>
          <span aria-hidden="true" className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
            <span className="block h-full rounded-full bg-ink/60" style={{ width: `${value * 100}%` }} />
          </span>
          <span className="tnum w-16 shrink-0 text-right font-mono text-[11px] text-ink">
            {Math.round(points)} of {Math.round(max)}
          </span>
        </li>
      ))}
    </ul>
  );
}
