// The internal dimension keys, in the words the pane uses.
const DIMENSION_WORD = { skills: 'Skills', titles: 'Title', level: 'Level', degree: 'Degree' };

// How full a row's bar is: the points it earned against its own ceiling.
const fillPct = ({ points, max }) => (max > 0 ? Math.min(100, Math.max(0, (points / max) * 100)) : 0);

// The parts are the content of the fit (what the job is built with, what it
// is called); the gates that multiply content into the score are FitWhy's
// rows, so these bars can sum past the score a gate cut down.
//
// Every row gets the same full-width track, filled to how well that part
// did. Each track used to be drawn to its part's share of the total (skills
// long, title short), so a fully earned part drew a short full bar that read
// as broken; how much each part is worth is what "29 of 60" says. Points are
// rounded for reading; the unrounded values are the server's, and rows keep
// the server's order so two postings compare line for line. The bars are
// ink, like the feed's meter: the grade beside them carries the tone.
export default function FitBreakdown({ breakdown }) {
  if (!breakdown?.length) return null;

  return (
    <ul aria-label="Fit by part" className="mt-4 flex flex-col gap-2">
      {breakdown.map((row) => (
        <li key={row.dimension} className="flex items-center gap-3">
          <span className="w-16 shrink-0 text-xs text-muted">{DIMENSION_WORD[row.dimension] || row.dimension}</span>
          <span aria-hidden="true" className="h-2 flex-1 overflow-hidden rounded-full bg-line">
            <span className="block h-full rounded-full bg-ink/55" style={{ width: `${fillPct(row)}%` }} />
          </span>
          <span className="tnum w-14 shrink-0 text-right text-xs text-ink">
            {Math.round(row.points)} of {Math.round(row.max)}
          </span>
        </li>
      ))}
    </ul>
  );
}
