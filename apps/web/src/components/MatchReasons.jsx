import FitBreakdown from './FitBreakdown.jsx';
import { gradeTone } from '../lib/gradeTone.js';
import { useCountUp } from '../lib/useCountUp.js';

// The phrases are the server's, verbatim: it scores the full description, and
// a reason recomputed here against the snippet could disagree with the very
// ranking it is explaining. Some of them ("well outside your experience") are
// warnings, which is why the heading says fit rather than recommended, and
// why each reason gets a plain dot rather than a tick. Their text stays
// verbatim; only the first letter is raised, by CSS. The score, the grade
// and the breakdown are one judgement at three zoom levels, so they share
// one card.
//
// The number is printed without "out of 100": real scores rarely pass the
// 70s, and the grade is what answers "is 58 good?". It counts up as the pane
// opens (see useCountUp.js), which a screen reader never hears: the grade
// and the breakdown carry the same judgement in words.
export default function MatchReasons({ fit, reasons, grade, breakdown }) {
  const shown = useCountUp(fit);
  if (!reasons?.length && !grade && !breakdown?.length) return null;
  const tone = gradeTone(grade);

  return (
    <section aria-label="Fit" className="rounded-xl border border-line bg-paper/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-muted">How you fit</p>
          {Number.isInteger(fit) && <p className="tnum mt-1 font-display text-3xl font-extrabold leading-none text-ink">{shown}</p>}
        </div>
        {grade && <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${tone.soft} ${tone.text}`}>Grade {grade}</span>}
      </div>
      {reasons?.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1 text-sm text-ink/85">
          {reasons.map((reason) => (
            <li key={reason} className="flex gap-2">
              <span aria-hidden="true" className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${tone.fill}`} />
              <span className="block first-letter:uppercase">{reason}</span>
            </li>
          ))}
        </ul>
      )}
      <FitBreakdown breakdown={breakdown} />
    </section>
  );
}
