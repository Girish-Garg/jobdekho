import { fitSegments } from '../lib/fitSegments.js';
import { gradeTone } from '../lib/gradeTone.js';

// The score as one bar, filled to the score, with a tick where each scoring
// dimension hands over to the next. How much each dimension earned is the
// pane's job (FitBreakdown); the row only has to say how good. The bar and
// the letter take the grade's colour, the same the pane's fit card uses, and
// the letter is always printed, so the colour is never the only copy of the
// grade. Renders nothing on an unranked feed: fit only rides a row once the
// server has scored it, so its absence is the signal, not a zero to guard
// against.
export default function FitMeter({ fit, grade, breakdown }) {
  if (!Number.isInteger(fit)) return null;
  const tone = gradeTone(grade);
  const ticks = fitSegments(breakdown, fit).slice(0, -1)
    .reduce((acc, s) => [...acc, (acc.at(-1) ?? 0) + s.widthPct], []);

  return (
    <span className="flex shrink-0 items-center gap-2" aria-label={`Fit ${fit}${grade ? `, grade ${grade}` : ''}`}>
      <span aria-hidden="true" className="relative block h-1.5 w-14 overflow-hidden rounded-full bg-line">
        <span className={`block h-full rounded-full ${tone.fill}`} style={{ width: `${Math.min(100, Math.max(0, fit))}%` }} />
        {ticks.map((at) => (
          <span key={at} className="absolute inset-y-0 w-px bg-panel" style={{ left: `${at}%` }} />
        ))}
      </span>
      <span className="tnum w-5 text-right text-sm font-semibold text-ink">{fit}</span>
      {grade && (
        <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-md text-[11px] font-bold leading-none ${tone.soft} ${tone.text}`}>
          {grade}
        </span>
      )}
    </span>
  );
}
