import FitBreakdown from './FitBreakdown.jsx';

// The phrases are the server's, verbatim: it scores the full description, and
// a reason recomputed here against the snippet could disagree with the very
// ranking it is explaining. Reasons are what make the score worth trusting,
// and some of them ("well outside your experience") are warnings, which is
// why the label says fit rather than recommended. The grade and the breakdown
// ride the same block: they are one judgement at three zoom levels, and a
// second heading would read as a second score.
export default function MatchReasons({ reasons, grade, breakdown }) {
  if (!reasons?.length && !grade && !breakdown?.length) return null;

  return (
    <div className="rounded-md bg-paper px-3 py-2">
      <div className="flex items-baseline justify-between gap-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Fit</p>
        {/* The letter answers "is 58 good?", which the bare number cannot: its
            scale tops out in the low 60s, not at 100. */}
        {grade && (
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink">Grade {grade}</p>
        )}
      </div>
      {reasons?.length > 0 && <p className="mt-0.5 text-sm text-ink/80">{reasons.join(' / ')}</p>}
      <FitBreakdown breakdown={breakdown} />
    </div>
  );
}
