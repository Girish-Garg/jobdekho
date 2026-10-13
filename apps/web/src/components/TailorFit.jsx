import { cutMade, withCut } from '../lib/tailorCuts.js';
import { overBy } from '../lib/pdfLength.js';
import TailorHead from './TailorHead.jsx';

const lines = (n) => `saves ${n} ${n === 1 ? 'line' : 'lines'}`;

function Cut({ cut, made, onToggle }) {
  return (
    <li className="border-t border-line first:border-t-0">
      <label className="flex cursor-pointer items-start gap-2.5 py-2">
        <input type="checkbox" checked={made} onChange={(event) => onToggle(event.target.checked)} className="mt-1 h-3.5 w-3.5 shrink-0 accent-primary" />
        <span className="min-w-0 flex-1">
          <span className={`block text-sm ${made ? 'text-muted' : 'text-ink'}`}>{cut.label}</span>
          <span className="block text-xs text-muted">{cut.why}</span>
        </span>
        {cut.saves > 0 && <span className="shrink-0 font-mono text-xs text-muted">{lines(cut.saves)}</span>}
      </label>
    </li>
  );
}

// What a resume that runs past one page could do without, for the person
// to pick from: content first, least useful for this job first, and the
// tighter layout last as one more choice (the server's
// actions/resume-tailor-fit.js makes the list and counts each cut's lines
// on the real page). Nothing is cut for them. It stays up once the page
// fits, so a cut can be taken back, and says so plainly when every cut
// together is still not enough.
export default function TailorFit({ fit, measuring, length, choices, onChange }) {
  const over = Boolean(length) && length.pages > 1;
  // A cut that would save nothing is not worth a line of the list.
  const cuts = (fit?.cuts ?? []).filter((cut) => cut.saves !== 0 || cutMade(choices, cut.patch));
  const some = cuts.some((cut) => cutMade(choices, cut.patch));
  if (!over && !some) return null;

  return (
    <section aria-label="Fit on one page" className="flex flex-col gap-1.5">
      <TailorHead title="Fit on one page" note={over ? `${length.pages} pages${overBy(length)}` : 'it fits now'} />
      <p className="text-sm text-ink/80">
        {over ? 'Tick what goes, least useful for this job first. The page beside this follows.' : 'It fits on one page. Untick anything you want back.'}
      </p>
      {measuring && <p className="text-sm text-muted">Measuring what each cut would save...</p>}
      {fit?.failed && <p className="text-sm text-muted">The cuts could not be measured. You can still take things out below.</p>}
      {cuts.length > 0 && (
        <ul className="flex flex-col">
          {cuts.map((cut) => (
            <Cut key={cut.key} cut={cut} made={cutMade(choices, cut.patch)} onToggle={(on) => onChange(withCut(choices, cut.patch, on))} />
          ))}
        </ul>
      )}
      {over && fit?.enough === false && (
        <p className="text-sm text-ink/80">Even with all of these it runs past one page. Take more out below, or keep it at two pages.</p>
      )}
    </section>
  );
}
