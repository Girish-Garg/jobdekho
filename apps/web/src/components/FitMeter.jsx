import { fitSegments } from '../lib/fitSegments.js';

// The signature element of the row: a bar segmented by dimension when the
// row carries a breakdown, or one plain segment against fit/100 when it
// does not - "some rows" carry a breakdown per the feed contract, and a row
// with fit but no breakdown still has a score worth showing. Renders
// nothing at all on an unranked feed: fit only rides a row once the server
// has scored it, so its absence is the signal, not a zero to guard against.
export default function FitMeter({ fit, grade, breakdown }) {
  if (!Number.isInteger(fit)) return null;
  const segments = fitSegments(breakdown, fit);

  return (
    <span
      className="flex shrink-0 items-center gap-1.5"
      aria-label={`Fit ${fit}${grade ? `, grade ${grade}` : ''}`}
    >
      <span aria-hidden="true" className="flex h-1.5 w-11 overflow-hidden rounded-sm bg-line">
        {segments.map((segment) => (
          <span
            key={segment.key}
            className="h-full border-r border-paper last:border-r-0"
            style={{ width: `${segment.widthPct}%` }}
          >
            {/* Fill reads by lightness alone, never hue: fit is not the
                seniority ramp and must not borrow its colours. */}
            <span className="block h-full bg-ink/70" style={{ width: `${segment.fillPct}%` }} />
          </span>
        ))}
      </span>
      <span className="tnum font-mono text-xs text-ink">{fit}</span>
      {/* The letter carries the same judgement as the bar without relying on
          colour to read it, for a dichromat and for a screen reader alike. */}
      {grade && (
        <span className="grid h-3.5 w-3.5 shrink-0 place-items-center rounded-sm border border-edge font-mono text-[9px] font-bold leading-none text-ink">
          {grade}
        </span>
      )}
    </span>
  );
}
