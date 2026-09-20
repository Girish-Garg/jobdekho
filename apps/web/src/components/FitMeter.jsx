import { fitSegments } from '../lib/fitSegments.js';

// The score as one bar, filled to the score, with a tick where each scoring
// dimension hands over to the next. The first version filled each segment
// separately, and four part-filled segments split by paper-coloured borders
// read as a broken dashed line, not a meter. How much each dimension earned
// is the pane's job (FitBreakdown); the row only has to say how good.
// Renders nothing on an unranked feed: fit only rides a row once the server
// has scored it, so its absence is the signal, not a zero to guard against.
export default function FitMeter({ fit, grade, breakdown }) {
  if (!Number.isInteger(fit)) return null;
  const ticks = fitSegments(breakdown, fit).slice(0, -1)
    .reduce((acc, s) => [...acc, (acc.at(-1) ?? 0) + s.widthPct], []);

  return (
    <span className="flex shrink-0 items-center gap-2" aria-label={`Fit ${fit}${grade ? `, grade ${grade}` : ''}`}>
      <span aria-hidden="true" className="relative block h-1.5 w-12 overflow-hidden rounded-sm bg-line">
        {/* Lightness alone, never hue: fit is not the seniority ramp. */}
        <span className="block h-full bg-ink/75" style={{ width: `${Math.min(100, Math.max(0, fit))}%` }} />
        {ticks.map((at) => (
          <span key={at} className="absolute inset-y-0 w-px bg-panel" style={{ left: `${at}%` }} />
        ))}
      </span>
      <span className="tnum w-5 text-right font-mono text-xs text-ink">{fit}</span>
      {/* The letter says the same as the bar without colour, for a dichromat
          and a screen reader alike. */}
      {grade && (
        <span className="grid h-3.5 w-3.5 shrink-0 place-items-center rounded-sm border border-edge font-mono text-[9px] font-bold leading-none text-ink">
          {grade}
        </span>
      )}
    </span>
  );
}
