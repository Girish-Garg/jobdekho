import { degreeLabel } from '../lib/taxonomy.js';
import { relativeDay } from '../lib/time.js';
import { sourceName } from '../lib/sourceName.js';
import { MapPinIcon, WalletIcon, BriefcaseIcon, GraduationCapIcon, CalendarIcon, ClockIcon, BuildingIcon } from './Icon.jsx';

// Level and work mode moved up into the header chips; what is left is the
// context a person checks once interested. Pay is always shown, and says so
// when the board did not state it, since that absence is itself a fact about
// the job. Any other field the scraper never filled drops out rather than
// printing "unknown".
function facts(posting) {
  return [
    ['Location', posting.location, MapPinIcon, { wide: true }],
    ['Pay', posting.stipend || 'Not stated', WalletIcon, { quiet: !posting.stipend }],
    ['Experience', posting.experience, BriefcaseIcon],
    ['Degree', degreeLabel(posting.degreeMin, posting.degreeRequired), GraduationCapIcon],
    ['Duration', posting.duration, CalendarIcon],
    ['Posted', relativeDay(posting.postedAt || posting.firstSeenAt), ClockIcon],
    ['Listed on', sourceName(posting.source), BuildingIcon],
  ].filter(([, value]) => value);
}

// Tiles in two columns, location across both since a city, state and
// country rarely fit half the pane.
export default function PostingFacts({ posting }) {
  return (
    <dl className="grid grid-cols-2 gap-2">
      {facts(posting).map(([label, value, Icon, { wide, quiet } = {}]) => (
        <div key={label} className={`flex min-w-0 items-start gap-2.5 rounded-lg border border-line bg-paper/60 px-3 py-2.5 ${wide ? 'col-span-2' : ''}`}>
          <Icon size={15} className="mt-0.5 text-muted" />
          <div className="min-w-0">
            <dt className="text-[11px] leading-tight text-muted">{label}</dt>
            <dd title={value} className={`truncate text-sm font-semibold ${quiet ? 'text-muted' : 'text-ink'}`}>{value}</dd>
          </div>
        </div>
      ))}
    </dl>
  );
}
