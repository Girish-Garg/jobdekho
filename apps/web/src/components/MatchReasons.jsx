import FitBreakdown from './FitBreakdown.jsx';

const GRADE_RANK = { A: 4, B: 3, C: 2, D: 1 };

// Four ticks, filled by rank rather than by hue, so the grade still reads in
// grayscale or to a dichromat exactly as it does at a glance - the same
// reasoning behind the seniority ramp's lightness steps, applied here
// because a fit grade is not a colour question either. The letter itself is
// still the thing being asserted; the ticks are corroboration, not the only
// copy of the fact.
function GradeBadge({ grade }) {
  const rank = GRADE_RANK[grade] || 0;
  return (
    <span className="flex items-center gap-1.5">
      <span aria-hidden="true" className="flex items-end gap-0.5">
        {[1, 2, 3, 4].map((tick) => (
          <span
            key={tick}
            className={`w-1 rounded-sm ${tick <= rank ? 'bg-ink' : 'bg-line'}`}
            style={{ height: `${3 + tick * 2}px` }}
          />
        ))}
      </span>
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink">Grade {grade}</span>
    </span>
  );
}

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
        {grade && <GradeBadge grade={grade} />}
      </div>
      {reasons?.length > 0 && <p className="mt-0.5 text-sm text-ink/80">{reasons.join(' / ')}</p>}
      <FitBreakdown breakdown={breakdown} />
    </div>
  );
}
