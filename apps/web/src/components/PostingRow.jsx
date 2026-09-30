import { isNewToday, relativeDay } from '../lib/time.js';
import { compactPay } from '../lib/compactPay.js';
import CompanyMark from './CompanyMark.jsx';
import PostingTags from './PostingTags.jsx';
import FitMeter from './FitMeter.jsx';
import RowActions from './RowActions.jsx';

// Every row lays its cells on the same tracks, so the tags, the pay and the
// score sit in columns whatever the title beside them did. Two lines rather
// than one: the title gets the whole first line instead of a third of it
// (long titles used to end in an ellipsis on every row), and the company,
// place and age read as one quiet line under it. Below lg the tags and pay
// tracks go rather than squeeze the title.
const TRACKS =
  'grid items-center gap-x-4 grid-cols-[2.25rem_minmax(0,1fr)_auto] '
  + 'lg:grid-cols-[2.25rem_minmax(0,1fr)_auto_6.5rem_10.5rem]';

// The selected row keeps a thin saffron bar at its edge as well as the
// surface step: a tint alone read as muddy, and the bar says which one is
// open from across the page.
const SELECTED = 'bg-select before:absolute before:inset-y-2.5 before:left-0 before:w-0.5 before:rounded-full before:bg-primary';

export default function PostingRow({
  posting, selected, flashUndo, dominantWorkMode, onOpen, onSelect, onStatus, onUndo,
}) {
  const fresh = isNewToday(posting.firstSeenAt);
  const showActions = selected || flashUndo;
  const age = relativeDay(posting.postedAt || posting.firstSeenAt);
  const meta = [posting.company, posting.location || 'Location not listed', age === 'today' ? 'Posted today' : age];

  return (
    <div
      data-row-id={posting.id}
      data-reveal
      role="row"
      aria-selected={selected}
      tabIndex={-1}
      onClick={(event) => { onSelect(posting.id); onOpen(posting, event.currentTarget); }}
      className={`dither-spot group relative cursor-pointer border-b border-line px-4 py-3 last:border-b-0 ${TRACKS} ${
        selected ? SELECTED : 'hover:bg-select/40'
      } ${posting.status === 'dismissed' ? 'opacity-60' : ''}`}
    >
      <span role="gridcell"><CompanyMark company={posting.company} size="sm" logoOf={posting.logoUrl ? posting.id : null} /></span>
      <span role="gridcell" className="min-w-0">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate text-[15px] font-semibold leading-snug text-ink">{posting.title}</span>
          {fresh && <span aria-label="New today" className="shrink-0 rounded-full bg-primary/10 px-1.5 py-px text-[10px] font-bold uppercase tracking-wide text-primary">New</span>}
        </span>
        <span className="mt-0.5 block truncate text-[13px] text-muted">{meta.filter(Boolean).join('  ·  ')}</span>
      </span>
      <span role="gridcell" className="hidden lg:block">
        <PostingTags posting={posting} dominantWorkMode={dominantWorkMode} />
      </span>
      <span role="gridcell" className="tnum hidden truncate text-right text-sm font-medium text-ink lg:block">{compactPay(posting.stipend)}</span>
      {/* The trailing cell carries the score, and the actions take its place
          while the row is hovered, focused or selected: the same width serves
          both, and nothing is on screen that a person cannot yet act on. */}
      <span role="gridcell" className="relative flex h-7 items-center justify-end">
        <span className={`flex items-center ${showActions ? 'invisible' : 'group-hover:invisible group-focus-within:invisible'}`}>
          <FitMeter fit={posting.fit} grade={posting.grade} breakdown={posting.breakdown} />
        </span>
        <span className={`absolute inset-y-0 right-0 flex items-center ${showActions ? '' : 'invisible group-hover:visible group-focus-within:visible'}`}>
          <RowActions posting={posting} flashUndo={flashUndo} onStatus={onStatus} onUndo={onUndo} />
        </span>
      </span>
    </div>
  );
}
