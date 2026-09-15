import { fitSegments } from '../lib/fitSegments.js';

// The internal dimension keys, in the words the overlay already uses.
const DIMENSION_WORD = { skills: 'Skills', titles: 'Title', level: 'Level', degree: 'Degree' };

// Each row's ceiling (`max`) is drawn against the same axis, the sum of every
// dimension's max, so a row's length says how much of the total score this
// dimension could ever be worth - not just how well it did on its own scale.
// Without that, a fully-earned 20-point dimension and a half-earned 45-point
// one could draw the same bar length, which is the opposite of what this
// view is for. The fill inside each ceiling is still the dimension's own
// 0-1 value, because "62% of skills" is a fact worth keeping once the row's
// length has already said how much skills is worth. This is the same pair
// of numbers the feed's FitMeter draws as one segmented bar (max/total for
// width, value for fill); this view is that bar pulled apart into a labelled
// row per dimension, which is why the two should end up looking related.
// Points are rounded for reading and can drift a point off the card's total;
// the unrounded values are the server's, and rows keep the server's order so
// two overlays compare line for line.
export default function FitBreakdown({ breakdown }) {
  if (!breakdown?.length) return null;
  const segments = fitSegments(breakdown);

  return (
    <ul className="mt-2 flex flex-col gap-1.5">
      {breakdown.map(({ dimension, max, points }, index) => (
        <li key={dimension} className="flex items-center gap-3">
          <span className="w-14 shrink-0 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
            {DIMENSION_WORD[dimension] || dimension}
          </span>
          <span aria-hidden="true" className="h-1.5 flex-1 overflow-hidden rounded-full">
            <span className="block h-full rounded-full bg-line" style={{ width: `${segments[index].widthPct}%` }}>
              <span
                className="block h-full rounded-full bg-ink/70"
                style={{ width: `${segments[index].fillPct}%` }}
              />
            </span>
          </span>
          <span className="tnum w-16 shrink-0 text-right font-mono text-[11px] text-ink">
            {Math.round(points)} of {Math.round(max)}
          </span>
        </li>
      ))}
    </ul>
  );
}
