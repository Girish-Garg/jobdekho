import { levelLabel, degreeLabel, workModeLabel } from '../lib/taxonomy.js';
import { levelTone } from '../lib/levelColor.js';
import { relativeDay } from '../lib/time.js';

// Level, location and pay lead because those three plus the header are "what
// the job is" - the rest is context a person checks once they are already
// interested. "Also listed in" and "last seen" are cut outright rather than
// just filtered when empty: the card already carries the location count, and
// a last-seen date next to a posted date said the same thing twice. A field
// the scraper never filled still drops out rather than printing "unknown".
function detailRows(posting) {
  return [
    ['Level', levelLabel(posting.level), levelTone(posting.level).text],
    ['Location', posting.location],
    ['Stipend', posting.stipend],
    ['Work mode', workModeLabel(posting.workMode)],
    ['Degree', degreeLabel(posting.degreeMin, posting.degreeRequired)],
    ['Duration', posting.duration],
    ['Experience', posting.experience],
    ['Posted', relativeDay(posting.postedAt || posting.firstSeenAt)],
    ['Source', posting.source],
  ].filter(([, value]) => value);
}

// A scannable strip, not a form: a quiet label runs straight into a strong
// value and the pair wraps as one unit, so a narrow column reflows this into
// several short lines instead of the two-column grid it used to be. Labels
// stay sentence case rather than the app's mono-caps treatment - that
// treatment marks a handful of section landmarks (Fit, Caution, AI), and
// nine of them in a row would just be noise wearing the same costume.
export default function PostingFacts({ posting }) {
  return (
    <dl className="flex flex-wrap gap-x-5 gap-y-2 border-y border-line py-3">
      {detailRows(posting).map(([label, value, tone]) => (
        <div key={label} className="flex min-w-0 items-baseline gap-1.5">
          <dt className="shrink-0 text-xs text-muted">{label}</dt>
          <dd className={`truncate text-sm font-semibold ${tone || 'text-ink'}`}>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
