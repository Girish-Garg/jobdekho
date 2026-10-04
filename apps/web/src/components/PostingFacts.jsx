import { degreeLabel } from '../lib/taxonomy.js';
import { relativeDay } from '../lib/time.js';
import { sourceName } from '../lib/sourceName.js';
import { payText, payEvidence } from '../lib/payText.js';
import { MapPinIcon, WalletIcon, BriefcaseIcon, GraduationCapIcon, CalendarIcon, ClockIcon, BuildingIcon } from './Icon.jsx';
import TagChip from './TagChip.jsx';
import Card from './ui/Card.jsx';

// Level and work mode moved up into the header chips; what is left is the
// context a person checks once interested. Pay is always shown, in the same
// short form as the feed (lib/payText.js), with where it came from on hover,
// and says so when the board did not state it, since that absence is itself
// a fact about the job. A board that gives no posting date is not dated by
// when JobDekho first found the job: that is "Found", not "Posted". Any
// other field the scraper never filled drops out rather than printing
// "unknown".
function facts(posting) {
  const pay = payText(posting);
  return [
    ['Location', posting.location, MapPinIcon, { wide: true }],
    ['Pay', pay || 'Not stated', WalletIcon, { quiet: !pay, evidence: pay ? payEvidence(posting) : '' }],
    ['Experience', posting.experience, BriefcaseIcon],
    ['Degree', degreeLabel(posting.degreeMin, posting.degreeRequired), GraduationCapIcon],
    ['Duration', posting.duration, CalendarIcon],
    posting.postedAt ? ['Posted', relativeDay(posting.postedAt), ClockIcon] : ['Found', relativeDay(posting.firstSeenAt), ClockIcon],
    ['Listed on', sourceName(posting.source), BuildingIcon],
  ].filter(([, value]) => value);
}

// Tiles in two columns, location across both since a city, state and
// country rarely fit half the pane.
export default function PostingFacts({ posting }) {
  return (
    <dl className="grid grid-cols-2 gap-2">
      {facts(posting).map(([label, value, Icon, { wide, quiet, evidence } = {}]) => (
        <Card key={label} variant="inset" className={`flex min-w-0 items-start gap-2.5 rounded-lg px-3 py-2.5 ${wide ? 'col-span-2' : ''}`}>
          <Icon size={15} className="mt-0.5 text-muted" />
          <div className="min-w-0">
            <dt className="text-[11px] leading-tight text-muted">{label}</dt>
            <dd className="flex min-w-0">
              <TagChip as="span" evidence={evidence} hostClassName="min-w-0" title={evidence ? undefined : value} className={`block truncate text-sm font-semibold ${quiet ? 'text-muted' : 'text-ink'}`}>
                {value}
              </TagChip>
            </dd>
          </div>
        </Card>
      ))}
    </dl>
  );
}
