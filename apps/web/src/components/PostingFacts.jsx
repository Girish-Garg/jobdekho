import { levelLabel, degreeLabel, workModeLabel } from '../lib/taxonomy.js';
import { levelTone } from '../lib/levelColor.js';
import { relativeDay } from '../lib/time.js';

// Third slot is the value's own colour, so the level keeps the hue it had on
// the card. Rows the scraper never filled drop out rather than read "unknown".
function detailRows(posting) {
  const others = (posting.groupCount || 1) - 1;
  return [
    ['Location', posting.location],
    ['Also listed in', others > 0 ? `${others} other location${others === 1 ? '' : 's'}` : ''],
    ['Work mode', workModeLabel(posting.workMode)],
    ['Level', levelLabel(posting.level), levelTone(posting.level).text],
    ['Degree', degreeLabel(posting.degreeMin, posting.degreeRequired)],
    ['Stipend', posting.stipend],
    ['Duration', posting.duration],
    ['Experience', posting.experience],
    ['Posted', relativeDay(posting.postedAt || posting.firstSeenAt)],
    ['Last seen', relativeDay(posting.lastSeenAt)],
    ['Source', posting.source],
  ].filter(([, value]) => value);
}

// The facts the card leaves out, as a grid of labelled values.
export default function PostingFacts({ posting }) {
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-3 border-y border-line py-4 sm:grid-cols-3">
      {detailRows(posting).map(([label, value, tone]) => (
        <div key={label} className="min-w-0">
          <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">{label}</dt>
          <dd className={`mt-0.5 truncate text-sm ${tone || 'text-ink'}`}>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
